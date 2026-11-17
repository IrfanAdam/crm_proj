# Mobile perf parity — desktop smoothness on a phone

**Goal:** The Alphas prototype runs on a mobile browser as smooth as on desktop, with zero visual change.
**Architecture:** Six file-disjoint workstreams (load path, glass compositing, WebGL/motion, interaction, CSS paint budget, measurement harness) landed as one build; every edit gated by a pixel oracle and a throttled mobile trace.
**Tech Stack:** Vite 5 MPA, vanilla CSS/JS + React 19 islands, three.js rigs, DTCG tokens; headless-Chrome CDP harness (`ws`).
**Tags:** Performance, Mobile, Design System

*Eval record (baseline numbers, lane roster, decision log, resume protocol): `.hermes/evals/2026-11-16-mobile-perf-parity/README.md` — read it before touching this build.*

---

## Phase 1 — Load path: stop blocking the parser {#phase-1}

*Tags: Performance, Mobile*

*2026-11-16 · On a phone the first paint waits on a third-party CDN round-trip for `three.min.js` plus 24 unminified classic gem scripts served raw out of `dist/src/` — 25 parser-blocking requests before the app bundle even executes. Bundle what the app boots with; defer what it does not.*

| # | Task | Done when | Overall |
|---|------|-----------|---------|
| 1 | Vendor `three.min.js` out of cdnjs into `public/vendor/` and load it deferred | `dist/` has zero `https://cdnjs.` references; three.js is same-origin and non-blocking | shipped |
| 2 | Collapse the 22 classic GemReward scripts into one deferred asset with order preserved | one request, deferred, `window.GEM_CUT`/`GEM_RIG`/`GEM3D` globals identical at run time | shipped |
| 3 | Preload the module entry + font `display=swap` + preconnect cleanup | no `document.write`-class blocking; LCP not gated on CSS/JS | shipped |

## Phase 2 — Glass compositing: fewer, cheaper backdrop layers {#phase-2}

*Tags: Performance, Glass*

*2026-11-16 · Fullscreen mobile paints a progressive-blur edge stack plus a liquid dock lens (`backdrop-filter` on stacked spans carrying `will-change`), a FAB gem lens and two glass bars — the most expensive thing the compositor does every scroll frame.*

| # | Task | Done when | Overall |
|---|------|-----------|---------|
| 4 | Right-size the edge-material layer stack; drop `will-change` on permanently-animating spans | layer count and per-layer blur radius measured before/after; pixels identical | shipped |
| 5 | De-duplicate dock lens / band / fab glass into one backdrop surface each | no nested `backdrop-filter` inside a filtered ancestor | pending |
| 6 | Contain every glass island (`contain: paint` / `isolation`) so a blur cannot force a full-page repaint | trace shows no full-page paint during scroll | shipped |

## Phase 3 — Runtime: WebGL and motion loops {#phase-3}

*Tags: Performance, WebGL*

*2026-11-16 · `gem3d` calls its rig `size()` — a forced layout read — inside the render loop, and every rig paints at DPR 2 with antialias on, whether or not the device can afford it.*

| # | Task | Done when | Overall |
|---|------|-----------|---------|
| 7 | Hoist per-frame rect/layout reads out of the gem loop | zero `getBoundingClientRect`/`clientWidth` reads inside `requestAnimationFrame` callbacks | shipped |
| 8 | Gate rig quality on device capability, not just `prefers-reduced-motion` | mobile trace frame time at parity with desktop; no visible softening at 1× | pending |
| 9 | One shared rAF clock; offscreen and hidden-tab rigs fully parked | no more than one rAF loop alive per visible surface | shipped · rev 3: the gem rig now arms from its own `ResizeObserver` like the other three, so the park contract is symmetric (lane I) |

## Phase 4 — Interaction: scroll and pointer handlers {#phase-4}

*Tags: Performance, Interaction*

*2026-11-16 · The feed scroll handler, elastic scroll and pointer tilt paths re-measure geometry on every event; on a phone that is the difference between 60 fps and 30.*

| # | Task | Done when | Overall |
|---|------|-----------|---------|
| 10 | Cache geometry per scroll frame instead of per event | scroll trace shows 0 forced reflow events | shipped · rev 3: dock-mirror reads measured at **4.92 → 0.00 `getBoundingClientRect`/frame** (lane B) |
| 11 | Mark every non-cancelling listener passive; move work off the event tick | no long task over 50 ms during a scripted scroll | shipped · rev 3: **done-when not met** — 33 → 16 long tasks (§4c of the eval record), 17 per pass even under `?dock=lean`. The listener work landed; the bar did not |

## Phase 5 — CSS paint budget {#phase-5}

*Tags: Performance, CSS*

*2026-11-16 · 119 `box-shadow` declarations and no `content-visibility` anywhere — offscreen feed cards and sheets paint every frame.*

| # | Task | Done when | Overall |
|---|------|-----------|---------|
| 12 | `content-visibility: auto` + `contain-intrinsic-size` on offscreen feed/sheet lists | paint count during scroll drops; layout height unchanged | ✗ reopened (rev 3) — `grep -r content-visibility src/` and `git log -S content-visibility -- src/` are both empty. What did land is `contain:` (10 declarations in `src/`), audited rule by rule by lane E — a different property |
| 13 | Collapse shadow stacks that paint the same pixels | computed shadow values unchanged or visually identical in the pixel gate | ✗ cancelled — lane E measured every stack; none collapses without weakening the shadow |

## Phase 6 — Gate: measure and prove no visual change {#phase-6}

*Tags: Performance, Verification*

*2026-11-16 · A perf build with no measurement is a guess, and a perf build that shifts pixels is a regression.*

| # | Task | Done when | Overall |
|---|------|-----------|---------|
| 14 | Frozen mobile + desktop still set from HEAD serves as the pixel oracle | every post-change still diffs ≤0.05 % of pixels at ≤1/255 | shipped |
| 15 | Throttled mobile trace (4× CPU, 393×852 DPR 3) recorded before and after | long tasks, frame time and TBT reported as before → after numbers | shipped |

---

## Gate · rev 2 — deep batch (2026-11-17) {#rev-2}

Same build, second pass. Seven lanes off one checkpoint (`b97b1de`), reports `lane-A…G` in the eval dir.

| What | Result |
|---|---|
| Icon/library boot cost | **−62.4 % JS on cold load, ScriptDuration 16.7 s → 1.67 s, fullscreen 17.0 s → 1.6 s** — glyphs byte-identical; `@phosphor-icons/react` out of the import graph (lane C) |
| Dock mirror layout reads | **295 → 0 gBCR per 60-frame scroll**, RecalcStyleCount −32 % (lane B) |
| Edge material (+55 % claim) | **does not reproduce**; deleting the entire stack = 0 ± 4 %. Nothing landed. (lane D) |
| Containment audit | every rule re-checked, `transition: all` → explicit lists in **18 files / 25 declarations**, no shadow collapses (lane E) |
| Dock decision | costed: **35.5 % of dock pixels ≤81/255 (rim bevel only) for −63 % main-thread / −36 % frame time** behind `?dock=lean` (lane F) |
| Independent audit | 13 claims: 8 PASS, 3 magnitude-wrong, 1 count-wrong, 1 PARTIAL — corrections in eval README §4c (lane G) |
| Deterministic pixel gate | lane A still running at commit; harnesses preserved in `eval/tools/` |

**Blocked on one owner decision:** the dock's refracted rim. Keep it → parity stays out of reach.
Drop it → mobile gets ~⅓ of its frame time back for a change confined to the rim bevel.

---

## Gate · rev 3 — batch 3: close the loop (2026-11-17) {#rev-3}

Third pass, before the batch-2 commit. Five lanes with reports (`lane-C2.md`, `lane-H.md`, `lane-I.md`,
`lane-J.md`, `lane-K.md`) plus the gate lane finished by the parent (`lane-A.md`) after three attempts died
mid-run — every row below has a report behind it. **Shipped in `70367e7`** (one commit, generated
artifacts and plan-history included — no satellite `chore(ds)` commit).

| What | Result |
|---|---|
| Dead dependency | `src/components/Icon/gem-icons.js` deleted (88 lines, zero importers), `@phosphor-icons/react` out of `package.json` + lock (13 lock lines, nothing else) — `npm ci` exit 0, entry chunk **362 571 raw / 112 762 gz unchanged**, all **361** dist files byte-identical, 6/6 icon×weight markup snapshots identical (lane C2) |
| Defect: map rotation | `live-map.js:32` called the plugin-only `map.setBearing` unguarded — it throws before `L.tileLayer()`, so the map silently loses tiles. Now capability-guarded (bearing preserved, degrades to north-up). The audit's *standing* console error **did not reproduce** either dev or `dist` (lane H) |
| Defect: dead focus ring | `outline: var(--focus-ring)` is invalid — that token is a box-shadow, so `outline-style` computed to `none` and **4 `:focus-visible` sites had no keyboard ring**. Real rings restored (`reward-sheet.css:37`, `overlay-menu.css`, `overlay-base.css`, and `pitch-changelog.css:66` by the parent): **486 / 872 / 318 px** of ring that was not there, **0 px** change at rest (lane H) |
| Tooling hardening | `lint:tokens` returned a **false green** on a `git archive` / no-`.git` tree (0 files enumerated, exit 0). Now: walk fallback, hard **exit 2** naming cause + cwd, and a green run prints its file count (lane I) |
| Runtime hardening | `gem-rig.js` now arms from its own `ResizeObserver` like deck3d/cube3d/illusion3d — a restored box goes **0 → 57 rAF/s** with `t` resuming, where it previously stayed silently dead (lane I) |
| Gate hardening | `gate.mjs` 8 932 → 18 579 B: `--strict` (0 differing px), `--noise/--noise-max/--noise-px` (named raster noise), `--capture-only`; `deterministic.mjs` 40 153 → 52 848 B with per-surface freeze assertions. **Now green and synced into `eval/tools/`** — where it resolves its oracle dir from `tools/oracle/` or `<cwd>/.hermes/tmp/perf-mobile/oracle`, so it runs standalone. **15 / 16 rows byte-identical** at `--strict` across two independent launches; the 16th differs 30 px / maxΔ 21 and is proved edge AA (IoU 0.99954, identical bbox). It **cannot** certify against `6b6b828` — that oracle predates the freeze protocol and is refused. `lane-A.md` |
| Artifact regen | `map-graph` (266 modules / **222 edges** / 0 cycles) → `gen:atlas` (46/16) → `gen:mechanics` (15/19/13) → `ds:track`, nothing hand-edited: `docs/graph.mmd` **+102/−9** and the stale `Icon → gem-icons.js` edge gone from the `.mmd`, `atlas.json` and every `graphData*`; `atlas.json`/`graphData*` changed in **metadata only**; `changelog` wip 31→37; `plan-history` +148 lines → **341 revs**. Verifiers: `verify:atlas` **fresh**, `verify:mechanics` **fresh**, `lint:tokens` 0 leaks / **1 758 files**, `plan-names` 22/22, `npm test` **197 assertions, 0 failures** (`lane-J.md`) |
| Independent audit of batch 3 | from a snapshot: build exit 0, `dist/index.html` 4 script tags, **0** classic without `defer`, entry **486 578 → 362 552 B (−124 KB)**; **9 MPA pages, error sets identical to `b97b1de`**; dock glyphs 24×24 with all 6 `d` strings **byte-identical to the real `@phosphor-icons/react@2.1.10`** (installed and diffed); gem live WebGL2; **0** raw hex/rgb on added lines across 21 CSS files. Three claims downgraded rather than smoothed over: `setBearing` does not actually throw, `dist/src/` still carries 27 gem files for the other pages, focus rings runtime-proven on 1 of 4 sites (`lane-K.md`) |

**Task status after rev 3** — only what the reports actually support:

- **9 — done.** The park contract is now symmetric across all four rigs (was: gem revived only by the
  intersection observer firing again).
- **10 — done, measured.** Dock-mirror `getBoundingClientRect` went **4.92 → 0.00** per scroll frame;
  RecalcStyleCount 182 → 123 (lane B).
- **12 — reopened.** No `content-visibility` in `src/` at any commit; the task was marked shipped but the
  tree never carried it.
- **11 — shipped, done-when not met.** The listener work landed, but "no long task over 50 ms during a
  scripted scroll" is false on both sides: **33 → 16** long tasks (§4c), 17 per pass even under `?dock=lean`.
  Not a regression — the bar was never reached.
- **14 — done, with a stated limit.** The gate exists, is hardened, and is preserved under `eval/tools/`
  (it lost its scripts to the gitignored scratch dir on an earlier attempt). It proves **the tree is stable**
  (15/16 rows byte-identical) and **a same-session change moved nothing**. It does *not* prove "HEAD looks
  like `6b6b828`" — no frozen capture of that commit exists, and the legacy `base` oracle is refused for
  that reason. An absolute statement needs `git archive 6b6b828` served and captured with this harness.
- **15 — done.** Throttled 4× CPU, 393×852 DPR 3 traces recorded before and after; frame time, long tasks
  and TBT reported as before → after numbers in the eval README §5c, with the host-load caveat.
- **5, 8 — still pending.** Task 5's honest alternative is lane F's `?dock=lean` trade, which is a design
  decision, not a CSS dedupe. Task 8 (capability-gated rig quality) was never started.
- **13 — confirmed cancelled.** Lane E's shadow census: no repeated card declares a shadow at all.
- **1–4, 6, 7 — unchanged** from rev 2.

**Closure state:** the load path the plan set out to fix is closed (25 parser-blocking scripts → 0, and the
6.2 MB icon dependency is gone from both the graph and the manifest). The eval's parity target is still open
on the dock material decision — see eval README §5d and §7. Landed in **`70367e7`**.

**One tooling defect found while closing** and fixed here: `scripts/plan-auto-link.mjs` only looked for an
existing `[plan:…]` tag on the *subject* line, so a commit whose trailer sat in the body got a second tag
appended — and `resolvePlan()` returns the heading's braced id (`{#phase-6}`), which the plugin then
prefixed with `#`, producing the malformed `#{#phase-6}` now visible on `70367e7`. Both are fixed and
falsified: a body-cited message is left untouched, an untrailed one gets a clean `#phase-6`.

**Correction to that correction:** `ds-track` links on `%s`, so "body already cites the plan → leave the
subject alone" left `7b0ddcd` **unlinked** (522 commits, 521 linked). The hook now **promotes** a body
trailer onto the subject instead of skipping. `7b0ddcd` stays the one unlinked commit — fixing it would
mean rewriting published history, which this repo does not do. Verified after the fix: promotion, clean
auto-link, and merge pass-through all behave, and `ds-track` returns to full linkage.
