import React from "react";
import {
  AbsoluteFill,
  Easing,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { loadFont } from "@remotion/google-fonts/SpaceGrotesk";
import { z } from "zod";
import * as tokens from "../tokens.shared";

// Same font/weight as the other type beats — Space Grotesk, light weight
// only. Loaded independently rather than relying on another beat's own
// call: beats are independent, one must never import another.
loadFont("normal", { weights: ["300"] });

export type OdometerSize = "lg" | "xl";
export type OdometerAlign = "left" | "center";
export type OdometerDataSource =
  | "manual"
  | "squat"
  | "bench"
  | "clean"
  | "total";

// Schema (not a plain TS type) so every field is editable live from the
// Remotion Studio props panel — see AISEIRI.md's "fully editable from the
// props panel" rule. Each .describe() carries the field's documentation;
// it doubles as the tooltip Studio shows next to that control.
export const odometerSchema = z.object({
  from: z.number().optional(),
  to: z.number().optional(),
  decimals: z.number().int().nonnegative().optional(),
  suffix: z.string().optional(),
  label: z
    .string()
    .optional()
    .describe("Small uppercase caption below the number."),
  countFrames: z
    .number()
    .int()
    .positive()
    .optional()
    .describe("How long the count-up takes, in frames."),
  holdFrames: z
    .number()
    .int()
    .nonnegative()
    .optional()
    .describe(
      "How long to hold on the final value before the composition ends.",
    ),
  target: z
    .number()
    .nullable()
    .optional()
    .describe(
      'When set, renders "to / target" with the target dimmer, plus a gap line in amber. null = none.',
    ),
  size: z
    .enum(["lg", "xl"])
    .optional()
    .describe("Type scale, from tokens.shared.ts."),
  align: z.enum(["left", "center"]).optional(),
  dataSource: z
    .enum(["manual", "squat", "bench", "clean", "total"])
    .optional()
    .describe(
      'When not "manual", from/to/target are overridden by the matching values from public/data.json (calculateMetadata) — from is always 0.',
    ),
});

export type OdometerProps = z.infer<typeof odometerSchema>;

// Defaults exported so OdometerCompositions.tsx's calculateMetadata can
// fall back to the exact same values the component itself defaults to —
// one source of truth instead of numbers that could drift apart.
export const DEFAULT_FROM = 0;
export const DEFAULT_TO = 100;
export const DEFAULT_DECIMALS = 1;
export const DEFAULT_SUFFIX = "KG";
export const DEFAULT_LABEL = "";
export const DEFAULT_COUNT_FRAMES = 50;
export const DEFAULT_HOLD_FRAMES = 40;
export const DEFAULT_TARGET: number | null = null;
export const DEFAULT_SIZE: OdometerSize = "xl";
export const DEFAULT_ALIGN: OdometerAlign = "center";
export const DEFAULT_DATA_SOURCE: OdometerDataSource = "manual";

export const computeOdometerDuration = (options: {
  countFrames: number;
  holdFrames: number;
}): number => options.countFrames + options.holdFrames;

// size -> tokens.shared.ts's headline scale (added for Slam, reused
// here), authored at REFERENCE_HEIGHT_PX and scaled to the actual frame
// height below, per that file's own documented convention.
const SIZE_TOKENS_PX: Record<OdometerSize, number> = {
  lg: tokens.FONT_SIZE_LG_PX,
  xl: tokens.FONT_SIZE_XL_PX,
};

// Local layout-math constants — same convention as the other type beats'
// own local ratios: numbers that make this specific beat's layout work,
// not design tokens shared across the system.
const MARGIN_RATIO = 0.12; // fraction of frame width, align="left"
const LINE_GAP_RATIO = 0.9; // vertical gap between stacked lines, relative to the label size — quiet, not cramped
const TARGET_SPACING_RATIO = 0.2; // gap before "/ target", relative to the big number's own size

/**
 * A large number counts up from `from` to `to`, decelerating into its
 * final figure, with a small uppercase label beneath it. Optionally a
 * second, dimmer number appears alongside as `target`, with the gap
 * between them called out on its own line in amber — this beat's data
 * meaning for amber (AISEIRI.md: "data beats — amber is reserved
 * strictly for gap-to-target").
 *
 * The count is frame-deterministic: displayed value is derived purely
 * from frame/fps/countFrames via a sharp deceleration curve
 * (EASE_STANDARD), never a spring or a timer.
 */
export const Odometer: React.FC<OdometerProps> = ({
  from = DEFAULT_FROM,
  to = DEFAULT_TO,
  decimals = DEFAULT_DECIMALS,
  suffix = DEFAULT_SUFFIX,
  label = DEFAULT_LABEL,
  countFrames = DEFAULT_COUNT_FRAMES,
  holdFrames = DEFAULT_HOLD_FRAMES,
  target = DEFAULT_TARGET,
  size = DEFAULT_SIZE,
  align = DEFAULT_ALIGN,
}) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();

  const scaleFactor = height / tokens.REFERENCE_HEIGHT_PX;
  const bigFontSizePx = SIZE_TOKENS_PX[size] * scaleFactor;
  const labelFontSizePx = tokens.FONT_SIZE_LABEL_PX * scaleFactor;
  const marginPx = width * MARGIN_RATIO;

  const ease = Easing.bezier(...tokens.EASE_STANDARD);
  const progress = interpolate(
    frame,
    [0, Math.max(1, countFrames - 1)],
    [0, 1],
    {
      easing: ease,
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    },
  );
  const countedText = (from + (to - from) * progress).toFixed(decimals);
  const targetText = target != null ? target.toFixed(decimals) : "";
  // The gap is a fact about the (final) data, not the still-animating
  // display value — computed from `to`, not the counted-up figure.
  const gapText = target != null ? (target - to).toFixed(decimals) : "";

  const baseTextStyle: React.CSSProperties = {
    fontFamily: tokens.FONT_FAMILY_PRIMARY,
    fontWeight: tokens.FONT_WEIGHT_HERO,
    textTransform: tokens.TEXT_TRANSFORM_LABEL,
    letterSpacing: `${tokens.LETTER_SPACING_WIDE_EM}em`,
    color: tokens.COLOR_WHITE,
  };

  return (
    <AbsoluteFill
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: align === "center" ? "center" : "flex-start",
        justifyContent: "center",
        paddingLeft: marginPx,
        paddingRight: marginPx,
        gap: labelFontSizePx * LINE_GAP_RATIO,
        scale: 30,
      }}
    >
      {/* The number is the only large element — everything else below
          is small and quiet. Tabular figures so digits don't jitter as
          they change. */}
      <div
        style={{
          ...baseTextStyle,
          display: "flex",
          alignItems: "baseline",
          fontSize: bigFontSizePx,
          fontFeatureSettings: tokens.FONT_FEATURE_TABULAR_NUMS,
        }}
      >
        <span style={{ opacity: tokens.OPACITY_BOLD }}>
          {countedText}
          {suffix}
        </span>
        {target != null && (
          <span
            style={{
              opacity: tokens.OPACITY_LABEL,
              marginLeft: bigFontSizePx * TARGET_SPACING_RATIO,
            }}
          >
            {"/ "}
            {targetText}
            {suffix}
          </span>
        )}
      </div>
      {label && (
        <div
          style={{
            ...baseTextStyle,
            fontSize: labelFontSizePx,
            opacity: tokens.OPACITY_LABEL,
          }}
        >
          {label}
        </div>
      )}
      {target != null && (
        <div
          style={{
            ...baseTextStyle,
            fontSize: labelFontSizePx,
            fontFeatureSettings: tokens.FONT_FEATURE_TABULAR_NUMS,
            color: tokens.COLOR_AMBER_GAP,
          }}
        >
          GAP {gapText}
          {suffix}
        </div>
      )}
    </AbsoluteFill>
  );
};
