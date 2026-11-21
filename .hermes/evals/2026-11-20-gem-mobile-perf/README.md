# Eval — gem mobile performance (2026-11-20)

**Question.** Can the gem render at 60 fps on a low-end phone without changing its look?

**Short answer as of this record.** The trace loop is the cost. The dead-guard deletion and the mesh-entry path (opt-in `?gemmesh=1`) are landed and shipped; the candidate-scan table is **disproved by measurement and removed from the tree**, and the phone dpr ceiling is the shipped substitute for it. Five candidate cuts are measured dead ends. The remaining work is three named evals.

## Landed and shipped (2026-11-21)

| change | files | measured | parity |
|---|---|---|---|
| delete dead `abs(den) < 1e-6` guard in the bounce loop | `src/components/GemReward/gem-shader-ext.js` (−1 line) | **9.215 → 8.625 ms, −6.4%**, 4/4 clean paired randomized rounds, 24 samples, zero overlap | pixel-identical: bbox 0.000% >2/255, maxΔ 0 at dpr 2 and 3. **Kept**; the file's header comment was rewritten (the old CAND parity claim was false — see below) |
| mesh-entry path, **opt-in behind `?gemmesh=1`** (default = raymarch) | new `src/components/GemReward/gem-mesh.js` (97 lines) + `gem-mesh-entry.js` (11 lines), `gem-shader.js` (+2 lines: claim in `farside`, attach in `aim`), script tags in `gallery.html`/`index.html`/`pitch.html` | **8.73 → 7.90 ms, −9.5%**, 5/5 clean rounds | **NOT pixel-identical**: bbox >8/255 ≈ 2–4%, maxΔ 234–249, all on crown/table/girdle/pavilion crease lines; A-vs-A control 0.000%. Independent arm comparison: bbox >8/255 1.03%, maxΔ 243, rim >8/255 5.40%. **Ruled out as a default by E2** (girdle 19.3% >8) — landed behind `?gemmesh=1` only |

**Removed: candidate-scan scaffolding (`?gemcand=1`).** `src/components/GemReward/gem-cand.js`, `public/cand.bin` (16.7 MB), the CANDD/CANDO/CANDC splices and `parity()`/`STRIP` in `gem-shader-ext.js`, the `GEM_CAND.claim(...)` hook in `gem-shader.js`, and the `gem-cand.js` script tag in `gallery.html`/`index.html`/`pitch.html` are all deleted. Its "inert by construction: non-CAND GLSL sha256 == pre-edit" parity claim only compared the stripped source string with itself; it proved nothing about the program the GPU compiled, and the emitted shader had in fact changed. Default render verified byte-identical after removal (`gallery.html` sha256 `d518d65c…b9332b67`, `index.html` sha256 `4f720866…0dfc7d2`, 0.0000% >2/255, maxΔ 0, 1020×1440 raw buffer, A-vs-A control 0).

## Measured dead ends (do not retry)

| cut | result | why it fails |
|---|---|---|
| MSAA4 → 0 on the bloom scene target | −5.8% (0.49 ms) | **not safe**: 22% of silhouette pixels >8/255, maxΔ 127, concentrated on the rim at dpr 2 and 3 |
| GL background quad → canvas CSS | **+0.24% (noise)** | the quad was fill-cheap; the '15–22% background' hypothesis is falsified. Also failed the pixel gate (maxΔ 15–18) from browser image resampling |
| mesh + back-face facet prepass (replace bounce 0) | **+6.1% slower** (5/5 rounds) | structurally wrong surface: the prepass writes the **view-ray** back face, `tr()` needs the **refracted-ray** first exit; they agree on **0.01%** of rays (mean normal angle 106°). 11.75 MB target, +1 draw, +1 program |
| exact chain table (facet, direction) → next facet | 1.39 MB, **40.9% exact** | the exit facet is **not** a function of (facet, direction): only 22.6% of cells are start-point invariant. 128×64 → 256×128 buys +0.24 pp; the infinite-resolution ceiling is ~78%. Bake is correct; the premise is wrong |
| candidate-scan table (`?gemcand=1`), k=12 / k=32 | k=12 = **16.7 MB** table, **99.62%** of lookups still fall back to the full 170-plane scan; k=32 = **44.6 MB** and still falls back **64.9%**; not exact — **10 wrong facets in 1.55 M** lookups | the premise is dead, not the implementation. Over the **125,237** (facet,cell) pairs the real bounce chain reaches, the union of winning planes is **p50 22** and **43% of cells need >32**; the winner varies **~20 ways** across one facet's start points, so a candidate set would have to store most of the plane set to stay exact. A candidate set **cannot deliver the 8×**. Two implementation bugs made it worse: hop 2+ was keyed on the **entry** facet instead of the facet being skipped (wrong-but-winning candidate, no fallback → silent wrong pixel), and a 16384-wide R8 row exceeds `MAX_TEXTURE_SIZE` 8192 on most mobile GPUs (constant sample, again no fallback) |

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

**E1 — candidate-set table. ❌ CLOSED — measured dead, removed from the tree.** The bake was correct and the runtime plumbing was built, but the idea does not survive measurement: over the **125,237** (facet,cell) pairs the real bounce chain reaches, the union of winning planes is **p50 22 planes**, and **43% of cells need more than 32**. At k=12 the table falls back to the full 170-plane scan on **99.62%** of lookups, so it buys nothing, and it is still not exact — **10 wrong facets in 1.55 M** lookups. At k=32 it would be **44.6 MB** and still fall back **64.9%** of the time. The k=12 artifact on disk was **16.7 MB**. **Candidate sets cannot deliver the 8×: the winner varies ~20 ways across one facet's start points, so an exact table is most of the plane set and an approximate one falls back almost always.** Two lane-found bugs are recorded here so they are not rediscovered: hop 2+ was keyed on the entry facet instead of the facet the ray is leaving (wrong-but-winning candidate with no fallback → silent wrong pixel), and a 16384-wide R8 row exceeds `MAX_TEXTURE_SIZE` 8192 on most mobile GPUs (constant sample → silent wrong pixel). All code and the artifact are deleted; `?gemcand` no longer exists. Scratch: `gem-chain/` (bake/gate, convention + cutHash), `gem-cand/`, `gem-cand-rt/` (identity/poison tables, harnesses) — history only.

**E2 — look ruling on the mesh-entry path. ✅ RULED (see `## E2 ruling (mesh-entry crease)`).** It splits creases differently from the raymarch (bbox >8/255 2–4%, maxΔ ~243 on crease lines only, control 0.000%). This was a fidelity decision, not a perf one; the ruling is NOT ACCEPTABLE as a default and the path is now opt-in.

**E3 — phone render policy.** dpr cap is the largest single lever and is independent of the shader work: dpr 2 = −42.9% versus dpr 3 on the same build. A policy (dpr cap 2 or 1.5 + bloom internal scale on coarse pointers) needs look crops for the owner before it becomes a default. Bloom bandwidth at dpr 3 (`138 MB/frame`) means some cap is mandatory on G52/P22-class parts regardless of shader work.

**E4 — adversarial suite repair.** `scratch/rogue/` scores the build, but its first run returned 0/100 for harness reasons only: `readPixels` in a later CDP task on a non-preserved buffer reads blank; `src/ds/deck-lab.js:16` throws every 250 ms (pre-existing, arm-independent) so every clean-console gate fails; the hidden-tab case freezes rAF permanently; and parity re-arms its own baseline so it passes by construction. Required fixes: same-task render+read, an error allowlist derived from a control load, a non-freezing visibility case, baseline build identity + pool-hidden captures + mask-source assertion, and an arm-comparison mode (`?gemmesh=0` vs default vs `?gemmesh=1`) so changes are cross-diffed rather than judged against a stale baseline.

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

## Shipped (2026-11-21)

One commit on `main`. The default stone is **byte-identical** to `10390c2` on all three pages at dpr 3 and 2 (0.000000 % >2/255, maxΔ 0, sha256 equal; A-vs-A control 0) — that is the gate the `gem3d`/`gem-facets` one-context change had to pass, and it did. The WebGL1 arm is a **repair**: with webgl2 disabled the old tree logs three failures (context creation ×2, `'i' : Index expression` shader error) and draws nothing; this tree logs 0 of them, takes PLTEX, and the arm reads canvas mean 187.19 vs 187.21 WebGL2 — stress case i PASS.

| shipped | measured |
|---|---|
| **phone policy** `?gemphone=1\|1.5\|2` (`gem-perf.js` ceiling cap, incl. over a fixed `?gemdpr`; `gem-bloom.js` B 0.5×→0.25×, gain 1.6) | cap 1.5 = **2.8–3.4×** cheaper, cap 2 = **2.1×**, bloom **138 → 35 MB/frame**, halo **+45 %** area / **+70 %** peak. **`?gemphone=2` is ratio-wise a no-op on a default config** — the default ceiling is already `min(dpr,2)` |
| **Task 12** `content-visibility:auto; contain-intrinsic-size:auto 40px` on `.ig-cell` | gallery 390×844 dpr 3 / 1440×900 dpr 2: document height Δ **0.0000 %**, **114 of 5.9 M** px at ≤1/255, LayoutDuration −7.8/−5.8 ms — **inside the ±40 % noise floor** measured where the change cannot apply. Landed, provably harmless, **not a win** |
| **CAND removal** + WebGL1 repair + `?gemmesh` tags on all three pages | default render still identical (§ above). CAND stays dead for the measured reason: p50 **22** planes / 43 % of cells >32, k=12 falls back **99.62 %**, k=32 (44.6 MB) **64.9 %**, 10 wrong facets in 1.55 M |

**Rogue suite, honestly:** 37/100 (F) on a clean pinned tree with perf deferred, 9/10 stress, parity PASS at 0.000 %/maxΔ 0. The earlier 0/100 **and** the 100/100 before it were both **harness rot** — same-task `readPixels`, the `deck-lab.js:16` 250 ms throw, the frozen-rAF hidden case, self-re-armed baseline. 37 is the earned number; it is a baseline, not a pass.

**Gates:** `npm run lint:tokens` exit 0 · `npx vite build --mode production` exit 0 · `npm test` exit **1** on one assertion only — `✗ verify:atlas — stale: src/components/GemReward, index.html changed since manifest; run \`npm run gen:atlas\`` — which is **pre-existing and mtime-based** (fails identically in a pristine `10390c2` worktree for 45 paths, and cannot pass on any fresh checkout). Not regenerated: that would stamp unrelated mtimes into this commit.

Plan record: `## Gate · rev 7 — post-close ship (2026-11-21) {#rev-7}` in `.hermes/plans/2026-11-16_225300-mobile-perf-parity.md`. Harness: `.hermes/cache/scratch/gem-default-parity/`.

## State

Working tree at the time of this lane (now committed — see § Shipped): `gem-shader-ext.js` (CAND splices + `parity()`/`STRIP` removed, header comment corrected, dead-guard deletion kept), `gem-shader.js` (CAND claim removed), `gallery.html`/`index.html`/`pitch.html` (cand tag removed; mesh-entry + mesh tags added to index and pitch so `?gemmesh=1` means the same thing on all three pages), deleted `gem-cand.js` and `public/cand.bin`. Also present but not this lane: `gem-bloom.js`/`gem-perf.js` (phone policy, `?gemphone`), `src/ds/gallery-chrome.css`, and regenerated `src/js/mechanics/graphData*.js`.

Gates after the removal: `npm run lint:tokens` exit 0; `npx vite build --mode production` exit 0; default load on `gallery.html` and `index.html` byte-identical to a pristine `10390c2` worktree (0.0000% of pixels >2/255, maxΔ 0, 1020×1440 raw buffer at dpr 3, pinned pose, floors hidden, A-vs-A control 0). Harness: `.hermes/cache/scratch/cand-removal/` (`capture.mjs`, `shots/capture.json`). At ship the same identity was re-proved on all three pages at dpr 3 **and** 2 with `pitch.html` added (`.hermes/cache/scratch/gem-default-parity/`), `npm test` exited 1 on the pre-existing mtime-based `verify:atlas` check only.
