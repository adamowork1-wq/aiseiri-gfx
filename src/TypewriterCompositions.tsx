import { CalculateMetadataFunction, Composition } from "remotion";
import {
  Typewriter,
  typewriterSchema,
  computeTypewriterDuration,
  DEFAULT_CHARS_PER_SECOND,
  DEFAULT_HOLD_FRAMES,
  type TypewriterProps,
} from "./components/Typewriter";

// Portrait, matching Marquee. 60fps, per AISEIRI.md.
const WIDTH = 1080;
const HEIGHT = 1920;
const FPS = 60;

// Duration depends on the text and reveal rate, so it's computed per
// composition via calculateMetadata rather than fixed — never longer
// than the reveal + hold actually needs.
const calculateMetadata: CalculateMetadataFunction<TypewriterProps> = ({ props }) => {
  const durationInFrames = computeTypewriterDuration({
    line1: props.line1,
    line2: props.line2,
    fps: FPS,
    charsPerSecond: props.charsPerSecond ?? DEFAULT_CHARS_PER_SECOND,
    holdFrames: props.holdFrames ?? DEFAULT_HOLD_FRAMES,
  });
  return { durationInFrames };
};

/**
 * Three presets covering the beat's range: a single line at the default
 * pace, two lines with the amber accent on the second, and a fast single
 * line. Demo copy echoes the dashboard's own 66-day gate.
 */
export const TypewriterCompositions: React.FC = () => (
  <>
    <Composition
      id="Typewriter-SingleLine"
      component={Typewriter}
      schema={typewriterSchema}
      width={WIDTH}
      height={HEIGHT}
      fps={FPS}
      calculateMetadata={calculateMetadata}
      defaultProps={{ line1: "66 DAYS" }}
    />

    <Composition
      id="Typewriter-TwoLineAccent"
      component={Typewriter}
      schema={typewriterSchema}
      width={WIDTH}
      height={HEIGHT}
      fps={FPS}
      calculateMetadata={calculateMetadata}
      defaultProps={{ line1: "66 DAYS", line2: "ONE STANDARD", accent: "line2" }}
    />

    <Composition
      id="Typewriter-Fast"
      component={Typewriter}
      schema={typewriterSchema}
      width={WIDTH}
      height={HEIGHT}
      fps={FPS}
      calculateMetadata={calculateMetadata}
      defaultProps={{ line1: "NO EXCEPTIONS", charsPerSecond: 30 }}
    />
  </>
);
