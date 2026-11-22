# Lane L — `index.html` pixel gate for `?gemtimer` (the gate lane E5 could not run)

**Verdict: PASS.** `index.html` is byte-identical between `dee15c3` and this tree at both viewports, with a real renderer on both arms. The probe adds one inert `<script>` to the gem-boot manifest and nothing else.

E5 gated `gallery.html` only: its index mount never produced a renderer (the sheet's canvas stayed `withR: false`). The missing piece was the mount, not the page — `?app=fullscreen` plus a click on the wired peak bar opens the reward sheet and builds a live rig (`canvas[data-gem="sapphire"]`, CSS box **340×320** at both viewports).

**Harness:** `tools/index-gate.mjs` (this directory), built on `../2026-11-20-gem-mobile-perf/tools/rogue/harness.mjs`. Raw buffers + JSON: `/Users/irfan/.hermes/cache/scratch/final-gate/`.

---

## 1 · Arms

| arm | source | server |
|---|---|---|
| HEAD | `git archive HEAD` (`dee15c3`) extracted to scratch, `node_modules` symlinked | Vite on **:5415** (`--strictPort`) |
| TREE | the working tree (`gem-perf-timer-ext.js` + hook + tags) | Vite on **:5416** (`--strictPort`) |

Port **5173 (the owner's live Safari server) was never touched**. Served bytes prove the arms are the arms: `/vendor/gem-boot.js` on 5415 contains **0** occurrences of `GEM_PERF_TIMER_EXT`, on 5416 **3** (the ext file's own global, the hook, the comment).

## 2 · Method

`index.html?app=fullscreen&gemdpr=<dpr>` → wait `GEM3D.rigs` → click `.activity-strip [data-reward-wired]` → wait `#reward-sheet` rig → settle 2.5 s. Then, in **one** `Runtime.evaluate` per capture: cancel `rig.raf`, zero `rig.t`/`rig.tilt`/`rig.tiltT`, pose `rotation(-0.15,0,0)`, `position(0,0,0)`, `scale(1,1,1)`, force `setDrawingBufferSize(340, 320, pixelRatio)` (the stage box jitters 339/340 between loads), hide the floor pools (`shadow`, `contact`, `caustic`, `ground`, `base`, `rest` — `rig.floors.k` is a number, not a pool, which is why the `in` test is typeof-guarded), render, `gl.readPixels` from the raw drawing buffer, then re-render with `group.visible=false` for the background (silhouette = `|fg-bg| > 8`).

Each arm is captured twice for the A-vs-A control. Chrome: `--headless=new`, `--use-angle=metal`, own profile per arm, `Emulation.setDeviceMetricsOverride` + touch emulation, CPU throttling off (this is a pixel gate, not a perf one).

## 3 · Numbers

| viewport | buffer | px >2/255 | maxΔ | meanΔ | A-vs-A | programs | taps / bounce | sha256 | subject |
|---|---|---|---|---|---|---|---|---|---|
| 393×852 dpr 3 | 1020×960 | **0 of 979,200 (0.000000 %)** | **0** | **0** | **0** | **6 = 6** | 3 / 5 = 3 / 5 | `5988da286bacba60…` **equal** | 37.01 %, meanRGB 184.77 |
| 1440×900 dpr 2 | 680×640 | **0 of 435,200 (0.000000 %)** | **0** | **0** | **0** | **6 = 6** | 3 / 5 = 3 / 5 | `96e0ccea5b98c99a…` **equal** | 37.05 %, meanRGB 184.77 |

Background (`group.visible=false`) shas are equal too, so the zero is not two identical blank frames. Bloom is **absent** on this page (`GEM_BLOOM` undefined — `index.html` loads no `gem-bloom.js`), cap reads 2 on both arms.

## 4 · The gate is not blind

A zero-diff gate is only worth its falsification. Same page, same launch, same capture path, rotation moved 0.1 rad (`-0.15` → `-0.25`):

| pair | px >2/255 | maxΔ |
|---|---|---|
| pose −0.15 vs pose −0.25 | **37.438 %** (366,591 of 979,200) | **250** |

The pinned pose also reproduced `5988da286bacba60…` on a third independent Chrome launch, so the capture is repeatable across launches, not just within one.

## 5 · What this does and does not prove

- **Proves:** the `?gemtimer` tag + hook change no pixel of `index.html` on the default path, at a phone and a desktop viewport, with the shipped script loaded and the param absent (`?gemtimer` off).
- **Does not prove:** the timer itself on this page (that is `?gemtimer=1` + a phone, `tools/device-probe/README.md` §4), nor bloom behaviour on index (there is no bloom on index).
