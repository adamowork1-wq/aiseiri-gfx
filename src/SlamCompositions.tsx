import { CalculateMetadataFunction, Composition } from "remotion";
import {
  Slam,
  slamSchema,
  computeSlamDuration,
  DEFAULT_ARRIVAL_FRAMES,
  DEFAULT_STAGGER,
  DEFAULT_HOLD_FRAMES,
  type SlamProps,
} from "./components/Slam";

// Portrait, matching the other type beats. 60fps, per AISEIRI.md.
const WIDTH = 1080;
const HEIGHT = 1920;
const FPS = 60;

// Duration depends on line count and timing, so it's computed per
// composition via calculateMetadata rather than fixed.
const calculateMetadata: CalculateMetadataFunction<SlamProps> = ({ props }) => {
  const durationInFrames = computeSlamDuration({
    lineCount: props.text.split("\n").length,
    arrivalFrames: props.arrivalFrames ?? DEFAULT_ARRIVAL_FRAMES,
    stagger: props.stagger ?? DEFAULT_STAGGER,
    holdFrames: props.holdFrames ?? DEFAULT_HOLD_FRAMES,
  });
  return { durationInFrames };
};

/**
 * Five presets covering the beat's range: a single xl line, three lines
 * staggering in, two lines with the second in amber (via the deprecated
 * single-index accentLine, to prove that alias still works), four lines
 * with two of them accented (via accentLines), and one line with a 12px
 * impact displacement on landing. Demo copy continues the 66-day gate
 * thread from the Typewriter presets.
 */
export const SlamCompositions: React.FC = () => (
  <>
    <Composition
      id="Slam-SingleLineXL"
      component={Slam}
      schema={slamSchema}
      width={WIDTH}
      height={HEIGHT}
      fps={FPS}
      calculateMetadata={calculateMetadata}
      defaultProps={{ text: "DISCIPLINE", size: "xl" }}
    />

    <Composition
      id="Slam-ThreeLineStagger"
      component={Slam}
      schema={slamSchema}
      width={WIDTH}
      height={HEIGHT}
      fps={FPS}
      calculateMetadata={calculateMetadata}
      defaultProps={{ text: "SIXTY\nSIX\nDAYS" }}
    />

    <Composition
      id="Slam-AccentLine"
      component={Slam}
      schema={slamSchema}
      width={WIDTH}
      height={HEIGHT}
      fps={FPS}
      calculateMetadata={calculateMetadata}
      defaultProps={{ text: "NO\nEXCEPTIONS", accentLine: 1 }}
    />

    <Composition
      id="Slam-MultiAccent"
      component={Slam}
      schema={slamSchema}
      width={WIDTH}
      height={HEIGHT}
      fps={FPS}
      calculateMetadata={calculateMetadata}
      defaultProps={{ text: "TRAIN\nEAT\nSLEEP\nREPEAT", accentLines: [0, 3] }}
    />

    <Composition
      id="Slam-Impact"
      component={Slam}
      schema={slamSchema}
      width={WIDTH}
      height={HEIGHT}
      fps={FPS}
      calculateMetadata={calculateMetadata}
      defaultProps={{ text: "LOCKED IN", impact: 12 }}
    />
  </>
);
