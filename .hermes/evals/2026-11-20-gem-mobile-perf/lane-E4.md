# Lane E4 — adversarial suite repair

**Verdict.** The suite is repaired and scores **60/100 (D)** on `dee15c3` end to end —
**perf 0/40 · parity 30/30 · stress 30/30**, no cap. The earlier earned baseline was 37/100
(`perf 0 · parity 10 · stress 27`, parity PASS but self-referential). The difference is not a new
optimisation in this lane (this lane changed **no app source**); it is two things the repaired
harness can now prove: stress case (i) passes on the **shipped** tree, and parity is certified
against a **reference build** instead of against itself.

## Exact command

```bash
# 1. my own dev server — never :5173 (the owner's live Safari server)
cd "/Users/irfan/Documents/Portfolio Redo/crm_proj"
npx vite --port 5410 --strictPort --host 127.0.0.1

# 2. reference tree (pre-ship 10390c2), served on 5411 — used ONLY to arm the parity baseline
git worktree add --detach /Users/irfan/.hermes/cache/scratch/e4-rogue/ref-wt 10390c2
ln -s "/Users/irfan/Documents/Portfolio Redo/crm_proj/node_modules" /Users/irfan/.hermes/cache/scratch/e4-rogue/ref-wt/node_modules
(cd /Users/irfan/.hermes/cache/scratch/e4-rogue/ref-wt && npx vite --port 5411 --strictPort --host 127.0.0.1)

# 3. arm the gate once, then run the whole suite
cd "/Users/irfan/Documents/Portfolio Redo/crm_proj/.hermes/evals/2026-11-20-gem-mobile-perf/tools/rogue"
node parity.mjs --save --url http://127.0.0.1:5411/gallery.html --ref-root /Users/irfan/.hermes/cache/scratch/e4-rogue/ref-wt
node rogue.mjs --all
```

`rogue.mjs --all` ran `perf → stress → parity --compare --arms → score` on build
`dee15c3-clean` (it waits 45 s for a stable working tree first; it settled in 46 s).
Suite: `/Users/irfan/Documents/Portfolio Redo/crm_proj/.hermes/evals/2026-11-20-gem-mobile-perf/tools/rogue/`.
Log: `/Users/irfan/.hermes/cache/scratch/e4-rogue/all.log`.

## Per-case results (one run, `out/stress.json`)

| case | what it hits | verdict | evidence |
|---|---|---|---|
| a | resize storm 320×568 ↔ 430×932 ×20 | **PASS** (9.2 s) | no dead/lost/zero-buffer frame; buffer restored to 1020×1440; coverage 100 % |
| b | dpr switch 1 → 2.5 → 1 ×10 | **PASS** (5.9 s) | ended ratio 1, buffer 340×480, context alive |
| c | hidden/shown ×5 + cadence recovery | **PASS** (10.1 s) | app saw `hidden===true` all 5 cycles, rAF alive, pre 33 ms → post 17 ms (63 frames), override `own-property` |
| d | `prefers-reduced-motion` | **PASS** (5.7 s) | `raf===0`, `rig.t===0`, static frame renders (coverage 100 %) |
| e | `?gemdpr=1 \| 2 \| absent` | **PASS** (15.7 s) | ratios 1 / 2 / 1, buffers match css×ratio, 0 new console signatures |
| f | `?gemquality=full \| tuned \| absent` | **PASS** (16.3 s) | pill hidden on `full`, shown on `tuned`/absent, all three render |
| g | bloom toggled 20× | **PASS** (6.1 s) | on/off differ (330 618 914 vs 327 552 229), ends on |
| h | 3 stones + card + ceremony in one page | **PASS** (6.8 s) | 4 renderers, 4 distinct stones, all non-blank |
| i | WebGL1 forced (`--disable-webgl2`) | **PASS** (11.3 s) | 2 renderers on **WebGL 1.0 (OpenGL ES 2.0 Chromium)**, 1020×1440, meanRGB **203.27** vs WebGL2 **202.83** in the same run, console clean |
| j | 200 pose changes, memory | **PASS** (7.2 s) | textures 8→8, geometries 57→57, tail spread 0/0 |

**10 passed, 0 failed, 0 skipped.** `stress.mountSkips` is empty.

Case (i) is the one I did **not** accept on the first pass. The original assertion was
`renderers > 0 || GEM_FALLBACK !== 'undefined'`, and a run where the mount timed out left
`renderers=0` and passed the case on the mere existence of the global — a vacuous pass. The case
now requires a real context (`VERSION` contains `WebGL 1`), non-blank pixels read in the same
task, and prints the WebGL2 arm's mean from the same session for comparison. That is the only
scoring change that makes the stress 30 defensible.

## Parity — certified, cross-build

Reference arm: `gallery.html?gemdpr=3&gemperf=1` on **`10390c2-clean`**, render-path hash
`4a7ebce172f04a81`. Run: same arm on **`dee15c3-clean`**, render-path hash `6f0b54079c2e1e7f`.
The hashes differ (the render path *did* change between the two commits), so the diff is a real
cross-build comparison, not a baseline re-armed under itself.

| metric | bbox | rim | whole frame |
|---|---|---|---|
| %px > 2/255 | **0** | **0** | **0** |
| %px > 8/255 | **0** | **0** | **0** |
| mean abs Δ | 0 | 0 | 0 |
| max Δ | **0** | **0** | **0** |

`592 832` bbox px / `1 468 800` frame px, mask `bgdiff` coverage 23.593 %, rim 12 545 px.
Control (two fresh loads, same build): **0 / 0**, `noisy:false`. Arm self-noise (first arm
re-captured): **0 / 0**. `change.pass = true`, `reliable = true`, `selfReferential = false`,
`certified = true`.

Arm matrix (`--arms 'default,?gemmesh=0,?gemmesh=1'`, one browser, one pose):

```
default    vs ?gemmesh=0   bbox>8 0%        max 0    rim>8 0%        MATCH
default    vs ?gemmesh=1   bbox>8 2.355811% max 243  rim>8 5.111058% DIFFER
?gemmesh=0 vs ?gemmesh=1   bbox>8 2.355811% max 243  rim>8 5.111058% DIFFER
arms invariant PASS — required match: default=?gemmesh=0
```

The mesh path's difference is the documented E2 crease artefact, so it is reported and **not**
required to match. `default vs ?gemmesh=0` is required (it is the E2 flip gate) and is
byte-identical.

## Perf — measured, 0 points, honestly

| run | A (1020×1440) | fixed | slope | spread | projected (×7, ESTIMATE) | host load |
|---|---|---|---|---|---|---|
| `--all` (authoritative, final code) | **10.145 ms** | 0.911 ms | 45.3 ns/px | 11.37 % | **71.02 ms** | 9.0 / 10 cpus, CONTENDED |
| `--all` (earlier, profiles in-tree) | 8.564 ms | 0.576 ms | 39.2 ns/px | 0.86 % | 59.95 ms | 2.3 / 10 cpus |
| standalone (`--seed 12345`) | 11.953 ms | 2.593 ms | 45.9 ns/px | 10.29 % | 83.67 ms | 6.7 / 10 cpus |

4/4 rounds kept in every run (rounds: 10.15 / 10.76 / 9.58 / 12.77 ms on the final one). The
projected band (67.02–75.35 ms) is entirely **over** the 50 ms floor, so `floorResolvable` is true
and the 0/40 is a real verdict, not noise straddling the threshold. Three runs on load 2.3, 6.7
and 9.0 give 60 / 84 / 71 ms projected — the machine's spread is larger than any change in this
lane, and every one of them is over the floor. This is the same conclusion as the prior lane
(95 ms projected); nothing about the build got faster.

**Why 60 and not 37** — arithmetic: `0 + 30 + 30 = 60`. The prior 37 was `0 + 10 + 27`:
parity was self-referential (capped at 10) and case (i) failed on `10390c2` (three NEW
`THREE.WebGLRenderer: A WebGL context could not be created` errors). The WebGL1 repair shipped in
`1f4f2f2`, *after* that pinned reference, so on `dee15c3` the arm genuinely renders and the
console is clean. Both changes are measured, not assumed.

## The five required fixes — what they are now

1. **Same-task read.** `harness.capturePinned` does `pin + render + gl.readPixels` in one
   `Runtime.evaluate`; every case that reads pixels does the same. No capture can read a
   discarded `preserveDrawingBuffer:false` buffer.
2. **Allowlist from a control load.** Two control loads (bare gallery + mounted ceremony) define
   the signature set; the run allowed exactly 2 signatures — `deck-lab.js:16` (31×) and the
   favicon 404 (1×) — and no case failed on a console signature.
3. **Non-freezing visibility.** Case (c) shadows `document.hidden`/`visibilityState` and fires
   `visibilitychange`; rAF keeps its clock, the app must recover, 30 s cap yields SKIP.
   `Emulation.setPageVisibilityOverride` is not a command in this Chrome (`probeVisibilityMethod`
   reports `own-property`).
4. **Baseline provenance.** `meta.json` now records role (`reference`), the served URL, arm query,
   git `HEAD` + status digest of the **served** tree, the **render-path hash** of the Vite-served
   bodies (7 files), the canonical box, the hidden pools, and `maskSource: bgdiff`.
   `--compare` refuses a baseline missing any of those, and refuses a cross-build baseline not
   declared a reference. The diff mask is built from the **reference** capture's own
   frame+background pair and asserted `bgdiff` (`change.maskProvenance`).
5. **Arm comparison.** `--arms` + `--arm-expect` as above; a failing *required* pair is 0 parity
   points and caps the run.

Three further harness bugs surfaced while running the repaired suite:

* **Canvas-box jitter.** The rig's CSS box rounds 339/340 px between loads, so control captures
  came out 1017×1440 vs 1020×1440 and `compareCaptures` threw `size mismatch`. Every capture now
  forces a **340×480 CSS box** and runs the app's own `GEM_RIG.size()` first; control disagreement
  also triggers a bounded re-capture.
* **Mount precondition.** A mount that never produced a renderer was recorded as FAIL and capped
  the run. It is retried once; a persistent failure is a named SKIP (0.35), because the control
  load already proved the rig mounts. This is not hypothetical: the first repaired stress run
  failed case (b) exactly this way, and case (f) needed `[attempt 2]` in a later run.
* **Chrome profile inside the served tree.** Chrome's throwaway profile was created under
  `tools/rogue/.chrome/`, i.e. inside the Vite project root. Vite watches that root, so Chrome
  rewriting its own profile (extensions, service workers) fired **full page reloads** that destroy
  the execution context mid-measurement — the likely cause of the case (f) retry above. Profiles
  now go to the OS temp dir (`ROGUE_CHROME_DIR`), and the final run needed no retries at all.
* **Node/paths in `--all`.** `process.execPath` pointed at a missing wrapper and
  `new URL(import.meta.url).pathname` was percent-encoded, so `--all` could not spawn its
  children. Fixed with `fileURLToPath` + a resolved node binary.

## Remaining harness limitations (not fixed, reported)

* **Visibility is emulated, not real.** Case (c) proves the app *observes* hidden/shown and does
  not wedge. It cannot reproduce a background tab's rAF throttle — this Chrome exposes no
  command that does without freezing the page permanently.
* **Perf is an M1 proxy ×7.** No Adreno/Mali/PowerVR is reachable. `59.95 ms` is an ESTIMATE, and
  `0/40` says "3.6× over the 60 fps budget on this proxy", not "the phone renders at X ms".
* **Parity is one pose, one dpr, one frame.** `rig.t=0`, `position.y=0`, dpr 3, floor pools hidden
  for both captures. A pose-dependent facet change, or anything in the hidden caustic/shadow
  pools, is invisible to the gate. The dpr 2 arm is not re-run here (it was measured in the prior
  lane at 0.000 %).
* **The gate is a tolerance, not identity.** `bbox >8 ≤ 0.05 %` and `rim >8 ≤ 2 %` would accept a
  small crease-level change. This run happens to be bit-exact (maxΔ 0), but a future PASS need not be.
* **A mount retry can mask a slow mount.** It cannot mask a build that never mounts (that becomes
  a named SKIP, and `stress.mountSkips` is empty here), but a real 20 s mount regression per case
  would read as PASS after one retry.
* **Arm matrix is one required pair.** `?gemmesh=1` differing is expected; nothing would catch a
  *new* difference inside the mesh arm itself.
* **Baseline raw pixels and most canvas PNGs are pruned** from the repo copy to keep it light:
  `out/parity-baseline/*.raw` (11 MB) and 9 of the 10 per-case canvas PNGs. `meta.json` keeps the
  identity, hashes and protocol; the ten page screenshots and `stress-i-canvas.png` are kept.
  Re-arm with the `parity.mjs --save` command above to diff again; every run regenerates all
  evidence PNGs.
* **Shared machine.** The three perf runs above differ by 40 % in wall ms (load 2.3 → 9.0). All land
  over the floor, but on a busier box the perf verdict is only as good as `spreadPct` shows.

## Artifacts (absolute paths)

| what | path |
|---|---|
| repaired suite + README | `/Users/irfan/Documents/Portfolio Redo/crm_proj/.hermes/evals/2026-11-20-gem-mobile-perf/tools/rogue/` |
| score | `…/tools/rogue/out/score.json` |
| parity (reference, arms) | `…/tools/rogue/out/parity.json`, `…/tools/rogue/out/arms.json` |
| stress (10 cases) | `…/tools/rogue/out/stress.json` |
| perf | `…/tools/rogue/out/perf.json` |
| selftest (69/69) | `…/tools/rogue/out/selftest.json` |
| baseline provenance | `…/tools/rogue/out/parity-baseline/meta.json` |
| run log | `/Users/irfan/.hermes/cache/scratch/e4-rogue/all.log` |
| WebGL1 probe | `/Users/irfan/.hermes/cache/scratch/e4-rogue/probe-webgl1.mjs`, `…/probe-webgl1-webgl1.json` |
| case (i) canvas evidence | `…/tools/rogue/out/failures/stress-i-canvas.png` |
