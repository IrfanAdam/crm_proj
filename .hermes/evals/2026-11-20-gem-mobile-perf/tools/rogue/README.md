# rogue — adversarial mobile-perf suite for the gem renderer

Grades the ceremony gem rig (`#gem-screen`): a change has to be **faster**, **pixel-identical
within a rim-weighted gate**, and **survive ten stress cases**. One stress failure or a parity
FAIL caps the run at 40/100.

This is a *repaired* suite. A previous run scored 0/100 and another 100/100; both were harness
rot, not the build. Each repair below names the bug it removes.

## Prerequisites (hard)

* A **dev server you start yourself**, on **5410**:
  ```bash
  cd "/Users/irfan/Documents/Portfolio Redo/crm_proj"
  npx vite --port 5410 --strictPort --host 127.0.0.1
  ```
  The suite **never** touches `:5173` (the owner's live Safari server) and never restarts one.
  Override with `ROGUE_BASE_URL` or `--url`.
* `ws` comes from the repo's `node_modules` (no playwright/puppeteer). Chrome is launched headless
  per run (`--headless=new`, throwaway `--user-data-dir` under `$TMPDIR/rogue-chrome`, **never**
  inside the served tree — Vite watches the project root and Chrome rewriting its own profile
  caused full page reloads mid-measurement).
* Never run two graders at once: each launches its own Chrome with CPU throttle 6 and they poison
  each other's timings.

## Files

| file | concern |
|---|---|
| `rogue.mjs` | entry point: `--selftest`, `--smoke`, `--all`, `--score` |
| `perf.mjs` | two-size A/B/B/A timing, 4+ paired randomized rounds, prune, project, floor resolvability |
| `parity.mjs` | pixel gate, baseline provenance, arm matrix + required-match invariants |
| `stress.mjs` | ten adversarial cases (a–j), control-derived console allowlist, evidence per case |
| `score.mjs` | the 0–100 formula, hard cap, grade |
| `harness.mjs` | CDP + rig plumbing: `openPage`, `mountCeremony`, `pin`, `capturePinned`, `renderBuildHash`, allowlist, visibility |
| `out/` | generated reports, evidence PNGs, `parity-baseline/` |

## Run

```bash
node rogue.mjs --selftest                  # pure JS, no browser — run after every edit
node rogue.mjs --smoke                     # one light load, PROVISIONAL, not a measurement

# arm the pixel gate against a REFERENCE tree (see "baseline provenance")
node parity.mjs --save --url http://127.0.0.1:5411/gallery.html --ref-root <reference-worktree>

node parity.mjs --compare --url http://127.0.0.1:5410/gallery.html \
  --arms 'default,?gemmesh=0,?gemmesh=1' --arm-expect 'default=?gemmesh=0'

node stress.mjs                            # 10 cases, ~3 min
node perf.mjs --rounds 4 --mult 7 --seed 12345
node score.mjs                             # reads out/*.json -> out/score.json

node rogue.mjs --all                       # perf -> stress -> parity --compare --arms -> score
```

Partial re-runs are merged **only on the same build identity**: `node stress.mjs --only b` then
`node stress.mjs --only b --merge`.

## The five repairs (each was a scoring bug)

1. **Same-task capture.** The rig context is `preserveDrawingBuffer:false`, so a `gl.readPixels`
   in a *later* CDP task reads a discarded buffer. Every capture now does `pin + render +
   readPixels` inside ONE `Runtime.evaluate` (`harness.capturePinned`).
2. **Console allowlist from a control load.** `src/ds/deck-lab.js:16` throws every ~250 ms on
   every page, arm-independent. `stress.mjs` derives the signature set from two control loads
   (bare gallery + mounted ceremony) and fails a case only on signatures the control did **not**
   produce. The allowlist is printed and stored in `stress.json`.
3. **Visibility without freezing.** `Page.setWebLifecycleState('frozen')` stops rAF permanently in
   headless Chrome; the old case measured a dead page. This Chrome has no
   `Emulation.setPageVisibilityOverride`; case (c) shadows `document.hidden`/`visibilityState` with
   own properties and fires `visibilitychange`, so the app *observes* hidden/shown and must
   recover, while rAF keeps its frame clock. 30 s cap → clean SKIP, never a pass.
4. **Baseline provenance.** A baseline records: git `HEAD` + status digest **of the tree the
   baseline is served from** (`--ref-root`), a **render build hash** (sha256 of the Vite-served
   body of every file on the render path, fetched from the page's own origin), the **arm query**,
   the **canonical capture box**, the **hidden floor pools**, and `maskSource: 'bgdiff'`.
   `--compare` refuses a baseline lacking any of these, and refuses a cross-build baseline that
   was not declared a reference. A baseline whose render hash equals the run's is
   `selfReferential` and scores at most 10 parity points — a baseline cannot certify itself. The
   diff mask is built from the **reference** capture's frame+background pair and asserted to be
   `bgdiff` (`change.maskProvenance`), never from the run under test.
5. **Arm comparison.** `--arms 'default,?gemmesh=0,?gemmesh=1'` captures each path in one browser
   at one pose, repeats the first arm for a self-noise floor, and cross-diffs every pair.
   `--arm-expect 'default=?gemmesh=0'` declares pairs that **must** be identical; a required pair
   that differs is an invariant FAILURE (0 parity points + cap), not a footnote. The
   `default vs ?gemmesh=1` difference is the documented E2 crease artefact and is not required.

Two more fragilities found while running the repaired suite:

* **Canonical capture box.** The rig's CSS box rounds 339/340 px between loads, so buffers came
  out 1017 or 1020 px wide and two captures could not be differenced at all (a crash, not a
  verdict). Every capture forces a 340×480 CSS box and runs the app's own `GEM_RIG.size()` before
  rendering, so the buffer is 1020×1440 at dpr 3 in every arm.
* **Mount precondition retry.** A mount that never produced a renderer used to be recorded as a
  FAIL and capped the run. It is a precondition failure (the control load proves the rig mounts),
  so it is retried once; if it still fails the case is a SKIP (worth 0.35) named in
  `stress.mountSkips`.

## Protocol

* viewport 390×844 CSS, dpr 3, mobile + touch, `Emulation.setCPUThrottlingRate 6`
* ceremony rig only, pinned pose `rig.t = 0` **and** `group.position.y = 0` (the idle bob moves
  geometry)
* two sizes: A = the rig's buffer, B = 1.5× CSS (≈2.25× area); one round = `A,B,B,A`; each block
  = 3 runs × 40 frames with a synchronous `readPixels`; ≥4 paired rounds, seeded order
* prune a round whose base deviates >20% from the round median; report median-of-medians, fixed
  ms (`2A−B`), slope (ns/px), and the projected phone ms = `realBufferMs × MULT` (**ESTIMATE**)

## Parity gate

Silhouette = `|pinned frame − gem-hidden frame| > 8` (`bgdiff`, asserted — never alpha/luma).
Rim = `dilate(S,2) \ erode(S,2)` over the union of both silhouettes. Floor pools hidden.

```
bbox %px >8/255 <= 0.05%   AND   bbox max delta <= 8   AND   rim %px >8/255 <= 2%
```

A control run (two fresh loads, same state) is always reported; if it uses >½ of any budget the
gate sets `reliable:false` and refuses to PASS.

## Score

* **perf / 40** — `40·clamp((50−p)/(50−16.67),0,1)`; needs ≥4 rounds measured, ≥3 kept,
  `estimate:true`; `spreadPct > 15` → ×0.9
* **parity / 30** — PASS 30; exactly one criterion missed 10; 2+ missed 0; unreliable 0; a noisy
  control caps at 10; `selfReferential` PASS caps at 10; a failed arm invariant = 0
* **stress / 30** — `30·(passed + 0.35·skipped)/total`
* **TOTAL** — sum, then `min(total, 40)` if any stress failure, parity not PASS, or an arm
  invariant failed
* **grade** — A ≥ 90, B ≥ 80, C ≥ 70, D ≥ 40, F < 40

## Known limitations

* **No low-end Android GPU here.** All ms are Apple M1 / Metal; the phone number is an ESTIMATE
  (`×7`), a ranking device, not a prediction.
* **CPU throttle 6 is not a phone CPU** and interacts badly with texture upload.
* **Visibility is emulated.** The shadow proves the app observes hidden/shown and does not wedge;
  it cannot reproduce a real background tab's rAF throttle.
* **One pose, one frame.** Per-frame effects (bloom history, pool repaint) are hidden, not
  measured; a facet change visible only at another pose is invisible to the gate.
* **Shared machine.** `spreadPct` shows the noise; it cannot detect a neighbour stealing GPU time.
* **A mount retry is a retry, not a fix.** If `stress.mountSkips` is non-empty the report says so;
  a build that cannot mount at all still shows up as skips, not passes.

## Failure evidence

Every stress case — pass or fail — writes `out/failures/stress-<id>.png` (page screenshot) and
`stress-<id>-canvas.png` (the rig's drawing buffer, rendered in the same task so it is not blank).
`stress.json` carries both paths, the console allowlist it was judged against, and any NEW console
errors verbatim.
