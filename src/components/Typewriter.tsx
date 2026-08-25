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

// Same font/weight as Marquee.tsx (and BarChart.tsx) — Space Grotesk,
// light weight only. Loaded independently rather than relying on another
// beat's own call: beats are independent, one must never import another.
loadFont("normal", { weights: ["300"] });

export type TypewriterAlign = "left" | "center";
export type TypewriterAccent = "none" | "line2" | "cursor";

// Schema (not a plain TS type) so every field is editable live from the
// Remotion Studio props panel — see AISEIRI.md's "fully editable from the
// props panel" rule. Each .describe() carries the field's documentation;
// it doubles as the tooltip Studio shows next to that control.
export const typewriterSchema = z.object({
  line1: z.string(),
  line2: z.string().optional(),
  charsPerSecond: z.number().positive().optional().describe("Reveal rate, in characters per second."),
  holdFrames: z
    .number()
    .int()
    .nonnegative()
    .optional()
    .describe("How long to sit on the completed text, in frames, before the composition ends."),
  align: z.enum(["left", "center"]).optional(),
  accent: z
    .enum(["none", "line2", "cursor"])
    .optional()
    .describe(
      "Which element renders in amber — this beat's one deliberate accent, per AISEIRI.md's \"non-data beats: amber is the accent colour, used sparingly.\" Default: none (everything white).",
    ),
  cursorBlinkRate: z
    .number()
    .positive()
    .optional()
    .describe("Cursor blink rate, in blinks per second, once the reveal completes. The cursor is solid (never blinking) while text is still revealing."),
  scaleTo: z
    .number()
    .optional()
    .describe(
      "The end value of the zoom — the beat always starts at 1.0 and eases to scaleTo across its own duration (calculateMetadata's durationInFrames). scaleTo: 1 means no zoom.",
    ),
});

export type TypewriterProps = z.infer<typeof typewriterSchema>;

// Defaults exported so TypewriterCompositions.tsx's calculateMetadata can
// fall back to the exact same values the component itself defaults to —
// one source of truth instead of two numbers that could drift apart.
export const DEFAULT_CHARS_PER_SECOND = 18;
export const DEFAULT_HOLD_FRAMES = 60;
export const DEFAULT_ALIGN: TypewriterAlign = "left";
export const DEFAULT_ACCENT: TypewriterAccent = "none";
export const DEFAULT_CURSOR_BLINK_RATE = 2;
export const DEFAULT_SCALE_TO = 1;

/**
 * Frame-deterministic reveal timing — derived purely from text length,
 * fps and charsPerSecond, never from a timer or component state. Shared
 * by the component's own render (for the reveal + cursor position) and
 * by calculateMetadata (for the composition's total duration), so the
 * two can never disagree about when the reveal finishes.
 */
export const computeTypewriterTiming = (options: {
  line1: string;
  line2?: string;
  fps: number;
  charsPerSecond: number;
}): {
  line1EndFrame: number;
  line2StartFrame: number;
  line2EndFrame: number;
  completionFrame: number;
  hasLine2: boolean;
} => {
  const framesPerChar = options.fps / Math.max(0.0001, options.charsPerSecond);
  const line1EndFrame = Math.ceil(options.line1.length * framesPerChar);
  const hasLine2 = Boolean(options.line2 && options.line2.length > 0);

  if (!hasLine2) {
    return {
      line1EndFrame,
      line2StartFrame: line1EndFrame,
      line2EndFrame: line1EndFrame,
      completionFrame: line1EndFrame,
      hasLine2,
    };
  }

  // Line 2 starts the frame after line 1 completes.
  const line2StartFrame = line1EndFrame + 1;
  const line2EndFrame =
    line2StartFrame +
    Math.ceil((options.line2 as string).length * framesPerChar);
  return {
    line1EndFrame,
    line2StartFrame,
    line2EndFrame,
    completionFrame: line2EndFrame,
    hasLine2,
  };
};

export const computeTypewriterDuration = (options: {
  line1: string;
  line2?: string;
  fps: number;
  charsPerSecond: number;
  holdFrames: number;
}): number =>
  computeTypewriterTiming(options).completionFrame + options.holdFrames;

// Local layout-math constants — same convention as Marquee's
// FONT_FILL_RATIO/LETTER_SPACING_EM and BarChart's Y_MAX/Y_STEP: ratios
// that make this specific beat's layout work, not design tokens shared
// across the system.
const FONT_SIZE_RATIO = 0.05; // fraction of frame height — a headline size, not Marquee's row-packed scale
const LINE_HEIGHT_RATIO = 2.2; // generous leading — "vast margins" applies between the two lines too
const MARGIN_RATIO = 0.16; // left margin (align="left"), fraction of frame width — vast, deliberate air
const LETTER_SPACING_EM = 0.08; // matches Marquee.tsx's own local value (tokens.b.ts's LETTER_SPACING_LABEL_EM)
const CURSOR_HEIGHT_RATIO = 0.72; // approximates the font's cap-height as a fraction of its em size
const CURSOR_REF_CHAR = "M"; // representative glyph for "roughly the width of a character"

// Deterministic, synchronous text-width measurement via a throwaway
// canvas 2D context — same technique as Marquee.tsx, duplicated locally
// rather than imported (beats are independent).
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
 * A line of text revealed character by character, with a cursor block
 * sitting at the reveal point. An optional second line reveals after the
 * first completes. Once the reveal finishes, the cursor blinks.
 *
 * The reveal is frame-deterministic: revealed character count is derived
 * from frame, fps and charsPerSecond (via computeTypewriterTiming), never
 * from a timer or state.
 */
export const Typewriter: React.FC<TypewriterProps> = ({
  line1,
  line2,
  charsPerSecond = DEFAULT_CHARS_PER_SECOND,
  holdFrames = DEFAULT_HOLD_FRAMES,
  align = DEFAULT_ALIGN,
  accent = DEFAULT_ACCENT,
  cursorBlinkRate = DEFAULT_CURSOR_BLINK_RATE,
  scaleTo = DEFAULT_SCALE_TO,
}) => {
  const frame = useCurrentFrame();
  const { width, height, fps, durationInFrames } = useVideoConfig();

  const timing = computeTypewriterTiming({ line1, line2, fps, charsPerSecond });
  const framesPerChar = fps / Math.max(0.0001, charsPerSecond);

  const line1Upper = line1.toUpperCase();
  const line2Upper = timing.hasLine2 ? (line2 as string).toUpperCase() : "";

  const revealCount = (relFrame: number, length: number) =>
    Math.max(0, Math.min(length, Math.floor(relFrame / framesPerChar)));

  const revealed1 = line1Upper.slice(0, revealCount(frame, line1Upper.length));
  const revealed2 = timing.hasLine2
    ? line2Upper.slice(
        0,
        revealCount(frame - timing.line2StartFrame, line2Upper.length),
      )
    : "";

  const fontSizePx = height * FONT_SIZE_RATIO;
  const lineHeightPx = fontSizePx * LINE_HEIGHT_RATIO;
  const marginPx = width * MARGIN_RATIO;

  const totalBlockHeight = timing.hasLine2 ? lineHeightPx * 2 : lineHeightPx;
  const blockTop = (height - totalBlockHeight) / 2;
  const line1Top = blockTop;
  const line2Top = blockTop + lineHeightPx;

  const blockLeftX = (fullText: string) =>
    align === "center"
      ? (width - measureTextWidth(fullText, fontSizePx)) / 2
      : marginPx;

  const line1LeftX = blockLeftX(line1Upper);
  const line2LeftX = timing.hasLine2 ? blockLeftX(line2Upper) : 0;

  // Active line for the cursor: line 1 through the one frame it holds
  // complete before line 2 starts; line 2 (or line 1, if there is no
  // line 2) from there on, including the post-completion blink.
  const onLine1 = !timing.hasLine2 || frame <= timing.line1EndFrame;
  const activeTop = onLine1 ? line1Top : line2Top;
  const activeLeftX = onLine1 ? line1LeftX : line2LeftX;
  const activeRevealedWidth = measureTextWidth(
    onLine1 ? revealed1 : revealed2,
    fontSizePx,
  );

  const cursorWidth = measureTextWidth(CURSOR_REF_CHAR, fontSizePx);
  const cursorHeight = fontSizePx * CURSOR_HEIGHT_RATIO;

  // Solid while typing; blinks only once the whole reveal has completed.
  const framesSinceComplete = frame - timing.completionFrame;
  const blinkCycleFrames = Math.max(1, Math.round(fps / cursorBlinkRate));
  const cursorVisible =
    framesSinceComplete < 0 ||
    Math.floor(framesSinceComplete / (blinkCycleFrames / 2)) % 2 === 0;

  const line2Color =
    accent === "line2" ? tokens.COLOR_AMBER_GAP : tokens.COLOR_WHITE;
  const cursorColor =
    accent === "cursor" ? tokens.COLOR_AMBER_GAP : tokens.COLOR_WHITE;

  const zoomEase = Easing.bezier(...tokens.EASE_STANDARD);
  const currentScale =
    scaleTo === 1 || durationInFrames <= 1
      ? scaleTo
      : interpolate(frame, [0, durationInFrames - 1], [1, scaleTo], {
          easing: zoomEase,
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        });

  const textStyle: React.CSSProperties = {
    position: "absolute",
    height: lineHeightPx,
    display: "flex",
    alignItems: "center",
    whiteSpace: "nowrap",
    fontFamily: tokens.FONT_FAMILY_PRIMARY,
    fontWeight: tokens.FONT_WEIGHT_HERO,
    fontSize: fontSizePx,
    textTransform: tokens.TEXT_TRANSFORM_LABEL,
    letterSpacing: `${LETTER_SPACING_EM}em`,
  };

  return (
    <AbsoluteFill style={{ overflow: "hidden" }}>
      <AbsoluteFill
        style={{
          transform: `scale(${currentScale})`,
          transformOrigin: "50% 50%",
        }}
      >
        <div
          style={{
            ...textStyle,
            top: line1Top,
            left: line1LeftX,
            color: tokens.COLOR_WHITE,
          }}
        >
          {revealed1}
        </div>

        {timing.hasLine2 && (
          <div
            style={{
              ...textStyle,
              top: line2Top,
              left: line2LeftX,
              color: line2Color,
            }}
          >
            {revealed2}
          </div>
        )}

        <div
          style={{
            position: "absolute",
            top: activeTop + (lineHeightPx - cursorHeight) / 2,
            left: activeLeftX + activeRevealedWidth,
            width: cursorWidth,
            height: cursorHeight,
            backgroundColor: cursorColor,
            opacity: cursorVisible ? 1 : 0,
          }}
        />
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
