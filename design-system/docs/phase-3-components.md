# Phase 3 — Components

Witnesses: `../references/ref-01-opportunities.png`, `ref-02-reports.png`,
`ref-03-funnel-detail.png`, `ref-06-reports-list-states.png`, `ref-11-mood-bubble-cards.png`.

## Chips, pills, bars (locked to `tokens.css`, 2026-09-16)

- **Filter chips:** pill (`--radius-full`), neutral fill (`--bg-surface`), ink text (`--text-primary` / `--primitive-ink`); count badges and red flame for hot; active = ink outline (`--border-accent`). (`Value range`, `Stages`, `Economic 4`.)
- **Status pills:** solid fill, never outline — `ACCEPTED` green (`--color-accent-success`) with ink text for contrast (`--primitive-ink`), `IN PROGRESS` / `REVIEW` Sapphire (`--primitive-sapphire-ui-500`) + white, `NEW` dark (`--primitive-neutral-dark-600`) + white.
- **Goal bars:** full-pill (`--radius-full`) Amethyst fill (`--primitive-amethyst-400`); label (`23 Wed`) left, value (`72%`) right, white; gem variant shows multiplier (`1.4x ◇`) on the 700 step (`--primitive-amethyst-700`).
  Accessibility triage: white on Amethyst-400 is 4.14:1 — passes AA-large (≥3:1) for the large/bold bar values; body-size text on Amethyst must use the 700 step (`goal-bar-gem`).
- **Timeline slider bars:** mini pill-bars (`--radius-full`), selected value Sapphire (`--primitive-sapphire-ui-400`), diamond marker on peaked bars.

## Cards (locked, 2026-09-16)

- **Opportunity card** (`opportunity-card` in `DESIGN.md`): white surface (`--bg-surface`), `16px` pad (`--spacing-4`), `16px` radius (`--radius-lg`), hairline (`--border-thin`); org logo → org name 20/bold (`--font-size-xl`) → product muted (`--text-muted`) → stage row (blue stage `--primitive-sapphire-ui-400` + `73% chance` red-beryl `--primitive-red-beryl-400` + `Rs 3.2L` Sapphire) → 5-seg progress (2 filled) → contacts (`Ursula + 3 others`, `Last transcript`) → `last contact 2d` (`--text-secondary`) / `23km away` warning (`--color-accent-warning`) → mail / calendar / phone actions.
- **Funnel summary card** (`funnel-card`): same shell + funnel glyph (`funnel-glyph`: `--primitive-sapphire-ui-100` / `--primitive-sapphire-ui-500`, `--radius-lg`) + `Your funnel` + `Last Refreshed` (`--text-muted`) + `3 Pipelines · 2 Demographies` + metric strip (`CR 32% · RR 34% | CSAT 34% · NPS 34%` — blues `--primitive-sapphire-ui-400` left of rule, red-beryl `--primitive-red-beryl-400` right).
- **Profile card (Olivia Jein pattern):** avatar + role tag (`--radius-full`), score / projects / return trio, skill rows with green checks (`--color-accent-success`); dark variant inverts surface only (`[data-theme="dark"] --bg-surface`).

## Navigation + map (locked, 2026-09-16)

- **Bottom tab** (`5` glyphs): single active dot below (`--primitive-ink` / `--primitive-gray-white` in dark), no labels; active state is position-only, never color-fill; pill indicator (`--radius-full`).
- **Map prospect module:** light map, clustered count badges (`1`, `2` — `--primitive-neutral-dark-600` on white), centered `3 prospects nearby →` pill (`--radius-full`, `--bg-surface`, `--text-primary`, `12px` pad), Sapphire recenter control (`--primitive-sapphire-ui-400`).

## Guardrails

- One high-emphasis tappable per row. Pills never repurposed as buttons.
- Accent budget: Sapphire acts, red-beryl warns/scores, Amethyst fills goals.
