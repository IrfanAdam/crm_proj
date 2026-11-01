# verify_value2 — angle-stable interior: independent verification

Instrument `prototype/gems/score.py` (not modified). Detectors are mine, written from the
brief's frozen spec: `verify_value2/bands2.py` (mask + bands + globals + gates a-c),
`verify_value2/poses.py` (pose discovery), `verify_value2/sweep.py` (per-angle sweep),
`verify_value2/tirmask.py` (gate d), `verify_value2/gate_eval.py` (gate table).

## 0. Provenance of what was graded

| item | value |
|---|---|
| shipped shader `src/components/GemReward/gem-shader.js` | md5 `ad74d41976447c38df55ced0249e3a1a` |
| lane `lanes/value2/gem-shader.try7.js` | md5 `ad74d41976447c38df55ced0249e3a1a` — **identical to shipped** |
| committed bytes `lanes/value2/gem-shader.committed.js` | md5 `f854e086501c9213109339fcd5d33229` (revert target) |
| PNGs hashed | 52 (26 per cat), all non-zero, none flat (min per-file L std 16.9) — `new_md5.txt` / `new_md5.json` |
| poses captured per cat | 9 = yaw 0/35/70 x tilt 0/+0.55/-0.55, each with `front` + `dark` |
| extra poses | `tirmask` debug shot at yaw 0/35/70, tilt 0 only (3 per cat) |

The lane's `DONE` says FAILED and does not claim success; the numbers below are my own
re-derivation, not a restatement of its table.

## 1. Baseline — committed look, `.hermes/tmp/round6/runs/`

| cat | committed `score.json` | my re-run `--peer --quiet` | match |
|---|---:|---:|:--:|
| sapphire | 66/110 | 66/110 | exact |
| citrine | 62/110 | 62/110 | exact |

Baseline band meter (front.png, dark.png mask, 32,272 / 32,212 px, bbox h 185):

| cat | band | frac of h | %stone | L p50 | S med | 7x7 std med | pale frac |
|---|---|---|---:|---:|---:|---:|---:|
| sapphire | crown_top | 0-.18 | 0.155 | 69.60 | 198.6 | 2.19 | 0.019 |
| sapphire | crown_lower | .18-.32 | 0.206 | 106.83 | 147.2 | 21.00 | 0.033 |
| sapphire | girdle | .32-.38 | 0.101 | 178.25 | 102.6 | 18.51 | 0.032 |
| sapphire | upper_pavilion | .38-.62 | 0.330 | 186.45 | 91.1 | 9.74 | 0.165 |
| sapphire | mid_pavilion | .62-.82 | 0.156 | 66.85 | 205.1 | 6.50 | 0.032 |
| sapphire | culet | .82-1 | 0.051 | 56.01 | 224.0 | 4.92 | 0.000 |
| citrine | crown_top | 0-.18 | 0.155 | 90.29 | 156.0 | 7.66 | 0.070 |
| citrine | crown_lower | .18-.32 | 0.207 | 109.72 | 155.2 | 22.50 | 0.078 |
| citrine | girdle | .32-.38 | 0.102 | 243.55 | 118.0 | 18.69 | 0.297 |
| citrine | upper_pavilion | .38-.62 | 0.331 | 247.92 | 97.0 | 2.03 | 0.641 |
| citrine | mid_pavilion | .62-.82 | 0.155 | 74.07 | 167.6 | 3.37 | 0.003 |
| citrine | culet | .82-1 | 0.051 | 73.00 | 175.8 | 5.14 | 0.000 |

| cat | pale-lowinfo | clip | L p5 | L p95 | neon | r(sat,L) | achro-bright | interior S mean |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| sapphire | 0.0727 | 0.0311 | 55.63 | 237.76 | 0 | -0.980 | 0.1004 | 135.6 |
| citrine | 0.2698 | 0.0544 | 67.98 | 250.09 | 0 | -0.759 | 0.0313 | 132.6 |

Baseline already misses several of the round's gates on the committed pose: sapphire
crown_top std 2.19, clip 0.0311 > 0.02, achro-bright 10.0% > 5%, score 66 = the bar with no
headroom; citrine pale-lowinfo 0.270, upper_pavilion std 2.03, clip 0.0544.

### 1b. Baseline at spin angles (committed shader, captured 00:53-00:58 before the lane rewrote its dir)

I snapshotted the lane's first capture pass while `gem-shader.js` was still the committed
bytes (`f854e08`); those PNGs are frozen in `verify_value2/pre_angles/` with a manifest.

| cat | pose | pale-lowinfo | clip | achro | r(sat,L) | std min |
|---|---|---:|---:|---:|---:|---:|
| sapphire | a0 | 0.072 | 0.0289 | 0.100 | -0.980 | 2.24 |
| sapphire | a35 | 0.078 | 0.0853 | 0.139 | -0.985 | 2.48 |
| sapphire | a70 | 0.075 | 0.0193 | 0.088 | -0.985 | 0.79 |
| sapphire | a90 | 0.072 | 0.0289 | 0.100 | -0.980 | 2.24 |
| sapphire | a110 | 0.075 | 0.0262 | 0.117 | -0.987 | 1.79 |
| sapphire | a140 | 0.106 | 0.0218 | 0.097 | -0.977 | 1.71 |
| sapphire | a170 | 0.078 | 0.0853 | 0.139 | -0.985 | 2.48 |
| citrine | a0 | 0.276 | 0.0533 | 0.031 | -0.751 | 1.87 |
| citrine | a35 | 0.277 | 0.1039 | 0.077 | -0.740 | 2.28 |
| citrine | a70 | 0.275 | 0.0323 | 0.030 | -0.718 | 0.85 |

So on the committed shader the pale field is 7.2-10.6% (sapphire) and 27.5-27.7% (citrine)
across yaw 0/35/70/90/110/140/170. The brief's ~49% angle, and the lane's own claim of 84.7% at
citrine tilt -0.55 / 32-33% at sapphire tilt -0.55, are tilt-cell claims: my snapshot has no
pre-fix tilt capture, so those are **not independently reproduced** — the committed-shader yaw
numbers above are the whole pre-fix envelope I can vouch for.

## 2. Lane's claim vs my reproduction

| item | lane claim | my measurement | agree |
|---|---|---|---|
| sap total | 64/110 | 64/110 | yes, per-criterion identical |
| cit total | 64/110 | 64/110 | yes, per-criterion identical |
| shipped = try7 | md5 ad74d419... | md5 identical to `gem-shader.try7.js` | yes |
| clip at tilt +0.55 | 13-15% | 9.3-16.9% (cit 0.0925-0.1327, sap 0.1121-0.1693) | same cells, wider |
| band std misses | crown_top 1.02-1.30 (sap), lower_pav 0.73-2.36 | crown_top 0.90-1.17 (sap); citrine 7/9 poses miss | same conclusion, my band fractions are the frozen spec's (the lane's `measure.py` uses 0-.22/.22-.38/.38-.46/... ) |
| TIR gate | "inverted, TIR 98.2-98.8% of stone" | TIR 56-58% of stone with my rule (below) | rule differs; both agree there is no usable TIR/non-TIR split |

## 3. Every captured angle — gate table

### sapphire

| pose | pale | G1 | 7x7 std min | failing bands | G2 | neon | clip | G4 | bands L p50 >130 | G5 | r(sat,L) | (a) | achro | (b) | int S | (c) |
|---|---:|:--:|---:|---|:--:|---:|---:|:--:|---|:--:|---:|:--:|---:|:--:|---:|:--:|
| a0_t-0.55 | 0.005 | PASS | 4.01 | - | PASS | 0 | 0.0000 | PASS | - | PASS | -0.863 | PASS | 0.004 | PASS | 224.9 | PASS |
| a0 | 0.004 | PASS | 1.17 | crown_top | FAIL | 0 | 0.0154 | PASS | - | PASS | -0.871 | PASS | 0.037 | PASS | 202.9 | PASS |
| a0_t0.55 | 0.115 | PASS | 4.10 | - | PASS | 0 | 0.1693 | FAIL | crown_lower,girdle,mid_pavilion,culet | FAIL | -0.960 | PASS | 0.218 | FAIL | 129.0 | PASS |
| a35_t-0.55 | 0.000 | PASS | 3.81 | - | PASS | 0 | 0.0000 | PASS | - | PASS | -0.874 | PASS | 0.004 | PASS | 228.6 | PASS |
| a35 | 0.006 | PASS | 1.08 | crown_top | FAIL | 0 | 0.0107 | PASS | - | PASS | -0.885 | PASS | 0.029 | PASS | 201.0 | PASS |
| a35_t0.55 | 0.094 | PASS | 5.17 | - | PASS | 0 | 0.1534 | FAIL | crown_top,crown_lower,girdle,upper_pavilion,culet | FAIL | -0.959 | PASS | 0.204 | FAIL | 131.7 | PASS |
| a70_t-0.55 | 0.000 | PASS | 3.94 | - | PASS | 0 | 0.0000 | PASS | - | PASS | -0.858 | PASS | 0.003 | PASS | 230.9 | PASS |
| a70 | 0.000 | PASS | 0.90 | crown_top,culet | FAIL | 0 | 0.0015 | PASS | - | PASS | -0.849 | PASS | 0.020 | PASS | 204.6 | PASS |
| a70_t0.55 | 0.067 | PASS | 3.01 | - | PASS | 0 | 0.1121 | FAIL | crown_top,girdle,culet | FAIL | -0.953 | PASS | 0.157 | FAIL | 142.5 | PASS |

poses passing: pale 9/9 | std 6/9 | neon 9/9 | clip 6/9 | no-bright-band 6/9 | r 9/9 | achro 6/9 | interior-S 9/9

### citrine

| pose | pale | G1 | 7x7 std min | failing bands | G2 | neon | clip | G4 | bands L p50 >130 | G5 | r(sat,L) | (a) | achro | (b) | int S | (c) |
|---|---:|:--:|---:|---|:--:|---:|---:|:--:|---|:--:|---:|:--:|---:|:--:|---:|:--:|
| a0_t-0.55 | 0.008 | PASS | 1.77 | crown_top,crown_lower,girdle,upper_pavilion | FAIL | 0 | 0.0000 | PASS | - | PASS | -0.170 | FAIL | 0.014 | PASS | 210.7 | PASS |
| a0 | 0.004 | PASS | 2.03 | upper_pavilion,mid_pavilion,culet | FAIL | 0 | 0.0113 | PASS | - | PASS | +0.181 | FAIL | 0.018 | PASS | 183.7 | PASS |
| a0_t0.55 | 0.097 | PASS | 3.03 | - | PASS | 0 | 0.1327 | FAIL | crown_top,crown_lower,girdle,upper_pavilion,mid_pavilion,culet | FAIL | -0.557 | PASS | 0.167 | FAIL | 141.1 | PASS |
| a35_t-0.55 | 0.000 | PASS | 1.45 | crown_top,crown_lower,girdle,mid_pavilion | FAIL | 0 | 0.0000 | PASS | - | PASS | +0.032 | FAIL | 0.004 | PASS | 213.4 | PASS |
| a35 | 0.005 | PASS | 1.79 | mid_pavilion,culet | FAIL | 0 | 0.0100 | PASS | - | PASS | +0.066 | FAIL | 0.028 | PASS | 178.3 | PASS |
| a35_t0.55 | 0.083 | PASS | 5.85 | - | PASS | 0 | 0.1314 | FAIL | crown_top,crown_lower,girdle,upper_pavilion,mid_pavilion,culet | FAIL | -0.577 | PASS | 0.165 | FAIL | 145.9 | PASS |
| a70_t-0.55 | 0.003 | PASS | 1.64 | crown_top,crown_lower,girdle,mid_pavilion | FAIL | 0 | 0.0000 | PASS | - | PASS | -0.148 | FAIL | 0.010 | PASS | 211.1 | PASS |
| a70 | 0.000 | PASS | 1.42 | upper_pavilion,mid_pavilion,culet | FAIL | 0 | 0.0016 | PASS | - | PASS | +0.403 | FAIL | 0.013 | PASS | 180.5 | PASS |
| a70_t0.55 | 0.064 | PASS | 2.04 | crown_top,upper_pavilion | FAIL | 0 | 0.0925 | FAIL | crown_top,crown_lower,girdle,upper_pavilion | FAIL | -0.436 | FAIL | 0.119 | FAIL | 152.0 | PASS |

poses passing: pale 9/9 | std 2/9 | neon 9/9 | clip 6/9 | no-bright-band 6/9 | r 2/9 | achro 6/9 | interior-S 9/9

### 3b. Full band table (L p50 / 7x7 std med)

**sapphire**

| pose | crown_top | crown_lower | girdle | upper_pavilion | mid_pavilion | culet |
|---|---:|---:|---:|---:|---:|---:|
| a0_t-0.55 | 78.8 / 4.83 | 74.4 / 4.07 | 68.6 / 4.01 | 76.1 / 5.54 | 73.8 / 7.25 | 46.1 / 7.68 |
| a0 | 57.5 / 1.17 | 72.9 / 10.26 | 78.1 / 20.12 | 77.7 / 5.89 | 50.3 / 11.29 | 41.5 / 3.01 |
| a0_t0.55 | 112.5 / 7.53 | 132.9 / 12.00 | 140.0 / 15.85 | 127.2 / 4.10 | 146.1 / 10.53 | 143.8 / 27.51 |
| a35_t-0.55 | 78.1 / 4.11 | 73.6 / 3.81 | 68.1 / 3.98 | 69.2 / 4.83 | 70.1 / 4.14 | 46.7 / 4.64 |
| a35 | 56.8 / 1.08 | 62.4 / 6.65 | 92.0 / 25.80 | 76.2 / 6.55 | 49.5 / 14.11 | 40.8 / 4.05 |
| a35_t0.55 | 139.2 / 5.17 | 130.4 / 9.49 | 131.4 / 11.93 | 134.8 / 7.89 | 114.1 / 21.24 | 145.4 / 32.15 |
| a70_t-0.55 | 78.4 / 4.09 | 74.4 / 4.09 | 67.5 / 3.94 | 66.5 / 5.28 | 66.2 / 4.87 | 44.4 / 6.71 |
| a70 | 56.5 / 0.90 | 74.1 / 13.02 | 97.5 / 22.59 | 75.3 / 4.97 | 49.5 / 11.64 | 41.0 / 2.38 |
| a70_t0.55 | 137.2 / 14.44 | 123.7 / 11.98 | 142.3 / 10.70 | 99.3 / 3.01 | 77.8 / 11.64 | 140.6 / 24.79 |

**citrine**

| pose | crown_top | crown_lower | girdle | upper_pavilion | mid_pavilion | culet |
|---|---:|---:|---:|---:|---:|---:|
| a0_t-0.55 | 124.6 / 1.89 | 122.9 / 1.88 | 120.0 / 1.77 | 117.8 / 2.63 | 116.2 / 3.47 | 55.2 / 5.53 |
| a0 | 75.2 / 7.89 | 103.3 / 10.99 | 122.1 / 13.19 | 123.5 / 2.59 | 58.0 / 2.03 | 55.3 / 2.27 |
| a0_t0.55 | 140.3 / 3.25 | 145.0 / 3.03 | 145.2 / 12.51 | 146.7 / 4.42 | 143.9 / 11.18 | 135.0 / 25.64 |
| a35_t-0.55 | 124.4 / 1.74 | 122.4 / 1.45 | 120.7 / 1.60 | 117.1 / 3.35 | 116.4 / 2.91 | 56.8 / 3.31 |
| a35 | 70.3 / 5.98 | 78.2 / 4.37 | 122.9 / 14.98 | 123.7 / 4.73 | 55.4 / 1.79 | 55.2 / 2.51 |
| a35_t0.55 | 145.5 / 5.85 | 143.0 / 6.14 | 141.7 / 10.70 | 145.3 / 6.34 | 132.4 / 17.76 | 137.3 / 28.81 |
| a70_t-0.55 | 124.1 / 1.64 | 122.8 / 1.94 | 119.9 / 1.78 | 114.6 / 3.16 | 115.0 / 2.94 | 54.1 / 3.34 |
| a70 | 71.0 / 5.46 | 116.4 / 9.46 | 120.8 / 14.98 | 123.2 / 2.55 | 56.9 / 1.42 | 53.2 / 1.56 |
| a70_t0.55 | 140.6 / 2.35 | 145.7 / 7.53 | 146.3 / 8.76 | 146.0 / 2.04 | 95.6 / 10.57 | 92.3 / 25.51 |

## 4. New gates (a)-(d)

### (a) saturation-vs-luminance coupling, r(sat, L) over masked stone px, gate r <= -0.5

| cat | worst pose | r | best pose | r | poses passing |
|---|---|---:|---|---:|---:|
| sapphire | a70 | -0.849 | a0_t0.55 | -0.960 | 9/9 |
| citrine | a70 | +0.403 | a35_t0.55 | -0.577 | 2/9 |

Sapphire passes everywhere: dark interior stays the saturated/bluer end (-0.85..-0.96).
Citrine is inverted at tilt 0 and at -0.55 (+0.18, +0.07, +0.40): its brighter interior is its
*more* saturated interior, i.e. the coupling the owner complained about is still absent there,
and the pre-fix shader had it right for citrine (-0.72..-0.75). This is a regression, not a fix.

### (b) achromatic bright field, frac(sat<60 & L>150) <= 5%

| cat | tilt 0 | tilt -0.55 | tilt +0.55 |
|---|---:|---:|---:|
| sapphire | 0.037, 0.029, 0.020 | 0.004, 0.004, 0.003 | 0.218, 0.204, 0.157 |
| citrine | 0.018, 0.028, 0.013 | 0.014, 0.004, 0.010 | 0.167, 0.165, 0.119 |

The +0.55 cells fail by 2.4-4.4x (11.9-21.8%): the top-up light turns a large achromatic-white
region on.

### (c) interior mean saturation (mask eroded 2 px) >= 110

| cat | min | max | poses passing |
|---|---:|---:|---:|
| sapphire | 129.0 | 230.9 | 9/9 |
| citrine | 141.1 | 213.4 | 9/9 |

Saturation is not the problem: both stones are strongly coloured (interior S 129-231).

### (d) TIR-bounce-ish vs non-TIR pixels

RULE (measured, not proxied): the lane's own shader debug channel. `capture2.mjs` role
`tirmask` hides the body material (`r.mats[0]`) and sets the proxy material's `u.dbg = 1`, so
the shader paints only the reflected/TIR contribution. Inside the frozen `dark.png` mask, a
pixel is TIR-bounce-ish when that debug render differs from the empty stage (`nogem.png`) by
|dL| >= 8; everything else is non-TIR. Medians are then read off the graded `front.png` of the
same pose. Coverage: yaw 0/35/70 at tilt 0 only — the lane captured no `tirmask` at +-0.55, so
those six cells are NOT MEASURED for (d).

| cat | pose | TIR frac | TIR L med | TIR S med | non-TIR L med | non-TIR S med | dL | dS |
|---|---|---:|---:|---:|---:|---:|---:|---:|
| sapphire | a0 | 0.577 | 72.9 | 217.2 | 64.4 | 207.0 | +8.5 | +10.2 |
| sapphire | a35 | 0.578 | 66.8 | 215.7 | 60.5 | 204.0 | +6.2 | +11.7 |
| sapphire | a70 | 0.581 | 65.9 | 215.7 | 59.7 | 205.5 | +6.2 | +10.1 |
| citrine | a0 | 0.561 | 116.6 | 205.4 | 120.6 | 208.5 | -4.0 | -3.1 |
| citrine | a35 | 0.563 | 109.7 | 189.3 | 119.5 | 203.6 | -9.8 | -14.3 |
| citrine | a70 | 0.571 | 111.0 | 199.4 | 120.4 | 204.0 | -9.4 | -4.6 |

Read: the debug channel lights 56-58% of the stone, so the split is coarse — it separates a
bright bounce field from a dark grazing fringe, not "interior reflection" from "surface".
Within it, sapphire's TIR pixels are slightly brighter and slightly more saturated (+6..+8 L,
+10..+12 S); citrine's are *darker and less saturated* than the rest (-4..-10 L, -3..-14 S).
So on citrine the reflected field still carries no colour relative to its surroundings — the
owner's finding persists in the category the fix was aimed at.

## 5. Committed vs new, same poses

| cat | pose | pale committed -> new | std min committed -> new | clip committed -> new | achro committed -> new | r committed -> new |
|---|---|---|---:|---:|---:|---:|
| sapphire | a0 | 0.072 -> 0.004 | 2.24 -> 1.17 | 0.0289 -> 0.0154 | 0.100 -> 0.037 | -0.980 -> -0.871 |
| sapphire | a35 | 0.078 -> 0.006 | 2.48 -> 1.08 | 0.0853 -> 0.0107 | 0.139 -> 0.029 | -0.985 -> -0.885 |
| sapphire | a70 | 0.075 -> 0.000 | 0.79 -> 0.90 | 0.0193 -> 0.0015 | 0.088 -> 0.020 | -0.985 -> -0.849 |
| citrine | a0 | 0.276 -> 0.004 | 1.87 -> 2.03 | 0.0533 -> 0.0113 | 0.031 -> 0.018 | -0.751 -> +0.181 |
| citrine | a35 | 0.277 -> 0.005 | 2.28 -> 1.79 | 0.1039 -> 0.0100 | 0.077 -> 0.028 | -0.740 -> +0.066 |
| citrine | a70 | 0.275 -> 0.000 | 0.85 -> 1.42 | 0.0323 -> 0.0016 | 0.030 -> 0.013 | -0.718 -> +0.403 |

| cat | committed total | new total | bar | verdict |
|---|---:|---:|---:|---|
| sapphire | 66 | 64 | 66 | **FAIL** (-2) |
| citrine | 62 | 64 | 62 | PASS (+2) |

Stone mean L collapsed with the fix: sapphire 141 -> 77-135 (64-74% of stone below L80 in the
tilt -0.55 cells), citrine 202 -> 102-141. L p95 237-250 -> 125-162 except in the +0.55 cells,
which blow to 255. The pale field was removed by removing the light, not by routing colour
into it: the value range that the committed look had is gone, and that is what the rubric
total is paying for (66 -> 64).

## 6. Verdict

**FAILED.** 6 of the 11 gate rows miss; the lane's own DONE agrees on the total but understates
two of the misses (it reports clip 13-15% where I measure up to 16.9%, and it does not flag that
citrine's r(sat,L) inverted).

| gate | bar | sapphire | citrine | overall |
|---|---|---|---|---|
| pale-lowinfo | <= 12% at every captured angle | 0.000-0.115 PASS (9/9) | 0.000-0.097 PASS (9/9) | **PASS** |
| band 7x7 std | >= 3.0 every band | 0.90-1.17 crown_top at tilt 0, 3/9 poses FAIL | 1.42-2.04, 7/9 poses FAIL | **FAIL** |
| neon | 0 | 0 (9/9) | 0 (9/9) | **PASS** |
| clip | <= 0.02 | 0.112-0.169 at +0.55, 3/9 FAIL | 0.093-0.133 at +0.55, 3/9 FAIL | **FAIL** |
| no bright band | every band L p50 <= 130 | 3-5 bands 131-146 at +0.55, 3/9 FAIL | 4-6 bands 133-147 at +0.55, 3/9 FAIL | **FAIL** |
| totals reproduce | exact | 64 = 64, per-criterion identical PASS | 64 = 64 PASS | **PASS** |
| totals vs bar | >= 66 / >= 62 | 64 FAIL | 64 PASS | **FAIL** |
| (a) r(sat,L) | <= -0.5 | -0.849..-0.960 PASS (9/9) | -0.436..+0.403, 2/9 pass FAIL | **FAIL** |
| (b) achro bright | <= 5% | 0.157-0.218 at +0.55, 3/9 FAIL | 0.119-0.167 at +0.55, 3/9 FAIL | **FAIL** |
| (c) interior mean S | >= 110 | 129.0-230.9 PASS (9/9) | 141.1-213.4 PASS (9/9) | **PASS** |
| (d) TIR split | report | 3 poses measured, 6 NOT MEASURED | same | **REPORTED** |

Deciding numbers: sapphire crown_top std 1.17 / 1.08 / 0.90 at yaw 0 / 35 / 70 (bar 3.0),
citrine mid_pavilion 2.03 / 1.79 / 1.42, culet 2.27 / 2.51 / 1.56, upper_pavilion 2.59 / 4.73 /
2.55 at yaw 0 / 35 / 70; clip 0.1693 (sap a0_t+0.55) and 0.1327 (cit a0_t+0.55) against 0.02;
citrine r(sat,L) +0.403 at a70 against the -0.5 bar; totals 64/64 against 66/62.

What the fix did achieve, and it is real: pale-lowinfo is 0.0-11.5% everywhere (committed
7.2-10.6% / 27.5-27.7% at yaw, claimed 32-85% at tilt), neon is 0, interiors are saturated,
and the totals reproduce byte-for-byte from the lane's own PNGs. What it did not achieve:
facet-to-facet structure at tilt 0 (both cats), any control of the +0.55 light (clip, achro,
bright bands), citrine's colour coupling, and it lost the committed look's value range and 2
points of the sapphire rubric.

Artifacts: `baseline_{cat}.json`, `baseline_rescore_{cat}.json`, `pre_angles/` +
`pre_angles.json`, `new_angles.json`, `new_tirmask.json`, `gates_new.json`, `new_md5.txt`,
`new_rescore_{cat}.json`.
