import React from "react";
import { AbsoluteFill, Easing, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { loadFont } from "@remotion/google-fonts/SpaceGrotesk";
import { z } from "zod";
import * as tokens from "../tokens.shared";

// Same font/weight as Marquee.tsx/Typewriter.tsx — Space Grotesk, light
// weight only. Loaded independently rather than relying on another
// beat's own call: beats are independent, one must never import another.
loadFont("normal", { weights: ["300"] });

export type SlamArrival = "scale-down" | "scale-up" | "slide-up" | "rise";
export type SlamSize = "sm" | "md" | "lg" | "xl";
export type SlamAlign = "left" | "center";

// Schema (not a plain TS type) so every field is editable live from the
// Remotion Studio props panel — see AISEIRI.md's "fully editable from the
// props panel" rule. Each .describe() carries the field's documentation;
// it doubles as the tooltip Studio shows next to that control.
export const slamSchema = z.object({
  text: z.string().describe("Text to slam in. \\n creates line breaks — each line arrives as its own unit."),
  arrival: z
    .enum(["scale-down", "scale-up", "slide-up", "rise"])
    .optional()
    .describe(
      '"scale-down" starts oversized and lands at final size. "scale-up" starts undersized and lands at final size. "slide-up" moves up into place, no fade. "rise" is a small upward move with an opacity fade.',
    ),
  arrivalFrames: z
    .number()
    .int()
    .positive()
    .optional()
    .describe("How long one line's own arrival takes, in frames — deliberately short."),
  stagger: z.number().int().nonnegative().optional().describe("Frames between each line's arrival starting."),
  accentLine: z
    .number()
    .int()
    .nonnegative()
    .nullable()
    .optional()
    .describe(
      "Deprecated — use accentLines. Index (0-based) of the line rendered in amber. If set and accentLines is empty, treated as [accentLine]. null = none.",
    ),
  accentLines: z
    .array(z.number().int().nonnegative())
    .optional()
    .describe("Indices (0-based) of the lines rendered in amber. Empty = none."),
  size: z.enum(["sm", "md", "lg", "xl"]).optional().describe("Type scale, from tokens.shared.ts."),
  align: z.enum(["left", "center"]).optional(),
  holdFrames: z
    .number()
    .int()
    .nonnegative()
    .optional()
    .describe("How long to hold on the fully arrived state before the composition ends."),
  impact: z
    .number()
    .optional()
    .describe(
      "A 2-frame vertical displacement of the whole frame, in pixels, the instant the last line lands. 0 disables it.",
    ),
});

export type SlamProps = z.infer<typeof slamSchema>;

// Defaults exported so SlamCompositions.tsx's calculateMetadata can fall
// back to the exact same values the component itself defaults to — one
// source of truth instead of numbers that could drift apart.
export const DEFAULT_ARRIVAL: SlamArrival = "scale-down";
export const DEFAULT_ARRIVAL_FRAMES = 8;
export const DEFAULT_STAGGER = 4;
export const DEFAULT_ACCENT_LINE: number | null = null;
export const DEFAULT_ACCENT_LINES: number[] = [];
export const DEFAULT_SIZE: SlamSize = "lg";
export const DEFAULT_ALIGN: SlamAlign = "left";
export const DEFAULT_HOLD_FRAMES = 60;
export const DEFAULT_IMPACT = 0;

/**
 * Total duration for a given text/timing combination: the last line's
 * own stagger delay, plus its arrival, plus the hold. Frame-deterministic
 * and shared with the component's own render — a pure function of props,
 * never a timer, so calculateMetadata and the render can't disagree.
 */
export const computeSlamDuration = (options: {
  lineCount: number;
  arrivalFrames: number;
  stagger: number;
  holdFrames: number;
}): number => (options.lineCount - 1) * options.stagger + options.arrivalFrames + options.holdFrames;

// size -> tokens.shared.ts's headline scale (FONT_SIZE_SM/MD/LG/XL_PX),
// authored at REFERENCE_HEIGHT_PX and scaled to the actual frame height
// below, per that file's own documented convention.
const SIZE_TOKENS_PX: Record<SlamSize, number> = {
  sm: tokens.FONT_SIZE_SM_PX,
  md: tokens.FONT_SIZE_MD_PX,
  lg: tokens.FONT_SIZE_LG_PX,
  xl: tokens.FONT_SIZE_XL_PX,
};

// Local layout-math constants — same convention as Marquee/Typewriter's
// own local ratios and BarChart's Y_MAX/Y_STEP: numbers that make this
// specific beat's motion/layout work, not design tokens shared across
// the system.
const MARGIN_RATIO = 0.12; // fraction of frame width — "the text sits in a lot of black even at xl"
const LINE_HEIGHT_RATIO = 1.15; // tight headline stacking, not Typewriter's spaced-out leading
const SCALE_DOWN_START = 1.6; // "starts oversized" — a definite, noticeable arrival without reading cartoonish
const SCALE_UP_START = 0.55; // "starts undersized"
const SLIDE_UP_OFFSET_RATIO = 0.9; // fraction of the line's own font size — a real slide, not a small move
const RISE_OFFSET_RATIO = 0.2; // fraction of the line's own font size — deliberately smaller than slide-up's
const IMPACT_DURATION_FRAMES = 2; // per the prop's own spec — "a 2-frame vertical displacement"

// Deterministic, synchronous text-width measurement via a throwaway
// canvas 2D context — same technique as Marquee.tsx/Typewriter.tsx,
// duplicated locally rather than imported (beats are independent).
let measureCtx: CanvasRenderingContext2D | null | undefined;
const measureTextWidth = (text: string, fontSizePx: number): number => {
  if (measureCtx === undefined) {
    measureCtx =
      typeof document === "undefined"
        ? null
        : document.createElement("canvas").getContext("2d");
  }
  if (!measureCtx) {
    return text.length * fontSizePx * 0.55;
  }
  measureCtx.font = `${tokens.FONT_WEIGHT_HERO} ${fontSizePx}px ${tokens.FONT_FAMILY_PRIMARY}`;
  return measureCtx.measureText(text).width;
};

/**
 * Large type arrives fast and stops hard. Each `\n`-separated line is its
 * own unit, staggered in one at a time. The restraint is in the timing —
 * a short, sharply-decelerated arrival (EASE_STANDARD, never a spring)
 * with no overshoot — not in the size of the move itself.
 *
 * When the last line lands, an optional `impact` displaces the whole
 * frame vertically for exactly 2 frames — a blunt, undamped thud, not an
 * eased bounce.
 */
export const Slam: React.FC<SlamProps> = ({
  text,
  arrival = DEFAULT_ARRIVAL,
  arrivalFrames = DEFAULT_ARRIVAL_FRAMES,
  stagger = DEFAULT_STAGGER,
  accentLine = DEFAULT_ACCENT_LINE,
  accentLines = DEFAULT_ACCENT_LINES,
  size = DEFAULT_SIZE,
  align = DEFAULT_ALIGN,
  holdFrames = DEFAULT_HOLD_FRAMES,
  impact = DEFAULT_IMPACT,
}) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();

  const lines = text.split("\n");

  // accentLine is deprecated in favour of accentLines: only consulted
  // when accentLines is empty (its default), so a caller who sets
  // accentLines explicitly always wins, and existing presets that only
  // ever set accentLine keep working unchanged.
  const resolvedAccentLines = accentLines.length > 0 ? accentLines : accentLine != null ? [accentLine] : [];

  const scaleFactor = height / tokens.REFERENCE_HEIGHT_PX;
  const fontSizePx = SIZE_TOKENS_PX[size] * scaleFactor;
  const lineHeightPx = fontSizePx * LINE_HEIGHT_RATIO;
  const marginPx = width * MARGIN_RATIO;

  const blockTop = (height - lineHeightPx * lines.length) / 2;

  const ease = Easing.bezier(...tokens.EASE_STANDARD);

  // Impact fires exactly when the last line's own arrival completes.
  const landingFrame = (lines.length - 1) * stagger + arrivalFrames;
  const framesSinceLanding = frame - landingFrame;
  const impactOffsetPx =
    impact !== 0 && framesSinceLanding >= 0 && framesSinceLanding < IMPACT_DURATION_FRAMES ? impact : 0;

  return (
    <AbsoluteFill style={{ overflow: "hidden" }}>
      <AbsoluteFill style={{ transform: `translateY(${impactOffsetPx}px)` }}>
        {lines.map((line, i) => {
          const lineStart = i * stagger;
          const t = interpolate(frame, [lineStart, lineStart + arrivalFrames], [0, 1], {
            easing: ease,
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          });

          let scale = 1;
          let translateY = 0;
          if (arrival === "scale-down") scale = 1 + (SCALE_DOWN_START - 1) * (1 - t);
          else if (arrival === "scale-up") scale = SCALE_UP_START + (1 - SCALE_UP_START) * t;
          else if (arrival === "slide-up") translateY = SLIDE_UP_OFFSET_RATIO * fontSizePx * (1 - t);
          else if (arrival === "rise") translateY = RISE_OFFSET_RATIO * fontSizePx * (1 - t);

          // Every arrival is a hard cut to visible at its own start frame
          // except "rise", whose opacity fade is t itself (0 before
          // lineStart, since t is clamped there too).
          const opacity = arrival === "rise" ? t : frame >= lineStart ? 1 : 0;

          const lineUpper = line.toUpperCase();
          const lineLeftX =
            align === "center" ? (width - measureTextWidth(lineUpper, fontSizePx)) / 2 : marginPx;

          return (
            <div
              key={i}
              style={{
                position: "absolute",
                top: blockTop + i * lineHeightPx,
                left: lineLeftX,
                height: lineHeightPx,
                display: "flex",
                alignItems: "center",
                whiteSpace: "nowrap",
                opacity,
                transform: `translateY(${translateY}px) scale(${scale})`,
                transformOrigin: align === "center" ? "50% 50%" : "0% 50%",
                fontFamily: tokens.FONT_FAMILY_PRIMARY,
                fontWeight: tokens.FONT_WEIGHT_HERO,
                fontSize: fontSizePx,
                textTransform: tokens.TEXT_TRANSFORM_LABEL,
                letterSpacing: `${tokens.LETTER_SPACING_WIDE_EM}em`,
                color: resolvedAccentLines.includes(i) ? tokens.COLOR_AMBER_GAP : tokens.COLOR_WHITE,
              }}
            >
              {lineUpper}
            </div>
          );
        })}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
