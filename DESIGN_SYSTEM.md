# DESIGN_SYSTEM.md — ALPHA CRM (persistent source of truth)

**This file is law.** Every screen/feature/flow/prototype must first inspect the existing DS and product code and obey `Reuse → Compose → Extend → Create`. Treat it as an active architectural constraint, not passive docs.

## Source of truth

- **Tokens (single-source):** `tokens/primitives.json` (10-step 50–900 + `signal` swap-slot) + `tokens/motion.json` → generated `design-system/tokens.css` (27 lines) → `tokens/semantic-light/dark.json` (`--color-accent-brand:var(--signal)`). Never hand-edit `tokens.css` (`npm run build`).
- **Spec:** `DESIGN.md` (Google design.md, 56 colors 50–900 + signal, 5 type scales, 16 components, `npx -y @google/design.md lint` 0 errors).
- **Foundations:** Inter only (xs 12→3xl 32, 400/500/600/700, leading 1.15→1.5, tracking -0.01/.04), 4px grid (`spacing 0→16`), radius `none→3xl/full` (chips/bars `full`, cards `lg→2xl`), hairline borders + `shadow sm/md/lg` (hairline carries UI, shadow only for depth), `z base→toast`, `opacity`, `motion` (xs 100→xl 600, standard/spring/elastic, `prefers-reduced-motion`).
- **Components:** `src/components/{Button,Chip,Badge,StatusPill,Avatar,Icon,TextInput,Select,Search,Textarea,Checkbox,Radio,Switch,Slider,Tabs,Breadcrumbs,Pagination,Accordion,TabBar,Overlay,Table,ListRow,KpiStat,Timeline,OpportunityCard,FunnelCard,ProfileCard,GoalBar,FunnelGlyph,Sparkline}` — each `var(--token)` only, ≤100 lines, 44px tap, `var(--focus-ring)` 2px sapphire. `Icon` is Phosphor `@phosphor-icons/react` regular (1.5px) via `Icon.jsx` + CDN `ph` for static `gallery.html`; 5 dock icons `House/ChartBar/Users/Handshake/Buildings` icon-only (aria-label, no visible label).
- **Patterns/Layouts:** `src/patterns/{OperateScreen,MonitorScreen,ReportsMatrix}` + `src/logic/funnel-machine.js` (7 states initial→elastic→top→middle→bottom→closed→retained) + `transient.js`/`temporal.js` (Activities transient, Goals temporal, blob vs Goals D/W/M/Q/Y). Layout law: title(32/bold)+avatar → KPI `4/32` → hero → delta `+32` → chips → cards → 5-item tab.
- **Gallery (proof):** `gallery.html` 88 lines desktop DS hosting 390px frames (Color 10×28px swatches `var(--primitive-*-50→900)` + `signal` live, Typography/Spacing/Radius/Shadow/Motion/Iconography + 8 component groups + 3 patterns + Motion/Gems), `prototype/gallery/*.md` contracts (usage·anatomy·do/don’t·witness·a11y·tokens).
- **States/Conventions:** Sapphire `#1666af` sole action (via `--signal`), gems never chrome; status pills solid fill + label (never color-alone); hairline elevation; one Spline gem → hue-rotate per category; `forced-colors:active` → `CanvasText`.
- **Visual language:** `design-system/docs/visual-language.md` (2026-09-22) — paper carries the work, glass carries chrome, ceremony carries reward. It defines five rejectable principles, registers with witnesses (ref-01–12), Operate composition order (title → KPI → hero → delta → chips → cards → dock), product vs ceremony voice, and supersessions (3-tab glass dock; glass on chrome only). Screens compose via roles; do not re-introduce a decorative hue hierarchy or card shadow for in-flow UI.

## Implementation hierarchy (obey in order)

1. **Reuse** — If a component/pattern/token/foundation exists, use it. Do not recreate a visually similar component under a different name.
2. **Compose** — If exact UI doesn’t exist, compose from DS primitives first. Prefer composition over new components.
3. **Extend** — If not expressible via existing system, extend using its foundations/conventions. Make it reusable/configurable, not one-screen.
4. **Create** — Only when a demonstrated product requirement cannot be handled via Reuse/Compose/Extend, create a genuinely new component/pattern. Avoid one-offs and magic values.

## Self-improving system

When a reusable pattern emerges:
1. Identify the abstraction.
2. Build it with existing foundations.
3. Add it to the DS (`src/components/*` or `src/patterns/*` + `gallery.html` panel + `prototype/gallery/*.md` contract).
4. Refactor current implementation to use it.
5. Use it for future flows.
If the same solution appears in 2+ places, promote it. Don’t over-abstract for hypotheticals.

## No arbitrary decisions

Use tokens for typography/spacing/colors/sizing/radii/borders/shadows/icons/states/layout/behavior. No magic values when a token exists. If a new decision is needed, make it consistent and update the system.

## Prototype philosophy

High-fidelity prototyping — mocked data/backends allowed, but UI architecture stays reusable and DS-driven. Prototype ≠ disposable UI.

## Before every UI build

Ask: Does this exist? Can I compose it? Is there a similar implementation? Is this a new reusable pattern? If new, should it enter the DS? Inspect `src/components/*`, `src/patterns/*`, `gallery.html`, `DESIGN.md`, `tokens/*.json`.

## After every UI build

Check: uses existing components/tokens, no duplication, no one-off styling, promotes genuine reusables back into DS. Verify `npm test` (lint + contrast + plan:names + ds-track) green, `grep -rn # | grep -v tokens.css` 0 leaks, `var(--token)` only, 44px tap, `focus-visible`, `prefers-reduced-motion`, axe 0 violations.

## Governance

New refs → `design-system/references/ref-NN-slug.png` + `REGISTRY.md` row → dated polish pass on affected `docs/phase-N-*.md` + `DESIGN.md` (`npx lint`) → commit with `[plan:<file>#anchor]` + `Shipped in <sha>`. Every flow should make the DS more capable, not more fragmented.
