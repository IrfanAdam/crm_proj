# verify_value — verdict: **FAILED** (value rebalance reverted; committed look 66/62 stands)

Sibling signal: `lanes/value/DONE` = **FAILED**, claim *"fix (reverted)"*, tree at committed bytes.
Verified here with own detectors (`verify_value/bands.py`, frozen band spec), the untouched
instrument (`prototype/gems/score.py`, never modified), and md5 comparison throughout.
No src edits, no git, no browser, nothing written outside `verify_value/`.

Baseline record and detector provenance: `verify_value/baseline.md`.

---

## 1. State and md5 checks

| check | expected | measured | result |
|---|---|---|---|
| `src/components/GemReward/gem-shader.js` md5 | `f854e086501c9213109339fcd5d33229` | `f854e086501c9213109339fcd5d33229` | **PASS** |
| `git status` tracked modifications | none | none (only `?? lanes/value/`, `?? verify_value/`) | **PASS** — revert is real at file level |
| `runs/` restored byte-identical | yes | md5 diff vs `baseline_md5.txt`: empty, all 18 PNGs | **PASS** |
| `runs/` vs `runs_baseline_00/` (front) | identical | mean\|d\| **0.000**, p99 0.0 | **PASS** |
| lane baseline PNGs = committed bytes | yes | `baseline_runs/{sap,cit}/front.png` md5 `9d5908b8…` / `491cea15…` = committed | **PASS** — their band baseline is measured on committed pixels |
| fix-set PNG md5s vs DONE claim | sap front `8f92250d…`, cit front `aa607d62…` | match exactly (also repeat `8991478c…` / `043d7a96…`) | **PASS** |
| DONE claim *"re-render verified vs runs_baseline_00: mean\|d\| 0.012/0.124"* | ≤0.13 | **1.299 / 1.301** | **NOT REPRODUCED** (see §2) |

## 2. The one failed claim: the revert re-render

`lanes/value/committed_on_tree/sapphire_front_committedcode{,_b}.png` are **not** the committed
look. Against `.hermes/tmp/round6/runs/sapphire/front.png`:

| metric | committed front | committed_on_tree a | committed_on_tree b |
|---|---|---|---|
| mean\|d\| | — | 1.299 | 1.301 |
| p99\|d\| | — | 70.0 | 70.0 |
| stone L p5 / p50 | 55.6 / 141.0 | **116.5** / 162.3 | **116.5** / 162.3 |
| stone S median | 135 | **85** | **85** |
| crown_top 7x7 std | 2.77 | **1.03** | 1.03 |
| lower_pavilion L50 / std | 56.7 / 3.90 | **119.0 / 1.31** | 119.0 / 1.31 |

Silhouette and pose are identical (own-mask bbox `x[147,444] y[57,240]`, 32.1k px), so this is a
render-state difference, not framing: shadows lifted to 116, saturation down 50 points, crown flat.
Visually it is a washed, low-contrast gem, not the committed deep-navy-pavilion / electric-crown look.
Root cause is almost certainly a capture taken in a non-settled or stale-module state.

Consequence: that render **cannot** be used as evidence of the revert. The revert is instead
established by the two checks that do hold — tracked-file md5 equality and `git status` clean,
plus `runs/` byte-identical to the committed reference. Note also that the within-session pair
a-vs-b is 0.042, so the artifact is stable; it is simply not the committed look.

Effect on the lane's own report: none of its deciding numbers depend on this file (its baseline
column comes from `baseline_runs/`, which **is** committed bytes). It is a documentation defect,
not a number defect.

## 3. Instrument re-run (`score.py --peer --quiet`, out → `verify_value/new_rescore_*.json`)

| cat | lane `score.json` | my re-run | match |
|-----|------------------:|----------:|:-----:|
| sapphire | 64/110 | **64/110** | exact |
| citrine  | 58/110 | **58/110** | exact |

Peer = the other cat's fix-run dir. Both reproduce the claim exactly, and both are **below** the
committed 66/62 floor (`baseline_rescore_*.json` re-confirms 66/62 on `runs/`).

Where the 66→64 / 62→58 went (criteria deltas, my two runs):

- sapphire: #2 6→4 (shadow/DR range narrowed — p5 lifted), #4 3→1, #6 3→1; offset by #7 8→10, #9 8→10.
- citrine: #1 6→4 (edge/acutance), #4 3→1, #6 3→1; offset by #9 8→10.

So the fix bought "tells" and clipping headroom (#7/#9) but paid two stops of shadow range (#2) and
lost transparency/chart response (#4/#6) — the same shape of cost the darkcaps lane hit.

## 4. Gate table (frozen band spec, `front.png`, mask from `dark.png` S>20)

Deciding numbers only; full band tables in §5 and `baseline.md`.

| gate | sapphire committed → new | citrine committed → new | result |
|---|---|---|---|
| crown_top: std ≥4.0 **and** L p50 80..130 | std 2.77 → **6.07**, L50 73.1 → **86.4** | std 7.20 → 10.64, L50 90.6 → 106.8 | **PASS both** (was FAIL sap / PASS cit) |
| lower_pavilion: std ≥4.0 **and** L p50 80..130 | std 3.90 → **6.49** ✓, L50 56.7 → **71.6** ✗ (8.4 short) | std 1.93 → **6.07** ✓, L50 73.2 → **91.4** ✓ | **FAIL** — sapphire L50 still under the 80 floor |
| upper_pavilion: S ≥110, L p50 ≤185, std ≥6 | S 86.7 → **101.8** ✗ (8.2 short), L50 190.7 → 179.4 ✓, std 9.02 → 20.11 ✓ | S 112.0 → 153.0 ✓, L50 245.1 → **207.0** ✗ (22 over), std 3.22 → 14.31 ✓ | **FAIL both** — sapphire under-saturated, citrine still blown out |
| global L p5 ≤75 **and** p95 ≥235 | p5 55.6 → 66.3 ✓, p95 237.8 → **228.9** ✗ | p5 68.0 → **79.7** ✗, p95 250.1 → 248.6 ✓ | **FAIL both — regression**: both passed at baseline |
| neon in-mask = 0 | 0 → 0 | 0 → 0 | **PASS** |
| clip ≤0.02 (spec: L ≥ 250) | 0.0311 → **0.0210** ✗ (marginal) | 0.0544 → **0.0242** ✗ | **FAIL** (see §6 — the lane's PASS uses a different definition) |
| slab ≤0.25 / 0.28 | 0.2671 → **0.0910** ✓ | 0.1460 → **0.0124** ✓ | **PASS** — the strongest result of the fix (slab dissolved both cats) |
| totals reproduce exactly **and** ≥66/62 | 64 exact, **−2** | 58 exact, **−4** | **FAIL** |

Count: 3 gates PASS (neon, slab, crown_top), 5 FAIL. The decisive failures are the sheet gate
(−2/−4) and the **global-range regression** — the fix gave up a gate that already passed in both
cats to buy band structure.

## 5. Bands, committed → new (L p50 / 7x7 std med / S med)

| cat | band | committed | new | Δ |
|---|---|---|---|---|
| sapphire | crown top | 73.1 / 2.77 / 197.1 | 86.4 / 6.07 / 187.6 | +13.3 L, **+3.30 std** |
| sapphire | crown lower | 160.3 / 20.44 / 112.7 | 141.0 / 22.03 / 139.4 | −19.3 L, +1.59 std |
| sapphire | girdle | 138.1 / 15.69 / 144.4 | 133.8 / 22.29 / 151.6 | −4.3 L, +6.60 std |
| sapphire | upper pavilion | 190.7 / 9.02 / **86.7** | 179.4 / **20.11** / 101.8 | −11.3 L, **+11.09 std**, +15.1 sat |
| sapphire | lower pavilion | **56.7** / **3.90** / 216.0 | **71.6** / **6.49** / 200.3 | +14.9 L, +2.59 std |
| sapphire | culet | 56.0 / 5.93 / 225.2 | 71.7 / 9.03 / 201.6 | +15.7 L, +3.10 std |
| citrine | crown top | 90.6 / 7.20 / 156.6 | 106.8 / 10.64 / 176.7 | +16.2 L, +3.44 std |
| citrine | crown lower | 216.8 / 20.24 / 132.0 | 182.8 / 23.59 / 168.0 | −34.0 L, +3.35 std |
| citrine | girdle | 248.4 / 2.87 / 92.0 | 202.7 / 13.56 / 159.0 | −45.7 L, **+10.69 std** |
| citrine | upper pavilion | 245.1 / 3.22 / 112.0 | 207.0 / **14.31** / 153.0 | −38.1 L, **+11.09 std** |
| citrine | lower pavilion | 73.2 / **1.93** / 168.8 | 91.4 / **6.07** / 190.6 | +18.2 L, +4.14 std |
| citrine | culet | 73.0 / 5.95 / 176.7 | 91.0 / 9.98 / 199.3 | +18.0 L, +4.03 std |

Globals: sapphire pale-lowinfo 0.0733 → **0.0122**, clip 0.0311 → 0.0210, p5 55.6 → 66.3, p95 237.8 → 228.9.
Citrine pale-lowinfo 0.2706 → **0.0486**, clip 0.0544 → 0.0242, p5 68.0 → 79.7, p95 250.1 → 248.6.

Every one of the two stones' six bands gains local std — structure recovery is real
(all 12 bands up; pavilion bands ×1.7–4.4, largest citrine girdle 2.87 → 13.56 = ×4.7;
thinnest sapphire crown_lower 20.44 → 22.03 = ×1.08). The failure is placement, not structure: the dark end stops short
of the 80 floor (sapphire lower pavilion 71.6) and the pale end stops short of the colour target
(sapphire upper pavilion sat 101.8; citrine upper pavilion 207 vs ≤185), while the p95/p5 endpoints
the fix was told to keep are what it spent.

## 6. Detector validation and one definitional defect

- **Cross-implementation agreement.** Running the implementer's own meter (`lanes/value/bands.py`)
  on the same committed pixels reproduces my numbers: crown_top L50 73.1/73.07, girdle 138.1/138.13,
  lower_pav 56.7/56.71, culet 56.0/56.01, upper_pav 191.1/190.73; std within 0.13; global L5/L95
  55.6/55.63 and 237.8/237.76. The only visible gap is crown_lower (158.7 vs 160.28), which is a
  one-row band-boundary difference (`int()` floor vs `round()`). My gate numbers are therefore not
  an artifact of my implementation.
- **Clip definition.** The lane reports clip 0.0126 / 0.0062 (both PASS) using
  `L ≥ 254.5 | L ≤ 0.5`. The frozen spec in my brief is **clip frac = fraction of stone px with
  L ≥ 250**. Under that definition the fix set is 0.02099 / 0.02424 — both **fail** the ≤0.02 gate
  (committed: 0.0311 / 0.0544). Same pixels, different threshold: the PASS is definition-dependent.
  This is the one place where the lane's gate summary overstates its result.
- **%stone** is likewise definitional (mine = band-rect coverage, lane's = share of total stone px).
  Not a gate; no verdict impact.

## 7. Overall

**FAILED — and the lane's own FAILED signal is correct on the deciding numbers.**

- The fix is genuinely reverted: tracked file md5 = committed, `git status` clean, `runs/`
  byte-identical, committed look still scores **66/62** on my own re-run.
- The claim's two hard numbers reproduce exactly (64/58, exact PNG md5s), and the band-structure
  improvement is real and cross-validated (every band +std, slab 0.267→0.091 / 0.146→0.012,
  pale-lowinfo 0.073→0.012 / 0.271→0.049).
- But the sheet gate fails by 2/4, the dark end lands 8.4 L short of its floor on sapphire, the pale
  end lands 8.2 sat short / 22 L over on the two stones, and the fix **broke a gate that already
  passed** (global p5/p95 in both cats). Clip also fails under the spec's own threshold.
- Two documentation defects, neither of which changes the verdict: the "revert re-render
  (mean|d| 0.012/0.124)" artifact is not the committed look (actual 1.30, washed-out state), and
  the clip PASS uses the lenient threshold.

Next attempt should decouple the two ends — the p95 cost comes from attenuating facets that also
carry the specular peak, and the sapphire upper-pavilion saturation deficit needs the token tint to
outweigh the warm proxy wash rather than a further brightness cut.
