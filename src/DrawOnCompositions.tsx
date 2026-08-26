import { CalculateMetadataFunction, Composition } from "remotion";
import {
  DrawOn,
  drawOnSchema,
  computeDrawOnDuration,
  DEFAULT_DRAW_FRAMES,
  DEFAULT_HOLD_FRAMES,
  type DrawOnProps,
} from "./components/DrawOn";
import { COLOR_AMBER_GAP } from "./tokens.shared";

// Portrait, matching the other beats. 60fps, per AISEIRI.md.
const WIDTH = 1080;
const HEIGHT = 1920;
const FPS = 60;

// Duration depends on drawFrames/holdFrames, so it's computed per
// composition via calculateMetadata rather than fixed.
const calculateMetadata: CalculateMetadataFunction<DrawOnProps> = ({ props }) => {
  const durationInFrames = computeDrawOnDuration({
    drawFrames: props.drawFrames ?? DEFAULT_DRAW_FRAMES,
    holdFrames: props.holdFrames ?? DEFAULT_HOLD_FRAMES,
  });
  return { durationInFrames };
};

/**
 * Four presets covering the beat's range: a plain circle, an arc, an
 * amber cross, and a slow, large circle.
 */
export const DrawOnCompositions: React.FC = () => (
  <>
    <Composition
      id="DrawOn-Circle"
      component={DrawOn}
      schema={drawOnSchema}
      width={WIDTH}
      height={HEIGHT}
      fps={FPS}
      calculateMetadata={calculateMetadata}
      defaultProps={{ shape: "circle" }}
    />

    <Composition
      id="DrawOn-Arc"
      component={DrawOn}
      schema={drawOnSchema}
      width={WIDTH}
      height={HEIGHT}
      fps={FPS}
      calculateMetadata={calculateMetadata}
      defaultProps={{ shape: "arc" }}
    />

    <Composition
      id="DrawOn-AmberCross"
      component={DrawOn}
      schema={drawOnSchema}
      width={WIDTH}
      height={HEIGHT}
      fps={FPS}
      calculateMetadata={calculateMetadata}
      defaultProps={{ shape: "cross", stroke: COLOR_AMBER_GAP }}
    />

    <Composition
      id="DrawOn-SlowLargeCircle"
      component={DrawOn}
      schema={drawOnSchema}
      width={WIDTH}
      height={HEIGHT}
      fps={FPS}
      calculateMetadata={calculateMetadata}
      defaultProps={{ shape: "circle", drawFrames: 90, size: 800 }}
    />
  </>
);
