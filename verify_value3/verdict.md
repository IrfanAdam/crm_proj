# verify_value3 — table-blowout fix verification (round 6, value3)

Generated 2026-11-01 02:34:22 IST by `verify_value3/build_verdict.py` from measured JSON only.

## 0. Verdict

**NOT MEASURED — the value3 lane never signalled DONE.**

`lanes/value3/DONE` and `.hermes/tmp/round6/lanes/value3/DONE` were both absent on all 30 polls (60 s apart). The lane was still writing candidate captures (`r_try/v6`, `v7` at 02:31, `v8` opened at 02:32) when the poll budget ran out, so **no post-fix PNG exists that can be md5-frozen, re-scored, or gated**. Every post-fix gate below is therefore reported as NOT MEASURED rather than guessed.

What *is* measured and reproducible: both baselines (§2–§3), with the two independent instrument paths named in the brief.

## 1. Instruments (all new code, under `verify_value3/`)

| file | role |
|---|---|
| `det.py` | stone detectors — mask = sat>20 → largest 8-connected CC → holes filled, **per shot**; L = Rec.709 luma; sat = HSV S·255; 7×7 local std via uniform-filter moments |
| `gates.py` | PASS/FAIL per gate, per cat, per cell |
| `poll.py` | 60 s DONE poller, budget tracked in `poll_state.json` |
| `verify.py` | post-DONE: md5 manifest + `score.py … --peer --quiet` re-score + detectors on all cells |
| `build_verdict.py` | renders this file from the JSON |

Detection definitions, exactly as briefed and as implemented:

| metric | rule |
|---|---|
| pale-lowinfo | `L > 185 AND 7×7 std < 6` |
| clip | `L ≥ 250` |
| achro-bright | `sat < 60 AND L > 150` |
| neon | magenta `r>120 & b>120 & r>g+50 & b>g+50`; green `g>140 & g>r+60 & g>b+40` |
| bands | 6 vertical zones of the mask bbox: 0–.18 / .18–.32 / .32–.38 / .38–.62 / .62–.82 / .82–1.0 |
| band std | population std of the 6 band L p50s (facet-band separation); per-band 7×7 std medians are carried in every JSON as INFO |
| dark bands | the same 6 band L p50s, from `dark*.png`, each ≤ 130 |

Scope note: gates are scored on stone cells (`front*`, `dark*`). `txoff`, `dispoff`, `chart` and `nogem` are instruments/controls — measured in the JSON, not gated.

## 2. Baseline A — committed `runs/` (the 66 / 62 anchor)

`python3 prototype/gems/score.py .hermes/tmp/round6/runs/<cat> --color <cat> --peer <other> --quiet`

- **sapphire**: reproduced **66/110** vs committed claim **66/110** — exact match
- **citrine**: reproduced **62/110** vs committed claim **62/110** — exact match

Detectors on the same committed shots (whole-shot mask, 1214×520):

| cat · role | L p50 | L95 | sat med | 7×7 std med | band std | pale % | clip % | achro % | neon % |
|---|---|---|---|---|---|---|---|---|---|
| sapphire · chart | 165.9 | 208.6 | 73.8 | 9.70 | 32.7 | 12.43 | 1.22 | 6.09 | 0.000 |
| sapphire · dark | 114.4 | 193.4 | 166.7 | 9.61 | 31.5 | 0.83 | 2.73 | 5.13 | 0.000 |
| sapphire · dispoff | 146.8 | 249.9 | 133.3 | 9.70 | 71.2 | 7.33 | 4.99 | 15.56 | 0.000 |
| sapphire · front | 141.0 | 236.1 | 135.5 | 9.19 | 51.2 | 7.27 | 2.99 | 9.92 | 0.000 |
| sapphire · repeat | 140.8 | 236.3 | 136.0 | 9.33 | 51.8 | 7.19 | 3.00 | 10.01 | 0.000 |
| sapphire · txoff | 141.3 | 207.2 | 101.2 | 1.36 | 32.1 | 0.80 | 0.13 | 8.20 | 0.000 |
| citrine · chart | 173.0 | 239.4 | 88.3 | 11.68 | 38.2 | 13.94 | 3.33 | 6.32 | 0.000 |
| citrine · dark | 161.9 | 214.1 | 173.0 | 6.70 | 45.1 | 7.83 | 2.10 | 2.28 | 0.000 |
| citrine · dispoff | 202.6 | 249.8 | 148.0 | 5.83 | 96.2 | 27.84 | 3.99 | 1.94 | 0.000 |
| citrine · front | 201.5 | 250.0 | 142.0 | 5.41 | 75.0 | 27.00 | 5.13 | 2.81 | 0.000 |
| citrine · repeat | 201.0 | 250.0 | 142.0 | 5.41 | 75.2 | 27.09 | 5.07 | 2.81 | 0.000 |
| citrine · txoff | 147.9 | 167.3 | 26.2 | 0.73 | 2.6 | 0.13 | 0.02 | 35.45 | 0.000 |

### Baseline A gate state (committed)

✗ = gate fails at baseline.

| cell | pale-lowinfo % (≤12) | clip % (≤2) | achro-bright % (≤5) | L95 (200–245) | band std (≥5) | neon px | dark-band max L p50 (≤130) | cell verdict |
|---|---|---|---|---|---|---|---|---|
| dark | 0.83 | 2.73 ✗ | 5.13 ✗ | 193.4 ✗ | 31.5 | 0.000 | 138.8 ✗ | **FAIL** |
| front | 7.27 | 2.99 ✗ | 9.92 ✗ | 236.1 | 51.2 | 0.000 | n/a (light) | **FAIL** |

### Baseline A gate state — citrine

✗ = gate fails at baseline.

| cell | pale-lowinfo % (≤12) | clip % (≤2) | achro-bright % (≤5) | L95 (200–245) | band std (≥5) | neon px | dark-band max L p50 (≤130) | cell verdict |
|---|---|---|---|---|---|---|---|---|
| dark | 7.83 | 2.10 ✗ | 2.28 | 214.1 | 45.1 | 0.000 | 180.6 ✗ | **FAIL** |
| front | 27.00 ✗ | 5.13 ✗ | 2.81 | 250.0 ✗ | 75.0 | 0.000 | n/a (light) | **FAIL** |

## 3. Baseline B — checkpoint build `ad74d419` (the tree's uncommitted build)

No DONE ⇒ `verify.py` did not run against `lanes/value3/`, so the checkpoint was taken from **the sibling lane's own captures of that exact build**: `lanes/value2/{sapphire,citrine}/`, whose shipped bytes the lane's `DONE` records as `md5 ad74d41976447c38df55ced0249e3a1a` — byte-identical to the `src/components/GemReward/gem-shader.js` sitting in the tree now (`md5 src/components/GemReward/gem-shader.js` → `ad74d41976447c38df55ced0249e3a1a`, `md5 .hermes/tmp/round6/lanes/value2/ship_ad74d419.js` → same).

Re-scored here, not trusted: `score.py lanes/value2/<cat> --color <cat> --peer lanes/value2/<other> --quiet`

- **sapphire**: reproduced **64/110** vs lane claim **64/110** — exact match
- **citrine**: reproduced **64/110** vs lane claim **64/110** — exact match

This is the cell grid the fix has to clear: 18 stone cells per cat (3 spins × 3 tilts × light/dark).

### Baseline B gate state — sapphire (build `ad74d419`)

✗ = gate fails on this build. 36/36 gated cells fail.

| cell | pale-lowinfo % (≤12) | clip % (≤2) | achro-bright % (≤5) | L95 (200–245) | band std (≥5) | neon px | dark-band max L p50 (≤130) | cell verdict |
|---|---|---|---|---|---|---|---|---|
| dark | 0.41 | 1.53 | 3.29 | 148.3 ✗ | 13.8 | 0.000 | 77.5 | **FAIL** |
| dark_a35 | 0.58 | 1.07 | 2.54 | 147.6 ✗ | 14.8 | 0.000 | 84.0 | **FAIL** |
| dark_a35_t-0.55 | 0.00 | 0.00 | 0.09 | 132.6 ✗ | 9.9 | 0.000 | 78.1 | **FAIL** |
| dark_a35_t0.55 | 9.29 | 15.20 ✗ | 20.06 ✗ | 255.0 ✗ | 10.1 | 0.000 | 136.2 ✗ | **FAIL** |
| dark_a70 | 0.00 | 0.13 | 1.63 | 140.1 ✗ | 15.9 | 0.000 | 86.2 | **FAIL** |
| dark_a70_t-0.55 | 0.02 | 0.00 | 0.04 | 121.0 ✗ | 10.8 | 0.000 | 78.4 | **FAIL** |
| dark_a70_t0.55 | 6.65 | 11.07 ✗ | 15.40 ✗ | 255.0 ✗ | 20.2 | 0.000 | 136.3 ✗ | **FAIL** |
| dark_t-0.55 | 0.50 | 0.00 | 0.00 | 128.5 ✗ | 10.9 | 0.000 | 78.8 | **FAIL** |
| dark_t0.55 | 11.46 | 16.79 ✗ | 21.32 ✗ | 255.0 ✗ | 9.4 | 0.000 | 141.2 ✗ | **FAIL** |
| front | 0.41 | 1.53 | 3.64 | 150.8 ✗ | 14.1 | 0.000 | n/a (light) | **FAIL** |
| front_a35 | 0.58 | 1.07 | 2.88 | 155.2 ✗ | 16.9 | 0.000 | n/a (light) | **FAIL** |
| front_a35_t-0.55 | 0.00 | 0.00 | 0.35 | 133.9 ✗ | 9.9 | 0.000 | n/a (light) | **FAIL** |
| front_a35_t0.55 | 9.35 | 15.34 ✗ | 20.44 ✗ | 255.0 ✗ | 9.7 | 0.000 | n/a (light) | **FAIL** |
| front_a70 | 0.00 | 0.15 | 2.04 | 144.4 ✗ | 18.9 | 0.000 | n/a (light) | **FAIL** |
| front_a70_t-0.55 | 0.02 | 0.00 | 0.31 | 125.0 ✗ | 10.8 | 0.000 | n/a (light) | **FAIL** |
| front_a70_t0.55 | 6.68 | 11.20 ✗ | 15.70 ✗ | 255.0 ✗ | 23.9 | 0.000 | n/a (light) | **FAIL** |
| front_t-0.55 | 0.50 | 0.00 | 0.35 | 132.6 ✗ | 10.9 | 0.000 | n/a (light) | **FAIL** |
| front_t0.55 | 11.51 | 16.93 ✗ | 21.74 ✗ | 255.0 ✗ | 11.5 | 0.000 | n/a (light) | **FAIL** |

### Baseline B gate state — citrine (build `ad74d419`)

✗ = gate fails on this build. 36/36 gated cells fail.

| cell | pale-lowinfo % (≤12) | clip % (≤2) | achro-bright % (≤5) | L95 (200–245) | band std (≥5) | neon px | dark-band max L p50 (≤130) | cell verdict |
|---|---|---|---|---|---|---|---|---|
| dark | 0.36 | 1.10 | 1.30 | 145.3 ✗ | 27.3 | 0.000 | 123.3 | **FAIL** |
| dark_a35 | 0.55 | 1.00 | 2.38 | 156.3 ✗ | 28.1 | 0.000 | 123.4 | **FAIL** |
| dark_a35_t-0.55 | 0.00 | 0.00 | 0.10 | 144.4 ✗ | 23.8 | 0.000 | 124.4 | **FAIL** |
| dark_a35_t0.55 | 8.07 | 13.08 ✗ | 16.04 ✗ | 255.0 ✗ | 9.8 | 0.000 | 145.4 ✗ | **FAIL** |
| dark_a70 | 0.00 | 0.15 | 0.75 | 144.5 ✗ | 28.9 | 0.000 | 123.0 | **FAIL** |
| dark_a70_t-0.55 | 0.29 | 0.00 | 0.77 | 142.8 ✗ | 24.5 | 0.000 | 124.1 | **FAIL** |
| dark_a70_t0.55 | 6.29 | 9.22 ✗ | 11.41 ✗ | 255.0 ✗ | 25.3 | 0.000 | 146.3 ✗ | **FAIL** |
| dark_t-0.55 | 0.80 | 0.00 | 1.06 | 144.5 ✗ | 24.4 | 0.000 | 124.6 | **FAIL** |
| dark_t0.55 | 9.46 | 13.13 ✗ | 16.23 ✗ | 255.0 ✗ | 9.8 | 0.000 | 145.2 ✗ | **FAIL** |
| front | 0.37 | 1.12 | 1.64 | 149.0 ✗ | 28.2 | 0.000 | n/a (light) | **FAIL** |
| front_a35 | 0.55 | 1.00 | 2.76 | 161.9 ✗ | 28.8 | 0.000 | n/a (light) | **FAIL** |
| front_a35_t-0.55 | 0.00 | 0.00 | 0.35 | 144.7 ✗ | 23.8 | 0.000 | n/a (light) | **FAIL** |
| front_a35_t0.55 | 8.35 | 13.16 ✗ | 16.43 ✗ | 255.0 ✗ | 4.8 ✗ | 0.000 | n/a (light) | **FAIL** |
| front_a70 | 0.00 | 0.16 | 1.15 | 147.7 ✗ | 30.4 | 0.000 | n/a (light) | **FAIL** |
| front_a70_t-0.55 | 0.29 | 0.00 | 1.04 | 145.6 ✗ | 24.6 | 0.000 | n/a (light) | **FAIL** |
| front_a70_t0.55 | 6.44 | 9.25 ✗ | 11.77 ✗ | 255.0 ✗ | 24.2 | 0.000 | n/a (light) | **FAIL** |
| front_t-0.55 | 0.80 | 0.00 | 1.40 | 146.1 ✗ | 24.4 | 0.000 | n/a (light) | **FAIL** |
| front_t0.55 | 9.67 | 13.28 ✗ | 16.59 ✗ | 255.0 ✗ | 4.1 ✗ | 0.000 | n/a (light) | **FAIL** |

## 4. Post-fix gates — value3 build

| gate | threshold | sapphire | citrine | status |
|---|---|---|---|---|
| pale-lowinfo | ≤12 % | — | — | **NOT MEASURED** |
| clip | ≤2 % | — | — | **NOT MEASURED** |
| achro-bright | ≤5 % | — | — | **NOT MEASURED** |
| L95 | 200–245 | — | — | **NOT MEASURED** |
| band std | ≥5.0 | — | — | **NOT MEASURED** |
| neon | 0 px | — | — | **NOT MEASURED** |
| dark bands L p50 | all ≤130 | — | — | **NOT MEASURED** |
| score total | reproduce claim exactly, ≥66 / ≥62 | — | — | **NOT MEASURED** |

Deciding baseline numbers those gates will be compared against (same detectors, same cells):

| cat · cell | pale % | clip % | achro % | L95 | band std | worst dark band L p50 |
|---|---|---|---|---|---|---|
| sapphire · front_t0.55 | 11.51 | 16.93 | 21.74 | 255.0 | 11.5 | n/a (light) |
| sapphire · front_t-0.55 | 0.50 | 0.00 | 0.35 | 132.6 | 10.9 | n/a (light) |
| sapphire · front | 0.41 | 1.53 | 3.64 | 150.8 | 14.1 | n/a (light) |
| sapphire · dark_t0.55 | 11.46 | 16.79 | 21.32 | 255.0 | 9.4 | 141.2 |
| citrine · front_t0.55 | 9.67 | 13.28 | 16.59 | 255.0 | 4.1 | n/a (light) |
| citrine · front_t-0.55 | 0.80 | 0.00 | 1.40 | 146.1 | 24.4 | n/a (light) |
| citrine · front | 0.37 | 1.12 | 1.64 | 149.0 | 28.2 | n/a (light) |
| citrine · dark_t0.55 | 9.46 | 13.13 | 16.23 | 255.0 | 9.8 | 145.2 |

## 5. Annex — provisional look at the lane's in-flight captures (NOT gated)

Measured with the same `det.py`, on `full.png` of every `*_front` cell the lane had written. **Build identity of these directories is unverified** (no DONE, no shader md5 sidecar, and the lane was still opening new variant dirs while this was written), so these numbers are context only — they cannot PASS or FAIL anything.

| run dir | cat · cell | L p50 | L95 | sat med | band std | pale % | clip % | achro % | neon % |
|---|---|---|---|---|---|---|---|---|---|
| `r_try/v7` | citrine_t+0.00_s0 | 121.9 | 246.3 | 154.8 | 71.0 | 14.44 | 2.79 | 5.22 | 0.006 |
| `r_try/v7` | citrine_t+0.55_s0 | 78.8 | 252.8 | 106.7 | 64.8 | 14.58 | 16.92 | 23.96 | 0.008 |
| `r_try/v7` | citrine_t-0.55_s0 | 185.7 | 237.8 | 183.9 | 81.0 | 29.69 | 2.04 | 2.58 | 0.000 |
| `r_try/v7` | sapphire_t+0.00_s0 | 64.1 | 191.4 | 232.7 | 43.8 | 1.31 | 0.00 | 2.58 | 0.000 |
| `r_try/v7` | sapphire_t+0.55_s0 | 62.4 | 194.0 | 222.9 | 42.7 | 12.63 | 0.00 | 2.34 | 0.000 |
| `r_try/v7` | sapphire_t-0.55_s0 | 120.6 | 177.5 | 227.9 | 53.2 | 1.54 | 0.00 | 0.31 | 0.000 |
| `r_p1` | citrine_t+0.00_s0 | 127.1 | 157.1 | 205.8 | 29.1 | 0.43 | 1.11 | 1.58 | 0.000 |
| `r_p1` | citrine_t+0.55_s0 | 142.7 | 255.0 | 168.7 | 6.0 | 9.98 | 13.56 | 16.93 | 0.000 |
| `r_p1` | citrine_t-0.55_s0 | 132.0 | 147.9 | 221.6 | 26.5 | 0.83 | 0.00 | 1.33 | 0.000 |
| `r_p1` | sapphire_t+0.00_s0 | 82.2 | 152.2 | 211.5 | 21.3 | 0.48 | 1.64 | 3.72 | 0.000 |
| `r_p1` | sapphire_t+0.55_s0 | 132.9 | 255.0 | 152.0 | 9.5 | 11.76 | 16.92 | 21.15 | 0.000 |
| `r_p1` | sapphire_t-0.55_s0 | 93.3 | 136.9 | 220.8 | 17.2 | 0.23 | 0.00 | 0.29 | 0.000 |
| `r_pA` | citrine_t+0.00_s0 | 124.2 | 156.8 | 205.7 | 29.3 | 0.43 | 1.11 | 1.56 | 0.000 |
| `r_pA` | citrine_t+0.55_s0 | 145.9 | 255.0 | 163.4 | 7.1 | 10.01 | 13.57 | 16.75 | 0.000 |
| `r_pA` | citrine_t-0.55_s0 | 128.9 | 147.9 | 221.6 | 26.0 | 0.78 | 0.00 | 1.27 | 0.000 |
| `r_pA` | sapphire_t+0.00_s0 | 77.3 | 152.9 | 213.3 | 19.5 | 0.48 | 1.63 | 3.79 | 0.000 |
| `r_pA` | sapphire_t+0.55_s0 | 141.8 | 255.0 | 138.6 | 7.4 | 11.86 | 17.03 | 21.37 | 0.000 |
| `r_pA` | sapphire_t-0.55_s0 | 87.0 | 135.7 | 225.2 | 15.1 | 0.33 | 0.00 | 0.29 | 0.000 |

Generated read: of 18 provisional cells, 18 would fail at least one gate. 6 of those are tilt +0.55 cells — the exact defect this lane was dispatched to fix:

- `r_try/v7` · citrine_t+0.00_s0: pale 14.4 % (≤12), clip 2.8 % (≤2), achro 5.2 % (≤5), L95 246.3 (200–245), neon 0.006 %
- `r_try/v7` · citrine_t+0.55_s0: pale 14.6 % (≤12), clip 16.9 % (≤2), achro 24.0 % (≤5), L95 252.8 (200–245), neon 0.008 %
- `r_try/v7` · citrine_t-0.55_s0: pale 29.7 % (≤12), clip 2.0 % (≤2)
- `r_try/v7` · sapphire_t+0.00_s0: L95 191.4 (200–245)
- `r_try/v7` · sapphire_t+0.55_s0: pale 12.6 % (≤12), L95 194.0 (200–245)
- `r_try/v7` · sapphire_t-0.55_s0: L95 177.5 (200–245)
- `r_p1` · citrine_t+0.00_s0: L95 157.1 (200–245)
- `r_p1` · citrine_t+0.55_s0: clip 13.6 % (≤2), achro 16.9 % (≤5), L95 255.0 (200–245)
- `r_p1` · citrine_t-0.55_s0: L95 147.9 (200–245)
- `r_p1` · sapphire_t+0.00_s0: L95 152.2 (200–245)
- `r_p1` · sapphire_t+0.55_s0: clip 16.9 % (≤2), achro 21.2 % (≤5), L95 255.0 (200–245)
- `r_p1` · sapphire_t-0.55_s0: L95 136.9 (200–245)
- `r_pA` · citrine_t+0.00_s0: L95 156.8 (200–245)
- `r_pA` · citrine_t+0.55_s0: clip 13.6 % (≤2), achro 16.8 % (≤5), L95 255.0 (200–245)
- `r_pA` · citrine_t-0.55_s0: L95 147.9 (200–245)
- `r_pA` · sapphire_t+0.00_s0: L95 152.9 (200–245)
- `r_pA` · sapphire_t+0.55_s0: clip 17.0 % (≤2), achro 21.4 % (≤5), L95 255.0 (200–245)
- `r_pA` · sapphire_t-0.55_s0: L95 135.7 (200–245)

This is a snapshot of an unfinished build, not a verdict on it: the directories carry no shader md5, and variant numbering (`v6` → `v8`) was still advancing when the poll budget expired.

## 6. Poll log

Budget: 30 polls × 60 s. Used: **30**. DONE observed: **no**.

First poll 02:06:07, last poll 02:32:16 (29 min wall clock).

## 7. What the lane must produce for this verdict to be finishable

1. `lanes/value3/DONE` (or `.hermes/tmp/round6/lanes/value3/DONE`) with the claimed `score.py` totals per cat and the shader md5.
2. Per-cat cell dirs holding the frozen-angle set (`front`, `repeat`, `txoff`, `dispoff`, `chart`, `dark`, `nogem`) plus every tilt/spin cell, with each cat's `score.json`.

Then, unchanged:

```
python3 verify_value3/verify.py        # md5 manifest + score.py --peer --quiet + det on all cells
python3 verify_value3/gates.py verify_value3/new/dets.json --json verify_value3/new/gates.json
python3 verify_value3/build_verdict.py
```

## 8. Limits of this report

- No post-fix gate is decided. The absence of DONE is the finding.
- Baseline A is the committed `runs/` set (0° light/dark + probes); baseline B is the checkpoint build's 18-cell grid via the sibling's captures. They are not the same pose set, so their totals (66/62 vs 64/64) are comparable as build quality, not as a like-for-like cell grid.
- Detector mask is per-shot (brief); the lane's own instrument masks against the opaque `silh` twin instead, so a few percent of absolute difference against its numbers is expected even on identical PNGs.

