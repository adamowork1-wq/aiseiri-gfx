import { AbsoluteFill, Composition } from "remotion";
import { PillarBurst, type Pillar } from "./components/PillarBurst";
import * as TokensB from "./tokens.b";
import {
  COLOR_BLACK,
  DURATION_ENTER_FRAMES,
  PAUSE_BETWEEN_BEATS_FRAMES,
  SCATTER_STAGGER_FRAMES,
  DURATION_LINE_DRAW_FRAMES,
  HOLD_MIN_FRAMES,
} from "./tokens.shared";
import pillarsData from "../data/pillars.json";

// JSON imports widen `cluster` to `string`; this asserts it back to the
// `Cluster` union PillarBurst actually expects. The JSON is the source of
// truth for pillar data (per "in a JSON data file, not the component") —
// this cast doesn't second-guess it, just restores the type TS erased.
const pillars = pillarsData as Pillar[];

const WIDTH = 1920;
const HEIGHT = 1080;
const FPS = 30;

// Last pillar launches at (CATEGORY_COUNT - 1) * SCATTER_STAGGER_FRAMES
// after burstStart and takes DURATION_LINE_DRAW_FRAMES to settle; hold
// starts once it lands. 18 + 6 + 10*3 + 24 + 60 = 138 frames.
const CATEGORY_COUNT = 11;
const DURATION_IN_FRAMES =
  DURATION_ENTER_FRAMES +
  PAUSE_BETWEEN_BEATS_FRAMES +
  (CATEGORY_COUNT - 1) * SCATTER_STAGGER_FRAMES +
  DURATION_LINE_DRAW_FRAMES +
  HOLD_MIN_FRAMES;

export const PillarBurstCompositions: React.FC = () => (
  <>
    {/* Transparent by design, same as the bar chart — composited over
        footage. */}
    <Composition
      id="PillarBurst"
      component={() => (
        <PillarBurst tokens={TokensB} pillars={pillars} width={WIDTH} height={HEIGHT} />
      )}
      durationInFrames={DURATION_IN_FRAMES}
      fps={FPS}
      width={WIDTH}
      height={HEIGHT}
    />

    {/* Black-backed preview, same pattern as BarChartB-Preview — for
        actually looking at it rather than a transparent-on-white matte. */}
    <Composition
      id="PillarBurst-Preview"
      component={() => (
        <AbsoluteFill style={{ backgroundColor: COLOR_BLACK }}>
          <PillarBurst tokens={TokensB} pillars={pillars} width={WIDTH} height={HEIGHT} />
        </AbsoluteFill>
      )}
      durationInFrames={DURATION_IN_FRAMES}
      fps={FPS}
      width={WIDTH}
      height={HEIGHT}
    />
  </>
);
