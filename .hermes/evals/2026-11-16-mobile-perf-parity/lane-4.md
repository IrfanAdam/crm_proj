# Lane 4 — WebGL rig loop architecture (mobile main-thread)

Branch `main` @ `6b6b828` (clean at start). Port **5213** only. No commits, no builds.

## Objective
Stop offscreen/background rigs from keeping a hot rAF loop alive, remove per-frame forced layout, keep the
rendered frame identical and the dt/phase clock continuous.

## STATUS (what is done)
| file | state |
|---|---|
| `src/components/GemReward/gem3d.js` | **complete** — park/arm, RO sizing, no layout reads in frame, getScale |
| `src/components/GemReward/gem-rig.js` | **complete** — ResizeObserver measures off-frame |
| `src/components/GemReward/gem-drag.js` | **complete** — `GEM_DRAG.track()` owns the box read |
| `src/components/GlassDeck/deck3d.js` | **complete** — same loop rework + RO sizing |
| `src/components/IntelCube/cube3d.js` | **complete** — same |
| `src/components/IllusionCube/illusion3d.js` | **complete** — same |
| `src/motion/gooey.js` | **complete** — hidden-tab gate + re-arm (see caveat) |
| `src/components/IllusionCube/illusion-chain.js` | **deliberately unchanged** (see "not done") |

Verification state: loop/park/arm behaviour and offscreen cost were measured (numbers below). **Pixel parity
after the change was NOT captured** — the after-screenshot run was cancelled by the wrap-up order. The capture
method itself was proven deterministic (two independent runs, identical SHA-256), so a single after-run
completes the check. See "parity".

## Serve + harness (copy-pasteable)
The real `vite.config.js` is load-bearing: it concatenates the 24 classic gem scripts into `/vendor/gem-boot.js`
and serves `/vendor/three.min.js`. A plain "react-only" config serves the gem as a **2D fallback** (THREE is
undefined while the classic tags execute) — do not drop those plugins.

```bash
# 1. dev server on my port, HMR off (no mid-window reloads), real config + plugins intact
cd "/Users/irfan/Documents/Portfolio Redo/crm_proj"
npx vite --config .hermes/tmp/vite-nohmr.config.mjs --port 5213
# .hermes/tmp/vite-nohmr.config.mjs == mergeConfig(vite.config.js, { server:{ port:5213, strictPort:true, hmr:false, host:'127.0.0.1' } })
# (scratch file, safe to delete; it also re-runs the mechanics-graph generator, which only rewrites
#  src/js/mechanics/graphData*.js META.generatedAt timestamps)

# 2. instrumented run (headless Chrome, CDP, own profile under ~/.hermes/cache/scratch/chrome-perf)
cd /Users/irfan/.hermes/cache/scratch
node measure.mjs before.json   # writes before.json; prints one JSON line per 5 s window
node shot.mjs   before-gem.png # frozen-pose gem region screenshot (1020x960 @ dpr3)
```
Harness files (all outside the repo): `cdp.mjs` (launch/attach/eval/shot), `measure.mjs` (rAF/gBCR/metrics
windows), `shot.mjs` (freeze + clip capture). Protocol: `Emulation.setDeviceMetricsOverride`
393x852 dpr3 mobile, `Emulation.setCPUThrottlingRate` 4, open `/?app=fullscreen`, click
`.activity-strip [role=button]` to raise the reward sheet (gem canvas 340x320 at 27,185), then 5 s windows.
"Offscreen" = `#reward-layer` translated `translateY(-2400px)` (real IntersectionObserver non-intersection,
canvas unchanged). Instrumentation injected via `Page.addScriptToEvaluateOnNewDocument`: rAF wrapper counting
every invoked callback, `Element.prototype.getBoundingClientRect` + `clientWidth/clientHeight/offsetWidth/
offsetHeight/offsetParent` getters wrapped, `PerformanceObserver('longtask')`, plus `Performance.getMetrics`
deltas (ScriptDuration/LayoutDuration/RecalcStyleDuration/LayoutCount) per window.

## Numbers (before -> after)
Same machine, same protocol. **before** = original HEAD code measured on the *same tree and load path* as the
after run (files swapped from `git show HEAD:` and restored afterwards). **after** = this lane's code.

| metric (5 s windows, 4x CPU throttle) | before — gem offscreen | after — gem offscreen | before — gem onscreen | after — gem onscreen |
|---|---|---|---|---|
| rAF callbacks/s (whole page) | 10.2 · 12.2 · 11.2 | **0 · 0 · 0** | 8.6 · 8.4 | 5.4 · 3.8 |
| gem-loop callbacks/s | 10.2 · 12.2 · 11.2 | **0 · 0 · 0** | 8.6 · 8.4 | 5.4 · 3.8 |
| gem `renderer.render`/s | 0 | 0 | 8.6 · 8.4 | 5.4 · 3.8 |
| forced reflow: `getBoundingClientRect`/s | 0 | 0 | 0 idle · **2.6–3.2 hover** | **0 idle · 0 hover** |
| `clientWidth/Height`, `offsetWidth/Height`, `offsetParent` reads/s | 0 | 0 | 0 | 0 |
| script ms/s | 26.2 · 32.3 · 17.1 | **0.1 · 0.0 · 4.4** | 488 · 574 | 215 · 520 · 453 |
| longtask ms/s | 672 · 736 · 520 | 77 · 51 · 118 | 594 · 631 | 481 · 664 · 605 |
| style recalc ms/s | 12 · 18 · 17 | 72 · 41 · 97 | 9.8 · 3.7 | 76 · 99 · 114 |

Read this honestly:
- **The rig-attributable numbers are the real result**: offscreen gem loop 10–12/s -> 0/s, offscreen script
  ms/s 17–32 -> 0–4, hover `getBoundingClientRect` 2.6–3.2/s -> 0.
- The whole page renders ~6–12 fps under 4x throttle + SwiftShader, so "onscreen" frame counts are page-bound,
  not rig-bound; 8.6 fps vs 5.4 fps across runs is page-load variance, not a regression (same renders/s as
  loop callbacks in every window — the rig does exactly one render per frame).
- style/longtask in the "after" windows are 4–8x the "before" windows **in both states including offscreen,
  where the rig does nothing at all** — that is other lanes' in-flight CSS (paint budget / glass
  compositing), not this lane. Do not read those columns as a delta of my change.
- The earlier `before.json` (old load path: CDN three, per-script tags) gave offscreen 19.8–28 gem-loop
  callbacks/s and 6–21 script ms/s; the load-path lane changed to `/vendor/three.min.js` + `/vendor/gem-boot.js`
  mid-task, so only the same-tree `before2` numbers above are used.

## Mechanism per change
1. **Park/arm (all four rigs).** The loop no longer reschedules first. New shape:
   - `rig.raf = 0` on entry; reap check; `dt` computed and `rig.last` advanced; then
     `if (!rig.vis || document.hidden || rig.dead) return;` — **no reschedule**;
   - `rig.raf = requestAnimationFrame(loop)` only at the end of a frame that actually drew.
   - `park(rig)` = `cancelAnimationFrame` + zero the handle. `arm(rig)` = guard
     (`raf || gone || !vis || document.hidden || dead`) then `rig.last = performance.now()` and schedule.
   - IntersectionObserver callback now arms on intersection and **parks on non-intersection**
     (`if (!vis) return park(rig); if (renderer) arm(rig); else start(rig);`).
   - `document.addEventListener('visibilitychange', rearm)` re-arms every visible rig and parks the rest
     (gem/deck/cube/illusion). `reap`/`drop` cancel the handle and disconnect IO/RO before disposing the renderer.
2. **Forced layout hoisted (gem).** `window.GEM_RIG.size(rig)` is gone from the frame. `gem-rig.js`'s
   ResizeObserver callback now measures (`rig.epoch = -1; api.size(rig)`), plus the initial measure in `start()`
   and a `resize` listener outside rAF. Same reads, same `setSize`/camera math, different moment.
3. **Forced layout hoisted (gem tilt).** The 250 ms `canvas.getBoundingClientRect()` in the loop moved to
   `GEM_DRAG.track(e, force)` (called from `pointermove`, and from `scroll`/`resize` with force + 60 ms
   coalesce). It caches `rig.box` and computes `rig.tiltT` there; the frame only reads the cache.
4. **deck/cube/illusion sizing.** Per-frame `size()` + `canvas.offsetParent` replaced by a ResizeObserver that
   calls `size()` (which sets `rig.dead` from `clientWidth/Height`) and then `arm(rig)`; the loop tests
   `rig.dead`. `offsetParent` is no longer read anywhere.
5. **One clock.** Every touched loop multiplies the clamped dt by the time-scale contract:
   `const dt = Math.min((now - rig.last) / 1000 || 0, 0.05) * scale();` where
   `scale() = window.__slowmo && window.__slowmo.getScale ? getScale() : 1`. At scale 1 the multiply is exact
   (`x * 1 === x`), so the frame is unchanged; `gooey` already imported `getScale` and still does. No second
   clock was introduced — the rigs keep the single `performance.now()` delta they had.
6. **gooey.** `kick()` refuses to schedule while `document.hidden`; `tick()` returns early when hidden leaving
   `live = true`; a `visibilitychange` listener re-arms a live spring (registered with the same AbortSignal, so
   `detach()` removes it). Its discrete rest-condition is untouched, so the settle pose and the loop's
   self-termination are unchanged.

### dt / phase continuity (verified)
`rig.last` is only set (a) at the end of every frame that ran, and (b) inside `arm()` at the moment the loop is
re-armed. `rig.t`/`rig.tilt` are never reset, so the pose resumes from the same accumulated clock. dt is clamped
to `0.05` exactly as before, and the re-arm sets `last = now` so a long park produces a ~0 s first frame instead
of a clamped 0.05 s jump. Probe (unthrottled, onscreen -> offscreen 2 s -> onscreen 1 s):
`t 0.1913 -> (vis:false, raf:false, t frozen 0.2413) -> (vis:true, raf:true, t 0.6006)`.

## Parity
- Capture method determinism: two independent frozen-pose captures of the gem region (`shot.mjs` run twice)
  produced **byte-identical PNGs** — `sha256 e65997dd…76d2`, both 1020x960, `pixelDiff 0.0000%`.
- **Before-vs-after pixelDiff: NOT MEASURED.** The after capture was cancelled before it ran. This is the one
  open item: with the server above, `node shot.mjs after-gem.png` then a PIL `ImageChops.difference` against
  `/Users/irfan/.hermes/cache/scratch/before-gem.png` closes it.
- Reason to expect 0: no material, light, tone-mapping, pixelRatio, antialias or pose formula was touched; the
  only frame-visible changes are *when* a frame runs and *where* a rect is read.

## Not done / did not work
- **`illusion-chain.js` left alone.** Its tick already schedules at the end and self-parks on `R.idle`; its
  reveal uses absolute timestamps (`R.t0`), so an IntersectionObserver gate would freeze nothing and re-order
  the blurb chain on return. Not a hot idle loop (it lives only during a 3–8 s reveal). If it must be gated,
  gate on `document.hidden` only and re-kick non-idle rigs from `visibilitychange`.
- **Observed, not mine:** `index.html` now loads `/vendor/three.min.js` with `defer` and the gem scripts are
  concatenated into a deferred `/vendor/gem-boot.js`. That pairing is correct, but any single mis-ordered
  deferred/sync tag leaves `window.THREE` undefined when the classic scripts run, which silently degrades the
  gem to `GEM_FALLBACK` (2D gradient, no rig, no IO). I hit exactly this once with a stripped vite config.
- **Crown facet-edge report (new, from the owner):** this lane touched loop timing, sizing *when*, and the tilt
  rect read only — no geometry, winding, shader, material or `setPixelRatio` change. If the rounded-crease
  defect reproduces, it is not from this lane's edits; to isolate, `git checkout -- src/components/GemReward/`
  restores all three gem files to HEAD in one command.
- Header comments in the touched files were compressed to stay inside the 100-line budget (no code was
  compressed in a way that changes behaviour; `deck3d`/`cube3d` still-shapes were folded onto one line).

## Files changed
`src/components/GemReward/gem3d.js` (100) · `gem-rig.js` (69) · `gem-drag.js` (94) ·
`src/components/GlassDeck/deck3d.js` (100) · `src/components/IntelCube/cube3d.js` (99) ·
`src/components/IllusionCube/illusion3d.js` (100) · `src/motion/gooey.js` (100). All ≤100 lines, `node --check`
clean, no raw hex introduced.
Scratch (outside the repo): `~/.hermes/cache/scratch/{cdp,measure,shot,probe3}.mjs`, `before2.json`,
`after.json`, `before-gem.png`, `before-gem2.png`. In-repo scratch: `.hermes/tmp/vite-nohmr.config.mjs`.
