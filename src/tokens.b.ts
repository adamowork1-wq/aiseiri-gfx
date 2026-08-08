/**
 * Token variant B — "Balanced."
 *
 * Everything settled (colour, opacity, type sizes, motion, etc.) is
 * imported unchanged from tokens.shared.ts. This file only picks values
 * for the three things not yet decided: how much of the frame the
 * instrument fills, how hard the hairline-to-bold jump lands, and how
 * much air sits around the type. See tokens.a.ts and tokens.c.ts for the
 * other two points on each of those three spectrums.
 *
 * B sits at the midpoint of all three spectrums — the straight read of
 * the reference measurements with no push toward either extreme. If
 * you're not sure which variant to start from, this is the one closest to
 * "what the references show, un-editorialised."
 */

export * from "./tokens.shared";

// ---------------------------------------------------------------------------
// 1. How much of the frame the instrument occupies
// ---------------------------------------------------------------------------

/** OPTION (undecided) — midpoint estimate. Across the single-instrument
 * references the instrument occupies roughly 40-60% of frame
 * width/height, i.e. a margin of roughly 20-30% per side — a visual
 * estimate, not a pixel measurement. 0.22 sits inside that band.
 * Expressed as a fraction of the shorter frame dimension, applied equally
 * on all sides. */
export const SPECIMEN_MARGIN_RATIO: number = 0.22;

// ---------------------------------------------------------------------------
// 2. How far the hairline-to-bold weight jump goes
// ---------------------------------------------------------------------------

/** OPTION (undecided) — middle of the measured 3-5x band seen across the
 * gauge/radar references, at 3x the 1px hairline. A clean multiplier that
 * keeps the bold stroke crisp rather than heavy after video compression,
 * without pushing to either end of the observed range. */
export const STROKE_BOLD_PX: number = 3;

// ---------------------------------------------------------------------------
// 3. How much air sits around the type
// ---------------------------------------------------------------------------

/** OPTION (undecided) — standard 8px grid unit, chosen as a neutral
 * midpoint since exact spacing isn't recoverable from the references at
 * pixel precision. */
export const SPACE_UNIT_PX: number = 8;

export const SPACE_XS_PX = SPACE_UNIT_PX * 0.5; // 4px  — tightest gap, e.g. tick-to-tick-label
export const SPACE_SM_PX = SPACE_UNIT_PX * 1; //  8px  — hero numeral to its caption
export const SPACE_MD_PX = SPACE_UNIT_PX * 2; // 16px  — label to the element it annotates
export const SPACE_LG_PX = SPACE_UNIT_PX * 4; // 32px  — between independent sub-elements
export const SPACE_XL_PX = SPACE_UNIT_PX * 8; // 64px  — outer padding inside a specimen's own bounds

/** OPTION (undecided) — a standard wide-tracking value for small
 * uppercase telemetry-style labels, estimated to match what the
 * references show without leaning tight or loose. */
export const LETTER_SPACING_LABEL_EM: number = 0.08;
