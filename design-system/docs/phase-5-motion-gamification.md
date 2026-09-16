# Phase 5 — Motion, Gamification & Mood

Witnesses: `../references/ref-08-mood-rock-solid-goals.png`,
`ref-09-funnel-tilt.png`, `ref-10-mood-blobs.png`,
`ref-11-mood-bubble-cards.png`, `ref-12-mood-alpha-poster.png`.

## Motion posture (locked 2026-09-16)

Subtle and state-clarifying, never decorative: elastic funnel settle on scroll
(`--transition-spring` 400ms), timeline scrub reshaping the funnel live
(`--transition-normal` 250ms), tilt-depth on funnel detail cards (ref-09).
Row re-skin uses `--transition-fast` 150ms. Honor `prefers-reduced-motion`
(static end-state, no elastic loop) — motion explains state; nothing loops
without purpose.

## 3D rewards (existing build — keep, locked 2026-09-16)

Single Spline gem + capsule stand, recolored per category via CSS
`filter: hue-rotate()` (guardrails §4 → `--primitive-citrine-400`,
`--primitive-red-beryl-400`, `--primitive-amethyst-400`,
`--primitive-sapphire-ui-400`; one asset, three filters — never four models).
Ceremony copy pattern: `Rock Solid Goals` / `+Rs 4lakh / Closed Beyond Your
Target / on 23rd Oct` (ref-08). Gems never appear in Operate/Monitor chrome;
reward surfaces use `--radius-xl/2xl` + `24px` pad (`gem-reward-*` in `DESIGN.md`).

## Mood direction (brand surfaces only — locked 2026-09-16)

- Frosted-glass orbs + pink/purple/blue gradient spheres (`--bg-surface-glass`,
  `--shadow-lg`, blur) with editorial voice (`Bubble. Doesn't have the mind
  borders / Stand Out / Break Layout` — ref-10).
- Iridescent-cube brand surface; ALPHA voice
  (`Only CRM stack you need / data in here don't lie` — ref-12, poster).
- Constraint: this decoration lives in brand, onboarding, and ceremony
  surfaces — never inside Operate/Monitor screens, which stay flat and quiet
  (hairline `--border-thin` + `--bg-surface`, no gradients/shadows).

## Guardrails

- Motion explains state; nothing loops without purpose.
- One gem asset, four filters — never four models.
- New mood refs enter via `../references/REGISTRY.md` intake, not direct edits.
