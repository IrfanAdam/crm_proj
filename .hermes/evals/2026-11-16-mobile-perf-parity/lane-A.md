# Lane A — the deterministic pixel gate (and what it can and cannot certify)

**Status:** gate built and working. **15 of 16 rows byte-identical** across two independent Chrome
launches of the unchanged tree. The one remaining row is provably edge anti-aliasing, not content
(evidence in §3). The 6b6b828 baseline oracle is **not usable** for pixel parity — see §4, which is
the single most important caveat in this eval.

Written by the parent session after three subagent attempts died mid-run (twice during capture
teardown, once after deleting its own capture dirs). The measurements below are from the surviving
artifacts plus one pair run by the parent. Nothing here is inherited from a lane's self-report.

---

## 1. Why a new gate was needed

The original harness (`trace.mjs --mode oracle`) could not gate anything. Measured on the **unchanged**
tree, two runs of the same commit differed by:

| pair | worst surface | pixels | maxΔ |
|---|---|---|---|
| `after` vs `after2` (same tree, no edits between) | `mobile--home-rest.vp` | 12.3 % | 255 |
| `after` vs `after2` | `mobile--feed-mid.full` | 11.9 % | 209 |

It was photographing live animation: a spinning gem, a breathing map, a running clock. A gate whose
noise floor is 12 % cannot certify a 0.05 % tolerance. Only one of its eight surfaces
(`mobile--sheet-reward`) happened to be deterministic.

## 2. The freeze protocol

Applied before **every** shot, then asserted: the same shot taken 300 ms later must be byte-identical
before the first one is kept.

1. `requestAnimationFrame` / `cancelAnimationFrame` replaced with recorders that cancel every pending
   chain; known rig loops additionally cancelled through their own handles.
2. Injected sheet: `*{animation-play-state:paused; animation-delay:0s; transition:none; scroll-behavior:auto}`,
   plus every `document.getAnimations()` entry paused at `currentTime = 0`.
3. Gem pose frozen through **both** the Euler accessors and the quaternion (`configurable: true`
   shadowing) — writing only `rotation.x/y` is not enough, because `matrixWorld` composes
   position + quaternion.
4. Clock text written to a fixed string; map tiles and avatars blocked or settled on both sides.
5. Settle gates: 900 ms network-quiet, DOM/image signature unchanged across four polls, three freeze
   rounds before the first capture.

## 3. Determinism — `gate-c` vs `gate-d`, strict mode

Two independent Chrome launches, same unchanged tree, `--strict` (0 differing pixels required).
Source tree served on port 5240.

| surface | kind | px differing | maxΔ | verdict |
|---|---|---|---|---|
| desktop--dock-fab | vp | 0 | 1 | PASS |
| desktop--dock-fab | full | 0 | 1 | PASS |
| desktop--feed-mid | vp | 0 | 1 | PASS |
| **desktop--feed-mid** | **full** | **30** | **21** | **FAIL (strict)** |
| desktop--home-rest | vp | 0 | 1 | PASS |
| desktop--home-rest | full | 0 | 1 | PASS |
| desktop--sheet-reward | vp | 0 | 0 | PASS |
| desktop--sheet-reward | full | 0 | 1 | PASS |
| mobile--dock-fab | vp / full | 0 | 0 | PASS |
| mobile--feed-mid | vp / full | 0 | 0 | PASS |
| mobile--home-rest | vp / full | 0 | 0 | PASS |
| mobile--sheet-reward | vp / full | 0 | 0 | PASS |

**15 / 16 rows byte-identical.** Freeze assertions: *"every shot repeated byte-identical after 300 ms"*
— i.e. the harness proved its own stability before reporting.

### The one non-identical row is edge anti-aliasing

`desktop--feed-mid.full` at 1440×908 dpr1, bbox `[844,88,930,95]`. Measured on the shape inside that
bbox (luminance < 40 threshold):

| measurement | run C | run D | verdict |
|---|---|---|---|
| dark pixels in the shape | 4 320 | 4 318 | −2 px, 0.05 % |
| bounding box of the shape | (0,0,299,99) | (0,0,299,99) | **identical** |
| shape IoU | — | — | **0.99954** |
| differing pixels lying on the shape's boundary | — | 23 of 30 (77 %) | edge, not interior |
| maxΔ | — | 21 | on a 30 px AA edge |

A shape with identical geometry, identical bbox and 99.954 % overlap, whose only differing pixels sit
on its anti-aliased boundary, is re-rasterisation noise (Skia analytic AA + tile boundaries at dpr1).
It is **not** a content or layout change, and it does not appear at dpr3 (every mobile row is 0 px).

**Do not paper over it with `--noise`.** The default `--noise-max` of 1 is correct for sub-perceptual
raster noise; 21 is not sub-perceptual in principle, it is only harmless here because of where it lands.
The honest record is: one full-page desktop row carries ≤30 AA pixels. If a future change moves this
row by more than ~30 px or pushes maxΔ above ~25, treat it as a real regression and investigate.

### What the previous attempt fixed

The interrupted lane's earlier pair (`gate-a` vs `gate-b`) had 13/16 byte-identical, 3 rows at maxΔ 1,
and one genuine outlier: `desktop--sheet-reward.vp` at **maxΔ 38**. In the new pair that surface is
**0 px / maxΔ 0** — the outlier was a real freeze gap and the fix worked.

## 4. The 6b6b828 baseline oracle is NOT usable for parity

`oracle/base` was captured before the freeze protocol existed. The gate refuses it for the right
reason:

```
HARNESS ERROR — capture set "base" is incomplete or self-contradictory
  · desktop/home-rest has no freeze assertions (geo) — cannot prove the capture conditions
  ... 8 surfaces ...
  refusing to report a verdict from this capture set
```

Forced through with `--allow-legacy` for the record, `base` vs the current tree reports 12 of 16 rows
outside tolerance, bboxes covering the whole viewport, maxΔ up to 255. **This is the baseline's fault,
not a regression:** the same current tree compares against itself at 15/16 byte-identical, and the
baseline's own repeat-difference was measured at 12.3 % (§1). A 12 % noise floor produces a 12 %-sized
"difference" against anything.

**Consequence, stated plainly:** this gate can certify *"the tree is stable and a change moved nothing"*
(a same-tree pair plus a change/no-change pair captured in the same session). It cannot certify
*"HEAD looks exactly like 6b6b828"*, because no frozen capture of 6b6b828 exists. Creating one requires
`git archive 6b6b828` into a scratch dir and capturing it with this harness — the correct next step if
anyone needs an absolute statement, not just a relative one.

## 5. Reproduce

```bash
# serve the tree under test (any port; 5240 was used)
npx vite --port 5240 --host 127.0.0.1 --strictPort

# determinism: two independent launches, same tree, nothing may differ
node .hermes/evals/2026-11-16-mobile-perf-parity/tools/gate.mjs \
  --baseline gate-c --candidate gate-d --strict

# change vs no-change: capture both sides in one session
node .hermes/evals/2026-11-16-mobile-perf-parity/tools/gate.mjs \
  --baseline before-x --candidate after-x --url http://127.0.0.1:5240/

# diff stored sets without re-capturing
node .../gate.mjs --baseline gate-c --candidate gate-d \
  --reuse-baseline --reuse-candidate --strict
```

Harnesses live in `tools/` **because `.hermes/tmp/` is gitignored** — the four attempt's scripts
(`trace.mjs`, `deterministic.mjs`, `gate.mjs`) would otherwise have been lost with the scratch dir.
That already happened once.

**Exit code gotcha:** the gate exits **1 on FAIL** and **2 on a harness error** — but only if you do not
pipe it. `node gate.mjs … | tail -30` reports `tail`'s status, so a failing gate looks like `exit=0`.
One logged run in this eval did exactly that before the trap was noticed. Use
`… >/tmp/gate.out 2>&1; echo $?` or `set -o pipefail`.

## 6. What this gate does NOT prove

- **Nothing about 6b6b828** (§4) — no frozen baseline of it exists.
- **Nothing about motion or feel.** Freezing is the whole method; it cannot see a stutter, a
  transition that changed duration, or a spring that lost its overshoot. Lane coverage for feel is
  zero in this eval.
- **Nothing on a real GPU or a real phone.** All captures are headless Chrome with software GL on a
  shared host. Rankings transfer; absolute rasterisation does not.
- **Only the 8 captured surfaces.** Surfaces never captured (cube, deck, spline, illusion, gallery,
  pitch, changelog, preview) have no pixel coverage at all.
- **Only the states captured.** Each surface is one scroll position in one app state; a change that
  only shows while pressed, dragged, or mid-sheet-morph is invisible to it.
