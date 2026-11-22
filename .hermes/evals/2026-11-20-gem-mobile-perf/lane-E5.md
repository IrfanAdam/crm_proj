# Lane E5 — device falsification probe (`?gemtimer=1`)

**Verdict up front: E5 is still NOT device-measured.** No Adreno/Mali/PowerVR GPU is reachable from this machine.
What shipped is the instrument: an opt-in GPU pass timer that a phone can run with one URL and one tap, plus proof
that it does not disturb the default render. Every number in this note is headless (`ANGLE (Apple, ANGLE Metal
Renderer: Apple M1 Max, Unspecified Version)`) and is plumbing evidence, **not** a phone result.

Runbook for the phone: `tools/device-probe/README.md`. Harness: `tools/device-probe/harness/`.

---

## 1. What shipped

| file | change | lines |
|---|---|---|
| `src/components/GemReward/gem-perf-timer-ext.js` | **new** — the probe: `EXT_disjoint_timer_query_webgl2` per-pass timing, 240-sample rings, compact HUD, copy-JSON button, probe-only arm knobs | 99 |
| `src/components/GemReward/gem-perf.js` | the existing perf path arms it: `if (param('gemtimer') === '1' && window.GEM_PERF_TIMER_EXT) window.GEM_PERF_TIMER_EXT.arm(window.GEM_PERF);` + 1 comment line. Two header comment lines reflowed (no text lost) to stay inside the 100-line cap | +2 / −1 |
| `gallery.html`, `index.html` | one `<script src="…/gem-perf-timer-ext.js">` each, immediately **before** `gem-perf.js`; `index.html`'s gem-boot manifest comment 31 → 32 scripts (the manifest itself is derived from the document by `scripts/vite/gem-boot.mjs`, so nothing else needed) | 0 lines (tags share an existing line) |

No new dependencies, no `package.json` script changes, no parallel perf system: the param is read where `?gemperf`
and `?gemphone` are read, and the HUD copies the `gem-perf-hud.js` conventions (fixed corner, one DOM write per
text change, promise-or-select copy path).

`pitch.html` does not load `gem-perf.js`, so `?gemtimer=1` does not exist there. Deliberately not added — that
would mean adding the dpr controller to a page that has never had one.

### What it measures

The stone is **one** fragment shader pass, so there is no entry/trace split to measure and none is invented: the
whole gem pass is reported as `gem`. The three passes come from the render-target boundaries the existing
`gem-bloom.js` wrapper already crosses — `gem` (scene → full-size target), `bloom` (gaussian → half/quarter
target), `comp` (composite → canvas). Each query opens at the **first draw call** of its segment and closes at the
next render-target switch, so pre-draw JS is not billed to the GPU. One query is open at a time (WebGL2 allows one
`TIME_ELAPSED` query), so passes are sequential, never nested; the frame number is the HUD's own rAF ring and is
always labelled `rAF`.

Fallback is explicit, never silent: no timer extension → `timer.mode: "raf"`, per-pass rows print `n/a`, and the
HUD headline reads `rAF FALLBACK — NOT gpu timer`. A driver that throws or never hands results back degrades the
same way (`dead()` sets the note), so unsupported data cannot masquerade as timer data.

---

## 2. Default-path inertness (the gate)

Method: `dee15c3` served from `git archive HEAD` on port 5414 (a second Vite server, no worktree, no stash), the
working tree on 5413. Both arms captured by the **same** script (`tools/device-probe/harness/capture.mjs`), same
pinned pose (`rig.t = 0`, `group.rotation.set(-0.15,0,0)`, `group.position.y = 0`), floor pools hidden
(`shadow`, `contact`, `caustic`), raw drawing buffer via `gl.readPixels` in the **same** CDP task as the render,
forced `setDrawingBufferSize(css × ratio)` so the known 339/340 css-px jitter cannot fake a delta, A-vs-A control
inline. `?gemtimer` absent in every arm.

| page | viewport | ratio | buffer | pre sha256 | post sha256 | px >2/255 | maxΔ | meanΔ | A-vs-A | programs |
|---|---|---|---|---|---|---|---|---|---|---|
| `gallery.html` | 390×844 | 3 | 1020×1440 | `d518d65c…b9332b67` | `d518d65c…b9332b67` | **0 of 1,468,800 (0.000000 %)** | **0** | **0** | 0 | 8 → 8 |
| `gallery.html` | 390×844 | 2 | 680×960 | `8e562714…e6789` | `8e562714…e6789` | **0 of 652,800 (0.000000 %)** | **0** | **0** | 0 | 8 → 8 |

Byte-identical, both dprs, both arms. The dpr 3 sha also matches the sha the 2026-11-21 ship note recorded for
`gallery.html` (`d518d65c…b9332b67`), i.e. this lane did not move the shipped default.

**`index.html`: not captured.** Its gem lives behind the reward sheet (`#reward-sheet`), and the headless mount
never produced a renderer for it inside the capture budget (the sheet's canvas stays `withR: false`). The only
change to that page is the extra `<script>` in the gem-boot manifest; `npx vite build --mode production` passes and
`gem-boot.mjs` still resolves/concatenates the manifest (32 sources, all present). Recorded as **not covered**
rather than claimed.

**`pitch.html`: cannot carry a pixel gate — and this is pre-existing.** The pre-edit build, two loads minutes apart
on the same server, differs by **2.52 % of pixels >2/255, maxΔ 6**; two loads of the same build on two different
servers differ by up to 6.58 %, maxΔ 8. Pitch re-aims its camera from a layout rect in `pitch-gem-cycle.js:align()`
(`rig.dropY`), so its framing is load-timing sensitive; pinning `dropY = 0` shrinks but does not remove the wobble
(post-vs-pre 1.90 % at dpr 3, 0.027 % at dpr 2). Decisive part: **pitch.html and all 27 of its gem scripts are
byte-identical over HTTP between the two servers** (checked one by one), and pitch loads no file this lane touched.
The residual is page timing, not the probe.

No blocker was hit: gallery — the required page — is exactly identical, so nothing was reverted.

---

## 3. Headless smoke

Server: `npx vite --port 5413 --strictPort`. Harness: `node tools/device-probe/harness/smoke.mjs`.

**GPU-timer path** (`?gemtimer=1&gemdpr=3`, ceremony gem, 390×844 dpr 3):

```
GEM TIMER · gpu timer · disjoint 0
ANGLE (Apple, ANGLE Metal Renderer: Apple M1 Max, Unspecified Version)
Google Inc. (Apple) · webgl2
1020x1440 @3.00 · css 340x480 · dpr 3 · taps 3 bounce 5 bloom on prog 8
gem   14.21 / 49.94 ms n62
bloom 10.23 / 17.01 ms n62
comp   9.61 / 17.02 ms n62
frame 52.50 / 136.80 ms n87 rAF
copy JSON · 65 timed frames
copy JSON
```

(One run, on the exact shipped file. Consecutive headless runs of the same arm move by 10–20 % — quote the shape,
not these digits.)

- `GL_RENDERER` observed headless: **`ANGLE (Apple, ANGLE Metal Renderer: Apple M1 Max, Unspecified Version)`**,
  vendor **`Google Inc. (Apple)`** — i.e. this machine reports an M1 Max, not the M1 in the earlier notes.
- `gl.timerExt` reported as `EXT_disjoint_timer_query_webgl2`; `disjoint: false`, `dropped: 0` on this run.
- HUD present (`#gem-timer-hud`), button present and labelled `copy JSON`, `click` throws nothing (`clipboard` in
  headless without a user gesture falls back to selection; the promise-or-select path is exercised).
- The stone still renders with the probe on (canvas mean 200.9/255 on the ceremony buffer).

**Fallback path** — the timer extensions stubbed out via `Page.addScriptToEvaluateOnNewDocument` before load
(`getExtension` returns `null` for `/disjoint_timer_query/`), same URL:

```
GEM TIMER · rAF FALLBACK — NOT gpu timer · disjoint 0
ANGLE (Apple, ANGLE Metal Renderer: Apple M1 Max, Unspecified Version)
Google Inc. (Apple) · webgl2
1020x1440 @3.00 · css 340x480 · dpr 3 · taps 3 bounce 5 bloom on prog 8
passes n/a (no timer query)
frame 48.50 / 133.90 ms n86 rAF
```

JSON: `timer.mode: "raf"`, `timer.note: "no timer-query extension → rAF frame ms only; per-pass GPU ms
unavailable"`, `gl.timerExt: null`, all pass rows `{p50: 0, n: 0}`. **Unsupported data is labelled, not faked.**

**Arm knobs** (`?gemtimer=1&gemdpr=3&gemtaps=1&gembloom=0`): HUD reads `taps 1 bounce 5 bloom off`, and the JSON
reports the live uniform values (`taps: 1`), not the URL. `?gemdpr=1.5` → `510x720 @1.50`.

**Inert without the param**: `#gem-timer-hud` absent, `window.GEM_TIMER` undefined, `document.body.children`
unchanged (91), no rAF loop, no context call. The only trace left by the ext file is
`window.GEM_PERF_TIMER_EXT = { arm }`.

Every smoke run logs exactly two pre-existing error families and nothing else: `404 /favicon.ico` and
`deck-lab.js:16 TypeError: Cannot read properties of undefined (reading 'el')` (the eval README's arm-independent
throw).

---

## 4. The four E5 arms, run headless (NOT device numbers)

`node tools/device-probe/harness/arms.mjs`, 390×844 dpr 3 emulation, ceremony gem, 6 s of samples per arm after a
warm-up to >15 instrumented frames. Bloom on unless stated; `bounce 5` in every arm.

| arm | buffer @ratio | `gem` p50 / p95 ms | `bloom` p50 | `comp` p50 | rAF frame p50 | disjoint / dropped |
|---|---|---|---|---|---|---|
| dpr 3, taps 3, bloom on | 1017×1434 @3 | 16.91 / 58.30 (n70) | 13.45 | 13.38 | 85.5 | false / 0 |
| dpr 3, taps 1, bloom on | 1020×1440 @3 | 11.83 / 37.55 (n77) | 8.92 | 8.95 | 80.6 | false / 0 |
| dpr 3, taps 3, bloom off | 1020×1440 @3 | 17.21 / 58.53 (n77) | — (no second target) | — | 86.9 | false / 0 |
| dpr 1.5, taps 3, bloom on | 510×720 @1.5 | 12.21 / 31.00 (n81) | 8.29 | 7.40 | 68.8 | false / 0 |

**Read nothing into the values.** This headless page is CPU-bound (rAF p50 69–87 ms while the pass sum is ~40 ms),
so the GPU idles inside segments and every number is inflated by an amount that does not scale with pixels — the
dpr 1.5 → 3 check reads 1.38× here, not the ~4× the model predicts, purely because the page is not fill-bound at
all in this configuration. That is exactly the failure mode the E5 spec says to look for on a phone, and exactly
why the phone is the only place these numbers mean anything. What the table *does* establish is that the probe
produces every field E5 asks for, on every arm, with the disjoint flag live.

The runbook in `tools/device-probe/README.md` §4 states the thresholds and which field to read per arm
(Adreno 610 17–68 ms at dpr 1.5; ~4× for the dpr ramp; −50…−80 % for taps 3 → 1 on the `gem` pass; 10–30 % bloom
share at dpr 3).

---

## 5. Gates

- `npm run lint:tokens` → **exit 0** (`✓ 0 raw leaks, 0 over-limit (1862 files scanned)`). Both gem files are at
  99 lines; `gem-perf.js` was already at 99, so its two new lines were paid for by reflowing two header comment
  lines (no text removed).
- `npx vite build --mode production` → **exit 0** (`✓ built in 1.67s`), gem-boot manifest still valid.
- No commit made (as instructed). Dev servers started by this lane were killed; nothing on 5173 was touched.

Known side effect, undone: the Vite `mechanics-graph` plugin regenerates `src/js/mechanics/graphData*.js` (only the
`META.generatedAt` stamp) whenever a file is added under `src/`. Those four files were restored to `HEAD` after the
last server run.

---

## 6. What is left (E5 proper)

1. Run §4 of `tools/device-probe/README.md` on the Adreno 610 (and, if available, a Mali-G52 and a PowerVR
   GE8320) and fill in `timer.passes.gem.p50` per arm.
2. Report `gl.renderer` verbatim with each run; a run whose `timer.disjoint` is true or whose `dropped` is non-zero
   is discarded, not averaged.
3. Only then can the model's 34 ms at dpr 1.5 be called true or falsified. Until then this lane ships the
   instrument and the inertness proof — **no on-device result is claimed anywhere in this note.**

Scratch (prunes): `/Users/irfan/.hermes/cache/scratch/e5-probe/` — `shots/` (raw buffers + JSON per arm),
`arms.json`, `smoke.json`, `prebuild/` (the `git archive HEAD` snapshot served on 5414).
