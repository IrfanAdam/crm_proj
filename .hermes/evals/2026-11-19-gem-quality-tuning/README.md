# Eval M2 — mobile quality profile (opened 2026-11-19)

**Question:** which `(taps, bounce, bloom, dpr)` holds 60 fps on the owner's handset without a look change the
owner rejects?

**Status:** ○ open. Nothing has been tuned on the device yet. This file is the mutable record; the plan
(`2026-10-03_144222-gem-realism-round2.md`, `#### Eval M2`) holds the frozen verdict once the owner picks.

**Device under test** (read off the first real screenshot, not assumed):

| | |
|---|---|
| OS / browser | Android 10, Chrome |
| GPU | ANGLE (ARM, **Mali-G52 MC2**, OpenGL ES 3.2) |
| viewport | 360×825 CSS, `dpr 2` |
| surface | `gallery.html` → Gems → fullscreen ceremony |
| buffers | ceremony `310×405 -> 558×729 @1.80`, card behind it `246×120 -> 246×120 @1.00` |

**Baseline, measured on that device 2026-11-19:**

```
med 248.2  p95 351.2  fps 4  worst 427.9  hitch 15
js 3.2  long n/a  gpu~ 245.0 inferred
bloom on  planes 170  const  prog 8
steps 1  est 7.8  fail 2.0  ceil 2.0  min 1.0
```

610 ns per stone pixel, main thread idle at 3.2 ms. Fragment shading, not scheduling — Eval M1's
zero-compromise premise does not hold on this GPU, which is why the choice moved to the owner.

## Rungs to measure

Fill one row per setting: the values, the `med`/`fps` the panel reported, a screenshot, and the owner's verdict.
Copy the JSON out of the tune sheet so the values are exact, not transcribed.

| # | taps | bounce | bloom | dpr | med ms | fps | screenshot | verdict |
|---|---|---|---|---|---|---|---|---|
| 0 | 3 | 5 | on | 1.8 (auto) | 248.2 | 4 | — | baseline, measured |
| 1 | 1 | 2 | on | auto | | | | |
| 2 | 1 | 2 | on | 1.2 | | | | |
| 3 | 1 | 2 | off | 1.0 | | | | |
| 4 | 1 | 1 | off | 1.0 | | | | |

Derived expectations — **to be replaced by measurements, never inherited**:

- on the Mac at a pinned buffer, `taps 1 + bounce 2` measured **≥ 3.1×** (52.6 ms → the 16.7 ms vsync floor),
- applied to 248 ms, rungs 1–4 land near 79 / 35 / 19 / 14 ms (13 / 29 / 54 / 70 fps).

## Known look cost of the first rung (measured, not argued)

Full vs `taps 1 + bounce 2`, same pose, same buffer: **12.1 % of pixels at Δ > 2/255**, mean Δ 45.8 among
changed pixels, max 254; mean luminance 199.8 → 198.4. Concentrated on specular hot spots and facet junctions.
Silhouette, facet placement and colour are unchanged. Evidence: `compare.png` (full · LOD · diff×4) in this
directory.

The bottom two rungs have no visual measurement yet. That is what this eval exists to produce.

## Gate

1. The owner's eye on the device at each rung, with `med`/`fps` on screen.
2. The frame at the chosen rung passes the A34 check: zero `THREE.WebGLProgram` errors, non-empty stone mask
   (≥ 20 k px of `|L(head) − L(no-gem)| > 6`). A diff between two blank stones is not evidence.
3. The copied JSON reproduces the chosen frame exactly after a reload.

## Out of scope

- Making the phone faster with no look decision — that was Eval M1, and it is exhausted on this GPU
  (const planes, allocation, repaint cap and the DPR controller are all shipped; the residual is fill).
- The two-rig overdraw. With the ceremony open, the card behind it keeps rendering — measured live as a
  second rig at `441×193 @1.60`, roughly half the budget on a stone nobody can see. That is a defect, not a
  trade, and gets its own task.
