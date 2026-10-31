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

**Status:** 5/5 · GATE PASSED (tl3 20/20, popover live-verified with structured content, budgets hold, owner-requested port)

*Shipped in a7088ac, 34463ef, 083d026, 0b2c6e7 · Tasks 7–10, 14 · phase-3.*

Adapt safepipe's inner timeline UX to crm tokens/rows (single-bar-per-plan model kept — no bout-merge port): plan name truncated inside its work bar, floating edge carets + lane-click scroll, sticky month badge, done-coverage fill, ghost upcoming bar, hover tips, structured lane popover, daily ticks, empty state, keep-today-in-view. Deliberately NOT ported: 'next' sort.

| # | Task | Done when |
|---|------|-----------|
| 7 | Bars + names + coverage + tips ✓ done | Name (+num) truncated inside its work bar (`ds-tl-barname`, ghost never named; 2-day min-width); bar shows plan done-share (`--tl-done` muted accent from left); bar/ghost carry `data-tip` (commits · range · Due); no persistent side column — floating `«`/`»` edge carets + lane-click instant scroll + sticky month badge |
| 8 | Ghost upcoming bar ✓ done | Open plans get dashed ghost from last activity to Due (first open section with Due, else +21d); overdue state when Due < today; grid bounds include ghost dates |
| 9 | Axis + empty + today ✓ done | Daily ticks (bare day numbers, month label on 1st emphasized); range text in head; `Nothing matches the current filters yet.` empty state; today keeps fractional time + scrolls into view on open (instant) |
| 10 | Verify + close ✓ done | TEMP-DEBUG reverted (error badge, title readout, sh3 stamp); every touched file ≤100 lines; node --check; tl3 slice-test 18/18; build green; owner accepted revision (`fine`) and directed roundup + icon-only filter |
| 14 | Lane popover ✓ done | Structured per-lane popover (`tl-pop.js`: title + desc + accented d/t scope + Due text) on bar/ghost hover; text tip suppressed while pop shows; Escape/bar-open hides; Due is text (no due-jump filter in crm) |

### Task 7: Bars + names + coverage + tips ✓ done {#phase-3}

### Task 8: Ghost upcoming bar ✓ done {#phase-3}

### Task 9: Axis + empty + today ✓ done {#phase-3}

### Task 10: Verify + close ✓ done {#phase-3}

### Task 14: Lane popover ✓ done {#phase-3}

- REF GATE 3 (✓ PASSED · evidence 2026-10-31): bars read as per-plan tracks with names truncated in-lane, ghost honest (Due-anchored, danger-token overdue), carets + lane-click + month badge per owner safepipe fix, tips accurate, tl3 18/18, no parse/hash drift (parse layer untouched), budgets hold, owner `fine`. Verdict: PASSED.
- REF GATE 3 · rev 2026-10-31: polish round from owner screenshots — sticky side-label rail (every row titled), name aboard only bars ≥5d (no slivers), day grid widened to --tl-day with dividers, taller pills, display head, sticky axis.
- REF GATE 3 · rev 2026-10-31: floating edge-caret pattern per owner safepipe fix — persistent side rail removed, name truncated in-lane on the work bar, carets + lane-click instant scroll with nudge, sticky month badge, danger-token overdue, dead [data-status] branch removed.
- REF GATE 3 · rev 2026-10-31: per-lane structured popover (owner request — was deliberately excluded): title + de-duped desc + accented `d/t tasks` scope + Due text on bar/ghost hover; `tl-pop.js` 34 lines, events/timeline/shell deltas keep budgets ≤100; tl3 20/20; live probe shows title/desc/scope; Due is text, not a filter-jump button (no due-jump in crm; bar click opens the plan).
- REF GATE 3 · rev 2026-10-31: popover card restyle to safepipe look (owner screenshot): white 12px card, 16/20/14 padding, display 15px title, mono 12.5px desc with 2-line clamp, accented scope, muted Due/sub; live probe confirms white/12px/card padding.

## Phase 4 — Chrome consistency + overlay layering {#phase-4}

**Status:** 10/11 · GATE OPEN (Tasks 11–12, 15–22 shipped; Task 13 mechanical GO, Safari pixel confirm pending)

Port safepipe drawer chrome + one-panel-at-a-time layering. Findings: drawer outer padding clips header/final row (skill full-bleed rule); rail children lack the 16px guide insets; rail-head can collapse in the flex scroll container; task pane has no insets of its own; timeline+drawer stacked at one z (tl-open left both open). Deliberately NOT ported: scrim `.is-open` mechanism (crm `[hidden]` works), mobile multi-level panes (needs JS markers — minimal phone stack instead), rail-prov element (no crm markup).

*Shipped in 08c1466, 93214c0, 0f41aa6, 0122cdd, 36ac8da, cc722ec, 1473cae, f336623, dc1f635, 4569001, 4f41628 · Tasks 11–12, 15–22 · phase-4.*

| # | Task | Done when |
|---|------|-----------|
| 11 | Drawer full-bleed + rail insets ✓ done | Drawer `padding:0;gap:0`; rail/task carry `cl-18/30` insets + `overscroll:contain`; rail-head `flex:none` + `cl-16` sides; rail picks `cl-12 cl-16`; rail-foot sides `cl-16`; drawer-head rhythm `pt-6/mb-4` + single-line ellipsis title |
| 12 | One panel at a time ✓ done | `st.returnTimeline`: tl-open hides timeline under drawer; ✕/scrim/Escape restore it on close; paintTimeline stays hidden while `open`; phone ≤720px drawer stacks full-width (rail 42% top, task fills) |
| 13 | Verify + close | node --check 7/7, budgets ≤100, build green, zero DEBUG remnants; Safari pixel confirm (layering, insets, phone stack) |
| 15 | Task-line lint ✓ done | Prose lines keep own rows (no para-merge), `### Task` headers open `<section class="ds-subtask">`, task-overview tables render as `<table>` (header th + body rows) instead of dropped; `✓/✗` strip no longer eats newlines |
| 16 | Detail polish port ✓ done | Safepipe task-pane contract: closed task folds (tick + clean name + caret, body unfolded), dup-head/Status/Shipped/---/Due/table strips, tables dropped again (checkbox list is the single task list), eval markdown cleaned, due hidden on sealed phases, fold CSS |
| 17 | Fold content + scale ✓ done | Empty-fold fix: tables restored as the task list (bare ### markers carry no detail), bodyless dupes suppressed when a table lists them, bare tick rows only without tables; fold CSS to safepipe spec (13px/700 summary, cl-4 gap, margin 0, flush body, bare rows); corpus probe 343 folds/0 empty/56 tables |
| 18 | Expected drawer structure ✓ done | Right pane leads crumb (plan tags +N) + full phase h2 + computed status line (✓ DONE/frac · gate, cancelled-aware); drawer-head drops dup title (gate + due + ✕); rail-head sticky; all crm tokens |
| 19 | Review fixes ✓ done | Tables dropped entirely (bare tick rows carry tasks); fold-body lint (`code` spans via placeholders, `**Field:**` rows, own-line prose); status only under title (head = due + ✕); evals/commits/day single native caret, panel titles styled, timeline rail flush |
| 20 | Header/caret/alignment ✓ done | Rail head reads plan title (was selected-phase head, changed per click); crumb top-aligned with rail head (matched cl-18 pane insets, head overlays top-right); evals/commits/day carets restored as CSS › (native markers stay hidden, no double caret) |
| 21 | Deadline row position ✓ done | Floating due + ✕ shared the pane top, not the header text line — task inset and head offset retuned so rail text, crumb, and due pill all sit on one 26px line |
| 22 | Unlinked callout ✓ done | Raw `\u2014` escapes rendered as text (now real em-dashes); callout head was giant phase-title size (now panel-scale label); Task-20 day caret leaked onto static date rows (scoped to fold summaries) |

### Task 11: Drawer full-bleed + rail insets ✓ done {#phase-4}

### Task 12: One panel at a time ✓ done {#phase-4}

### Task 13: Verify + close {#phase-4}

### Task 15: Task-line lint ✓ done {#phase-4}

### Task 16: Detail polish port ✓ done {#phase-4}

### Task 17: Fold content + scale ✓ done {#phase-4}

### Task 18: Expected drawer structure ✓ done {#phase-4}

### Task 19: Review fixes ✓ done {#phase-4}

### Task 20: Header/caret/alignment ✓ done {#phase-4}

### Task 21: Deadline row position ✓ done {#phase-4}

### Task 22: Unlinked callout ✓ done {#phase-4}

- REF GATE 4 (OPEN → ship): drawer reads full-bleed with even insets, rail guide flush, exactly one panel visible at a time with return-to-timeline, mechanical 7/7 + budgets verified, Safari pixel confirm pending.
- REF GATE 4 · rev 2026-10-31: unlinked callout (owner) — em-dashes render, head at panel scale (10.5px/uppercase live), static dates caret-free, build green.
- REF GATE 4 · rev 2026-10-31: deadline row position (owner) — rail text, crumb, due pill all on one line (26/26/26 live probe), build green.
- REF GATE 4 · rev 2026-10-31: header/caret/alignment (owner 3 items) — plan-title rail head, 0px pane-top alignment, CSS › carets; live probe stable/0px/› green, harness 11/11, build green.
- REF GATE 4 · rev 2026-10-31: review fixes (owner 5 items) — no tables, fold-body lint, status-once, panel carets; live probe 0 tables/1 status/0 extra carets, harness 11/11, corpus 343 folds 0 empty, budgets 90/58/33, build green.
- REF GATE 4 · rev 2026-10-31: expected drawer structure (owner screenshot spec) — right pane now crumb + full phase title + computed status line, head drops dup title, rail title sticky; live probe crumb/h2/`✓ DONE · GATE PASSED`/sticky all green; display synthesis only, card seal untouched.
- REF GATE 4 · rev 2026-10-31: fold content + scale (owner: empty accordions, off-scale titles) — ### markers are bare headers with all content in the phase table, so folds were correctly shaped but empty: tables restored as THE task list, bodyless dupes suppressed under tables, bare tick rows only table-less; fold CSS to safepipe spec (13px/700 summary, cl-4 gap, margin 0, flush body); corpus probe 19 plans → 343 folds, 0 empty, 56 tables; struct-harness 11/11, 90 lines, build green, 9/9 suites + plan-names pass (lint red only on sibling's live gem WIP file, untouched).
- REF GATE 4 · rev 2026-10-31: detail polish port (owner: safepipe-level format/indents/concision) — dual-auditor findings (22 gaps + full fold/tick/indent contract) implemented as Task 16: norm-shaped items fold closed with ☑/☐/☒ + clean names, dup-head/Status/Shipped/---/Due/table strips, eval `**`/`[x]` cleaned, due setter hidden on sealed phases; struct-harness 12/12, files ≤100 (72/58/30), build + suite green, live DOM 4 folds/4 ticks/0 dupes; screenshots blocked (capture daemon timeouts ×3) — owner to confirm in Safari.
- REF GATE 4 · rev 2026-10-31: task-line lint (owner report — tasks ran together as one): prose one-`<p>`-per-line, Task sections wrapped, overview tables render as tables (was dropped like safepipe — but safepipe duplicates tasks as checkboxes while crm phases list them only in the table); newline-eating `✓/✗` strip fixed; struct-harness 10/10, file 93 lines, suite green.
- REF GATE 4 · rev 2026-10-31: mechanical half GO (independent re-verify: node --check 7/7, all 8 files ≤100, returnTimeline set/restore wired incl. Escape, zero DEBUG remnants, full-bleed + insets + phone stack present).
- REF GATE 4 · rev 2026-10-31: pixel-review screenshots captured from live :5173 (timeline panel, plan drawer, filter dropdown, 390px bottom sheet) — attached for owner sign-off, the last Task 13 item.
