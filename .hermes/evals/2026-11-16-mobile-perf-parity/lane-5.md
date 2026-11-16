# Lane 5 — mobile interaction-path perf: OppsHome / workspace / status bar

Repo `/Users/irfan/Documents/Portfolio Redo/crm_proj` · branch `main` · base HEAD `6b6b828`
Scope: `src/patterns/OppsHome/*.js`, `src/workspace/*.js`, `src/os/status-bar.js`.
Hard constraints honoured: no touching other lanes' files, no `npm run build|test`, no
`ds-track`/`generate-*`, no git commit/reset/stash/checkout, ports 5173/5174/5194/5195 unused
(served on **5214**), headless Chrome only, zero visual change.

## 0 · Result

* One perpetual rAF chain per map (two alive at all times) is now gated: **0 rAF callbacks and
  0 hotspot attribute writes while the map is off-screen or covered** (was 36 cbs / 108 writes
  per 2 s). Phase and rate while visible are unchanged (same accumulator, resume re-anchors the
  clock instead of jumping the phase).
* The scroll path no longer writes 6 inline styles per frame once the title morph has
  saturated (`p === painted` short-circuits): scroll-phase `LayoutDuration` 73.8 ms → 6.1 ms,
  long tasks 51 / 5869 ms → 7 / 1046 ms, `LayoutCount` 85 → 41.
* `resize`/`orientationchange` no longer measure in the event tick (batched to one rAF pass with
  a dirty flag); drag-pan and `fitZoom` in the workspace canvas are rAF-coalesced.
* **Pixel parity: 0 px differ, max channel delta 0** across 4 states (feed rest, feed mid-morph
  at scrollTop 6, feed scrolled at 760, sheet open) at 393×852 dpr 3.
* `OppsHome`'s scroll handler reads layout **0×** (`getBoundingClientRect`) and once
  (`scrollTop`) per frame. The 5 `getBoundingClientRect` + 2 `scrollTop` reads per scroll frame
  in the trace come from `src/glass/lens-copy.jsx` + `src/glass/band-mirror.js` — sibling lane.

## 1 · Objective

Same pixels, same feel, less main-thread work on a phone: remove per-event layout thrash from
the interaction paths, park rAF loops when nothing they animate is on screen, and stop re-measuring
geometry mid-gesture. No change to easing, durations, thresholds, or spring feel.

## 2 · Reproduce

### 2.1 Serve (port 5214, plugins disabled for a parallel-lane tree)

`vite.config.js` runs `generate-mechanics-graph.js` and `ds-due-writer` on change — both are
forbidden in this session, so serve with a minimal external config (do not edit the repo config):

```bash
cd "/Users/irfan/Documents/Portfolio Redo/crm_proj"
mkdir -p /tmp/perf5214
cat > /tmp/perf5214/vite.perf.mjs <<'EOF'
import { defineConfig } from "/Users/irfan/Documents/Portfolio Redo/crm_proj/node_modules/vite/dist/node/index.js";
export default defineConfig({
  root: "/Users/irfan/Documents/Portfolio Redo/crm_proj",
  esbuild: { jsx: "automatic" },
  server: { port: 5214, host: "127.0.0.1", open: false, strictPort: true },
  appType: "mpa",
  cacheDir: "/tmp/perf5214/vite-cache",
  logLevel: "warn",
});
EOF
npx vite --config /tmp/perf5214/vite.perf.mjs      # http://127.0.0.1:5214
# first boot ~25 s (dep pre-bundle into the private cacheDir)
```

App URL: `http://127.0.0.1:5214/index.html?app=fullscreen` (the phone surface).

### 2.2 Drive (headless CDP, own browser, own profile)

No `puppeteer` dependency: raw CDP over `ws` (already in `node_modules`).
Binary: `/Users/irfan/Library/Caches/ms-playwright/chromium_headless_shell-1243/chrome-headless-shell-mac-arm64/chrome-headless-shell`
(any headless Chromium works).

```js
// launch
spawn(BIN, [`--remote-debugging-port=9334`, `--user-data-dir=/tmp/perf5214/profile`,
            "--no-first-run", "--disable-gpu", "--hide-scrollbars", "about:blank"]);
// attach
Target.attachToTarget { targetId, flatten: true }
// session = every later message's sessionId
```

```js
// device + throttle + determinism
Network.enable
Network.setBlockedURLs { urls: ["*arcgisonline.com*", "*pravatar.cc*", "*cartocdn.com*"] }
Emulation.setDeviceMetricsOverride { width:393, height:852, deviceScaleFactor:3, mobile:true,
                                     screenWidth:393, screenHeight:852 }
Emulation.setTouchEmulationEnabled { enabled:true, maxTouchPoints:5 }
Page.navigate { url }
// then wait for: readyState complete && 4 .opp-card && #nearby-tiles .leaflet-pane && #sheet-map .leaflet-pane
// then: document.fonts.ready, 2.6 s settle, Performance.enable, Emulation.setCPUThrottlingRate {rate:4}
```

Tile and avatar hosts are blocked so both runs render the same placeholder pixels; the whole
map area is additionally hidden for the parity shots (see §4).

### 2.3 Instrumentation (in-page, installed after load)

```js
// counter object + prototype patches (count only, behaviour untouched)
window.__g = { gbcr:0, off:0, cli:0, scr:0 };
const G = Element.prototype.getBoundingClientRect;
Element.prototype.getBoundingClientRect = function(){ __g.gbcr++; return G.call(this); };
// offsetWidth/Height/Top/Left (HTMLElement.prototype), clientWidth/Height,
// scrollTop/scrollHeight/scrollWidth (Element.prototype): wrap the existing accessor,
// keep the original getter/setter, increment a counter.
// rAF callbacks actually invoked:
const R = window.requestAnimationFrame;
window.requestAnimationFrame = cb => R(t => { __raf.cbs++; return cb(t); });
// long tasks:
new PerformanceObserver(l => l.getEntries().forEach(e => __lt.push(e.duration)))
  .observe({ entryTypes: ["longtask"] });
// breath activity: attribute mutations on the Leaflet coverage circle
new MutationObserver(ms => __hb.n += ms.length)
  .observe(document.querySelector("#nearby-tiles path.opps__hotspot"), { attributes: true });
// (__hbScan() re-scans both maps' `.opps__hotspot` paths at each phase start)
```

Per phase: reset counters → `Performance.getMetrics` (A) → interaction → `Performance.getMetrics`
(B) → read counters. Deltas of `LayoutCount`, `RecalcStyleCount`, `LayoutDuration`,
`RecalcStyleDuration`, `ScriptDuration`, `TaskDuration`.

### 2.4 Scripted interactions (exact bodies)

```js
// A. scripted scroll: 1000 px, 12 px per frame, real scroll events at rAF cadence
new Promise(res => { const f = document.getElementById('app-content'); let i = 0;
  const step = () => { f.scrollTop = Math.min(1000, f.scrollTop + 12);
    if (++i < 84) requestAnimationFrame(step); else res(f.scrollTop); };
  requestAnimationFrame(step); });

// B. scripted touch scroll (real compositor gesture)
Input.synthesizeScrollGesture { x:196, y:560, yDistance:-700, speed:900, gestureSourceType:"touch" }

// C. scripted pointer drag across the map widget (14 moves, 16 ms apart)
Input.dispatchMouseEvent { type:"mousePressed", x, y, button:"left", clickCount:1 }
for (i=1..14) Input.dispatchMouseEvent { type:"mouseMoved", x:x+i*6, y:y-i*3, button:"left", buttons:1 }
Input.dispatchMouseEvent { type:"mouseReleased", x:x+84, y:y-42, button:"left", clickCount:1 }

// D. sheet open (morph + pill expand), then a settled window
Runtime.evaluate "document.getElementById('nearby-open').click()"   // wait !hidden, +900 ms

// E. park probe (2 s quiesced windows each):
//    idle-on   = feed at top (map on screen)
//    idle-off  = feed.scrollTop = 760 (map scrolled away), 1.8 s settle
//    idle-back = scrollTop = 0, 1.2 s, measure
//    idle-covered = sheet open, 1.8 s, measure
```

Who reads layout during a scroll (stack capture, 34 scroll frames, `.map__scrolled` before state):
`gbcr` 33×5 → `lens-copy.jsx:19,20` + `band-mirror.js:39,40,45` (all `src/glass/*`, sibling lane);
`scrollTop` 33× each → `opps-home.js:35` (1/frame, mine), `lens-copy.jsx:25`, `band-mirror.js:58`.

## 3 · Before → after (393×852 dpr 3, CPU ×4, headless Chromium)

windows are 2 s unless noted; `gBCR`/`off`/`cli`/`scr` = instrumented layout reads;
`raf` = rAF callbacks invoked; `hotspot` = coverage-circle attribute writes.

| phase | gBCR | scrollTop | raf | hotspot | LayoutCount | RecalcStyle | LayoutDuration | long tasks |
|---|---|---|---|---|---|---|---|---|
| scroll-raf (1000 px, 84 frames) | 325 → 325 | 280 → 280 | 472 → 255 | 774 → 369 | 85 → **41** | 213 → 213 | 73.8 → **6.1 ms** | 51 / 5869 ms → **7 / 1046 ms** |
| scroll-touch (700 px swipe) | 45 → 55 | 27 → 33 | 99 → 36 | 243 → 126 | 26 → 15 | 45 → 51 | 53.7 → **6.0 ms** | 14 / 1471 ms → **0 / 0 ms** |
| drag-map (14 pointer moves) | 1 → 1 | 2 → 2 | 60 → 23 | 181 → 208 | 21 → 23 | 39 → 41 | 72.7 → **3.9 ms** | 9 / 839 ms → 7 / 618 ms |
| sheet-open (morph + 0.9 s) | 24 → 24 | 0 → 0 | 43 → 24 | 185 → 120 | 20 → 24 | 29 → 34 | 342 → **41 ms** | 8 / 1334 ms → 6 / 688 ms |
| idle, sheet open | 0 → 0 | 0 → 0 | 87 → 36 | 522 → **324** | 28 → 36 | 28 → 36 | 31 → 2 ms | 6 / 557 ms → 8 / 618 ms |

Park probe (quiesced, 2 s windows; the decisive numbers for item 2):

| window | raf | hotspot writes | LayoutCount | LayoutDuration | long tasks |
|---|---|---|---|---|---|
| idle-on (map on screen) | 30 → 9 | 90 → 81 | 9 → 9 | 8.7 → 0.3 ms | 7 / 1520 → 5 / 955 ms |
| **idle-off (map scrolled away)** | 36 → **0** | 108 → **0** | 11 → **0** | 176 → **0 ms** | 8 / 2069 → **2 / 208 ms** |
| idle-back (resumed) | 18 → 8 | 54 → 72 | 5 → 7 | 1.5 → 17.8 ms | 6 / 1792 → 7 / 1732 ms |
| idle-covered (sheet open) | 18 → 8 | 108 → **72** | 6 → 8 | 0.4 → 0.3 ms | 7 / 2209 → **6 / 1386 ms** |

Reading notes (honest):
* `LayoutCount` is Chrome's layout bisection counter, noisy at the ±10 level in idle windows
  (`idle-covered` 6 → 8, `idle-sheet` 28 → 36) while `LayoutDuration` — the actual cost — falls
  by 6–15× in the same windows. Use `LayoutDuration` and long tasks as the load metric.
* `gBCR` is identical in the scroll phase (325) because none of it is `OppsHome` code; my scroll
  path costs 1 `scrollTop` read + 0 `gBCR` per frame before and after.
* `hotspot` writes are per-frame work, so the count tracks frame rate: a run whose window is
  still digesting page init (long tasks ≈ 1 s of the 2 s window) reports fewer writes than the
  same code quiesced. The park probe is quiesced and is the number to trust for item 2.
* The tree is shared with concurrent lanes; `src/glass/*`, `src/motion/*`, `src/components/*`
  and `vite.config.js` all changed during this session (`git diff --stat`). Deltas in the scroll
  and morph phases therefore carry some sibling-lane drift; the park numbers (§3 lower) and the
  pixel diff are from code-only A/B (HEAD content restored for the "before" run, see §4) and are
  unambiguous.
* `drag-map` shows +2 mutations/`ScriptDuration` 61 → 104 ms — Leaflet's own drag pipeline, not
  touched; `LayoutDuration` there drops 18×.

## 4 · Pixel parity

A/B method: the 7 changed files were saved to `/tmp`, restored to `HEAD` content via
`git show HEAD:<path> > <path>` (read-only git; no checkout/stash/reset), the "before" shots
captured, the working versions copied back, md5-verified, then the "after" shots captured. Same
browser build, same profile settings, same blocked hosts, same scroll offsets.

For frame stability the shots inject, in both runs:

```css
*,*::before,*::after{animation:none!important;transition:none!important}
#nearby-map,#sheet-map{visibility:hidden!important}
```

Reason: the tile layer and the coverage-radius breath are continuous animations whose phase is
not frame-deterministic, and they are not layout. Everything else (title morph transform, card
list, sticky header, compact title, sheet drawer, close button, scrim) is compared.
`visibility:hidden` keeps layout identical; the maps are the only hidden subtree.

Shots at 393×852 dpr 3 → 1179×2556 PNG:

| shot | state | pixelDiff | max channel Δ | mean Δ |
|---|---|---|---|---|
| S1-rest | feed at scrollTop 0 (title unmorphed) | **0.0000 %** (0 px) | **0** | 0.00000 |
| M1-midmorph | scrollTop 6 (`p`≈0.5: translate 99.3158px,-7.5px scale 0.605263, opacity 0.352) | **0.0000 %** (0 px) | **0** | 0.00000 |
| S2-scrolled | scrollTop 760 (title compacted, cards mid-scroll) | **0.0000 %** (0 px) | **0** | 0.00000 |
| S3-sheet | map sheet open and settled | **0.0000 %** (0 px) | **0** | 0.00000 |

Byte-identical, not merely "close": inline style strings and element rects also match exactly.

```python
from PIL import Image; import numpy as np
for n in ["S1-rest","M1-midmorph","S2-scrolled","S3-sheet"]:
    a=np.asarray(Image.open(f"before-{n}.png").convert("RGB"),dtype=np.int16)
    b=np.asarray(Image.open(f"after-{n}.png").convert("RGB"),dtype=np.int16)
    d=np.abs(a-b); nz=(d.max(axis=2)>0).sum()
    print(n, f"{100*nz/d.shape[0]/d.shape[1]:.4f}%", int(d.max()), round(float(d.mean()),5))
```

Style/geometry parity (same probe in both runs, `document.querySelector('.opps__title').style`):

| state | before | after |
|---|---|---|
| y0 | `translate(0px, 0px) scale(1)` / op 1 / small-op 0 / `scale(0.94)` | identical |
| y6 | `translate(99.3158px, -7.5px) scale(0.605263)` / op 0.352 / small-op 0.41701 | identical |
| y9, y760 | `translate(132.421px, -10px) scale(0.473684)` / op 0 / small-op 1 / `device--scrolled` | identical |
| sheet rects | win `[0,0,393,852]`, card `[12,624,369,216]`, close `[333,30,44,44]`, header `[0,0,393,74]` | identical |

## 5 · Files changed

| file | mechanism |
|---|---|
| `src/patterns/OppsHome/live-map-breath.js` | Perpetual chain gated per instance. `IntersectionObserver` on the map host (parks when the widget scrolls out of `#app-content`), `visibilitychange` (document hidden), a `hidden`-attribute `MutationObserver` (sheet closed / reward sheet / panel switches), and a dialog-cover check (`[role="dialog"]` that does not contain the host → covered). Park **cancels** the scheduled frame (no rAF chain at all). Resume re-anchors `breathLast` without accumulating, so the phase continues where it froze; while visible the accumulator, `PULSE_MS`, `K_MIN` and the two-maps-one-clock rule are untouched. Loop entry unhooks itself when its host leaves the DOM (re-mount no longer leaks). |
| `src/patterns/OppsHome/opps-home.js` | One rAF driver for all geometry-dependent work: `schedule()` (single queued frame) + `invalidate()` (dirty flag) + `pass()` (measure only when dirty, then paint). `resize`, new `orientationchange` and `fonts.ready` now only mark the cache stale — no `offsetWidth/offsetTop/getComputedStyle` inside the event tick. `measure()` clears the painted-progress cache so a re-measure always repaints. `frame()` short-circuits when `p === painted` (the saturated ends of the morph wrote 6 inline styles per scroll frame for nothing) and toggles `device--scrolled` only on change. `mount()` still measures and paints synchronously (no first-frame flash). |
| `src/patterns/OppsHome/sheet-morph.js` | `fitLayer` caches `(layer, screen.clientWidth/Height)` in a `WeakMap`: the second call per gesture (open() sizes the layer before `invalidateSize`, morph() called it again) now neither reads `clientWidth` nor re-writes `width/height`. Constant per-frame targets are compared before writing (`layer.opacity` when there is no fade window, `card.transform:none`, `x.pointerEvents`). |
| `src/patterns/OppsHome/nearby-map.js` | `pointerdown/pointerup/pointercancel/pointerleave` marked `{passive:true}` (none call `preventDefault`). |
| `src/workspace/canvas.js` | Drag pan coalesced to one `scrollLeft/scrollTop` write per frame (latest pointer wins), with a synchronous flush on `mouseup` so the final position is never dropped; `mousemove` and `resize` passive; `resize → fitZoom` batched into rAF (it reads `clientWidth/clientHeight`). `wheel` stays `{passive:false}` — see §6. |
| `src/workspace/mobile-fullscreen.js` | `touchend`/`touchcancel` marked `{passive:true}` (the 3-finger hold cancel path never calls `preventDefault`). |
| `src/os/status-bar.js` | Clock writes only when the minute string actually changes (was 3 redundant `textContent` writes per minute, each a layout invalidation); the 15 s interval is cleared while the document is hidden and re-armed with an immediate catch-up tick on reveal (clock can never show a stale minute); the returned disposer also removes the `visibilitychange` listener. |

No new files. No new dependencies. No token/hex changes.

## 6 · Listener audit — passive

`src` has exactly three `passive:false` sites; one is mine:

| site | verdict |
|---|---|
| `src/workspace/canvas.js:61` (mine) | **kept `{passive:false}`** — ctrl/⌘+wheel zoom calls `preventDefault()` to suppress browser page zoom. It is a genuinely preventing handler. |
| `src/js/mechanics/canvas-interaction.js:52` (not mine) | untouched (not an interaction path of the phone feed). |
| `src/components/IllusionCube/illusion-explore.js:82` (not mine) | untouched. |

Made passive in this lane (all verified to never call `preventDefault`): `nearby-map.js`
pointerdown/up/cancel/leave; `mobile-fullscreen.js` touchend/touchcancel;
`opps-home.js` scroll (was already), resize, orientationchange; `canvas.js` mousemove, resize.
Already passive before: `feed` scroll, map `wheel` (cancelGlide), `touchstart`/`touchmove`
(3-finger hold), the `resize` in `live-map-breath`'s `visibilitychange`, `status-bar`'s
`visibilitychange`.

Handlers checked and left alone because they neither read layout nor write style in the tick:
`nearby-sheet.js` close/close-scrim/keydown, `reward-sheet.js` close/wiring, `slowmo.js`
input/click, `canvas.js` select/input/click/keydown, `sheet-geometry.js`/`face-handoff.js`/
`pill-ghost.js` (call sites, all at gesture start).

## 7 · Proposals refused (would change pixels or feel)

1. **`sheet-morph.js` clip-window `left/top/width/height` → transform.** The window *is* the
   clip rect (`overflow:hidden` growing from the widget rect to the screen) and its
   `borderRadius` ramps with it. A transform-scaled layer would resample the tile layer, change
   the radius ramp and the `--win-ring`/`--win-sh` edge profile. Reported, not done.
2. **`pill-expand.js` ghost `left/top/width/height/borderRadius` → transform.** The ghost carries
   real card pixels between two rects; scaling a fixed-size clone would resample the text/border
   of the card clone and change the crossfade (X0/X1) sampling. Reported, not done.
3. **`face-handoff.js` `borderWidth` ramp (layout on the clone) → `box-shadow`/`outline` ring.**
   The clone is `box-sizing:border-box` with an `object-fit:cover` photo; the ring collapse *is*
   the photo growing to full bleed. Any shadow-based ring changes the rendered ring and the
   photo's inner box. Reported, not done.
4. **`will-change` / `contain: paint` / `content-visibility` on `.opp-card`.** Adding containment
   changes paint invalidation and scroll anchoring, and `content-visibility:auto` changes
   `offsetTop` of the sticky compact title — i.e. it changes the measured `RANGE` and therefore
   the morph. Refused.
5. **Removing the per-frame `getComputedStyle(pill).opacity` read in `pill-expand.js`** (2 forced
   recalcs per expand). It is what commits the 0→1 opacity while `transition:none` is still set;
   removing it lets the chip's 150 ms transition fade in after settle. Refused.
6. **`live-map.js#glideHome` rAF left running while the sheet covers the widget** — the close
   morph reveals the widget mid-glide (`REHOME_GLIDE_SLOW_S`), so parking it would freeze the
   settle that the user sees. Left as is.
7. **`status-bar.js` rendering skipped entirely while hidden** — refused in favour of "pause the
   interval + catch-up tick on reveal": skipping the tick would leave a stale minute for up to
   15 s on return (a visible change).

## 8 · Cross-lane leads (not touched — other lanes own these files)

* `src/glass/lens-copy.jsx` (lines 19–26) and `src/glass/band-mirror.js` (39–58) do **5
  `getBoundingClientRect` + 2 `scrollTop` reads per scroll frame** inside the scroll callback —
  the single largest layout-read source on the phone scroll path (325 gBCR per 1000 px scroll).
  Batching them behind one rAF + cached rects is the next win; it is not in this lane's ownership.
* `src/motion/elastic-scroll.js` (sibling lane) reads `scrollTop`, `scrollHeight`, `clientHeight`
  and writes `indicator.style.transform` directly in its `scroll` listener — classic per-event
  thrash. It did not appear in this app's scroll trace (`attachElastic` is not on the feed path),
  so it was not the source of the reads above.
* `src/components/GemReward/gem3d.js:34,58` re-arms its rAF chain unconditionally and only skips
  the *render* when `document.hidden` / off-screen (`rig.vis`). Same pattern as the breath loop;
  parking the chain would remove one callback per frame everywhere in the app.
* `src/motion/gooey.js:37` kicks a rAF on interaction only — nothing to fix.

## 9 · Verification commands (final state)

```bash
cd "/Users/irfan/Documents/Portfolio Redo/crm_proj"
git diff --stat src/patterns/OppsHome src/workspace src/os/status-bar.js   # 7 files
S=~/.hermes/cache/scratch/perf5214                                            # session scratch
node $S/smoke.mjs         # parking: on 441 writes/2 s, off 0 writes + 0 rAF, resume ok, no exceptions
node $S/park.mjs after    # quiesced A/B windows (§3 lower)
node $S/drive2.mjs after  # scroll/drag/sheet phases (§3 upper)
node $S/capture.mjs after # parity shots + rect/style probe (§4)
node $S/stacks.mjs after  # who reads layout per scroll frame (§2.4 attribution)
```

`$S` is Hermes session scratch and is pruned after 24 h idle. If it is gone, §2 is the complete
recipe: the external vite config (2.1), the CDP launch/attach + device/throttle/block list (2.2),
the in-page counters (2.3), the interaction bodies (2.4), and the diff script (§4). Every number
in this file came from those four files (`smoke`, `park`, `drive2`, `capture`) run against
`$S/new/` (the 7 working copies) vs `HEAD` content.
