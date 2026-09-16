# Phase 1 — Foundations & Tokens

Witness: `../references/ref-07-tokens-color-ramps.png` (ramp board),
`../references/ref-01-opportunities.png`, `ref-02-reports.png` (light proof).

## Primitive ramps (Tier 1, in `tokens.css`)

| Ramp | Steps | Role |
|---|---|---|
| Neutral light 100–700 / dark 100–700 | warm grays | every surface, text, border |
| Sapphire UI 100–700, base `#218aea` | blues | SOLE action hue |
| Sapphire gamification 100–700 | blues | achievement surfaces only |
| Citrine 100–700 (`#fff1d6`→`#452c00`) | golds | Topaz gem category |
| Red Beryl 100–700 (`#ffe2eb`→`#330010`) | pinks/reds | Ruby gem category |
| Amethyst 100–700 (`#f7eeff`→`#27004d`) | purples | goal bars, Amethyst gem |
| Orange / Red / Green 100–700 | messaging | status pills, deltas |

## Audit gaps (fix before lock)

1. `--text-primary: #222222` and `--text-dim: #737373` are raw hex with no
   primitive slot — house them (or nearest ramp step) before calling Tier 1 complete.
2. `rgba()` washes (`--bg-surface-glass`, `--border-medium/thick`, shadows)
   live in `tokens.css`, which is correct — raw color is only forbidden
   *outside* it. No action.
3. `DESIGN.md` front-matter mirrors these ramps at 400/700 steps; full 100–700
   detail stays in `tokens.css`.

## Semantic (Tier 2)

Light-first: `--bg-primary #fafafa`, cards `#fff`, text primary/secondary/muted
stepping down the neutral ramp. Dark is a secondary wrapper (same roles,
inverted steps). Accent roles: `--color-accent-brand` (Sapphire 300),
`-success` (green 300), `-warning` (orange 400), `-error` (red 400).

## Guardrails

- Single-source: every value consumed via `var(--token)`; nothing raw outside `tokens.css`.
- Gem hues never leak into UI chrome; Sapphire never decorates — it acts.
- `npx -y @google/design.md lint DESIGN.md` gates every token change.
