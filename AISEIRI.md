# Aiséirí Motion Graphics — Standing Brief

## Project

Remotion motion-graphics library for Aiséirí. Aiséirí is the only visual language. Pure black `#000000`, hairline white strokes, amber `#FF7A18`. Vast negative space, extreme restraint, nothing decorative. Existing: BarChart, PillarBurst, Marquee, Typewriter, DiagonalWipe, Slam, DrawOn. Tokens in `src/tokens.shared.ts`.

Amber has two meanings depending on the beat:

- **Data beats** — amber is reserved strictly for gap-to-target. Never used for anything else.
- **Non-data beats** — amber is the accent colour, used sparingly and deliberately.

Never a third colour. No gradients. No glow except on amber.

## Architecture

The library is a set of beats — single, self-contained visual moves, each its own composition, each parametric via props. Videos are assembled in After Effects from individually rendered beats, not composed as one long Remotion piece. Every beat therefore renders standalone with a transparent background.

## Data

`scripts/sync.mjs` fetches the training ledger and writes `public/data.json`. Data-driven beats read it via `staticFile` in `calculateMetadata`. Most beats are type/motion only and use no data.

## Rules

- Every visual constant comes from a tokens file. Never hardcode a colour, size or easing curve in a component.
- Every beat takes props for its text, colours, counts, speeds and duration. No values baked in.
- Render at 60fps so downstream retiming in After Effects has real frames.
- Output ProRes 4444 with alpha, plus an H.264 preview.
- Beats are independent. One beat must never import another.
- Every beat must be fully editable from the Remotion Studio props panel. Each composition takes a Zod schema and defaultProps, and passes its component directly — never wrapped in an inline arrow function. A beat whose props can't be changed live in Studio is not finished. This applies to every beat built from now on, including the existing BarChart and PillarBurst.

## Beat library — planned

The beat library keeps its planned structure, but every beat renders in this language.

- **Type**: slam (built) · marquee (built) · typewriter (built) · path-text · stacked-offset
- **Transition**: diagonal-wipe (built) · colour-cut · zoom-through
- **Line art**: draw-on (built) · wireframe-globe · isometric-extrude
- **Asset**: cutout-reveal · tiled-pattern
- **Data**: bar-chart (built) · field-grid · progression-line · odometer
