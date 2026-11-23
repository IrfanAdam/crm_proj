# Lane F2 — C1a + C3 on the ceremony path: both gated, both reverted

Repo `/Users/irfan/Documents/Portfolio Redo/crm_proj` @ `f350e75` + lane F's C0 (`gem3d.js`, 1 line).
Method: `.hermes/evals/2026-11-23-gem-render-audit/lane-D-method.md` §3 rows **C1a**, **C3**.
Probe: `/Users/irfan/.hermes/cache/scratch/gem-c1a-c3/probe.mjs` (headless Chrome, CDP, `--use-angle=metal`, ANGLE/Metal M1 Max, `EXT_disjoint_timer_query_webgl2`).
Raw evidence: `.../gem-c1a-c3/out/{cap-base,gate-c1aA,gate-c1aB,gate-c3,timer-b2,timer-b3,timer-c3,scan-s1}.json` + the `.bin` frames.

## Verdict

| row | implemented | pixel gate | kept? |
|---|---|---|---|
| **C1a** as specified — drop `target.depthTexture`, 9 depth fetches → uniform gate | yes (2 lines + shader) | **fails hard**: 56.99–57.80 % of channels move, max Δ 48/255, bloom energy ×13.0 | **reverted** |
| **C1a′** nearest honest form — 9 depth fetches → **1 hoisted** fetch | yes | **fails**: 0.78–0.85 % of channels, 0.69–0.74 % of pixels >1/255, max Δ 28–30 | **reverted** |
| **C3** — 4 bilinear taps on the ±2-texel grid replacing the 9 gaussian taps | yes (1 shader line) | outside the glow band: **0.0001–0.0029 % > 2/255** (1 / 25 / 37 px, max Δ 3–4) · inside the band max Δ 29–40, glow area +4.7…+17.3 % | **reverted — no measurable gain, and the glow broadened** |

**Both rows fail. Working tree is byte-clean for `src/components/GemReward/`** (`git diff` = lane F's 1-line C0 in `gem3d.js` only).

The headline is not "two edits failed" — it is that **C1a's premise is inverted** and **C3's premise is mispriced**, both measured below (§1, §3). Neither is a tuning miss.

---

## 1. C1a — the depth gate is load-bearing, not inert

The design says: *"bit-identical in bare ceremony mode — the gate is `1−smoothstep(.999,.9999,depth)`, inert wherever an opaque backdrop writes depth."*

Measured, that sentence is backwards. Probe `depth2.mjs`: particle-render the gate term itself out of `target.depthTexture` in the same task and count it.

| region | gate `m` | pixels |
|---|---|---|
| stone (geometry, `depth < 0.999`) | **1** | 39 636 / 163 200 = **24.29 %** |
| every border / corner sample, stage | **0** | 6 / 6 sampled corners |
| frame | | 163 200 px at 340×480 |

The backdrop writing depth at ≈1.0 is *exactly what makes the gate 0 over the whole stage* — that is the whole reason the bright white stage does not bloom (`gem-bloom.js:7-8`). A uniform gate therefore blooms the stage, which is the feature.

### Gate table

Baseline = raw drawing buffer, same-task render + `readPixels`, rAF parked (`rig.vis=false`, `t=tilt=0`), floor pools (`shadow contact caustic ground base`) hidden, camera and buffer pinned canonically, **1020×1440 @3** (340×480 CSS × 3, the closest reachable proxy to the owner's 1026×1434).

| pose | baseline sha | C1a uniform gate: % ch > 0 / max Δ / sha | C1a′ 1 fetch: % ch > 0 / px > 1/255 / max Δ |
|---|---|---|---|
| P1 (−0.15, 0.0) | `d518d65c452ffc6b` | 56.99 % / **48** / differs | 0.848 % / 0.743 % / **28** |
| P2 (0.22, 0.9) | `0784fe76003b8954` | 57.80 % / **48** / differs | 0.780 % / 0.687 % / **30** |
| PG glow-heavy (0.4, 0.0) | `cabfa80d08012c2b` | 56.40 % / **48** / differs | 0.853 % / 0.736 % / **28** |

Bloom energy read straight from target B (RGBA8, 510×720): P1 5.60 M → **454.9 M**, P2 13.53 M → **469.6 M**, PG 37.18 M → **481.5 M**. A uniform gate makes the stage bloom and the three poses converge on one saturated value — the glow stops being a property of the stone.

C1a′ (one `texture2D(tDepth, vUv)` hoisted out of the loop, per-tap fetch deleted) is the cheapest *correct-shaped* version: 0.69–0.74 % of pixels move, max Δ 28–30, and **0.44–0.58 % of the frame is > 2/255 outside the glow band**. That is a thin bright rim where the blur's outer taps used to be gated off over the silhouette.

**No timing was taken for either** — a measurement of an image that fails its gate by 57 % of the frame is not a datum. The design's C1a price (bloom 13.8 → 9.6 ms) stays **unverified**; note it is also the wrong shape of saving at this buffer (§3).

---

## 2. C3 — the 4-tap half-res blur: gate essentially met, gain not there, glow broadened

Implementation (1 line, `gem-bloom-ext.js:9`): `for(int i=-1;i<=1;i++)` + gaussian weight → `for(int i=-1;i<=1;i+=2)` with `g = 1.0`, so the 9 taps become **4 bilinear taps at (±1, ±1)·texel** — each fetching a 2×2 A texel block, 16 A texels for 4 fetches, on the same ±2-texel (B) grid. The depth gate is kept **per-tap** so this row measures the blur change only (C1a already refuted the gate idea).

Band definition (stated because it decides the result): glow = pixels where the baseline bloom contribution (bloom-on minus bloom-off, same task) is **≥ 4/255**, dilated **±12 px**. That band is 6.9 % / 8.4 % / 14.5 % of the frame. A band built from *any* nonzero bloom difference covers 99.4 % of the frame and would make the gate vacuous — so the 4/255 floor is the honest one.

| pose | band px | outside band: % > 2/255 | outside max Δ | inside band: % > 2/255 | inside max Δ |
|---|---|---|---|---|---|
| P1 | 100 900 | **0.000073 %** (1 px) | 3 | 19.99 % | 29 |
| P2 | 123 564 | **0.001858 %** (25 px) | 4 | 21.95 % | 38 |
| PG | 212 384 | **0.002945 %** (37 px) | 4 | 23.66 % | 40 |

Widening the band to ±16 px does not clear it (P2 9 px, PG 25 px) — the ≤4/255 outliers are the *faint outer fringe* (bloom contribution 1–3 LSB) that the band's 4/255 floor excludes, not a spatial leak.

**What visibly changed — not a comb, a broader glow:**

| pose | glow area ≥4/255 | glow area ≥8/255 | bbox | centroid | total bloom energy |
|---|---|---|---|---|---|
| P1 | +11.6 % | **+17.3 %** | 941×611 → 941×612 | 495.3,850.9 → 491.9,851.3 | −2.0 % |
| P2 | +8.4 % | **+14.6 %** | 893×465 → 898×468 | 573.0,827.5 → 572.5,829.1 | −1.1 % |
| PG | +4.7 % | **+6.6 %** | 883×447 → 885×448 | 555.3,799.8 → 555.1,801.9 | −0.4 % |

The design predicted the glow would *lose* a blocky comb. What it does is **gain 5–17 % of mid-fringe area** (the 4 bilinear taps cover 16 A texels against the 9-tap's 9, so the kernel is ~1 texel wider and flat-weighted), bbox +0…5 px, centroid ≤2 px, total energy within 2 %. Same shape, slightly more of it — max Δ 40 inside the glow is the comb being replaced by a stronger fringe.

---

## 3. Measurement — `?gemtimer=1`, 3 runs/config, median of the run p50s

`gemdpr` pinned so the perf controller cannot re-ratio mid-run. A/B/A on the untouched tree (two independent baseline sessions b2, b3) because the first baseline alone would have credited C3 with 6 % that no edit caused.

| ratio | pass | base b2 (p50/p95) | base b3 (p50/p95) | C3 (p50/p95) | Δ p50 vs b2 / b3 |
|---|---|---|---|---|---|
| 3 | gem | 18.80 / 58.54 | 16.30 / 52.25 | 17.61 / 46.95 | — (untouched) |
| 3 | **bloom** | 11.83 / 19.79 | 11.42 / 20.88 | **11.19** / 18.74 | **−0.64 / −0.23** |
| 3 | comp | 11.11 / 19.64 | 10.31 / 18.66 | 10.45 / 18.08 | — (untouched) |
| 3 | sum | 41.74 | 38.03 | 39.25 | −2.49 / +1.22 |
| 2 | **bloom** | 7.17 / 13.45 | 6.23 / 13.44 | **6.26** / 11.33 | −0.91 / **+0.03** |
| 2 | sum | 21.59 | 23.86 | 20.19 | — |

Read it this way:

- **The bloom pass is unmoved.** 11.19 vs 11.42–11.83 at ratio 3 and 6.26 vs 6.23 at ratio 2. The untouched `gem` pass alone spanned **16.30–18.80 ms (−13 %)** across the three sessions, so a 0.2–0.6 ms bloom delta is inside the noise, and the ratio-2 row says zero.
- **The design's C3 price (13.8 → 4.6 ms) is not reproducible, and the reason is structural**: the pass is **traffic-bound, not tap-bound**. It reads a 1020×1440 RGBA16F **MSAA-4** target A (≈94 MB uncompressed; 4-sample colour + depth) and writes 510×720. Nine ALU taps on a quarter-res grid were never the 11 ms.
- Same reading applies to C1a: dropping the depth *texture* removes a resolve of a 1020×1440 depth buffer, which is a real (unpriced here) traffic saving — but it cannot be taken, because the per-pixel gate it feeds is what confines the bloom to the stone. The saving and the image are the same object.
- Frame p50 from the probe is rAF-quantised in headless and is not usable; the pass sum is the frame proxy (as lane B/F).

---

## 4. Repo gate

| gate | result |
|---|---|
| `npm run lint:tokens` | **exit 0** — `✓ 0 raw leaks, 0 over-limit (1882 files)` (the sibling lane's `opps-home.js` budget failure is fixed in the tree as of this run; `gem-bloom.js` 91→91 lines, `gem-bloom-ext.js` 20→20, no budget pressure) |
| `npx vite build --mode production` | **exit 0**, `✓ built in 1.69s` |
| repo gem probe `.hermes/evals/2026-11-20-gem-mobile-perf/tools/device-probe/harness/smoke.mjs` (BASE → :5428) | **passes** — HUD appears, `GEM_TIMER.json()` populated (`gem 6.96 / 29.65 ms n76`, `1017x1440 @3.00`), inert without the param (`hud:false, timerGlobal:false`) |
| `git diff src/components/GemReward/` | **`gem3d.js` only** (lane F's C0). C1a, C1a′ and C3 all reverted byte-clean — `git checkout --` on `gem-bloom.js` + `gem-bloom-ext.js` |

## 5. What the next lane should know

1. **C1a cannot be taken as written, on any surface.** The depth gate's ON fraction is 24.3 % of the frame (the stone) and 0 everywhere else; that asymmetry *is* the highlight-only bloom. Any depth-free gate must reproduce a per-pixel silhouette mask from something else — that is a new target (an R8 coverage/mask pass, i.e. C2's deliverable), not a uniform. Do not re-price C1a as free traffic.
2. **C3's 13.8 → 4.6 ms is a mispricing, not a miss.** Bloom at this buffer is A's traffic. If the bloom pass is to fall, the lever is **C6 (RGBA8 target A)** and **C7 (fuse the blur into the composite)**, both of which remove target/pass traffic; tap count is worth ≤0.6 ms and possibly 0.
3. **Gate band definition decides C3's verdict.** With "any nonzero bloom difference" the band is 99.4 % of the frame and C3 passes trivially; with the ≥4/255 floor it is 7–15 % and C3's residual is 1–37 px at Δ ≤ 4 — plus a measured **+5…17 %** growth in mid-fringe glow area. Report the band's threshold and its coverage whenever this gate is quoted.
4. **The ceremony buffer is not 1179×2556.** `?gemdpr=3` on a 340×480 CSS canvas gives **1020×1440**; the default cap is ×2 → 680×960. Every ms above is at 1020×1440 unless the row says ratio 2.
