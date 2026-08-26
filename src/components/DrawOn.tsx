import React, { useEffect, useRef, useState } from "react";
import {
  AbsoluteFill,
  continueRender,
  delayRender,
  Easing,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { z } from "zod";
import { zColor } from "@remotion/zod-types";
import * as tokens from "../tokens.shared";

export type DrawOnShape = "circle" | "arc" | "line" | "cross" | "triangle" | "custom";
export type DrawOnEasing = "linear" | "standard";

// Schema (not a plain TS type) so every field is editable live from the
// Remotion Studio props panel — see AISEIRI.md's "fully editable from the
// props panel" rule. Each .describe() carries the field's documentation;
// it doubles as the tooltip Studio shows next to that control.
export const drawOnSchema = z.object({
  shape: z.enum(["circle", "arc", "line", "cross", "triangle", "custom"]).optional(),
  customPath: z.string().optional().describe("An SVG path `d` attribute, used when shape is \"custom\"."),
  drawFrames: z.number().int().positive().optional().describe("How long the draw takes, in frames."),
  strokeWidth: z.number().positive().optional().describe("Hairline by default."),
  stroke: zColor().optional(),
  size: z.number().positive().optional().describe("The shape's bounding size, in px."),
  x: z.number().optional().describe("Centre x position. Default: frame centre."),
  y: z.number().optional().describe("Centre y position. Default: frame centre."),
  rotation: z.number().optional().describe("Degrees."),
  easing: z.enum(["linear", "standard"]).optional().describe('"standard" is the system\'s crisp expo-out (EASE_STANDARD); "linear" is constant-rate.'),
  holdFrames: z.number().int().nonnegative().optional().describe("How long to hold on the completed draw before the composition ends."),
  endDot: z.boolean().optional().describe("A small filled dot left at the path's end point once the draw completes."),
});

export type DrawOnProps = z.infer<typeof drawOnSchema>;

// Defaults exported so DrawOnCompositions.tsx's calculateMetadata can
// fall back to the exact same values the component itself defaults to —
// one source of truth instead of numbers that could drift apart.
export const DEFAULT_SHAPE: DrawOnShape = "circle";
export const DEFAULT_DRAW_FRAMES = 45;
export const DEFAULT_SIZE = 500;
export const DEFAULT_ROTATION = 0;
export const DEFAULT_EASING: DrawOnEasing = "standard";
export const DEFAULT_HOLD_FRAMES = 30;
export const DEFAULT_END_DOT = false;

export const computeDrawOnDuration = (options: { drawFrames: number; holdFrames: number }): number =>
  options.drawFrames + options.holdFrames;

// Local design decision, not exposed as a prop — how much of a full
// circle "arc" sweeps. 270° reads clearly as a partial ring (distinct
// from "circle") without being so short it reads as a mere line segment.
const ARC_SWEEP_DEGREES = 270;

// A dot "small" relative to the stroke it belongs to, not a fixed px
// value — stays proportionate whether strokeWidth is a true hairline or
// something heavier.
const END_DOT_RADIUS_RATIO = 3;

type Point = { x: number; y: number };
type ShapeGeometry = { d: string; length: number; endPoint: Point };

/**
 * Path geometry + exact analytic length for every built-in shape,
 * computed from pure trigonometry — no DOM measurement, so it's
 * available synchronously on every render, deterministic under
 * Remotion's renderer. Only "custom" (arbitrary, unknowable geometry)
 * needs the DOM-measured fallback — see useMeasuredPathLength below.
 * Every shape is built centred on local (0,0); position and rotation
 * are applied afterwards via the caller's own <g transform>.
 */
const buildShapeGeometry = (shape: Exclude<DrawOnShape, "custom">, size: number): ShapeGeometry => {
  const r = size / 2;
  switch (shape) {
    case "circle": {
      // A full circle drawn as two 180° arcs — a single arc command
      // can't close a circle on itself (start/end would coincide with
      // an undefined sweep), so it's split at the two poles.
      const d = `M ${r} 0 A ${r} ${r} 0 1 1 ${-r} 0 A ${r} ${r} 0 1 1 ${r} 0`;
      return { d, length: 2 * Math.PI * r, endPoint: { x: r, y: 0 } };
    }
    case "arc": {
      const startAngle = (-90 * Math.PI) / 180; // starts at the top
      const sweepRad = (ARC_SWEEP_DEGREES * Math.PI) / 180;
      const endAngle = startAngle + sweepRad;
      const start: Point = { x: r * Math.cos(startAngle), y: r * Math.sin(startAngle) };
      const end: Point = { x: r * Math.cos(endAngle), y: r * Math.sin(endAngle) };
      const largeArcFlag = ARC_SWEEP_DEGREES > 180 ? 1 : 0;
      const d = `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArcFlag} 1 ${end.x} ${end.y}`;
      return { d, length: r * sweepRad, endPoint: end };
    }
    case "line": {
      const d = `M ${-r} 0 L ${r} 0`;
      return { d, length: size, endPoint: { x: r, y: 0 } };
    }
    case "cross": {
      // Two subpaths in one <path> — stroke-dasharray/dashoffset draws
      // the horizontal stroke fully, then continues straight into the
      // vertical one, since getTotalLength() sums drawn segments only
      // (a moveto contributes no length).
      const d = `M ${-r} 0 L ${r} 0 M 0 ${-r} L 0 ${r}`;
      return { d, length: size * 2, endPoint: { x: 0, y: r } };
    }
    case "triangle": {
      // Equilateral, inscribed in the r-radius bounding circle, point up.
      const points: Point[] = [-90, 30, 150].map((deg) => {
        const rad = (deg * Math.PI) / 180;
        return { x: r * Math.cos(rad), y: r * Math.sin(rad) };
      });
      const [a, b, c] = points;
      const d = `M ${a.x} ${a.y} L ${b.x} ${b.y} L ${c.x} ${c.y} Z`;
      const sideLength = r * Math.sqrt(3); // chord length for a 120° central angle
      return { d, length: sideLength * 3, endPoint: a }; // Z closes back to the start point
    }
  }
};

/**
 * Measures an arbitrary "custom" path's length and end point via the DOM
 * SVG API (getTotalLength / getPointAtLength) — the one case this beat
 * can't compute analytically. delayRender/continueRender blocks
 * Remotion's frame capture until that measurement lands, so the render
 * stays deterministic (never a frame with an unmeasured, wrong-looking
 * path) rather than depending on an ordinary React effect's timing.
 */
const useMeasuredCustomPath = (
  d: string,
): { pathRef: React.RefObject<SVGPathElement | null>; length: number; endPoint: Point } => {
  const [measured, setMeasured] = useState<{ length: number; endPoint: Point } | null>(null);
  const pathRef = useRef<SVGPathElement>(null);
  const handleRef = useRef<number | null>(null);

  if (handleRef.current === null) {
    handleRef.current = delayRender("Measuring DrawOn custom path length");
  }

  useEffect(() => {
    if (pathRef.current && d) {
      const length = pathRef.current.getTotalLength();
      const endPoint = pathRef.current.getPointAtLength(length);
      setMeasured({ length, endPoint: { x: endPoint.x, y: endPoint.y } });
    }
    if (handleRef.current !== null) {
      continueRender(handleRef.current);
      handleRef.current = null;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [d]);

  return { pathRef, length: measured?.length ?? 0, endPoint: measured?.endPoint ?? { x: 0, y: 0 } };
};

/**
 * A path draws itself, stroke progressing from start to end — line art
 * rendering itself. Built-in shapes (circle/arc/line/cross/triangle) get
 * their `d` and exact length from closed-form trigonometry; "custom"
 * measures an arbitrary path via the DOM (see useMeasuredCustomPath).
 * Either way the reveal itself is the same stroke-dasharray /
 * stroke-dashoffset technique, driven purely by frame/fps/drawFrames.
 */
export const DrawOn: React.FC<DrawOnProps> = ({
  shape = DEFAULT_SHAPE,
  customPath = "",
  drawFrames = DEFAULT_DRAW_FRAMES,
  strokeWidth = tokens.STROKE_HAIRLINE_PX,
  stroke = tokens.COLOR_WHITE,
  size = DEFAULT_SIZE,
  x,
  y,
  rotation = DEFAULT_ROTATION,
  easing = DEFAULT_EASING,
  holdFrames = DEFAULT_HOLD_FRAMES,
  endDot = DEFAULT_END_DOT,
}) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();

  const isCustom = shape === "custom";
  const builtIn = shape === "custom" ? null : buildShapeGeometry(shape, size);
  const measuredCustom = useMeasuredCustomPath(isCustom ? customPath : "");

  const geometry: ShapeGeometry = isCustom
    ? { d: customPath, length: measuredCustom.length, endPoint: measuredCustom.endPoint }
    : (builtIn as ShapeGeometry);
  const { d, length: pathLength, endPoint } = geometry;

  const ease = easing === "linear" ? Easing.linear : Easing.bezier(...tokens.EASE_STANDARD);
  const progress = interpolate(frame, [0, Math.max(1, drawFrames - 1)], [0, 1], {
    easing: ease,
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const dashOffset = pathLength * (1 - progress);

  const centerX = x ?? width / 2;
  const centerY = y ?? height / 2;
  const dotRadius = strokeWidth * END_DOT_RADIUS_RATIO;

  return (
    <AbsoluteFill>
      <svg width={width} height={height} style={{ position: "absolute", inset: 0 }}>
        <g transform={`translate(${centerX} ${centerY}) rotate(${rotation})`}>
          {d && (
            <path
              ref={isCustom ? measuredCustom.pathRef : undefined}
              d={d}
              fill="none"
              stroke={stroke}
              strokeWidth={strokeWidth}
              strokeDasharray={pathLength}
              strokeDashoffset={dashOffset}
            />
          )}
          {endDot && progress >= 1 && <circle cx={endPoint.x} cy={endPoint.y} r={dotRadius} fill={stroke} />}
        </g>
      </svg>
    </AbsoluteFill>
  );
};
