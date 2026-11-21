# Eval — gem mobile performance (2026-11-20)

**Question.** Can the gem render at 60 fps on a low-end phone without changing its look?

**Short answer as of this record.** The trace loop is the cost. Two changes are landed and measured (uncommitted), four candidate cuts are measured dead ends, and the remaining work is four named evals. No change is committed. The look question on the mesh-entry path is now ruled (E2, below): **not acceptable as a default**, so it ships opt-in behind `?gemmesh=1` and the default is the raymarch.

## Landed (uncommitted, in the working tree)

| change | files | measured | parity |
|---|---|---|---|
| delete dead `abs(den) < 1e-6` guard in the bounce loop | `src/components/GemReward/gem-shader-ext.js` (−1 line) | **9.215 → 8.625 ms, −6.4%**, 4/4 clean paired randomized rounds, 24 samples, zero overlap | pixel-identical: bbox 0.000% >2/255, maxΔ 0 at dpr 2 and 3 |
| mesh-entry path, **opt-in behind `?gemmesh=1`** (default = raymarch) | new `src/components/GemReward/gem-mesh.js` (99 lines), `gem-shader.js` (+2 lines: claim in `farside`, attach in `aim`), `gallery.html` (script tag) | **8.73 → 7.90 ms, −9.5%**, 5/5 clean rounds | **NOT pixel-identical**: bbox >8/255 ≈ 2–4%, maxΔ 234–249, all on crown/table/girdle/pavilion crease lines; A-vs-A control 0.000%. Independent arm comparison: bbox >8/255 1.03%, maxΔ 243, rim >8/255 5.40%. **Ruled out as a default by E2** (girdle 19.3% >8) — landed behind `?gemmesh=1` only |
| CAND candidate-scan scaffolding, default OFF (`?gemcand=1`) | new `src/components/GemReward/gem-cand.js` (71 lines), CAND block in `gem-shader-ext.js`, `gem-shader.js` claim, script tags in `gallery.html`/`index.html`/`pitch.html` | identity k=170 table = **bitwise identical** (0.000%, maxΔ 0, dpr 2+3, 2 poses); poisoned table = 13.04% / maxΔ 249 (proves it reads); overhead at k=170 **+75%** (expected) | inert by construction: non-CAND GLSL sha256 == pre-edit; 404 → no defines, identical pixels, no error |

**Blocking defect in the CAND path:** `tr()` takes `int ei = int(E.y)`; the mesh-entry path emits `E.y = -1`, so on that arm CAND falls back to the full 170-plane scan. CAND engages normally on the default raymarch path and does not engage when `?gemmesh=1` is set. Fix is a one-line-class change in `gem-mesh.js` (`mapTris().tp` already holds the plane index) and was in flight when this record was written.

## Measured dead ends (do not retry)

| cut | result | why it fails |
|---|---|---|
| MSAA4 → 0 on the bloom scene target | −5.8% (0.49 ms) | **not safe**: 22% of silhouette pixels >8/255, maxΔ 127, concentrated on the rim at dpr 2 and 3 |
| GL background quad → canvas CSS | **+0.24% (noise)** | the quad was fill-cheap; the '15–22% background' hypothesis is falsified. Also failed the pixel gate (maxΔ 15–18) from browser image resampling |
| mesh + back-face facet prepass (replace bounce 0) | **+6.1% slower** (5/5 rounds) | structurally wrong surface: the prepass writes the **view-ray** back face, `tr()` needs the **refracted-ray** first exit; they agree on **0.01%** of rays (mean normal angle 106°). 11.75 MB target, +1 draw, +1 program |
| exact chain table (facet, direction) → next facet | 1.39 MB, **40.9% exact** | the exit facet is **not** a function of (facet, direction): only 22.6% of cells are start-point invariant. 128×64 → 256×128 buys +0.24 pp; the infinite-resolution ceiling is ~78%. Bake is correct; the premise is wrong |

## Cost model (what the phone actually costs)

Baseline measurement: **11.2 ms @ 1.46 MP** on an Apple M1 (ANGLE/Metal), taps 3 / bounce 5 / bloom on. Cost is pure fill (slope 6.0–7.3 ns/px, `fixedMs ≈ 0` at dpr 3). Fragment work ≈ 170 entry tests + 170 CORE rescans + 3 taps × 5 bounces × 170 = **~2 890 plane tests per pixel**.

ESTIMATES (×7 proxy and the cited-spec model, see `.hermes/cache/scratch/hw-model/model.json`; **no low-end Android GPU is reachable from this machine**):

| GPU class | dpr 3 (1.46 MP) | dpr 2 | dpr 1.5 |
|---|---|---|---|
| Mali-G52 MC2 (Helio G85) | ~332 ms | ~148 ms | ~83 ms |
| Adreno 610 (SD665) | ~136 ms | ~60 ms | ~34 ms |
| Adreno 619 (SD695) | ~80 ms | ~35 ms | ~20 ms |
| PowerVR GE8320 (Helio P22) | ~756 ms | ~336 ms | ~189 ms |

Bandwidth is a second wall: the bloom chain at dpr 3 moves ~138 MB/frame (8.3 GB/s at 60 fps) — more than half of a Helio P22's total bandwidth. Ship target from the model: **≈400 plane-tests per fragment at dpr 1.0–1.5**.

## Left as evals

**E1 — candidate-set table + ei wiring (the main one).** Bake a *superset* table: per (entry facet, direction cell) the planes that can win for **any** start point on that facet (union over start points, not the answer). Measured grounding: union over n=16/32/64 start points gives exact rates 94.3 / 97.6 / 99.04% with p50 4, p95 10, max 23 candidates — 4–23 exact tests instead of 170. Requirements: 0 misses on ≥10^7 random trials (accept a verified safety margin instead of a proven arrangement if necessary), fallback to the full scan on any miss, table ≤ 1.4 MB, and the `ei` fix in `gem-mesh.js` so the path engages on the default. Runtime and shader plumbing are **already built and proven inert** (`gem-cand.js` + CAND block, identity table byte-identical). Scratch: `gem-chain/` (bake/gate, convention + cutHash), `gem-cand/`, `gem-cand-rt/` (identity/poison tables, harnesses).

**E2 — look ruling on the mesh-entry path. ✅ RULED (see `## E2 ruling (mesh-entry crease)`).** It splits creases differently from the raymarch (bbox >8/255 2–4%, maxΔ ~243 on crease lines only, control 0.000%). This was a fidelity decision, not a perf one; the ruling is NOT ACCEPTABLE as a default and the path is now opt-in.

**E3 — phone render policy.** dpr cap is the largest single lever and is independent of the shader work: dpr 2 = −42.9% versus dpr 3 on the same build. A policy (dpr cap 2 or 1.5 + bloom internal scale on coarse pointers) needs look crops for the owner before it becomes a default. Bloom bandwidth at dpr 3 (`138 MB/frame`) means some cap is mandatory on G52/P22-class parts regardless of shader work.

**E4 — adversarial suite repair.** `scratch/rogue/` scores the build, but its first run returned 0/100 for harness reasons only: `readPixels` in a later CDP task on a non-preserved buffer reads blank; `src/ds/deck-lab.js:16` throws every 250 ms (pre-existing, arm-independent) so every clean-console gate fails; the hidden-tab case freezes rAF permanently; and parity re-arms its own baseline so it passes by construction. Required fixes: same-task render+read, an error allowlist derived from a control load, a non-freezing visibility case, baseline build identity + pool-hidden captures + mask-source assertion, and an arm-comparison mode (`?gemmesh=0` vs default vs `?gemcand=1`) so changes are cross-diffed rather than judged against a stale baseline.

**E5 — device falsification.** No Adreno/Mali/PowerVR is reachable here. The model's own smoke tests: one Adreno 610 at dpr 1.5 (model says ~34 ms; falsified outside 17–68 ms), a dpr 1.5 → 3.0 scaling check (expect ~4×; 1.5–2× means not fill-bound), taps 3 → 1 (expect ≈−67% of the gem pass), bloom on/off at dpr 3 (expect 15–25%). Capture per run: frame ms p50/p95 from `EXT_disjoint_timer_query_webgl2` per pass, `GL_RENDERER`/`GL_VENDOR`, canvas.width/height, dpr, taps, bounce, bloom flag, timer-query disjoint flag.

## E2 ruling (mesh-entry crease)

**Verdict: NOT ACCEPTABLE as default.** The mesh-entry path measured −9.5% frame time, but it does not look the same as the raymarch, and the difference is concentrated exactly where the eye reads the cut. It is now **OPT-IN via `?gemmesh=1`**; the default (no param) is the raymarch entry.

Measured at one pinned pose (`rig.t=0`, `group.position.y=0`, `rotation(-0.15,0,0)`, sapphire ceremony rig, dpr 3, 1020×1440 raw drawing buffer, pixel = max channel Δ):

| region (% >8/255 vs raymarch) | value |
|---|---|
| crown | **3.555%** |
| **girdle** | **19.255%** (mean 7.839) |
| pavilion | 1.585% |
| bounding box | **2.400%**, maxΔ **243** |
| A-vs-A control | **0.000%**, maxΔ 2 |

**Localisation.** The delta is a crease artefact, not a global tone shift: **73.8% of the >8 pixels sit within 1 px**, 88.0% within 2 px and 99.0% within 6 px of a facet-plane boundary. The girdle is worst because that band is where the 0.9935 neighbour-normal blend has the most edges per pixel — the mesh path's interpolated `vN + aNb*` picks a different runner-up plane, so the blend lands on the other side of the crease and the facet split moves by ~1 px.

**dpr sheet.** The girdle band measures **34 rows at dpr 3 vs 23 at dpr 2**, and the dpr 2 arm reads visibly blockier — the crease shift is not a dpr artefact and does not disappear at a lower buffer; it just gets coarser. A dpr cap is therefore not a mitigation for it.

**Status after the flip.** Gate is `api.on = () => qv('gemmesh') === '1'` in `gem-mesh.js` — only an explicit `?gemmesh=1` claims the material; every other URL (including `?gemmesh=0`) keeps the untouched `ent()` plane scan. Re-verified from the raw buffer after the change: default vs `?gemmesh=0` = **0 of 1,468,800 px differ, maxΔ 0** (A-vs-A control also 0), `renderer.info.programs.length` 8 → 8 on both frames, and `?gemmesh=1` still renders the stone (`GEM_MESH.stats().mode === 'mesh'`, non-blank).

Sheets: `/Users/irfan/.hermes/cache/scratch/crease-look/shots/crease-sheet.png` (raymarch / mesh / ×8 diff / control, plus the dpr 2-vs-3 pair) and `/Users/irfan/.hermes/cache/scratch/crease-look/shots/crease-sheet@3x.png` (3× zoom on the girdle). Post-flip re-verification harness: `.hermes/cache/scratch/crease-verify/` (`verify.mjs`, `shots/capture.json`, `shots/diff.json`) — it hides the floor pools (`rig.floors.{shadow,contact,caustic,ground}`), which are the only cross-load noise source (they alone contribute up to maxΔ 8).

## Method notes (hard-won, keep)

- Rank cost by the **two-size slope** (ns/px), never by render throughput at one buffer.
- Headless rAF cadence is quantised (16.7/33.3/66.7 ms) — use it as liveness only.
- This machine is shared: paired randomized A/B rounds, discard whole rounds whose base drifts >20%, report median-of-medians. Same state measured 8.5 ms and 17–21 ms minutes apart.
- Capture pixels from the raw drawing buffer (`toDataURL` right after render), not page screenshots — the rig's CSS box jitters 339 vs 340 px between loads.
- Pin `rig.t = 0` **and** `group.position.y = 0`; the idle bob otherwise moves geometry between arms. Hide the traced caustic pool in any diff: it repaints at timing-dependent moments and fakes ~4.6% deltas.

## State

Working tree (uncommitted): `gem-shader-ext.js`, `gem-shader.js`, `gallery.html`, `index.html`, `pitch.html`, new `gem-mesh.js`, new `gem-cand.js`; plus unrelated pre-existing edits in `design-system/changelog-manifest.json`, `design-system/plan-history.json`, `.hermes/plans/2026-11-16_225300-mobile-perf-parity.md` and regenerated `src/js/mechanics/graphData*.js`. Nothing committed.
