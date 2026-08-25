import React from "react";
import { AbsoluteFill, Easing, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { loadFont } from "@remotion/google-fonts/SpaceGrotesk";
import * as tokens from "../tokens.shared";

// Same font as BarChart.tsx (Space Grotesk, matching FONT_FAMILY_PRIMARY)
// and the same loadFont pattern — but only the light weight, since this
// beat never sets type any heavier. Loaded independently rather than
// relying on BarChart's own call: beats are independent, one must never
// import another.
loadFont("normal", { weights: ["300"] });

// Not in tokens.shared.ts — every variant (a/b/c) picks its own tracking
// for uppercase labels, and this beat isn't itself variant-switchable.
// 0.08em matches tokens.b.ts's LETTER_SPACING_LABEL_EM (the "balanced,
// un-editorialised" variant) rather than inventing a fresh number.
const LETTER_SPACING_EM = 0.08;

// How much of a row's own height the glyphs are sized to fill. Local,
// same convention as BarChart's Y_MAX/Y_STEP (data/layout math, not a
// design token) — this ratio only exists to make type fit an arbitrary,
// caller-chosen row count. Considerably lower than a dense-type beat
// would use: the rows should read as sparse lines with black space
// between them, not a packed wall of type.
const FONT_FILL_RATIO = 0.34;

// Fill rows read as dim, structural type — reusing OPACITY_HAIRLINE
// rather than inventing a "low opacity" number of its own. Outline rows
// stay at the standard label opacity: at hairline stroke width, dimming
// them too would risk the stroke disappearing entirely on a compressed
// export.
const FILL_OPACITY = tokens.OPACITY_HAIRLINE;
const OUTLINE_OPACITY = tokens.OPACITY_LABEL;

export type MarqueeProps = {
  /** The phrase repeated across every row. */
  text: string;
  /** How many horizontal rows fill the frame. */
  rows?: number;
  /** Scroll speed, in pixels per second — a literal, constant velocity,
   * not an eased move. */
  speed?: number;
  /** Type colour: solid fill on solid rows, outline colour on outline
   * rows. */
  fg?: string;
  /** Frame background. Left unset, the frame is transparent — the
   * standalone-render convention every beat in this library follows. */
  bg?: string;
  /** Alternate rows between solid fill and outline-only
   * (-webkit-text-stroke) type. false = every row solid. */
  strokeAlternate?: boolean;
  /** The end value of the zoom — the beat always starts at 1.0 and
   * eases to scaleTo across its own duration (calculateMetadata's
   * durationInFrames). scaleTo: 1 means no zoom. */
  scaleTo?: number;
  /** Row index (0-based) to render in amber instead of fg — this beat's
   * one deliberate accent, per AISEIRI.md's "non-data beats: amber is
   * the accent colour, used sparingly." Renders solid (never outline)
   * and at full opacity regardless of that row's own fill/outline
   * parity, so it reads as the one deliberate colour move rather than
   * blending into the surrounding structure. Default: none. */
  accentRow?: number;
};

// Deterministic, synchronous text-width measurement via a throwaway
// canvas 2D context. Remotion always renders inside a real Chromium
// instance (Studio and the CLI render alike), so this is safe to call
// directly during render — no DOM layout pass or effect required, and no
// dependency on a separate text-measuring package.
let measureCtx: CanvasRenderingContext2D | null | undefined;
const measureTextWidth = (text: string, fontSizePx: number): number => {
  if (measureCtx === undefined) {
    measureCtx =
      typeof document === "undefined"
        ? null
        : document.createElement("canvas").getContext("2d");
  }
  if (!measureCtx) {
    // Fallback for a context without canvas (shouldn't happen under
    // Remotion) — a conservative per-character estimate at this size.
    return text.length * fontSizePx * 0.55;
  }
  measureCtx.font = `${tokens.FONT_WEIGHT_HERO} ${fontSizePx}px ${tokens.FONT_FAMILY_PRIMARY}`;
  return measureCtx.measureText(text).width;
};

// Local layout-math constants (not tokens — same convention as BarChart's
// Y_MAX/Y_STEP: "nothing here is hardcoded except the data-driven layout
// math"). SAFETY_FACTOR is buffer beyond the measured/estimated minimum
// row width, since measureText and actual DOM layout can differ slightly
// (kerning, subpixel rounding) — this is what keeps a row from ever
// visibly running out of repeated text ("seamless, no visible seam").
// MIN_REPEATS keeps the pattern reading as "a repeated phrase" even for a
// long phrase on a small/slow-scrolling frame.
const SAFETY_FACTOR = 1.5;
const MIN_REPEATS = 4;

/**
 * Rows of `text`, repeated and scrolling horizontally, filling the frame.
 * Alternate rows scroll in opposite directions and (when
 * strokeAlternate) alternate between solid fill and outline-only type.
 * Sparse by default — restrained, hairline, considerable black space
 * between rows, per the Aiséirí language (AISEIRI.md).
 *
 * Each row repeats its phrase enough times that, for the given speed and
 * the composition's own duration, the row never runs out of text
 * mid-scroll — the seamless-loop requirement, met by generous coverage
 * rather than a wrapping/looping transform.
 */
export const Marquee: React.FC<MarqueeProps> = ({
  text,
  rows = 10,
  speed = 90,
  fg = tokens.COLOR_WHITE,
  bg,
  strokeAlternate = true,
  scaleTo = 1,
  accentRow,
}) => {
  const frame = useCurrentFrame();
  const { width, height, fps, durationInFrames } = useVideoConfig();

  const rowHeight = height / rows;
  const fontSizePx = rowHeight * FONT_FILL_RATIO;

  // Non-breaking spaces so the gap between repeats can never collapse
  // under normal CSS whitespace rules, and so the canvas measurement
  // below matches what actually renders.
  const unit = `${text.toUpperCase()}    `;
  const unitWidth = measureTextWidth(unit, fontSizePx);

  // Upper bound on how far any row travels over the whole beat.
  const maxTravelPx = (durationInFrames / fps) * speed;

  // Enough repeats that a row's rendered width comfortably covers the
  // frame plus the full distance it will ever travel — see SAFETY_FACTOR
  // above.
  const rowContentWidth = (width + maxTravelPx) * SAFETY_FACTOR;
  const repeatCount = Math.max(MIN_REPEATS, Math.ceil(rowContentWidth / unitWidth));
  const rowText = unit.repeat(repeatCount);

  const travelled = (frame / fps) * speed;

  const zoomEase = Easing.bezier(...tokens.EASE_STANDARD);
  const currentScale =
    scaleTo === 1 || durationInFrames <= 1
      ? scaleTo
      : interpolate(frame, [0, durationInFrames - 1], [1, scaleTo], {
          easing: zoomEase,
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        });

  return (
    <AbsoluteFill style={{ backgroundColor: bg, overflow: "hidden" }}>
      <AbsoluteFill style={{ transform: `scale(${currentScale})`, transformOrigin: "50% 50%" }}>
        {Array.from({ length: rows }, (_, i) => {
          const isAccent = accentRow === i;
          const scrollsLeft = i % 2 === 0;
          const outline = !isAccent && strokeAlternate && i % 2 === 1;
          const rowColor = isAccent ? tokens.COLOR_AMBER_GAP : fg;
          const rowOpacity = isAccent ? tokens.OPACITY_BOLD : outline ? OUTLINE_OPACITY : FILL_OPACITY;
          // Left-scrolling rows run 0 -> -maxTravelPx; right-scrolling
          // rows run -maxTravelPx -> 0 — the same repeated content block,
          // just traversed from opposite ends, so both directions need
          // only the one rowContentWidth computed above.
          const translateX = scrollsLeft ? -travelled : travelled - maxTravelPx;

          return (
            <div
              key={i}
              style={{
                position: "absolute",
                top: i * rowHeight,
                left: 0,
                width,
                height: rowHeight,
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  height: rowHeight,
                  display: "flex",
                  alignItems: "center",
                  whiteSpace: "nowrap",
                  transform: `translateX(${translateX}px)`,
                  opacity: rowOpacity,
                  fontFamily: tokens.FONT_FAMILY_PRIMARY,
                  fontWeight: tokens.FONT_WEIGHT_HERO,
                  fontSize: fontSizePx,
                  textTransform: tokens.TEXT_TRANSFORM_LABEL,
                  letterSpacing: `${LETTER_SPACING_EM}em`,
                  color: outline ? "transparent" : rowColor,
                  WebkitTextStroke: outline ? `${tokens.STROKE_HAIRLINE_PX}px ${rowColor}` : undefined,
                }}
              >
                {rowText}
              </div>
            </div>
          );
        })}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
