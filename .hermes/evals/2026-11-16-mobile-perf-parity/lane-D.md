# Lane D — edge material: recover the +55 % scroll win at zero pixel delta

Status: **closed, nothing landed.** The +55 % does not reproduce on HEAD, and the
zero-pixel-delta subset of the `.device__edge` stack is empty. Numbers, the noise floor they
are judged against, and the cheapest acceptable option (a proposal, not applied) are below.
Owned files: `src/os/edge-material.css`, `src/device/frame.css` — **both untouched** (see §8).

---

## 1. Verdict

- **The +55 % figure does not reproduce for any member of this class on HEAD.** Control-calibrated,
  n=8 medians with the variant order rotated: `shrink` (area −34.7 %) reads **−2.5 %** at 4× CPU /
  vsync on and **−10.6 %** at 1× / vsync off, against an **A/A control that itself reads
  +2.0 % / +3.9 %**. Both variants sit inside the control's own error band — and so does `off`
  (−100 % area, 0 passes: 8.7 vs 9.5 fps median at 4×). Deleting the *entire* edge stack buys
  nothing measurable on this host.
- **The 13/255 shift is not fixable by bleed.** One blur radius of bleed at the crop edge
  (the predecessor's hypothesis) halves it — shrink maxΔ 5-6/255 → bleed1 maxΔ 3/255 — and then
  **plateaus**: 2×, 3× bleed and device-pixel snapping are all still maxΔ 3/255. So the
  residual is *not* edge clamping; it is re-rasterising a backdrop-filter layer at a moved
  origin. Zero is not reachable by any crop of this stack.
- **Every layer is load-bearing.** Hiding any single one of the 10 spans changes pixels
  (bottom 11-38/255, top 5-87/255). There is no free layer and no mergeable mask pair: all
  10 `(radius, a%, z%)` triples are distinct, so option (a) saves **0 layers**.
- **Cheapest acceptable option: `bleed1`** — blur area 357,630 → 254,530 CSS px² (−28.8 %,
  3.22 M → 2.29 M device px re-filtered per frame at DPR 3), maxΔ **3/255**, 0.4-1.1 % of band
  pixels differ. Above the eval gate (`≤0.05 % px @ ≤1/255`), so it is an **owner decision**,
  and the measured frame win is 0 ± 4 %. Exact CSS in §8. Recommendation: **do not apply** —
  it costs real (if sub-threshold) pixels for an unmeasurable win.
- **Host is not measurable for this question.** Load average 72-145 on 10 cores during every
  run (other lanes' headless Chrome + GPU helpers). Frame cadence on this surface is
  contention-dominated; see §4 for how the A/A control calibrates that.

---

## 2. Commands

```bash
REPO="/Users/irfan/Documents/Portfolio Redo/crm_proj"
cd "$REPO" && npx vite --port 5233 --host 127.0.0.1 --strictPort   # my port only; 5174 was another lane's
curl -s -o /dev/null -w "%{http_code}\n" http://127.0.0.1:5233/    # expect 200

# harness lives in scratch, never in the repo
H=/Users/irfan/.hermes/cache/scratch/laned     # probe.mjs, diff.py, node_modules -> repo symlink
cd $H

node probe.mjs --mode census                                         # layer/area census on the real app
node probe.mjs --mode diag                                           # paint stack + elementFromPoint, scroll 0/520/1400
node probe.mjs --mode css --variants shrink,bleed1                    # generated variant CSS + geometry table

# frame cadence: 8 passes, order rotated every pass, A/A control `ctrl`
THROTTLE=4 node probe.mjs --mode fps --variants base,ctrl,shrink,bleed1 --passes 8 --steps 20
NOLIMIT=1 THROTTLE=1 node probe.mjs --mode fps --variants base,ctrl,shrink,bleed1 --passes 8 --steps 20

# pixel proof: freeze, 2 repeats per state, warm shot discarded before each capture
node probe.mjs --mode pixels --bands bot,top --scrolls 0,520 --reps 2 \
  --variants ctrl,shrink,bleed1,bleed2,snap1 --dir $H/shotsF
python3 diff.py shotsF bot 0 ctrl shrink bleed1 bleed2 snap1      # + bot/520, top/0, top/520
```

Harness facts: 393×852 DPR 3, mobile emulation, headless Chrome `--headless=new`, one browser
serially, Metal ANGLE. LayerTree emits nothing under `--headless=new` (confirmed again), so
layer evidence is derived from computed styles + `getBoundingClientRect()` (§3).
`Page.captureScreenshot` clips are CSS px at `scale:1` → PNGs are 3× (bot 1179×234, top 1179×312).

---

## 3. Cost model per variant (deterministic, load-independent)

`.device__edge > span` is `position:absolute; inset:0` with `backdrop-filter:blur(var(--b))` and
a mask `linear-gradient(to {bottom,top}, transparent var(--a), #000 var(--z))`. **The mask is
painted after the filter, so every span pays a full-band backdrop snapshot + blur pass even
where its mask is transparent** — that gap is the only thing there is to reclaim.

Measured base (census): 10 blurred spans, all `will-change:auto` (the earlier removal holds),
bands 393×78 (bottom) and 393×104 (top) → **357,630 CSS px²** of backdrop area, 3.22 M device
px re-filtered per frame at DPR 3. 19 backdrop-filter elements on the page in total.

| variant | what changes | spans | bottom px² | top px² | total px² | Δ area | device px/frame @3× |
|---|---|---|---|---|---|---|---|
| `base` | — | 10 | 153,270 | 204,360 | **357,630** | — | 3.22 M |
| `shrink` | each span cropped to its mask's non-transparent extent, no bleed | 10 | 83,992 | 149,592 | 233,584 | **−34.7 %** | 2.10 M |
| `bleed1` | same, crop pulled out **1 × blur radius** past the fade start | 10 | 91,380 | 163,150 | 254,530 | **−28.8 %** | 2.29 M |
| `bleed2` | 2 × radius bleed | 10 | 98,769 | 176,709 | 275,478 | −23.0 % | 2.48 M |
| `bleed3` | 3 × radius bleed | 10 | 106,157 | 190,267 | 296,424 | −17.1 % | 2.67 M |
| `snap1` | 1 × radius bleed, crop snapped to whole device pixels | 10 | ≈254,530 | | ≈254,530 | −28.8 % | 2.29 M |
| `off-top` | top spans hidden | 5 | 153,270 | 0 | 153,270 | −57.1 % | 1.38 M |
| `off-bot` | bottom spans hidden | 5 | 0 | 204,360 | 204,360 | −42.9 % | 1.84 M |
| `drop45` | spans 4+5 hidden in both bands | 6 | — | — | 214,578 | −40.0 % | 1.93 M |
| `off` | all edge spans hidden | 0 | 0 | 0 | 0 | −100 % | 0 |

**Layer count never drops** in any zero-pixel-delta candidate: cropping a span shrinks its
raster, it does not remove a pass. That is the structural reason area cuts do not buy frames
(§4) — the win the predecessor measured can only have come from removing passes, which is a
visible blur reduction.

Geometry derivation (for `bleed1`, bottom band, H=78): span *k* box `top = H·a_k/100 − r_k`,
mask `transparent r_k px → #000 H·(z_k−a_k)/100 + r_k px`. Top band mirrors it with
`bottom = H·a_k/100 − r_k` and a `to top` mask. `%`→`px` conversion is exact for an unchanged
box height (16 % of 78 px ≡ 12.48 px), which `ctrl` confirms: re-applying the original masks in
% on the untouched geometry leaves the band **byte-identical**.

---

## 4. Frame cadence (and why the +55 % does not reproduce)

Both runs use **the same page, same browser, same scroll script**, variants applied as one
`<style>` override; the order rotates every pass (see §9.3 for why that is mandatory).
`ctrl` is a **provably pixel-identical** re-application of the existing masks — an A/A control.

**4× CPU, vsync on** — `node probe.mjs --mode fps --variants base,ctrl,shrink,bleed1 --passes 8 --steps 20`
(20 scroll steps × 38 px per sample; 8 samples per variant)

| variant | blur area | p50 median | fps median | fps range | vs base |
|---|---|---|---|---|---|
| `base` | 357,630 | 49.9 ms | 20.0 | 16-25 | — |
| `ctrl` **(A/A control)** | 357,630 | 50.0 ms | 20.4 | 19-27 | **+2.0 %** |
| `shrink` | 233,614 | 50.0 ms | 19.5 | 15-24 | **−2.5 %** |
| `bleed1` | 254,560 | 50.0 ms | 19.4 | 17-24 | **−3.2 %** |

**1× CPU, vsync off** (continuous frame-cost proxy, same flags otherwise)

| variant | fps median | fps range | vs base |
|---|---|---|---|
| `base` | 41.0 | 26-66 | — |
| `ctrl` (A/A) | 42.6 | 32-77 | **+3.9 %** |
| `shrink` | 36.6 | 26-95 | −10.6 % |
| `bleed1` | 42.2 | 36-90 | +3.0 % |

Read: the control moves by 2-4 %, the variants move by −11…+3 %, and the per-sample spread is
±40 %. **No variant separates from the control.** An earlier un-rotated run (base always first)
reported base 9.5 fps vs shrink 8.4 — the first slot in a pass carries a warm-up penalty, which
is exactly the bias that manufactures "wins" in this kind of measurement.

Isolated bench (same two band stacks over a 60-card scrolling feed, no dock, 2× CPU, vsync on,
`--mode bench`): one run gave base 44.9 ms mean vs `off` 37.9 ms (−16 %, consistent direction in
3/4 passes); a repeat could not reproduce it (77.4 vs 76.1). So **16 % is an upper bound for the
entire edge stack's share of scroll frame time** — a 29 % cut of a ≤16 % share is ≤4.6 %, i.e.
under this host's resolution. That, and not a bug, is why the +55 % is absent: it needs a quiet
machine to exist at all, and even then 4.6 % is the arithmetic ceiling for zero-delta work.
The bound is corroborated on the app itself: `off` (all 10 passes gone) medians 8.7 fps vs
`base` 9.5 at 4× — an 8 % delta inside a ±40 % spread, i.e. the entire material is under the
noise floor of this host.

Layer/state facts (computed style, not LayerTree): 10 blurred spans, 10 composited layers,
`will-change:auto` everywhere, top band `opacity:0` at rest and `1` only under
`#device.device--large.device--scrolled` (§9.1).

---

## 5. Pixel proof

### 5.1 Freeze protocol

1. Boot `?app=fullscreen` at 393×852 DPR 3, `prefers-reduced-motion: reduce`, CPU 1×, network
   blocked for `*pravatar*`, `*arcgisonline*`, `*basemaps*`, `*fonts.g*` (the page's only
   non-deterministic inputs; text/shape content stays, so the backdrop under each band is
   textured — a blur over a flat backdrop would diff to zero and prove nothing).
2. For each scroll state: **thaw rAF → set `#app-content.scrollTop` → wait 900 ms → freeze.**
   Freeze = `requestAnimationFrame` stubbed to `0`, `*{animation:none;transition:none}` +
   `document.getAnimations().pause()` (0 running animations at capture time).
3. One warm capture per band per state is **discarded** (the first shot after any state change
   re-rasters and can differ by up to 110/255), then the judged capture.
4. Crop to the bands only: bottom `y=774 h=78`, top `y=0 h=104` (CSS px, `scale:1`).

### 5.2 Noise floor (6 back-to-back captures of one unchanged frozen page)

| band / scroll | worst pairwise maxΔ | pixels > 1/255 | verdict |
|---|---|---|---|
| bottom @ 0 | **2** | 46 | 5 of 6 captures byte-identical; one capture differs in a partial rect |
| bottom @ 520 | **2** | 47 | same single-capture artefact |
| top @ 0 | **0** | 0 | all 6 byte-identical |
| top @ 520 | **0** | 0 | all 6 byte-identical |

So the honest zero-delta bar here is **maxΔ ≤ 2 with ≲50 px above 1/255 in one partial rect**;
everything above that is a real pixel change. Reference = `base-r1`; a `ctrl` A/A capture
reproduces this artefact exactly (maxΔ 2, 46 px), which is what makes it noise rather than a diff.

### 5.3 Per-variant deltas

`diffPct` = share of the band's pixels differing at all; `>1` / `>3` = pixels above that
channel delta; bbox in device px within the crop.

**bottom band @ scrollTop 0** (1179×234)

| variant | maxΔ | diffPct | >1 | >3 | bbox |
|---|---|---|---|---|---|
| `ctrl` (A/A) | 2 | 1.33 % | 46 | 0 | [0,0,978,213] — the noise artefact |
| `shrink` | **5** | 11.12 % | 7,786 | 169 | [0,0,1147,234] |
| `bleed1` | **3** | 6.94 % | 644 | 0 | [32,64,1147,234] |
| `bleed2` | 3 | 8.35 % | 776 | 0 | [0,0,1147,234] |
| `snap1` | 3 | 6.80 % | 634 | 0 | [32,66,1147,234] |

**bottom band @ scrollTop 520** (1179×234)

| variant | maxΔ | diffPct | >1 | >3 | bbox |
|---|---|---|---|---|---|
| `ctrl` (A/A) | 0 | 0 % | 0 | 0 | — |
| `shrink` | 3 | 22.76 % | 3,638 | 0 | [24,34,1147,234] |
| `bleed1` | **3** | 20.22 % | 1,375 | 0 | [0,0,1147,234] |
| `bleed2` | 2 | 21.07 % | 1,807 | 0 | [24,34,1147,234] |
| `snap1` | 3 | 18.86 % | 1,265 | 0 | [24,34,1147,234] |

**top band @ scrollTop 0** — every variant **0 px, maxΔ 0**: the top material is `opacity:0` at
rest by design (`#device.device--large` without `.device--scrolled`), so any top-band change is
free *in that state only*.

**top band @ scrollTop 520** (1179×312) — the state where the top material is actually on

| variant | maxΔ | diffPct | >1 | >3 | bbox |
|---|---|---|---|---|---|
| `ctrl` (A/A) | 1 | 0.60 % | 0 | 0 | [50,0,1179,311] |
| `shrink` | **6** | 33.59 % | 18,680 | 1,215 | [0,0,1179,275] |
| `bleed1` | **3** | 17.84 % | 753 | 0 | [32,0,1179,311] |
| `bleed2` | 8 | 25.69 % | 6,073 | 1,420 | [0,0,1179,275] |
| `snap1` | 3 | 17.84 % | 686 | 0 | [32,0,1179,311] |

`scrollTop 1400` clamps to the feed's max 770 — same picture (shrink 3 / bleed1 2 / snap1 2).

### 5.4 What the residuals mean

- The diff bbox starts at the *crop* edge and covers the band's whole width — the signature of a
  whole-layer re-raster, not of a moved edge. `bleed2`, `bleed3` and `snap1` all land on the same
  3/255 plateau, and `bleed2` is *worse* on the top band (maxΔ 8): more bleed means a bigger
  geometry change, hence a bigger re-raster difference.
- **The predecessor's hypothesis is therefore falsified as stated.** One blur radius of bleed
  removes roughly half the delta (5-6 → 3) and then stops; it cannot reach 0. The residual is
  Chrome re-filtering the backdrop at a new origin, not edge-clamped sampling at the new crop.
- The reported 13/255 is consistent with a *harder* step in the same class: my `drop45`
  (2 of 5 spans removed) measures maxΔ 11-38, i.e. their 13 sits between my crop-only (3-6) and
  layer-removal (11-38) variants.

### 5.5 Per-layer visibility census (why no layer can be dropped)

Hiding exactly one span, top band @ 520 and bottom band @ 0:

| hidden span | 1 | 2 | 3 | 4 | 5 |
|---|---|---|---|---|---|
| bottom maxΔ | 16 | 20 | 38 | 21 | 11 |
| top maxΔ | 87 | 25 | 22 | 11 | 5 |

Every span of both ladders is individually visible. Combined with all 10 `(radius,a,z)` triples
being distinct, **option (a) — merging mask stops that rasterise alike — saves 0 layers**, and
there is no "invisible" layer to reclaim.

---

## 6. Why zero is impossible for this stack (the argument, not just the measurement)

A span's cost is `passes × crop area`. To reduce it you must either
(i) shrink the crop — which moves the backdrop-filter's raster origin, and Chrome's output then
differs by 2-6/255 with no bleed level removing it (§5.4); or
(ii) weaken a pass (smaller radius / drop a span) — visible, and every span is visible (§5.5); or
(iii) merge spans — impossible, each carries a different radius and a different mask pair.
There is no third axis: `backdrop-filter` has no "filter only this sub-rect" property, and
`clip-path` would clip the *output* without moving the crop, i.e. it is pixel-exact but saves
nothing (that is why it is not in the landed set).

---

## 7. The one state where the top band *is* free (and why it is still not worth it)

`.device__edge--top` is `opacity:0` whenever `#device.device--large` is set without
`.device--scrolled`, so an `opacity:0`-scoped removal of the top spans is *provably* 0 px at rest
(all 6 captures byte-identical, every variant, maxΔ 0). It buys nothing: at rest nothing scrolls,
so nothing re-blurs — and the spans must come back the moment `device--scrolled` flips, i.e.
exactly when frames are being paid. Not proposed.

---

## 8. Exact CSS for the cheapest acceptable option (`bleed1`) — **not applied**

28.8 % less backdrop area, maxΔ 3/255 on both bands (0.4-1.1 % of band pixels), 0 px differing
in the top band at rest. Owner decision, because it exceeds the `≤1/255` gate in §1 of the eval
README. Drop-in for `src/os/edge-material.css` (10 rules, keeps the file inside the 99-line
budget); no change to `frame.css`, `edge-stops.js` or any markup.

```css
/* crop each span to the region its own mask can show, pulled out 1× its blur radius
   so the filter's raster edge stays outside the visible fade. −28.8 % backdrop area. */
.device__edge:not(.device__edge--top)>span:nth-child(1){top:11.48px;bottom:0;-webkit-mask-image:linear-gradient(to bottom,transparent 1px,#000 13.48px);mask-image:linear-gradient(to bottom,transparent 1px,#000 13.48px)}
.device__edge:not(.device__edge--top)>span:nth-child(2){top:21.4px;bottom:0;-webkit-mask-image:linear-gradient(to bottom,transparent 2px,#000 16.04px);mask-image:linear-gradient(to bottom,transparent 2px,#000 16.04px)}
.device__edge:not(.device__edge--top)>span:nth-child(3){top:30.72px;bottom:0;-webkit-mask-image:linear-gradient(to bottom,transparent 3.6px,#000 19.2px);mask-image:linear-gradient(to bottom,transparent 3.6px,#000 19.2px)}
.device__edge:not(.device__edge--top)>span:nth-child(4){top:41.6px;bottom:0;-webkit-mask-image:linear-gradient(to bottom,transparent 5.2px,#000 22.36px);mask-image:linear-gradient(to bottom,transparent 5.2px,#000 22.36px)}
.device__edge:not(.device__edge--top)>span:nth-child(5){top:52.28px;bottom:0;-webkit-mask-image:linear-gradient(to bottom,transparent 7px,#000 25.72px);mask-image:linear-gradient(to bottom,transparent 7px,#000 25.72px)}
.device__edge--top>span:nth-child(1){top:0;bottom:10.98px;-webkit-mask-image:linear-gradient(to top,transparent 1.5px,#000 9.82px);mask-image:linear-gradient(to top,transparent 1.5px,#000 9.82px)}
.device__edge--top>span:nth-child(2){top:0;bottom:15.72px;-webkit-mask-image:linear-gradient(to top,transparent 3px,#000 17.56px);mask-image:linear-gradient(to top,transparent 3px,#000 17.56px)}
.device__edge--top>span:nth-child(3){top:0;bottom:21.04px;-webkit-mask-image:linear-gradient(to top,transparent 6px,#000 24.72px);mask-image:linear-gradient(to top,transparent 6px,#000 24.72px)}
.device__edge--top>span:nth-child(4){top:0;bottom:25.36px;-webkit-mask-image:linear-gradient(to top,transparent 10px,#000 32.88px);mask-image:linear-gradient(to top,transparent 10px,#000 32.88px)}
.device__edge--top>span:nth-child(5){top:0;bottom:31.76px;-webkit-mask-image:linear-gradient(to top,transparent 14px,#000 36.88px);mask-image:linear-gradient(to top,transparent 14px,#000 36.88px)}
```

These are hard-coded to the band heights (78 px bottom / 104 px top, `edge-material.css:4,10`).
**If either height changes, all ten numbers are wrong** and must be regenerated from the stop
tables (`src/device/edge-stops.js`: `BOT`, `TOP`) with `node probe.mjs --mode css --variants bleed1`.
A `calc()`-based form would need a per-span `--bl` the markup does not carry (that file is not
mine to edit).

---

## 9. Pitfalls for a successor

1. **Freezing rAF breaks the scrolled state.** `device--scrolled` is applied inside
   `opps-home.js:40` `schedule()` → `requestAnimationFrame`. Freeze before scrolling and the top
   band stays `opacity:0`, so *every* top-band variant measures 0 px and looks free. Thaw →
   scroll → settle → freeze. (This cost me one wrong result: "the top spans paint nothing, drop
   them" was an artefact of exactly this.)
2. **`elementFromPoint` cannot tell you what paints**: the bands are `pointer-events:none`, so
   hit-testing skips them and reports the feed even when the band is on top. Get paint order from
   `z-index` + a forced `z-index:60` capture, never from hit tests.
3. **Rotate variant order every pass.** The first variant in a pass pays a warm-up penalty; a
   fixed order turns that into a fake effect (measured: base-first 9.5 fps vs 20.0 fps for the
   same variants once order was rotated).
4. **Keep an A/A control.** `ctrl` re-applies the *identical* masks and geometry; it reads
   +2.0 %/+3.9 % on this host. Any "win" under that is not a win.
5. **Discard the first capture after any state change.** It re-rasters: measured maxΔ up to
   110/255, and one capture per six came back at 1 389 bytes (a blank frame). Retry on
   `bytes < 5000`.
6. **Judge the band, not the page**, and prove the noise floor with repeated captures of one
   frozen state before believing any diff (§5.2). The whole-page oracle stays non-deterministic;
   the frozen band crops do not (top band: 6/6 byte-identical).
7. **Area is not the axis.** A 34.7 % area cut moves frame cadence not at all; only pass count
   does, and pass count is visible. Any future lane should measure `off-top`/`off-bot` first to
   see whether the material is worth its cost on that surface at all.
8. Host load 72-145 (10 cores) throughout; absolute ms in this report are not comparable to
   `lane-1.md`'s baseline. Ratios against the A/A control are the only load-independent statement.
9. **The tree was moving.** Other lanes edited `src/components/**` and `src/glass/**` at 01:35-01:51
   while this lane was running (my two files were never touched). Only **intra-session** A/B is
   claimed: base and variant are captured seconds apart in one page session, and `base-r1` vs
   `base-rz` came back byte-identical in every judged run, so an HMR change cannot sit inside a
   quoted delta. All decisive runs (§4, §5) ran after 01:55, i.e. after the last foreign edit.

---

## 10. Files

- **Landed: none.** `src/os/edge-material.css` and `src/device/frame.css` are byte-identical to
  HEAD `b97b1de`; `git status` shows only a pre-existing
  `design-system/changelog-manifest.json` timestamp change that predates this lane.
- Created: this report. Harness + captures stay in
  `/Users/irfan/.hermes/cache/scratch/laned/` (`probe.mjs`, `diff.py`, `shots*/`), never in the repo.
- Dev server on 5233 was stopped at the end of the run; no other port touched.
