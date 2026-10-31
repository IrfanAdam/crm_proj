# Changelog safepipe parity — filter dropdown + timeline panel

**Goal:** Match safepipe's changelog chrome in crm_proj: filter trigger opens an anchored dropdown (not an in-flow box), timeline opens as a fixed right slide-in panel (not in-flow rows). Both are already declared in the changelog-kit skill (View roles: Chips filter-icon dropdown; Timeline tracks drawer `aside.ds-timeline`) — this plan closes the gap, no skill change.
**Reference:** `/Users/irfan/Documents/Portfolio Redo/safepipe_proj/src/changelog/changelog/paint-chips.js` (filterBtn), `changelog.css` (`.ds-tag-dropdown`, phone bottom-sheet), `changelog-timeline.css` (`aside.ds-timeline` + `.is-open`), `changelog-events.js` (outside-dismiss, tab switch without repaint).
**Scope:** chrome only — crm keeps its own row/bar/today rendering, status model, due lane. No bout-merge/ghost/popover port.
**Architecture:** Pure chrome port — safepipe markup/edge-sync adapted to crm tokens (`--cl-*`/`--color-*`) and crm's single-bar-per-plan rows; parse/link layer untouched (zero hash drift); new state (`st.returnTimeline`) flows through existing `ctx`.
**Tech Stack:** Vanilla ESM (no framework), Vite `import.meta.glob` plans + manifest JSON, Node slice-tests from scratch dir (no browser dependency).
**Tags:** Design System, Component

## Phase 1 — Filter dropdown {#phase-1}

**Status:** 3/3 · GATE PASSED (subagent fresh-session live verify: icon-only toggle, anchored dropdown, option filters cards, outside-click + Escape dismiss, 390px bottom sheet)

| # | Task | Done when |
|---|------|-----------|
| 1 | Dropdown toggle + menu markup ✓ done | Icon-only funnel button FIRST in chips row (`data-filter-toggle`, `aria-haspopup="dialog"`; active state via pill `.on` + aria-label, no text/caret/count in the button); `div.ds-tag-dropdown[data-tag-dropdown][hidden]` anchored under it with Tags/Status tabs, checkbox (`data-tag-opt`) + radio (`data-status-opt`) options with counts; inline pills + day chip + Clear + timeline chip order unchanged |
| 2 | Dropdown behavior ✓ done | Toggle flips `hidden` + `aria-expanded`; tab switch without repaint; option pick applies + repaints; outside-click + Escape dismiss; phone ≤640px bottom-sheet restyle |
| 3 | Budget + probes ✓ done | Every touched file ≤100 lines; node --check; fresh-session live: toggle opens anchored panel (same left edge, below trigger), option filters list (22→20 picks), outside-click + Escape close, 390px bottom sheet (fixed, full-width, 12px top radii) |

### Task 1: Dropdown toggle + menu markup ✓ done {#phase-1}

### Task 2: Dropdown behavior ✓ done {#phase-1}

### Task 3: Budget + probes ✓ done {#phase-1}

- REF GATE 1 (✓ PASSED · evidence 2026-10-31): fresh-session live — icon-only funnel (svg only, empty textContent), dropdown anchored below toggle (same left edge), Design System pick 22→20 picks, Done status 20→13, outside-click + Escape dismiss, 390px bottom sheet (fixed full-width, 12px top radii). Budgets ≤100, build green. Nit (follow-up): aria-expanded stays "true" after outside-click dismiss — visibility correct, label stale. Verdict: PASSED.
- REF GATE 1 · rev 2026-10-31: toggle is icon-only funnel per owner (no Filter text/caret/count in button; active state via pill `.on` + aria-label).

## Phase 2 — Timeline fixed panel {#phase-2}

**Status:** 3/3 · GATE PASSED (Tasks 4–6 coded, bundle-verified, live owner-confirmed `ok its working`; see REF GATE 2)

*Shipped in d719a70, 99075bb, dc94737, 206ea44, 5deca08, c171960 · Tasks 4–6 · phase-2.*

| # | Task | Done when |
|---|------|-----------|
| 4 | Aside mount + open/close ✓ done | `[data-col="timeline"]` becomes `aside.ds-timeline` fixed right (`min(86vw, var(--size-ds-drawer))`, slide/fade `.is-open`, `hidden` when closed); ✕ + Escape + scrim + chip-toggle close; in-flow host div removed from render |
| 5 | Panel CSS ✓ done | Sticky axis, scroll region, head chrome mirror safepipe panel (crm `--cl-*`/`--color-*` tokens only); phone full-width; `prefers-reduced-motion` stills the slide |
| 6 | Budget + live probes ✓ done | Files ≤100 lines; live owner-confirmed: chip opens panel over content, card opens drawer (`ok its working`), close paths wired |

### Task 4: Aside mount + open/close ✓ done {#phase-2}

### Task 5: Panel CSS ✓ done {#phase-2}

### Task 6: Budget + live probes ✓ done {#phase-2}

- REF GATE 2 (PASSED · evidence 2026-10-31): owner confirms both panels open on live page after triage-div fix (`ok its working`); aside render + fixed CSS + scrim/Escape/✕ wiring in source and bundle; budgets ≤100; build green; `npm test` exit 0. Verdict: PASSED.

## Phase 3 — Timeline inner track UX (safepipe-adapted) {#phase-3}

**Status:** 4/4 · GATE PASSED (tl3 18/18, budgets hold, owner accepted floating-caret revision and moved on)

*Shipped in a7088ac, 34463ef, 083d026 · Tasks 7–10 · phase-3.*

Adapt safepipe's inner timeline UX to crm tokens/rows (single-bar-per-plan model kept — no bout-merge port): plan name truncated inside its work bar, floating edge carets + lane-click scroll, sticky month badge, done-coverage fill, ghost upcoming bar, hover tips, daily ticks, empty state, keep-today-in-view. Deliberately NOT ported: bout popover, 'next' sort.

| # | Task | Done when |
|---|------|-----------|
| 7 | Bars + names + coverage + tips ✓ done | Name (+num) truncated inside its work bar (`ds-tl-barname`, ghost never named; 2-day min-width); bar shows plan done-share (`--tl-done` muted accent from left); bar/ghost carry `data-tip` (commits · range · Due); no persistent side column — floating `«`/`»` edge carets + lane-click instant scroll + sticky month badge |
| 8 | Ghost upcoming bar ✓ done | Open plans get dashed ghost from last activity to Due (first open section with Due, else +21d); overdue state when Due < today; grid bounds include ghost dates |
| 9 | Axis + empty + today ✓ done | Daily ticks (bare day numbers, month label on 1st emphasized); range text in head; `Nothing matches the current filters yet.` empty state; today keeps fractional time + scrolls into view on open (instant) |
| 10 | Verify + close ✓ done | TEMP-DEBUG reverted (error badge, title readout, sh3 stamp); every touched file ≤100 lines; node --check; tl3 slice-test 18/18; build green; owner accepted revision (`fine`) and directed roundup + icon-only filter |

### Task 7: Bars + names + coverage + tips ✓ done {#phase-3}

### Task 8: Ghost upcoming bar ✓ done {#phase-3}

### Task 9: Axis + empty + today ✓ done {#phase-3}

### Task 10: Verify + close ✓ done {#phase-3}

- REF GATE 3 (✓ PASSED · evidence 2026-10-31): bars read as per-plan tracks with names truncated in-lane, ghost honest (Due-anchored, danger-token overdue), carets + lane-click + month badge per owner safepipe fix, tips accurate, tl3 18/18, no parse/hash drift (parse layer untouched), budgets hold, owner `fine`. Verdict: PASSED.
- REF GATE 3 · rev 2026-10-31: polish round from owner screenshots — sticky side-label rail (every row titled), name aboard only bars ≥5d (no slivers), day grid widened to --tl-day with dividers, taller pills, display head, sticky axis.
- REF GATE 3 · rev 2026-10-31: floating edge-caret pattern per owner safepipe fix — persistent side rail removed, name truncated in-lane on the work bar, carets + lane-click instant scroll with nudge, sticky month badge, danger-token overdue, dead [data-status] branch removed.

## Phase 4 — Chrome consistency + overlay layering {#phase-4}

**Status:** 2/3 · GATE OPEN (Tasks 11–12 verified; Task 13 mechanical GO, Safari pixel confirm pending)

Port safepipe drawer chrome + one-panel-at-a-time layering. Findings: drawer outer padding clips header/final row (skill full-bleed rule); rail children lack the 16px guide insets; rail-head can collapse in the flex scroll container; task pane has no insets of its own; timeline+drawer stacked at one z (tl-open left both open). Deliberately NOT ported: scrim `.is-open` mechanism (crm `[hidden]` works), mobile multi-level panes (needs JS markers — minimal phone stack instead), rail-prov element (no crm markup).

| # | Task | Done when |
|---|------|-----------|
| 11 | Drawer full-bleed + rail insets ✓ done | Drawer `padding:0;gap:0`; rail/task carry `cl-18/30` insets + `overscroll:contain`; rail-head `flex:none` + `cl-16` sides; rail picks `cl-12 cl-16`; rail-foot sides `cl-16`; drawer-head rhythm `pt-6/mb-4` + single-line ellipsis title |
| 12 | One panel at a time ✓ done | `st.returnTimeline`: tl-open hides timeline under drawer; ✕/scrim/Escape restore it on close; paintTimeline stays hidden while `open`; phone ≤720px drawer stacks full-width (rail 42% top, task fills) |
| 13 | Verify + close | node --check 7/7, budgets ≤100, build green, zero DEBUG remnants; Safari pixel confirm (layering, insets, phone stack) |

### Task 11: Drawer full-bleed + rail insets ✓ done {#phase-4}

### Task 12: One panel at a time ✓ done {#phase-4}

### Task 13: Verify + close {#phase-4}

- REF GATE 4 (OPEN → ship): drawer reads full-bleed with even insets, rail guide flush, exactly one panel visible at a time with return-to-timeline, mechanical 7/7 + budgets verified, Safari pixel confirm pending.
- REF GATE 4 · rev 2026-10-31: mechanical half GO (independent re-verify: node --check 7/7, all 8 files ≤100, returnTimeline set/restore wired incl. Escape, zero DEBUG remnants, full-bleed + insets + phone stack present).
- REF GATE 4 · rev 2026-10-31: pixel-review screenshots captured from live :5173 (timeline panel, plan drawer, filter dropdown, 390px bottom sheet) — attached for owner sign-off, the last Task 13 item.
