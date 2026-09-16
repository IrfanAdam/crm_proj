# Contributing — ALPHA CRM DS

**Source of truth:** `tokens/*.json` (DTCG 10-step 50–900 + `signal` swap-slot) → generated `design-system/tokens.css` (27 lines) via `npm run build`. Never hand-edit `tokens.css`.

**Phases:** Tracked in `.hermes/plans/*.md` with `Shipped in <sha> · Tasks a–b · phase-N.` + `design-system/changelog-manifest.json` via `npm run ds:track` (cont `20260909_145218_9888b1`). Current polish: `.hermes/plans/2026-09-16_203500-ds-polish.md` Phases 1–2 shipped (50–900 + signal + parity), Phase 3 Task5 done (foundations 10-step + gallery Color live).

**Governance (living-system loop):**
1. Drop new ref into `design-system/references/` as `ref-NN-slug.*`
2. Log in `design-system/references/REGISTRY.md` (subject, phases touched, supersedes?)
3. Open dated polish pass: update the affected `docs/phase-N-*.md` +
   `DESIGN.md` (bump nothing — `version: beta` stays until spec 1.0), then
   `npx -y @google/design.md lint DESIGN.md`.
4. Locked decisions change only via a new row citing the new ref.

**Conventions:**
- Tokens: 50–900 ramps via `var(--primitive-*-50→900)`, aliases `gray/sapphire/topaz/ruby`, semantic `var(--signal)` re-themes without rename (`--signal`→amber/teal via `setProperty`).
- Components: `src/components/{Name}/*.css` ≤100 lines, `var(--token)` only (lint:tokens 0 leaks), 44px tap, focus ring `var(--focus-ring)`, `prefers-reduced-motion` disables.
- Gallery: `gallery.html` 88 lines (desktop DS, full-width `wrap`, left `tabs` with `FOUNDATIONS/COMPONENTS/PATTERNS/MOTION` headings, `data-tab`↔`data-panel`), Color tab 10×28px swatches per ramp + `data-signal` chips live. `gallery.css` layout only. Prototype stays vanilla HTML/CSS/JS in frame; framework deferred — tokens + anatomy carry over.
- Gates: `npm run build`, `npm run lint:tokens`, `node tests/contrast.test.mjs`, `node tests/a11y/audit.test.mjs`, `npx -y @google/design.md lint DESIGN.md` (0 errors, 1 AA-large 4.14 + 40 orphaned warnings for full palette — expected), `npm run ds:track`.

**Release:** Bump `DESIGN.md` version (beta→1.0), update `CHANGELOG.md` (0.13.0→0.14.0 for DS polish), verify `ds-track` + Miller columns, commit with `[plan:<file>#anchor]`.
