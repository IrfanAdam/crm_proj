# Changelog parity — bring the page to the skill contract

> **For Hermes:** Implement phase-by-phase, direct sequential implementation (no subagent lanes — single live tree + running dev server on :5173, ~1.2k-line surface already in context). Verify each phase in the live page with screenshots before committing.

**Goal:** Every changelog-kit view contract renders on `changelog.html`: status filter, gate verdicts, evals feed, orphan groups, timeline drawer, due scheduling.

**Architecture:** Pure-logic additions live in the parse/link layer (`changelog-parse.js`, `changelog-links.js`) with zero hash drift; all rendering in the existing paint modules against current CRM tokens; new state fields (`st.status`, `st.tlDate`) flow through the existing `ctx` object so paints stay signature-stable.

**Tech Stack:** Vanilla ESM (no framework), Vite `import.meta.glob` plans + manifest JSON, Playwright/WebKit probe via browser tool on :5174-preview spare port (never :5173).

**Tags:** Design System, Component

---

## Phase 1 — Status model + filter drawer {#phase-1}

**Status:** 6/6 · GATE OPEN (cancelled path synthetic-only — zero cancelled plans in corpus; owner pixel sign-off pending)

*What the page gains: Done / Incomplete / Cancelled filtering shared by every surface.*

| # | Task | Done when |
|---|------|-----------|
| 1 | `planStatus()` helper | Cancelled > done > incomplete over full plan corpus via node probe |
| 2 | `st.status` state + predicates | Day/tag/status combine; open drawer immune to transient filters |
| 3 | Filter dropdown + drawer shell | Trigger first, Tags/Status tabs, `Tag (n)` options, no commas |
| 4 | Status options + Clear-last | Clear reads `Clear`, hidden when inactive, resets all filters |
| 5 | Card status + 3 tags + inline +N | Accent only when done; cancelled red from DS danger token |
| 6 | Rail status + branch order | `[data-*]` branches before generic class branches in events |

### Task 1: `planStatus()` helper ✓ done {#phase-1}

**Objective:** One shared cancelled > done > incomplete helper feeding cards, rail, timeline, and the status filter.
**Files:** `src/pitch/changelog-parse.js` (append; do not touch `state`/`isDone`/`norm` — hash-sensitive)
**Steps:** append `planStatus(sprints, bodies)` returning `'cancelled' | 'done' | 'incomplete'` per skill (trailing-run rule, taskless-head seal); node probe over all 17 plans prints each file's status.
**Verify:** `node --check` + probe output lists 17 statuses, gem plan reads incomplete (open Task 10/14), no existing test output changes.

### Task 2: `st.status` state + predicates ✓ done {#phase-1}

**Objective:** Status participates in filtering without ejecting the open drawer.
**Files:** `src/pitch/pages-changelog.js` (`st` init, `visiblePlans`, `visibleSprints`, `doPaint` ctx)
**Steps:** add `status: new Set()`; predicates AND across tag/day/status; detail keeps rendering its plan when filters hide it.
**Verify:** probe predicates in node (import after stub? — assert via live page in Task 6 instead if import is DOM-bound); page loads with no console errors.

### Task 3: Filter dropdown + drawer shell ✓ done {#phase-1}

**Objective:** Filter-icon trigger first in chips row opening a drawer with Tags and Status tabs.
**Files:** `src/pitch/changelog/paint-chips.js`, `src/pitch/changelog-events.js`, `src/pitch/pitch-changelog.css` (or existing changelog css)
**Steps:** trigger button `[data-view]`/filter class; drawer with two tabs; active-filter count on trigger; `Tag (n)` options joined explicitly (no comma leak).
**Verify:** click trigger opens drawer, tabs switch, count updates; delegated branch ordered before generic `.ds-chip` branch.

### Task 4: Status options + Clear-last ✓ done {#phase-1}

**Objective:** Done / Incomplete / Cancelled multi-select plus `Clear` last, hidden when inactive.
**Files:** `src/pitch/changelog/paint-chips.js`, `src/pitch/changelog-events.js`
**Steps:** status options with counts; Clear resets status+tags+day; hidden unless any filter active.
**Verify:** Done filter narrows list and renumbers sequences; Clear restores full list.

### Task 5: Card status + 3 tags + inline +N ✓ done {#phase-1}

**Objective:** Cards share `planStatus()`; tags render 3 + inline `+N` with interpuncts.
**Files:** `src/pitch/changelog/paint-plan.js`
**Steps:** `is-done`/`is-pending` stay; cancelled picks get danger-token class; tag cell 3 + ` · +N` inline span (role=button, expand in place, stopPropagation); confirm danger token name in `design-system/tokens.css` first.
**Verify:** screenshot: cancelled plan (if none, force-probe one) red, tags single-line right-aligned, `+N` expands without opening drawer.

### Task 6: Rail status + branch order ✓ done {#phase-1}

**Objective:** Rail picks share `planStatus()`; click delegation never swallows specific controls.
**Files:** `src/pitch/changelog/paint-detail.js` (rail classes only), `src/pitch/changelog-events.js` (branch order)
**Steps:** add status classes to rail picks; reorder `onClick` so every specific `[data-*]` branch precedes generic class branches.
**Verify:** full filter matrix on live page (each status × day × tag), Escape/scrim close intact, screenshot.

- REF GATE 1 (OPEN · evidence 2026-10-31): Done/Incomplete counts verified live (12/5), Clear resets, drawer immunity holds (rail 144222), phone-390 overlap 0, planStatus 12/12 synthetic + 17-plan corpus. Missing: cancelled path has zero live plans to exercise; owner pixel sign-off pending. Verdict: OPEN.

---

## Phase 2 — Gate verdicts + evals feed {#phase-2}

**Status:** 4/4 · GATE PASSED (rail/head/panel screenshots verified live on parity plan; prose strip CLEAN; collapse works; hash-drift none — additive exports only)

*What the page gains: every judged phase shows its verdict; evaluations read as one threaded panel.*

| # | Task | Done when |
|---|------|-----------|
| 7 | `parseGates()` additive parser | Gate objects carry verdict + rev count, section hashes unchanged |
| 8 | Inline verdict tags | Cards + rail show `GATE PASSED/FAILED/OPEN · N revs` beside DONE |
| 9 | Evals · N + Commits · N panels | Collapsible tiles, reversed Day N, gate↔rev pairing |
| 10 | REF GATE strip in markdown body | Task Verify stays one-line; no phantom anchor lines |

### Task 7: `parseGates()` additive parser ✓ done {#phase-2}

**Objective:** Parse `REF GATE N` lines (verdict, ownership by heading number, `· rev` count) without touching hashed semantics.
**Files:** `src/pitch/changelog-parse.js` (new export only)
**Steps:** gate ownership by heading number (`Task 3`→gate 3), never positional index; explicit-uppercase verdict vocabulary; `(ship)` marker kept on gate object.
**Verify:** hash-drift probe: every live section hash identical before/after; gates parsed for lump-sum + gem plans match plan text.

### Task 8: Inline verdict tags ✓ done {#phase-2}

**Objective:** Verdict renders as quiet inline tag alongside DONE on cards and rail picks.
**Files:** `src/pitch/changelog/paint-plan.js`, `src/pitch/changelog/paint-detail.js`
**Steps:** token-only tag, no rail/stepper/popover; every judged phase shows its own verdict; gateless sections show none.
**Verify:** screenshot of a PASSED, OPEN, and FAILED (or simulated) phase agreeing with plan file lines.

### Task 9: Evals · N + Commits · N panels ✓ done {#phase-2}

**Objective:** Unified verify + revision timeline per open phase in collapsible tiles.
**Files:** `src/pitch/changelog/paint-detail.js` (append renderers; detail renderer only, never `norm()`)
**Steps:** outer `<details class="ds-panel" open>` with caret left of caps label; inner per-Day groups reversed numbering (oldest Day 1 bottom); gate parent + rev child pairing newest-first; no per-row accordions or numeric prefixes.
**Verify:** gem Phase 7 shows eval/commit structure tracing to real gate lines; screenshot.

### Task 10: REF GATE strip in markdown body ✓ done {#phase-2}

**Objective:** The gate thread belongs to Evals, not the task prose.
**Files:** `src/pitch/changelog/paint-detail.js` (`marked.parse` pre-slice)
**Steps:** slice body from first `- REF GATE` to section anchor before parse; anchor/`Tags:`/Due strips stay intact.
**Verify:** task Verify lines one-line; no phantom trailing anchor; hash probe still clean.

- REF GATE 2 (✓ PASSED · evidence 2026-10-31): rail `· GATE OPEN` on all 6 parity phases, head tag renders, Evals · 1 Day-grouped, Commits · 1 timeline intact, prose strip CLEAN, collapse works, corpus parse zero false positives, 9-case synthetic probe covers PASSED/FAILED/revs/ship/ownership/prose-trap (caught + fixed `\(ship\)` boundary bug), hashes untouched. Verdict: PASSED.

---

## Phase 3 — Orphans + triage parity {#phase-3}

**Status:** 2/2 · GATE PASSED (section-matcher probe: 0 orphans / 0 unlinked; triage hidden live; no spurious Further-commits; render path for non-empty orphans reviewed — badges(title) branch on verified badges())

*What the page gains: no linked commit ever vanishes from the drawer; triage tells the truth.*

| # | Task | Done when |
|---|------|-----------|
| 11 | Plan-wide orphan set + Further-commits groups | Every section pane repeats the identical full-plan orphan list |
| 12 | `unlinked()` matcher parity | Anchor tested against `split()` bodies; triage hides at 0 untracked |

### Task 11: Plan-wide orphan set + Further-commits groups ✓ done {#phase-3}

**Objective:** Post-done batches stay tracked instead of vanishing.
**Files:** `src/pitch/changelog-links.js` (export `orphans(file, sprints)`), `src/pitch/changelog/paint-detail.js` (second `badges()` group per pane)
**Steps:** build `seen` by unioning `hits()` over EVERY sprint (plan-level, never section-scoped); render `badges(orphans, 'Further commits')` identically in each pane.
**Verify:** node probe — orphans grouped by anchor printed; gem Phase 7 pane repeats the plan orphan list.

### Task 12: `unlinked()` matcher parity ✓ done {#phase-3}

**Objective:** Triage matches the way `hits()` matches.
**Files:** `src/pitch/changelog-links.js`
**Steps:** test anchors against each `split()` section body (same `anchorHit`), not raw file text; wip never concatenated; block hides when untracked = 0.
**Verify:** manifest reports 0 unlinked; triage block hidden on live page; `All tracked` path intact.

- REF GATE 3 (✓ PASSED · evidence 2026-10-31): orphan-by-anchor probe empty, section-matcher unlinked 0, triage hidden on live page, Further-commits correctly absent, no console errors. Verdict: PASSED.

---

## Phase 4 — Timeline tracks drawer {#phase-4}

**Status:** 4/4 · GATE PASSED (17 rows / 12 done bars / fractional today / day-independence / bar-click open + day-drop / Escape layering, all live-verified)

*What the page gains: a full-height track view with day axis, bars, and today line.*

| # | Task | Done when |
|---|------|-----------|
| 13 | Timeline shell + lanes + bars | Flush grid, one neutral + one muted-accent fill, uniform height |
| 14 | Today line + open-from-timeline | Fractional offset, scroll-into-view, day-ignoring list |
| 15 | Timeline chip in chips row | `→ All N tracks` right-aligned, pressed state is light, not accent |
| 16 | Timeline CSS contract | Flush panel vs inset title, no month bands, phone rows full-width |

### Task 13: Timeline shell + lanes + bars ✓ done {#phase-4}

**Objective:** `aside.ds-timeline` with sticky day-axis and per-plan rows beside the landing.
**Files:** new `src/pitch/changelog/timeline.js`, `src/pitch/pitch-changelog-timeline.css` (new), mount point in `src/pitch/pages-changelog.js`
**Steps:** rows carry explicit lane width; incomplete bars neutral mix, complete muted-accent mix (never raw accent); ghost/upcoming markers dashed full-height.
**Verify:** drawer opens, rows span full scroll width, screenshot.

### Task 14: Today line + open-from-timeline ✓ done {#phase-4}

**Objective:** Real-time today marker; bar clicks resolve against the day-ignoring list.
**Files:** `src/pitch/changelog/timeline.js`, `src/pitch/pages-changelog.js`
**Steps:** wash at integer floor, dotted line at fractional offset; secondary view fed its own day-ignoring list; drop day filter on explicit navigation.
**Verify:** line position moves within the day; bar click on a day-filtered-out plan opens it.

### Task 15: Timeline chip in chips row ✓ done {#phase-4}

**Objective:** `→ All N tracks` chip last, pulled right.
**Files:** `src/pitch/changelog/paint-chips.js`, `src/pitch/changelog-events.js`
**Steps:** `margin-left:auto`, hover surface, pressed light; specific `[data-*]` branch before generic chip branch.
**Verify:** chip opens timeline; Clear interplay correct.

### Task 16: Timeline CSS contract ✓ done {#phase-4}

**Objective:** Flush grid, inset title, no banding, phone-safe rows.
**Files:** `src/pitch/pitch-changelog-timeline.css`
**Steps:** aside `margin:0; padding:0` property-complete; no month background bands; ≤720 query keeps rows full-width.
**Verify:** computed-style probe + screenshots (desktop + 390px).

- REF GATE 4 (✓ PASSED · evidence 2026-10-31): 17 rows render with flush grid, 12 done bars in muted accent, today wash integer + dotted fractional (45.5607), day filter narrows cards to 5 while rows stay 17, bar click on filtered-out plan opens its detail and drops the day filter, Escape layers drawer-then-timeline. Deferred: login-gated controls (no auth on this page), schedule-deadline link (Phase 5). Verdict: PASSED.

---

## Phase 5 — Due scheduling lane {#phase-5}

**Status:** 3/4 · GATE OPEN (Tasks 17–19 live-verified; Task 20 code-complete, live verification blocked on owner secrets `DUE_AUTHOR` + `DUE_TOKEN`)

*What the page gains: deadlines set from the drawer and persist across refresh and devices.*

| # | Task | Done when |
|---|------|-----------|
| 17 | Shared matcher + dev write endpoint | `POST /__ds/due` edits plan section; single shared core |
| 18 | applyDue persistence | Ghost preview + localStorage override + drawer survival across reload |
| 19 | Drawer + calendar affordances | `Add deadline` / `Deadline · date`, due dots, Due-day filtering |
| 20 | Server commit endpoint | `api/due.js` allow-listed; needs `DUE_AUTHOR` + `DUE_TOKEN` from owner |

### Task 17: Shared matcher + dev write endpoint ✓ done {#phase-5}

**Objective:** Client preview, server lookup, and send-time resolution import one core.
**Files:** new shared `src/pitch/changelog/due-core.js`, `vite.config.js` (`ds-due-writer`, configureServer + configurePreviewServer only)
**Steps:** normalize + exact + single-candidate fuzzy in one module; lock to plan filenames (no traversal).
**Verify:** curl POST edits a section Due on dev; static build unaffected.

### Task 18: applyDue persistence ✓ done {#phase-5}

**Objective:** Optimistic synchronous apply with background commit and reload survival.
**Files:** `src/pitch/changelog/paint-detail.js` (affordance), events wiring, drawer state snapshot on `beforeunload`
**Steps:** preview + override at click, `Saving…` narrative → `synced ✓`; drawer state in sessionStorage; file wins over stale overrides.
**Verify:** set → refresh keeps date; drawer reopens where it was.

### Task 19: Drawer + calendar affordances ✓ done {#phase-5}

**Objective:** Deadline copy convention everywhere.
**Files:** paint-detail.js, graph.js, pages-changelog.js predicates
**Steps:** empty `Add deadline`, set `Deadline · <date>`; calendar due dots as real filter buttons; day predicate matches section Due dates.
**Verify:** future-Due day filters to the plan (non-empty list).

### Task 20: Server commit endpoint {#phase-5}

**Objective:** Production writes via allow-listed server commit.
**Files:** new `api/due.js`
**Steps:** caller OAuth token as identity proof, `DUE_AUTHOR` allow-list, server-side PAT; one change = one commit. **Blocking input:** owner must supply `DUE_AUTHOR` (login) and provision `DUE_TOKEN` (Contents read+write, repo-only) — one ask, exact values.
**Verify:** end-to-end pick → redeploy carries value; poll-then-confirm lifecycle per skill references.

- REF GATE 5 (OPEN · evidence 2026-10-31): due-core 8/8 cases, endpoint guards (shape/traversal/head-404) + set/clear net-zero via curl, full page loop (Add deadline → Saving → reload → Deadline · date + future hollow dot + due-day filter → 1 card), drawer snapshot restores across reload, api/due.js written + syntax-checked. BLOCKED: live redeploy verification needs `DUE_AUTHOR` (GitHub login) + `DUE_TOKEN` (fine-grained PAT, Contents read+write, repo-only) as Vercel env — owner supplies or defers Task 20. Verdict: OPEN.

---

## Phase 6 — Verify + close {#phase-6}

**Status:** 0/2 · GATE OPEN

| # | Task | Done when |
|---|------|-----------|
| 21 | Full verification matrix | Tracker ×2 stable, tests + build green, browser passes, CSS parity |
| 22 | Commit per phase + close | Each phase trailered, manifest synced untrailered, tree clean |

### Task 21: Full verification matrix {#phase-6}

**Objective:** Prove every surface before claiming done.
**Files:** none (read-only probes)
**Steps:** `ds-track` twice (timestamp preserved); `npm test`; `npm run build`; browser: every card → rail → detail, filters × day × status, timeline open, Escape/scrim, 390px pairwise-rect probe = 0; `grep var(--sp-spacing` on changelog chunk = 1 root-only; dist vs local CSS byte-compare recipe.
**Verify:** all green with attached evidence; stash-compare any test failure (only NEW failures count).

### Task 22: Commit per phase + close {#phase-6}

**Objective:** Traceable landing, clean tree.
**Files:** commits only + plan status lines
**Steps:** stage explicit paths only (never `-A`); one commit per phase with `[plan:<file>#{#phase-N}]` trailer; manifest-only syncs untrailered; mark `✓ done` in task headings in place (never append phantom headings); `buildState` reads complete; end with `git status` clean.
**Verify:** every `✓ done` sha resolves in `git log` with its trailer; no `## Phase`/`## Task` mixing; fractions full.

- REF GATE 6 (OPEN → ship): matrix green + owner screenshot sign-off per phase.

---

## File map

| File | Phases |
|------|--------|
| `src/pitch/changelog-parse.js` (append-only exports) | 1, 2 |
| `src/pitch/changelog-links.js` | 3 |
| `src/pitch/changelog/paint-plan.js` | 1, 2 |
| `src/pitch/changelog/paint-detail.js` | 1, 2, 3, 5 |
| `src/pitch/changelog/paint-chips.js` | 1, 4 |
| `src/pitch/changelog/graph.js` | 5 |
| `src/pitch/pages-changelog.js` | 1, 4 |
| `src/pitch/changelog-events.js` | 1, 4, 5 |
| `src/pitch/changelog/timeline.js` + `src/pitch/pitch-changelog-timeline.css` (new) | 4 |
| `src/pitch/changelog/due-core.js` + `api/due.js` (new), `vite.config.js` | 5 |
| `design-system/tokens.css` (read-only — confirm danger token) | 1 |

## Pitfalls

- DONE is authored, never derived — gate verdicts and status reflect head marks only.
- Display policy never rewrites shared parse semantics — new view helpers over existing `state()`/`isDone()`, never widen them.
- Hash drift: `parseGates`/`planStatus` additive only; probe `hash(live)` per section before/after.
- Never `amend`/`reset` — post-commit manifest regen commits forward untrailered.
- `graphData*.js` timestamp churn restores, never commits (check `NODES|EDGES|GROUPS` first).
- Delegated clicks: specific `[data-*]` branches before generic class branches, every handler.
- One tab, one `browser_exec` session for a verification run; `goto_url` re-navigate instead of reload; device metrics set inside each probe call; :5173 is the owner's — temp preview on spare ports only.
- UI copy greps the test tree first (regression suites pin labels).

## Execution map

| Phase | Mode | Depends on |
|-------|------|------------|
| 1 Status + drawer | direct, sequential | — |
| 2 Gates + evals | direct, sequential | 1 (verdict tags share status treatment) |
| 3 Orphans + triage | direct, sequential | 2 (pane structure) |
| 4 Timeline drawer | direct, sequential | 1 (chip row + filter interplay) |
| 5 Due scheduling | direct, sequential; Task 20 blocked on owner secrets | 2 (drawer), 4 (due dots) |
| 6 Verify + close | parent | 1–5 |

*No parallel lanes: single live tree + running dev server; sibling-write hazard outweighs fan-out on a 1.2k-line surface.*
