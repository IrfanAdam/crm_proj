# Phase 3 — Components

Witnesses: `../references/ref-01-opportunities.png`, `ref-02-reports.png`,
`ref-03-funnel-detail.png`, `ref-06-reports-list-states.png`, `ref-11-mood-bubble-cards.png`.

## Chips, pills, bars

- **Filter chips:** pill, neutral fill, ink text; count badges and red flame
  for hot filters; active = ink outline. (`Value range`, `Stages`, `Economic 4`.)
- **Status pills:** solid fill + white text, never outline — `ACCEPTED` green,
  `IN PROGRESS` / `REVIEW` Sapphire, `NEW` dark.
- **Goal bars:** full-pill Amethyst fill; label (`23 Wed`) left, value (`72%`)
  right, white; gem variant shows multiplier (`1.4x ◇`).
  Accessibility triage: white on Amethyst-400 is 4.14:1 — passes AA-large
  (≥3:1) for the large/bold bar values; body-size text on Amethyst must use
  the 700 step (`goal-bar-gem`).
- **Timeline slider bars:** mini pill-bars, selected value Sapphire, diamond
  marker on peaked bars.

## Cards

- **Opportunity card:** org logo → org name 20/bold → product muted → stage
  row (blue stage + `73% chance` red-beryl + `Rs 3.2L` Sapphire) → 5-seg
  progress (2 filled) → contacts (`Ursula + 3 others`, `Last transcript`) →
  `last contact 2d` / `23km away` amber → mail / calendar / phone actions.
- **Funnel summary card:** funnel glyph + `Your funnel` + `Last Refreshed` +
  `3 Pipelines · 2 Demographies` + metric strip
  (`CR 32% · RR 34% | CSAT 34% · NPS 34%` — blues left of rule, red-beryl right).
- **Profile card (Olivia Jein pattern):** avatar + role tag, score / projects /
  return trio, skill rows with green checks; dark variant inverts surface only.

## Navigation + map

- **Bottom tab:** 5 glyphs, single active dot below, no labels; active state is
  position-only, never color-fill.
- **Map prospect module:** light map, clustered count badges (1, 2),
  centered `3 prospects nearby →` pill, Sapphire recenter control.

## Guardrails

- One high-emphasis tappable per row. Pills never repurposed as buttons.
- Accent budget: Sapphire acts, red-beryl warns/scores, Amethyst fills goals.
