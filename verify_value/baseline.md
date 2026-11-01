# verify_value — baseline (committed look, `.hermes/tmp/round6/runs/`)

Instrument: `prototype/gems/score.py` (never modified). Detectors: `verify_value/bands.py`
(own code, frozen band spec from the brief). Raw: `baseline_sapphire.json`,
`baseline_citrine.json`. PNG md5s: `baseline_md5.txt`.

## 0. Baseline reproduction (sanity that the committed look is 66/62)

| cat | committed `score.json` | my re-run `--peer --quiet` | match |
|-----|----------------------:|---------------------------:|:-----:|
| sapphire | 66/110 | 66/110 (`baseline_rescore_sapphire.json`) | exact |
| citrine  | 62/110 | 62/110 (`baseline_rescore_citrine.json`) | exact |

Repo state at baseline: `git status` clean, `src/components/GemReward/gem-shader.js`
md5 `f854e086501c9213109339fcd5d33229` (committed bytes, no lane edits yet).

## 1. Mask (frozen spec: dark.png S>20, largest 8-CC, holes filled)

Both cats: 32,212–32,272 px, bbox `[147,56]–[444,240]`, height 185 px. Silhouette
profile is a clean round-gem: narrow table (row coverage 0.01 at f=0.00), max width
0.97 at f≈0.30–0.38, tapering to 0.00 at f=1.00. Sanity: the same mask from `txoff.png`
S>18 (`score.py`'s seed) is only 20,325 px / IoU 0.624 for sapphire — `dark.png` is the
better seed as the spec states (it catches the unsaturated dark regions).

Band rows are fractions of bbox HEIGHT: crown_top 0–41, crown_lower 41–70,
girdle 70–85, upper_pavilion 85–126, lower_pavilion 126–159, culet 159–185.

Statistics are taken on `front.png` (the graded look) with this mask. A parallel
`dark.png` pass is kept in `alt_dark` for auditability; gates are judged on `front`
(the dark-scheme shot cannot reach global L p95 ≥ 235 by construction: 193.4 / 214.1).

## 2. Baseline bands (front.png, stone px only)

| cat | band | %stone | L p50 | L p5 | L p95 | S med | 7x7 std med |
|-----|------|-------:|------:|-----:|------:|------:|------------:|
| sapphire | crown_top | 0.137 | 73.07 | 63.78 | 254.14 | 197.11 | 2.771 |
| sapphire | crown_lower | 0.231 | 160.28 | 67.07 | 252.24 | 112.65 | 20.44 |
| sapphire | girdle | 0.225 | 138.13 | 116.86 | 223.28 | 144.36 | 15.688 |
| sapphire | upper_pavilion | 0.169 | 190.73 | 146.85 | 231.59 | 86.70 | 9.020 |
| sapphire | lower_pavilion | 0.094 | 56.71 | 45.44 | 184.04 | 216.00 | 3.895 |
| sapphire | culet | 0.034 | 56.01 | 45.44 | 115.89 | 225.18 | 5.930 |
| citrine | crown_top | 0.137 | 90.57 | 78.39 | 250.74 | 156.61 | 7.198 |
| citrine | crown_lower | 0.231 | 216.78 | 82.82 | 250.31 | 132.00 | 20.241 |
| citrine | girdle | 0.225 | 248.36 | 142.67 | 250.16 | 92.00 | 2.867 |
| citrine | upper_pavilion | 0.169 | 245.05 | 68.76 | 250.09 | 112.00 | 3.224 |
| citrine | lower_pavilion | 0.093 | 73.22 | 61.40 | 103.96 | 168.75 | 1.931 |
| citrine | culet | 0.034 | 73.00 | 61.90 | 161.80 | 176.71 | 5.951 |

## 3. Baseline globals

| cat | L p5 | L p95 | L p50 | clip (L≥250) | pale-lowinfo | neon | slab frac |
|-----|-----:|------:|------:|-------------:|-------------:|-----:|----------:|
| sapphire | 55.63 | 237.76 | 141.07 | 0.03108 | 0.07325 | 0 | 0.2671 |
| citrine  | 67.98 | 250.09 | 202.26 | 0.05439 | 0.27055 | 0 | 0.1460 |

## 4. Baseline gate read (what the lane has to fix)

| gate | sapphire | citrine |
|------|----------|---------|
| crown_top std ≥4.0 & L p50 80..130 | **FAIL** (2.771, 73.07) | PASS (7.198, 90.57) |
| lower_pavilion std ≥4.0 & L p50 80..130 | **FAIL** (3.895, 56.71) | **FAIL** (1.931, 73.22) |
| upper_pavilion S ≥110, L p50 ≤185, std ≥6 | **FAIL** (86.70, 190.73, 9.020) | **FAIL** (112.00, 245.05, 3.224) |
| global L p5 ≤75 & p95 ≥235 | PASS (55.63, 237.76) | PASS (67.98, 250.09) |
| neon 0 | PASS (0) | PASS (0) |
| clip ≤0.02 | **FAIL** (0.0311) | **FAIL** (0.0544) |
| slab ≤0.25 / 0.28 | **FAIL** (0.2671) | PASS (0.1460) |
| score total ≥66 / ≥62, exact | 66 | 62 |

The baseline confirms the diagnosis in the brief: both stones' lower pavilion is a
dark, flat slab (L p50 56–73, 7x7 std 1.9–3.9), and the upper pavilion reads either
deep-and-unsaturated (sapphire S 86.7) or blown out (citrine L p50 245 with std 3.2 —
pale, empty, 27% of all stone pixels are pale-lowinfo).
