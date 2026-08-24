import { AbsoluteFill, Composition } from "remotion";
import { PillarBurst, CAMERA_ZOOM_DURATION_FRAMES, HIGHLIGHT_FADE_FRAMES, type Pillar } from "./components/PillarBurst";
import * as TokensB from "./tokens.b";
import { COLOR_BLACK, HOLD_MIN_FRAMES } from "./tokens.shared";
import pillarsData from "../data/pillars.json";

// JSON imports widen `cluster` to `string`; this asserts it back to the
// `Cluster` union PillarBurst actually expects. The JSON is the source of
// truth for pillar data (per "in a JSON data file, not the component") —
// this cast doesn't second-guess it, just restores the type TS erased.
const pillars = pillarsData as Pillar[];

// Portrait (iPhone) — deliberately different from the bar chart, which
// stays landscape at 1920x1080.
const WIDTH = 1080;
const HEIGHT = 1920;
const FPS = 30;

// The burst and the camera zoom start together at frame 0 — "one long
// move, not a zoom followed by a reveal" — so the composition's total
// length is sized directly against CAMERA_ZOOM_DURATION_FRAMES (see
// PillarBurst.tsx), which is deliberately built to keep easing well past
// the last pillar's own hexagon finishing. The composition then holds on
// the completed honeycomb for a while (2x HOLD_MIN_FRAMES).
const DURATION_IN_FRAMES = CAMERA_ZOOM_DURATION_FRAMES + HOLD_MIN_FRAMES * 2;

// "Take the pillar honeycomb video, from the last frame make all other
// emblems disappear besides the one associated with The Total." Starts
// exactly where the base composition ends (DURATION_IN_FRAMES) — the
// spotlight reads as a continuation of that video, not a separate clip —
// fades over HIGHLIGHT_FADE_FRAMES, then holds on The Total alone for a
// further HOLD_MIN_FRAMES so the result doesn't just cut off the instant
// the fade completes.
const HIGHLIGHT_KEEP_KEY = "the-total";
const HIGHLIGHT_DURATION_IN_FRAMES = DURATION_IN_FRAMES + HIGHLIGHT_FADE_FRAMES + HOLD_MIN_FRAMES;

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

    {/* Transparent — same base video, continuing past DURATION_IN_FRAMES
        into the highlight fade (see HIGHLIGHT_DURATION_IN_FRAMES above). */}
    <Composition
      id="PillarBurst-TotalHighlight"
      component={() => (
        <PillarBurst
          tokens={TokensB}
          pillars={pillars}
          width={WIDTH}
          height={HEIGHT}
          highlightKeepKey={HIGHLIGHT_KEEP_KEY}
          highlightFromFrame={DURATION_IN_FRAMES}
        />
      )}
      durationInFrames={HIGHLIGHT_DURATION_IN_FRAMES}
      fps={FPS}
      width={WIDTH}
      height={HEIGHT}
    />

    {/* Black-backed preview of the above. */}
    <Composition
      id="PillarBurst-TotalHighlight-Preview"
      component={() => (
        <AbsoluteFill style={{ backgroundColor: COLOR_BLACK }}>
          <PillarBurst
            tokens={TokensB}
            pillars={pillars}
            width={WIDTH}
            height={HEIGHT}
            highlightKeepKey={HIGHLIGHT_KEEP_KEY}
            highlightFromFrame={DURATION_IN_FRAMES}
          />
        </AbsoluteFill>
      )}
      durationInFrames={HIGHLIGHT_DURATION_IN_FRAMES}
      fps={FPS}
      width={WIDTH}
      height={HEIGHT}
    />
  </>
);
