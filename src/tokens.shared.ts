/**
 * Design tokens common to every variant of the system (see tokens.a.ts,
 * tokens.b.ts, tokens.c.ts).
 *
 * Source: 10 Midjourney references in ref/ (gauges, radar charts, bar
 * charts, a hairline parallel-coordinates plot, and two dashboard mosaics),
 * reconciled against product decisions made on top of that analysis:
 *
 *   1. Colour     — strict monochrome, white on pure black. The amber accent
 *                    seen in the two dashboard refs is discarded entirely.
 *   2. Framing     — one instrument, centred ("specimen" composited over
 *                    footage), not the dashboard's edge-to-edge tiling.
 *   3. Bar charts  — always carry a legible y-axis (numerals) and x-axis
 *                    (labels). The axis-less silhouette variant is discarded.
 *   4. Radar       — one clean polygon, legible axis labels, vertex dots.
 *                    The tangled multi-polyline variant is discarded.
 *   5. Type        — every character is real and legible content, never the
 *                    scrambled-glyph "texture" density seen in the table
 *                    refs.
 *
 * These five are settled and identical across all three variants below.
 * What's NOT settled — and what the A/B/C variant files each pick a
 * different point on — is:
 *
 *   - how much of the frame the instrument occupies (SPECIMEN_MARGIN_RATIO)
 *   - how far the jump from hairline to bold stroke goes (STROKE_BOLD_PX)
 *   - how much air sits around the type (the SPACE_* scale and
 *     LETTER_SPACING_LABEL_EM)
 *
 * Every token is labelled MEASURED (read directly off a reference image),
 * INFERRED (the flattened PNGs can't give this exactly — estimated and
 * flagged as such), or DECIDED (a value that overrides a raw measurement
 * because of an explicit instruction, e.g. the label-size floor).
 *
 * All pixel values are authored against a 1080p (1920x1080) reference
 * frame — see REFERENCE_HEIGHT_PX. Scale linearly by
 * `actualHeight / REFERENCE_HEIGHT_PX` when rendering at other resolutions.
 */

// ---------------------------------------------------------------------------
// Reference frame
// ---------------------------------------------------------------------------

/** MEASURED (proportions) — the canonical frame height all px tokens below
 * are authored against. Every ref reads as a 16:9 frame; 1080p is the
 * resolution decision made when the label-size floor was set, so it's the
 * baseline the rest of the system scales from. */
export const REFERENCE_HEIGHT_PX = 1080;
export const REFERENCE_WIDTH_PX = 1920;

// ---------------------------------------------------------------------------
// Colour
// ---------------------------------------------------------------------------

/** MEASURED — every reference background samples as pure black, no lift,
 * no vignette. This is the only background colour in the system. */
export const COLOR_BLACK = "#000000";

/** MEASURED — every bold/emphasis element in every reference samples as
 * pure white. This is the only foreground colour in the system. There is
 * no accent colour: the amber seen in the two dashboard refs is explicitly
 * excluded per decision 1 above. */
export const COLOR_WHITE = "#FFFFFF";

/** DECIDED — the single, deliberate exception to strict monochrome (see
 * decision 1: colour is locked to white-on-black, no accent). This colour
 * means exactly one thing: the segment of a value that hasn't been reached
 * yet — the gap between a current value and its target. It is not a
 * highlight, not an emphasis device, and not interchangeable with the
 * hairline/bold weight system that already does emphasis in this system.
 * A value with no target has no amber anywhere near it. Do not reach for
 * this constant for anything else (warnings, active states, brand
 * accents, "make it pop") without first revisiting the no-accent-colour
 * decision itself — that's a design-system change, not a token edit.
 * Hex is a picked value, not a measured one: none of the references were
 * sampled precisely enough to give an exact swatch, and the two dashboard
 * refs that did show amber are the ones explicitly excluded above. */
export const COLOR_AMBER_GAP = "#F59E0B";

/** Helper: white at a given opacity. Colour never varies in this system —
 * only opacity does. */
export const rgbaWhite = (opacity: number): string => `rgba(255, 255, 255, ${opacity})`;

// ---------------------------------------------------------------------------
// Opacity
// ---------------------------------------------------------------------------

/** MEASURED — the single bold/hero element per composition (outer gauge
 * rim, the one emphasised radar polygon, a hero numeral) always reads as
 * full-strength white. */
export const OPACITY_BOLD = 1;

/** INFERRED — grid/structural hairlines (radar spokes, gauge rings, axis
 * frames) sit visibly dimmer than the bold rim in every reference, but a
 * flattened PNG doesn't give an exact alpha value. 0.35 is an estimate
 * chosen to read clearly as "structure, not signal" without disappearing
 * on a compressed video export. Not one of the three open variables — kept
 * identical across A/B/C. */
export const OPACITY_HAIRLINE = 0.35;

/** INFERRED / DECIDED — labels in the raw references are low-contrast
 * because they're doubling as texture (decision 5 discards that use). Now
 * that every label is real content that must be read, it can't be dimmed
 * the way the refs dim it. 0.85 keeps a small hierarchy step below
 * OPACITY_BOLD while staying comfortably legible; hierarchy is carried by
 * size and weight, not opacity. */
export const OPACITY_LABEL = 0.85;

/** MEASURED (structure) — the tail end of the single soft gradient
 * highlight each gauge reference uses on one dial quadrant. The gradient
 * runs from OPACITY_BOLD down to this value, i.e. fully transparent. */
export const OPACITY_GRADIENT_TAIL = 0;

// ---------------------------------------------------------------------------
// Stroke weight
// ---------------------------------------------------------------------------

/** MEASURED — every grid/structure line (radar spokes and rings, gauge
 * tick dial, axis frames) reads as the thinnest renderable stroke, ~1px at
 * the reference's apparent output resolution. This end of the two-tier
 * system is fixed by the references themselves, unlike STROKE_BOLD_PX
 * (which varies per variant, see tokens.a/b/c.ts) — there's nothing to
 * decide about how thin the hairline goes; it's already at the floor. */
export const STROKE_HAIRLINE_PX = 1;

// Note: there is no third weight in any variant. Hairline and bold, and
// nothing between, is a structural rule that holds regardless of where
// STROKE_BOLD_PX lands — see each variant file.

// ---------------------------------------------------------------------------
// Type
// ---------------------------------------------------------------------------

/** INFERRED — placeholder geometric sans standing in for the open-counter,
 * light-weight face seen on the gauge numerals ("12", "10"). Raster
 * references don't expose an actual typeface; swap this for a chosen font
 * (loaded via @remotion/google-fonts) once one is picked. */
export const FONT_FAMILY_PRIMARY = '"Space Grotesk", sans-serif';

/** DECIDED (overrides a raw measurement) — the raw references put labels
 * at ~1.5% of frame height, which measures to roughly 15px at 1080p: too
 * small once compressed and viewed on a phone. This is the floor labels
 * are set to instead. Fixed across all three variants — it's a legibility
 * requirement, not an open aesthetic question. */
export const FONT_SIZE_LABEL_PX = 22;

/** INFERRED — the hero numeral (gauge centre value, or any single
 * headline value) measured at roughly 8-10% of frame height across the
 * gauge references. 96px is a concrete pick within that band (96/1080 =
 * 8.9%). Combined with FONT_SIZE_LABEL_PX = 22, this produces a ~4.4:1
 * hero-to-label ratio — a consequence of the two independent size
 * decisions, not a ratio targeted directly. Fixed across all three
 * variants; only the air around this type (spacing/tracking) varies. */
export const FONT_SIZE_HERO_PX = 96;

/** INFERRED — the gauge numerals read as a light weight with open
 * counters, distinctly lighter than default text weight. */
export const FONT_WEIGHT_HERO = 300;

/** INFERRED — bumped up from the "thin" weight the reference labels
 * appear to use, because those reference labels are texture (decision 5)
 * and this system's labels are not. 500 keeps labels clearly legible at
 * FONT_SIZE_LABEL_PX without competing with the hero weight. */
export const FONT_WEIGHT_LABEL = 500;

/** MEASURED — labels in every reference are set in tracked-out capitals. */
export const TEXT_TRANSFORM_LABEL = "uppercase" as const;

/** MEASURED — the hero numerals in the gauge references are set with no
 * added tracking. Fixed — only LETTER_SPACING_LABEL_EM (in each variant
 * file) is an open question. */
export const LETTER_SPACING_HERO_EM = 0;

/** INFERRED — CSS font-feature-settings value enabling tabular
 * (fixed-width) figures, so stacked numerals align on a grid the way the
 * reference tables do. Standard practice for the tabular-data look the
 * refs are going for. */
export const FONT_FEATURE_TABULAR_NUMS = '"tnum" 1';

// ---------------------------------------------------------------------------
// Corners
// ---------------------------------------------------------------------------

/** MEASURED — no reference uses a rounded corner or a card/panel edge
 * anywhere; every shape is hard-edged. Kept as an explicit token so a
 * rounded corner has to consciously override this instead of being added
 * by default. */
export const RADIUS_NONE_PX = 0;

// ---------------------------------------------------------------------------
// Motion timing
// ---------------------------------------------------------------------------
// None of the references are animated — they're stills, so nothing here
// started out MEASURED. Most of it is still INFERRED (a motion design
// decision consistent with the hard-edged, technical, no-bounce character
// of the stills). A few are now DECIDED, where the two-beat bar-chart
// reveal (current value grows in, then the amber gap-to-target grows in,
// staggered per bar, then hold) gave an explicit number to lock in — those
// say so individually. Not one of the three open variables — kept
// identical across A/B/C.

/** Matches the fps already set on the scaffolded Composition
 * (src/Composition.tsx). All frame-based durations below are authored
 * against this rate; convert if a composition ever runs at a different
 * fps. */
export const FPS_REFERENCE = 30;

/** DECIDED — beat 1 of the two-beat value reveal: the current-value
 * segment growing from the baseline, all bars together, ~0.6s. Originally
 * an inferred hero-numeral reveal duration; confirmed as the bar-chart's
 * beat-1 duration, so it now does double duty for both. Fast enough to
 * read as an instrument snapping to a reading rather than a slow,
 * decorative reveal. */
export const DURATION_ENTER_FRAMES = 18;

/** DECIDED — beat 2 of the two-beat value reveal: the amber gap-to-target
 * segment growing from the top of the current-value bar up to the target,
 * per bar, ~0.8s. This is the literal "a bar rising to its value" case the
 * comment already described before the bar chart existed — now confirmed
 * against a real spec rather than just a plausible guess. */
export const DURATION_LINE_DRAW_FRAMES = 24;

/** INFERRED — duration for small secondary elements flicking in (a tick
 * mark, a single label), ~0.2s. Deliberately curt — instrumentation
 * ticking over, not individually-announced reveals. */
export const DURATION_MICRO_FRAMES = 6;

/** INFERRED — the gap between beat 1 (current value settles) and beat 2
 * (amber gap-to-target starts growing) in the bar-chart reveal: a "short
 * pause" was specified without an exact duration, so this picks one. 6
 * frames / 0.2s — long enough to read as a deliberate beat rather than a
 * dropped frame, short enough that the two beats still feel like one
 * continuous reveal rather than two disconnected animations. */
export const PAUSE_BETWEEN_BEATS_FRAMES = 6;

/** DECIDED — per-item delay when staggering a sequence of like elements
 * (bar columns rising one after another, radar spokes revealing in turn).
 * 3 frames = 100ms at 30fps, per the bar chart's explicit "about 100ms
 * apart" spec. Supersedes an earlier inferred guess of 2 frames (~67ms). */
export const STAGGER_FRAMES = 3;

/** DECIDED — how long the fully-resolved state holds before a composition
 * is allowed to end or loop, ~2s. Matches the bar chart's explicit "hold
 * the final state for at least 2 seconds." A composition's total duration
 * should be at least (last element's end frame) + this. */
export const HOLD_MIN_FRAMES = 60;

/** INFERRED — cubic-bezier control points for a crisp "expo-out" ease:
 * fast start, hard settle, no overshoot. Chosen over a springy/bouncy
 * curve to match the flat, technical, HUD-like character of every still —
 * and confirmed by the bar chart's explicit "smooth ease-out ... no
 * bounce" spec for both of its beats. Use with Remotion's
 * `Easing.bezier(...EASE_STANDARD)`. */
export const EASE_STANDARD: readonly [number, number, number, number] = [0.16, 1, 0.3, 1];
