# Phase 1 — Foundations & Tokens (Evo 50–900 + signal)

Witness: `../references/ref-07-tokens-color-ramps.png` (ramp board),
`../references/ref-01-opportunities.png`, `ref-02-reports.png` (light proof),
`gallery.html` Color tab (live 28px swatches per step).

## Primitive ramps (Tier 1, in `tokens/primitives.json` → `design-system/tokens.css` 27 lines)

| Ramp | Steps 50–900 | Example 50 → 900 | Role |
|---|---|---|---|
| Neutral light 50–900 | 10 | `#ffffff` → `#737373` (`50 #ffffff, 100 rgba(255,255,255,.88), 200 #fafafa, 300 #f5f5f5, 400 #e0e0e0, 500 #cccccc, 600 #b8b8b8, 700 #a3a3a3, 800 #8a8a8a, 900 #737373`) | surfaces, text, borders (light) |
| Neutral dark 50–900 | 10 | `#a3a3a3` → `#080808` | surfaces, text (dark) |
| Sapphire UI 50–900, base `#218aea` | 10 | `#f5f9ff` → `#011020` (`50 #f5f9ff, 100 #ebf5fe, 200 #c1e0fd, 300 #7cbefb, 400 #218aea, 500 #1666af, 600 #0b4377, 700 #032443, 800 #021a30, 900 #011020`) | SOLE action hue |
| Sapphire gamification 50–900 | 10 | same as UI (distinct keys) | achievement surfaces only (never chrome) |
| Citrine 50–900 (`#fff8e6`→`#1a1100`) | 10 | `50 #fff8e6, 100 #fff1d6, 200 #ffe0a3, 300 #ffc752, 400 #ffb01e, 500 #9d6a00, 600 #704a00, 700 #452c00, 800 #2e1e00, 900 #1a1100` | Topaz gem category |
| Red Beryl 50–900 (`#fff0f4`→`#0f0005`) | 10 | `50 #fff0f4, 100 #ffe2eb … 700 #330010, 800 #1f000a, 900 #0f0005` | Ruby gem category |
| Amethyst 50–900 (`#fcf5ff`→`#0f001f`) | 10 | `50 #fcf5ff, 100 #f7eeff … 700 #27004d, 800 #190033, 900 #0f001f` | goal bars, Amethyst gem |
| Orange / Red / Green 50–900 | 10 | `orange 50 #fef0e6 … 700 #ab4e08, 800 #8a3d06, 900 #6b2f05` / `red 50 #ffebeb … 900 #5c0000` / `green 50 #f2fff3 … 900 #06360a` | messaging (status pills, deltas) |
| Ink / Dim / White / Black | 1 | `#222222` / `#737373` / `#ffffff` / `#000000` | housed primitives |

Aliases: `aliases-gray` (`--primitive-gray-50→900` → neutral), `aliases-sapphire` (`--primitive-sapphire-50→900` → sapphire-ui 50–900), `aliases-gem` (`topaz-*`→citrine, `ruby-*`→red-beryl, `amethyst-*`). Signal swap-slot: `--signal var(--primitive-sapphire-ui-500)` + `--signal-amber var(--primitive-citrine-500)` + `--signal-teal var(--primitive-green-500)` (Tier 1) — repointing `--signal` re-themes without rename.

## Audit gaps (fixed, locked 2026-09-16, re-locked 2026-09-16 polish)

1. ~~`--text-primary: #222222` and `--text-dim: #737373` raw hex~~ → housed as `--primitive-ink` / `--primitive-dim`; Tier 2 now consumes via `var()`. Zero raw hex outside `tokens.css` (`grep -rn # | grep -v tokens.css` 0).
2. `rgba()` washes (`--bg-surface-glass`, `--border-medium/thick`, shadows) live in `tokens.css`, which is correct — raw color is only forbidden *outside* it. No action.
3. ~~`DESIGN.md` front-matter at 400/700 steps~~ → now full 50–900 per ramp (`sapphire-50→900`, `citrine-50→900`, etc.) + `signal` / `signal-amber` / `signal-teal`; `DESIGN.md` `components` reference `{colors.signal}` not raw hex. Full detail stays in `tokens.css` too.
4. ~~Semantic `--color-accent-brand:var(--primitive-sapphire-300)`~~ → now `var(--signal)` via Tier 1 swap-slot; `semantic-light/dark.json` both `brand:var(--signal)`. Gallery `Color` tab demonstrates live swap `default #1666af → amber #9d6a00 → teal #12a11b` via `document.documentElement.style.setProperty('--signal', ...)`.

## Semantic (Tier 2) + themes

Light-first: `--bg-primary var(--primitive-neutral-light-200) #fafafa`, cards `#fff`, text `primary var(--primitive-ink) #222`, `secondary var(--primitive-gray-700) #525252`, `muted var(--primitive-gray-300) #a3a3a3` stepping down neutral. Dark is secondary wrapper (same roles, inverted steps: `bg-primary var(--primitive-gray-900) #141414`, `text-primary var(--primitive-gray-white)`). Accent roles: `--color-accent-brand var(--signal)` (default sapphire 500), `-success var(--primitive-green-300) #18d824`, `-warning var(--primitive-orange-400) #f57f26`, `-error var(--primitive-red-400) #ff1f1f`. `forced-colors:active` → `CanvasText` for borders/text; `themes/dark.json` + `themes/high-contrast.json` are review gates (ref-11 dark cards).

## Guardrails

- Single-source: every value consumed via `var(--token)`; nothing raw outside `tokens.css` (lint 0 leaks). Spacing/radius/shadow/motion/icon/z/opacity also single-source.
- Gem hues never leak into UI chrome; Sapphire never decorates — it acts. Swap via `--signal` repoint, not rename.
- `npm run build` byte-identical (`primitives.json` + `semantic-light/dark` + `motion.json` → `tokens.css`); `npx -y @google/design.md lint DESIGN.md` 0 errors (1 AA-large 4.14 exempt `goal-bar`), `npm test` green.
- Gallery is proof: `gallery.html` Color tab renders 10 swatches per ramp `background:var(--primitive-*-50…900)` + signal chips toggle live + hex via `getComputedStyle`.
