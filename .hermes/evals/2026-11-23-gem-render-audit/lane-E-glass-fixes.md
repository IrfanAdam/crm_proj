# Lane E — glass layer stack: exact-waste removal (pixel-gated)

**Date** 2026-11-23 · **Repo** `crm_proj` @ `f350e75` + working tree edits (below) · **View** `/index.html?app=fullscreen`
**Harness** headless Chrome 157, `--headless=new --use-angle=metal`, CDP over `ws`, viewport **393×852 CSS @ dpr 3** (1179×2556 surface), mobile + touch emulation. Own Vite on `127.0.0.1:5425` (`--strictPort`); `:5173` never touched. Scratch: `/Users/irfan/.hermes/cache/scratch/glass-fix/`.

> **Reference** lane C measured the *before* state on the same machine class (M1, metal): rest frame composite **28.60 ms** = glass **19.31 ms (68 %)** + baseline compositor **9.29 ms**; band clones 11.78 ms, blur 7.51 ms. Nothing in this file re-measures composite ms (see §4 limits); the before numbers below are lane C's.

---

## 0. What shipped

| # | § | change | files |
|---|---|---|---|
| 1 | 6.3 | top-edge stop spans no longer exist as layers while `.device--large` is at rest (`display:none` until `.device--scrolled`) | `src/os/edge-material.css` |
| 2 | 6.6 | `will-change:transform` dropped from the 5 band stops and the static slice copies (kept on `.docklens__copy`, the capsule) | `src/glass/dock-band.css`, `src/glass/dock-lens.css` |
| 3 | 6.8 | marker pulse pauses via IntersectionObserver when the map card leaves the viewport | `src/patterns/OppsHome/opps-home.css`, `src/patterns/OppsHome/opps-home.js` |
| — | 6.1 | **band-clone rebuild ATTEMPTED AND REVERTED** — failed its gate (§3.4) | `src/glass/band-mirror.js`, `src/glass/dock-band.css` (reverted to HEAD) |

`git diff` touches only those five files (plus a sibling lane's `src/components/GemReward/gem3d.js`, not mine). No commits.

---

## 1. Gate method

* **Baseline set** captured before any edit: tag `base` (+ a second independent run `base2` for the noise floor). States per tag: `rest`, `rest-pinned`, `rest-pinned2`, `scroll600`, `scroll600-pinned`, `ceremony`, `ceremony-pinned`, `ceremony-pinned2` — raw PNG buffers, 1179×2556, sha256 and byte counts in `shots/<tag>/meta.json`; element/filter/will-change/animation/layer inventory in `shots/<tag>/inventory.json`.
* **Determinism:** every diff state pins the infinite CSS animations at phase 0 (`a.pause(); a.currentTime = 0`) and parks the gem rAF loops + hides the gem canvas, so a diff isolates the glass change. Intra-run determinism is **exactly 0** (`rest-pinned` vs `rest-pinned2` = 0.000 % >0, maxΔ 0; same for `ceremony-pinned`).
* **Cross-run noise floor** (`base` vs `base2`, same build, fresh process): rest **2.44 % >0 / maxΔ 119**, `rest-pinned` **1.46 % / maxΔ 41**, `scroll600-pinned` **0.079 % / maxΔ 2**. This is remote content (i.pravatar.cc avatars, OSM tiles) loading differently per process — not the glass. **Every glass region is 0.000 % in the same control**, which is why the gates below are region-scoped rather than relying on a full-frame zero.
* Regions (device px, from the baseline inventory): `band` 393×78 at the screen bottom, `edgeTop` 393×104 at the top, `dock` = tabbar ±20 px, `bottom` = y ≥ 692 CSS.
* Diff = % of pixels whose max RGB channel delta exceeds 0 / 1 / 2 of 255, plus maxΔ. Tool: `diff.mjs` (PNGs decoded in-page via canvas; `shots/diff-*.json`).

---

## 2. Gate table

Baseline for each row is the previous verified tag (`t1`→`t2`→`final`), so a row isolates one item.

| # | item | state | affected region | %>0/255 | %>1/255 | %>2/255 | maxΔ | verdict |
|---|---|---|---|---|---|---|---|---|
| 1 | 6.3 top-edge spans | rest (`rest-pinned`) | edgeTop / band / dock / bottom | **0.000** | 0.000 | 0.000 | **0** | **PASS** (gate: 0.000 % >0) |
| 1 | 6.3 | rest, full frame | — | 2.448 | 0.029 | 0.018 | 52 | within noise floor (2.44 % / Δ119) |
| 1 | 6.3 | scrolled 600 | edgeTop | 2.639 | 0.211 | 0.036 | **7** | material still renders; **residual Δ7 reported, not 0** |
| 1 | 6.3 | scrolled 600 | band / dock / bottom | 0.000 | 0.000 | 0.000 | 0 | PASS |
| 1 | 6.3 | ceremony | all regions | 0.000 | 0.000 | 0.000 | 0 | PASS |
| 2 | 6.6 will-change | rest | all regions | **0.000** | 0.000 | 0.000 | **0** | **PASS** (gate: 0.000 % >1) |
| 2 | 6.6 | scrolled 600 | all regions | **0.000** | 0.000 | 0.000 | **0** | PASS |
| 2 | 6.6 | ceremony | all regions | 0.000 | 0.000 | 0.000 | 0 | PASS |
| 3 | 6.8 idle animation | rest | all regions | **0.000** | 0.000 | 0.000 | **0** | **PASS** (pulse still runs on screen; identical at the pinned phase) |
| 3 | 6.8 | scrolled 600 (map off-screen) | band / dock / bottom | 0.472 | 0.005 | 0.000 | **2** | PASS — Δ2 is the cross-run noise class (control: 0.079 % / Δ2) |
| 4 | 6.1 band copy at band height | rest | band | 0.871 | 0.412 | **0.223** | **7** | **FAIL** |
| 4 | 6.1 | scrolled 600 | band | 5.686 | 3.847 | **2.696** | **25** | **FAIL** → reverted |
| 4 | 6.1 | scrolled 600 | dock (capsule samples the band) | 5.519 | 3.734 | 2.617 | 25 | FAIL |

Hard counts (final build vs `base`): `will-change` elements **32 → 27**, composited layers **115 → 105**, top-edge stop spans painted at rest **5 → 0**, band copies unchanged at 393×1622 ×5 (item 4 reverted).

**Where the 1.84 M device px went:** the 5 × 393×104 backdrop-filter stops are no longer in the layer tree at rest (`document.querySelectorAll('.device__edge--top>span')` filtered by `display!=='none'` = 0). Layer snapshot for the whole frame drops 10 layers with it.

**Residual on item 1 (reported, not hidden):** once `.device--scrolled` flips, the freshly mounted stops blur a fresh backdrop, where the baseline had a backdrop snapshot produced while the spans sat at `opacity:0`. That shows up as **2.64 % of the top-edge strip with maxΔ 7/255 (2.7 %)**, above the same-region control (0.62 % / Δ2). The material itself renders correctly (opacity 1, all 5 stops painted, 78/104 px coverage unchanged). It is a sub-3 % luminance shift inside a blurred gradient overlay; if that is not acceptable, the alternative is `visibility:hidden` + `content-visibility:hidden` (keeps the layer, removes the paint pass) — cheaper than baseline but not zero-cost, and unmeasured here.

---

## 3. Item detail

### 3.1 §6.3 top-edge spans — shipped
`src/os/edge-material.css`: `#device.device--large:not(.device--scrolled) .device__edge--top>span{display:none}`. The `.device--large` / `.device--scrolled` pair already exists (`opps-home.js:44`), so no new state hook was needed. The fade itself is untouched: the spans mount on the same class flip that starts the `opacity` transition, and the parent's opacity multiplies the whole edge either way. Screens that are not `.device--large` (other tabs, non-large-title screens) keep the always-on band, unchanged.

### 3.2 §6.6 will-change — shipped
`dock-band.css:15` (`.docklens__band-copy`, 5 nodes) and `dock-lens.css:78` (`.docklens__slice>.docklens__copy`, slices engine). Both are then carried by a `blur()` filter (band) or by the slice material, so both promote anyway — the extra hint only pinned them. `.docklens__copy` in the lens path (`dock-lens.css:17`) **keeps** `will-change` because it is rewritten with `translateY` every scroll frame (`lens-copy.jsx:40`); the capsule (`:43`) keeps it too. Verified `will-change` 32 → 27.

### 3.3 §6.8 idle animation — shipped
`opps-home.js` adds an `IntersectionObserver` on `.opps__map` toggling `opps--map-off` on `#opps-home`; `opps-home.css` adds `.opps--map-off .opps__me::after{animation-play-state:paused}`. Verified live: map on screen → `playState:"running"`, `mapOff:false`; scrolled 600 → `playState:"paused"`, `mapOff:true`; scroll back → `running` again. **`document.getAnimations()` at rest: 1 before, 1 after** (the pulse, running — it is on screen at rest, so pausing it there would have been a visible change; the audit's "at rest" framing is wrong for this element).

### 3.4 §6.1 band clone at band height — ATTEMPTED, FAILED GATE, REVERTED
Rebuilt as `span > .docklens__band-win (78 + 14 px bleed, overflow hidden, filter:blur(--b)) > .docklens__band-copy (feed clone, translated)` with the same `top`/`translateY` mapping plus the 14 px bleed, so the blur surface went 393×1622 → 393×92 per stop (17.6× smaller, ~9.5 viewports of blurred surface removed for a 78 px band).
It changes the band: **rest band 0.22 % >2/255 maxΔ 7; scrolled band 2.70 % >2/255 maxΔ 25** (and the capsule that samples the band moves with it, 2.62 % maxΔ 25). The cause is edge sampling: the old copy's blur kernel had feed pixels 700+ px above the band to pull from, the windowed one clamps 14 px above the band top. `git diff` for `band-mirror.js` and the two `dock-band.css` rules is clean against `HEAD`; the final capture's band region diffs **0.000 % maxΔ 0** against the pre-attempt build, i.e. the revert is exact.

Ways to get most of the win without the edge change (untested, for the next lane): keep the full-bleed *upper* stop only (blur 5.2/7 px, the expensive ones by px²·px) and window the cheap ones; or make `lean` the default for the 3 strongest stops; or cache the band's blurred surface as an image and translate it (no filter per frame at all).

---

## 4. Timings — before → after, and what is *not* measured

Four-arm protocol (a all / b gem off / c glass off / d both off), one process, 2 reps interleaved, 120 rAF deltas + `Performance.getMetrics` per arm, fresh page:

| state | arm | med ms (lane C before → lane E after) | task/frame before → after | style/frame | script/frame |
|---|---|---|---|---|---|
| rest | a all on | 50.0 → **66.6 · 33.4** | 2.53/4.13 → **1.17 · 2.19** | 0.19/0.42 → 0.11 · 0.30 | 0.18/0.15 → 0.12 · 0.12 |
| rest | b gem off | 49.9 → 33.4 · 33.4 | 1.96/4.50 → 1.04 · 1.50 | 0.14/0.43 → 0.10 · 0.19 | 0.13/0.17 → 0.09 · 0.07 |
| rest | c glass off | 33.4 → 33.4 · 16.7 | 1.32/2.03 → 1.74 · 0.62 | 0.16/0.31 → 0.27 · 0.11 | 0.12/0.18 → 0.17 · 0.07 |
| rest | d both off | 50.0 → 50.1 · 33.3 | 2.31/2.77 → 1.59 · 0.68 | 0.27/0.39 → 0.19 · 0.11 | 0.20/0.23 → 0.14 · 0.07 |
| scroll 600 | a all on | — → 33.4 · 16.7 | — → 0.57 · 0.60 | — → 0.16 · 0.15 | — → 0.02 |
| scroll 600 | c glass off | — → 33.3 · 33.4 | — → 0.31 · 0.31 | — → 0.07 | — → 0.02 |

**Read this honestly:** headless rAF cadence quantizes to 16.7 / 33.4 / 50 / 66.7 ms (lane C §4.1), so the medians move in buckets and one bucket is not a frame-rate claim; the main-thread `task` columns are noise-dominated at this sample size and even invert between arms (glass-off reads *higher* than all-on in rep 1). **No defensible per-frame composite ms was produced for the after state** — that needs a traced run (`probe11.mjs`-style comp/gpu/zviz sums per frame) which did not fit the time budget, and inventing a number would be worse than saying so. The lane C figure to beat is 28.60 ms composite at rest (glass 19.31 of it).

What *is* measured and hard, at rest: **10 fewer composited layers** (115 → 105), **5 fewer promoted elements** (will-change 32 → 27), **5 backdrop-filter surfaces (5 × 393×104 = 1.84 M device px) gone from the frame**, and **1 infinite animation parked** whenever the map is off-screen (it resumes on return — no visual delta). All of it pixel-gated at 0.000 % in the glass regions.

---

## 5. Intentionally NOT done

| item | why |
|---|---|
| **6.1 band clones → band height** | Fails the gate: band pixels change (**rest maxΔ 7 / 0.22 % >2; scrolled maxΔ 25 / 2.70 % >2**) because the window clamps the blur kernel's edge sampling. Reverted verbatim; the largest single win (11.78 ms/frame, 41 %) is still on the table — see §3.4 for windowed/ladder-reduction variants that keep enough bleed. |
| **6.2 blur ladder → 2–3 stops** | Visibly changes the material (fewer steps in the gradient). Outside "performance without visual change"; needs an owner decision. |
| **6.4 lens SVG filter (12 primitives/frame)** | Any fix (snapshot/static refraction) changes the live refraction; a pixel snapshot is a design decision, not a safe subset. Also lane C measured it as ~5 ms composite, second only to the band. |
| **6.5 slices path (15 clones)** | iOS/Safari only; not reachable in this harness (`?glass=slices` forced is a different engine than the device will pick). Would need a WebKit gate. |
| **6.7 `content-visibility:auto` on the feed** | Changes paint/raster timing; not verifiable as pixel-identical within budget (and `content-visibility` on the clone *source* would affect every clone). |
| **6.9 `transition: backdrop-filter` on the capsule** | Only fires on tab change; replacing it with a tint cross-fade is a visible refactor of the press animation. |
| **6.10 flatten nested filtered ancestors** | Structural rewrite of the dock (one clip / one filter / one transform); cannot be gated as "no visual change" without the owner's eyes. |
| pause the pulse **inside the 6 refraction clones** | 6 more infinite `opps-me` animations live inside `.docklens__copy` / the band copies (found while verifying: 7 total when the dock copies animate). They may be off-screen in those copies when the map is out of view, but I could not gate that (band pixels) inside the budget — worth one measured follow-up, it is the remaining `AnimationHost::TickAnimations` source. |

---

## 6. Artifacts (scratch, `/Users/irfan/.hermes/cache/scratch/glass-fix/`)

| file | what |
|---|---|
| `shots.mjs` | capture rig: 3 states × pinned/natural, PNG + sha256 + dims + inventory + layer count |
| `diff.mjs` | pixel gate: in-page canvas diff, full frame + `band`/`edgeTop`/`dock`/`bottom` regions, 0/1/2-of-255 thresholds |
| `measure.mjs` | four-arm rAF + metrics, rest and scroll600 |
| `shots/base`, `shots/base2` | baseline (pre-edit) captures + noise-floor control |
| `shots/t1`, `t2`, `t3`, `t34`, `final` | after item 1, +item 2, +item 3; `t34` = +item 4 (rejected) |
| `shots/diff-*.json` | every gate table above in machine-readable form |
| `measure-after.json` | four-arm after-state numbers + live animation/`will-change` inventory |

**Caveat on the run:** a sibling lane modified `src/components/GemReward/gem3d.js` mid-session (Vite reloads). The ceremony gate is unaffected (0.000 % / maxΔ 0, gem parked) but the doc's ceremony numbers should be read from the `final` tag only.
