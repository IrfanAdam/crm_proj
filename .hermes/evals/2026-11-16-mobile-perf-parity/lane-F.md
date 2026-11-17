# Lane F — measured, opt-in "lean dock" (the dock-material decision, costed)

Repo `/Users/irfan/Documents/Portfolio Redo/crm_proj` @ `b97b1de` + sibling lanes' in-flight edits
(`band-mirror.js` band-placement rework, `lens-copy.jsx`, `rect-zoom.js` — see §7). Nothing committed.
Port **5235** only. One headless Chrome, serial passes, own profile (`~/.hermes/cache/scratch/chrome-laneF`).

**The one line this lane exists to produce:**

> **The trade in one line:** `?dock=lean` changes **35.53 % of dock pixels, by up to 81/255** — all of it the
> rim bevel, the capsule body is pixel-identical — for **−36 % mean frame time, −63 % main-thread time,
> −79 % long-task time**. **Default rendering is untouched.**

---

## 1. How to enable it (and what it actually does)

```
http://127.0.0.1:5235/?app=fullscreen&dock=lean          # iOS/WebKit path (engine=slices)
http://127.0.0.1:5235/?app=fullscreen&glass=lens&dock=lean  # Chromium path (engine=lens)
```

No flag → byte-identical default. The flag is read in `slices-spec.js` and is the only difference:

| file | change | lines |
|---|---|---|
| `src/glass/slices-spec.js` | the 14-slice literal renamed `DEFAULT`; `export const SLICES = LEAN ? [] : DEFAULT`; `LEAN` reads `?dock=lean` and raises `data-dock="lean"` on `<html>` | 76 |
| `src/glass/dock-band.css` | one rule: `:root[data-dock="lean"] .device .docklens__band>span{display:none}` — the band's own `--bg-surface` gradient (`.docklens__band-fill`) stays | 20 |
| `src/glass/slice-bands.jsx` | comment only — lean needs no code path (empty `SLICES` ⇒ `buildCopies` builds exactly the one aligned copy) | 35 |

Why this is the minimal replacement: `slices-spec.js` builds `1 + SLICES.length` clones of the **whole
477-node feed** and masks each to a 9-12 px rim band (`maskFor`), sliding each by its own displacement
(`transformFor`). Nothing else consumes `SLICES` except `DockSlices.slide()`'s index lookup — which
already receives `SLICES[-1] === undefined` for the base copy, so an empty ladder is a supported state,
not a special case. Lean therefore keeps: **the one aligned live copy** (content still reads through the
glass), capsule geometry, specular rim, tint + sheen, press/live states, scroll tracking.

Verified on the running app (both engines, CDP `Input.dispatchTouchEvent`, no synthetic-event shortcut):

| behaviour | default | lean |
|---|---|---|
| `.docklens` copies / slice wrappers | 15 / 14 | **1 / 0** |
| band ladder copies rendered | 5 | **0** (band gradient still paints) |
| capsule rect / item count / rim present | 95×48 · 3 · yes | 95×48 · 3 · yes |
| copy scroll tracking (`scrollTop` 0 → 420) | `translate(0px,0px)` → `translate(0px,-420px)` | identical |
| press state (`touchStart`→`touchMove`→`touchEnd`) | `press`→`live`→`rest`, pill `+190px`→`+130px` | identical |
| `?glass=lens` variant | — | also works (band mirror only; the SDF lens keeps its displacement) |

## 2. Numbers — 393×852 dpr3, iOS-Safari UA, 4× CPU throttle, port 5235

Protocol: 41-step scripted scroll (`#app-content.scrollTop += 20` per rAF, 0→820), `PerformanceObserver`
long tasks, `Performance.getMetrics` before/after each pass. Mount is done **unthrottled**, then the
throttle is applied — at 4× the React island needs >9 s to mount, so throttling the load would measure
the loader, not the dock. Variants are measured **interleaved A B B A A B** (3 cells each, 2 sessions,
6 cells per variant) so machine drift lands on both cells.

### 2a. DOM census inside `.docklens` (exact, load-independent)

| | default | lean | slices hidden only (CSS) | all copies hidden (CSS) | lens engine default | lens engine lean |
|---|---|---|---|---|---|---|
| page nodes | 9 754 | **3 531** | 9 754 | 9 754 | 3 605 | 3 605 |
| `.docklens` nodes | 8 917 | **2 673** | 8 917 | 8 917 | 2 768 | 2 768 |
| …of which rendered | 8 917 | **448** (−95 %) | 2 673 | 22 | 2 765 | 475 |
| full-feed copies | 15 | **1** | 15 | 15 | 1 | 1 |
| slice wrappers | 14 | **0** | 14 | 14 | 0 | 0 |
| band ladder copies (rendered) | 5 (5) | 5 (**0**) | 5 (5) | 5 (0) | 5 (5) | 5 (0) |
| `will-change` layers inside dock | 60 | **18** | 60 | 60 | 18 | 18 |

Lane 7's diagnostic (8 917 / ~9 776) reproduces exactly, which is the evidence that the **default path is
unchanged**: same ladder, same node count, same masks.

2 673 − 448 = 2 225 of lean's remaining nodes are the five band-ladder copies that `band-mirror.js` still
*constructs* (they are `display:none`, so they cost no paint or layout). A 3-line change in that file
— skip the `stopsHTML` clone when `LEAN` — would take lean to **448 nodes / 18 layers**. That file is
another lane's ownership, so it is left as a follow-up, not done here.

### 2b. Scroll cadence and main-thread cost (interleaved, 6 cells per variant)

| metric | default | lean | Δ (pooled) | Δ (per adjacent pair, 6 pairs) |
|---|---|---|---|---|
| frame mean | 84.2 ms | **53.5 ms** | **−36.4 %** | −17…−58 % |
| frame p50 | 79.5 ms | **51.5 ms** | **−35.2 %** | **−11…−58 %** |
| frame p95 | 171.1 ms | **124.7 ms** | **−27.1 %** | — |
| frames > 33 ms | 87.6 % | **70.1 %** | −17.5 pts | — |
| **main-thread TaskDuration** | 2 630 ms | **970 ms** | **−63.1 %** | **−56…−70 %** |
| **long tasks > 50 ms** | 1 941 ms in 17 | **400 ms in 4** | **−79.4 %** | **−63…−100 %** |
| CDP LayoutCount | 18.5 | 27.2 | n/a (noise) | both ≈0.5-0.7/frame |
| CDP RecalcStyleCount | 108 | 95 | −11.7 % | — |

Read this honestly, because the two halves behave differently:

- **Main-thread work is the durable number** and it is stable: every adjacent pair lands at −56…−70 %
  TaskDuration and −63…−100 % long tasks. This is what the 8 917 nodes and 20 promoted layers actually cost.
- **Frame cadence is contention-limited on this host, not work-limited.** Absolute values moved 3× between
  sessions (default p50 50 ms → 194 ms) with load average 100-127 and 60+ Chrome processes on the box. Under
  that contention a quiet-host saving partly hides behind somebody else's frame, so −11…−58 % is a **range,
  not a precision number**: the win grows with contention (quiet ≈ −14…−23 % p50, busy ≈ −46…−58 %).
- **LayoutCount does not improve, and should not.** 18-28 renders per 41-frame pass in both. The 36-forced-layouts-
  per-scroll that lane 7 measured had already been retired upstream by the band-placement rework in this tree;
  lean's win is paint and node count, not layout.

### 2c. Is the "37 % from the slices alone" figure right? — reproduced, with a correction

Measured with **only** `.docklens__slice{display:none}` (base copy and band mirror untouched), 3 interleaved
pairs in one session:

| metric | default | slices hidden | Δ |
|---|---|---|---|
| frame p50 | 143.8 ms | 117.8 ms | −18.1 % |
| frame mean | 147.2 ms | 110.9 ms | −24.7 % |
| frame p95 | 292.6 ms | 219.9 ms | −24.8 % |
| TaskDuration | 4.68 s | 2.37 s | **−49.4 %** |
| long tasks | 4 128 ms | 1 618 ms | **−60.8 %** |

An earlier contended session measured the same variant at −44.7 % p50 / −57 % TaskDuration / −64 % long tasks.

**Verdict:** the 37 % figure is inside the spread of the *frame-interval* effect (−18 % quiet … −45 % busy) but it
understates the real contribution when expressed in the metric that does not depend on the host: **the 14 slice
copies are about half the dock's main-thread cost and ~60 % of its long-task time.** Lane 7's number was a
frame-time average at 6× throttle on a contended machine; treat "37 %" as the floor of the frame win and
"−49 % / −61 %" as the honest slices-only figure.

For the ceiling, same session: whole `.docklens` hidden = p50 −67 %, TaskDuration 7.43 → 2.03 s, long tasks
6 924 → 1 732 ms. Lean (p50 72.8, TaskDuration 1.70 s, long tasks 1 136 ms) lands within noise of that ceiling
on the main-thread counters while keeping the glass — and it beats "all copies hidden" (p50 100.0, TaskDuration
2.13 s, long tasks 1 448 ms), because empty masked wrappers still carry promoted layers of their own.

## 3. The visual delta — frozen, measured, byte-stable

Capture: scrollY 600 (the richest backdrop of four sampled positions), then **all rAF stopped**
(`requestAnimationFrame` stubbed, pending frames cancelled), `document.getAnimations()` paused, every
`animation-play-state: paused`, `transition: none`, caret transparent. Crop = dock capsule + 6 px top/left
(299×62 css px, fab excluded), captured at dpr3 and shown at **3× zoom** on the sheet. Three shots per cell
900 ms apart.

**Image:** `.hermes/evals/2026-11-16-mobile-perf-parity/lane-F-dock-default-vs-lean.png`
(default | lean | |Δ|×8, with the tables and the perf block printed on the art).

- **Determinism:** all four lean cells and 6 of the 12 default/CSS-control cells are byte-identical across
  all three shots. Where a cell re-rastered mid-capture the repeat differs by **at most 3/255 on ≤4.8 % of
  pixels** — that 3/255 is the noise floor, and the headline delta is **27× the floor**. (An earlier
  one-shot probe showed the same ±2/255 artefact; it is raster timing in the blurred/filtered stack, not motion.)
- **Headline (default vs lean, scrollY 600):** `pixelDiff 35.53 %`, `maxChannelDelta 81/255`,
  `mean 14.19` on the pixels that differ, **17.58 % of dock pixels differ by more than 8/255**.

**Where (per zone of the capsule):**

| zone | pixels that differ | >8/255 | mean Δ | max Δ |
|---|---|---|---|---|
| top bevel strip (y 8-22) | 69.45 % | **34.80 %** | **11.70** | **81** |
| bottom bevel strip (y 42-56) | 23.67 % | 14.16 % | 3.14 | 52 |
| left rounded end (x < 38) | 18.81 % | 10.95 % | 3.05 | 67 |
| right rounded end (x > 255) | 21.63 % | 4.26 % | 1.93 | 65 |
| selected pill (own frost) | 9.48 % | 1.95 % | 0.52 | 37 |
| vertical middle (y 22-42) | 24.12 % | 5.23 % | **1.10** | 18 |

The "pixels that differ" column is dominated by ±1/255 dithering of the blurred stack; the **mean** column is
what the eye reads. The change is the **rim bevel**: the top strip (which is where the 4 top slices stack their
2-7 px pulls and the warm/cool fringe) carries 27× the mean delta of the capsule's vertical middle. Tint,
specular ring, capsule geometry, icons and press states are pixel-identical; the selected pill's own frost
shifts by 0.52/255 on average because its `backdrop-filter` input changed from 15 copies to 1.

**The delta depends on what is behind the dock** — this matters for the owner's judgement:

| scrollY | pixels differ | max Δ | >8/255 |
|---|---|---|---|
| 0 | 10.44 % | 68 | 2.38 % |
| 300 | 28.72 % | 76 | 9.55 % |
| **600** | **35.53 %** | **81** | **17.58 %** |
| 760 | 0.40 % | **1** | 0.00 % |

At scrollY 760 the feed behind the dock is a flat white card: a 2-7 px refraction of a smooth gradient is
invisible, and the two renders differ by 1/255. So the honest statement is not "0.4 %" or "35 %" — it is
**"invisible over flat content, up to 35 % of pixels over detailed content, always confined to the bevel"**.

## 4. What lean CANNOT reproduce

1. **Per-slice displacement at the rim** — the 2-7 px pull at 14 rim depths (4 top, 4 bottom, 3 per rounded
   end) that bends and compresses the backdrop into the edge. This is the whole reason the ladder exists.
2. **Per-slice parallax** — each of the 14 copies slides at its own offset, so the rim tracked scroll slightly
   differently from the capsule body; lean moves the rim 1:1 with the body.
3. **The 4-step chromatic fringe** (warm outer / cool inner bands) and the intermediate depths at the ends.
4. **The live 5-stop blurred band mirror** — lean keeps only the band's own `--bg-surface` gradient tint, so the
   strip of dock over the OS edge band loses its live blurred feed content.

Kept, verified: capsule geometry + press/live states, specular rim, tint + sheen, the one aligned copy,
scroll tracking, both engines.

## 5. Recommendation

**Ship it as an opt-in, not as the default** — and take the decision on this line:

> **35.5 % of dock pixels by up to 81/255, all of it in the rim bevel, for −63 % main-thread time,
> −79 % long tasks and −36 % frame time (−56…−70 % / −63…−100 % on every adjacent pair).**

How I read the trade: the pixel budget is spent exactly where the material is *doing* something, and the
capsule body — the part a person looks at while tapping — is unchanged. The perceptual question is whether the
owner wants the refracted rim at all, and that is answerable by eye in five seconds from the sheet, with the
cost of keeping it on the same page.

Two further rows the same harness already measured, if the owner wants a middle option:

- **Dial A (keep a bevel):** 5 copies instead of 15 (−67 % of the ladder). Not measured here as a variant, but
  it sits between "slices hidden" (−49 % task) and default, and costs a thinner bevel rather than none.
- **Dial B (lean, but 0 copies at all):** `.docklens__copy` hidden measured p50 −48 %, TaskDuration −71 %,
  long tasks −79 % on the contended session — i.e. **no better than lean** for a strictly larger visual loss,
  because empty masked wrappers still cost. **Lean is the right shape of cheap.**

If the answer is "keep the material", lean stays behind the flag as the measured fallback and the eval still
cannot close on the dock (§4.1 of lane 7).

## 6. Reproduce

```bash
# 1 server, own port, HMR off, generator plugins removed (this lane must not run generate-*)
cd "/Users/irfan/Documents/Portfolio Redo/crm_proj"
npx vite --config /Users/irfan/.hermes/cache/scratch/laneF-vite.config.mjs      # port 5235, strictPort

# 2 numbers (one Chrome, killed at the end)
cd /Users/irfan/.hermes/cache/scratch
node laneF.mjs measure .     # → measure.json  (census + per-variant passes, CSS-injected probes, lens engine)
node laneF.mjs pair .        # → pair.json     (default vs lean, A B B A A B)
node laneF.mjs pair2 .       # → pair-slices.json (default vs slices-hidden, A B B A A B)
python3 laneF-summary2.py    # → perf-summary.json + the tables quoted above

# 3 frozen stills + delta + the sheet
node laneF.mjs capture . "0,300,600,760"   # → {default,lean,zero,noBase}-{pos}-{a,b,c}.png + capture.json
python3 laneF-matrix.py                   # → matrix.json  (per-cell repeat determinism + the delta matrix)
python3 laneF-sheet2.py                   # → lane-F-dock-default-vs-lean.png
node laneF-behaviour.mjs                  # press/scroll/geometry parity, real CDP touch
```

Harness = `~/.hermes/cache/scratch/laneF*.{mjs,py}` (outside the repo). Numbers this lane quotes are mirrored
as JSON beside this file: `lane-F-numbers.json` (perf), `lane-F-diff.json`, `lane-F-matrix.json`.

## 7. Limits — read before quoting a number

- **Chromium + software raster, not WebKit.** iOS UA only selects the `slices` code path. WebKit's masked/filtered
  layers are more expensive, so every win here is a **floor** on the owner's phone (lane 7's finding, unchanged).
- **The host was heavily contended** (load average 100-127, 60+ Chrome processes, two GPU helpers at 100 %).
  Absolute ms are not portable; the interleaved ratios and the CDP main-thread counters are. This is why §2b
  gives ranges next to every pooled number.
- **The tree moved under this lane.** Sibling lanes' in-flight edits are in the measured tree — most importantly
  `band-mirror.js`/`rect-zoom.js` (`dockRects` shared-measure rework), which is why LayoutCount is already clean
  and why the band no longer forces a layout per frame. Lean's delta is therefore "paint + node count", a
  slightly *smaller* slice of the total than lane 7 measured against the original tree.
- **The visual delta is measured at 4 scroll positions on one tab (Opps) with one feed state.** It is a
  material delta, so it should transfer, but it is not a sweep of every screen. Positions 0/600 are the
  informative ones; 760 is the flat-content control.
- **Default rendering was not re-proved pixel-identical against a pre-edit still** (the frozen oracle predates
  several sibling edits, so such a diff would not be attributable). It is proved structurally instead: the
  default path is a literal no-op (`SLICES = LEAN ? [] : DEFAULT`, `data-dock` never set without the flag) and
  the default DOM census still reads exactly 8 917 nodes / 15 copies / 14 slices / 5 band copies — lane 7's
  numbers, unchanged.
- **Not committed, by instruction.** Working tree: `src/glass/slices-spec.js`, `src/glass/dock-band.css`,
  `src/glass/slice-bands.jsx` (72-76/20/35 lines) plus the untracked report and PNG in this directory.
