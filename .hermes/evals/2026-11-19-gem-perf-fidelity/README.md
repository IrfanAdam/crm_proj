# Eval M3 — fidelity-first performance round (2026-11-19)

**Question:** how much of the phone frame can be removed **without moving a pixel**?

**Status:** ✓ mechanical gate passed. The **owner's phone read** is not in this file — it is Eval M2's gate, and Task 61
stays open for it. This directory is the mutable record; the plan
(`2026-10-03_144222-gem-realism-round2.md`, `#### Eval M3`) holds the frozen verdict.

**Baseline:** `7827565` — shipped gem head, Phase 11 Tasks 57, 59 and 60 done; Task 58 cancelled (withdrawn after its
pixel gate failed).

## Pixel gate — 40/40 identical

The oracle ran on a frozen archive of `7827565` and on a frozen rsync of the landed tree, software raster, 4 stones ×
5 tilts × card + ceremony:

| side | captures | invalid | unstable | mask px | shader | planes | manifest md5 |
|---|---|---|---|---|---|---|---|
| before (`7827565`) | 40 | 0 | 0 | 127 308 – 241 400 | const | 170 | `b8375075c07e754d483c8e6e4ca76b2b` |
| after (perf round) | 40 | 0 | 0 | 127 308 – 241 400 | const | 170 | `6c47cfaf53a4361158d47b7c734cf009` |

**Diff: 0 differing px, maxΔ 0, 0 withheld** (`oracle/diff.json`). Bloom: on for the gallery card, off for the app
ceremony (the app's gem-boot manifest does not load `gem-bloom.js`; the gallery does).

### Oracle hardening (found while running the gate)

The first after/baseline pair differed on **5 of 40** captures — always the **first tilt after a stone mount**, 61–62 k
px at maxΔ 44 (card citrine/amethyst/redberyl and ceremony citrine/redberyl). Two runs of the **same** after build also
disagreed on three of those rows, which proves the instrument, not the product, was the variable. A 1200 ms sleep made
it worse: 5 invalid captures with mask 0, so it was reverted. The working fix is a **second full primer cycle** at the
first tilt (`pose → settle(4) → warm → shot`) in `prototype/gems/oracle-shot.mjs`; both captures above were taken with
it and are 0 px. File is 99 `wc -l`.

## Occlusion parking (Task 63) — measured

ANGLE/Metal, headless, 390×844 DPR2, gallery ceremony open. The A/B is on the **same after build**, forcing the card
rig back on for the pair measurement:

| state | card rig | ceremony rig | manual 40-frame batch |
|---|---|---|---|
| pair (card forced live) | 276×121 CSS, 441×193 buf, `raf 1` | 340×480 CSS, 544×768 buf, `raf 1` | **11.183 ms** |
| after (occlusion active) | 276×121 CSS, 552×242 buf, **`occl 1, raf 0`** | 340×480 CSS, 610–612×864 buf, `raf 1` | **6.252 ms** (independent lane; 4.042 ms in the A/B run) |

Card alone: 2.820 ms. Host load 9.16 / 11.54 / 11.73 (A/B), 11.91 / 13.17 / 11.73 (independent). The pair costs
**~1.8–2.8×** the ceremony alone on this host; the card's marginal cost is 5–7 ms, because it carries its own WebGL
context, trace, caustic repaint and three-pass bloom chain. Parking it is **0 px** (the opacity fade is untouched: park
after `transitionend`, resume on the close event). Raw: `cost/before-overdraw.json`, `cost/after-occlusion.json`,
`reports/lane-e-result.json`.

## Tuning sheet (Task 62) — functional gate

From `tune/phase1-phone.json`, `tune/phase2-gates.json`, `tune/phase3-timer.json`:

- 5 rows: taps 3, bounce 5, bloom on, bloom amt 0.32, dpr auto; `med`/`fps`/`ratio` header and per-row readout.
- Taps 3→1 and bounce 5→2 change the record for **all four stones**; taps does **not** reset the controller window
  (`tapsNoReset 30`), so the live number keeps moving.
- DPR 1.2 moves the drawing buffer to `floor(css × 1.2)` (405×576 at 338 CSS), `GEM_PERF.pr` 1.2.
- Opening with an unchanged ratio calls `GEM_PERF.set` **0 times**; ten taps-only inputs → 0 controller calls, 10 optics
  applies, 1 debounced persist; one dpr change → exactly 1 set; auto → exactly 1.
- Reload keeps taps 1 / bounce 2 / bloom off / dpr 1.2 exactly; `copy json` parses and matches the UI; clipboard works.
- Desktop 1440: no pill. `?gemquality=tuned`: pill. Mobile 390: pill. Mobile `?gemquality=full`: no pill.
- No `#gem-screen`: 0 timeouts, 0 intervals (inert).
- A34: mask **144 389 px** at 678×960, **0 shader errors**. 42 console errors are the pre-existing
  `src/ds/deck-lab.js:16` `readout()` exception plus one favicon 404 — none from the two new modules.

**The device direction is NOT MEASURED here.** Software raster gave two contradictory runs (46.6→40.8 ms and
16.9→33.2 ms for taps 3→1) on the same code; the real-GPU direction is exactly what Eval M2's on-phone rungs exist to
measure. Do not quote either run as a phone result.

Screenshots: `shots/ceremony.png`, `shots/tune-sheet.png`, `shots/rung-phone.png` (taps 1 / bounce 2 / bloom off /
dpr 1.0). The sheet was darkened to `rgba(8,10,16,.97)` + 14 px backdrop blur after the first capture showed the card
title bleeding through behind the rows.

## Gate

1. Pixel oracle diff `0 px / maxΔ 0` against `7827565`, all 40 captures. **PASS**
2. Every capture: 0 `THREE.WebGLProgram` errors, stone mask ≥ 20 000 px (A34). **PASS** (min 127 308)
3. Per-frame cost quoted with canvas size, buffer, bloom state, and host load. **PASS** (above)
4. Tuning surface: each slider moves the measured median in the expected direction **on the real handset** — **Eval M2**;
   values survive reload, copied JSON reproduces, desktop hides. **PASS on the mechanical half.**

## Files

- `oracle/before/`, `oracle/after/` — manifests + summaries; the PNGs are regenerable with
  `node prototype/gems/pixel-oracle.mjs --capture` and are not committed.
- `oracle/diff.json` — the 40-row diff.
- `cost/` — overdraw baseline and the after occlusion/cost JSON.
- `tune/` — the three phone/gate/timer proof JSONs.
- `reports/occlusion-harness.json` — 36/36 mock-DOM assertions for the park/resume law.
- `shots/` — the three 390×844 evidence captures.
