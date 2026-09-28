# Gem rubric — what "10/10" means, criterion by criterion

Purpose: replace vision-model mood swings with a fixed instrument. Every criterion below has a
plain-language definition, an objective recipe, and 0–10 anchors. Vision reads are kept only as a
secondary signal; they are noisy and were observed to flip on framing alone.

## The instrument (fixed for every score in this file)

```sh
cd '/Users/irfan/Documents/Portfolio Redo/crm_proj'
node prototype/gems/gem-shot.mjs 'http://127.0.0.1:5176/gallery.html?gem=high#gems' \
  prototype/gems/rubric-shots/<name> --scale 1 --wait 6000 \
  --clip '.frame[data-panel="gems"] .gem-stage' --eval "<frozen-pose eval>"
```

* Viewport 1500×1200, `--scale 1`, card canvas box **pinned to 510×223** (`c.style.flex='0 0 auto';
  c.style.height='223px'`). The pin is required: a category-pill click overwrites the card
  `className` and drops `gem-reward--resize`, so the canvas box jumps 223 px → 140 px and the stage
  clip 501 px → 418 px. Without the pin, cross-category shots are not pixel-comparable.
* Frozen pose: `rg.cat.spin=0; rg.t=0;` then capture — rotation.y is forced to 0 every frame and the
  pointer tilt eases to 0, so the pose is deterministic. The float (`sin(t*0.8)*0.03`) is still live;
  because the freeze happens at eval+2500 ms and the capture at eval+~3100 ms, `t_capture ≈ 0.6 s` in
  every run, which keeps the drift sub-pixel. **Noise floor: two identical runs differ by mean 0.48/255,
  max 72.3/255 at facet edges only, 2.0 % of pixels >8.** Anything under that is not a change.
* Silhouette mask: from the **transmission-off + floor-off twin** of the same pose (opaque body, no
  additive caustic pool), `saturation > 18`, largest connected component, holes filled. Verified
  visually. Mask = 25 586 px (sapphire) / 26 720 px (citrine), bbox 275×184, bbox fill 0.506 / 0.526.
  Cross-category mask IoU 0.956 — the same cut lands in the same pixels, so category comparisons are valid.
* All interior statistics are computed on the mask eroded by 2 px (kills antialiased boundary mixing).
* `L` = luma (0.2126R+0.7152G+0.0722B). `hp` = L − boxblur(L, 5).

## Criteria

| # | Criterion | Definition of good | Measurement recipe | 0–10 anchors |
|---|---|---|---|---|
| 1 | **Facet edge crispness** | Every facet boundary is a clean discontinuity; no mush between planes, no smooth patches where facets should meet. | Sobel `\|∇L\|` inside the eroded mask → `g_p95`, `g_p99`, `edge_frac_gt20` (fraction of interior pixels with `\|∇L\|≥20`). `EW` = median 20 %→80 % rise width in px along the gradient direction over the 400 strongest edges. Normalised acutance = `g_p99/(p95−p5)`. | 10 = EW ≤1.0 px **and** acutance ≥0.9 **and** 0.04≤edge_frac≤0.09; 8 = EW ≤1.0, acutance ≥0.6; 6 = EW ≤1.5, acutance ≥0.45; 4 = EW ≤2.0, acutance ≥0.3; 2 = EW ≤3.0; 0 = EW >3 (no readable facet boundaries). |
| 2 | **Internal brightness range** | The interior holds both genuinely shadowed facets and near-white glints. That spread is what reads as depth; a flat interior reads as a cut-out. | Inside eroded mask: luminance percentiles p1…p99.9, `DR = p99−p1`, `stops = log2((p99.9+1)/(p5+1))`. | 10 = DR ≥210, stops ≥3.0, p5 ≤40; 8 = DR ≥180, stops ≥2.5; 6 = DR ≥150, stops ≥2.0; 4 = DR ≥110, stops ≥1.2; 2 = DR ≥60; 0 = DR <60 (flat). |
| 3 | **Dispersion / fire** | Spectral separation that changes **over a few pixels** (fringes at facet boundaries), not a global tint shift of the whole stone. | (a) `fire_px_frac` = fraction of interior pixels (sat>0.2) whose hue deviates >15° from the local 9×9 circular-mean hue; (b) `fire_dev_p95`; (c) `hue_std`, hue p90−p10; (d) on/off probe: diff against a run with the dispersion patch removed (`m.onBeforeCompile=function(){}; m.needsUpdate=true`). If (d) is large but (a) does not move, the "dispersion" is a tint, not fire. | 10 = fire_px_frac ≥0.06, hue p90−p10 ≥30°, fire_dev_p95 ≥25°; 8 = 0.03 / 20° / 15°; 6 = 0.015 / 12° / 10°; 4 = 0.008 / 10° / 6°; 2 = fire_px_frac <0.008; 0 = 0 **and** on/off diff ≈0. |
| 4 | **Transmission depth** | The stone is a window: what is behind it is visible *through* it, displaced and attenuated, so the eye reads volume rather than a painted surface. | (a) transmission-off probe: `mean\|Δ\|` and `frac_gt8` inside the mask between the shipped shot and the same pose with `transmission=0`; (b) backdrop-transfer `T = Δhp_interior / Δhp_ring` between the chart-backdrop run and the plain-stage run (the ring is the annulus 2–10 px outside the silhouette). | 10 = T ≥0.6 **and** tx-off mean ≥25; 8 = T ≥0.4; 6 = T ≥0.25; 5 = T ≥0.12; 3 = T ≥0.05; 2 = T ≥0.02; 1 = T <0.02 (transmission changes pixels but carries no backdrop). |
| 5 | **Highlight structure** | A few small, separate, compact bright events on different facets — not one large white wash. | Threshold the interior at its own p99 luminance, label components ≥3 px: `n_cc`, `largest_frac` (largest / all bright px), `bright_frac` (bright px / interior), `sat_mean_bright` (HSV saturation of the bright px — **report on a 0–255 scale**: `(max−min)/max×255`; the first pass reported the 0–1 scale, which made the ≥15 anchor unreachable). | 10 = n_cc ≥6, largest_frac ≤0.35, sat_mean_bright ≥15; 8 = n_cc ≥4, largest_frac ≤0.5; 6 = n_cc ≥3, largest_frac ≤0.6; 4 = n_cc =2 or largest_frac ≤0.8; 2 = n_cc =1, largest_frac ≥0.95; 0 = bright_frac >0.08 (washed out). |
| 6 | **Background interaction** | The stage behind the stone is visibly bent / displaced / attenuated by it — you can tell something is behind the stone. | Chart-backdrop probe (`Demo bg: chart`, a high-contrast test chart behind the stone): `T` as in #4, plus `mean\|Δ\|` inside the mask between the chart run and the plain run, plus `hp_ratio = hp_interior/hp_ring`. Score = min(T-band, mean-band). | 10 = T ≥0.6, mean ≥30; 8 = T ≥0.4, mean ≥20; 6 = T ≥0.25, mean ≥12; 4 = T ≥0.12, mean ≥8; 2 = mean <8; 0 = mean <3 (the backdrop is invisible to the stone). |
| 7 | **Material honesty** | Reads as a translucent crystal, not polished metal or plastic. Four objective tells. | (a) tx-off mean ≥20 (light passes); (b) interior `sat_mean` ≥100/255 and mean interior hue within 30° of the category token hue (sapphire #218aea = 208.7°, citrine #ffb01e = 38.9°); (c) `sat_mean_bright` ≥15 on the **0–255 scale** (a metal's blown highlight is achromatic, ≤10); (d) cut-out tell: fraction of interior pixels matching the no-stone backdrop within 3/255 must be <0.05 (**not yet measured** — needs a same-run no-stone reference). | 10 = all four with margin (tx ≥40, sat ≥120, Δhue ≤15, sat_bright ≥30); 8 = all four pass; 6 = three pass; 4 = two; 2 = one; 0 = none. |
| 8 | **Cut integrity** | The outline is a clean polygon, the facets tessellate the whole silhouette (no smooth quadrant), and the shape is the intended 48-facet brilliant cut. | Mask bbox fill (silhouette area / bbox area — a round brilliant is ~0.45–0.62); mask hole count = 0 after fill; edge density per quadrant (`edge_frac_gt20` in each of the 4 quadrants of the mask bbox). | 10 = bbox fill 0.48–0.58 **and** all 4 quadrants ≥0.02; 8 = all 4 ≥0.01; 6 = 3 quadrants ≥0.01; 4 = 2; 2 = 1; 0 = 0. |
| 9 | **Tone-map headroom / scheme robustness** | Holds its internal range in both light and dark scheme and never clips. | `clip_frac` = fraction of interior pixels with L ≥254; `DR` in light and dark scheme; `\|Δ p50\|` between schemes. | 10 = clip ≤0.02, DR ≥150 in both schemes, \|Δp50\| ≤40; 8 = clip ≤0.03, DR ≥130; 6 = DR ≥110; 4 = DR ≥90; 2 = clip >0.08; 0 = clip >0.2 (blown out). |
| 10 | **Motion smoothness of the spin** | Constant angular rate, no stutter, monotonic. | Sample per-rAF `group.rotation.y` and rAF timestamps for 180 frames. `ω = Δrotation/Δt`; report `ω` coefficient of variation, `dt_p50/p95/max`, count of intervals >100 ms, monotonicity. | 10 = ω CoV ≤0.05, p95 ≤1.5×p50, max ≤50 ms; 8 = CoV ≤0.1, p95 ≤1.8×p50; 6 = CoV ≤0.15; 4 = CoV ≤0.25 or p95 ≤2.5×p50; 2 = any interval >200 ms; 0 = non-monotonic. |
| 11 | **Instrument stability** | The harness itself is stable: repeats are identical and the same cut lands in the same pixel box in every category. | (a) repeat-run `mean\|Δ\|` ≤1.0/255 and `frac_gt8` ≤0.05; (b) canvas box identical across categories; (c) cross-category mask IoU. | 10 = IoU ≥0.99 and (a),(b) pass; 8 = IoU ≥0.97; 6 = IoU ≥0.95; 4 = IoU ≥0.90; 2 = canvas box differs across categories; 0 = no pin, geometry not comparable. |

## Scored sheet — current build

Evidence: `prototype/gems/rubric-shots/<name>/clip-0.png` (all listed names are directories under
`prototype/gems/rubric-shots/`). Frozen pose + 510×223 pin for every card shot.

| # | Criterion | Sapphire | Citrine |
|---|---|---|---|
| 1 | Facet edge crispness | **8** | **5** |
| 2 | Internal brightness range | **4** | **2** |
| 3 | Dispersion / fire | **2** | **1** *(provisional: no dispersion-off probe run for citrine)* |
| 4 | Transmission depth | **1** | **3** |
| 5 | Highlight structure | **4** | **4** |
| 6 | Background interaction | **1** | **3** |
| 7 | Material honesty | **6** | **6** *(provisional: cut-out tell unmeasured)* |
| 8 | Cut integrity | **10** | **6** |
| 9 | Tone-map / scheme | **10** | **4** *(provisional: dark scheme not shot for citrine)* |
| 10 | Motion smoothness | **4** *(provisional: host under load ~110)* | **4** *(same)* |
| 11 | Instrument stability | **2** | **2** |
| | **Total (of 110)** | **52 → 4.7/10** | **40 → 3.6/10** |

### Evidence per criterion

**1 — edge crispness.** Sapphire `EW 1.0 px`, `g_p95 20.7`, `g_p99 55.7`, `edge_frac_gt20 0.0515`,
acutance 0.61, quadrants `[0.057, 0.064, 0.040, 0.035]`. Citrine `EW 1.0`, `g_p95 12.3`, `g_p99 28.5`,
`edge_frac 0.0226`, acutance 0.49, quadrants `[0.024, 0.033, 0.017, 0.009]`. Sub-pixel edges both; the
gap is edge *density* (citrine has half the facet-boundary signal — a light stone on a light stage).
Shots: `card-sapphire`, `card-citrine`.

**2 — brightness range.** Sapphire `p1 88.1, p5 90.2, p50 129.9, p95 180.9, p99 252.3, DR 164.2,
stops 1.49`. Citrine `p1 146.8, p5 156.6, p50 186.1, DR 105.4, stops 0.70`. Nothing in the sapphire
interior is darker than 88/255 and nothing in the citrine darker than 147/255: there are glints but no
shadowed facets. Dark scheme improves sapphire (`DR 184.5, stops 1.86`); citrine dark not shot.
Shots: `card-sapphire`, `card-citrine`, `card-sapphire-dark`.

**3 — fire.** Sapphire `fire_px_frac 0.0026` (0.26 % of the interior), `fire_dev_p95 0.9°`,
`hue_std 3.9°`, hue p90−p10 `9.8°`. Citrine `0.0001`, `0.9°`, `3.4°`, `7.9°`. On/off probe
(`card-sapphire-nodisp`): dispersion changes 38 % of interior pixels by >8/255 (mean 8.66) yet
`fire_px_frac` is identical with it on and off (0.0026 vs 0.0026) and `hue_std` is *lower* with it on
(3.9 vs 3.6). The three-IOR patch therefore shifts the stone's tint globally; it produces no local
spectral separation — the same thing `prototype/gems/README.md` already notes ("the three exits land
~2 px apart, so the fringe measures ≈0.4/255 in a still").

**4 — transmission depth.** Chart probe: sapphire ring high-pass rises `16.0 → 40.1` when the chart
goes behind the stone while the interior rises `15.03 → 15.02` → `T = −0.0004` (zero transfer).
Citrine `9.66 → 40.2` outside vs `8.77 → 11.74` inside → `T = 0.097`. Transmission is doing a lot of
pixel work (tx-off mean 57.8 sapphire / 45.4 citrine, 98 % of pixels >8) but none of it carries the
backdrop. Shots: `card-sapphire-chart`, `card-citrine-chart`, `card-sap-nofloor-tx0`,
`card-cit-nofloor-tx0`, `card-sapphire-tx0`.

**5 — highlight structure.** Sapphire: p99 threshold 252.3, bright `1.01 %` of the interior,
`n_cc 2`, `largest_frac 0.732`, `sat_mean_bright 26.7` (0–255 scale; the first pass printed the 0–1
value 0.1, which is the same measurement — see the unit note in the criterion row). Citrine: `n_cc 2`,
`largest_frac 0.749`, `sat_mean_bright` to re-measure on the 0–255 scale. Two blobs, three quarters of
the bright area in one → a single blown sheen, not glints. The ceiling probe
(`card-sapphire-envchart`, structured PMREM environment, material untouched) reaches `n_cc 7`,
`largest_frac 0.27`, `sat_mean_bright 29.1` — so the deficit is environmental.

**6 — background interaction.** Sapphire `T ≈0.00`, chart-vs-plain interior `mean|Δ| 5.13`;
citrine `T 0.097`, `mean|Δ| 13.6`. Shots: `card-sapphire-chart`, `card-citrine-chart`.

**7 — material honesty.** Both pass (a) tx-off mean (57.8 / 45.4), (b) `sat_mean 146.8 / 145.5` and
mean interior hue 220.3° / 33.2° vs token 208.7° / 38.9° (Δ 11.6° / 5.7°), and (c) on the corrected
0–255 scale `sat_mean_bright` is 26.7 for sapphire (re-measured after the ambient trim: 27.8) — a warm
tint, not the ≤10 achromatic metal tell the first pass reported under a unit mismatch. The tint is the
key light's warm white (0xfff4e6) rather than gem colour, so (c) passes marginally. Tell (d) is
unmeasured. Post-trim spot check: `soft` 26.7 → shipped ambient-trim 27.8 (no regression).

**8 — cut integrity.** Bbox fill 0.506 / 0.526 (in band), zero mask holes. Sapphire quadrants all
≥0.02 → 10. Citrine's bottom-right quadrant is 0.0092 (<0.01) → 6.

**9 — tone-map.** `clip_frac (L≥254) = 0.0023 / 0.0021` — no clipping. Sapphire holds DR ≥150 in both
schemes (164.2 light / 184.5 dark, |Δp50| 13.7) → 10. Citrine light DR 105.4 → 4, dark unmeasured.

**10 — motion.** 180 frames: spin 0.35 rad/s, `ω` mean 0.00025 rad/ms (=0.35 rad/s ✓),
`ω CoV 0.198`, `dt p50 59.8 ms, p95 102.0 ms, max 2289 ms`, 10 intervals >100 ms, rotation strictly
monotonic over 2.807 rad. The angular *rate* is exactly dt-based and never reverses; the jitter and
the 2.3 s stall are the headless SwiftShader host (load average ~110, 129 orphaned Chrome processes
were reaped mid-session). Provisional. Shot: `motion-card`.

**11 — instrument stability.** Repeat noise `mean|Δ| 0.48/255`, `frac_gt8 0.020`, max 72.3 at edges →
passes (a). Cross-category mask IoU 0.9556 → band 6. But the canvas box is only equal because the
harness pins it: unpinned, `card-sapphire` is 510×223 (stage clip 1174×501) and `s2-citrine` — same
recipe, only the category pill clicked — is 510×**140** (stage clip 1174×**418**), because the pill
handler overwrites the card `className` and drops `gem-reward--resize`. Band 2 by rule. Shots:
`card-sapphire`, `card-sapphire-repeat`, `s2-citrine`.

## Top 3 remaining gaps

**1. The interior never sees the backdrop (C4 = 1, C6 = 1).** The chart behind the stone adds 24.1
units of high-pass structure to the ring and **−0.01** to the interior; `T = −0.0004`. Root cause is
structural, not a tuning miss: `getIBLVolumeRefraction` samples the PMREM `scene.environment`, never
`scene.background`, and the shipped studio env is featureless. Proof that the ceiling is the
environment rather than the material: swapping in a structured PMREM (no material change,
`card-sapphire-envchart`) moves the interior from `hue_std 3.9 → 14.7`, `n_cc 2 → 7`,
`sat_mean_bright 0.1 → 29.1`. Evidence: `card-sapphire-chart`, `card-citrine-chart`,
`card-sapphire-envchart`, `detach-sapphire-chart`.

**2. No shadowed facets (C2 = 4 / 2).** `p1 88.1` (sapphire) and `p1 146.8` (citrine): the darkest 1 %
of the interior is mid-tone, so there is glint but no occlusion. `stops 1.49 / 0.70` against a 3.0
anchor. The opaque twin is not the problem (its `stops` is 0.60 — *lower*), so this is not transmission
washing out darks; the interior has no low-energy path at all. Evidence: `card-sapphire`,
`card-citrine`, `card-sap-nofloor-tx0`.

**3. Dispersion is a tint, not fire (C3 = 2 / 1).** `fire_px_frac 0.0026 / 0.0001`; turning the
dispersion patch off changes 38 % of the interior by >8/255 while leaving `fire_px_frac` unchanged
(0.0026 both) and `hue_std` slightly *higher* without it. The R/G/B samples come from the same exit
region, so the patch recolours the whole stone instead of producing fringes. Evidence:
`card-sapphire`, `card-sapphire-nodisp`.

**Instrument gap (cheap, do first):** the category pill drops `gem-reward--resize` and the canvas box
jumps 223↔140 px, so any vision-model comparison across categories is comparing different framings.
Fix the className handling in the pill handler, or pin the box in the shot recipe (as this sheet does).
Evidence: `card-sapphire` vs `s2-citrine`.

## Notes on reading the scores

The rubric weights optical *behaviour* (#2–#6 = 55 of 110 points) — exactly where the recurring vision
complaints land ("reflective polished stone", "no visible dispersion", "interior too dark"). Shape and
edge quality already score well (#1, #8), which is why vision reads of the same shots come back 7–8.5/10
while this sheet reads 4.7/3.6. The two scales agree on #1 and #8 and disagree on #2–#6; treat the
vision number as a composition read and this sheet as the optics read. Anchors for #1, #3, #6 and #9
were calibrated from the two current builds plus the two ceiling probes (`envchart`, `dark`) and are
provisional until a known-good reference (a real photograph of the same cut, or the best path-traced
frame in `prototype/gems/`) is scored against them.
