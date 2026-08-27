import { CalculateMetadataFunction, Composition, staticFile } from "remotion";
import {
  Odometer,
  odometerSchema,
  computeOdometerDuration,
  DEFAULT_FROM,
  DEFAULT_TO,
  DEFAULT_TARGET,
  DEFAULT_COUNT_FRAMES,
  DEFAULT_HOLD_FRAMES,
  DEFAULT_DATA_SOURCE,
  type OdometerProps,
} from "./components/Odometer";

// Portrait, matching the other beats. 60fps, per AISEIRI.md.
const WIDTH = 1080;
const HEIGHT = 1920;
const FPS = 60;

// Shape of the relevant parts of public/data.json (see scripts/sync.mjs).
type LedgerEntry = { current: number; target: number; gap: number };
type LedgerJson = {
  lifts: Record<"squat" | "bench" | "clean", LedgerEntry>;
  total: LedgerEntry;
};

// Duration depends on countFrames/holdFrames, so it's computed per
// composition via calculateMetadata rather than fixed. When dataSource
// isn't "manual", this also reads public/data.json via staticFile —
// exactly as BarChartCompositions.tsx does — and overrides from/to/target
// with the matching lift (or total).
const calculateMetadata: CalculateMetadataFunction<OdometerProps> = async ({ props, abortSignal }) => {
  const dataSource = props.dataSource ?? DEFAULT_DATA_SOURCE;
  let from = props.from ?? DEFAULT_FROM;
  let to = props.to ?? DEFAULT_TO;
  let target = props.target ?? DEFAULT_TARGET;

  if (dataSource !== "manual") {
    const res = await fetch(staticFile("data.json"), { signal: abortSignal });
    const json: LedgerJson = await res.json();
    const entry = dataSource === "total" ? json.total : json.lifts[dataSource];
    from = 0;
    to = entry.current;
    target = entry.target;
  }

  const durationInFrames = computeOdometerDuration({
    countFrames: props.countFrames ?? DEFAULT_COUNT_FRAMES,
    holdFrames: props.holdFrames ?? DEFAULT_HOLD_FRAMES,
  });

  return { durationInFrames, props: { ...props, from, to, target } };
};

/**
 * Four presets covering the beat's range: a manual count to 500, live
 * squat data with its target, live total data with its target, and a
 * fast manual count with no label.
 */
export const OdometerCompositions: React.FC = () => (
  <>
    <Composition
      id="Odometer-ManualCount"
      component={Odometer}
      schema={odometerSchema}
      width={WIDTH}
      height={HEIGHT}
      fps={FPS}
      calculateMetadata={calculateMetadata}
      defaultProps={{ to: 500, label: "TOTAL" }}
    />

    <Composition
      id="Odometer-Squat"
      component={Odometer}
      schema={odometerSchema}
      width={WIDTH}
      height={HEIGHT}
      fps={FPS}
      calculateMetadata={calculateMetadata}
      defaultProps={{ dataSource: "squat", label: "SQUAT" }}
    />

    <Composition
      id="Odometer-Total"
      component={Odometer}
      schema={odometerSchema}
      width={WIDTH}
      height={HEIGHT}
      fps={FPS}
      calculateMetadata={calculateMetadata}
      defaultProps={{ dataSource: "total", label: "TOTAL" }}
    />

    <Composition
      id="Odometer-FastNoLabel"
      component={Odometer}
      schema={odometerSchema}
      width={WIDTH}
      height={HEIGHT}
      fps={FPS}
      calculateMetadata={calculateMetadata}
      defaultProps={{ to: 88, countFrames: 20 }}
    />
  </>
);
