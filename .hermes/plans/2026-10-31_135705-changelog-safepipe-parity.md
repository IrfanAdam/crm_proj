# Changelog safepipe parity — filter dropdown + timeline panel

**Goal:** Match safepipe's changelog chrome in crm_proj: filter trigger opens an anchored dropdown (not an in-flow box), timeline opens as a fixed right slide-in panel (not in-flow rows). Both are already declared in the changelog-kit skill (View roles: Chips filter-icon dropdown; Timeline tracks drawer `aside.ds-timeline`) — this plan closes the gap, no skill change.
**Reference:** `/Users/irfan/Documents/Portfolio Redo/safepipe_proj/src/changelog/changelog/paint-chips.js` (filterBtn), `changelog.css` (`.ds-tag-dropdown`, phone bottom-sheet), `changelog-timeline.css` (`aside.ds-timeline` + `.is-open`), `changelog-events.js` (outside-dismiss, tab switch without repaint).
**Scope:** chrome only — crm keeps its own row/bar/today rendering, status model, due lane. No bout-merge/ghost/popover port.

## Phase 1 — Filter dropdown {#phase-1}

**Status:** 2/3 · GATE OPEN (Tasks 1–2 desktop-verified live; Task 3 needs a real page load — see note)

| # | Task | Done when |
|---|------|-----------|
| 1 | Dropdown toggle + menu markup ✓ done | Funnel-icon button FIRST in chips row (`data-filter-toggle`, `aria-haspopup="dialog"`, count badge); `div.ds-tag-dropdown[data-tag-dropdown][hidden]` anchored under it with Tags/Status tabs, checkbox (`data-tag-opt`) + radio (`data-status-opt`) options with counts; inline pills + day chip + Clear + timeline chip order unchanged |
| 2 | Dropdown behavior ✓ done | Toggle flips `hidden` + `aria-expanded`; tab switch without repaint; option pick applies + repaints; outside-click + Escape dismiss; phone ≤640px bottom-sheet restyle |
| 3 | Budget + probes | Every touched file ≤100 lines (extract `changelog/filter-menu.js` if needed); node --check; live: toggle opens anchored panel, option filters list, outside-click closes |

- REF GATE 1 (OPEN · evidence 2026-10-31): desktop dropdown live-verified (anchored below trigger, 6 tag + 2 status options, status pick → 12 cards, outside-dismiss ✓, budgets all ≤100, `npm test` exit 0, build green). PENDING a real page load: phone bottom-sheet geometry + Escape dismiss (harness tabs stopped reloading tonight — shell stuck pre-edit while paint modules hot-swapped; Safari hard-refresh is the verification). Verdict: OPEN.

## Phase 2 — Timeline fixed panel {#phase-2}

**Status:** 2/3 · GATE OPEN (Tasks 4–5 coded + bundle-verified; Task 6 needs a real page load — see note)

| # | Task | Done when |
|---|------|-----------|
| 4 | Aside mount + open/close ✓ done | `[data-col="timeline"]` becomes `aside.ds-timeline` fixed right (`min(86vw, var(--size-ds-drawer))`, slide/fade `.is-open`, `hidden` when closed); ✕ + Escape + scrim + chip-toggle close; in-flow host div removed from render |
| 5 | Panel CSS ✓ done | Sticky axis, scroll region, head chrome mirror safepipe panel (crm `--cl-*`/`--color-*` tokens only); phone full-width; `prefers-reduced-motion` stills the slide |
| 6 | Budget + live probes ✓ done | Files ≤100 lines; live owner-confirmed: chip opens panel over content, card opens drawer (`ok its working`), close paths wired |

- REF GATE 2 (PASSED · evidence 2026-10-31): owner confirms both panels open on live page after triage-div fix (`ok its working`); aside render + fixed CSS + scrim/Escape/✕ wiring in source and bundle; budgets ≤100; build green; `npm test` exit 0. Verdict: PASSED.

## Phase 3 — Timeline inner track UX (safepipe-adapted) {#phase-3}

**Status:** 3/4 · GATE OPEN (Tasks 7–9 code-verified; Task 10 needs owner Safari confirm)

Adapt safepipe's inner timeline UX to crm tokens/rows (single-bar-per-plan model kept — no bout-merge port): plan name rides its longest bar, done-coverage fill, ghost upcoming bar, hover tips, daily ticks, empty state, keep-today-in-view. Deliberately NOT ported: bout popover, edge carets, month badge, 'next' sort.

| # | Task | Done when |
|---|------|-----------|
| 7 | Bars + names + coverage + tips ✓ done | Name (+num) rides longest of bar/ghost; bar shows plan done-share (`--tl-done` muted accent from left); bar/ghost carry `data-tip` (commits · range · Due); sidebar name buttons + corner spacer removed |
| 8 | Ghost upcoming bar ✓ done | Open plans get dashed ghost from last activity to Due (first open section with Due, else +21d); overdue state when Due < today; grid bounds include ghost dates |
| 9 | Axis + empty + today ✓ done | Daily ticks (bare day numbers, month label on 1st emphasized); range text in head; `Nothing matches the current filters yet.` empty state; today keeps fractional time + scrolls into view on open (instant) |
| 10 | Cleanup + budget + verify | Revert TEMP-DEBUG (error badge, title readout, sh3 stamp); every touched file ≤100 lines; node --check; Node slice-test of open path; build green; owner Safari confirm |

- REF GATE 3 (OPEN → ship): bars read as per-plan tracks with names aboard, ghost honest (Due-anchored, overdue marked), tips accurate, no parse/hash drift (parse layer untouched), budgets hold.
