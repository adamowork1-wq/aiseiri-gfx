import React, { useId } from "react";
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

export type LiftRange = { start: number; from: number; to: number };
export type LiftsData = Record<"bench" | "squat" | "clean", LiftRange>;

type Props = {
  tokens: TokenSet;
  data: LiftsData;
  width: number;
  height: number;
  variantLabel: string;
  /** Split the achieved (0→current) segment at `start` — dim 0→start,
   * solid start→current, plus a hairline tick at the boundary. false
   * restores the original two-segment bar (achieved white, gap amber).
   * Default true. */
  showStart?: boolean;
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
 * revealed in two beats:
 *
 *   Beat 1 (all bars together, frame 0): the achieved segment grows from
 *   the baseline up to the current value ("from"). When showStart is on
 *   (the default) this same growing extent is split at the fixed
 *   `start` boundary into two — dim 0→start, solid start→current — plus
 *   a hairline tick marking that boundary; the split animates in with
 *   the bar rather than appearing separately, since both pieces derive
 *   from the one growing top edge. showStart: false renders it as the
 *   original single white segment.
 *
 *   Beat 2 (staggered bench → squat → clean, after a short pause): the
 *   amber segment — the gap between current and target — grows from the
 *   top of the achieved segment up to the target value ("to"). Untouched
 *   by showStart.
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
  showStart = true,
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

  // Unique per mounted instance so the <filter> id never collides if more
  // than one BarChart is in the DOM at once (e.g. multiple compositions
  // open in Studio at the same time).
  const uid = useId().replace(/:/g, "");
  const glowFilterId = `amber-glow-${uid}`;

  // Extra clearance the target-value label needs above the bar top so the
  // amber glow's blur falloff (~3 std-deviations before it's visually
  // gone) doesn't reach it — a Gaussian blur is what's bleeding onto it,
  // so the fix is sized off that same filter parameter rather than a
  // guessed gap. Moves the label clear; the glow filter itself is
  // untouched.
  const targetLabelClearance =
    tokens.SPACE_SM_PX + tokens.GLOW_BLUR_STD_DEVIATION_PX * 3;

  return (
    <div
      style={{
        width,
        height,
        // No background fill — intentionally transparent. Per the system's
        // framing decision, this renders as an isolated specimen graphic
        // composited over footage, not as its own filled frame. COLOR_BLACK
        // is still used elsewhere (the current-value labels, sitting on
        // the white fill) — it's just never painted across the whole
        // canvas. Every preview PNG up to now showed solid black because
        // this div painted it directly; removing that line is the actual
        // change that makes the export transparent, not a rendering flag.
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
        The Total
      </div>

      <svg
        width={width}
        height={height}
        style={{ position: "absolute", left: 0, top: 0 }}
      >
        <defs>
          {/* Soft outer bloom for the amber segment only — blurs a copy of
              the shape and merges the crisp original on top, so the glow
              reads as light spilling outward rather than a blurred bar. */}
          <filter
            id={glowFilterId}
            x="-60%"
            y="-60%"
            width="220%"
            height="220%"
          >
            <feGaussianBlur
              stdDeviation={tokens.GLOW_BLUR_STD_DEVIATION_PX}
              result="blur"
            />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

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
          const { start, from, to } = data[key];
          const slotX = plotLeft + i * slotWidth;
          const barX = slotX + (slotWidth - barWidth) / 2;
          const barTop = scaleY(to); // final resting position, for the label
          const fromY = scaleY(from); // fixed boundary between achieved and gap
          const startY = scaleY(start); // fixed boundary between dim and solid, within achieved

          const beat2Start =
            tokens.DURATION_ENTER_FRAMES +
            tokens.PAUSE_BETWEEN_BEATS_FRAMES +
            i * tokens.STAGGER_FRAMES;

          // Beat 1 — grows up from the baseline to the current value.
          const whiteTop = animate(0, tokens.DURATION_ENTER_FRAMES, plotBottom, fromY);
          const whiteHeight = plotBottom - whiteTop;

          // Split that same growing extent at the fixed `start` boundary.
          // Plain clamps against the one live whiteTop value above, not
          // separate frame math: while whiteTop is still below start
          // (larger y — hasn't grown that far yet), the dim rect is
          // simply [whiteTop, plotBottom] and the solid rect is zero
          // height; once whiteTop passes start, dim locks to its full
          // [startY, plotBottom] extent and solid takes over the rest.
          // This is what makes the split animate in with the bar instead
          // of appearing separately.
          const dimTop = Math.max(whiteTop, startY);
          const dimHeight = Math.max(0, plotBottom - dimTop);
          const solidBottom = Math.min(plotBottom, startY);
          const solidHeight = Math.max(0, solidBottom - whiteTop);

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

          // Target-value label fades in the moment this bar's own beat 2
          // starts growing — matched to the same per-bar stagger since it
          // keys off this bar's own beat2Start directly. Quick, opacity
          // only: animates straight to OPACITY_LABEL (its normal resting
          // opacity) rather than to 1, so it doesn't end up brighter than
          // every other label once settled. DURATION_MICRO_FRAMES is the
          // token already documented for exactly this ("a single label"
          // flicking in), reused rather than inventing a new one.
          const targetLabelOpacity = animate(
            beat2Start,
            tokens.DURATION_MICRO_FRAMES,
            0,
            tokens.OPACITY_LABEL,
          );

          return (
            <g key={key}>
              {showStart ? (
                <>
                  {/* 0 → start — dim, low opacity. Where the block began. */}
                  <rect
                    x={barX}
                    y={dimTop}
                    width={barWidth}
                    height={dimHeight}
                    fill={white(tokens.OPACITY_HAIRLINE)}
                  />
                  {/* start → current — solid, full opacity. Progress made. */}
                  <rect
                    x={barX}
                    y={whiteTop}
                    width={barWidth}
                    height={solidHeight}
                    fill={white(tokens.OPACITY_BOLD)}
                  />
                  {/* Hairline tick at the start boundary — legible even
                      when progress is small, since it's a fixed marker,
                      not something that only shows once the bar reaches
                      it. Same hairline vocabulary as the y-axis ticks
                      above. */}
                  <line
                    x1={barX}
                    x2={barX + barWidth}
                    y1={startY}
                    y2={startY}
                    stroke={white(tokens.OPACITY_HAIRLINE)}
                    strokeWidth={tokens.STROKE_HAIRLINE_PX}
                  />
                </>
              ) : (
                <rect
                  x={barX}
                  y={whiteTop}
                  width={barWidth}
                  height={whiteHeight}
                  fill={white(tokens.OPACITY_BOLD)}
                />
              )}

              {/* Current-value label, black, centred inside the white
                  segment's final resting position — same static-label
                  convention as the target/category labels below. Sits
                  above the white rect in DOM order so it stays legible
                  once the white fill covers it; before that (early beat
                  1) it's black-on-black, which just means it reads in as
                  the bar grows up around it rather than needing its own
                  fade/reveal logic. */}
              <text
                x={barX + barWidth / 2}
                y={(plotBottom + fromY) / 2}
                textAnchor="middle"
                dominantBaseline="middle"
                fill={tokens.COLOR_BLACK}
                style={labelStyle}
              >
                {from}
              </text>

              <rect
                x={barX}
                y={amberTop}
                width={barWidth}
                height={amberHeight}
                fill={tokens.COLOR_AMBER_GAP}
                filter={`url(#${glowFilterId})`}
              />

              <text
                x={barX + barWidth / 2}
                y={barTop - targetLabelClearance}
                textAnchor="middle"
                fill={white(targetLabelOpacity)}
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
