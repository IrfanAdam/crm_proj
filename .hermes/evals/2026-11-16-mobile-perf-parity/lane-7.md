# Lane 7 — iOS-Safari rendering cost: ranked findings + zero-pixel fix list

Repo: `/Users/irfan/Documents/Portfolio Redo/crm_proj` @ `6b6b828` (+ `src/ds/changelog-names.json` dirty, six sibling lanes editing — the tree moved under this audit; all numbers below are from one session, ~23:10–23:40 IST 2026-11-16).
Read-only audit. No repo source was modified. This file is the only write outside `$TMPDIR/safari-audit/`.

Target: iPhone metrics 393×852 @dpr3, iOS Safari UA (`engine=slices` path, confirmed `navigator` → `/^((?!chrome…))safari/i` in `src/glass/engine.js:16`), CPU throttle 6×, fullscreen app (`?app=fullscreen`).

---

## 0. Headline

- **~92% of the DOM is duplicated inside the dock.** 8,917 of 9,708–9,796 elements (91–92% across loads) live under `.docklens`: **15 full copies of the 477-node feed** (1 aligned + 14 masked "slice" copies) plus **5 blurred band copies**. All of it is rendered through a **293×56 px** window.
- Removing `.docklens` from the scroll path takes scroll frame time from **136 ms → 52 ms (−62%)** and long-task time from **1,480 ms → 68 ms** (`−95%`), reproduced at −61.8% and −70.9% with a paired ABBA method.
- Removing **only the 14 slice copies** (keeping the base copy and the band mirror) gets **−37%** — i.e. *the slice ladder alone is the single biggest item*, bigger than everything else in the app combined except the dock itself.
- Main-thread split during a 27-frame scroll: `TaskOtherDuration 11.74 s` of `TaskDuration 14.96 s` = **78% is paint/composite**, not JS (`Script 1.61 s`, `Style 1.01 s`, `Layout 0.40 s`). This is a rasterisation problem, not a JavaScript problem — which is exactly why it is worse on WebKit, where each masked/blurred surface is an offscreen pass with its own backing store.
- Secondary, fully zero-pixel win: `placeBand()` re-reads three bounding rects and rewrites **15 layout properties per scroll frame** on values that cannot change while scrolling → **36 forced layouts / 0.399 s layout time in a 27-frame scroll** (14.8 ms/frame).
- **corner-shape is not supported in Safari ≤27.2** (caniuse, `corner-shape: squircle` — first supported 27.3). Every squircle declaration in this repo is inert on the owner's iPhone: zero cost, but also **zero visual effect** — the "true 55pt squircle" is rendering as a plain border-radius on iOS today.

---

## 1. Ranked table

| # | Surface | file:line | Evidence metric (measured) | Estimated win | Edit |
|---|---|---|---|---|---|
| 1 | **Dock slice ladder** — 14 masked copies of the whole feed, re-transformed every scroll frame | `src/glass/slice-bands.jsx:32` (`[build(null), ...SLICES.map(build)]`), `src/glass/slices-spec.js:26-31` (14 slices), `src/glass/DockSlices.jsx:21-30` (rAF `slide()` writes 15 transforms/frame) | 8,917/9,776 nodes under `.docklens` (91.2%); 14 `.docklens__slice` × 477-node copy = 6,678 node visits/frame; hide only `.docklens__slice` → **frame time −36.7%**; 1,054→153 ms long tasks | **−37% frame time** (Chromium, throttled 6×); more on WebKit | **Not zero-pixel** — see §4.1 |
| 2 | **Whole dock lens** (15 copies + 5 blurred band copies) | `src/glass/DockSlices.jsx:7`, `src/glass/band-mirror.js:9-29` | hide `.docklens` → **−61.8% / −70.9%** frame time; long tasks **1,480→68 ms** and **2,291→192 ms**; `TaskOther` 5.18 s→0.19 s | **−60…−70%** | reference number; the target |
| 3 | **Band mirror** — 5 copies of the feed each under `filter: blur()` | `src/glass/band-mirror.js:26-27`, `src/glass/dock-band.css:15`, `src/glass/dock-band.css:14` | 5 of the app's **6** `filter: blur()` elements; 5 masked 393×78 blur surfaces per frame, each blurred over a 477-node copy; 153,270 css px² of blur surface | est. 8–15% (below the shared-machine noise floor; ranked structurally) | Patches 4+5 (proven identical) |
| 4 | **Edge material** — 10 masked `backdrop-filter` spans | `src/os/edge-material.css:5` (+ `:4`, `:10`) | **10 of the page's 20** `backdrop-filter` elements are these spans; **top 5 are `opacity:0` at rest** (measured `edgeTopOpacity:"0"`, `device--large` without `device--scrolled`) yet stay in the compositing tree; 357,630 css px² of blur surface per frame | est. 10–25% at rest on iOS (5 redundant blur passes over 204,360 px² while invisible) | Patches 1, 2, 3 |
| 5 | **Capsule `backdrop-filter` inside a transition list** | `src/glass/dock-lens.css:50` + `:52` | `transition: … backdrop-filter 220ms ease, -webkit-backdrop-filter 220ms ease` — every press/drag animates a blur radius (`4.5px`→`6px`), forcing a full-dock re-blur per frame for 220 ms | bounded to press/drag windows, but it is the one thing that makes the dock stutter *on touch*, and it is the classic iOS-Safari anti-pattern | Patch 6 (static-identical) |
| 6 | **Dock body blur stacked on the lens** | `src/glass/dock-lens.css:73-75` | second full-dock blur pass (`blur(6px) saturate(132%)`) on top of the lens' own `filter` → the copies are blurred twice | 16,408 css px², ~1 pass | not removable (visible frost) |
| 7 | **Lens `filter: blur(1.2px)` over the copy stack** | `src/glass/dock-lens.css:80-81` | one filter layer wrapping 15 copies | bounded by dock box | not removable (visible rim softness) |
| 8 | **Per-frame forced layout in band placement** | `src/glass/band-mirror.js:35-61` (3 × `getBoundingClientRect` + 15 `left/top/width` writes per frame), called from `DockSlices.jsx:26` | `LayoutCount 36`, `LayoutDuration 0.399 s` over a 27-frame scroll = **14.8 ms/frame of pure waste**; inputs are scroll-invariant | ~10% of frame + removes style/layout thrash | Patch 8 (JS, pixel-identical) |
| 9 | **20 permanent `will-change:transform` layers** in the dock | `src/glass/dock-lens.css:17`, `:78`, `src/glass/dock-band.css:15` | 35 `will-change:transform` + 20 `will-change:transform,opacity` layer-promoting declarations inside `.docklens` (61 of the page's 94) | layer memory / GPU residency | Patch 5 (band copies only; the 15 copies genuinely move) |
| 10 | **FAB gem glass** | `src/glass/fab-gem.css:8`, `:11` | 1 backdrop layer, 3,136 css px² | <2% | leave alone |
| 11 | `-webkit-overflow-scrolling: touch` on the scroller | `app.css:19` | deprecated no-op since iOS 13; selects the legacy UIScrollView path on old iOS | ~0 (hygiene) | Patch 7 |
| 12 | 4 × `min-height:100dvh` | `src/workspace/mobile-fullscreen.css:14,17,19` + `.device{height:100dvh}` (`:21`) | 4 resolutions of one viewport unit; resolves once per toolbar/rotation change, not per frame | 0 | **skip** — verified pixel-identical, but it is what gives those wrappers height at other breakpoints; not worth the layout risk |
| 13 | `corner-shape: squircle` ×6 on large surfaces | `src/device/frame.css:13,15,16`, `src/os/edge-material.css:4,10` | unsupported in Safari ≤27.2 → declarations inert; **no cost on iOS** | 0 perf | see §4.5 (it's a visual gap, not a cost) |
| 14 | Glass CSS loaded but never rendered on the app path | `src/components/Toolbar/toolbar.css:9`, `src/components/TabBar/tabbar.css:11` | 0 `.toolbar` nodes in the app DOM; `.device .tabbar` sets `backdrop-filter:none` (`dock-lens.css:8`) overriding the DS default | 0 | none |

### Per-surface composited-layer census (measured, `census.mjs`)

LayerTree is **not available in headless Chrome** — verified twice: direct page-session attach and browser-session flatten both emit zero `LayerTree.layerTreeDidChange` events (`events seen: (none)`), with and without `--enable-gpu --use-angle=metal --run-all-compositor-stages-before-draw`. Layer counts below are therefore **counted from layer-promoting computed styles** (backdrop-filter ≠ none, `filter: blur()`, `will-change: transform|opacity|backdrop-filter`, 3D transform), grouped by owning surface — not read from the compositor.

| Surface | backdrop-filter layers | filter:blur layers | will-change layers | promoted decls | css px² of promoted boxes |
|---|---|---|---|---|---|
| `.docklens` (15 copies, 14 slices, 5 band copies) | 0 | 6 | 35 `transform` + 20 `transform,opacity` (cloned feed's own hints) | **61** | 13,117,388 |
| `.device__edge` (bottom, 5 stops) | 5 | 0 | 0 | 5 | 153,270 |
| `.device__edge--top` (5 stops) | 5 | 0 | 0 | 5 | 204,360 |
| `.tabbar` + `.tabbar__capsule` | 2 | 0 | 1 | 3 | 25,432 |
| `.fab-gem` | 1 | 0 | 0 | 1 | 3,136 |
| page (shell pills, sheets, mechanics) | 7 | 0 | 12 | 19 | 786,656 |
| **total** | **20** | **6** | **68** | **94** | — |

Also measured: 51 elements with a `mask-image`, 82 elements with `will-change` ≠ auto, 10 with `will-change: backdrop-filter` (all edge spans), 0 `transition: all`, 0 `text-rendering`, 0 `position: sticky` inside a transformed ancestor, no `position: fixed` glass (`.device__content` is the scroller; `.tabbar`/edges/fab are `position:absolute` inside `.device__screen`). `#exit-fullscreen` is `position:fixed` but paints a flat `--bg-surface-glass` colour, no blur.

---

## 2. What Safari does badly, and which of those this app actually pays

| iOS-Safari hazard | Does this app pay it? | Where |
|---|---|---|
| Stacked `-webkit-backdrop-filter` under `mask-image` (re-blurred every scroll) | **YES ×10** | `src/os/edge-material.css:5` — 5 top + 5 bottom spans, each `backdrop-filter: blur(var(--b))` + `mask-image: linear-gradient(...)` |
| Animating/transitioning `backdrop-filter` | **YES** | `src/glass/dock-lens.css:52` |
| `will-change: backdrop-filter` on always-visible spans | **YES ×10** | `src/os/edge-material.css:5` |
| `corner-shape` / squircle / `clip-path` on large surfaces | **NO** — unsupported on iOS ≤27.2, so inert | `frame.css:13,15,16`, `edge-material.css:4,10` |
| `100dvh` + safe-area recalculation | **Barely** — 4 redundant `min-height:100dvh`; `body.app-fullscreen{overflow:hidden}` means the URL bar never collapses, so dvh resolves once | `mobile-fullscreen.css:14-21` |
| `position: fixed` glass over a scrolling body | **NO** — correctly avoided (absolute inside `.device__screen`) | — |
| WebGL canvas with `alpha:true` over blurred DOM | **Only in the reward sheet** (`GemReward/gem3d.js:15` `alpha:true, antialias:true`, dpr capped 2). Not on the home screen, so not a home-screen cost. | `src/components/GemReward/gem3d.js` |
| Duplicate-subtree painting through a masked filter surface (the actual killer here) | **YES ×20** | see rank 1/3 |

---

## 3. Patches that provably do not change a rendered pixel

Proof protocol: load `?app=fullscreen` at 393×852 dpr3, scroll `#app-content` to y=760 (map out of frame), take a 393×162 clip over the dock/fab/bottom-band (`y=690..852`), inject the rule, take it again. Each case is gated by two identical "before" shots (0 px / maxΔ0) so screenshot nondeterminism cannot fake a pass. Diff = count of pixels differing from the gate shot + max channel delta.

Results (`diff2.py`): every candidate below measured **0 px / maxΔ0**, except Patch 3's rest-state gate (1 px at maxΔ1, located at the sticky-title boundary, not in the band) and Patch 6, which is 0 px static and differs only during the 220 ms press transition by construction. Contaminated round-1 cases were re-run under the gate; the earlier 47%/93% diffs for the `100dvh` and capsule-transition cases were state contamination, not the patches (both now 0 px). Noise floor measured on a no-op repeat: 0 px with the gate, 5,510 px / maxΔ2 without it — i.e. the gate was necessary.

**Patch 1 — drop two layer hints that paint nothing** (`src/os/edge-material.css:5`)

```diff
-.device__edge>span{position:absolute;inset:0;display:block;transform:translateZ(0);-webkit-transform:translateZ(0);will-change:backdrop-filter;-webkit-backdrop-filter:blur(var(--b));backdrop-filter:blur(var(--b));-webkit-mask-image:linear-gradient(to bottom,transparent var(--a),#000 var(--z));mask-image:linear-gradient(to bottom,transparent var(--a),#000 var(--z))}
+.device__edge>span{position:absolute;inset:0;display:block;will-change:backdrop-filter;-webkit-backdrop-filter:blur(var(--b));backdrop-filter:blur(var(--b));-webkit-mask-image:linear-gradient(to bottom,transparent var(--a),#000 var(--z));mask-image:linear-gradient(to bottom,transparent var(--a),#000 var(--z))}
```
(only `transform:translateZ(0);-webkit-transform:translateZ(0);` removed; verified 0 px, separately and inside the bundle). Take this alone first if you want the lowest-risk increment.

**Patch 2 — drop the `will-change` on the same spans** (same line, second half)

```diff
-.device__edge>span{position:absolute;inset:0;display:block;transform:translateZ(0);-webkit-transform:translateZ(0);will-change:backdrop-filter;-webkit-backdrop-filter:blur(var(--b));backdrop-filter:blur(var(--b));-webkit-mask-image:linear-gradient(to bottom,transparent var(--a),#000 var(--z));mask-image:linear-gradient(to bottom,transparent var(--a),#000 var(--z))}
+.device__edge>span{position:absolute;inset:0;display:block;transform:translateZ(0);-webkit-transform:translateZ(0);-webkit-backdrop-filter:blur(var(--b));backdrop-filter:blur(var(--b));-webkit-mask-image:linear-gradient(to bottom,transparent var(--a),#000 var(--z));mask-image:linear-gradient(to bottom,transparent var(--a),#000 var(--z))}
```
`will-change: backdrop-filter` is a pure layer-residency hint in the same property family as `transform` — it cannot change paint output. Verified 0 px.

**Patch 3 — stop compositing the top band while it is invisible** (`src/os/edge-material.css:11-12`). The top band is `opacity:0` at rest on every large-title screen (measured `"0"`, `.device--large` set by `opps-home.js:mount`), yet its 5 masked blur surfaces stay live. `visibility:hidden` keeps the fade intact via a delayed visibility in the transition.

```diff
-#device.device--large .device__edge--top{opacity:0;transition:opacity var(--transition-normal)}
-#device.device--large.device--scrolled .device__edge--top{opacity:1}
+#device.device--large .device__edge--top{opacity:0;visibility:hidden;transition:opacity var(--transition-normal),visibility 0s linear 250ms}
+#device.device--large.device--scrolled .device__edge--top{opacity:1;visibility:visible;transition:opacity var(--transition-normal),visibility 0s}
```
Verified 0 px at rest (`BUNDLE-top-rest`: 1 px at maxΔ1 across the whole top strip, from the flake in the sticky-title boundary, not the band). The `visibility 0s linear 250ms` delay is what preserves the *fade-out*: without it the band would pop off at `scrollTop<=8` instead of fading.

**Patch 4 — bound paint invalidation at the four glass shells** (`src/glass/dock-lens.css:14,17,77`, `src/glass/dock-band.css:9`)

```diff
-.device .docklens{position:absolute;inset:0;overflow:hidden;border-radius:inherit;pointer-events:none;transform:translateZ(0)}
+.device .docklens{position:absolute;inset:0;overflow:hidden;border-radius:inherit;pointer-events:none;transform:translateZ(0);contain:paint}
-.device .docklens__copy{position:absolute;left:0;top:0;will-change:transform}
+.device .docklens__copy{position:absolute;left:0;top:0;will-change:transform;contain:paint}
-.device .docklens__slice{position:absolute;inset:0;pointer-events:none;transform:translateZ(0)}
+.device .docklens__slice{position:absolute;inset:0;pointer-events:none;transform:translateZ(0);contain:paint}
-.device .docklens__band{position:absolute;pointer-events:none}
+.device .docklens__band{position:absolute;pointer-events:none;contain:paint}
```
All four shells are already visually clipped (`overflow:hidden` on `.docklens`, masks on slices/band), so containment clips nothing new. Verified 0 px individually (shell / slice / copy) and as a bundle.

**Patch 5 — drop `will-change` from the 5 blurred band copies** (`src/glass/dock-band.css:15`) — the `filter: blur()` already forces its own layer, so the hint only adds residency.
```diff
-.device .docklens__band>span>.docklens__band-copy{position:absolute;left:0;top:0;will-change:transform;-webkit-filter:blur(var(--b));filter:blur(var(--b))}
+.device .docklens__band>span>.docklens__band-copy{position:absolute;left:0;top:0;-webkit-filter:blur(var(--b));filter:blur(var(--b))}
```
Verified 0 px.

**Patch 6 — stop animating `backdrop-filter`** (`src/glass/dock-lens.css:52`). Static render identical (verified 0 px); the only difference is that the 4.5px→6px blur step lands instantly instead of lerping over 220 ms during a press/drag. This is the one patch in the set whose 220 ms transitional frames are not bit-identical — flagged rather than hidden.
```diff
-  transition:box-shadow 220ms ease,background 220ms ease,backdrop-filter 220ms ease,-webkit-backdrop-filter 220ms ease;
+  transition:box-shadow 220ms ease,background 220ms ease;
```

**Patch 7 — drop the deprecated scroll hint** (`app.css:19`, verified 0 px in Chromium; it is a WebKit-only no-op on iOS 13+, so pixel-identity there rests on the spec, not a measurement).
```diff
-.device__content{flex:1;min-height:0;overflow-y:auto;overflow-x:hidden;background:var(--bg-primary);-webkit-overflow-scrolling:touch;padding-top:54px;padding-bottom:72px}
+.device__content{flex:1;min-height:0;overflow-y:auto;overflow-x:hidden;background:var(--bg-primary);padding-top:54px;padding-bottom:72px}
```

**Patch 8 (JS, pixel-identical, biggest zero-visual-change win)** — stop re-laying out the band every scroll frame. `placeBand()` re-reads `src/lens/.device__edge` rects and rewrites 15 `left/top/width` values that are scroll-invariant, straight from a scroll rAF; that is the source of the measured 36 layouts / 0.399 s per 27-frame scroll. Split geometry (layout/zoom events) from slide (scroll).

```diff
--- a/src/glass/band-mirror.js
+++ b/src/glass/band-mirror.js
@@
-export function placeBand(band, lens, src) {
+export function placeBandGeom(band, lens, src) {
   if (!band || !lens || !src) return;
   const copies = band.querySelectorAll(".docklens__band-copy");
   if (!copies.length) return;
@@
-  const y = -src.scrollTop;
+}
+
+export function placeBandSlide(band, src) {
+  const copies = band?.querySelectorAll(".docklens__band-copy");
+  if (!copies?.length || !src) return;
+  const y = -src.scrollTop;
   copies.forEach((copy) => {
     copy.style.transform = `translateY(${y}px)`;
   });
 }
+
+/* kept for callers that legitimately need both (first paint, zoom, resize) */
+export function placeBand(band, lens, src) { placeBandGeom(band, lens, src); placeBandSlide(band, src); }
```
```diff
--- a/src/glass/DockSlices.jsx
+++ b/src/glass/DockSlices.jsx
@@
-import { buildBand, placeBand } from "./band-mirror.js";
+import { buildBand, placeBand, placeBandGeom, placeBandSlide } from "./band-mirror.js";
@@
   const slide = () => {
     frame.current = 0;
     const src = document.querySelector(source);
     if (!src) return;
     const baseY = -src.scrollTop;
     copies.current.forEach((el, i) => {
       if (el) el.style.transform = transformFor(SLICES[i - 1], baseY);
     });
-    placeBand(band.current, lensRef.current, src);
+    placeBandSlide(band.current, src);
   };
@@
     });
+    placeBandGeom(band.current, lensRef.current, src);
     slide();
   };
```
Same final transforms, same final geometry — the visible result cannot differ because the geometry inputs (`getBoundingClientRect` of the scroller, the lens and the bottom band) do not change while `scrollTop` changes. Not applied (read-only lane); measured source of 14.8 ms/frame of layout.

**Bundle verification**: Patch 1+2+4+5+7 together (7 rules, no `contain` omissions) measured **0 differing pixels** on the dock/fab/bottom-band clip at scrollY 760, and 1 px / maxΔ1 with the Patch 3 visual gate at rest.

---

## 4. What CANNOT be fixed without a visual change

The owner's bar is zero visual change, so these are decisions, not patches. Ranked by payoff. Everything here targets the dock; the edge material cannot be meaningfully reduced either (§4.4).

### 4.1 The 14-copy slice ladder — the dominant cost
`src/glass/slice-bands.jsx:32` builds `1 + SLICES.length` full clones; `src/glass/slices-spec.js:26-31` defines 14 (4 depths × top/bottom rims, 3 depths × left/right ends). Each copy is the entire 477-node feed, masked to a 9–12 px band by `maskFor()` (`slices-spec.js:49-57`) and slid by its own displacement each frame.

- **Dial A (cheapest visual risk):** keep the base copy + 2 depths per horizontal rim + 1 per end = **5 copies instead of 15 (−67%)**. Edit `slices-spec.js:26-31` to drop `u=0.55` and `u=0.85` for `top`/`bottom` and `u=0.60`/`0.85` for the ends. Visual change confined to the 9–12 px bevel gradient along the rim — expect **≈ −25…−30% of scroll frame cost** (interpolating the measured −37% for all 14).
- **Dial B (honest alternative):** an explicit iOS material — the dock keeps tint + specular rim + capsule frost, and drops the copy ladder entirely. `src/glass/engine.js:13-18` already routes by UA; adding a `"flat"` engine is a designed visual change, not a regression. **−60…−70%** (measured rank 2).
- Neither is pixel-identical. There is no zero-pixel way to keep 14/15 of the feed duplicated inside a 293×56 window.

### 4.2 The 5-stop band mirror
`src/glass/band-mirror.js:26-27` clones the feed once per `BOT` stop; `edge-stops.js:8` defines 5 stops → 5 blurred 477-node copies behind the *bottom* of the dock only. Reducing `BOT` to 3 stops changes the progressive-blur graduation under the dock's lower edge (visible while content scrolls behind it). Same for `TOP` (`edge-stops.js:7`) on the top band — though the top band is only visible once scrolled, so a 3-stop `TOP` is the least noticeable of these dials.

### 4.3 The dock's own frost and the capsule blur
`dock-lens.css:74-75` (`blur(6px) saturate(132%)` on the whole dock) and `:50` (`blur(4.5px) saturate(128%)` on the capsule) are the visible material. Removing either changes pixels across the whole dock. Dropping the *capsule's* blur only (keeping the dock's) is the smallest of these changes and would remove one full-dock blur pass plus the 220 ms animated re-blur — worth considering if the owner accepts a crisper pill on press.

### 4.4 The 10 edge spans
`src/os/edge-material.css:5` — the progressive blur ladder *is* the material. Going 5 stops → 3 per band halves the blur passes (10 → 6) and changes the graduation. Patch 3 already recovers the top band's 5 passes **for free** at rest (it is invisible), which is the only part of this that is not a visual change.

### 4.5 Not a cost, but a visual bug worth knowing
`corner-shape: squircle` + `-webkit-corner-shape` is unsupported in Safari ≤27.2 (caniuse: first supported 27.3). On the owner's iPhone the "true 55pt squircle display" (`frame.css:2-3` comment) is rendering as a plain `border-radius: 55px`. If the squircle is a design requirement on iOS, it has to be an SVG/`clip-path` superellipse — which *would* add a real per-frame cost on the display corners. Nothing to fix for performance; flagging so nobody spends tomorrow hunting a squircle that never shipped.

---

## 4b. Gate mapping and handoff (read with the eval README)

At the gate's own throttle (4×, 393×852 DPR3, scripted 400 px scroll), **baseline on this HEAD**:

| Metric | Baseline | Gate target | Gap |
|---|---|---|---|
| p95 frame | **374 ms** | ≤ 20 ms | 18.7× |
| frames > 33 ms | **27 of 27** | 0 | — |
| frame mean | 207 ms | — | — |
| long-task total | 6,308 ms | — | — |
| main-thread split | Task 6.97 s = Script 0.79 + Style 0.62 + Layout 0.02 + **TaskOther 5.53 s (79%)** | — | paint/composite-bound |

(The same harness at 6× throttle reports p95 798 ms — a ~1:2 ratio to the 4× figure, so the throttle step dominates. Absolute values here are inflated by sibling lanes' Chrome instances; the *ratio* is the durable number.)

Implication for closing the eval: **the zero-pixel patch set will not close it.** Patches 1–8 are containment/hint hygiene plus one layout-thrash removal — estimated 5–12% on scroll and a real at-rest GPU saving, but the gate is 18.7× away. The only measured lever of the needed size is the dock copy ladder: **−37% (slice copies alone)** or **−62…−71% (whole dock lens)**. Both are §4.1 decisions, i.e. the eval cannot close at zero visual change unless the dock material is redesigned for iOS. Recommend the parent decide between Dial A (§4.1, ~−30%, 9–12 px bevel change) and Dial B (§4.1, ~−65%, explicit iOS material) *before* lanes 3/5 spend more time on increments.

File-ownership routing for the patches (this lane wrote no source):

| Patch | Files | Owner |
|---|---|---|
| 1, 2, 3 | `src/os/edge-material.css` | lane 3 |
| 4, 5, 6 | `src/glass/dock-lens.css`, `src/glass/dock-band.css` | lane 3 |
| 7 | `app.css` | unowned — parent |
| 8 | `src/glass/band-mirror.js`, `src/glass/DockSlices.jsx` | unowned (lane 5 owns `OppsHome/*` + `workspace/*`) — parent |
| §4.1 dials | `src/glass/slices-spec.js`, `src/glass/engine.js` | decision first, then lane 3 |

---

## 5. Limits of this audit (read before trusting a number)

- **Chromium, not WebKit.** All timings are headless Chrome + `Emulation.setCPUThrottlingRate(6)` at dpr3 with an iOS UA (so the app takes its `slices` code path). Chrome's compositor is cheaper than WebKit's for masked/filtered layers, so the *ranking* transfers and the *absolute* iOS numbers are worse. The direction of every finding is safe; treat the percentages as floors.
- **LayerTree is dead in headless.** `LayerTree.enable` emits nothing in `--headless=new` (both attach modes, with and without GPU flags). Layer counts in §1 are counted from layer-promoting computed styles, not read from the compositor. To get true layer counts, run the same script against a headed Chrome or a real device Web Inspector.
- **The machine is shared with six sibling lanes.** Background Chrome load swung baseline frame time between 92 ms and 458 ms during the session. That is why the A/B method is paired-ABBA (baseline and variant measured back-to-back in the same page, order A-B-B-A, averaged) and why the small surfaces (ranks 3, 5, 9) are ranked structurally rather than by timing: their standalone deltas were inside the ±17% noise band. The rank-1/2 numbers reproduced under both methods and on both a quiet and a loaded machine.
- **`no-fab`/`no-capsule-bd`/`no-band` timings are not quotable** from this session — see above. Do not put them in a commit message.
- References to `opacity:0` top band, 20 backdrop-filter elements, 82 `will-change`, 51 masks are exact computed-style counts and are load-independent.

---

## 6. Reproduction

Port 5216 only (5173/5174/5194/5195 belong to other lanes). Scripts live in `$TMPDIR/safari-audit/` (pruned after 24h — the snippets below are the durable form).

```bash
cd "/Users/irfan/Documents/Portfolio Redo/crm_proj"
npx vite --port 5216 --strictPort --host 127.0.0.1     # dev server, never the owner's ports
curl -s -o /dev/null -w "%{http_code}\n" http://127.0.0.1:5216/?app=fullscreen

# 1) census (load-independent: nodes, per-surface layer-promoting decls, blur areas)
node $TMPDIR/safari-audit/census.mjs
# 2) paired ABBA scroll cost (the −62% / −37% numbers)
node $TMPDIR/safari-audit/paired.mjs --reps 2 --variants no-dock,dock-1copy,no-band
# 3) pixel-identity proof for candidate edits -> shots2/*.png, gated by two identical before-shots
node $TMPDIR/safari-audit/verify2.mjs
python3 $TMPDIR/safari-audit/diff2.py
```

Emulation constants used everywhere: `setDeviceMetricsOverride {width:393, height:852, deviceScaleFactor:3, mobile:true}`, `setTouchEmulationEnabled {maxTouchPoints:5}`, `setUserAgentOverride` with `Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1`, `setCPUThrottlingRate {rate:6}`. Scroll harness: `#app-content.scrollTop += 25` per `requestAnimationFrame`, 400 px range (16 frames), `PerformanceObserver(['longtask'])` for long tasks, `Performance.getMetrics` before/after for `TaskDuration / ScriptDuration / LayoutDuration / RecalcStyleDuration / TaskOtherDuration / LayoutCount`.

Minimal self-contained repro (node + `ws` from `node_modules/ws`, Chrome at the standard macOS path):

```js
// node repro.mjs   (browser-level session; LayerTree does not work headless)
import { spawn } from 'node:child_process';
import http from 'node:http';
import WebSocket from '/Users/irfan/Documents/Portfolio Redo/crm_proj/node_modules/ws/index.js';
const PORT = 9333, CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const chrome = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${PORT}`, '--user-data-dir=/tmp/repro-prof', '--no-first-run', 'about:blank'], { stdio: 'ignore' });
const get = (u, m = 'GET') => new Promise((r, j) => http.request(u, { method: m }, (s) => { let d = ''; s.on('data', (c) => d += c); s.on('end', () => r(JSON.parse(d))); }).on('error', j).end());
await new Promise((r) => setTimeout(r, 2500));
const ver = await get(`http://127.0.0.1:${PORT}/json/version`);
const ws = new WebSocket(ver.webSocketDebuggerUrl); await new Promise((r) => ws.on('open', r));
let id = 0; const pend = new Map();
ws.on('message', (b) => { const m = JSON.parse(b); if (pend.has(m.id)) { pend.get(m.id)(m.result); pend.delete(m.id); } });
const send = (method, params = {}, sessionId) => new Promise((r) => { const i = ++id; pend.set(i, r); ws.send(JSON.stringify({ id: i, method, params, sessionId })); });
const { targetId } = await send('Target.createTarget', { url: 'about:blank' });
const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });
const S = (m, p) => send(m, p, sessionId);
await S('Page.enable'); await S('Runtime.enable'); await S('Performance.enable');
await S('Emulation.setDeviceMetricsOverride', { width: 393, height: 852, deviceScaleFactor: 3, mobile: true });
await S('Emulation.setCPUThrottlingRate', { rate: 6 });
await S('Page.navigate', { url: 'http://127.0.0.1:5216/?app=fullscreen' });
await new Promise((r) => setTimeout(r, 4000));
const ev = async (e, ap = false) => (await S('Runtime.evaluate', { expression: e, returnByValue: true, awaitPromise: ap })).result.value;
console.log(await ev(`({engine:document.querySelector('.tabbar').dataset.engine,
  nodes:document.getElementsByTagName('*').length,
  dockNodes:document.querySelector('.docklens').getElementsByTagName('*').length,
  copies:document.querySelectorAll('.docklens__copy').length,
  bandCopies:document.querySelectorAll('.docklens__band-copy').length,
  backdrop:[...document.querySelectorAll('*')].filter(e=>{const s=getComputedStyle(e);return (s.webkitBackdropFilter||s.backdropFilter||'none')!=='none'}).length,
  topBandOpacity:getComputedStyle(document.querySelector('.device__edge--top')).opacity})`));
const PASS = `(async()=>{const el=document.querySelector('#app-content');const f=[];const lt=[];
 new PerformanceObserver(l=>{for(const e of l.getEntries())lt.push(e.duration)}).observe({entryTypes:['longtask']});
 let last=performance.now(),y=0;await new Promise(d=>{const t=()=>{const n=performance.now();f.push(n-last);last=n;el.scrollTop=y+=25;y<400?requestAnimationFrame(t):d()};requestAnimationFrame(t)});
 const s=f.slice(2);return {mean:+(s.reduce((a,b)=>a+b,0)/s.length).toFixed(1),ltTotal:+lt.reduce((a,b)=>a+b,0).toFixed(0),
 nodes:document.getElementsByTagName('*').length}})()`;
const scrollCost = () => ev(PASS, true);
const A = await scrollCost();
await ev(`(()=>{const s=document.createElement('style');s.textContent='.docklens{display:none!important}';document.head.appendChild(s);return 1})()`);
const B = await scrollCost();
console.log('baseline', A, '\nno-dock ', B, '\ndelta %', (((B.mean - A.mean) / A.mean) * 100).toFixed(1));
ws.close(); chrome.kill(); process.exit(0);
```
