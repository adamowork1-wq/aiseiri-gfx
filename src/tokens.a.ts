/**
 * Token variant A — "Dense & graphic."
 *
 * Everything settled (colour, opacity, type sizes, motion, etc.) is
 * imported unchanged from tokens.shared.ts. This file only picks values
 * for the three things not yet decided: how much of the frame the
 * instrument fills, how hard the hairline-to-bold jump lands, and how
 * much air sits around the type. See tokens.b.ts and tokens.c.ts for the
 * other two points on each of those three spectrums.
 *
 * A leans toward a dense, assertive, graphic read: the instrument commands
 * most of the frame, the bold stroke is as heavy as the references
 * support, and type sits close and tight rather than loosely spaced.
 */

export * from "./tokens.shared";

// ---------------------------------------------------------------------------
// 1. How much of the frame the instrument occupies
// ---------------------------------------------------------------------------

/** OPTION (undecided) — low end of a plausible margin range. At 0.14, the
 * instrument occupies roughly 72% of the frame's shorter dimension —
 * noticeably larger and more dominant than the single-instrument
 * references' own proportions (which ran closer to 40-60% occupancy),
 * chosen here as the "commands the frame" end of the spectrum rather than
 * a literal re-measurement. Expressed as a fraction of the shorter frame
 * dimension, applied equally on all sides. */
export const SPECIMEN_MARGIN_RATIO: number = 0.14;

// ---------------------------------------------------------------------------
// 2. How far the hairline-to-bold weight jump goes
// ---------------------------------------------------------------------------

/** OPTION (undecided) — top of the measured 3-5x band seen across the
 * gauge/radar references, at 5x the 1px hairline. The most dramatic,
 * highest-contrast version of the two-tier stroke system: the one bold
 * element per composition reads unmistakably heavier against the hairline
 * grid. Pairs with the dense framing above. */
export const STROKE_BOLD_PX: number = 5;

// ---------------------------------------------------------------------------
// 3. How much air sits around the type
// ---------------------------------------------------------------------------

/** OPTION (undecided) — base spacing unit tightened from the 8px midpoint
 * estimate, for a compact, instrument-panel-dense feel: labels sit close
 * to what they annotate, hero numerals sit close to their captions. */
export const SPACE_UNIT_PX: number = 6;

export const SPACE_XS_PX = SPACE_UNIT_PX * 0.5; // 3px  — tightest gap, e.g. tick-to-tick-label
export const SPACE_SM_PX = SPACE_UNIT_PX * 1; //  6px  — hero numeral to its caption
export const SPACE_MD_PX = SPACE_UNIT_PX * 2; // 12px  — label to the element it annotates
export const SPACE_LG_PX = SPACE_UNIT_PX * 4; // 24px  — between independent sub-elements
export const SPACE_XL_PX = SPACE_UNIT_PX * 8; // 48px  — outer padding inside a specimen's own bounds

/** OPTION (undecided) — tracking pulled in from the 0.08em midpoint
 * estimate. Tighter tracking reads denser and more technical, consistent
 * with the rest of this variant's "fills the frame, hits hard" character. */
export const LETTER_SPACING_LABEL_EM: number = 0.04;
