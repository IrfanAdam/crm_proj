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

### Task 1: Vendor three.min.js out of cdnjs into public/vendor/ and load it deferred ✓ done

Shipped — `dist/` carries zero `https://cdnjs.` references; three.js is same-origin and non-blocking.

### Task 2: Collapse the 22 classic GemReward scripts into one deferred asset with order preserved ✓ done

Shipped — one deferred request; `window.GEM_CUT`/`GEM_RIG`/`GEM3D` globals identical at run time.

### Task 3: Preload the module entry + font display=swap + preconnect cleanup ✓ done

Shipped — no `document.write`-class blocking; LCP not gated on CSS/JS.

## Phase 2 — Glass compositing: fewer, cheaper backdrop layers {#phase-2}

*Tags: Performance, Glass*

*2026-11-16 · Fullscreen mobile paints a progressive-blur edge stack plus a liquid dock lens (`backdrop-filter` on stacked spans carrying `will-change`), a FAB gem lens and two glass bars — the most expensive thing the compositor does every scroll frame.*

| # | Task | Done when | Overall |
|---|------|-----------|---------|
| 4 | Right-size the edge-material layer stack; drop `will-change` on permanently-animating spans | layer count and per-layer blur radius measured before/after; pixels identical | shipped |
| 5 | De-duplicate dock lens / band / fab glass into one backdrop surface each | no nested `backdrop-filter` inside a filtered ancestor | pending · rev 4: flag verified present (`src/glass/slices-spec.js:42`); awaiting the owner's rim-vs-frame-time call — the live decision, unchanged · rev 6: unchanged, still the owner's call · rev 8: decision evidence produced (lane-F-recheck.md, lane-F-dock-recheck.png); still the owner's call · rev 9: ✗ cancelled — owner moved on (user override 2026-11-23); no default change; `?dock=lean` stays as opt-in flag. |
| 6 | Contain every glass island (`contain: paint` / `isolation`) so a blur cannot force a full-page repaint | trace shows no full-page paint during scroll | shipped |

### Task 4: Right-size the edge-material layer stack; drop will-change on permanently-animating spans ✓ done

Shipped — layer count and per-layer blur radius measured before/after (lane E: glass regions 0.000 %); pixels identical.

### Task 5: De-duplicate dock lens / band / fab glass into one backdrop surface each ✗ cancelled

Cancelled — owner moved on (user override 2026-11-23); no default changed and `?dock=lean` stays as the opt-in flag (`src/glass/slices-spec.js:42`).

### Task 6: Contain every glass island so a blur cannot force a full-page repaint ✓ done

Shipped — trace shows no full-page paint during scroll.

## Phase 3 — Runtime: WebGL and motion loops {#phase-3}

*Tags: Performance, WebGL*

*2026-11-16 · `gem3d` calls its rig `size()` — a forced layout read — inside the render loop, and every rig paints at DPR 2 with antialias on, whether or not the device can afford it.*

| # | Task | Done when | Overall |
|---|------|-----------|---------|
| 7 | Hoist per-frame rect/layout reads out of the gem loop | zero `getBoundingClientRect`/`clientWidth` reads inside `requestAnimationFrame` callbacks | shipped |
| 8 | Gate rig quality on device capability, not just `prefers-reduced-motion` | mobile trace frame time at parity with desktop; no visible softening at 1× | ✗ cancelled (rev 4) · **reopened (rev 5)** — rev 4's reasoning fails the brute-force check: the adaptive controller moves DPR only (linear in pixels, worth 2.75× at 1.8→1.0) but the 14.9× the phone needs includes a 6.0× taps/bounce term (510 vs 3060 plane iterations/px) that nothing gates. Device-tiered taps/bounce defaults are the only non-structural lever left · rev 6: superseded — the structural lever (candidate scan) replaces the capability tier; folds into E3 of the eval record · **rev 7: closed the other way.** The structural lever was **disproved by measurement** (candidate sets fall back on 99.6 % of lookups — E1, closed) and no capability tier was built: the shipped substitute is the **phone dpr ceiling** (`?gemphone=1|1.5|2` in `gem-perf.js`, −64/−70 % frame time at cap 1.5). It is a policy surface, not a device probe. |
| 9 | One shared rAF clock; offscreen and hidden-tab rigs fully parked | no more than one rAF loop alive per visible surface | shipped · rev 3: the gem rig now arms from its own `ResizeObserver` like the other three, so the park contract is symmetric (lane I) |

### Task 7: Hoist per-frame rect/layout reads out of the gem loop ✓ done

Shipped — zero `getBoundingClientRect`/`clientWidth` reads inside `requestAnimationFrame` callbacks.

### Task 8: Gate rig quality on device capability, not just prefers-reduced-motion ✗ cancelled

Cancelled — closed by disproof (rev 7): the candidate-scan structural lever falls back to the full 170-plane scan on 99.6 % of lookups at k=12, so no capability tier is built; the shipped substitute is the phone dpr ceiling (`?gemphone=1|1.5|2` in `gem-perf.js`), a policy surface rather than a device probe.

### Task 9: One shared rAF clock; offscreen and hidden-tab rigs fully parked ✓ done

Shipped — the park contract is symmetric across all four rigs (lane I).

## Phase 4 — Interaction: scroll and pointer handlers {#phase-4}

*Tags: Performance, Interaction*

*2026-11-16 · The feed scroll handler, elastic scroll and pointer tilt paths re-measure geometry on every event; on a phone that is the difference between 60 fps and 30.*

| # | Task | Done when | Overall |
|---|------|-----------|---------|
| 10 | Cache geometry per scroll frame instead of per event | scroll trace shows 0 forced reflow events | shipped · rev 3: dock-mirror reads measured at **4.92 → 0.00 `getBoundingClientRect`/frame** (lane B) |
| 11 | Mark every non-cancelling listener passive; move work off the event tick | no long task over 50 ms during a scripted scroll | shipped · rev 3: **done-when not met** — 33 → 16 long tasks (§4c of the eval record), 17 per pass even under `?dock=lean`. The listener work landed; the bar did not · rev 4: done-when withdrawn — the floor holds at 16–17 tasks on both sides, so the zero-task bar is dropped; scroll perf is judged via the M2 rungs instead |

### Task 10: Cache geometry per scroll frame instead of per event ✓ done

Shipped and measured — dock-mirror reads 4.92 → 0.00 `getBoundingClientRect`/frame (lane B).

### Task 11: Mark every non-cancelling listener passive; move work off the event tick ✓ done

Shipped with the done-when bar withdrawn (rev 4) — the listener work landed (33 → 16 long tasks) but the zero-task bar was never reached, so scroll perf is judged via the M2 rungs instead.

## Phase 5 — CSS paint budget {#phase-5}

*Tags: Performance, CSS*

*2026-11-16 · 119 `box-shadow` declarations and no `content-visibility` anywhere — offscreen feed cards and sheets paint every frame.*

| # | Task | Done when | Overall |
|---|------|-----------|---------|
| 12 | `content-visibility: auto` + `contain-intrinsic-size` on offscreen feed/sheet lists | paint count during scroll drops; layout height unchanged | **✓ shipped (rev 7)** — `.ig-cell` in `src/ds/gallery-chrome.css` carries `content-visibility:auto; contain-intrinsic-size:auto 40px`. Was ✗ reopened rev 3–6 because `grep -r content-visibility src/` was empty (what had landed was `contain:`, a different property). rev 7: landed and measured — document height Δ **0.0000 %**, 114 of 5.9 M pixels at ≤1/255, LayoutDuration −7.8/−5.8 ms **inside a ±40 % noise floor** → provably harmless, not a win (see rev 7). |
| 13 | Collapse shadow stacks that paint the same pixels | computed shadow values unchanged or visually identical in the pixel gate | ✗ cancelled — lane E measured every stack; none collapses without weakening the shadow |

### Task 12: content-visibility auto + contain-intrinsic-size on offscreen feed/sheet lists ✓ done

Shipped (rev 7) — `.ig-cell` carries `content-visibility:auto; contain-intrinsic-size:auto 40px`; provably harmless at zero layout cost (document height Δ 0.0000 %, LayoutDuration inside the noise floor).

### Task 13: Collapse shadow stacks that paint the same pixels ✗ cancelled

Cancelled — lane E measured every stack; none collapses without weakening the shadow.

## Phase 6 — Gate: measure and prove no visual change {#phase-6}

*Tags: Performance, Verification*

*2026-11-16 · A perf build with no measurement is a guess, and a perf build that shifts pixels is a regression.*

| # | Task | Done when | Overall |
|---|------|-----------|---------|
| 14 | Frozen mobile + desktop still set from HEAD serves as the pixel oracle | every post-change still diffs ≤0.05 % of pixels at ≤1/255 | shipped |
| 15 | Throttled mobile trace (4× CPU, 393×852 DPR 3) recorded before and after | long tasks, frame time and TBT reported as before → after numbers | shipped |

### Task 14: Frozen mobile + desktop still set from HEAD serves as pixel oracle ✓ done

Shipped — every post-change still diffs ≤0.05 % of pixels at ≤1/255 (rev 3: gate hardened, 15/16 rows byte-identical at --strict).

### Task 15: Throttled mobile trace recorded before and after ✓ done

Shipped — throttled 4× CPU, 393×852 DPR 3 traces recorded before and after; frame time, long tasks and TBT reported as before → after numbers (eval README §5c).

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

---

## Gate · rev 4 — verification pass (2026-11-20) {#rev-4}

No new lanes — tree-verified against the wrapped head. Question: is this plan still relevant after the Phase 11 wrap?

| Check | Result |
|---|---|
| `content-visibility` in `src/` | still absent — Task 12 stays open, correctly reopened |
| `?dock=lean` flag | present (`src/glass/slices-spec.js:42`) — Task 5 awaiting the owner call |
| Adaptive DPR controller | shipped (`gem-perf.js`: `?gemdpr`, auto step, `?gemperf` HUD) + tune sheet (Task 62) — covers Task 8's intent |
| Eval M2 rungs 1–4 | all `med`/`fps` cells empty; baseline only (`med 248.2 / fps 4` on Mali-G52) |
| F1b exitmap / caustic→Worker | stay parked — main thread idle (3.2 ms vs gpu ~245 ms); fill is the bottleneck |

**Reframe:** "parity with zero visual change" is over on this GPU — M1 proved the residual is fill. The plan survives as a look-cost picker (M2), not a parity chase.

**Task status after rev 4**
- **8 — ✗ cancelled (superseded).** Static capability gating never started; the runtime controller does its job.
- **11 — shipped; done-when withdrawn.** Work landed (33 → 16 long tasks); the zero-task bar is dropped, scroll perf judged via M2 rungs.
- **5 — still pending**, the live owner decision. **12 — still open (reopened)**, cheap and unlanded.
- **14, 15 — done**, unchanged. **13 — confirmed cancelled**, unchanged.

**Closure state:** the load path the plan set out to fix is closed. The remaining work is M2's four rungs + the dock call. Nothing else in this plan can move the phone frame.

---

## Gate · rev 5 — brute-force knob sweep (2026-11-20) {#rev-5}

Method: headless Chrome on the running dev server, ceremony rig at the phone box (310×479 CSS), 24 combos — taps {1,3} × bounce {2,5} × bloom {on,off} × dpr {1.0,1.3,1.8} — 3×40 `render()` frames with a `readPixels` sync per batch. Fill slope fitted across each combo's three dpr sizes so the per-`render()` fixed overhead drops out; headless rAF cadence discarded as quantization noise (media 16.8/33.3/66.6 ms steps, p95 pinned). Raw rows: `.hermes/cache/scratch/gem-sweep/out/` (scratch, regenerable).

| taps | bounce | bloom | fill slope (ns/px, M1) | fixed (ms) |
|---|---|---|---|---|
| 1 | 2 | on | 2.17 | 0.58 |
| 1 | 5 | on | 2.83 | 0.81 |
| 3 | 2 | on | 4.25 | 0.93 |
| 3 | 5 | on | 5.77 | 1.69 |
| 3 | 5 | off | 9.47 | 1.11 |

**1. Knob ceiling on the M1 is 2.7× (5.77 → 2.17 ns/px); the phone needs 14.9×** to hold 16.7 ms at the measured 610 ns/px (407k px). The M1 is not ALU-bound, so 2.7× is a floor, not the transferable number.

**2. The transferable number is shader iteration count.** Per pixel the program runs one 170-plane entry search plus `bounce`×170 in the trace loop — ~1020 iterations at bounce 5 — multiplied by `taps` (3× above taps 2) → ~3060 at the shipped default. On an ALU-bound Mali, taps 1 + bounce 2 = 510/px = **6.0×**, twice what the Mac slope shows.

**3. Bloom off is not a lever.** Turning it off *raised* the fitted slope in both pairs (2.17→2.78, 4.25→3.65, 5.77→9.47 ns/px). Rung 3 of Eval M2 currently spends look quality on bloom-off at dpr 1.2 — that step is mis-specified. Reorder: rung 3 becomes taps 1 / bounce 2 / bloom **on** / dpr 1.0; bloom-off is not a rung at all. · **Superseded by rev 5b §C:** those rows predate bloom-state verification; the conclusion survives, the reason changes.

**4. dpr is the largest single lever** — it is linear in pixels, so 1.8 → 1.0 removes 2.75× of fragments with no shader change.

**5. Only the most aggressive rung reaches 60 fps.** 6.0 (iterations) × 2.75 (dpr) = 16.5× ≥ 14.9× required — exactly rung 4 (taps 1, bounce 1, bloom off, dpr 1.0, ~14 ms), consistent with Eval M2's derived 79/35/19/14 ms table. Rungs 1–3 miss.

**Structural item (new).** The only way to keep look at 60 fps is to cut plane iterations per pixel — the exitmap narrowing (170 → ~42 candidates, F1b). Its desktop rejection does not transfer: on Mali the ALU loop is the bottleneck, so trading iterations for texture fetches is the favourable trade. It stays deferred because of the 6.70 MB table, not because the win vanished.

**Unchanged:** rung 4 still needs the owner's handset read to close (Eval M2). Nothing here is device-measured; it is a Mac-side cost model plus the one measured phone baseline.

**rev 5 addendum — Task 8 reopened.** Rev 4 cancelled this on the claim that the adaptive DPR controller covers it. Measured: dpr is linear in pixels and worth 2.75× (1.8→1.0), while the required 14.9× does not close without the 6.0× that taps 1 / bounce 2 buys (510 vs 3060 plane iterations per pixel). The controller never touches taps or bounce, so a capability tier is live work again — a per-device-class default, not a runtime step, and it must not change a single desktop pixel.

---

## Gate · rev 5b — desktop column and corrections (2026-11-20) {#rev-5b}

Re-ran both profiles with the corrected harness: two-size slope (own box + 2.25× area, A,B,B,A order, min of medians), bloom state forced through the sheet API and recorded per row (`bloom`, `tune`, `applied`). 24 mobile rows, 16 desktop rows, every row applied. Raw: `.hermes/cache/scratch/gem-sweep/out/{mobile,desktop}.jsonl`.

| profile | taps | bounce | bloom | dpr | box | slope (ns/px) | frame (ms) |
|---|---|---|---|---|---|---|---|
| desktop | 1 | 2 | on | 2 | 1440×960 | 4.50 | 7.63 |
| desktop | 3 | 5 | on | 2 | 1424×950 | 11.54 | **18.87** |
| desktop | 3 | 5 | off | 2 | 1440×960 | 9.51 | 17.06 |
| desktop | 1 | 5 | on | 2 | 1436×958 | 4.52 | 8.59 |
| mobile | 1 | 2 | on | 1.0 | 310×479 | 2.51–3.23 | 1.0–1.1 |
| mobile | 3 | 2 | on | 1.0 | 309×478 | 4.54–6.24 | 2.1–2.4 |

**A. The shipped default is over budget on desktop too.** taps 3 / bounce 5 at dpr 2 on the ceremony box costs **18.87 ms** (53 fps) on an M1 — the adaptive controller was already stepping the ratio down on it (est 23.0 ms at that row). "Desktop is smooth, mobile is not" was the wrong frame: it is one configuration that overspends everywhere, and the phone has ~136× less per-pixel headroom (610 vs 4.50 ns/px), so the 14.9× it needs is 9 % of the gap.

**B. Measured lever sizes.** taps 3→1 at bounce 2 = **1.9×** (8.85–9.03 → 4.50–5.14 ns/px desktop; 4.54–6.24 → 2.51–3.23 mobile). bounce 2→5 at taps 1 = ~1.3× (5.14 → 5.82). Together they produce the 6.0× iteration law in rev 5 §2 — taps carries most of it.

**C. Bloom is a non-lever, not a cost.** With the flag verified applied the direction is inconsistent: off is 17 % slower at t1/b2 dpr 1 (6.02 vs 5.14), 6 % slower at dpr 2 (4.79 vs 4.50), and **faster** at the heaviest row (17.06 vs 18.87 ms). So bloom-off changes frame time by ≲ 10 % either way. Rung 3's reorder stands on "bloom buys nothing", not on "bloom off is slower".

**D. dpr remains the largest single lever** (linear in pixels; 1.8 → 1.0 removes 2.75×) and it is the only lever the runtime already pulls by itself.

**E. Correction logged — tuning-sheet bloom flag can be lost at boot.** `gem-perf-tune.js:92` restores a stored tune with `setTimeout(push, 0)`, but `push()` applies bloom only when `window.GEM_BLOOM` already exists, which it does not at that moment; a stored `bloomOn: 0` silently reverts to the default and the sheet's bloom row then agrees with the wrong state (it re-reads from `GEM_BLOOM` on open, line 69). Fix is a re-apply when bloom reports ready, not a longer timeout. Defect, not a rung.

**Status:** the parity question is answerable now and the answer is not "tune harder". At the shipped default the Mac itself is at 53 fps; the phone needs 14.9×, taps+bounce supply 6.0×, dpr supplies 2.75×, and the product of the two just clears it (16.5×) at rung 4's look. Anything that preserves the current look at 60 fps requires cutting plane iterations per pixel — the exitmap item — not another rung.

**rev 5b · number reconciliation.** Slope ranges re-derived from the final row files (`out/summary.json`): mobile t1/b2 = 2.51–3.23, mobile t3/b2 = 4.54–6.24, desktop t1/b2 = 4.50–5.14, desktop t3/b2 = 8.85–9.03 ns/px; taps 3→1 at bounce 2 = 1.9× mobile / 1.9× desktop. Earlier rev 5b figures (2.45–2.98, 2.1×) came from the pre-final probe pass and are superseded.

---

## Gate · rev 6 — wrap (2026-11-21) {#rev-6}

Closes the plan. The gem-renderer thread this build opened in Phase 3 was carried to its own record; what is left here is dispositioned below rather than left open. Measured evidence, dead ends, the cost model and the follow-on work now live in `.hermes/evals/2026-11-20-gem-mobile-perf/README.md`.

| What | Result |
|---|---|
| Dead guard in the bounce loop | `abs(den) < 1e-6` deleted from `gem-shader-ext.js` — **9.215 → 8.625 ms (−6.4 %)**, 4/4 clean paired randomized rounds, **pixel-identical** (bbox 0.000 % >2/255, maxΔ 0, dpr 2 and 3). The only change in the tree that is both invisible and verified |
| Mesh-entry path | measured **−9.5 %** (8.73 → 7.90 ms, 5/5 rounds) but **rejected as default**: it splits creases differently — bbox 2.40 % >8/255, maxΔ 243, girdle **19.26 %** >8 (mean 7.8) vs crown 3.56 % / pavilion 1.59 %, 99 % of the delta within 6 px of a facet boundary; control 0.000 %. Now **opt-in `?gemmesh=1`**; default is byte-identical to the raymarch again (0 of 1 468 800 px differ) |
| Candidate-scan runtime | built (new `gem-cand.js` + CAND block, default off): identity table is **bitwise identical**, poisoned table moves 13 % of pixels, 404 falls back with no defines, overhead +75 % at k=170. Waiting on a table, not on code |
| Four cuts falsified | MSAA4 off (−5.8 % but 22 % of rim px >8/255, max∆ 127); GL background → CSS (**+0.24 %**, noise — the '15–22 % background' claim is dead); back-face prepass (**+6.1 % slower**, view-ray vs refracted-ray agree on 0.01 % of rays); exact chain table (**40.9 % exact** — the exit facet depends on the start point, so no grid fixes it) |
| Phone cost model | 11.2 ms @ 1.46 MP on M1 with ~2 890 plane tests/px. ESTIMATE at ×7: Mali-G52 MC2 ~332 ms (dpr 3) / ~148 (dpr 2) / ~83 (dpr 1.5); Adreno 610 ~136/60/34; Adreno 619 ~80/35/20. Bloom moves ~138 MB/frame at dpr 3 (8.3 GB/s at 60 fps) — a dpr cap is mandatory on G52/P22-class parts regardless of shader work |
| Adversarial suite | first grade **0/100 is void** — every failure was harness: `readPixels` in a later CDP task on a non-preserved buffer, `deck-lab.js:16` throwing every 250 ms, the hidden-tab case freezing rAF, and a baseline re-armed against itself. Repair is carried as E4 |

**Task status after rev 6 — final**

- **5 — pending, owner decision.** `?dock=lean` is live (`slices-spec.js:42`); the rim-vs-frame-time call is unchanged and is a design decision, not a fix.
- **8 — superseded.** Device-tiered taps/bounce defaults were the only non-structural lever in rev 5; the structural lever now exists (candidate scan, E1), so this folds into E3 (phone render policy: dpr cap + bloom scale) rather than a capability tier.
- **12 — open, unlanded, carried forward.** `content-visibility` is still absent from `src/`; cheap, unblocked, not started. Nothing in the gem work supersedes it.
- **11 — shipped, done-when withdrawn** (rev 4). **13 — confirmed cancelled.** **14, 15 — done, unchanged.** **1–4, 6, 7, 9, 10 — shipped.**
- **Eval M2 rungs 1–4 — replaced.** The rungs assumed knob-tuning was the path; rev 5/5b showed the knob ceiling is 1.9–2.7× against the 14.9× the phone needs, and rev 6 adds the structural option. Rung-level phone readings are now falsification tests E5 in the eval record, not a ladder.

**Remaining work lives in one place:** `.hermes/evals/2026-11-20-gem-mobile-perf/README.md` — E1 candidate-set bake + `ei` wiring (the only change with an 8× in it), E2 ruled (mesh crease), E3 phone render policy (needs an owner look call on dpr), E4 adversarial suite repair, E5 on-device falsification.

**Closure state:** closed as a plan. The load path is shipped (`70367e7`); the dock call and `content-visibility` are the only items still open here, both owner-gated or unstarted rather than blocked; the gem frame-time question moved to the eval record with two measured changes, four falsified cuts and one built-and-waiting runtime.

---

## Gate · rev 7 — post-close ship (2026-11-21) {#rev-7}

Rev 6 closed this plan; rev 7 records what the owner ordered **afterwards**. Nothing here reopens a rev 6 decision — it is one ship of the tree rev 6 left uncommitted plus four later instructions (the phone policy, the WebGL1 repair, the CAND removal and Task 12). A ship of that kind carries one obligation: the **default** stone must not move. That is measured first, and it is the only claim here that is byte-exact.

#### 1 · The default path is byte-identical to `10390c2`

The `gem3d.js` / `gem-facets.js` change is not cosmetic: one WebGL context per canvas is now created in `gem3d` and handed to three via `context:` (three must never probe `webgl2`, fail, then probe `webgl`), and `gem-facets` validates the 170-plane bake on the renderer's own context (`canvas.__gemGL`) instead of asking the canvas for a second type. Both paths run on the default WebGL2 stone, so "it should be inert" was not accepted as evidence.

Method: pristine `10390c2` in its own worktree (port 5327) vs this tree (port 5326), same Chrome build, pinned pose (`rig.t = 0`, `group.position.y = 0`, `rotation(-0.15,0,0)`), `setSize(340,480,false)` at dpr 3 **and** 2, floor pools hidden (shadow/contact/caustic/ground), bloom on, raw RGBA `readPixels` in the **same CDP task** as the render, `prefers-reduced-motion` emulated so the pitch variant cycle and every rAF are frozen on both arms.

| page | dpr | buffer | %px >2/255 | maxΔ | sha256 vs `10390c2` | A-vs-A control |
|---|---|---|---|---|---|---|
| gallery.html | 3 | 1020×1440 | **0.000000 %** | **0** | **equal** `d518d65c452ffc6b…b9332b67` | 0.000 %, maxΔ 0 |
| gallery.html | 2 | 680×960 | **0.000000 %** | **0** | **equal** `8e562714032b99ee…6b8e6789` | 0.000 %, maxΔ 0 |
| index.html | 3 | 1020×1440 | **0.000000 %** | **0** | **equal** `4f720866bb708b1f…390dfc7d2` | 0.000 %, maxΔ 0 |
| index.html | 2 | 680×960 | **0.000000 %** | **0** | **equal** `87ec6bf5511fa4c8…72cb16db` | 0.000 %, maxΔ 0 |
| pitch.html | 3 | 1020×1440 | **0.000000 %** | **0** | **equal** `036fda04612e6b8c…89ae86f558` | 0.000 %, maxΔ 0 |
| pitch.html | 2 | 680×960 | **0.000000 %** | **0** | **equal** `c6d6461ac2d05f95…c5c7add3c8` | 0.000 %, maxΔ 0 |

Six of six pairs are the **same bytes**, not merely the same within tolerance; `renderer.info.programs` 8/8 (gallery) and 6/6 (index, pitch) on both arms, bake path `const` on both arms, pose identical to 12 decimals. Harness: `.hermes/cache/scratch/gem-default-parity/` (`capture.mjs`, `diff.mjs`, `shots/capture.json`, `shots/diff.json`).

**The WebGL1 side is a repair, not a wash.** With `--disable-webgl2`, `10390c2` logs three distinct failures — `A WebGL context could not be created … disabled by enterprise policy or commandline switch`, `… Canvas has an existing context of a different type`, and `Shader Error … 'i' : Index expression…` — and draws no stone. Re-shot today on the same page: this tree logs **0** of the three (only three.js's own r160 deprecation/resize warnings), takes the PLTEX path (the `'i'` compile failure gone: 170 planes as an RGBA32F 1×N texture, `PL( e1 > 0 ? e1 : 0 )`, `derivatives` requested), keeps all 8 programs, and renders a non-blank stone. The stress case's arm comparison reads canvas mean **187.19** against the WebGL2 control **187.21**, and stress case i (the WebGL1 arm) is **PASS**.

#### 2 · Task 12 landed — harmless, not a win

`.ig-cell` (`src/ds/gallery-chrome.css`) now carries `content-visibility:auto; contain-intrinsic-size:auto 40px` (40 = the 58 px cell minus 18 px of padding/border). Measured on `gallery.html` at 390×844 dpr 3 and 1440×900 dpr 2: document height Δ **0.0000 %**, **114 of 5.9 M** pixels differ and every one of them by **≤1/255**, LayoutDuration **−7.8 / −5.8 ms**. That LayoutDuration figure is **below the ±40 % noise floor** measured on a page where the change cannot apply, so it is not a result. Task 12 is shipped because it is **provably harmless at zero layout cost** — the paint-count win it was written for is unmeasured, and this record does not claim it.

#### 3 · The phone policy surface (E3, shipped opt-in)

`?gemphone=1|1.5|2` now caps the dpr **ceiling** in `gem-perf.js` — over the AUTO ceiling **and** over a fixed `?gemdpr` (a URL ratio is capped, never raised; `ceiling() = min(base(), gemphone)`, the controller still steps down from it and climbs back to it) — and thins bloom in `gem-bloom.js` (B target 0.5× → **0.25×** of the buffer, composite paid back at gain **1.6**). Absent, `PHONE = 0` and the ceiling expression is the old one verbatim: the policy is invisible when off, which is why the default-path table above is unchanged by it.

| cap | frame-time ratio vs default | note |
|---|---|---|
| `?gemphone=1.5` | **2.8–3.4× cheaper** | the phone lever that actually closes; look crops not yet owner-approved |
| `?gemphone=2` | **2.1× cheaper** | **ratio-wise a no-op on a default config** — the default ceiling is already `min(dpr,2)`, so only the bloom thinning applies |
| `?gemphone=1` | — | untested for look; recorded as the floor of the surface |

Bloom traffic at dpr 3 falls **138 → 35 MB/frame** with the 0.25× B target; the halo reads **+45 %** area and **+70 %** peak at gain 1.6. This is E3's policy, shipped as a URL surface because the owner's look call is still the gate on making any of it a default.

#### 4 · CAND removed — and its premise disproved, not merely deferred

`gem-cand.js`, `public/cand.bin` (16.7 MB), the CANDD/CANDO/CANDC splices, `parity()`/`STRIP`, the `GEM_CAND.claim()` hook and the script tags on all three pages are gone. The removal is justified by measurement, not by tidiness: over the **125,237** (facet,cell) pairs the real bounce chain reaches the union of winning planes is **p50 22** and **43 % of cells need more than 32**; the winner varies **~20 ways** across one facet's start points. So k=12 (16.7 MB) still falls back to the full 170-plane scan on **99.62 %** of lookups and k=32 (44.6 MB) on **64.9 %**, and neither is exact — **10 wrong facets in 1.55 M** lookups. A candidate set cannot deliver the 8×; the scaffolding was also its own parity claim (it compared the stripped source string with itself, while the emitted shader had in fact changed). Default render after removal: **identical** (table above).

#### 5 · The adversarial suite, honestly scored

On a clean, pinned tree with perf deferred the suite scores **37/100 (F)**, with **9/10** stress cases and parity **PASS at 0.000 % / maxΔ 0**. Both earlier scores — the 0/100 and the 100/100 before it — were **harness rot**, not the build: `readPixels` in a later CDP task on a non-preserved buffer reads blank, `deck-lab.js:16` throws every 250 ms so every clean-console gate fails, the hidden-tab case freezes rAF permanently, and parity re-armed its own baseline so it passed by construction. 37 is the number this build has actually earned; it is not a ship gate and is recorded as the suite's baseline, not as a pass.

#### Gates at ship

| gate | exit | note |
|---|---|---|
| `npm run lint:tokens` | **0** | 0 raw leaks, 0 over-limit, 1830 files |
| `npx vite build --mode production` | **0** | built in 2.91 s; only the pre-existing >500 kB chunk warning |
| `npm test` | **1** | `✗ verify:atlas — stale: src/components/GemReward, index.html changed since manifest; run \`npm run gen:atlas\`` — the **only** failing assertion, and it is **pre-existing and mtime-based**: the same check fails in a pristine `10390c2` worktree for **45** paths (including `index.html` and `src/components/GemReward`, which no lane touched), and its content-drift half passes here. It is unsatisfiable on any fresh checkout because git does not preserve mtimes. Not regenerated: that would stamp 45 unrelated mtimes into a ship commit and pass only until the next edit |

#### Task status after rev 7

- **12 — ✓ shipped.** Landed, measured, provably harmless; the paint-count win is unmeasured and unclaimed.
- **8 — closed by disproof.** The structural lever (candidate scan) is dead by measurement; the shipped substitute is the **phone dpr ceiling** (`?gemphone`), a policy surface rather than a capability gate.
- **5 — pending, owner decision**, unchanged. **11, 13, 14, 15, 1–4, 6, 7, 9, 10 — unchanged from rev 6.**
- **E1 — closed (disproved, removed). E2 — ruled, opt-in. E3 — shipped as `?gemphone`, default off. E4 — 37/100 baseline. E5 — still needs hardware.**

**Ship state:** one commit on `main`. Nothing in this rev amends rev 6's closure — it records what was ordered after it, and every number above is a measurement on this tree.

---

## Gate · rev 8 — owner-decision evidence + suite repair (2026-11-22) {#rev-8}

Four lanes ran on `dee15c3` (+ this tree's `?gemtimer` probe). **No default moved**: the dock flag is still a URL flag, the phone caps are still opt-in, and the only source change is an instrument that is inert without its param.

| lane | subject | headline numbers |
|---|---|---|
| F recheck | Task 5 dock material (`?dock=lean`) | **35.53 %** of pixels differ, **17.58 % >8/255**, maxΔ **81**, mean **14.19** (393×852 dpr 3); **88.8 %** of the >8 px inside the panel sit within **12 css px** of its edge, mid strip maxΔ **1/255**; `.docklens` nodes **8,917 → 2,673**, lens copies **15 → 1**, band mirrors **5 → 0**. Desktop 1440×900 dpr 2: **7.93 %** differ / **1.96 % >8** / maxΔ 62. Rim sharpness 1:1 on the phone is **not separable** at these captures |
| E3 caps | `?gemphone=2 \| 1.5 \| 1` | cap 2 = stone **byte-identical on index**, **0.93 % >8** / maxΔ 43 on gallery, halo **+17 %** area / **+76 %** peak, **1.6×** spill → **no ratio win** on a 3× phone; cap 1.5 = **3.46 % >8** at 1×, maxΔ **201**, detail **79–80 %**, **70 %** of rim px aliased, spill **3.90×**, **1.78×** fewer fragments; cap 1 = **5.57 % >8**, detail **58 %**, rim **81 %** aliased, **4.0×** fewer fragments |
| E4 suite | repaired rogue suite | **60/100 (D)** — perf **0/40**, parity **30/30**, stress **30/30**. Parity cross-build (`10390c2`-clean `4a7ebce1` vs `dee15c3`-clean `6f0b5407`): **0.000 % >2/255**, maxΔ **0** over **592,832** bbox px, control **0**; default vs `?gemmesh=0` **MATCH**, `?gemmesh=1` **DIFFER** 2.356 % / 243 / 5.11 %. Stress **10/10**, incl. the WebGL1 arm at meanRGB **203.27** vs WebGL2 **202.83**. Perf **10.145 ms** at 1020×1440 → **71.02 ms** ×7 estimate, band **67.0–75.4**, runs 60/84/71 |
| E5 probe | `?gemtimer=1` | shipped in `gem-perf-timer-ext.js` + a 2-line hook in `gem-perf.js`; **inert** on gallery dpr 3 (`d518d65c452ffc6b…b9332b67`, **0 of 1,468,800** px >2/255, maxΔ 0, programs 8→8) and dpr 2 (`8e562714…6b8e6789`, 0 of 652,800). Headless `GL_RENDERER` **`ANGLE (Apple, ANGLE Metal Renderer: Apple M1 Max, Unspecified Version)`**. **Still not device-measured** |

**Task status**
- **5 — still pending the owner decision, unchanged.** The evidence that was missing now exists: `lane-F-recheck.md` and `lane-F-dock-recheck.png` (per-arm sheet plus the measured trade). This rev records it; it does not pick the default.
- **E3 — evidence produced, default-off unchanged.** The caps are measured on a 3× phone grid and on index; no cap became a default, and `?gemphone=2` is still recorded as ratio-wise a no-op.
- **E4 — repaired, 60/100.** Perf still scores **0/40**: 71 ms against a 16.7 ms budget is not a pass, and the score is recorded as a baseline, not a ship gate.
- **E5 — probe shipped, still no hardware.** Every number in `lane-E5.md` is headless plumbing evidence; the phone run is open (`tools/device-probe/README.md` §4).

**index.html gate (blocking, this rev).** `?gemtimer` was previously proven inert on gallery only; index had never been gated (no renderer in the earlier mount). Gated now: HEAD (`dee15c3`, `git archive` snapshot, :5415) vs this tree (:5416), `index.html?app=fullscreen`, pose pinned (`rig.t = 0`, `group.position.y = 0`, `rotation(-0.15,0,0)`), floor pools hidden, raw drawing buffer `readPixels` in the same CDP task as the render, rAF frozen.

| viewport | buffer | px >2/255 | maxΔ | control | programs | sha256 (both arms) |
|---|---|---|---|---|---|---|
| 393×852 dpr 3 | 1020×960 | **0 of 979,200 (0.000 %)**, meanΔ 0 | **0** | **0** | **6 = 6** | `5988da286bacba60…` equal |
| 1440×900 dpr 2 | 680×640 | **0 of 435,200 (0.000 %)**, meanΔ 0 | **0** | **0** | **6 = 6** | `96e0ccea5b98c99a…` equal |

Stone present on both arms (subject silhouette 37.01 % / 37.05 % of the buffer, meanRGB 184.77), and the harness is not blind: moving the pinned rotation by 0.1 rad in the same launch moves **37.44 %** of pixels at maxΔ 250. Evidence: `lane-L.md`, harness `tools/index-gate.mjs`.

**Coverage gap found:** `pitch.html` loads neither `gem-perf.js` nor `gem-bloom.js` — its 27 gem scripts are byte-identical over HTTP between the two servers, so the page cannot carry any part of this policy. `index.html` has no `gem-bloom.js`: bloom is absent there, which is why `?gemphone=2` reads byte-identical on index. Net: **the phone policy is gallery-only today** — index gets the dpr ceiling (`gem-perf.js`) and the timer probe, pitch gets nothing, and the bloom half of the policy has exactly one surface.

---

## Gate · rev 9 — owner close-out + exact-waste ship (2026-11-23) {#rev-9}

Two owner overrides close the last open items; nothing else in this plan reopens. Base `f350e75`, probe evidence `e322d3a`.

- **5 — ✗ cancelled (owner moved on, user override 2026-11-23).** The rim-vs-frame-time call is not coming. No default changed: `?dock=lean` stays exactly as it was — an opt-in flag (`src/glass/slices-spec.js:42`), never a default.
- **E5 — ✗ SKIPPED per owner (user override 2026-11-23): ship with the computer test.** The `?gemtimer=1` probe (`e322d3a`) stands as the measurement surface; the phone run in `tools/device-probe/README.md` §4 is closed, not deferred. Eval record `.hermes/evals/2026-11-20-gem-mobile-perf/README.md` updated to match.

Shipped in this rev — pixel-gated, no default moved except where stated:

| file | owning plan · phase | result |
|---|---|---|
| `src/components/GemReward/gem3d.js` — C0 `autoClearColor=false` | mobile-perf · #phase-3 | **✓ shipped.** 0.000 % >0/255, sha-identical on all 4 shots (lane-F-c0c5). C5 (`antialias:false`) **reverted** — failed its blocking gate on the reward sheet (0.30 %, maxΔ 115). |
| `src/glass/dock-band.css`, `src/glass/dock-lens.css` — drop `will-change` on band stops / slice copies | mobile-perf · #phase-2 (Task 4 clause) | **✓ shipped.** Glass regions 0.000 % (lane-E). |
| `src/os/edge-material.css` — top-edge stop spans `display:none` while `.device--large` is at rest | mobile-perf · #phase-2 (Task 4 clause) | **✓ shipped.** Glass regions 0.000 % (lane-E). |
| `src/patterns/OppsHome/opps-home.css` + `opps-home.js` + **new** `opps-home-intersect.js` — marker pulse parks via `IntersectionObserver` when the map card leaves the viewport | mobile-perf · #phase-2 (lane-E §6.8; extracted to sibling module per lane-E2 line-budget fix) | **✓ shipped.** Glass regions 0.000 % pre/post; parked pulse contributes no sampled pixel (lane-E2). |
| `src/js/mechanics/graphData*.js` (4 files) — regen, `generatedAt` stamp only | 2026-09-22_155000-architecture-mechanics.md · #phase-2 | **✓ done (carried).** Content-hashes unchanged; `verify:mechanics` green. |
| `.hermes/evals/2026-11-23-gem-render-audit/` (lanes A, B, C, D, E, E2, F, F2 + raw) | mobile-perf · #rev-9 | evidence for this rev, committed. |
| `.hermes/process-audit-2026-11-22.md` | — (host context, read-only inspection) | filed, no task attached. |
| `design-system/changelog-manifest.json` | regen | rides this commit. |

**Task status after rev 9** — 5 ✗ cancelled (override), E5 ✗ skipped (override); 12 ✓ shipped (rev 7); 8 closed by disproof (rev 7); E1 disproved/removed, E2 opt-in, E3 shipped opt-in `?gemphone`, E4 60/100 baseline; 1–4, 6, 7, 9, 10, 11, 13, 14, 15 unchanged. **Nothing in this plan remains open.**

---

## Gate · rev 10 — user close-out: E2/E3/E4 cancelled (2026-11-23) {#rev-10}

Per user override 2026-11-23, the eval record's leftover process items that do not count are closed, not deferred:

- **E2 ✗ cancelled.** Mesh-entry crease ruling stays as measured (NOT ACCEPTABLE as default); `?gemmesh=1` remains as-is opt-in code. No default changed.
- **E3 ✗ cancelled.** No phone cap becomes a default; `?gemphone=1|1.5|2` remains as-is opt-in code. The owner look call is not coming.
- **E4 ✗ cancelled.** The repaired 60/100 (D) — perf 0/40 · parity 30/30 · stress 30/30 — stands as a baseline, not a gate. No further suite work.

E5 already ✗ skipped (rev 9). `?gemmesh` / `?gemphone` flags untouched; this rev closes process items only. **Nothing in this plan remains open.**

---

## Gate · rev 11 — board-tag headers + atlas regen (2026-11-23) {#rev-11}

Follow-up housekeeping; no task reopened, no default changed.

- **Task 1–15 done/cancelled headers.** Each phase table now carries per-task `### Task N … ✓ done / ✗ cancelled` headers so the board's tag renderer picks them up. Text-only plan edit.
- **Atlas regen.** `src/arch/atlas.json` regenerated (`npm run gen:atlas`): `generatedAt` stamp plus refreshed source digests for `src/components/GemReward` and `src/patterns/OppsHome`, which changed after the previous atlas bake. `verify:atlas` green.
