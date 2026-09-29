# DS Docs Experience — Readability, Navigation, Mobile Plan

**Goal:** Make `gallery.html` DS docs a genuinely pleasant place to read and browse on desktop and mobile, without changing token/component content.

**Architecture:** Keep the MPA + `data-doc` fetch shell; restructure only presentation: new docs chrome (header, search, section landing, prev/next, reading rhythm) + responsive nav (drawer + subnav) + a self-rating verification gate (`tests/ds-docs-experience.test.mjs`) that scores readability/nav/mobile and fails the build below threshold.

**Tech Stack:** Static HTML/CSS + existing classic-script shell (`src/ds/gallery-shell.js`, `src/ds/gallery-subnav.js`), tokens from `design-system/tokens.css`, verification as Node test wired into `npm test`.

**Tags:** Design System, Layout, Component, Motion

---

## Phase 1 — Docs UX audit + IA contract {#phase-1}

*Tags: Design System*

### Task 1: Audit current gallery shell and record pain points ✓ done

**Objective:** Ground the redesign in the actual shell, not memory.

Findings (verified 2026-09-29):
- `gallery.html` (99 lines): single `.wrap > .grid(220px 1fr)` layout, sticky `.dnav` sidebar with ~20 `data-tab` buttons, `#stage > .frame[data-panel]` panels filled via `data-doc` fetch (`src/ds/gallery-shell.js`, 82 lines).
- `gallery.css` (99 lines): only responsive rule is `@media(max-width:700px){.grid{1fr}}` — sidebar stacks above content, no drawer/collapse; `.dnav` is a long ungrouped button list, no search, no landing, no prev/next.
- `gallery-subnav.css` (49 lines) + `gallery-subnav.js` (61 lines): quick-jump left rails only; no mobile behavior.
- Reading rhythm issues: `.pad` sections stack intro → lab → spec with identical chrome; no section landing, no hierarchy between "read me" vs "playground" vs "spec"; tables (`.ch-roles`) and ramps (`.ramp` 10-col) overflow on narrow screens.
- Content source is fine and out of scope: `prototype/gallery/*.md` + `src/ds/*-lab.*` + specimens.

### Task 2: Freeze IA contract (no content changes) ✓ done

- Section order stays: Language → Foundations (Color→Iconography) → Components (Actions→Cards) → Patterns (Operate→Cube).
- Each section gets: landing hero (what/why/when-not) → read (intro doc) → try (lab) → spec (tokens/props) → next-section link.
- Mobile contract: ≤700px gets top bar (menu button, section title, search entry) + slide-over nav drawer + sticky sub-rail as horizontal chip scroller; no 10-col grids, no full tables — ramps become 5-col, tables become card lists (CSS-only reflow, same DOM).
- Desktop contract: sidebar gains search filter + collapsible groups + persistent active trail; stage gains max reading width (~68ch) for prose while labs/specimens stay full-bleed.

*Shipped in pending · Tasks 1–2 · phase-1.*

## Phase 2 — Presentation + navigation rewrite (desktop) {#phase-2}

*Tags: Layout*

### Task 3: Docs chrome — header, landing, prev/next, reading rhythm ✓ done

**Files:**
- Modify: `gallery.html` (docs header slot, search input slot, per-panel landing container, prev/next footer)
- Modify: `gallery.css` (header, hero, prose measure, lab-vs-spec framing, focus states)
- Modify: `src/ds/gallery-shell.js` (render landing hero from existing intro doc first heading; inject prev/next from section order; wire search filter over `.dnav__item`)
- Tests: extend `tests/ds-docs-experience.test.mjs` (phase 4) — hero present, one H1 per panel, search filters nav, prev/next resolves.

Rules: ≤100 lines/file (extract partials, never pack lines); tokens only (`design-system/tokens.css`); file header `/* ADAM/DS — <path> · <job> */` + `[plan:2026-09-29_132702-ds-docs-experience.md#phase-2]` on new exports.

### Task 4: Sidebar that earns its keep — search, groups, active trail ✓ done

**Files:**
- Modify: `gallery.html` (group `<details>` wrappers or aria-expanded groups, search `<input>`)
- Modify: `src/ds/gallery-shell.js` + `src/ds/gallery-subnav.js` (filter, group collapse memory via `localStorage`, active-trail highlight synced to visible panel + hash deep-link `#/section/panel`)
- Modify: `gallery-subnav.css` (rail active state, sticky offset under new header)

Acceptance: keyboard-only user can find any of the ~20 sections in ≤5 keystrokes of search; deep link survives reload.

*Shipped in pending · Tasks 3–4 · phase-2.*

## Phase 3 — Mobile optimisation {#phase-3}

*Tags: Layout*

### Task 5: Mobile nav — top bar + drawer + chip sub-rail ✓ done

**Files:**
- Modify: `gallery.html` (topbar: menu button, title, search trigger)
- Modify: `gallery.css` + `gallery-subnav.css` (drawer at ≤700px: off-canvas transform, scrim, focus trap, ESC close; sub-rail becomes horizontal scroll chips)
- Modify: `src/ds/gallery-shell.js` (drawer open/close, body scroll lock, focus return)

Acceptance (all verified at 360×800 + 768×1024): no horizontal page scroll; drawer opens/closes via button, scrim, ESC; nav reachable with one thumb; content readable without zoom.

### Task 6: Mobile content reflow — ramps, tables, labs, specimens ✓ done

**Files:**
- Modify: `gallery.css` (`.ramp` 10→5 col at ≤700px; `.ch-roles` table→stacked cards via `display:block` reflow; `.ch-voice`, `.tp-lead` single column; `.pad` padding 16px; tap targets ≥44px on `.dnav__item`, pills, tabs)
- Touch: lab controls usable at 360px (no clipped sliders/segmented controls); `cube`/`gems` panels degrade to stacked preview + link to full specimen.

Acceptance: zero-overflow check in the Phase-4 gate (scrollWidth ≤ clientWidth + 1px on every panel at 360px).

*Shipped in pending · Tasks 5–6 · phase-3.*

## Phase 4 — Self-rating verification engine {#phase-4}

*Tags: Tooling*

### Task 7: `tests/ds-docs-experience.test.mjs` — the gate that rates itself ✓ done

**Files:**
- Create: `tests/ds-docs-experience.test.mjs` (static + JSDOM-light checks, no browser needed)
- Modify: `package.json` (`test` script appends `&& node tests/ds-docs-experience.test.mjs`)

Scoring (0–100, build fails <85):
- Readability 30pts: one H1 per panel; prose blocks capped (computed `max-width ≤ 72ch` in CSS); every lab preceded by intro (`data-doc` order intro→lab→spec); code samples have language label.
- Navigation 30pts: every `data-tab` reachable from nav; search input exists + filters; prev/next links resolve; hash deep-link maps to a real panel.
- Mobile 25pts: drawer controls exist (`aria-expanded`, scrim, ESC handler in shell JS); breakpoints at 700px present; no banned fixed-width (grep `min-width:\d{3,}px` outside code samples); tap-target rule (nav item padding ≥12px vertical).
- Hygiene 15pts: tokens-only (reuse `scripts/lint-tokens.mjs` verdict); ≤100 lines per touched file; no new `#hex` literals.

Output: per-axis score + top 3 fixes, e.g. `docs-experience 92/100 (read 28 · nav 30 · mobile 22 · hyg 12) — fix: ramp cols at 360px`. Gate is advisory-explainable, not a black box.

### Task 8: Baseline the score, then ratchet ✓ done

Run gate on current shell first (expect ~45–55), commit baseline score in the test header comment, then each subsequent phase must not lower the total and must raise it (target ≥85 to close).

*Shipped in pending · Tasks 7–8 · phase-4.*

## Phase 5 — Subagent fanout (no asking) + ship {#phase-5}

*Tags: Component*

### Task 9: Dispatch rules — agents go without Irfan being asked

Executor (not this plan) fans out with `delegate_task` immediately after plan approval:
- Agent A: Phase 2 chrome + sidebar (Task 3–4).
- Agent B: Phase 3 mobile (Task 5–6).
- Agent C: Phase 4 gate (Task 7–8) — lands FIRST so A/B get scored on every iteration.
- Merge rule: C's gate is the reconciler; A/B don't mark done until gate ≥85 and `npm test` green. No mid-run questions to Irfan — agents decide copy/layout details within the contracts above and log deviations in the commit body.

### Task 10: Plan hygiene + verify + report

- `src/ds/changelog-names.json` entry for this plan BEFORE any implementation commit (`npm run plan:names` must pass).
- Commits carry `[plan:2026-09-29_132702-ds-docs-experience.md#phase-N]` trailers; `npm run ds:track` 0 wip; `npm test` green; `/gallery.html` smoke on desktop + 360px.
- Report back in <150 tokens: what changed, score delta, what's left. No push without explicit `y`.

---

## Risks / non-goals

- Content (`prototype/gallery/*.md`, lab behavior, tokens) is explicitly out of scope — presentation only.
- `gallery.html` script-tag soup (~40 classic scripts) is not consolidated here; phases must not reorder script includes.
- Three.js/cube/gem specimens only get responsive framing, not rewrites.
