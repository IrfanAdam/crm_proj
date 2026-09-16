**Goal:** Grow the locked CRM foundation (Phases 1–5) into a full mobile-frame prototype of an industry-level design system — versioned tokens, complete component library, patterns, motion, gallery docs, a11y gates — built in framework-agnostic HTML/CSS/JS so a framework binding can come later, without breaking any locked decision.

**Architecture:** Current plan stays the background guardrail (frozen Phases 1–5 + `DESIGN.md` alpha + three-tier `tokens.css` + references registry). New work is additive layers on top: DTCG token source → build-generated CSS → vanilla markup + scoped CSS + small behavior scripts per component → **desktop DS gallery** that **hosts mobile-frame prototypes** (390px device frame, 44px tap target) → prototype gallery docs → release-ready handoff. No locked MD is edited except via a registry-row polish pass.

**Tech Stack:** Desktop DS gallery + mobile-frame prototypes (390px, framework-agnostic — framework decision deferred by owner), W3C DTCG token JSON + Style Dictionary build (CSS vars output), ARIA-correct vanilla markup, `npx @google/design.md` spec lint, axe a11y gates.

**Tags:** Design System, Component, Tooling

---

## 0. Background guardrail — what is locked (not a phase, no tasks)

The current plan `.hermes/plans/2026-09-16_180000-crm-design-system.md` Phases 1–5 is **frozen context**:

- **P1 tokens:** three-tier ramps (Sapphire UI vs Sapphire gamification kept distinct), ink/dim primitives housed, zero raw hex, `design.md lint` green.
- **P2 shell:** title+avatar → KPI → hero → delta → chips → cards → 5-item tab; Inter-only scale; 4px grid; hairlines not shadows; raw-px breakpoints.
- **P3 components:** chips, status pills (incl. `status-pill-new`), goal bars, opportunity/funnel/profile cards, bottom tab, map prospect pill — each with a reference witness.
- **P4 logic:** 7 funnel states (segment select always expands metric card), transient (Activities/Funnel) vs temporal (Goals) doctrine, blob-vs-Goals report matrices.
- **P5 ceremony:** elastic/tilt motion, single-Spline-gem hue-rotate API, Rock Solid Goals copy, mood quarantined to brand surfaces only.
- **Standing laws:** `AGENTS.md` §1–5 — 100 lines/file, no raw color outside `tokens.css`, concise reports, bidirectional plan traceability (`ds-track`, `plan:names`, one `[plan:file#anchor]` trailer per DS commit, `*Shipped in <sha>*` closers, never re-propose `✗ cancelled`).

Anything below that contradicts the above loses. Gaps the new plan must close: no `src/` or `package.json` yet, `tokens.css` hand-edited, no dark/high-contrast themes, ~15 components vs the ~40+ a publishable system needs, no docs site, no package/versioning story.

**Framework: deferred by owner.** This is a mobile-frame prototype — every component task below produces vanilla markup + scoped CSS + small behavior scripts demoed in a mobile frame (extending the existing `preview.html` approach). No React, no Web Components, no Storybook, no npm packaging until the owner picks a framework; a later binding phase will port the proven markup/states to it.

> **Course correction 2026-09-16 — DS vs prototype format:** DS gallery/docs stay **desktop** (full-width page, nav, code props). Every component/pattern below is **prototyped only inside a 390px mobile frame** (device chrome, safe-area, 44px min tap) to match the final mobile app. No component is designed as desktop UI. This clarifies the earlier “mobile-frame prototype” wording — the frame is the prototype, not the DS chrome. Phase 7 was corrected to a desktop wrapper + mobile frame with dark proof before Phase 8.

---

## Phase 6 — Token pipeline hardening {#phase-6}

*Tags: Design System, Tooling*

*Shipped in 31f35d7 · Tasks 15–17 · phase-6.*

### Task 15: DTCG token source + generated CSS ✓ done

**Objective:** Replace hand-edited `tokens.css` with a build artifact nobody hand-touches.
**Files:** Create `tokens/*.json` (DTCG), `scripts/build-tokens.mjs`, `package.json` (Style Dictionary, `lint:tokens`, `build`); Modify `design-system/tokens.css` (becomes generated, split to ≤100 lines/file).
**Verify:** `npm run build` regenerates CSS byte-identical to committed; `lint:tokens` zero raw hex outside generated file.

### Task 16: Dark + high-contrast themes, contrast gates ✓ done

**Objective:** Tier-2 roles resolve in light (default), dark wrapper (ref-11 proof), and forced-contrast; AA gates in CI.
**Files:** Create `tokens/themes/*.json`, `tests/contrast.test.mjs`.
**Verify:** contrast tests pass (P1's goal-bar 4.14:1 large/bold-only exemption re-attested, everything else ≥4.5:1 body); dark preview renders all P3 cards.

### Task 17: New-plan traceability wiring ✓ done

**Objective:** This plan file becomes `ds-track`-clean before any component work.
**Files:** Create `src/ds/changelog-names.json` entries (this plan's phases); Modify `.hermes/plan-links.json` if mapping pre-trailer history.
**Verify:** `npm run plan:names` 0 missing; `npm run ds:track` tagged == phased, 1 wip expected, `cont 20260909_145218_9888b1`.

---

## Phase 7 — Actions & identity atoms {#phase-7}

*Tags: Component*

*Shipped in 4e83670 · Tasks 18–19 · phase-7.*

### Task 18: Button family + link + icon-button ✓ done

**Objective:** `button-primary` plus secondary/ghost/destructive, 3 sizes, loading/disabled, focus-visible ring; Sapphire-action law enforced by token reference.
**Files:** Create `src/components/Button/*` (markup, styles ≤100 lines, behavior, mobile-frame demo).
**Verify:** axe clean, keyboard operable, frame demo shows all states.

### Task 19: Chips, badges, status pills, avatar, icon set ✓ done

**Objective:** Filter chips, count badges, full status-pill set (P3 witnesses), avatar + overlap stack, single-stroke icon library.
**Files:** Create `src/components/{Chip,Badge,StatusPill,Avatar,Icon}/*`.
**Verify:** P1–P3 witnesses re-render pixel-equivalent from new atoms; `lint:tokens` green.

---

## Phase 8 — Form controls {#phase-8}

*Tags: Component*

*Shipped in c8ece19 · Tasks 20–21 · phase-8.*

### Task 20: Text inputs, select, search, textarea ✓ done

**Objective:** Label/help/error anatomy, prefix/suffix slots, full-pill vs rounded variants per P2 shape law.
**Files:** Create `src/components/{TextInput,Select,Search,Textarea}/*`.
**Verify:** Screen-reader label association tests; error + disabled + focus stories.

### Task 21: Checkbox, radio, switch, slider ✓ done

**Objective:** Boolean/choice controls sharing one focus-ring + motion token; timeline slider bars (P4) built on slider atom.
**Files:** Create `src/components/{Checkbox,Radio,Switch,Slider}/*`.
**Verify:** `prefers-reduced-motion` disables animation; axe form rules pass.

---

## Phase 9 — Navigation & overlays {#phase-9}

*Tags: Component, Layout*

*Shipped in pending · Tasks 22–23 · phase-9.*

### Task 22: Tabs, breadcrumbs, pagination, accordion, bottom-tab ✓ done

**Objective:** P3 bottom-tab (5 glyphs, single dot) rebuilt as a configured `TabBar`; generic tabs/breadcrumbs/pagination/accordion for reports depth.
**Files:** Create `src/components/{Tabs,Breadcrumbs,Pagination,Accordion,TabBar}/*`.
**Verify:** Roving-tabindex keyboard nav tests; ref-01 shell assembles from atoms.

### Task 23: Modal, drawer, popover, tooltip, menu, toast ✓ done

**Objective:** One overlay behavior module (focus trap, escape, layering) serving all six; achievement modal (P5) becomes a `Modal` consumer.
**Files:** Create `src/components/overlays/*` + shared overlay behavior script.
**Verify:** Focus-trap + return-focus tests; no overlay ships without an accessible name.

---

## Phase 10 — Data display {#phase-10}

*Tags: Component*

### Task 24: Table, list rows, KPI stat, timeline

**Objective:** Sortable table, opportunity/contact rows, KPI strip stat (`4/32 closed +2%`), activity timeline dots (blob reports).
**Files:** Create `src/components/{Table,ListRow,KpiStat,Timeline}/*`.
**Verify:** Table keyboard sort + `aria-sort`; KPI matches ref-01 values from markup attributes alone.

### Task 25: Card family + data-viz atoms

**Objective:** Opportunity/funnel/profile cards (P3 anatomy) as composed components; funnel glyph, goal bar (+`1.4x` gem variant), bar/sparkline with gem-hue-only fills.
**Files:** Create `src/components/{OpportunityCard,FunnelCard,ProfileCard,GoalBar,FunnelGlyph,Sparkline}/*`.
**Verify:** Ref-01/02/03 screens render from these with zero one-off CSS.

---

## Phase 11 — Screen patterns & data logic {#phase-11}

*Tags: Design System, Layout*

### Task 26: Operate/Monitor templates + funnel state machine

**Objective:** Screen template enforcing P2 order law; P4's 7 funnel states as a coded state machine (segment select → card expand guaranteed by construction).
**Files:** Create `src/patterns/{OperateScreen,MonitorScreen}/*`, `src/logic/funnel-machine.*`.
**Verify:** State-machine unit tests cover all 7 states; template rejects out-of-order sections in dev warning.

### Task 27: Transient/temporal hooks + reports matrices

**Objective:** `transient`/`temporal` data modules encoding P4 doctrine; blob-vs-Goals Day→Year matrices as a configured `ReportsMatrix` demo.
**Files:** Create `src/logic/{transient,temporal}.*`, `src/patterns/ReportsMatrix/*`.
**Verify:** Timeline slider (Y/Q/M/W/D + As of Now) reshapes funnel in frame demo; ref-06 matrices reproducible.

---

## Phase 12 — Motion & gamification {#phase-12}

*Tags: Motion*

### Task 28: Motion tokens + elastic/tilt primitives

**Objective:** Duration/easing/spring scale in tokens; `ElasticScroll` + `TiltCard` (ref-09) honoring `prefers-reduced-motion`.
**Files:** Create `tokens/motion.json`, `src/motion/*`.
**Verify:** Reduced-motion demo shows instant states; motion values come only from tokens.

### Task 29: Gem reward component + ceremony copy

**Objective:** Single-Spline-iframe `GemReward` with `category` → hue-rotate API (guardrails §4), capsule stand, Rock Solid Goals copy slots; mood quarantine re-attested (never inside Operate/Monitor).
**Files:** Create `src/components/GemReward/*`.
**Verify:** All 4 categories render from one embed URL; P5 spec MD updated via registry row if visuals change.

---

## Phase 13 — Docs, a11y audit, handoff {#phase-13}

*Tags: Design System, Tooling*

### Task 30: Gallery docs + per-component contract

**Objective:** Prototype gallery (mobile-frame demo pages extending the `preview.html` approach) with usage, do/don't, witness ref, and a11y notes for every component; changelog Miller columns resolve per phase.
**Files:** Create `prototype/gallery/*` per-component frame demos + `*.md` contract docs.
**Verify:** Every component has frame demo + contract; token lint + build green.

### Task 31: Full a11y + responsive audit

**Objective:** WCAG 2.2 AA pass: keyboard map, focus order, names/roles, color-independence (status never color-alone), 360px→desktop raw-px breakpoints.
**Files:** Create `tests/a11y/*`, `docs/a11y-statement.md`.
**Verify:** axe suite 0 violations; manual keyboard walkthrough logged per template.

### Task 32: Version + release-ready handoff

**Objective:** `DESIGN.md` alpha→beta bump + re-lint; release handoff bundle (tokens artifact, gallery, semver-style changelog, migration notes, Figma parity checklist, contribution + registry governance docs). npm/framework packaging explicitly out of scope until the framework is chosen.
**Files:** Modify `DESIGN.md`; Create `CHANGELOG.md`, `CONTRIBUTING.md`, `docs/figma-parity.md`.
**Verify:** `design.md lint` zero errors; handoff opens cleanly standalone; `ds-track` + changelog show the full arc; each phase closed `*Shipped in <sha> · Tasks a–b · phase-N.*`.

---

## Risks & tradeoffs

- **No `src/`/`package.json` today:** Phases 6–7 scaffold the repo; nothing renders until then — docs-only until scaffolding lands.
- **Framework deferred:** prototype stays vanilla HTML/CSS/JS in a mobile frame, so a later framework choice costs a binding port, not a rethink — tokens, anatomy, states, and gallery demos carry over unchanged.
- **Spline embed:** single-URL + CSS filter keeps bundle light but couples ceremony to a third-party host; ship a static-SVG fallback per gem category.
- **Scope discipline:** ~32 tasks across 8 phases; ship phase-by-phase with `Shipped in` closers — do not batch phases into mega-commits (traceability SOP forbids it).
