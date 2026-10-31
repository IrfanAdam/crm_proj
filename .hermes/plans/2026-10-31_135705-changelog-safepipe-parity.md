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
| 6 | Budget + probes | Files ≤100 lines; live: chip opens panel over content (cards visible behind scrim), row click opens drawer, close paths work, 390px no overlap |

- REF GATE 2 (OPEN · evidence 2026-10-31): aside render + fixed-panel CSS + scrim/Escape/✕ wiring all present in source AND the built bundle (post-build grep), budgets ≤100, build green. PENDING a real page load: panel open/close + 390px (same stuck-tab cause as Gate 1 — render() runs once per load, HMR only swaps paint; Safari hard-refresh is the verification). Verdict: OPEN.
