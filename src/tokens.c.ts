/**
 * Token variant C — "Airy & refined."
 *
 * Everything settled (colour, opacity, type sizes, motion, etc.) is
 * imported unchanged from tokens.shared.ts. This file only picks values
 * for the three things not yet decided: how much of the frame the
 * instrument fills, how hard the hairline-to-bold jump lands, and how
 * much air sits around the type. See tokens.a.ts and tokens.b.ts for the
 * other two points on each of those three spectrums.
 *
 * C leans toward a quieter, more spacious read: the instrument floats in
 * a larger field of black, the bold stroke barely lifts off the hairline
 * weight, and type is loosely tracked and generously spaced. Closer to
 * the "isolated specimen" character of the single-instrument references
 * than to their raw density.
 */

export * from "./tokens.shared";

// ---------------------------------------------------------------------------
// 1. How much of the frame the instrument occupies
// ---------------------------------------------------------------------------

/** OPTION (undecided) — high end of a plausible margin range. At 0.30,
 * the instrument occupies roughly 40% of the frame's shorter dimension —
 * the low end of what the single-instrument references themselves show
 * (40-60% occupancy), chosen here as the "floats in space" end of the
 * spectrum. Expressed as a fraction of the shorter frame dimension,
 * applied equally on all sides. */
export const SPECIMEN_MARGIN_RATIO: number = 0.3;

// ---------------------------------------------------------------------------
// 2. How far the hairline-to-bold weight jump goes
// ---------------------------------------------------------------------------

/** OPTION (undecided) — below the measured 3-5x band seen across the
 * gauge/radar references, at 2x the 1px hairline. This is a deliberate
 * extrapolation past what the references show, offered as the "subtle"
 * end of the spectrum since the weight jump itself is still undecided:
 * the bold element stays visibly distinct from the hairline grid but
 * without the graphic punch of a 3-5x jump. */
export const STROKE_BOLD_PX: number = 2;

// ---------------------------------------------------------------------------
// 3. How much air sits around the type
// ---------------------------------------------------------------------------

/** OPTION (undecided) — base spacing unit opened up from the 8px midpoint
 * estimate, for a looser, more composed feel: labels sit apart from what
 * they annotate, hero numerals have room to breathe from their captions. */
export const SPACE_UNIT_PX: number = 12;

export const SPACE_XS_PX = SPACE_UNIT_PX * 0.5; // 6px   — tightest gap, e.g. tick-to-tick-label
export const SPACE_SM_PX = SPACE_UNIT_PX * 1; //  12px  — hero numeral to its caption
export const SPACE_MD_PX = SPACE_UNIT_PX * 2; // 24px  — label to the element it annotates
export const SPACE_LG_PX = SPACE_UNIT_PX * 4; // 48px  — between independent sub-elements
export const SPACE_XL_PX = SPACE_UNIT_PX * 8; // 96px  — outer padding inside a specimen's own bounds

/** OPTION (undecided) — tracking opened up from the 0.08em midpoint
 * estimate. Looser tracking reads calmer and more editorial, consistent
 * with the rest of this variant's "floats in space, understated" character. */
export const LETTER_SPACING_LABEL_EM: number = 0.14;
