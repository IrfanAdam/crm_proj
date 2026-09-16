# Phase 4 — Patterns & System Logic

Witnesses: `../references/ref-04-explainer-funnel-3d.png`,
`ref-05-explainer-funnel-tf.png`, `ref-06-reports-list-states.png`.

## Funnel interaction states (7, in order — locked 2026-09-16)

Initial Load → Scroll Down (elastic: `var(--transition-spring)` top down,
bottom up) → Top selection → Middle → Bottom → Closed→Retained. Rule:
selecting a segment auto-scrolls to it (`--transition-normal`) AND expands
that stage's metric card (`Top/Middle/Bottom of your Funnel` with progress bar
`--radius-full`, counts, CSAT/NPS, quota rows). Funnel body is layered
translucent Sapphire shells (`--primitive-sapphire-ui-300` wash over
`--primitive-sapphire-ui-400` core, `--bg-surface-glass` card shell).

## Transient vs temporal (doctrine — locked 2026-09-16)

- **Activities are transient** (row yanks / dots — density, no values). **Goals are temporal** (bars carry end-state value). **Funnel is transient by default, with temporal trends.**
- Timeline slider (`Y / Q / M / W / D / As of Now` — `--radius-full` pill row) highlights value at the selected point; each bar = end-of-timeframe value; timeframe sliding *reshapes* the funnel (`--transition-normal`). Current funnel vs TF-analysis are distinct modes; never blend their metric cards.

## Reports list-patterns (locked 2026-09-16)

- **Blob:** activity dots (`--primitive-neutral-dark-300` on `--bg-primary`) across Day (12a–8p ticks) / Week / Month / Quarter / Year grids — density shows presence, never values.
- **Goals:** dark pill bars (`--primitive-neutral-dark-700` on white → `goal-bar-gem` 700 step for body text) with `72%`-style right values; quarter/year stack with `1.3x` gem markers (`--primitive-amethyst-700`).
- **List-pattern states:** Business / Performance / Productivity chips (`--radius-full`, `--bg-surface`, `--border-thin`), all combinations; page-level Activities ⇄ Goals switch re-skins rows (`--transition-fast`), not layout.

## Guardrails

- Behavior is spec, not polish: any new funnel/report surface implements the
  7 states and the transient/temporal split before visual styling.
- Counts stay live-computed (`10234`-style), never hard-coded copy.
