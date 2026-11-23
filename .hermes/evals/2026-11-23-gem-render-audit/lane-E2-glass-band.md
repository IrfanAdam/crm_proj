# Lane E2 — unblock lint, then the band-clone win by a different mechanism

**Date** 2026-11-23 · **Repo** `crm_proj` @ `f350e75` + working tree · **View** `/index.html?app=fullscreen`
**Harness** headless Chrome (CDP over ws, `shots.mjs`/`diff.mjs` from `glass-fix`, retargeted), viewport **393×852 @ dpr 3** (1179×2556). Own Vite on `127.0.0.1:5427` (`--strictPort`); `:5173` untouched. Scratch: `/Users/irfan/.hermes/cache/scratch/glass-fix2/`.
**Baseline** `b0b` = the build with A applied and the band stack at HEAD. Determinism: `rest-pinned` vs `rest-pinned2` = **0.000 % >0, maxΔ 0** (PNG bytes differ, pixels identical).

---

## A. Line budget — FIXED, gated

**What changed**

| file | change |
|---|---|
| `src/patterns/OppsHome/opps-home-intersect.js` | **new.** `observeMapPulse(root)` — one module-scoped `IntersectionObserver`, toggles `opps--map-off` on the pattern root. |
| `src/patterns/OppsHome/opps-home.js` | 103 → **93 lines**: the 11-line inline observer block deleted, 1 import added, call site now `observeMapPulse(root)`. |

**A defect caught before shipping.** The first cut of the extraction moved the function but left the call as `observeMapPulse()`; the extracted function takes `root` as a parameter (the inline version closed over the module-scoped `root`), so `root?.querySelector` short-circuited and **the observer was never constructed**. Shipped in that state it would have silently re-enabled the 1 infinite off-screen animation with no pixel change to catch it. Caught by instrumenting `IntersectionObserver` in-page: the only observer on the page was Leaflet's (`opts {}`, target `.opps__tiles`), never ours (`opts {"threshold":0}`, target `.opps__map`). Fixed at the call site; the gates below are from the fixed build.

**Gates**

| gate | result |
|---|---|
| `npm run lint:tokens` | **exit 0** — `0 raw leaks, 0 over-limit (1881 files scanned)` |
| `npx vite build --mode production` | **exit 0** — built in 1.58 s |
| pulse off-screen | `rest` `playState: running`, `mapOff:false` → `scrollTop 600` (map rect t:-330) **`paused`, `mapOff:true`** → back at rest **`running`, `mapOff:false`** |
| pixel diff, pre-extraction (`a0`) vs post (`b0b`) | rest / scroll600 / ceremony: **0.000 % >0, maxΔ 0** in `band`, `edgeTop`, `dock`, `bottom`; scroll600 and ceremony **0.000 % full frame**. Rest full frame 1.46 % >0 / maxΔ 137 — remote avatar + OSM tile content, **outside every glass region** (same noise class as lane E's 2.44 % / Δ119 control). |
| inert-observer build (`b0`) vs fixed (`b0b`) | scroll600 **0.000 % full frame** — the parked pulse contributes no sampled pixel, confirming "no visual change". |

---

## B. Band clone win by backdrop-filter — tried, **FAILED its gate, REVERTED byte-clean**

**Mechanism tested** (not the windowed clone — that one already failed in lane E): keep the band's 5-stop radius ladder exactly as-is, but stop building 5 blurred `cloneNode(true)` copies. Build **one unblurred feed copy** inside `.docklens__band` (still 1:1 translated by `placeBand`, so it is still "what the band sees"), and let the five existing stop spans sample it with `backdrop-filter: blur(var(--b))` under their own `--a/--z` masks:

```css
.device .docklens__band>span{…;backdrop-filter:blur(var(--b));-webkit-backdrop-filter:blur(var(--b));mask-image:linear-gradient(to bottom,transparent var(--a),#000 var(--z))}
.device .docklens__band-src{position:absolute;left:0;top:0}   /* the one unblurred copy */
```

The ladder semantics are unchanged (same 5 stops, same `--b`/`--a`/`--z` from `edge-stops.js BOT`), so no visual-ladder compromise was made.

**It does cut the structure** (DOM-measured, `inventory.json`):

| metric | before (`b0b`) | variant (`b2`) |
|---|---|---|
| band feed copies | **5** (each 393×1622, each with `filter: blur()`) | **1** (393×1622, no filter) |
| blurred filter surfaces in the band | **5** | **0** |
| backdrop-filter surfaces in the band | 0 | 5 |
| composited layers (whole frame) | **105** | **66** |
| `filter:` elements, frame total | 8 | 3 |

**Gate table** (vs `b0b`, deterministic states, infinite animations pinned at phase 0, gem rAF parked + canvas hidden)

| state | region | %>0/255 | %>1/255 | %>2/255 | maxΔ | meanΔ | verdict |
|---|---|---|---|---|---|---|---|
| rest | **band** | **10.297** | 3.475 | **2.113** | **5** | 0.165 | **FAIL** (gate: 0.000 % >2) |
| rest | dock | 10.047 | 3.372 | 2.051 | 5 | — | FAIL |
| rest | bottom | 5.047 | 1.694 | 1.030 | 5 | — | FAIL |
| rest | edgeTop | 0.000 | 0.000 | 0.000 | 0 | 0 | pass |
| scroll 600 | **band** | **14.364** | 9.833 | **7.293** | **64** | 0.971 | **FAIL** |
| scroll 600 | dock | 13.950 | 9.544 | 7.078 | 64 | — | FAIL |
| scroll 600 | bottom | 7.007 | 4.794 | 3.555 | 64 | — | FAIL |
| scroll 600 | edgeTop | 0.000 | 0.000 | 0.000 | 0 | 0 | pass |
| ceremony | all regions | 0.000 | 0.000 | 0.000 | 0 | 0 | pass (sheet covers the band) |

**Why it cannot match.** The band mirror is not a decoration over the screen — it reconstructs the *lens' backdrop world* so the refracted copy shows the banded feed at the lens' own offset. A `backdrop-filter` inside the lens samples the **composited backdrop below the dock**, which already contains the real bottom edge material (itself 5 backdrop-filter stops over the feed). So the variant applies the ladder **twice** and samples a different set of pixels: at rest the difference is a sub-2 % luminance/mask-edge shift (maxΔ 5, the kernel edge), but once the feed slides the sampled content diverges and it becomes visible (**7.3 % of band pixels >2/255, maxΔ 64**). This is the same class of failure as the windowed clone — the band's pixels are extremely sensitive to *which* pixels the blur kernel samples, so any mechanism that changes the sample set changes the material.

**Frame time — no ms claimed.** The variant's four-arm run (`a all` / `b gem off` / `c glass off` / `d both off`, 2 reps × 120 rAF, `Performance.getMetrics`) landed every arm in the same 50 / 66.6 ms rAF buckets, including glass-off (`measure.json`): headless rAF cadence quantizes to 16.7/33.4/50/66.7, so there is no separable signal at this sample size. Claiming "N ms recovered" from those medians would be inventing a number. The structural counts above are the only hard measurements of the variant.

**Revert is byte-clean.** `band-mirror.js` and `dock-band.css` restored from pre-test copies; `shasum` equals the pre-test record (`d1fe3c9d…`, `2bef9880…`); `git diff` for both files is back to the pre-test state (i.e. only lane E's `will-change` edit remains in `dock-band.css`).

---

## What remains of the 41 %

**All of it.** The band is still 5 × `cloneNode(true)` of the 443-node feed, each 393×1622 with a `filter: blur()` over the whole box, masked down to a 78 px band — the **11.78 ms/frame** lane C measured (41 % of the 28.60 ms rest composite) is untouched. Nothing in this lane reduced it.

Known paths, now with one more dead end recorded:

| path | status |
|---|---|
| window the clone to band height | **dead** (lane E: 2.70 % >2 / maxΔ 25 scrolled) |
| backdrop-filter on the band (this lane) | **dead** (7.29 % >2 / maxΔ 64 scrolled) |
| drop the ladder to 1–2 stops | changes the material by design — owner decision, not a no-visual-change fix |
| keep the full-bleed **upper** stop only, window the cheap ones | untested; the upper stop is the px²·px-expensive one, so it saves the least |
| cache the band's blurred surface as an image and translate it | untested; removes the per-frame filter entirely, but the snapshot must be re-rendered per scroll step to stay identical — needs a gate |
| pause the 6 `opps-me` animations that live inside the dock copies | still open (lane E §5); the remaining `TickAnimations` source |

The one thing this lane proves about the mechanism: **the band cannot be re-sampled from the composited screen without changing its pixels** — it has to blur *feed pixels at the band's own offset*, and any replacement has to reproduce that exact sample set.

---

## Artifacts (`/Users/irfan/.hermes/cache/scratch/glass-fix2/`)

| file | what |
|---|---|
| `shots.mjs`, `diff.mjs`, `probe-pulse.mjs`, `probe-io2.mjs`, `probe-map.mjs`, `measure-b.mjs` | capture rig, pixel gate, pulse/observer probes, four-arm timing |
| `shots/a0` | pre-extraction build (inline observer) |
| `shots/b0` | post-extraction, **inert** observer (the defect) |
| `shots/b0b` | post-extraction, fixed — **A gate baseline** |
| `shots/b2` | backdrop-filter band variant (B) |
| `shots/diff-a0-vs-b0b.json`, `diff-b0-vs-b0b.json`, `diff-b0-vs-b2.json` | the gate tables above |
| `measure.json` | four-arm run on the variant (bucketed, no ms claim) |
| `band-mirror.js.bak`, `dock-band.css.bak`, `pre-b.sha` | byte-clean revert record |
