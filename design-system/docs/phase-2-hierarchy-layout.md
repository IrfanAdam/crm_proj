# Phase 2 — Hierarchy & Layout

Witnesses: `../references/ref-01-opportunities.png`, `ref-02-reports.png`,
`ref-03-funnel-detail.png`, `ref-09-funnel-tilt.png`.

## Screen hierarchy (law, in order)

1. Page title 32/bold left + avatar right (avatar carries a presence dot).
2. KPI strip centered (`4/32 closed +2%` — value ink, delta purple).
3. Hero visual: bar chart (Opportunities), map (prospects), or 3D funnel.
4. Delta line (`↑ +32 than yesterday | last updated 4:35pm today`).
5. Filter chips row (horizontal scroll; active chip gets ink outline).
6. Content cards (white, 16–24px radius, hairline).
7. Bottom tab bar: 5 glyphs, one active dot, no labels.

## Surfaces (claude-design commitment)

- **Operate** (Opportunities, prospects): user acts on things — action
  affordances and selection state dominate. No hero marketing framing.
- **Monitor** (Funnel, Reports): user watches state change — density and
  glanceable KPI strips, no centered hero + feature cards.

## Scales (locked to `tokens.css`, 2026-09-16)

- Type (Inter only): 32 title (`--font-size-3xl`) / 20 card title
  (`--font-size-xl`) / 16 body (`--font-size-md`) / 14 meta
  (`--font-size-sm`) / 12 micro (`--font-size-xs`). `--font-size-lg`
  (18) and `--font-size-2xl` (24) are reserved, not hierarchy steps.
- Spacing: 4px base grid; card padding 16 (`--spacing-4`); section
  rhythm 24–32 (`--spacing-6`–`--spacing-8`).
- Radii: cards 16–24 (`--radius-lg/xl/2xl`), chips/bars/tabs
  full-pill (`--radius-full`).
- Elevation: hairline border + surface step. No card shadows
  (`--shadow-*` reserved for funnel/gem depth only).

## Guardrails

- A screen missing any of steps 1–7 (or reordering them) needs a written note.
- Muted text steps down the neutral ramp — never a decorative hue.
- `@media` breakpoints keep raw px (tokens invalid there). Mapping:
  ≤767px base → card padding 16 / section 24 / radius 16;
  ≥768px → section 32 / radius 20–24. Card padding stays 16.
