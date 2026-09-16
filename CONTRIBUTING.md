# Contributing — ALPHA CRM DS

**Source of truth:** `tokens/*.json` (DTCG) → generated `design-system/tokens.css` via `npm run build`. Never hand-edit `tokens.css`.

**Phases:** Tracked in `.hermes/plans/*.md` with `Shipped in <sha> · Tasks a–b · phase-N.` + `design-system/changelog-manifest.json` via `npm run ds:track` (cont `20260909_145218_9888b1`).

**Governance (living-system loop):**
1. Drop new ref into `design-system/references/` as `ref-NN-slug.*`
2. Log in `design-system/references/REGISTRY.md` (subject, phases touched, supersedes?)
3. Open dated polish pass against affected phase MD + `DESIGN.md` (bump version, `npx -y @google/design.md lint`, contrast gate).

**Conventions:**
- Components: `src/components/{Name}/*.css` ≤100 lines, `var(--token)` only (lint:tokens 0 leaks), 44px tap, focus ring `var(--focus-ring)`, `prefers-reduced-motion` disables.
- Gallery: `gallery.html` ≤100 lines (desktop DS, full-width `wrap`, left `tabs` with `FOUNDATIONS/COMPONENTS/PATTERNS/MOTION` headings, `data-tab`↔`data-panel`), `gallery.css` layout only. Prototype stays vanilla HTML/CSS/JS in frame; framework deferred — tokens + anatomy carry over.
- Gates: `npm run build`, `npm run lint:tokens`, `node tests/contrast.test.mjs`, `node tests/a11y/audit.test.mjs`, `npx -y @google/design.md lint DESIGN.md` (pip 0 errors), `npm run ds:track`.

**Release:** Bump `DESIGN.md` version (alpha→beta→1.0), update `CHANGELOG.md`, verify `ds-track` + Miller columns, commit with `[plan:<file>#anchor]`.
