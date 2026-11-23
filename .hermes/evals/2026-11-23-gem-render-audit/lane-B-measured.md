# Lane B — measured sensitivity report (gem renderer)

All numbers below are marked **measured M1 headless** = `EXT_disjoint_timer_query_webgl2` p50 of per-pass GPU time on
ANGLE Metal / Apple M1 Max, headless Chrome (`--headless=new`, `--use-angle=metal`), Vite dev server on :5423.
No projected number is presented as measured; the two places a model is used are labelled **projected**.

Protocol for every point in the matrix:

- fixed viewport **393x852 CSS @ dpr 3**, pose pinned (`rotX -0.15, rotY 0, posY 0`, rAF cancelled), floor pools
  `shadow/contact/caustic` hidden, single draw call, `programs=8`, `calls=1`, `triangles=2`.
- **one frame in flight** (`paced-1-in-flight`): render → sleep ≈ last measured frame total → render.
  This matters: the same config measured unpaced (`card.jsonl`, `card2.jsonl`, `fs.jsonl`) reads 2–4x higher
  because the CPU queues frames ahead of ANGLE's endQuery timestamp. Unpaced records were **excluded** from the fits.
- every retained record has `disjoint=false`, `modes=gpu`, gem-pass `n >= 59` (threshold was 30).
- `totalP50 = gem.p50 + bloom.p50 + comp.p50`. With bloom **off** only the gem pass runs, so `total = gem` and the
  bloom/comp cells are structurally 0 — not missing data.
- "ratio" is `renderer.getPixelRatio()` as set by `?gemdpr=<r>`; buffer px = `canvas.width*canvas.height`.

Raw data: `lane-B-raw-gap.jsonl` (the new gap run), `lane-B-raw-points.json` (deduplicated matrix),
`lane-B-raw-analysis.json` (every fit below).
Source JSONL: `/Users/irfan/.hermes/cache/scratch/gem-prof/{pc,pf,pf2}.jsonl` + `/Users/irfan/.hermes/cache/scratch/gem-prof2/gap.jsonl`.

---

## 0. Gap fill (the only new measurements in this lane)

Requested gaps: ratio **0.5 / 1 / 1.5**, taps 3, bounce 5, bloom on, card surface, 3 repeats each.
Run 2026-11-23 ~09:20Z, 45 frames/point, `?gemtimer=1&gemdpr=<r>`, one frame in flight.
**No point was skipped**; 9/9 samples retained, `n = 59–60`, `disjoint = false`.

| ratio | buffer | px | gem p50 | bloom p50 | comp p50 | total p50 | n | disjoint |
|---|---|---|---|---|---|---|---|---|
| 0.5 | 139x61 | 8479 | 3.70 | 3.52 | 3.23 | 10.45 | 59 | false |
| 0.5 | 139x61 | 8479 | 3.73 | 3.52 | 3.25 | 10.50 | 59 | false |
| 0.5 | 139x61 | 8479 | 3.71 | 3.51 | 3.44 | 10.66 | 59 | false |
| 1 | 279x122 | 34038 | 4.54 | 3.89 | 3.06 | 11.49 | 60 | false |
| 1 | 279x122 | 34038 | 4.21 | 3.53 | 3.11 | 10.85 | 59 | false |
| 1 | 279x122 | 34038 | 4.30 | 3.80 | 3.00 | 11.10 | 59 | false |
| 1.5 | 418x183 | 76494 | 4.88 | 4.28 | 3.50 | 12.66 | 60 | false |
| 1.5 | 418x183 | 76494 | 6.26 | 5.94 | 5.17 | 17.37 | 59 | false |
| 1.5 | 418x183 | 76494 | 5.82 | 4.92 | 4.29 | 15.03 | 60 | false |

Medians: **10.50 / 11.10 / 15.03 ms** at 8.5k / 34k / 76k px.
Session note: the 0.5 point is ~11% higher than the earlier `pc.jsonl` run (9.43 ms, 16 min earlier), and the 1.5 point
has a 4.7 ms spread (12.66–17.37). This is genuine headless-GPU session drift, not a config difference; both sources are
pooled below and the single-session variant of the slope is reported alongside for robustness.

---

## 1. Deduplicated point matrix (weighted median of per-burst p50)

24 config points from 129 valid paced records. `rec` = number of burst records behind the median.

| surf | ratio | taps | bounce | bloom | buffer | px | gem | bloom | comp | total | total p95 | rec |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| card | 0.5 | 3 | 5 | off | 139x61 | 8479 | 2.06 | 0.00 | 0.00 | 2.06 | 3.75 | 4 |
| card | 1 | 3 | 5 | off | 279x122 | 34038 | 2.71 | 0.00 | 0.00 | 2.71 | 4.96 | 4 |
| card | 1.5 | 3 | 5 | off | 418x183 | 76494 | 2.94 | 0.00 | 0.00 | 2.94 | 5.75 | 4 |
| card | 2 | 3 | 5 | off | 558x244 | 136152 | 5.58 | 0.00 | 0.00 | 5.58 | 8.72 | 4 |
| card | 3 | 3 | 5 | off | 837x366 | 306342 | 6.70 | 0.00 | 0.00 | 6.70 | 13.14 | 4 |
| card | 0.5 | 3 | 5 | on | 139x61 | 8479 | 3.68 | 3.51 | 3.23 | 10.45 | 12.75 | 7 |
| card | 1 | 3 | 5 | on | 279x122 | 34038 | 4.30 | 3.80 | 3.00 | 11.10 | 16.53 | 7 |
| card | 1.5 | 3 | 5 | on | 418x183 | 76494 | 5.40 | 4.87 | 4.24 | 14.51 | 22.01 | 7 |
| card | 2 | 1 | 5 | on | 558x244 | 136152 | 3.30 | 2.96 | 2.55 | 8.81 | 11.52 | 4 |
| card | 2 | 2 | 5 | on | 558x244 | 136152 | 5.85 | 5.11 | 4.18 | 15.01 | 23.50 | 4 |
| card | 2 | 3 | 1 | on | 558x244 | 136152 | 2.99 | 2.42 | 1.95 | 7.34 | 10.78 | 4 |
| card | 2 | 3 | 3 | on | 558x244 | 136152 | 3.73 | 3.60 | 3.17 | 10.54 | 24.68 | 4 |
| card | 2 | 3 | 5 | on | 558x244 | 136152 | 5.86 | 5.52 | 4.19 | 15.37 | 24.50 | 4 |
| card | 3 | 3 | 5 | on | 837x366 | 306342 | 6.48 | 5.70 | 5.14 | 17.31 | 35.53 | 4 |
| fullscreen | 0.5 | 3 | 5 | off | 170x240 | 41040 | 3.88 | 0.00 | 0.00 | 3.88 | 4.94 | 4 |
| fullscreen | 1 | 3 | 5 | off | 343x480 | 164640 | 5.53 | 0.00 | 0.00 | 5.53 | 9.47 | 4 |
| fullscreen | 1.5 | 3 | 5 | off | 513x720 | 370080 | 6.92 | 0.00 | 0.00 | 6.92 | 11.30 | 4 |
| fullscreen | 2 | 3 | 5 | off | 684x960 | 658560 | 6.91 | 0.00 | 0.00 | 6.91 | 13.28 | 8 |
| fullscreen | 3 | 3 | 5 | off | 1026x1437 | 1481760 | 9.29 | 0.00 | 0.00 | 9.29 | 17.72 | 8 |
| fullscreen | 0.5 | 3 | 5 | on | 170x240 | 41040 | 4.02 | 3.42 | 2.88 | 10.19 | 15.80 | 4 |
| fullscreen | 1 | 3 | 5 | on | 342x480 | 164640 | 6.71 | 5.97 | 4.79 | 17.42 | 27.76 | 8 |
| fullscreen | 1.5 | 3 | 5 | on | 513x720 | 370080 | 7.60 | 6.66 | 5.69 | 20.05 | 33.20 | 8 |
| fullscreen | 2 | 3 | 5 | on | 684x960 | 658560 | 10.11 | 9.29 | 8.04 | 27.52 | 45.81 | 8 |
| fullscreen | 3 | 3 | 5 | on | 1026x1434 | 1481760 | 14.71 | 13.78 | 13.14 | 41.43 | 70.50 | 8 |

Cross-check (not in the fits): 8 `cpu=6`-throttled records on the same card configs read +7% at r2 and +18% at r3
(median 16.54 / 20.43 ms), i.e. CPU throttling alone can inflate a "GPU" number by up to a fifth if queue depth is not
controlled — which is exactly what the paced protocol prevents.

Frame rates implied at the shipped settings (**measured**): card r2 = 65.1 fps (p95 15.4), card r3 = 57.8 fps,
fullscreen r2 = 36.3 fps (p95 27.5), fullscreen r3 = 24.1 fps (p95 14.2 fps).

---

## 2. (a) Log–log slope of total ms vs buffer pixels

Model `total = A * px^s`, OLS in log–log space. Bloom on, taps 3 / bounce 5.

| surface | points | slope s | se | R² | adj R² | A | linear a (ms) | linear b (ns/px) |
|---|---|---|---|---|---|---|---|---|
| card (pooled) | 5 | **0.152** | 0.026 | 0.921 | 0.892 | 2.54 | **11.25** (t 12.3) | **22.2 ± 6.0** (t 3.7) |
| card (pc.jsonl only, single session) | 5 | 0.209 | — | 0.942 | — | 1.35 | — | — |
| fullscreen | 5 | **0.377** | 0.033 | **0.978** | 0.970 | 0.181 | **12.26** (t 8.1) | **20.4 ± 2.0** (t 10.1) |

Per-pass slopes (fullscreen, bloom on): gem **0.348**, bloom **0.373**, comp **0.407**. All three passes have
essentially the same scaling exponent — consistent with the static audit: the bloom chain costs full-res pixels, it does
not add ALU.

Gem pass alone (bloom off), i.e. the pure trace shader: card **0.342 ± 0.076** (R² 0.871), fullscreen **0.233 ± 0.022**
(R² 0.975). Sub-linear everywhere: **a 36x pixel increase buys only 2.4x gem-pass time**, so at these buffer sizes the
trace shader is dominated by a fixed ~4.7 ms term (fullscreen fit intercept, t 8.8), not by per-pixel ALU.

What a slope < 1 means here: fixed per-frame overhead (FBO clears, MSAA resolve, bloom pyramid allocation, present) is
**65% of the card r3 frame** (11.25 of 17.31 ms) and **30% of the fullscreen r3 frame** (12.26 of 41.43 ms). The card's slope is also flatter than the
fullscreen's (0.15 vs 0.38) because the card's fixed share is larger, not because its per-pixel work is cheaper
(22.2 vs 20.4 ns/px — statistically indistinguishable).

---

## 3. (b) Marginal cost per tap and per bounce at ratio 2 (card, 136152 px)

Taps (bounce fixed 5). The shader emits **1 trace at taps < 2 and 3 traces at taps >= 2**, so the tap knob is a step,
not a linear dial:

| taps | traces | gem | bloom | comp | total |
|---|---|---|---|---|---|
| 1 | 1 | 3.30 | 2.96 | 2.55 | 8.81 |
| 2 | 3 | 5.85 | 5.11 | 4.18 | 15.01 |
| 3 | 3 | 5.86 | 5.52 | 4.19 | 15.37 |

- taps 1→2: **+6.20 ms total (+2.55 ms gem)** for two extra traces → **+3.10 ms per extra trace** in the gem pass,
  **+6.55 ms / 2 = +3.28 ms per extra trace** on the frame.
- taps 2→3: **+0.36 ms (+0.01 gem)** = noise; the shader work is identical. **There is no per-tap cost above 2 taps.**

Bounces (taps fixed 3):

| bounce | gem | bloom | comp | total |
|---|---|---|---|---|
| 1 | 2.99 | 2.42 | 1.95 | 7.34 |
| 3 | 3.73 | 3.60 | 3.17 | 10.54 |
| 5 | 5.86 | 5.52 | 4.19 | 15.37 |

- bounce 1→3: +3.20 ms → **1.60 ms/bounce**
- bounce 3→5: +4.82 ms → **2.41 ms/bounce**
- OLS over the three levels: **+2.01 ms per bounce** (t 8.6, R² 0.987), of which **+0.72 ms/bounce in the gem pass**
  (t 3.6) and the remainder is the bloom chain scaling with whatever the gem pass feeds it.

At 136k px, 2.01 ms/bounce = **14.8 ns/px/bounce**, i.e. bounces are ~65% of the total measured marginal 22.7 ns/px.
The step from 1.6 to 2.4 ms/bounce is what you expect from a per-bounce plane-test loop whose inner work grows with
bounce index; two levels cannot distinguish linear from mildly super-linear, so quote **2.0 ms/bounce ± 0.4**.

---

## 4. (c) Bloom share at ratio 3 and ratio 2

Two different "shares" — both are reported because the static audit's "33%" is the first one:

| surface | ratio | gem | bloom | comp | total | bloom pass share | bloom+comp share | bloom OFF total | cost of the chain |
|---|---|---|---|---|---|---|---|---|---|
| card | 3 | 6.48 | 5.70 | 5.14 | 17.31 | **32.9%** | **62.6%** | 6.70 | **+10.61 ms (2.58x)** |
| card | 2 | 5.86 | 5.52 | 4.19 | 15.37 | **35.9%** | **63.2%** | 5.58 | **+9.78 ms (2.75x)** |
| fullscreen | 3 | 14.71 | 13.78 | 13.14 | 41.43 | **33.2%** | **65.0%** | 9.29 | **+32.14 ms (4.46x)** |
| fullscreen | 2 | 10.11 | 9.29 | 8.04 | 27.52 | **33.7%** | **63.0%** | 6.91 | **+20.61 ms (3.98x)** |

Reading: the bloom pass itself is a stable **33–36% of the frame** (matches the audit's 33%); the whole bloom chain
(bloom + composite) is **63–65%**. But "bloom OFF" is not the same scene — it removes the chain entirely, so the on/off
delta is the honest cost: **10–11 ms at card size regardless of ratio**, rising to **32 ms at fullscreen r3** because the
chain runs at buffer resolution. The chain's share *grows* with pixel count (2.6x at card r3, 4.5x at fullscreen r3),
which is the signature of a full-resolution target, not of ALU.

---

## 5. (d) First-order fit and significance (card, bloom on, n=9 configs)

`total = a + kr*px + ct*(traces-1) + cb*(bounces-1)`; centring on traces=1 / bounce=1 keeps the tap and bounce terms
orthogonal to the intercept. n=9, dof=5, **R² = 0.833, adj R² = 0.732**.

| term | estimate | se | t | verdict |
|---|---|---|---|---|
| a (ms) | -0.28 | 2.74 | -0.10 | **not identified** (see below) |
| kr (ns/px) | 22.71 | 7.35 | 3.09 | **significant** |
| ct (ms per extra trace) | 2.19 | 0.91 | 2.41 | borderline (crit. 2.57 at 95%, dof 5) |
| cb (ms per extra bounce) | 1.83 | 0.45 | 4.04 | **significant** |

Residuals (ms): −1.18, −1.11, +1.34, −1.34, **+2.67**, +0.16, −0.31, +0.84, −1.08. The only large miss is taps=2
(+2.67), where the 3-trace step lands — the linear-in-traces term can't represent a step function, which is why `ct`
reads 2.19 here vs the direct 3.28 ms/trace delta in §3.

The intercept is **not** a physical constant in this model: the taps/bounce deltas were only sampled at one pixel count
(136k), so `a` and `kr` trade off and `a` collapses to ~0 with a standard error of 2.7 ms. The pixel-only fit on the
ratio sweep is where the fixed term is identified: **a = 11.25 ± 0.91 ms (t 12.3), b = 22.2 ± 6.0 ns/px**, R² 0.823.
Reported answer: **fixed overhead ~11 ms/frame at card size, statistically robust; per-pixel ~22 ns/px; per-bounce
~1.8–2.0 ms; per-trace ~2.2–3.3 ms, borderline significant.**

Sanity check of the fit at the shipped default (r2, 3/5): 11.25 + 3.02 + 2*2.0 = 18.3 ms predicted vs **15.37 measured**
— the model over-predicts because the taps/bounce deltas were taken at a warmer session and the step term double-counts.
Treat the model as a sensitivity ranking (pixels ≈ bounces ≫ traces), not an absolute predictor.

---

## 6. Explicit answers

### Fill-bound or ALU-bound?

**Both — but at different sizes, and neither at the card size.**

- **Fullscreen r3 (1026x1434, 1.48 Mpx): fill/resolution-bound.** **73%** of the 41.4 ms frame is pixel-proportional
  (30.2 ms fill term vs 12.3 ms fixed; per-px slope 20.4 ns/px, R² 0.971), and all three passes scale with the same
  exponent ~0.35–0.41. Halving internal resolution halves this frame almost exactly (measured, §7).
- **Card r2/r3 (558x244 – 837x366): fixed-cost-bound.** 65–73% of the frame is independent of pixel count
  (11.25 ms intercept, t 12.3). A 4x pixel cut is worth only 2.8–5.1 ms there.
- **ALU is real but second-order to the frame.** The trace ALU (taps x bounces x plane tests) shows up as the
  *marginal per-pixel* cost: +1 bounce = +2.0 ms at 136k px = 14.8 ns/px, ~65% of the 22.7 ns/px marginal. So the
  per-pixel term is ALU-dominated, but the frame as a whole is not ALU-bound — it is dominated by a ~11 ms fixed
  per-frame cost at card sizes and by raw pixel count at fullscreen r3.

### What would a 2x internal-resolution reduction (4x fewer pixels) buy, measured?

| surface | transition | px | measured total | measured saving | model (projected) |
|---|---|---|---|---|---|
| card | r3 → r1.5 | 306342 → 76494 | 17.31 → 14.51 ms | **−2.80 ms, −16.2%** (1.19x) | −5.10 ms, −29.5% |
| card | r2 → r1 | 136152 → 34038 | 15.37 → 11.10 ms | **−4.27 ms, −27.8%** (1.38x) | — |
| fullscreen | r3 → r1.5 | 1481760 → 370080 | 41.43 → 20.05 ms | **−21.38 ms, −51.6%** (2.07x) | −22.63 ms, −54.6% |
| fullscreen | r2 → r1 | 658560 → 164640 | 27.52 → 17.42 ms | **−10.10 ms, −36.7%** (1.58x) | — |

- **Fullscreen (the surface where bloom is actually full-res at r3): 4x fewer pixels buys 21.4 ms measured, 41.4 → 20.1 ms,
  i.e. 24 → 50 fps** (50 fps = 1000/20.05, projected from the measured frame time). Model and measurement agree to 6%, so this is a trustworthy number.
- **Card: 4x fewer pixels buys only 2.8 ms measured (17.3 → 14.5 ms) at r3, and 4.3 ms at r2** because of the ~11 ms
  fixed term. The r3 card point carries a 4.7 ms spread (15.74–20.45 across bursts), so quote the card answer as a
  **band: −2.8 to −5.1 ms (−16% to −30%)**, with the model at the pessimistic-to-optimistic middle. It is not a
  free 2x.
- Note this is **not** the same claim as the audit's pixel-identical 1.28x ceiling: 2x internal resolution changes the
  image (it is a quality trade), and the numbers above are what the GPU actually returns when you make that trade.

---

## 7. Validity and limits

- **Measured M1 headless, not the phone.** The renderer is ANGLE Metal on an M1 Max. Absolute milliseconds do not
  transfer to a mobile GPU; exponents, term rankings and the on/off ratios do. Any phone budget must re-measure.
- **Pooling across sessions.** The gap run (09:20Z) reads ~11% slower than `pc.jsonl` (09:00Z) at ratio 0.5, and the
  card r3 bursts span 15.7–20.5 ms. Card log–log slope is therefore 0.152 pooled vs 0.209 single-session; both are
  inside each other's noise given the intercept-dominated shape, but the intercept 11.25 ms should be read as
  "≈10–12 ms".
- **Bloom-off points do not run bloom/comp passes at all**; their totals are gem-only and are used only as on/off
  deltas, never as "the same frame without bloom shading".
- **Taps above 2 are a no-op** in shader work (1 trace below 2, 3 traces at/above 2), so "marginal cost per tap" is
  really "marginal cost per trace" and has only one measurable step.
- `cpu=6` throttled records and the unpaced `card.jsonl` / `card2.jsonl` / `fs.jsonl` files exist in the prior
  scratch dir and were deliberately excluded from every fit here; the paced subset is the only data used.
- No gap point failed: 9/9 retained, none skipped, none with `disjoint=true`, none below the n>=30 floor.
