import React, { useState } from "react";
import { Easing, Img, interpolate, staticFile, useCurrentFrame } from "remotion";
import * as LucideIcons from "lucide-react";
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

export type Cluster = "PHYSICAL" | "MIND" | "CHARACTER" | "CRAFT";

export type Pillar = {
  name: string;
  /** kebab-case identifier — matches the PNG filename in public/icons/
   * (`${key}.png`) and is otherwise just this pillar's stable id. */
  key: string;
  /** Lucide icon component name, used only when the PNG at
   * public/icons/${key}.png is missing or fails to load. */
  icon: string;
  /** Which loose grouping this pillar belongs to. */
  cluster: Cluster;
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
};

// lucide-react exports one named component per icon (PascalCase, e.g.
// `Sigma`, `WavesHorizontal`) rather than a single lookup table, so this
// casts the whole namespace import into one for the JSON-driven `icon`
// field to key into. A minimal local prop type stands in for lucide's own
// (unexported) prop type — only what's actually used here.
type LucideIconProps = {
  size?: number;
  strokeWidth?: number;
  color?: string;
  style?: React.CSSProperties;
};
const LucideIconsByName = LucideIcons as unknown as Record<
  string,
  React.ComponentType<LucideIconProps>
>;

const REASON_LABEL = "The Reason";
const ICON_BASE_SIZE = 108; // px @1080p — a picked constant, nothing to size it against
const LABEL_WIDTH = 210; // px @1080p, fixed
const LABEL_FONT_SIZE = 26; // INFERRED — small-caps serif reads smaller than sans at the same size; bumped up from FONT_SIZE_LABEL_PX (22) for legibility, not pulled from a shared token since this composition's type is its own scoped choice

const white = (opacity: number) => `rgba(255, 255, 255, ${opacity})`;

type Point = { x: number; y: number };
type Bounds = { cx: number; cy: number; halfW: number; halfH: number };

/**
 * Deterministic pseudo-random value in [0, 1) from an integer seed — the
 * standard sine-hash trick. Used only for the small per-pillar jitter in
 * computeScatterPositions below, so the "loose" look is reproducible frame
 * to frame and render to render rather than actually random.
 */
const pseudoRandom = (seed: number): number => {
  const x = Math.sin(seed * 12.9898) * 43758.5453;
  return x - Math.floor(x);
};

/**
 * Groups pillars by cluster in the given walking order, preserving each
 * pillar's original index in `pillars` (that index still seeds its scatter
 * jitter and stagger — layout never changes timing).
 */
const groupByCluster = (pillars: Pillar[], order: Cluster[]) =>
  order.map((cluster) => ({
    cluster,
    members: pillars
      .map((pillar, index) => ({ pillar, index }))
      .filter((m) => m.pillar.cluster === cluster),
  }));

const GAP_DEG = 32; // angular buffer between adjacent clusters' wedges
const JITTER_ANGLE_DEG = 1.5; // max per-pillar angular nudge, either direction
const JITTER_RADIUS_FRAC = 0.04; // max per-pillar radius nudge, as a fraction of the base radius

/**
 * "Loose groupings": each cluster gets its own wedge of angular territory
 * around Reason, sized proportionally to its member count rather than a
 * fixed quarter each — PHYSICAL (5 members) needs roughly 5/11 of the
 * circle to keep its labels clear of each other, not the same 90° budget
 * as CRAFT (1 member). Wedges tile the full circle with a GAP_DEG buffer
 * between them, walked in a fixed order starting from "up" so PHYSICAL
 * reads as the top cluster the way every earlier layout did.
 *
 * Within its wedge, each cluster's members sit on a shared-radius arc,
 * evenly spaced corner-to-corner across the wedge, then nudged by a small
 * deterministic angle/radius jitter (see pseudoRandom above) so the result
 * reads as a loose cluster rather than a mechanically even one — "loose
 * groupings... rather than an even ring."
 *
 * The "radius" is actually an ellipse (Rx, Ry), not a circle: the frame's
 * usable half-width is roughly double its usable half-height, so a
 * circular layout wastes the horizontal room while being bottlenecked by
 * height for near-vertical members (PHYSICAL's own centre, pointing
 * straight up). Stretching horizontally buys back headroom for GAP_DEG and
 * per-cluster spacing without pushing any member past the frame's actual
 * limit in either axis.
 *
 * This went through two failed passes before landing here, both caught by
 * actually computing pairwise distances rather than eyeballing the trig
 * (see tune-scatter.js in scratch): a fixed 90°-per-cluster budget forced
 * PHYSICAL's required radius past the frame's half-height; fixing that
 * with a small proportional-share GAP_DEG (10°) then left adjacent
 * clusters' *edge* members only 10° apart at the same radius — the actual
 * bug rendered at frame 90 (The Total and The Calm overlapping) — because
 * the within-cluster spacing check never covered the boundary between two
 * different clusters. GAP_DEG=32 and the Rx/Ry split above are both sized
 * against that boundary case specifically, not just the intra-cluster one.
 */
const computeScatterPositions = (pillars: Pillar[], b: Bounds): Map<string, Point> => {
  const positions = new Map<string, Point>();
  const rx = b.halfW * 0.7;
  const ry = b.halfH * 0.77;

  const order: Cluster[] = ["PHYSICAL", "CHARACTER", "CRAFT", "MIND"];
  const groups = groupByCluster(pillars, order);
  const total = pillars.length;
  const availableDeg = 360 - GAP_DEG * order.length;

  // Centre PHYSICAL's wedge on "up" (-90°, screen-space where 0° = right
  // and +90° = down), then walk the remaining clusters clockwise from there.
  const physicalShare = (groups[0].members.length / total) * availableDeg;
  let cursor = -90 - physicalShare / 2;

  for (const { members } of groups) {
    const count = members.length;
    if (count === 0) {
      cursor += GAP_DEG;
      continue;
    }
    const share = (count / total) * availableDeg;
    const wedgeStart = cursor;

    members.forEach(({ pillar, index }, i) => {
      const baseAngleDeg =
        count === 1 ? wedgeStart + share / 2 : wedgeStart + (share * i) / (count - 1);
      const angleJitterDeg = (pseudoRandom(index * 2 + 1) - 0.5) * 2 * JITTER_ANGLE_DEG;
      const radiusJitterFrac = (pseudoRandom(index * 2 + 2) - 0.5) * 2 * JITTER_RADIUS_FRAC;
      const angleRad = ((baseAngleDeg + angleJitterDeg) * Math.PI) / 180;
      const rf = 1 + radiusJitterFrac;
      positions.set(pillar.key, {
        x: b.cx + Math.cos(angleRad) * rx * rf,
        y: b.cy + Math.sin(angleRad) * ry * rf,
      });
    });

    cursor += share + GAP_DEG;
  }

  return positions;
};

/**
 * One pillar's artwork: the PNG at public/icons/${key}.png if it loads —
 * white line art on black, composited with mix-blend-mode: screen so the
 * black drops out and only the white survives — falling back to the
 * matching Lucide icon if the PNG 404s or hasn't been added yet. Per
 * Remotion's own Img docs, an onError handler must unmount the failed
 * <Img> or swap its src; this unmounts it (via the `failed` state) and
 * renders the Lucide fallback in its place.
 */
const PillarIcon: React.FC<{
  pillar: Pillar;
  baseSize: number;
  color: string;
  strokeWidth: number;
}> = ({ pillar, baseSize, color, strokeWidth }) => {
  const [failed, setFailed] = useState(false);
  const size = baseSize * pillar.iconScale;
  const offset = `translate(${pillar.iconOffsetX}px, ${pillar.iconOffsetY}px)`;

  if (!failed) {
    return (
      <Img
        src={staticFile(`icons/${pillar.key}.png`)}
        onError={() => setFailed(true)}
        style={{
          width: size,
          height: size,
          objectFit: "contain",
          transform: offset,
          mixBlendMode: "screen",
        }}
      />
    );
  }

  const Fallback = LucideIconsByName[pillar.icon];
  return Fallback ? (
    <Fallback size={size} strokeWidth={strokeWidth} color={color} style={{ transform: offset }} />
  ) : null;
};

/**
 * "The Reason" appears at centre as text — no circle, no connectors,
 * nothing linking it to the pillars — then the eleven pillars emerge from
 * that word itself: each one starts small, near-invisible and positioned
 * exactly at Reason's own centre point, then travels out to its resting
 * spot while scaling up and fading in, all driven by one eased progress
 * value per pillar (see `animate` below, using EASE_STANDARD — "fast at
 * first, then decelerate hard and settle," which is exactly the shape that
 * curve was already documented as producing). Pillars are staggered only
 * slightly relative to how long each one travels
 * (SCATTER_STAGGER_FRAMES vs. DURATION_LINE_DRAW_FRAMES), so many are
 * mid-flight at once — "should feel like a scatter that resolves, not a
 * sequence," not the earlier one-at-a-time bubble pop.
 *
 * Position and clustering alone carry the structure now — no spokes, no
 * circuit traces. Every pillar still belongs to one of four loose
 * groupings (PHYSICAL / MIND / CHARACTER / CRAFT), computed by
 * computeScatterPositions above, but nothing is drawn to show the
 * grouping directly; it reads from where each pillar lands. This replaces
 * the earlier "compass" layout (straight trunks + crossbars) and its
 * "cybersigilism meets Tron" thick glowing connectors — both fully
 * removed rather than left dead; see git history if either is ever wanted
 * again.
 *
 * Each pillar is just its icon with its name below it — no circles, no
 * fills, no colour anywhere: pure white on black. Pillar data (name, icon,
 * cluster, icon placement) comes from `pillars` (data/pillars.json).
 *
 * Type is Cormorant Garamond, not the system's usual Space Grotesk — set
 * in small caps with wide tracking to match the icons' engraving style.
 * Small caps only affects lowercase letters, so pillar/Reason names are
 * rendered in their natural case ("The Total"), not forced uppercase —
 * forcing uppercase first would make the small-caps transform a no-op.
 *
 * Timing: Reason enters over DURATION_ENTER_FRAMES, a
 * PAUSE_BETWEEN_BEATS_FRAMES pause, then each pillar launches over
 * DURATION_LINE_DRAW_FRAMES, staggered SCATTER_STAGGER_FRAMES apart in
 * `pillars` order, then HOLD_MIN_FRAMES once the last one lands. All from
 * tokens.shared.ts.
 */
export const PillarBurst: React.FC<Props> = ({ tokens, pillars, width, height }) => {
  const frame = useCurrentFrame();
  const ease = Easing.bezier(...tokens.EASE_STANDARD);

  const animate = (start: number, duration: number, fromVal: number, toVal: number) =>
    interpolate(frame, [start, start + duration], [fromVal, toVal], {
      easing: ease,
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    });

  const cx = width / 2;
  const cy = height / 2;
  const shorterDim = Math.min(width, height);

  // Same reasoning as every previous version: this structure needs much
  // less reserved margin than the bar chart's rectangular plot.
  const margin = tokens.SPECIMEN_MARGIN_RATIO * shorterDim * 0.28;
  const bounds: Bounds = { cx, cy, halfW: width / 2 - margin, halfH: height / 2 - margin };

  const scatterPositions = computeScatterPositions(pillars, bounds);

  const textStyle: React.CSSProperties = {
    fontFamily: engravedFontFamily,
    fontWeight: 500,
    fontVariant: "small-caps",
    letterSpacing: "0.14em",
    textAlign: "center",
    fontSize: LABEL_FONT_SIZE,
  };

  // Beat 1 — Reason settles at the centre.
  const reasonProgress = animate(0, tokens.DURATION_ENTER_FRAMES, 0, 1);

  // Beat 2 — the scatter. Starts once Reason has settled plus a pause;
  // each pillar gets its own start time from a small stagger, keyed to its
  // index in `pillars` — unaffected by cluster/layout.
  const burstStart = tokens.DURATION_ENTER_FRAMES + tokens.PAUSE_BETWEEN_BEATS_FRAMES;

  const items = pillars.map((pillar, i) => {
    const startDelay = burstStart + i * tokens.SCATTER_STAGGER_FRAMES;
    const progress = animate(startDelay, tokens.DURATION_LINE_DRAW_FRAMES, 0, 1);
    const finalPos = scatterPositions.get(pillar.key);
    if (!finalPos) {
      throw new Error(`No scatter position computed for pillar "${pillar.key}"`);
    }
    // Travels from Reason's own centre point out to its resting position —
    // "emerge from that word itself" — with opacity and scale riding the
    // same eased progress, so it's small and near-invisible at the start
    // and settles into full size/opacity exactly as it arrives.
    const x = cx + (finalPos.x - cx) * progress;
    const y = cy + (finalPos.y - cy) * progress;
    return { pillar, progress, x, y };
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
      {/* Reason label — no circle, just its name at the centre */}
      <div
        style={{
          position: "absolute",
          left: cx - LABEL_WIDTH / 2,
          top: cy - LABEL_FONT_SIZE / 2,
          width: LABEL_WIDTH,
          opacity: reasonProgress,
          color: white(tokens.OPACITY_BOLD),
          ...textStyle,
        }}
      >
        {REASON_LABEL}
      </div>

      {/* Pillar icons + labels, travelling out from Reason's centre to
          their resting position. Label always directly below the icon. */}
      {items.map(({ pillar, progress, x, y }) => (
        <React.Fragment key={pillar.key}>
          <div
            style={{
              position: "absolute",
              left: x - ICON_BASE_SIZE / 2,
              top: y - ICON_BASE_SIZE / 2,
              width: ICON_BASE_SIZE,
              height: ICON_BASE_SIZE,
              opacity: progress,
              transform: `scale(${progress})`,
              transformOrigin: "center",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <PillarIcon
              pillar={pillar}
              baseSize={ICON_BASE_SIZE}
              color={white(tokens.OPACITY_HAIRLINE)}
              strokeWidth={1.5}
            />
          </div>

          <div
            style={{
              position: "absolute",
              left: x - LABEL_WIDTH / 2,
              top: y + ICON_BASE_SIZE / 2 + tokens.SPACE_SM_PX,
              width: LABEL_WIDTH,
              opacity: progress,
              color: white(tokens.OPACITY_LABEL),
              ...textStyle,
            }}
          >
            {pillar.name}
          </div>
        </React.Fragment>
      ))}
    </div>
  );
};
