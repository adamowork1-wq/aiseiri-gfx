import { Composition } from "remotion";
import { Marquee, marqueeSchema } from "./components/Marquee";
import { COLOR_BLACK, COLOR_WHITE } from "./tokens.shared";

// Portrait, matching the pillar burst — social-first, unlike the bar
// chart's landscape frame. 60fps (not the Aiséirí system's 30 authoring
// reference) so downstream retiming in After Effects has real frames to
// work with, per AISEIRI.md.
const WIDTH = 1080;
const HEIGHT = 1920;
const FPS = 60;
const DURATION_IN_FRAMES = 180;

const DEFAULT_TEXT = "AISÉIRÍ";

/**
 * Three preset variants of the same beat, to see the range it covers —
 * all pure Aiséirí-language white-on-black, since this system (unlike
 * the abandoned brutalist one) has no alternate colour combinations to
 * showcase. What varies is density and the one-amber-accent option.
 */
export const MarqueeCompositions: React.FC = () => (
  <>
    {/* Sparse — the beat's own defaults: 10 rows, slow, all white. */}
    <Composition
      id="Marquee-Sparse"
      component={Marquee}
      schema={marqueeSchema}
      durationInFrames={DURATION_IN_FRAMES}
      fps={FPS}
      width={WIDTH}
      height={HEIGHT}
      defaultProps={{ text: DEFAULT_TEXT, fg: COLOR_WHITE, bg: COLOR_BLACK }}
    />

    {/* Same sparse density, with the single deliberate amber accent row
        (per AISEIRI.md: non-data beats use amber sparingly). */}
    <Composition
      id="Marquee-AmberAccent"
      component={Marquee}
      schema={marqueeSchema}
      durationInFrames={DURATION_IN_FRAMES}
      fps={FPS}
      width={WIDTH}
      height={HEIGHT}
      defaultProps={{ text: DEFAULT_TEXT, fg: COLOR_WHITE, bg: COLOR_BLACK, accentRow: 5 }}
    />

    {/* Dense-but-hairline — many more rows than the default, still thin
        and low-opacity, to see the language hold up at higher density. */}
    <Composition
      id="Marquee-Dense"
      component={Marquee}
      schema={marqueeSchema}
      durationInFrames={DURATION_IN_FRAMES}
      fps={FPS}
      width={WIDTH}
      height={HEIGHT}
      defaultProps={{ text: DEFAULT_TEXT, fg: COLOR_WHITE, bg: COLOR_BLACK, rows: 20 }}
    />
  </>
);
