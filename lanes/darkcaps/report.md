# darkcaps — attribute the flat dark-navy crown/pavilion caps, then one principled fix

Verdict: **FAILED** — fix reverted, tree restored to committed bytes. The attribution is
decisive and the fix did erase the caps, but it cost criterion 2 on both stones
(sheet 62/59 vs required 66/62).

## 1. Zone table (committed look, `zones.py`: dark.png sat>20 → largest CC → fill → erode 3;
caps = connected interior L<90 & local-7×7-std<8, split top/bottom third of mask bbox)

| cat | zone | frac of stone | p5 | p50 | std |
|---|---|---|---|---|---|
| sapphire | cap-top (crown) | 0.178 | 63.7 | 69.6 | 5.05 |
| sapphire | cap-bot (pavilion/culet) | 0.109 | 45.8 | 56.5 | 6.94 |
| citrine | cap-top (crown) | 0.089 | 77.6 | 80.7 | 4.24 |
| citrine | cap-bot (pavilion/culet) | 0.141 | 61.9 | 71.1 | 6.52 |

Interior context: sap p5/p50/std = 55.9/142.8/63.2, slab 0.273; cit = 68.1/210.3/77.0, slab 0.150.
Cap hue follows stone tint (sap hue p50 228°, cit 16.5°) — the caps are tinted light starved
of source, not a foreign navy overlay. Lane reproduces `runs_baseline_00` to the decimal
(66/110 sapphire, 62/62 citrine).

## 2. Attribution ranking (probe sweeps, fresh Chrome per probe, fixed before-masks, Δcap-p5)

| probe (live uniform) | sap top Δp5 | sap bot Δp5 | cit top Δp5 | cit bot Δp5 | owns? |
|---|---|---|---|---|---|
| win0 (`mats[1].winGain=0`) | +0.0 | +0.0 | +0.0 | +0.0 | no — window contributes nothing to caps |
| stageoff (`mats[1].stageOn=0`) | +0.0 | +0.0 | +0.0 | +0.0 | no — stage texture contributes nothing |
| gain ×0.5 / ×2 | −4.5/+5.5 | −3.8/+6.7 | −8.2/+14.0 | −8.8/+14.5 | scales, does not own |
| transmission 1→0.25 | caps gone | +62.2 | caps gone | +63.3 | **OWNS — dark arrives via transmitted proxy image** |
| attenuationDistance ×0.5 / ×2 | −5.7/+4.4 | −6.0/+5.2 | −6.8/+7.7 | −7.2/+7.9 | downstream amplifier |

All probe uniform states verified in `probes/meta.json` (`probeState`). Full table with
p50/std in `probes/attribution_fixed.json`. Reading: cap pixels see neither the projected
window nor the stage — they are TIR (or out-of-UV refract) rays returning the dim studio
top through the proxy, navy-crushed by the normal-based ramp, then crushed again by body
attenuation. `win0`/`stageoff` at exactly ±0.0 on all four zone-cats exonerates the window.

## 3. The one fix (reverted)

`src/components/GemReward/gem-shader.js`, +0 JS lines (GLSL appended to the existing
`#endif` line, file stays 99 lines, `node --check` + `lint-tokens` green):

```glsl
float mirUp = tir * smoothstep( 0.0, 0.55, dir.y );
env += vec3( 1.0, 0.99, 0.97 ) * mirUp * 0.35;
```

TIR-as-mirror: TIR facets return the overhead softbox instead of the dim studio top.
Refract/window path untouched (`tir` gate). After-fix evidence in `fixrun/`.

After-fix zone read (fixed before-masks): sap std 8.50→**23.74**, p5 46.0→**103.7**;
cit std 7.60→**19.72**, p5 62.1→**134.9**. Threshold-defined caps and slab both → 0.000.
Vision: sapphire faceted, no navy, no neon; citrine brighter but washed (was already
crit-5 0 before). Instrument neon counter (0,0) both cats before and after.

## 4. Why it failed — sheet deltas (after-fix `fixrun/*_score.after.json`)

| cat | total | moving criteria |
|---|---|---|
| sapphire | 66 → **62** | #2 6→4 (floor lifted: p1 45.9→100, DR 209→155, stops 2.17→1.28); #11 10→8 (dark-mask edge shift, IoU 0.994→0.986) |
| citrine | 62 → **59** | #2 4→2 (p1 61.9→132.4, stops 1.89→0.90); #3 6→4 (white addition desaturates fire); #4 3→5, #6 3→4 up; #11 10→8 |

The lift that erases the caps also erases the shadowed facets criterion 2 rewards.
S=0.35 overshoots the floor; S was a single uncalibrated pick, and retuning it would be
a second iteration, so per the one-fix/one-loop contract the fix was reverted instead.

## 5. Gate checklist

- cap-zone std UP both cats: PASS (×2.8 / ×2.6 fixed-mask; threshold zones dissolve)
- cap p5 up (less navy): PASS (+57.7 / +72.8 fixed-mask p5)
- neon 0: PASS ((0,0) both cats, before and after)
- sheet ≥ 66/62: **FAIL (62/59)**
- slab frac not worse vs 0.25/0.28: PASS (0.273→0.000 / 0.150→0.000; beats either reading)

## 6. Files

- `lanes/darkcaps/{sapphire,citrine}/{front,repeat,txoff,dispoff,chart,dark,nogem}.png` + `meta.json` + `motion.json` + `score.json` (66/62, committed) + `zones.json`
- `lanes/darkcaps/probes/{sapphire,citrine}_{win0,stageoff,gain05,gain2,tx025,att05,att2}.png` + `meta.json` + `attribution_fixed.json`
- `lanes/darkcaps/fixrun/` — after-fix fronts + after-fix score.jsons (62/59)
- `lanes/darkcaps/capture.mjs` (62 lines, lint-clean), `lanes/darkcaps/zones.py`, this report
- `src/components/GemReward/gem-shader.js` — **unmodified vs committed** (md5 below)

Suggested next (not attempted — would be round 2): interpolate S between the two measured
points (S=0→cap p5 46, S=0.35→104; target global p5 ≈60 keeps stops ≈2.0) or gate the
softbox by facet so the global floor survives. `runs_baseline_00/` untouched.
