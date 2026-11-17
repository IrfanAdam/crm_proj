# Lane B — the dock mirror's last per-frame layout reads are gone (Alphas CRM, mobile)

**Scope:** `src/glass/lens-copy.jsx`, `band-mirror.js`, `lens-map.js`, `rect-zoom.js`, `optics.js`, `engine.js` — the six files this lane owns. No other repo file was edited.
**Base commit:** `b97b1dedf472ab868d976341f6811d49bf04ec4e` (branch `main`). **Date:** 2026-11-17, ~02:00–04:10 IST.
**Host:** macOS arm64, headless Chrome 157.0.8103 (`--use-angle=metal`, `--force-color-profile=srgb`), one browser at a time, port **5231 only**.
**Harness (new, reusable, never part of the app):** `.hermes/tmp/perf-mobile/lane-b-probe.mjs` (census + frozen pixel/geometry capture), `.hermes/tmp/perf-mobile/lane-b-invalidate.mjs` (invalidation correctness). Raw output in `.hermes/tmp/perf-mobile/lane-b/`.

---

## 1. Audit — every layout read on a scroll / resize / rAF path in the owned files

`getBoundingClientRect` / `offset*` / `client*` / `scrollTop` / `scrollWidth` / `getComputedStyle`, by call site, before the change:

| # | File:line | Read | Fires on | Used for |
|---|---|---|---|---|
| 1 | `lens-copy.jsx:31` | `src.getBoundingClientRect()` | **every scroll frame** | feed base offset (`c.left - l.left`, `c.top - l.top`, `c.width`) |
| 2 | `lens-copy.jsx:32` | `lens.getBoundingClientRect()` | **every scroll frame** | same base, origin side |
| 3 | `lens-copy.jsx:37` | `src.scrollTop` | **every scroll frame** | 1:1 `translateY` of the feed copy |
| 4 | `band-mirror.js:39` | `src.getBoundingClientRect()` | **every scroll frame** | same base, recomputed |
| 5 | `band-mirror.js:40` | `lens.getBoundingClientRect()` | **every scroll frame** | same base, recomputed |
| 6 | `band-mirror.js:45` | `.device__edge:not(…--top).getBoundingClientRect()` | **every scroll frame** | band box (left/top/w/h) |
| 7 | `band-mirror.js:58` | `src.scrollTop` | **every scroll frame** | band-copy `translateY` |
| 8 | `rect-zoom.js:12,14` | `getComputedStyle(#device).transform`, `getComputedStyle(#canvas-scaler) --zoom` inside `getZoom()` | **every scroll frame, 2×** (called from `placeWorld` *and* `placeBand`) | visual→layout scale |
| — | `lens-map.js` | none | `buildWorld`/box change only | SDF bake, canvas only |
| — | `optics.js` | none | — | constants |
| — | `engine.js` | none | module init | UA sniff |

Measured net (60-frame scroll at 393×852 dpr3, 4× CPU): **5 `getBoundingClientRect` + 4 `scrollTop` reads per frame**, of which **5 rects + 2 scrollTops** come from this lane (`lens-copy.jsx` 2+1, `band-mirror.js` 3+1) and the other 2 `scrollTop` from the harness driver and `src/patterns/OppsHome/opps-home.js:42` (not this lane — unchanged, still 1/frame). Calls #2/#5 and #1/#4 are the *same two boxes measured twice per frame* because `placeWorld` measures, then `placeBand` measures again; #8 is a style recalc, not a layout, but it also ran per frame.

**Why the record can be cached (measured, not assumed).** Every value above is a *delta between two boxes pinned to the same device screen* (`#app-content` is a fixed 393×852 scroller; `.docklens__lens` is `position:absolute;inset:-18px`; `.device__edge` is `position:absolute;bottom:0;height:78px`), so scrolling moves content *inside* the boxes, never the boxes, and a rigid page translation moves numerator and denominator together. Verified on the running app (`before.json → geoms`):

| scrollTop | `#app-content` rect | `.docklens__lens` rect | `.device__edge` rect |
|---|---|---|---|
| 0 | `0,0 393×852` | `-2,744 329×92` | `0,774 393×78` |
| 320 | `0,0 393×852` | `-2,744 329×92` | `0,774 393×78` |
| 770 | `0,0 393×852` | `-2,744 329×92` | `0,774 393×78` |

Identical to the thousandth of a pixel at every offset. Only `scrollTop` differs.

---

## 2. The change

| File | Lines | What |
|---|---|---|
| `rect-zoom.js` | 22 → **98** | new `dockRects(lens, src)` — one batched read pass (`getZoom` + src rect + lens rect + edge rect) producing one record `{epoch, src, zoom, base, band}`, memoised per lens element in a `WeakMap`; `dropDockRects()` invalidates. Invalidation is wired **only** to: `resize`, `orientationchange`, `app-tab`, `document.fonts` (`loadingdone` + `ready`), the zoom control (`#ws-proto-stack` input/click), `#device` `transitionend`, a `MutationObserver` on `document.body[class]` (app-fullscreen drops the canvas transform), and a `ResizeObserver` on the three source boxes (guarded by a `Set` so a fresh `observe()` cannot invalidate every frame). An invalidation refreshes the record on the *next frame* instead of lazily in the next scroll frame. |
| `lens-copy.jsx` | 39 → **42** | `placeWorld` reads `scrollTop` **once, first**, then writes; base geometry comes from the record and the same record is handed to `placeBand` (no second measure). Read-then-write per frame. |
| `band-mirror.js` | 62 → **59** | `placeBand(band, lens, src, g, y)` — `g`/`y` are optional so `DockSlices`' 3-arg call still works; when given, all five band copies are placed from the shared record and the frame's one scroll value instead of re-measuring. |

All three files are ≤99 content lines (98 / 42 / 59). `getZoom`/`toLayout` keep their public signatures (`dock-track.jsx`, `DockSlices.jsx` still import them). `DockLens.jsx`, `DockSlices.jsx`, `slices-spec.js`, `slice-bands.jsx`, `lens-filter.jsx`, the dock CSS, components, patterns, os, workspace, `index.html`, `vite.config.js` and tokens were **not** touched.

---

## 3. How it was measured

```bash
REPO="/Users/irfan/Documents/Portfolio Redo/crm_proj"
SCR=/Users/irfan/.hermes/cache/scratch/lane-b        # frozen A/B trees, never the live tree

# both sides come from git archive HEAD -> only my 3 files differ (the live tree is being
# edited by other lanes right now: dock-band.css / slice-bands.jsx / slices-spec.js etc.)
rm -rf $SCR && mkdir -p $SCR/base $SCR/after
cd "$REPO" && git archive HEAD | tar -x -C $SCR/base
ln -s "$REPO/node_modules" $SCR/base/node_modules
cp -R $SCR/base/. $SCR/after/ && rm -f $SCR/after/node_modules && ln -s "$REPO/node_modules" $SCR/after/node_modules

# the dev server's buildStart hook would regenerate mechanics data inside the copy; both sides no-op it
printf 'process.exit(0);\n' > $SCR/base/scripts/generate-mechanics-graph.js
printf 'process.exit(0);\n' > $SCR/after/scripts/generate-mechanics-graph.js

# A = HEAD (before); B = HEAD + the three edited files.  Serve ONE at a time on 5231.
cd $SCR/base  && npx vite --port 5231 --host 127.0.0.1 --strictPort     # for --label before
cd $SCR/after && npx vite --port 5231 --host 127.0.0.1 --strictPort     # for --label after

cd "$REPO"
node .hermes/tmp/perf-mobile/lane-b-probe.mjs      --port 5231 --label before
node .hermes/tmp/perf-mobile/lane-b-probe.mjs      --port 5231 --label after
node .hermes/tmp/perf-mobile/lane-b-invalidate.mjs --port 5231 --label after
node .hermes/tmp/perf-mobile/lane-b-invalidate.mjs --port 5231 --label after --glass slices
```

The probe boots the real app (393×852 dpr3, `mobile:true`, touch, **`Emulation.setCPUThrottlingRate: 4`**), waits for `.opp-card` + `.tabbar` + `.fab-gem`, clicks `#open-fullscreen`, waits for `body.app-fullscreen`, waits for HTTP idle (900 ms quiet) + a DOM/image signature stable for 4 polls, then:

* **census** — `Element.prototype.getBoundingClientRect`, the `scrollTop`/`scrollLeft` getters and `scrollWidth|scrollHeight|clientWidth|clientHeight|offsetWidth|offsetHeight|offsetTop|offsetLeft|offsetParent` are wrapped before any app script runs. Each call is bucketed by a per-frame counter driven by a 60-step `requestAnimationFrame` scroll of `#app-content` (13 px/frame, 0 → 770) and tagged with a 4-frame stack so reads are attributed to a **file**.
* **CDP** `Performance.getMetrics` read immediately before and after the 60-frame pass (`LayoutCount`, `RecalcStyleCount`, `LayoutDuration`, `RecalcStyleDuration`).
* Map tiles (`*arcgisonline*`) and avatars (`*pravatar*`) are **blocked on both sides** — external network was the measured source of run-to-run content drift (see §5).

---

## 4. Numbers — before → after (matched pair, same harness build, 60 frames, 4× CPU)

| per interaction (60-frame scroll) | before | after | Δ |
|---|---|---|---|
| **`getBoundingClientRect` — from this lane's files** | **295 (4.92 / frame)** | **0 (0.00 / frame)** | **−295** |
| …`lens-copy.jsx` | 118 (1.97 / frame) | 0 | −118 |
| …`band-mirror.js` | 177 (2.95 / frame) | 0 | −177 |
| …`rect-zoom.js` (the one batched pass) | — | 0 (3 reads happen at invalidation, none in a frame) | — |
| **`scrollTop` reads — from this lane** | **118 (1.97 / frame)** | **59 (0.98 / frame)** | **−59** |
| …`lens-copy.jsx` | 59 | 59 (one per frame, read before any write) | 0 |
| …`band-mirror.js` | 59 | 0 (frame's value passed in) | −59 |
| `scrollTop` from everything else (driver + `opps-home.js:42`) | 119 | 119 | 0 (not this lane) |
| `offset*` / `client*` / `scrollWidth` reads | 0 | 0 | 0 |
| `RecalcStyleCount` (CDP) | 182 | 123 | **−59 (−32 %)** — the 4 `getComputedStyle` calls/frame from `getZoom()` are gone |
| `LayoutCount` (CDP) | 38 | 38 | 0 |
| `LayoutDuration` (CDP, ms) | 0.006 | 0.004 | — |
| `RecalcStyleDuration` (CDP, ms) | 0.128 | 0.272 | *(noise: single run, host load 138 → 121 from other lanes' Chrome/builds; the **count** is the load-independent number)* |

Frame-level detail: before, **every one of the 59 frames that ran the dock callback issued exactly 5 rect reads**; after, **60/60 frames issue 0**. The target for this lane — 0 layout reads per scroll frame on the dock mirror path — is met exactly, not approximately (`rectTotal: 0`).

**No performance claim beyond these counters.** `TaskDuration` (1.28 → 2.68 ms) and frame cadence were *not* used as evidence: one run per side on a host carrying load average 120–140 from other lanes' headless Chrome and builds, and `TaskDuration` includes work outside this path. The deterministic, load-independent evidence is the read count and `RecalcStyleCount`.

---

## 5. Pixel proof — and why it is set up this way

**The surface is genuinely non-deterministic.** With the map tiles and avatars live, the *same unchanged tree* produced one capture in six that differed from its own repeats: **7.24 % of the dock-crop pixels, `maxChannelDelta 3/255`** (`.hermes/tmp/perf-mobile/lane-b/shots/after-a2.png` from the run before blocking). A whole-page diff on this surface would therefore prove nothing — this lane did not use one, and did not use the dock cropped across a live-network pair either. Two things were fixed before any pixel claim was made:

1. **Freeze.** `requestAnimationFrame`/`cancelAnimationFrame` replaced with no-ops, a `*{animation-play-state:paused; animation-delay:0s; transition:none; scroll-behavior:auto}` sheet injected, and every `document.getAnimations()` entry paused with `currentTime = 0` — re-applied before *each* capture (3 rounds before the first).
2. **Content control.** Map tiles and avatars blocked on **both** sides, plus settle gates (900 ms network-quiet, DOM/image signature unchanged over 4 polls, 4 freeze rounds).

**Determinism (the honest gate).** Six captures per side, 700 ms apart, re-frozen before each:

| side | shas | byte-identical? |
|---|---|---|
| before (HEAD) | `1387711d0a633aa5` ×6 | **yes, 6/6** |
| after (HEAD + 3 files) | `1387711d0a633aa5` ×6 | **yes, 6/6 — and the same hash as the before side** |

Content signature identical on both sides: 3732 DOM nodes, 2892 in the dock subtree, 28 cards, 0 tiles, 0 images loaded, dock box `16,762 293×56` both runs.

**Dock-region diff.** `Page.captureScreenshot` clipped to the dock box + 10 px margin (`x6 y752 313×76` CSS, `scale:3`, dpr 3 → **2817×684 px PNG**, 1 926 828 px per shot), 6 matched pairs:

| pair | differing pixels | max channel delta |
|---|---|---|
| before-a1 vs after-a1 … before-a6 vs after-a6 (all six) | **0** | **0** |

`pixelDiff = 0/1 926 828` on all six pairs, on a side that repeats byte-identically. This is a real A/B (the two trees differ only in the three files above), not a self-comparison: the negative control in §6 shows a 5 px geometry error is caught.

**Fallback proof, which is the falsifiable one (and it was run too).** 2893 dock-subtree nodes × 3 scroll offsets (0 / 320 / 770) = **8679 node comparisons** of `x, y, w, h` (1e-3 px), `scrollWidth`, `scrollHeight`, `clientWidth`, `clientHeight`, and the **inline `style` string**:

| comparison | count |
|---|---|
| geometry / scroll / client-field differences | **0** |
| inline-style differences, excluding `--me-delay` | 18 — 6 `<img class="leaflet-tile">` nodes per offset, tile-fade `opacity` (`0.035` vs `0.11`) |
| nodes differing **only** in the map's `--me-delay` pulse phase | 18 — 6 per offset (`-504ms` vs `-473ms`) |
| inline-style differences inside the dock/mirror subtree (`.tabbar`, `.docklens*`) | **0** |

The 36 differing values are wall-clock-driven leaflet internals on the map card (tile fade opacity, pulse-ring phase) — nothing the mirror writes. **Every node the mirror controls (1 feed copy + 5 band copies + all their mirrored descendants) has a byte-identical rect, scrollWidth/Height and inline style string.**

---

## 6. Does the cache ever go stale? (and proof the test can fail)

`.hermes/tmp/perf-mobile/lane-b-invalidate.mjs` drives 12 events and, after each, compares **what the code wrote** against a **fresh measurement of the live boxes** (`base/band left/top/width/height` and the `translate` slide, ±0.001 px), on both engines:

| step | lens engine | `?glass=slices` |
|---|---|---|
| boot, scroll 200, scroll 900 | PASS PASS PASS | PASS PASS PASS |
| `app-tab` dispatch, then +scroll | PASS PASS | PASS PASS |
| resize 393→780, 360×760, back to 393×852 | PASS PASS PASS | PASS PASS PASS |
| `orientationchange`, `app-fullscreen` off→on, `fonts.ready`, scroll 0 | PASS ×4 | PASS ×4 |

**Controls (this matters).** (a) Perturbing the cached record by `+5 px` on `base.l` makes **all 12 steps FAIL** with `copy0.left got 7px want 2` — the assertion detects a wrong written geometry, which is exactly the signature a stale record produces. (b) Removing the invalidation wiring entirely still **PASSES**, because in this app every size-changing event also remounts or resizes the lens (the `ResizeObserver`/`gen` remount path), so output equality cannot discriminate there — said plainly rather than dressed up as a detection claim.

---

## 7. What still reads, and why that is the right end state

* **`src.scrollTop`, once per frame, in `lens-copy.jsx`.** The glass must move 1:1 with the scroll, and the scroll event carries no offset. It is read *before* any style write in the frame, so it cannot force a layout, and one read is the floor.
* **Three rects + one `getZoom`, at invalidation only** — never inside a frame. Two invalidations were explicitly rejected after measuring them: observing `#device[class]` (`device--large` / `device--scrolled`) cost exactly one rect pass (3 reads) on the first frame of every gesture, and those classes only fade the **top** edge's opacity (`src/os/edge-material.css:11-12`) — no measured box moves; a 250 ms scroll-settle debounce was likewise rejected because a stalled frame under 4× throttle re-enters the gesture. Sizes are covered by the `ResizeObserver`; the remaining drift risk (a *position* change with no size change and no class/zoom event) is covered by nothing today and is not reachable in this tree — the lens and edge are both anchored to the same fixed-size screen, and the only rule that moves either is `body.app-fullscreen`, which is observed.
* `getZoom()`'s two `getComputedStyle` calls now run once per invalidation instead of 4× per frame (that is the −59 `RecalcStyleCount`).

---

## 8. What this lane refused to do

* No `npm run build`, `npm test`, `ds-track`, `generate-*`. (The vite dev server's own `buildStart` hook would have regenerated mechanics data; it was replaced with a no-op **inside both scratch copies only**, so the A/B trees stay identical and the repo is untouched.)
* No `git commit` / `reset` / `stash` / `checkout`. Working tree left dirty on purpose.
* No port other than **5231**; 5173/5174/5194/5195/5210–5216/5220/5225/5230 never opened. One headless Chrome at a time, serially.
* No whole-page pixel diff, and no dock diff across a live-network pair (§5). Where determinism was not achievable it is reported as measured (7.24 %, δ3/255) rather than rounded to zero.
* No files outside the six owned ones. `DockLens.jsx`, `DockSlices.jsx`, `BottomDock.jsx`, `FabGem.jsx`, `slices-spec.js`, `slice-bands.jsx`, `lens-filter.jsx`, `dock-lens.css`, `dock-band.css`, `src/components/**`, `src/patterns/**`, `src/os/**`, `src/workspace/**`, `index.html`, `vite.config.js`, tokens: untouched. (Other lanes were editing `dock-band.css`, `slice-bands.jsx`, `slices-spec.js` concurrently — which is why the A/B was run on frozen `git archive` copies rather than the live tree.)
* No claim of a frame-time win from a single throttled run (§4).

---

## 9. Files touched in the repo

```
M src/glass/rect-zoom.js      +76 −?   (22 → 98 lines)  measure cache + invalidation
M src/glass/lens-copy.jsx      (39 → 42)  one scroll read, read-then-write, shared record
M src/glass/band-mirror.js     (62 → 59)  places all copies from the shared record
```
Plus this report and the two harness scripts (`lane-b-probe.mjs`, `lane-b-invalidate.mjs`) and their outputs under `.hermes/tmp/perf-mobile/lane-b/`. Nothing committed.

**Result: 5 layout reads per scroll frame → 0; dock pixels identical (0/1 926 828, six pairs, on a tree that repeats byte-identically); every mirrored node's geometry and inline style identical at three scroll offsets.**
