# Phase 4 — Patterns & System Logic

Witnesses: `../references/ref-04-explainer-funnel-3d.png`,
`ref-05-explainer-funnel-tf.png`, `ref-06-reports-list-states.png`.

## Funnel interaction states (7, in order)

Initial Load → Scroll Down (elastic: top down, bottom up) → Top selection →
Middle → Bottom → Closed→Retained. Rule: selecting a segment auto-scrolls to
it AND expands that stage's metric card (`Top/Middle/Bottom of your Funnel`
with progress bar, counts, CSAT/NPS, quota rows). Funnel body is layered
translucent Sapphire shells over a solid core.

## Transient vs temporal (doctrine)

- **Activities are transient.** **Goals are temporal.**
- **Funnel is transient by default, with temporal trends.**
- Timeline slider (`Y / Q / M / W / D / As of Now`) highlights value at the
  selected point; each bar = end-of-timeframe value; timeframe sliding
  *reshapes* the funnel. Current funnel vs TF-analysis are distinct modes.

## Reports list-patterns

- **Blob:** activity dots across Day (12a–8p ticks) / Week / Month / Quarter /
  Year grids — density shows presence, never values.
- **Goals:** black pill bars with `72%`-style right values; quarter/year stack
  with `1.3x` gem markers.
- **List-pattern states:** Business / Performance / Productivity chips, all
  combinations; page-level Activities ⇄ Goals switch re-skins rows, not layout.

## Guardrails

- Behavior is spec, not polish: any new funnel/report surface implements the
  7 states and the transient/temporal split before visual styling.
- Counts stay live-computed (`10234`-style), never hard-coded copy.
