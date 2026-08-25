import React from "react";
import { AbsoluteFill, Easing, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { z } from "zod";
import { zColor } from "@remotion/zod-types";
import * as tokens from "../tokens.shared";

// Schema (not a plain TS type) so every field is editable live from the
// Remotion Studio props panel — see AISEIRI.md's "fully editable from the
// props panel" rule. Each .describe() carries the field's documentation;
// it doubles as the tooltip Studio shows next to that control.
export const diagonalWipeSchema = z.object({
  mode: z
    .enum(["reveal", "conceal"])
    .optional()
    .describe('"reveal" starts fully transparent and the wipe sweeps across filling it; "conceal" starts filled and the wipe sweeps across emptying it.'),
  angle: z.number().optional().describe("Degrees the edge tilts from vertical."),
  direction: z
    .enum(["left-to-right", "right-to-left"])
    .optional()
    .describe("Which way the edge physically sweeps across the frame."),
  fill: zColor().optional().describe("The wipe's fill colour."),
  edgeLine: z.boolean().optional().describe("Hairline along the leading edge, travelling with it."),
  edgeLineColor: zColor().optional().describe("Colour of the edge-line hairline."),
  easing: z.enum(["linear", "standard"]).optional().describe('"standard" is the system\'s crisp expo-out (EASE_STANDARD); "linear" is constant-rate.'),
});

export type DiagonalWipeProps = z.infer<typeof diagonalWipeSchema>;

/**
 * A hard-edged diagonal edge sweeps across the frame, revealing
 * ("reveal": starts transparent, fills in) or concealing ("conceal":
 * starts filled, empties out). A transition beat — meant to sit between
 * two clips in After Effects, so the edge is genuinely hard (clip-path,
 * no feathering/gradient) and it renders as a standalone alpha clip.
 *
 * The edge is computed as a straight line tilted `angle` degrees from
 * vertical, swept via CSS clip-path across a range wide enough that its
 * own diagonal footprint fully clears the frame at both ends of the
 * animation — so at progress 0 the edge (and its footprint) sits
 * entirely off one side, and at progress 1 entirely off the other,
 * regardless of how steep `angle` is.
 */
export const DiagonalWipe: React.FC<DiagonalWipeProps> = ({
  mode = "reveal",
  angle = 20,
  direction = "left-to-right",
  fill = tokens.COLOR_BLACK,
  edgeLine = true,
  edgeLineColor = tokens.COLOR_WHITE,
  easing = "standard",
}) => {
  const frame = useCurrentFrame();
  const { width, height, durationInFrames } = useVideoConfig();

  // Clamped short of 90° — beyond that the edge's own tilt footprint
  // (height * tan(angle)) runs toward infinity, which would make the
  // sweep math (and the render) blow up for what's meant to stay a
  // steep-but-finite diagonal.
  const angleRad = (Math.max(-89, Math.min(89, angle)) * Math.PI) / 180;
  const tiltPx = height * Math.tan(angleRad);
  const absTiltHalf = Math.abs(tiltPx) / 2;

  const easingFn = easing === "linear" ? Easing.linear : Easing.bezier(...tokens.EASE_STANDARD);
  const progress = interpolate(frame, [0, Math.max(1, durationInFrames - 1)], [0, 1], {
    easing: easingFn,
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // The edge always physically travels per `direction`, independent of
  // mode — centerRef ranges from fully off-frame on the start side to
  // fully off-frame on the end side (accounting for the tilt footprint),
  // covering the whole frame at every angle.
  const startRef = direction === "left-to-right" ? -absTiltHalf : width + absTiltHalf;
  const endRef = direction === "left-to-right" ? width + absTiltHalf : -absTiltHalf;
  const centerRef = startRef + progress * (endRef - startRef);
  const xTop = centerRef + tiltPx / 2;
  const xBottom = centerRef - tiltPx / 2;

  // Which side of the edge is filled: for "reveal" it's the side the
  // edge has already swept past (grows as the edge advances); for
  // "conceal" it's the side not yet reached (shrinks as the edge
  // advances) — the opposite side, for the same edge travel.
  const filledSideIsLeft = (mode === "reveal") === (direction === "left-to-right");

  const polygonPoints = filledSideIsLeft
    ? [
        [0, 0],
        [xTop, 0],
        [xBottom, height],
        [0, height],
      ]
    : [
        [xTop, 0],
        [width, 0],
        [width, height],
        [xBottom, height],
      ];
  const clipPath = `polygon(${polygonPoints.map(([x, y]) => `${x}px ${y}px`).join(", ")})`;

  return (
    <AbsoluteFill style={{ overflow: "hidden" }}>
      <div style={{ position: "absolute", inset: 0, backgroundColor: fill, clipPath }} />

      {edgeLine && (
        <svg width={width} height={height} style={{ position: "absolute", inset: 0 }}>
          <line
            x1={xTop}
            y1={0}
            x2={xBottom}
            y2={height}
            stroke={edgeLineColor}
            strokeWidth={tokens.STROKE_HAIRLINE_PX}
          />
        </svg>
      )}
    </AbsoluteFill>
  );
};
