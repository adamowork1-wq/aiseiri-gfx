import { AbsoluteFill, CalculateMetadataFunction, Composition, staticFile } from "remotion";
import { BarChart } from "./components/BarChart";
import type { LiftsData } from "./components/BarChart";
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

// Shape of the `lifts` object in public/data.json (see scripts/sync.mjs).
type LiftsJson = Record<
  "squat" | "bench" | "clean",
  { current: number; target: number; gap: number }
>;

// BarChart's own data shape is {from, to} per lift — current/target from
// the synced ledger map straight onto that.
const toLiftsData = (lifts: LiftsJson): LiftsData => ({
  bench: { from: lifts.bench.current, to: lifts.bench.target },
  squat: { from: lifts.squat.current, to: lifts.squat.target },
  clean: { from: lifts.clean.current, to: lifts.clean.target },
});

type Props = {
  dataUrl: string;
  data: LiftsData;
};

// Placeholder only — calculateMetadata's fetch below replaces this with the
// real values from public/data.json before every render (Studio and CLI
// alike). Needed because CalculateMetadataFunction returns the same props
// shape it receives, so `data` must exist on defaultProps too.
const EMPTY_LIFTS: LiftsData = {
  bench: { from: 0, to: 0 },
  squat: { from: 0, to: 0 },
  clean: { from: 0, to: 0 },
};

const calculateMetadata: CalculateMetadataFunction<Props> = async ({
  props,
  abortSignal,
}) => {
  const res = await fetch(props.dataUrl, { signal: abortSignal });
  const json = await res.json();
  return { props: { ...props, data: toLiftsData(json.lifts) } };
};

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
      component={({ data }: Props) => (
        <BarChart
          tokens={TokensA}
          data={data}
          width={WIDTH}
          height={HEIGHT}
          variantLabel="A"
        />
      )}
      durationInFrames={DURATION_IN_FRAMES}
      fps={FPS}
      width={WIDTH}
      height={HEIGHT}
      defaultProps={{ dataUrl: staticFile("data.json"), data: EMPTY_LIFTS }}
      calculateMetadata={calculateMetadata}
    />
    <Composition
      id="BarChartB"
      component={({ data }: Props) => (
        <BarChart
          tokens={TokensB}
          data={data}
          width={WIDTH}
          height={HEIGHT}
          variantLabel="B"
        />
      )}
      durationInFrames={DURATION_IN_FRAMES}
      fps={FPS}
      width={WIDTH}
      height={HEIGHT}
      defaultProps={{ dataUrl: staticFile("data.json"), data: EMPTY_LIFTS }}
      calculateMetadata={calculateMetadata}
    />
    <Composition
      id="BarChartC"
      component={({ data }: Props) => (
        <BarChart
          tokens={TokensC}
          data={data}
          width={WIDTH}
          height={HEIGHT}
          variantLabel="C"
        />
      )}
      durationInFrames={DURATION_IN_FRAMES}
      fps={FPS}
      width={WIDTH}
      height={HEIGHT}
      defaultProps={{ dataUrl: staticFile("data.json"), data: EMPTY_LIFTS }}
      calculateMetadata={calculateMetadata}
    />

    {/* BarChart itself is transparent by design (composited over footage —
        see BarChart.tsx). For a standard, shareable H.264 preview — a
        codec with no alpha support — this composition backs it with a
        solid black AbsoluteFill instead. The black lives here, at the
        preview layer, not inside the reusable component. */}
    <Composition
      id="BarChartB-Preview"
      component={({ data }: Props) => (
        <AbsoluteFill style={{ backgroundColor: COLOR_BLACK }}>
          <BarChart
            tokens={TokensB}
            data={data}
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
      defaultProps={{ dataUrl: staticFile("data.json"), data: EMPTY_LIFTS }}
      calculateMetadata={calculateMetadata}
    />
  </>
);
