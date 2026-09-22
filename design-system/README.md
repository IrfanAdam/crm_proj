# CRM Design System — Chapters 1–5

One order every layer follows. Doc → gallery tab → spec section.

| # | Chapter | Doc | Gallery tabs |
|---|---|---|---|
| 1 | Language | `design-system/docs/visual-language.md` (spec source; rendered in-gallery) | Language |
| 2 | Foundations | `design-system/docs/phase-1-foundations-tokens.md` + `design-system/tokens.css` | Color · Typography · Spacing · Radius · Shadow · Motion · Iconography |
| 3 | Components | `design-system/docs/phase-3-components.md` | Actions · Identity · Form (`text`) · Choice · Navigation (`nav`) · Overlays · Data · Cards |
| 4 | Patterns + Pages | `design-system/docs/phase-4-patterns.md` + `design-system/docs/phase-2-hierarchy-layout.md` | Operate · Monitor · Reports |
| 5 | Audit | `design-system/docs/phase-5-motion-gamification.md` (quarantine + gates) | Motion · Gems |

- `DESIGN.md` (repo root): machine-readable spec — lint with
  `npx -y @google/design.md lint DESIGN.md`.
- `design-system/tokens.css`: single-source token space (Tier 1→2→3).
- `design-system/references/` + `REGISTRY.md`: append-only intake + polish loop.
- `.hermes/plans/2026-09-23_002500-design-system-consolidation.md`: ground-up build plan.
- `design-system/docs/visual-language.md`: Chapter 1 — principles, registers, roles, composition law (2026-09-22, extended Phase 1).
