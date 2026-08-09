import { AbsoluteFill, Composition } from "remotion";
import { BarChart } from "./components/BarChart";
import * as TokensA from "./tokens.a";
import * as TokensB from "./tokens.b";
import * as TokensC from "./tokens.c";
import {
  COLOR_BLACK,
  DURATION_ENTER_FRAMES,
  PAUSE_BETWEEN_BEATS_FRAMES,
  STAGGER_FRAMES,
  DURATION_LINE_DRAW_FRAMES,
  HOLD_MIN_FRAMES,
} from "./tokens.shared";
import lifts from "../data/lifts.json";

const WIDTH = 1920;
const HEIGHT = 1080;
const FPS = 30;

// bench, squat, clean — matches BarChart's CATEGORIES order/count. The
// motion tokens above are identical across A/B/C (only layout tokens vary
// per variant), so this total is the same for all three compositions:
// beat 1, the pause, beat 2's stagger to the last bar, that bar's beat 2
// duration, then the minimum hold. 18 + 6 + 2*3 + 24 + 60 = 114 frames.
const CATEGORY_COUNT = 3;
const DURATION_IN_FRAMES =
  DURATION_ENTER_FRAMES +
  PAUSE_BETWEEN_BEATS_FRAMES +
  (CATEGORY_COUNT - 1) * STAGGER_FRAMES +
  DURATION_LINE_DRAW_FRAMES +
  HOLD_MIN_FRAMES;

/**
 * Three full-size renders of the same bar chart — one per token variant
 * (A/B/C from src/tokens.a.ts / .b.ts / .c.ts) — so the design differences
 * (frame occupancy, stroke weight, spacing) can be compared as stills
 * rather than read off the token values.
 */
export const BarChartCompositions: React.FC = () => (
  <>
    <Composition
      id="BarChartA"
      component={() => (
        <BarChart
          tokens={TokensA}
          data={lifts}
          width={WIDTH}
          height={HEIGHT}
          variantLabel="A"
        />
      )}
      durationInFrames={DURATION_IN_FRAMES}
      fps={FPS}
      width={WIDTH}
      height={HEIGHT}
    />
    <Composition
      id="BarChartB"
      component={() => (
        <BarChart
          tokens={TokensB}
          data={lifts}
          width={WIDTH}
          height={HEIGHT}
          variantLabel="B"
        />
      )}
      durationInFrames={DURATION_IN_FRAMES}
      fps={FPS}
      width={WIDTH}
      height={HEIGHT}
    />
    <Composition
      id="BarChartC"
      component={() => (
        <BarChart
          tokens={TokensC}
          data={lifts}
          width={WIDTH}
          height={HEIGHT}
          variantLabel="C"
        />
      )}
      durationInFrames={DURATION_IN_FRAMES}
      fps={FPS}
      width={WIDTH}
      height={HEIGHT}
    />

    {/* BarChart itself is transparent by design (composited over footage —
        see BarChart.tsx). For a standard, shareable H.264 preview — a
        codec with no alpha support — this composition backs it with a
        solid black AbsoluteFill instead. The black lives here, at the
        preview layer, not inside the reusable component. */}
    <Composition
      id="BarChartB-Preview"
      component={() => (
        <AbsoluteFill style={{ backgroundColor: COLOR_BLACK }}>
          <BarChart
            tokens={TokensB}
            data={lifts}
            width={WIDTH}
            height={HEIGHT}
            variantLabel="B"
          />
        </AbsoluteFill>
      )}
      durationInFrames={DURATION_IN_FRAMES}
      fps={FPS}
      width={WIDTH}
      height={HEIGHT}
    />
  </>
);
