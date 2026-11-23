# Lane C — fullscreen view: page-level audit (DOM/compositor vs gem GPU)

**Date** 2026-11-23 · **Build** `crm_proj` working tree, no edits, no commits · **View** `/index.html?app=fullscreen`

**Measurement machine:** Apple M1 Max, macOS 27.2.1, Google Chrome 157 `--headless=new --use-angle=metal` (ANGLE/Metal, GPU confirmed `ANGLE (Apple, ANGLE Metal Renderer: Apple M1 Max)`). Viewport **393×852 CSS @ dpr 3** (surface 1179×2556 = 3.01 M px), mobile emulation + touch.

> **All numbers here are measured on this machine in headless Chrome. None is a phone number.** The phone claim under test is "~20 fps in the fullscreen view at dpr 3". Headless has no display; its rAF/begin-frame cadence is itself 15–30 fps and is *not* separable by page content (§4.1). So the audit attributes cost by **per-frame work** (main-thread ms, compositor ms, GPU ms from CDP tracing, and metrics-only task time), not by frame rate.

---

## 0. Answer first

1. **At rest the fullscreen view mounts no gem.** `GEM3D.rigs = [{gem:'sapphire', renderer:false, vis:false, w:0, h:0, raf:false}]`; both `<canvas>` elements are 0×0 inside `[hidden]` parents. Arms "gem canvas display:none" and "all on" are therefore identical and measured identical (§4.0). **A gem exists only after the reward sheet is opened**, where it mounts 340×320 CSS / 598×564 buffer (337 k px, `raf:true`).
2. **The DOM glass stack alone accounts for 68 % of per-frame composite work** (19.3 of 28.6 ms/frame of compositor + GPU time) on an M1 Max at dpr 3 — **1.72× a 60 Hz frame budget on the fastest consumer laptop GPU measured here**, with the main thread only 3–8 % busy. Whatever the phone spends, it is the DOM compositor, not JS, not layout, not the gem.
3. With the ceremony open, the gem is the largest single *new* main-thread item (**+2.70 ms/frame task, +1.53 ms script**, §4.0) and adds ~+10.3 ms GPU on an M1 Max at 337 k px (§4.5) — a phone at 3× that buffer area pays several times more.
3. The single largest item is the **progressive-blur band inside the dock**: 5 clones of the *entire feed* (393×1622 CSS each) each carrying `filter: blur(1…7px)` → **9.5 viewports of blurred surface for a 78 px band**. Measured: 11.8 ms/frame (41 % of all composite work); removing only the `blur()` (clones stay) recovers 7.5 ms of that.
4. The **iOS/Safari path is worse in DOM terms**: `?glass=slices` builds **15 feed clones** and **9,776 elements** (vs 3,549) and measured the highest main-thread and GPU per-frame cost of any arm.
5. Main-thread JS/layout/script is **not** a factor: 0.69–3.13 ms of task time per frame, 0.01–0.06 ms layout, 0.11–0.31 ms style recalc.

---

## 1. How the fullscreen view is reached

| step | evidence |
|---|---|
| `?app=fullscreen` on `/index.html` adds `body.app-fullscreen` before paint | `src/workspace/mobile-fullscreen.js:57` → `enter()` at `:6-12` |
| `#open-fullscreen` button does the same for a tap | `src/workspace/mobile-fullscreen.js:49` |
| Full-bleed layout: device `transform:none`, square screen, edges **kept** `display:block` | `src/workspace/mobile-fullscreen.css:13-33`, esp. `:21`, `:28` |
| Device chrome (screen / content / both edges) built once | `src/device/frame.js:8-12` |
| Glass dock mounts into `#glass-bottom` | `src/glass/main.jsx:8-9` → `src/glass/BottomDock.jsx:20-35` |
| Chromium gets the SVG `lens` engine, Safari gets `slices`; `?glass=` forces either | `src/glass/engine.js:13-17` |

State at load (probe 1, 5 s settle): `body.app-fullscreen`, `dockEngine=lens`, `#app-content` scrollHeight 1622 / clientHeight 852, `#device.device--large` (top edge `opacity:0`), no running rig.

---

## 2. Compositing inventory

### 2.1 Counts (computed-style sweep + LayerTree snapshot)

| metric | lens (Chromium) | slices (Safari path) |
|---|---|---|
| elements in DOM | **3,549** | **9,776** |
| `backdrop-filter` ≠ none | **19** (12 visible) | **20** |
| `filter` ≠ none | **8** (7 visible) | **16** |
| `.docklens__copy` (feed clones) | **1** | **15** |
| `.docklens__slice` (masked bands) | 0 | **14** |
| `.docklens__band > span` (blur stops) | **5** | **5** |
| `will-change` | **32** (31 transform) | **74** (73 transform) |
| `content-visibility:auto` | **0** | **0** |
| composited layers (snapshot) | **115** | — |
| clone nodes of the feed (443-node clone) | 6 × 443 = **2,658** = 75 % of DOM | 15 × 443 = **6,645** = 68 % of DOM |
| WebGL canvases drawing | **0** | **0** |

Sources: `probe10.mjs` → `inv-lens.json`, `inv-slices.json`; `probe1.mjs`; layer snapshot `probe2.mjs` → `probe2-layers.json`.

Layer snapshot (probe 2): 115 layers; largest **7 × 393×1622 CSS** (lens copy + 5 band copies + scroll layer), then **6 × 1146×100** (edge spans at a different raster scale), then four 256×256 map tiles.

### 2.2 Filtered surfaces: area × radius (lens engine, measured boxes)

**Re-measured this run** (`fs-audit2/inv.json`, computed styles, 393×852 dpr 3): top 5 by CSS px² × blur radius — all five are the band clones, i.e. 5 × `393×1622` carrying `blur(7/5.2/3.6/2/1px)` → **4.46 M / 3.31 M / 2.29 M / 1.27 M / 0.64 M px²·px**, 11.98 M total (`src/glass/band-mirror.js:22-29`, `src/glass/dock-band.css:15`). Next: `.docklens__lens` 329×92 `filter:url(#dlr11)` (`src/glass/DockLens.jsx:89`), then two `drop-shadow` SVGs. Backdrop-filter: 19 elements, of which **12 are off-screen/opacity-0** (5 top-edge spans at `opacity:0`, `src/os/edge-material.css:11-12`); the 7 visible ones total only **0.62 M px²·px** — i.e. the `filter:` band is **19×** the backdrop-filter budget.

| # | element | CSS box | CSS px² | device px² @3× | blur radius | where |
|---|---|---|---|---|---|---|
| 1 | `.docklens__lens` — SVG chain: `feGaussianBlur 1.2` + 3× `feDisplacementMap 3.2±0.96` + 4× `feColorMatrix` + 2× `feBlend` + `saturate` + `componentTransfer` = **12 primitives** | 365×128 (329×92 + 18 px bleed) | 46,720 | 420,480 | 1.2 px | `src/glass/DockLens.jsx:89`, chain `src/glass/lens-filter.jsx:28-52`, region `:24` |
| 2 | `.docklens__band-copy` #1 | 393×1622 | 637,446 | **5,737,014** | `blur(1px)` | `src/glass/dock-band.css:15`, built `src/glass/band-mirror.js:22-29` |
| 3 | `.docklens__band-copy` #2 | 393×1622 | 637,446 | **5,737,014** | `blur(2px)` | same |
| 4 | `.docklens__band-copy` #3 | 393×1622 | 637,446 | **5,737,014** | `blur(3.6px)` | same |
| 5 | `.docklens__band-copy` #4 | 393×1622 | 637,446 | **5,737,014** | `blur(5.2px)` | same |
| 6 | `.docklens__band-copy` #5 | 393×1622 | 637,446 | **5,737,014** | `blur(7px)` | same |
| 7 | `.docklens__copy` (feed clone feeding the SVG filter) | 393×1622 | 637,446 | 5,737,014 | (clipped to the lens) | `src/glass/lens-copy.jsx:17`, `dock-lens.css:15-17` |
| 8 | `.device__edge--top > span` ×5 | 393×104 each | 204,360 | 1,839,240 | 1.5 / 3 / 6 / 10 / **14 px** | `src/os/edge-material.css:5`; markup `frame.js:10`; stops `edge-stops.js:7` |
| 9 | `.device__edge` (bottom) `> span` ×5 | 393×78 each | 153,270 | 1,379,430 | 1 / 2 / 3.6 / 5.2 / **7 px** | same; stops `edge-stops.js:8` |
| 10 | `.tabbar__capsule-glass` | 93×48 | 4,464 | 40,176 | 4.5 px + saturate | `src/glass/dock-lens.css:50` (live `:65` → 6 px) |
| 11 | `.fab-gem` | 56×56 | 3,136 | 28,224 | 6 px + saturate | `src/glass/fab-gem.css:8` |
| — | **total** | — | **3,950,522** | **35,554,698** | — | — |

The viewport is **334,836 CSS px² / 3,013,524 device px²**. So the filtered stack is **11.8 viewports of CSS area (11.8× in device px too)**, the five band copies alone **9.52 viewports**, and the *visible* part of a band copy is 393×78 = **4.8 % of its area**. Top-5 costliest by `area × radius`: band copy #5 (4.46 M px²·px), #4 (3.31 M), #3 (2.29 M), #2 (1.27 M), #1 (0.64 M) — i.e. all five are the band.

### 2.3 Non-filtered glass layers

* `.docklens` / `.docklens__lens` / `.docklens__world` / `.docklens__copy` each `translateZ(0)` or `will-change:transform` → **4 nested composited layers** around the lens (`dock-lens.css:14-17`).
* `.tabbar`: `isolation:isolate` + 5 `box-shadow` layers (`dock-lens.css:10`); `.tabbar__tint` 6 inset shadows + 128° sheen `::after` (`:22-33`); `.tabbar__rim` conic-gradient with `mask-composite` (`:36-41`).
* `.tabbar__capsule` `will-change:transform` + 520 ms transform transition (`:43`); `::after` sweep `translateX(calc(var(--sweep) * 22px))` (`:54-58`).

### 2.4 Slices engine (what an iPhone runs)

`SLICES` = 14 masked copies (`slices-spec.js:26-31`) + 1 aligned base (`slice-bands.jsx:11-34`), each a `cloneNode(true)` of `#app-content` (443 elements, 393×1622). Two slices add `saturate(1.45) hue-rotate(±14deg)` (`slices-spec.js:21-24`); the lens adds `blur(1.2px) saturate(1.12)…` (`dock-lens.css:79-82`). Measured: 15 copies, 9,776 elements, 74 `will-change`, 0 `content-visibility`. `?dock=lean` empties `SLICES` (`slices-spec.js:40-50`) and hides the 5 band stops (`dock-band.css:20`) — the only cheap material path, and it is opt-in.

---

## 3. What is not there

* **No gem**: 0 running rigs, 2 canvases both 0×0 under `[hidden]`. `?gemphone` / `?gemdpr` ceilings (`gem-perf.js:23`) never apply.
* **No content-visibility** anywhere in the app (the repo's only rule is `src/ds/gallery-chrome.css:50`, not loaded here).
* No animation except `.opps__me::after` (infinite 1.8 s scale/opacity, `opps-home.css:36-37`) — see §6.8.

---

## 4. Measurements

### 4.0 Four-arm idle re-measure (this run: rAF deltas ×2 reps + Performance.getMetrics)

`probe.mjs` (this run, `/Users/irfan/.hermes/cache/scratch/fs-audit2/`), one Chrome process, 393×852 dpr 3, `--use-angle=metal`, page settled 7 s, arms applied by injected stylesheet (`canvas[data-gem],#gem-screen,#reward-sheet{display:none}` for gem-off; `#glass-top,#glass-bottom,.device__edge,.home-indicator-wrap{display:none}` for glass-off), 120 rAF deltas per sample, two reps interleaved A/B/C/D/A/B/C/D. **Headless rAF cadence quantizes to 16.7 / 33.4 / 50 / 66.7 ms**, so medians move in buckets and a one-bucket move is not a real regression — read the per-frame task/script columns, which are not quantized.

**State 1 — `?app=fullscreen` idle, no gem (the state the owner lands on):**

| arm | med ms (rep1·rep2) | spread p25–p75 | task/frame | layout/frame | style/frame | script/frame |
|---|---|---|---|---|---|---|
| a all on | 50.0 · 50.0 | 16.8–66.6 | 2.53 · 4.13 ms | 0.048 · 0.051 | 0.192 · 0.420 | 0.182 · 0.151 |
| b gem `display:none` | 49.9 · 50.0 | 33.3–50.1 | 1.96 · 4.50 | 0.031 · 0.062 | 0.140 · 0.430 | 0.126 · 0.174 |
| c glass `display:none` | 33.4 · 50.0 | 33.3–50.1 | **1.32 · 2.03** | 0.039 · 0.061 | 0.160 · 0.306 | 0.120 · 0.182 |
| d both off | 50.0 · 50.1 | 16.7–66.6 | 2.31 · 2.77 | 0.059 · 0.100 | 0.269 · 0.387 | 0.196 · 0.229 |

a ≡ b within noise on every column → **the gem is not in this frame at all**. Glass-off lowers main-thread task by **1.2–2.1 ms/frame** (≈50 %) but the rAF median does not separate: an empty page in this harness also reads 20–30 fps (§4.1), so frame *rate* here is the headless clock, not content.

**State 2 — reward sheet open (`is-gem-in`), gem live 340×320 CSS / 598×564 buffer:**

| arm | med ms (rep1·rep2) | spread p25–p75 | task/frame | layout/frame | style/frame | script/frame |
|---|---|---|---|---|---|---|
| a all on | **66.6 · 50.0** | 16.7–66.7 | **3.76 · 3.80** | 0.003 · 0 | 0.348 · 0.442 | **1.64 · 1.51** |
| b gem off | 50.0 · 50.1 | 16.7–66.6 | 1.08 · 1.01 | 0 · 0 | 0.288 · 0.275 | **0.030 · 0.028** |
| c glass off | 50.0 · 50.0 | 16.7–66.7 | 2.77 · 2.78 | 0.001 · 0 | 0.176 · 0.191 | 1.76 · 1.70 |
| d both off | 50.0 · 33.3 | 16.6–66.6 | 1.36 · 0.99 | 0 · 0 | 0.152 · 0.151 | 0.355 · 0.038 |

Marginal costs, ceremony state: **gem +2.70 ms task / +1.53 ms script** (a−b); **glass +0.99 ms task** (a−c); removing both recovers the only arm that drops below the 50 ms bucket (d rep2, 33.3 ms). Layout is zero in every ceremony arm — the sheet's morph is a transform/opacity animation, so it never relayouts.



### 4.1 Validity of frame-rate numbers in this harness (read this before the tables)

Each arm was run in its **own fresh Chrome process** (9 s settle → 2 s idle sample → 3 s scripted `scrollTop` at 16 px/frame), 3 reps (`probe9.mjs` → `ladder9.json`):

| arm | scroll fps, 3 reps | idle fps, 3 reps |
|---|---|---|
| A all-on | 20 · 20 · 20 | 20 · 20 · 20 |
| A2 band hidden | 20 · 15 · 20 | 20 · 59.5 · 20 |
| A3 lens SVG filter off | 20 · 30 · 20 | 20 · 29.9 · 30 |
| A4 band blur off | 20 · 20 · 20 | 20 · 20 · 20 |
| C glass hidden | 29.9 · 20 · 29.9 | 29.9 · 20 · 20 |
| D both hidden | 29.9 · 30 · 20 | 29.9 · 29.9 · 20 |
| S slices | 20 · 59.5 · 29.9 | 20 · 30 · 30 |
| S2 slices, copies hidden | 20 · 20 · 29.9 | 15 · 20 · 20 |
| SL slices + lean | 29.9 · 20 · 20 | 29.9 · 20 · 20 |
| L lens + lean | 20 · 30 · 20 | 20 · 30 · 20 |

**An empty page in this same harness measures 20–30 fps** (probe 2/3: blank 20 fps; blank 30 fps with a fresh process). Every arm, including "everything hidden", lands in the same 15–30 band. **The headless frame clock is the limiter; no arm separation is resolvable and no fps number here can be attributed to content.** Attribution therefore uses per-frame work only (§4.2–4.4), which is pacing-independent.

### 4.2 Main-thread work per frame (metrics only, no tracing — `probe13.mjs` → `metrics13.json`)

3 s scripted scroll at 16 px/frame, fresh process per arm; `Performance.getMetrics` deltas ÷ frames.

| arm | frames | TaskDuration/frame | LayoutDuration/frame | RecalcStyle/frame | Script/frame | main-thread duty |
|---|---|---|---|---|---|---|
| A all-on | 62 · 71 | 1.95 · 1.44 ms | 0.048 · 0.023 | 0.303 · 0.217 | 0.211 · 0.155 | 4.0 % · 3.4 % |
| A2 band hidden | 80 · 57 | 1.53 · 1.46 | 0.028 · 0.035 | 0.285 · 0.237 | 0.217 · 0.207 | 4.1 % · 2.7 % |
| A4 band blur off | 64 · 76 | 1.89 · 1.80 | 0.025 · 0.028 | 0.255 · 0.222 | 0.175 · 0.170 | 4.0 % · 4.5 % |
| A3 lens SVG filter off | 71 · 119 | **1.10 · 0.69** | 0.015 · 0.009 | 0.176 · 0.114 | 0.124 · 0.072 | 2.6 % · 2.7 % |
| C glass hidden | 74 · 64 | 1.04 · 1.03 | 0.028 · 0.034 | 0.155 · 0.147 | 0.218 · 0.242 | 2.5 % · 2.2 % |
| D both hidden | 69 · 59 | 1.67 · 1.34 | 0.058 · 0.061 | 0.290 · 0.229 | 0.475 · 0.369 | 3.8 % · 2.6 % |
| S slices | 76 · 102 | **3.13 · 1.54** | 0.028 · 0.010 | 0.309 · 0.147 | 0.218 · 0.091 | 7.9 % · 5.2 % |

Layout count is 31 for every arm (one forced layout per scroll settle, not per frame). **Conclusion: JS, style and layout are 2–8 % of wall time. The page's problem cannot be main-thread DOM work.**

### 4.3 Composite work per frame (traced 2.5 s scroll, fresh process per arm — `probe11.mjs` → `t11-*.json`)

ms per drawn frame, summed by thread: `comp` = renderer Compositor thread, `gpu` = CrGpuMain, `viz` = VizCompositorThread, `main` = CrRendererMain (inflated by tracing overhead — use §4.2 for main-thread truth).

| arm | frames in 2.5 s | comp/frame | gpu/frame | **comp+gpu/frame** | viz/frame | main/frame (traced) |
|---|---|---|---|---|---|---|
| **A** all-on | 45 | 15.77 | 12.83 | **28.60** | 9.50 | 18.20 |
| A2 band hidden | 64 | 8.84 | 7.98 | 16.82 | 4.24 | 7.84 |
| A4 band blur off (clones kept) | 56 | 12.86 | 8.22 | 21.09 | 6.32 | 15.94 |
| **C** glass hidden (dock lens+band, both edges, capsule, fab) | 61 | 4.57 | 4.73 | **9.29** | 1.70 | 8.82 |
| **S** slices engine | 62 | 8.92 | 15.06 | **23.98** | 7.50 | 26.26 |
| D both hidden | (≡ C modulo the 0×0 gem canvas) | — | — | — | — | — |
| B gem hidden | (≡ A — no gem exists to hide; verified `renderer:false`) | — | — | — | — | — |

### 4.4 Attribution

| contributor | ms/frame (comp+gpu) | share of A total | how measured |
|---|---|---|---|
| **Whole glass stack** | **19.31** | **68 %** | A − C |
| ├ 5 band clones incl. their blur | 11.78 | 41 % | A − A2 |
| │ └ of which the `blur()` itself | 7.51 | 26 % | A − A4 (clones kept, filter removed) |
| │ └ of which 5 extra blurred layers/passes | 4.27 | 15 % | A2 vs A4 |
| └ rest of glass: SVG lens filter + copies + 10 edge `backdrop-filter` spans + capsule + fab | 7.53 | 26 % | (A − C) − (A − A2) |
| **Page without glass** (feed, map, cards) | 9.29 | 32 % | C |
| Gem | 0.00 | 0 % | never mounts |

The same glass stack but on the **Safari path** costs 23.98 ms/frame, with GPU at **15.06 ms/frame** (the highest GPU figure measured) — 14 masked copies are drawn per frame instead of one SVG filter.

dpr check (`probe15.mjs`, same arm A, fresh process per dpr): comp/frame **14.04 / 14.73 / 14.45 ms** at dpr 1 / 2 / 3 — flat within noise. On this GPU the cost is **per-pass overhead and blur chains, not raw fill area**, so this harness cannot tell us what the same passes cost on a phone's fill rate. It does mean the cost does not vanish by lowering dpr.

### 4.5 The gem, where it does exist (reward sheet open)

Opening the reward sheet (`click` on the peak bar, `probe12.mjs`) mounts the rig: canvas 340×320 CSS, **drawing buffer 538×507 = 273 k px**, `renderer:true`, rAF running. Idle, traced on/off in one process (`probe14.mjs` → `t14-gem-*.json`, 2.2 s each, same frame clock):

| state | frames | main/frame | gpu/frame | comp/frame |
|---|---|---|---|---|
| gem spinning | 50 | 14.73 ms | **12.54 ms** | ~19 ms |
| gem parked (`cancelAnimationFrame` + hidden) | 48 | 0.60 ms | **2.22 ms** | ~12 ms |
| **gem marginal** | — | **+14.1 ms** | **+10.3 ms** | +7 ms |

So a 273 k-px gem costs ~10 ms GPU per frame on an M1 Max — **~37 ns/px**, i.e. a full-viewport gem at dpr 3 would be ~110 ms/frame on this GPU. That is the gem cost *when there is a gem*; it is **not** part of the fullscreen 20 fps state.

### 4.6 Raster evidence (a single full-feed layer)

In the A trace, `layerId 12` (one of the 393×1622 layers) took **11.08 ms of raster across 3 RasterTasks (max 6.74 ms)**; total raster in the 2.5 s scroll was 14.0 ms, i.e. essentially all of it is those full-feed layers. One full-feed layer ≈ **3.7–6.7 ms to raster on an M1 Max GPU**; six of them ≈ 22–40 ms whenever they are invalidated (image decode, map tile fade, clone rebuild on tab switch).

---

## 5. Verdict

**Share of the fullscreen frame (M1 Max headless, dpr 3, composite comp+gpu ms from §4.3; gem from §4.5):**

| state | baseline compositor (page, no glass) | DOM glass | gem canvas | total |
|---|---|---|---|---|
| at rest (`?app=fullscreen`, no ceremony) | 9.29 ms (32 %) | **19.31 ms (68 %)** | 0 (no gem mounted) | 28.60 ms |
| ceremony open (gem live, 337 k px) | 9.29 ms + gem 10.3 ms | 19.31 ms | **10.3 ms GPU** | ~39 ms |

* **At rest, DOM glass is the whole story.** 100 % of the page's extra work is DOM/compositing; the gem is not on screen. Glass is **68 %** of composite work and the progressive-blur band alone is **41 %**.
* **With the ceremony open, the split is roughly 26 % gem / 49 % glass / 25 % baseline** on this GPU (10.3 / 19.3 / 9.3 of 38.9 ms). On the main thread the gem costs **+2.70 ms/frame task (+1.53 ms script)**, glass **+0.99 ms** (§4.0) — the gem is the bigger *new* item, glass the bigger *absolute* one.
* **Can DOM glass alone explain ~20 fps on a phone? Yes.** 28.6 ms/frame composite is **1.72× a 60 Hz budget on an M1 Max** before any phone penalty; a phone GPU runs the same ~30 passes with less throughput per pass and per pixel, and this audit measures **no phone**. But two facts are phone-relevant: the cost is **per-pass, not per-pixel** (dpr 1/2/3 measured 14.04/14.73/14.45 ms, flat), so a `?gemphone`-style dpr cap cannot rescue it; and the 6 full-feed 393×1622 layers must be **rasterized at 1179×4866 device px each** whenever invalidated.
* **What the gem adds on a phone is not measurable here.** 10.3 ms GPU at 337 k px on an M1 Max is ~37 ns/px; a handset GPU with a fraction of that fill rate and a larger buffer pays several times more — so in the ceremony state the gem is a plausible co-dominant cost, not a rounding error.
* Fixing the band alone (clamp clones to the 78 px band, one blurred stop, or `?dock=lean`) removes ~41 % of composite work; dropping the SVG lens filter removes another ~1.4 ms main-frame and ~5 ms composite. Together that is the difference between "over budget" and "inside budget" here.

**Label:** every figure in this file is measured on an M1 Max in headless Chrome (ANGLE/Metal). None is a phone measurement.

---

## 6. Waste list (pure waste, with file:line)

| # | waste | evidence | fix |
|---|---|---|---|
| 6.1 | **5 band clones are full-feed, 393×1622, for a 78 px band.** Each is a `cloneNode(true)` of `#app-content` (443 nodes) sized to the whole feed, and gets `filter: blur()` over its *whole* box; only 4.8 % of that area is visible after the mask. 9.5 viewports of blurred surface. | `src/glass/band-mirror.js:22-29` (`buildBand` clones the feed per stop), `src/glass/dock-band.css:15` (blur + `will-change`), stops `src/device/edge-stops.js:8`. Measured 11.78 ms/frame (41 %). | Build the band copy at band height (78 px) and translate the inner feed, so the filter surface is 393×78 not ×1622; or collapse to 1–2 stops; or make `lean` the default (`slices-spec.js:40-50`, `dock-band.css:20`). |
| 6.2 | **Blur radius ladder larger than the band can show.** 5 stops at 1/2/3.6/5.2/7 px over a 78 px band; the 7 px stop's area×radius is 4.46 M px²·px, ~43× the capsule's. | `src/device/edge-stops.js:8` (`BOT`), `dock-band.css:15`. Blur alone = 7.51 ms/frame (26 %). | Reduce to 2–3 stops, cap at ~4 px, or one `backdrop-filter` on the band (already measured cheap: 5 spans = 3.2 M device px). |
| 6.3 | **Top edge material is 5 `backdrop-filter` layers at `opacity:0`.** `#device.device--large` is always set on this screen, and the top edge is `opacity:0`, but all five 393×104 spans stay in the layer tree and keep being composited against the backdrop. | `src/os/edge-material.css:11-12`; markup `src/device/frame.js:10`; `device--large` set at `src/patterns/OppsHome/opps-home.js:59`; measured 5 × 393×104 = 1.84 M device px of backdrop per frame. | `display:none` (or `visibility:hidden` + `content-visibility:hidden`) until `.device--scrolled`; the fade only needs to start at the transition. |
| 6.4 | **The lens SVG filter runs 12 primitives every scroll frame** on the element that also contains a 443-node feed clone, with 4 nested forced layers around it. | `src/glass/DockLens.jsx:89` (`filter:url(#id)`), chain `src/glass/lens-filter.jsx:28-52`, 4 layers `src/glass/dock-lens.css:14-17`. Removing it: main-frame task 1.95→1.10 / 1.44→0.69 ms per frame, composite −~3–5 ms. | Pixel-snapshot the refracted result (cache the filter output) instead of re-filtering live content per frame; or ship `slices`/`lean` as the default material on constrained devices. |
| 6.5 | **Slices path duplicates the feed 15×** — 9,776 elements, 6,645 clone nodes, 74 `will-change`, 2 hue-rotate filters, for a 293×56 dock. | `src/glass/slices-spec.js:26-31` (14 slices), `src/glass/slice-bands.jsx:11-34`, `src/glass/dock-lens.css:77-82`. Measured 23.98 ms/frame composite, 15.06 ms GPU. | On iOS, default to `lean` (or 3 slices) — the ladder is a material nicety that costs 2.75× the DOM. |
| 6.6 | **`will-change:transform` on 31–73 elements**, including every clone and every band stop → permanent promotion of 7 × 393×1622 layers. | `src/glass/dock-lens.css:17,43,78`, `src/glass/dock-band.css:15`, `src/glass/fab-gem.css:11`. | Keep `will-change` only on the elements that actually animate per frame (the copy, the capsule during drag); drop it from the 5 band stops and the static slices. |
| 6.7 | **No `content-visibility` on the feed**: 477 nodes + 6 clones, all restyled whenever the source changes (tab switch rebuilds every clone: `DockSlices.jsx:51-57`). | 0 `content-visibility:auto` in the app (sweep), `contentVisibility` only in `src/ds/gallery-chrome.css:50`. | `content-visibility:auto` on the off-screen card list, and skip clones in the rebuild path (`app-tab` event) when the material is `lean`. |
| 6.8 | **Animation running at idle**: `.opps__me::after` infinite 1.8 s scale+opacity on the map marker, inside the scrolling feed. | `src/patterns/OppsHome/opps-home.css:36-37`; `document.getAnimations()` returns it at rest; `AnimationHost::TickAnimations` 229 events per 3.2 s in the idle trace. | Gate on `.device--scrolled`/IntersectionObserver, or `animation-play-state:paused` when the map is off-screen. |
| 6.9 | **`transition: backdrop-filter` and translucent-state transitions** on the capsule re-raster the filtered region while animating. | `src/glass/dock-lens.css:52` (`transition:…backdrop-filter…`), `:65` live 6 px. | Don't transition `backdrop-filter`; cross-fade a static tint instead. |
| 6.10 | **Nested filtered/clipped ancestors**: `.docklens` (overflow hidden + translateZ) → `.docklens__lens` (SVG filter) → `.docklens__world` (overflow hidden) → `.docklens__copy` (will-change) → 443 nodes; plus `.docklens__band > span` (mask) → `.docklens__band-copy` (blur + will-change). Each level is a separate render pass/layer. | `src/glass/dock-lens.css:14-18`, `src/glass/dock-band.css:14-15`, `src/glass/lens-copy.jsx:11-21`. | Flatten: one clip, one filter, one animated transform. |

---

## 7. Raw artifacts (same directory)

| file | what |
|---|---|
| `fs-audit2/probe.mjs`, `fs-audit2/inv.json`, `fs-audit2/arms-plain.json`, `fs-audit2/arms-ceremony.json`, `fs-audit2/meta.json` | **this run**: four-arm idle matrix (a/b/c/d ×2 reps) in both states, computed-style inventory (3,549 nodes, 19 backdrop-filter, 8 filter, 32 will-change), LayerTree count (181–189 layers), gem mount check |
| `probe1.mjs`, `probe1-fullscreen.png` | route/state capture + inventory |
| `probe2.mjs`, `probe2-layers.json` | headless-clock control + 115-layer snapshot |
| `probe4.mjs`, `probe4-layers.json` | gem rig state, clone sizes, compositing reasons |
| `probe9.mjs`, `ladder9.json`, `run9-clean.log` | 10 arms × 3 reps, fresh process each (frame-rate ladder) |
| `probe10.mjs`, `inv-lens.json`, `inv-slices.json`, `inv-lenslean.json` | element/filter/animation inventory per engine |
| `probe11.mjs`, `t11-{A,A2,A4,C,S}.json` | traced per-frame composite table |
| `probe13.mjs`, `metrics13.json` | metrics-only main-thread per frame |
| `probe15.mjs`, `t15-dpr{1,2,3}.json` | dpr scaling check |
| `probe12.mjs`, `gem-arm.json` | reward sheet → gem rig mount |
| `probe14.mjs`, `t14-gem-on.json`, `t14-gem-off.json` | gem marginal GPU/main cost |
| `t11-contaminated-*.json`, `ladder9-contaminated.json` | first runs, kept for provenance (ran while another browser was measuring — superseded) |

Harness: `/Users/irfan/.hermes/cache/scratch/fs-audit/`, own Vite on `127.0.0.1:5422` (`--strictPort`), headless Chrome launched per measurement, all processes killed after.
