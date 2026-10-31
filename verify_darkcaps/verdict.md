# verify_darkcaps — verdict: FAIL (fix reverted; sheet gate not met)

Sibling signal: `lanes/darkcaps/DONE` = FAILED (fix reverted, tree at committed bytes).
This lane verified every claim with own detectors (`verify_darkcaps/detect.py`) and
re-ran the untouched instrument (`prototype/gems/score.py`, never modified).

## 1. md5-check — PASS

- `src/components/GemReward/gem-shader.js` md5 = `f854e086501c9213109339fcd5d33229` — matches DONE claim.
- `git diff` for that file: empty. Revert confirmed; no src edits by any lane
  (remaining `git status` modifications are pre-existing, unrelated: design-system
  manifests + `src/js/mechanics/graphData.*`).

## 2. Instrument re-run (`score.py --peer --quiet`, out → `verify_darkcaps/rescore_*.json`) — PASS (reproduces exactly)

| cat | lane `score.json` | my rescore | match |
|-----|------------------:|-----------:|:-----:|
| sapphire | 66/110 | 66/110 | exact |
| citrine | 62/110 | 62/110 | exact |

Peer = the other cat's lane run dir (criterion 11c measured, IoU 0.9948 both).
Fix-set after-scores (`lanes/darkcaps/fixrun/*_score.after.json`, kept fronts only —
full re-score impossible, no txoff/repeat/etc. retained): sapphire 62, citrine 59,
both internally consistent (criteria sum = total). Deltas match report §4
(sap #2 6→4, #11 10→8; cit #2 4→2, #3 6→4, #4 3→5, #6 3→4, #11 10→8).

## 3. Detectors on after-fix fronts (fixed before-masks: lane txoff; `new_*.json`)

Cap zones = my row-third zones; bottom thirds hold the dark-flat slabs at baseline
(sap frac 0.819, cit 0.869 → both 0.000 after fix). Session-noise floor measured on
identical committed bytes (round6 runs/ vs lane before-dirs): p5 ±1.7, std ±1.4.

| gate | sapphire | citrine | result |
|------|----------|---------|--------|
| cap-zone std UP (need 3/4, top+bot) | top 24.48→24.51 (+0.03), bot 18.55→25.01 (+6.46) | top 29.69→30.42 (+0.73), bot 6.93→18.02 (+11.09) | **PASS 4/4** — bot (true cap) zones strongly up; top moves are noise-scale (floor ±1.4), top frac was 0.000 throughout |
| cap p5 not down anywhere | top 127.1→128.1, bot 45.4→102.7 | top 158.7→158.5 (−0.2), bot 62.3→137.0 | **PASS w/ note** — sole dip (−0.2, bright non-cap zone) is 8× inside the ±1.7 session-noise floor; vs lane-before comparator (157.0→158.5) it is up |
| neon in-mask = 0 (S>120 & hue-dist>60°) | 0→0 | 0→0 | **PASS** |
| interior p1 ≥ 15 | 45.4→102.4 | 62.8→135.8 | **PASS** |
| totals reproduce exactly AND ≥ 66/62 | rescore 66 exact | rescore 62 exact | **FAIL on fix set** — fix claims 62/59, below 66/62 floor |
| slab frac ≤ 0.25 / 0.28 | 0.176→0.000 | 0.234→0.000 | **PASS** |

Straight-segment sanity: baseline 29/14 real vs 0/1 shuffle-null (structure, not noise);
after fix 0/0 vs 0/0 (threshold slabs dissolved — consistent with slab → 0.000).

## 4. Overall

**FAIL** — the sheet gate (≥66/62) is not met by the fix set (62/59), and the fix
is already reverted, so the committed look stands verified at 66/62 with all
detector baselines in `baseline.md` / `baseline_*.json` for the next loop.
Detector-level fix effect is confirmed (caps erased, no neon, floor intact), but the
criterion-2 cost (#2 sap 6→4 / cit 4→2: shadowed-facet range crushed by the lifted
floor) is real per the claimed after-scores. Concurs with sibling FAILED.
Retune direction if re-attempted: lower softbox gain S and re-check #2 stops before
any second loop.
