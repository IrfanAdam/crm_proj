# Changelog — ALPHA CRM DS (semver)

## [0.14.0] — 2026-09-16 (DS polish — Evo 50–900 + signal + docs maturity)
### Added
- **Tokens Evo:** `tokens/primitives.json` 10-step 50–900 for all ramps (neutral light/dark, sapphire UI/gamification 50–900 + distinct keys, citrine/red-beryl/amethyst/orange/red/green 50–900), `signal` swap-slot (`--signal`/`--signal-amber`/`--signal-teal` → `--color-accent-brand:var(--signal)`), `DESIGN.md` 56 colors with `{colors.signal}`; gallery `Color` 10×28px swatches + live chips toggle.
- **Docs Evo:** `prototype/gallery/foundations.md` 10-step table + alias + live demo notes (37 lines), `design-system/docs/phase-1-*.md` 39 lines full ramp matrix + audit gap 3–4 closure, `docs/a11y-statement.md` WCAG 2.2 AA matrix (10 pairs) + keyboard map, `docs/figma-parity.md` parity with 50–900 + signal.

### Changed
- `design-system/tokens.css` 27 lines `GENERATED` (was 26), `tokens/semantic-light/dark.json` `brand:var(--signal)`, plan `.hermes/plans/2026-09-16_203500-ds-polish.md` (Tasks 1–5 done, Phase 1–2 shipped).

## [0.13.0] — 2026-09-16
### Added
- Phase 13: gallery contracts (`prototype/gallery/*.md` 12 files), a11y audit (`tests/a11y/audit.test.mjs`, `docs/a11y-statement.md` WCAG 2.2 AA), handoff (`CHANGELOG.md`, `CONTRIBUTING.md`, `docs/figma-parity.md`), `DESIGN.md` alpha→beta.

## [0.12.0] — 2026-09-16
### Added
- Phase 12: `tokens/motion.json` (duration/easing/spring), `src/motion/elastic-scroll.*`, `src/motion/tilt-card.*`, `src/components/GemReward/*` (single Spline hue-rotate 4 categories).

## [0.11.0] — 2026-09-16
### Added
- Phase 11: `src/logic/funnel-machine.js` 7-state machine + `transient.js`/`temporal.js`, `src/patterns/OperateScreen/*`, `MonitorScreen/*`, `ReportsMatrix/*`.

## [0.10.0] — 2026-09-16
### Added
- Phase 10: Table/ListRow/KpiStat/Timeline + Opportunity/Funnel/Profile cards + GoalBar/Glyph/Sparkline; gallery 76 lines.

## [0.9.0] — 2026-09-16
### Added
- Phase 9: Tabs/Breadcrumbs/Pagination/Accordion/TabBar + Overlay engine (Modal/Drawer/Popover/Tooltip/Menu/Toast).

## [0.8.0] — 2026-09-16
### Changed
- Gallery: left tabs (single scroll → tabbed panels), DS full-width, component sections full-width.

## [0.7.0] — 2026-09-16
### Added
- Phase 7: Button/Chip/Badge/StatusPill/Avatar/Icon (desktop DS hosts 390px mobile frame).

## [0.6.0] — 2026-09-16
### Added
- Phase 6: DTCG pipeline (`tokens/*.json` → `tokens.css`), `scripts/build-tokens.mjs`, gates (`lint:tokens`, `contrast`, `plan:names`, `ds:track`).

## [0.1.0–0.5.0] — foundations (Phases 1–5, guardrail plan 2026-09-16_180000)
- Phases 1–5: tokens ramps, semantic light/dark, hierarchy/layout, components, patterns, motion/gamification docs.
