import React from "react";
import { Easing, interpolate, useCurrentFrame } from "remotion";
import { loadFont } from "@remotion/google-fonts/SpaceGrotesk";
import type * as TokensB from "../tokens.b";

// Registers the @font-face and blocks rendering (via Remotion's
// delayRender/continueRender) until it's ready. The family name this loads
// is "Space Grotesk" — matching FONT_FAMILY_PRIMARY in tokens.shared.ts —
// so components can keep reading that token as-is; this call just makes it
// real instead of falling back to the browser's default sans-serif.
loadFont("normal", { weights: ["300", "500"] });

// Structural type covering whatever tokens.a / tokens.b / tokens.c export —
// all three re-export the same names from tokens.shared and override the
// same handful of fields, so any one of them is a valid stand-in for typing.
type TokenSet = typeof TokensB;

export type LiftRange = { from: number; to: number };
export type LiftsData = Record<"bench" | "squat" | "clean", LiftRange>;

type Props = {
  tokens: TokenSet;
  data: LiftsData;
  width: number;
  height: number;
  variantLabel: string;
};

const CATEGORIES: Array<{ key: keyof LiftsData; label: string }> = [
  { key: "bench", label: "BENCH" },
  { key: "squat", label: "SQUAT" },
  { key: "clean", label: "CLEAN" },
];

const Y_MAX = 250; // kg — headroom above the highest target (squat: 215)
const Y_STEP = 50; // gridline / tick interval, kg

const white = (opacity: number) => `rgba(255, 255, 255, ${opacity})`;

/**
 * Vertical bar chart: one bar per lift, y-axis in kg, x-axis category
 * labels. Axes and labels are static (present from frame 0). Each bar is
 * two stacked segments, revealed in two beats:
 *
 *   Beat 1 (all bars together, frame 0): the white segment grows from the
 *   baseline up to the current value ("from").
 *
 *   Beat 2 (staggered bench → squat → clean, after a short pause): the
 *   amber segment — the gap between current and target — grows from the
 *   top of the white segment up to the target value ("to").
 *
 * Then the resolved state holds. All timing comes from
 * tokens.shared.ts (DURATION_ENTER_FRAMES, PAUSE_BETWEEN_BEATS_FRAMES,
 * STAGGER_FRAMES, DURATION_LINE_DRAW_FRAMES, HOLD_MIN_FRAMES,
 * EASE_STANDARD) — nothing here is hardcoded except the data-driven layout
 * math (axis domain, bar count).
 */
export const BarChart: React.FC<Props> = ({
  tokens,
  data,
  width,
  height,
  variantLabel,
}) => {
  const frame = useCurrentFrame();
  const ease = Easing.bezier(...tokens.EASE_STANDARD);

  // Animates a pixel value from `fromVal` to `toVal` over `duration` frames
  // starting at `start`, eased per EASE_STANDARD, clamped before/after.
  const animate = (
    start: number,
    duration: number,
    fromVal: number,
    toVal: number,
  ) =>
    interpolate(frame, [start, start + duration], [fromVal, toVal], {
      easing: ease,
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    });

  const shorterDim = Math.min(width, height);
  const margin = tokens.SPECIMEN_MARGIN_RATIO * shorterDim;

  // Room reserved for axis tick numerals / category labels, scaled by the
  // variant's own spacing + label size tokens.
  const yAxisGutter = tokens.SPACE_LG_PX + tokens.FONT_SIZE_LABEL_PX * 1.6;
  const xAxisGutter = tokens.SPACE_LG_PX + tokens.FONT_SIZE_LABEL_PX * 1.6;

  // The title sits in its own band above the plot, sized off the label
  // line-height plus a full spacing unit — so it can never collide with the
  // topmost gridline/tick regardless of which variant's label size or
  // spacing scale is in effect.
  const titleBlockHeight = tokens.FONT_SIZE_LABEL_PX * 1.3;
  const titleGap = tokens.SPACE_LG_PX;

  const plotLeft = margin + yAxisGutter;
  const plotRight = width - margin;
  const plotTop = margin + titleBlockHeight + titleGap;
  const plotBottom = height - margin - xAxisGutter;

  const scaleY = (v: number) =>
    plotBottom - (v / Y_MAX) * (plotBottom - plotTop);

  const slotWidth = (plotRight - plotLeft) / CATEGORIES.length;
  const barWidth = slotWidth * 0.4;

  const yTicks: number[] = [];
  for (let v = 0; v <= Y_MAX; v += Y_STEP) yTicks.push(v);

  const labelStyle: React.CSSProperties = {
    fontSize: tokens.FONT_SIZE_LABEL_PX,
    fontWeight: tokens.FONT_WEIGHT_LABEL,
    fontFeatureSettings: tokens.FONT_FEATURE_TABULAR_NUMS,
  };

  return (
    <div
      style={{
        width,
        height,
        background: tokens.COLOR_BLACK,
        position: "relative",
        fontFamily: tokens.FONT_FAMILY_PRIMARY,
      }}
    >
      {/* Title — occupies its own reserved band; plotTop starts below it */}
      <div
        style={{
          position: "absolute",
          left: margin,
          top: margin,
          fontSize: tokens.FONT_SIZE_LABEL_PX,
          fontWeight: tokens.FONT_WEIGHT_LABEL,
          letterSpacing: `${tokens.LETTER_SPACING_LABEL_EM}em`,
          color: white(tokens.OPACITY_LABEL),
          textTransform: tokens.TEXT_TRANSFORM_LABEL,
        }}
      >
        {`Training max (kg) — variant ${variantLabel}`}
      </div>

      <svg
        width={width}
        height={height}
        style={{ position: "absolute", left: 0, top: 0 }}
      >
        {/* Gridlines + y-axis ticks/numerals — hairline weight */}
        {yTicks.map((v) => {
          const y = scaleY(v);
          return (
            <g key={v}>
              <line
                x1={plotLeft}
                x2={plotRight}
                y1={y}
                y2={y}
                stroke={white(tokens.OPACITY_HAIRLINE)}
                strokeWidth={tokens.STROKE_HAIRLINE_PX}
              />
              <line
                x1={plotLeft - 8}
                x2={plotLeft}
                y1={y}
                y2={y}
                stroke={white(tokens.OPACITY_HAIRLINE)}
                strokeWidth={tokens.STROKE_HAIRLINE_PX}
              />
              <text
                x={plotLeft - 8 - tokens.SPACE_XS_PX}
                y={y}
                textAnchor="end"
                dominantBaseline="middle"
                fill={white(tokens.OPACITY_LABEL)}
                style={labelStyle}
              >
                {v}
              </text>
            </g>
          );
        })}

        {/* Axis frame — the one bold-weight element in this composition */}
        <line
          x1={plotLeft}
          x2={plotRight}
          y1={plotBottom}
          y2={plotBottom}
          stroke={white(tokens.OPACITY_BOLD)}
          strokeWidth={tokens.STROKE_BOLD_PX}
        />
        <line
          x1={plotLeft}
          x2={plotLeft}
          y1={plotTop}
          y2={plotBottom}
          stroke={white(tokens.OPACITY_BOLD)}
          strokeWidth={tokens.STROKE_BOLD_PX}
        />

        {/* Bars — white (current value, beat 1) + amber (gap to target,
            beat 2, staggered per bar). Value/category labels are static. */}
        {CATEGORIES.map(({ key, label }, i) => {
          const { from, to } = data[key];
          const slotX = plotLeft + i * slotWidth;
          const barX = slotX + (slotWidth - barWidth) / 2;
          const barTop = scaleY(to); // final resting position, for the label
          const fromY = scaleY(from); // fixed boundary between the two segments

          const beat2Start =
            tokens.DURATION_ENTER_FRAMES +
            tokens.PAUSE_BETWEEN_BEATS_FRAMES +
            i * tokens.STAGGER_FRAMES;

          // Beat 1 — grows up from the baseline to the current value.
          const whiteTop = animate(0, tokens.DURATION_ENTER_FRAMES, plotBottom, fromY);
          const whiteHeight = plotBottom - whiteTop;

          // Beat 2 — grows up from the fixed from/to boundary to the
          // target. Anchored to the fixed `fromY`, not the live `whiteTop`:
          // amberTop clamps to fromY for every frame before beat2Start —
          // including all of beat 1 — so sizing the amber segment against
          // the still-animating whiteTop let it prematurely fill the gap
          // between the rising white top and its resting position, well
          // before beat 1 had actually finished. Anchoring both ends of
          // this segment to fixed/animated-only-after-its-own-start values
          // keeps it at zero height until beat2Start, as intended.
          const amberTop = animate(
            beat2Start,
            tokens.DURATION_LINE_DRAW_FRAMES,
            fromY,
            scaleY(to),
          );
          const amberHeight = fromY - amberTop;

          return (
            <g key={key}>
              <rect
                x={barX}
                y={whiteTop}
                width={barWidth}
                height={whiteHeight}
                fill={white(tokens.OPACITY_BOLD)}
              />
              <rect
                x={barX}
                y={amberTop}
                width={barWidth}
                height={amberHeight}
                fill={tokens.COLOR_AMBER_GAP}
              />

              <text
                x={barX + barWidth / 2}
                y={barTop - tokens.SPACE_SM_PX}
                textAnchor="middle"
                fill={white(tokens.OPACITY_LABEL)}
                style={labelStyle}
              >
                {to}
              </text>

              <text
                x={slotX + slotWidth / 2}
                y={plotBottom + tokens.SPACE_MD_PX + tokens.FONT_SIZE_LABEL_PX}
                textAnchor="middle"
                fill={white(tokens.OPACITY_LABEL)}
                style={{
                  ...labelStyle,
                  letterSpacing: `${tokens.LETTER_SPACING_LABEL_EM}em`,
                }}
              >
                {label}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
};
