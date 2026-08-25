import { Composition } from "remotion";
import { DiagonalWipe, diagonalWipeSchema } from "./components/DiagonalWipe";
import { COLOR_BLACK, COLOR_AMBER_GAP, COLOR_WHITE } from "./tokens.shared";

// Portrait, matching Marquee/Typewriter. 60fps, per AISEIRI.md.
const WIDTH = 1080;
const HEIGHT = 1920;
const FPS = 60;

// Fast — under half a second — per the brief; fixed regardless of props,
// unlike Typewriter's calculateMetadata (nothing here changes duration).
const DURATION_IN_FRAMES = 24;

/**
 * Four presets covering the beat's range: a plain black reveal and its
 * conceal counterpart, an amber reveal with its white edge line called
 * out explicitly, and a steep 45° black reveal.
 */
export const DiagonalWipeCompositions: React.FC = () => (
  <>
    <Composition
      id="DiagonalWipe-BlackReveal"
      component={DiagonalWipe}
      schema={diagonalWipeSchema}
      durationInFrames={DURATION_IN_FRAMES}
      fps={FPS}
      width={WIDTH}
      height={HEIGHT}
      defaultProps={{ mode: "reveal", fill: COLOR_BLACK }}
    />

    <Composition
      id="DiagonalWipe-BlackConceal"
      component={DiagonalWipe}
      schema={diagonalWipeSchema}
      durationInFrames={DURATION_IN_FRAMES}
      fps={FPS}
      width={WIDTH}
      height={HEIGHT}
      defaultProps={{ mode: "conceal", fill: COLOR_BLACK }}
    />

    <Composition
      id="DiagonalWipe-AmberReveal"
      component={DiagonalWipe}
      schema={diagonalWipeSchema}
      durationInFrames={DURATION_IN_FRAMES}
      fps={FPS}
      width={WIDTH}
      height={HEIGHT}
      defaultProps={{ mode: "reveal", fill: COLOR_AMBER_GAP, edgeLineColor: COLOR_WHITE }}
    />

    <Composition
      id="DiagonalWipe-Steep45Reveal"
      component={DiagonalWipe}
      schema={diagonalWipeSchema}
      durationInFrames={DURATION_IN_FRAMES}
      fps={FPS}
      width={WIDTH}
      height={HEIGHT}
      defaultProps={{ mode: "reveal", fill: COLOR_BLACK, angle: 45 }}
    />
  </>
);
