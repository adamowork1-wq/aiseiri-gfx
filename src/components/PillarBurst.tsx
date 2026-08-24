import React, { useState } from "react";
import { Easing, Img, interpolate, staticFile, useCurrentFrame } from "remotion";
import { loadFont } from "@remotion/google-fonts/CormorantGaramond";
import type * as TokensB from "../tokens.b";

// Cormorant Garamond, not the system's usual Space Grotesk — a deliberate,
// composition-scoped swap to match the icons' engraving style. Loaded
// locally here rather than via tokens.FONT_FAMILY_PRIMARY so the bar
// chart's typeface is untouched.
const { fontFamily: engravedFontFamily } = loadFont("normal", {
  weights: ["500"],
});

type TokenSet = typeof TokensB;

export type Pillar = {
  name: string;
  /** kebab-case identifier — a stable id for this pillar (React key, Map
   * key in computeHoneycombOffsets). No longer tied to the icon filename —
   * see PillarIcon, which looks up artwork by `name`, not `key`. */
  key: string;
  /** 0-11 — position in a single interleaved sequence around the two
   * hex-grid rings: even values are ring-1 slots, odd values are ring-2
   * (nestled) slots, walked ring1_0, ring2_0, ring1_1, ring2_1, ... (see
   * computeHoneycombOffsets). Every consecutive pair in this sequence is a
   * genuinely touching-distance-apart pair of positions, so related
   * pillars listed consecutively in data/pillars.json land adjacent in
   * the layout. No hexagon shapes are actually drawn — this only governs
   * where each icon sits. */
  ringIndex: number;
  /** Multiplies the icon's default size. 1 = default. */
  iconScale: number;
  /** Icon offset from its own centre, in px at 1080p. */
  iconOffsetX: number;
  iconOffsetY: number;
};

type Props = {
  tokens: TokenSet;
  pillars: Pillar[];
  width: number;
  height: number;
  /** Optional "spotlight" phase, off by default — every existing export
   * (the transparent PillarBurst comp, the black-backed Preview) passes
   * neither of these two and renders exactly as before. When both are
   * set, starting at `highlightFromFrame` every pillar EXCEPT the one
   * whose `key` matches `highlightKeepKey` (and Reason's own emblem/
   * label) eases out to fully transparent over HIGHLIGHT_FADE_FRAMES —
   * see PillarBurstCompositions.tsx for the composition that turns this
   * on. */
  highlightKeepKey?: string;
  highlightFromFrame?: number;
};

const REASON_LABEL = "The Reason";

const ICON_FILTER = "contrast(1.5) brightness(1.2)"; // DECIDED — "only the reason is a clear white... the others seem a little dull." Sampled pixel values confirm every icon PNG's line art peaks at the same 255 white (see PowerShell sampling, scratch) — the dullness is thin strokes anti-aliasing against black at the pillars' smaller render size, not a difference in the source art. This filter pushes partial-white edge pixels decisively toward solid white before the mix-blend-mode: screen composite.

// ---------------------------------------------------------------------------
// Positioning geometry only — no hexagon shapes are drawn (removed on
// explicit instruction, "get rid of the hexagons, keep everything else
// the same"), but every icon's position still comes from the same
// underlying hex-grid spacing math this layout has used throughout, kept
// unchanged: LATTICE_SPACING_PX is the touching-neighbour distance a real
// hex tiling of this cell size would have — the one number everything
// else derives from — and CELL_HEX_RADIUS_PX (what would have been each
// hexagon's circumradius) still sets icon sizing below, even though no
// hexagon of that radius is ever actually rendered.
// ---------------------------------------------------------------------------
const LATTICE_SPACING_PX = 320;
const CELL_HEX_RADIUS_PX = LATTICE_SPACING_PX / Math.sqrt(3);

// DECIDED — icons sized to sit well inside their reserved LATTICE_SPACING_PX
// footprint rather than filling it completely, leaving a little clearance
// around each glyph (see the pixel-sampling note on ICON_FILTER above).
const ICON_BASE_SIZE = LATTICE_SPACING_PX * 0.75;

// DECIDED — "scale its emblem up so it fills the entire hexagon edge to
// edge, and put the label back centred over the emblem rather than below
// it." REASON_ICON_SIZE is 2x CELL_HEX_RADIUS_PX — what would have been
// that hexagon's vertex-to-vertex width, its widest dimension — kept
// unchanged even though there's no longer a hexagon outline for it to
// reach edge-to-edge against.
const REASON_ICON_SIZE = 2 * CELL_HEX_RADIUS_PX;
const REASON_FONT_SIZE = 64; // DECIDED — "bigger, writing in front of the emblem" (was 30, then 46). Still rendered last in the DOM (see the JSX below), so it's already painted on top of the emblem — that part didn't need a code change, just confirming it holds at the larger size.
const REASON_WIDTH = 640; // kept proportional to REASON_FONT_SIZE (10x, same ratio as before) so the box still comfortably fits the wider text.

// DECIDED — "the label is hard to read against its emblem... drop it to
// 30% opacity so it sits behind as a watermark." Now animated rather than
// a static value — "have the emblem shift from full opacity to the
// current [0.3] over the course of the clip" — see reasonEmblemOpacity in
// PillarBurst below.
const REASON_EMBLEM_SETTLED_OPACITY = 0.3;

const white = (opacity: number) => `rgba(255, 255, 255, ${opacity})`;

// DECIDED — "open with the transform scaled up enough that Reason's
// hexagon fills most of the frame — everything else is off-screen because
// we're that close in." At this scale, Reason's icon footprint
// (CELL_HEX_RADIUS_PX wide when unscaled) reaches ~85% of the frame's
// 1080px width, and Reason's six directly-touching neighbours
// (LATTICE_SPACING_PX away in world space) sit at 2.5x that — 800px from
// centre — well past the frame's own 540px half-width, i.e. genuinely
// off-screen, not just small.
const CAMERA_START_SCALE = 2.5;

// DECIDED — "end wide enough that every one of the thirteen hexagons is
// fully visible in frame." Computed against the thirteen pillar-or-Reason
// positions' exact world-space bounding box (tune-no-filler.js, scratch:
// x=[-739.0,739.0], y=[-640.0,640.0], so 1478.0 x 1280.0) — 0.68 keeps
// every icon's full reserved footprint inside the 1080x1920 frame with
// real margin (~37.5px each side horizontally, the binding dimension;
// ~525px vertically top and bottom, nowhere close to binding), not a
// razor-thin fit.
const CAMERA_END_SCALE = 0.68;

// DECIDED — "slow and continuous... still easing out slightly after the
// last emblem lands." Long enough to run well past the last pillar's own
// arrival finishing (11*STAGGER_BURST_FRAMES + DURATION_MICRO_FRAMES from
// frame 0, since the burst now starts immediately — see PillarBurst
// below). Exported so PillarBurstCompositions.tsx can size the
// composition's total length around it without duplicating the number.
export const CAMERA_ZOOM_DURATION_FRAMES = 100;

// DECIDED — length of the optional highlight fade (see Props above): all
// eleven other pillars plus Reason ease out together, simultaneously, not
// staggered — "make all other emblems disappear" reads as one clean move,
// not another burst-style reveal in reverse. Exported for the same reason
// CAMERA_ZOOM_DURATION_FRAMES is: so PillarBurstCompositions.tsx can size
// the highlight composition's total length without duplicating the number.
export const HIGHLIGHT_FADE_FRAMES = 30;

type Point = { x: number; y: number };

// ---------------------------------------------------------------------------
// Two rings of positions around Reason — no hexagon shapes are drawn at
// these positions (see the note above LATTICE_SPACING_PX), but the
// positions themselves are still exactly where a real two-ring hex
// tiling would place them.
//
// Ring 1 — six positions at LATTICE_SPACING_PX from Reason, 60° apart,
// starting straight up.
//
// Ring 2 — six "nestled" positions, one between each pair of adjacent
// ring-1 slots, at radius LATTICE_SPACING_PX * sqrt(3).
// ---------------------------------------------------------------------------
const deg2rad = (deg: number): number => (deg * Math.PI) / 180;
const polarOffset = (angleDeg: number, radius: number): Point => ({
  x: Math.cos(deg2rad(angleDeg)) * radius,
  y: Math.sin(deg2rad(angleDeg)) * radius,
});

/**
 * Each pillar's position around Reason, following hex-grid spacing — no
 * hexagon outlines are drawn at these positions, just icons.
 *
 * `ringIndex` walks both rings interleaved — ring1_0, ring2_0, ring1_1,
 * ring2_1, ... — because in that specific order, every consecutive pair
 * is a touching-distance-apart pair: ring1_k to ring2_k (its nestled
 * neighbour) and ring2_k to ring1_(k+1) (the other ring-1 position it's
 * nestled against). Listing related pillars consecutively in
 * data/pillars.json therefore keeps them adjacent in the layout.
 *
 * Every position here is Reason-relative (an offset, not an absolute
 * point) — the caller adds Reason's fixed world position once, then the
 * *entire* result (Reason included) goes through one shared camera-scale
 * transform. Keeping this function's output camera-agnostic is what makes
 * "one group, nothing scales independently" straightforward to guarantee.
 */
const computeHoneycombOffsets = (pillars: Pillar[]): Map<string, Point> => {
  const offsets = new Map<string, Point>();
  for (const pillar of pillars) {
    const ring = pillar.ringIndex % 2 === 0 ? 1 : 2;
    const slot = Math.floor(pillar.ringIndex / 2);
    const angleDeg = ring === 1 ? -90 + 60 * slot : -60 + 60 * slot;
    const radius = ring === 1 ? LATTICE_SPACING_PX : LATTICE_SPACING_PX * Math.sqrt(3);
    offsets.set(pillar.key, polarOffset(angleDeg, radius));
  }
  return offsets;
};

/**
 * One pillar's artwork: the PNG at public/icons/, named exactly after the
 * pillar's display name — "The Total.png", "The Reason.png" — capitals and
 * spaces intact, not the kebab-case `key`. staticFile() URL-encodes its
 * argument itself (Remotion 4.0+, see node_modules/remotion/.../
 * static-file.js) — it even warns if you pass an already-encoded path — so
 * the space is passed through raw; wrapping it in encodeURIComponent here
 * double-encodes it into "%2520" and 404s. White line art on black,
 * composited with mix-blend-mode: screen so the black drops out and only
 * the white survives.
 *
 * Takes just the handful of fields it actually needs rather than a whole
 * Pillar, so it can render Reason's own (differently-sized) emblem too —
 * Reason isn't a member of `pillars` (it's the fixed point everything else
 * travels from), so it has no ring index/key of its own to speak of.
 *
 * No Lucide (or any other) fallback: every pillar now has real artwork, so
 * a missing file should be visible as missing — a dashed placeholder box —
 * rather than silently substituted with a plausible-looking stand-in. Per
 * Remotion's own Img docs, onError still has to unmount the failed <Img>
 * (swapping to the placeholder does that) rather than leave it unhandled.
 */
const PillarIcon: React.FC<{
  name: string;
  iconScale: number;
  iconOffsetX: number;
  iconOffsetY: number;
  baseSize: number;
}> = ({ name, iconScale, iconOffsetX, iconOffsetY, baseSize }) => {
  const [failed, setFailed] = useState(false);
  const size = baseSize * iconScale;
  const offset = `translate(${iconOffsetX}px, ${iconOffsetY}px)`;

  if (failed) {
    return (
      <div
        style={{
          width: size,
          height: size,
          boxSizing: "border-box",
          border: `1px dashed ${white(0.35)}`,
          transform: offset,
        }}
      />
    );
  }

  return (
    <Img
      src={staticFile(`icons/${name}.png`)}
      onError={() => setFailed(true)}
      style={{
        width: size,
        height: size,
        objectFit: "contain",
        transform: offset,
        mixBlendMode: "screen",
        filter: ICON_FILTER,
      }}
    />
  );
};

/**
 * Portrait (1080x1920) — this composition is iPhone-shaped; the bar chart
 * stays landscape. Everything — Reason's emblem, its label, and all
 * twelve pillar icons — lives inside one shared group (see the wrapping
 * `<div>` in the JSX below) with a single `transform: scale()` around the
 * frame's exact centre, which is also Reason's own fixed world position.
 * That single transform *is* the camera: `cameraScale` starts at
 * CAMERA_START_SCALE (zoomed in enough that Reason's icon fills most of
 * the frame and the rest of the layout is off-screen) and eases down to
 * CAMERA_END_SCALE (wide enough that all thirteen positions — Reason and
 * the twelve pillars — sit fully inside the frame, with margin) over
 * CAMERA_ZOOM_DURATION_FRAMES with EASE_STANDARD ("fast at first, then
 * decelerate hard and settle"). Nothing scales independently of anything
 * else — a pillar mid-arrival is exactly as affected by the camera as
 * Reason or a fully-settled neighbour, because they're all the same
 * transform.
 *
 * The burst and the camera start at the same instant, frame 0 — "the
 * emblems appearing and the camera pulling back happen simultaneously and
 * continuously... one long move, not a zoom followed by a reveal." The
 * twelve pillars emerge one at a time in quick succession
 * (STAGGER_BURST_FRAMES apart), each arriving over DURATION_MICRO_FRAMES.
 * Reason itself is simply present from frame 0 — the opening tightness
 * comes entirely from the camera being zoomed in on it, not from a
 * fade-in.
 *
 * No hexagon outlines, no lines drawn between anything, and no pillar
 * keeps a label; Reason is the only one, per explicit instruction. The
 * layout's own (unscaled) size is set against the full 1080x1920 frame
 * (see the layout constants above) — at camera scale 1 it's deliberately
 * wider than the frame, so the leftmost and rightmost positions run
 * off-canvas even at the settled view.
 *
 * Pure white on black, no fills, no colour anywhere. Pillar data (name,
 * icon, layout order) comes from `pillars` (data/pillars.json).
 *
 * Type is Cormorant Garamond, not the system's usual Space Grotesk — set
 * in small caps with wide tracking to match the icons' engraving style.
 * Small caps only affects lowercase letters, so Reason's name is rendered
 * in its natural case ("The Reason"), not forced uppercase — forcing
 * uppercase first would make the small-caps transform a no-op.
 */
export const PillarBurst: React.FC<Props> = ({
  tokens,
  pillars,
  width,
  height,
  highlightKeepKey,
  highlightFromFrame,
}) => {
  const frame = useCurrentFrame();
  const ease = Easing.bezier(...tokens.EASE_STANDARD);

  const animate = (start: number, duration: number, fromVal: number, toVal: number) =>
    interpolate(frame, [start, start + duration], [fromVal, toVal], {
      easing: ease,
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    });

  // 0 (untouched) while highlightKeepKey is unset — every existing export
  // renders exactly as before. Once set, eases to 1 (fully faded) over
  // HIGHLIGHT_FADE_FRAMES starting at highlightFromFrame (defaulted to 0
  // only for the theoretical case that prop is left off — the composition
  // that actually turns this on always passes both together).
  const highlightFadeProgress =
    highlightKeepKey === undefined ? 0 : animate(highlightFromFrame ?? 0, HIGHLIGHT_FADE_FRAMES, 0, 1);

  // The true frame centre — Reason's fixed world position, and the origin
  // every pillar's own position is an offset from (see
  // computeHoneycombOffsets).
  const centre: Point = { x: width / 2, y: height / 2 };
  const honeycombOffsets = computeHoneycombOffsets(pillars);

  const textStyle: React.CSSProperties = {
    fontFamily: engravedFontFamily,
    fontWeight: 500,
    fontVariant: "small-caps",
    letterSpacing: "0.14em",
    textAlign: "center",
    fontSize: REASON_FONT_SIZE,
    // Explicit (not the ~1.2x "normal" default) so two stacked lines occupy
    // a predictable, exactly-known height — see the label's own "top" math
    // below, which centres a 2*REASON_FONT_SIZE-tall block on centre.y.
    lineHeight: `${REASON_FONT_SIZE}px`,
  };

  // The camera. Starts at frame 0, alongside the burst below — one
  // continuous move, not staged after a separate "Reason alone" beat.
  const cameraScale = animate(0, CAMERA_ZOOM_DURATION_FRAMES, CAMERA_START_SCALE, CAMERA_END_SCALE);

  // Reason's emblem: full opacity at the open, easing down to its settled
  // watermark opacity over the same span and easing as the camera move —
  // "over the course of the clip" tied to the one long continuous move
  // everything else already rides, rather than its own separate timing.
  // Reason isn't exempt from the highlight fade (per explicit instruction
  // — "Reason disappears too"), so this multiplies straight through by
  // (1 - highlightFadeProgress), same as every non-kept pillar.
  const reasonEmblemOpacity =
    animate(0, CAMERA_ZOOM_DURATION_FRAMES, 1, REASON_EMBLEM_SETTLED_OPACITY) * (1 - highlightFadeProgress);

  // The burst. Each pillar's emblem launches STAGGER_BURST_FRAMES after
  // the previous one, keyed to its index in `pillars`.
  const burstStart = 0;

  const items = pillars.map((pillar, i) => {
    const emblemStart = burstStart + i * tokens.STAGGER_BURST_FRAMES;
    const emblemProgress = animate(emblemStart, tokens.DURATION_MICRO_FRAMES, 0, 1);

    const offset = honeycombOffsets.get(pillar.key);
    if (!offset) {
      throw new Error(`No honeycomb offset computed for pillar "${pillar.key}"`);
    }
    // Travels from Reason's own centre point out to its resting position —
    // "emerge from that word itself" — with opacity and scale riding the
    // same eased progress, so it's small and near-invisible at the start
    // and settles into full size/opacity exactly as it arrives. This is
    // the individual arrival lerp in world-space coordinates; the shared
    // cameraScale transform (see the wrapping <div> below) is what turns
    // that world-space position into what actually lands on screen.
    const x = centre.x + offset.x * emblemProgress;
    const y = centre.y + offset.y * emblemProgress;
    // The pillar named by highlightKeepKey is exempt from the fade —
    // every other pillar (highlightFadeProgress is 0 for all of them when
    // the feature is off, so this is a no-op then) eases to fully
    // transparent alongside Reason.
    const highlightOpacity = pillar.key === highlightKeepKey ? 1 : 1 - highlightFadeProgress;
    return { pillar, emblemProgress, highlightOpacity, x, y };
  });

  return (
    <div
      style={{
        width,
        height,
        position: "relative",
        fontFamily: engravedFontFamily,
      }}
    >
      {/* Reason and all twelve pillars, as one group, scaled around the
          frame's exact centre (== Reason's own world position) by
          cameraScale. This div spans the full frame, so its default
          50%/50% transform origin already lands exactly on `centre`
          without needing to compute one manually. Nothing in here has
          its own independent scale transform beyond this one and each
          pillar's own small arrival scale (emblemProgress), which is
          about that pillar growing into being, not about the camera. No
          hexagon outlines are drawn — removed on explicit instruction
          ("get rid of the hexagons, keep everything else the same") —
          this group is icons and text only now. */}
      <div
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          width,
          height,
          transform: `scale(${cameraScale})`,
          transformOrigin: "50% 50%",
        }}
      >
        {/* Reason's emblem — filling its reserved footprint edge to edge,
            centred on Reason's own point. DECIDED — "the label is hard to
            read against its emblem... drop it to 30% opacity so it sits
            behind as a watermark," then "shift from full opacity to the
            current [value] over the course of the clip" — see
            reasonEmblemOpacity above. Opacity lives on this wrapper, not
            inside PillarIcon, so it's scoped to Reason's own emblem only —
            the other twelve pillar icons (rendered separately, below)
            are untouched and stay at full opacity throughout. */}
        <div
          style={{
            position: "absolute",
            left: centre.x - REASON_ICON_SIZE / 2,
            top: centre.y - REASON_ICON_SIZE / 2,
            width: REASON_ICON_SIZE,
            height: REASON_ICON_SIZE,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            opacity: reasonEmblemOpacity,
          }}
        >
          <PillarIcon
            name={REASON_LABEL}
            iconScale={1}
            iconOffsetX={0}
            iconOffsetY={0}
            baseSize={REASON_ICON_SIZE}
          />
        </div>

        {items.map(({ pillar, emblemProgress, highlightOpacity, x, y }) => (
          <div
            key={pillar.key}
            style={{
              position: "absolute",
              left: x - ICON_BASE_SIZE / 2,
              top: y - ICON_BASE_SIZE / 2,
              width: ICON_BASE_SIZE,
              height: ICON_BASE_SIZE,
              opacity: emblemProgress * highlightOpacity,
              transform: `scale(${emblemProgress})`,
              transformOrigin: "center",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <PillarIcon
              name={pillar.name}
              iconScale={pillar.iconScale}
              iconOffsetX={pillar.iconOffsetX}
              iconOffsetY={pillar.iconOffsetY}
              baseSize={ICON_BASE_SIZE}
            />
          </div>
        ))}

        {/* Reason's name — "make it two lines so to speak, The is above
            Reason" — split on the space in REASON_LABEL rather than a
            second hardcoded string, so the two lines can never drift out
            of sync with the name used for the icon file lookup elsewhere.
            Each word its own line, centred as a block over the emblem
            (still centre.y, no vertical shift). Block height is exactly
            2*REASON_FONT_SIZE (two lines at the explicit lineHeight set in
            textStyle above), so top = centre.y - REASON_FONT_SIZE centres
            it precisely rather than approximately. Still rendered last in
            this group (after every pillar icon, not just Reason's own
            emblem) so it always paints on top — kept as free insurance
            against the mix-blend-mode: screen text-eating bug an earlier
            honeycomb layout actually hit, even though this overlay
            position is exactly where that bug was originally seen, so the
            insurance is doing real work again here, not just standing by
            unused. */}
        <div
          style={{
            position: "absolute",
            left: centre.x - REASON_WIDTH / 2,
            top: centre.y - REASON_FONT_SIZE,
            width: REASON_WIDTH,
            color: white(tokens.OPACITY_BOLD),
            // Per explicit instruction ("Reason disappears too"), the
            // label fades out with everything else in the highlight
            // phase — 1 (untouched) whenever that phase is off.
            opacity: 1 - highlightFadeProgress,
            ...textStyle,
          }}
        >
          {REASON_LABEL.split(" ").map((word) => (
            <div key={word}>{word}</div>
          ))}
        </div>
      </div>
    </div>
  );
};
