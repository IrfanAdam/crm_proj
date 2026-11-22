# Lane E3 — `?gemphone` dpr-cap look call

**Verdict.** The cap is **not invisible**, and it is **not one policy** — it is three different
things on the three pages. `?gemphone=2` is a halo-weight change only (0.9 % of 1× pixels >8/255,
maxΔ 43, stone detail 98–100 % of default) and is the only arm I would ship without a second look.
`?gemphone=1.5` and `=1` are real resolution cuts: 21 % and 42 % of the stone's high-frequency
detail gone, 70 % / 81 % of rim pixels over 8/255, and a glow that spills **3.4–3.9× further
outside the stone**. On top of that, `?gemphone` is **completely inert on `pitch.html`** (that page
loads neither `gem-perf.js` nor `gem-bloom.js`) and **half-inert on `index.html`** (no bloom
script, so only the dpr cap applies). Sheet: `lane-E3-sheet.png` (same dir).

## Exact command

```bash
cd "/Users/irfan/Documents/Portfolio Redo/crm_proj"      # branch main @ dee15c3; this lane modified no app source
npx vite --port 5412 --strictPort                        # never :5173 (the owner's live Safari server)

cd /Users/irfan/.hermes/cache/scratch/e3-gemphone
NODE_PATH='/Users/irfan/Documents/Portfolio Redo/crm_proj/node_modules' node capture.mjs   # 15 captures
python3 analyze.py && python3 sheets.py
```

Headless Chrome only (`--headless=new`, CDP-over-`ws`), 393×852 **dpr 3**, ephemeral profile under
scratch. Raw RGBA `readPixels` **in the same CDP task as the render**; no page screenshots.

## Method (and what it deliberately does not do)

- **Pose** `rig.t=0`, `rig.tilt=0`, `group.position=(0,0,0)`, `rotation(-0.15,0,0)`, rAF cancelled, one render.
- **Floors hidden** `rig.floors.{shadow,contact,caustic,ground}` — the caustic pool repaints and fakes deltas.
- **Tint committed and pinned**: `GEM_TINT.apply()` only *starts* a 1 s cross-fade; the capture calls
  `GEM_TINT.step(rig, 9)` so the material state is final, not mid-fade, and it pins the **variant declared
  in the page** (`sapphire` on all three). Without this, pitch's 3 s variant cycle made two identical loads
  differ — an earlier pass caught its hero at `amethyst`. With it, the A-vs-A control is **bit-exact** on all
  three pages (same sha256 on the raw buffer).
- **Captured at the policy ceiling**, not after an adaptive step-down: `renderer.setDrawingBufferSize(rig.w, rig.h, GEM_PERF.cap())`.
  The live controller had already walked down before capture (gallery default 2 → 1.8, cap 1.5 → 1.3), which is
  its own behaviour and not the cap under test.
- **Numbers are display-grid, not buffer-space.** Each arm's buffer is upscaled to the canvas CSS box × 3 (dpr 3) with
  bilinear — the browser's own upscale — so every arm is compared on the grid the phone actually shows. A smaller
  buffer cannot look better here than it does on the panel.
- The index surface is captured with **`?app=fullscreen`** — the app's own chromeless phone mode. Without it
  `index.html` at 393 px is the desktop device mock, whose `.device` box is **0×0** (verified), so there is no
  phone rendering of that surface at all.
- Region masks are geometric, not facet-rasterised: crown/pavilion = silhouette above/below a girdle band of
  ±4.5 % of stone height around its widest row; **rim** = outer 3 display px inside the silhouette; **inner** =
  silhouette eroded by 3. Halo = bloom lift (bloom-on minus bloom-off, same buffer), area in CSS px² at >3/255.

## What each cap actually changes (code)

| cap | `gem-perf.js` ceiling | gallery buffer | index buffer | pitch buffer | bloom B target | gain |
|---|---|---|---|---|---|---|
| default | `min(dpr,2)` = 2 | 684×960 (656 k px) | 680×640 (435 k px) | 722×480 (347 k px) | 0.5× → 342×480 | 1 |
| `=1` | 1 | 343×480 (165 k px, **25 %**) | 340×320 (109 k px, **25 %**) | unchanged | 0.25× → 85×120 | 1.6 |
| `=1.5` | 1.5 | 513×720 (369 k px, **56 %**) | 510×480 (245 k px, **56 %**) | unchanged | 0.25× → 128×180 | 1.6 |
| `=2` | 2 (**no-op**) | 684×960 (100 %) | 680×640 (100 %) | unchanged | 0.25× → 171×240 | 1.6 |

## Numbers — gallery.html (both halves of the policy)

Canvas 342×480 CSS · display grid 1026×1440 · stone covers 24.0 % of the frame.
Δ = max channel difference vs the default arm.

| arm | buffer | Δ >8/255 (grid) | Δ >2 (grid) | mean Δ | maxΔ | **1×: >8/255** | 1× maxΔ |
|---|---|---|---|---|---|---|---|
| `?gemphone=1` | 343×480 | **5.32 %** | 8.61 % | 1.936 | **227** | **5.57 %** | 236 |
| `?gemphone=1.5` | 513×720 | **3.66 %** | 6.73 % | 1.154 | **221** | **3.46 %** | 201 |
| `?gemphone=2` | 684×960 | **0.95 %** | 2.13 % | 0.221 | **51** | **0.93 %** | 43 |
| A-vs-A control | 684×960 | **0.0000 %** | 0 % | 0 | **0** | 0 % | 0 |

Where the delta lives (share of *stone* pixels over 8/255):

| region | `=1` | `=1.5` | `=2` |
|---|---|---|---|
| rim (outer 3 px) | **81.3 %** (max 176) | **70.2 %** (max 148) | 9.7 % (max 44) |
| crown | 28.7 % | 18.7 % | 7.5 % |
| girdle | 15.6 % | 9.9 % | 2.1 % |
| pavilion | 18.9 % | 13.7 % | 2.2 % |
| interior (>3 px in) | **20.2 %** | **13.6 %** | 3.6 % |

The delta is **not** edge-confined the way the mesh-entry crease was (E2: 99 % within 6 px of a facet
boundary). Here only 4–8 % of the >8 pixels sit in the rim band; the rest are spread across the whole
stone, because a resolution cut softens *every* facet edge, not just the silhouette.

Halo (bloom lift, gain 1.6 arms vs gain 1 default):

| arm | halo area >3/255 | vs default | peak | vs default | spill **outside** the stone | vs default |
|---|---|---|---|---|---|---|
| default | 3 360 px² | — | 38.0 | — | 88 px² | — |
| `=1` | 5 361 px² | **+59.6 %** | 55.2 | **+45.3 %** | 296 px² | **3.36×** |
| `=1.5` | 4 652 px² | **+38.5 %** | 61.3 | **+61.3 %** | 345 px² | **3.90×** |
| `=2` | 3 917 px² | **+16.6 %** | 66.9 | **+76.1 %** | 141 px² | **1.60×** |

**rev 7's “+45 % area / +70 % peak” is directionally right and not reproducible as stated.** Area at the
>3/255 threshold lands at +38.5 % (cap 1.5) and +59.6 % (cap 1), so “+45 %” sits between the two caps;
peak is +45 % (cap 1), +61 % (cap 1.5), +76 % (cap 2). The threshold-free number is the spill: the glow
**outside the stone triples** at caps 1 and 1.5. Area is threshold-dependent (+17…+60 % across caps at
>3/255; +12…+58 % at >2/255), so a single “+45 %” is not a property of the policy — it is one cap at one
threshold.

## Numbers — index.html (dpr half only; the page has no `gem-bloom.js`)

Canvas 340×320 CSS · grid 1020×960 · stone 37.3 % of frame.

| arm | buffer | >8 (grid) | maxΔ | **1×: >8** | rim >8 | interior >8 |
|---|---|---|---|---|---|---|
| `?gemphone=1` | 340×320 | 6.97 % | 241 | 7.80 % | 83.7 % (max 139) | 17.1 % |
| `?gemphone=1.5` | 510×480 | 4.67 % | 206 | 4.49 % | 68.2 % (max 121) | 11.4 % |
| `?gemphone=2` | 680×640 | **0.0000 %** | **0** | 0 % | 0 % | 0 % |
| A-vs-A control | 680×640 | 0.0000 % | 0 | 0 % | 0 % | 0 % |

`?gemphone=2` is **byte-identical** to the default here (same sha256 on the raw buffer), because the
ratio is already 2 and there is no bloom pass to thin. Bloom is not rendered on this surface at all —
`index.html` never loads `gem-bloom.js`.

## Numbers — pitch.html (the policy is not loaded)

Canvas 361×240 CSS · grid 1083×720 · stone 10.7 % of frame.

All four URLs — default, `=1`, `=1.5`, `=2` — render **0.0000 % of pixels over 8/255, maxΔ 0**, ratio 2,
same buffer 722×480, same sha256. `pitch.html`'s script list ends at `gem-rig.js` + `gem-tint.js` +
`pitch-gem-cycle.js`: **`gem-perf.js` and `gem-bloom.js` are not loaded on this page**, so the policy
does nothing there, cost or look.

## What each cap looks like (plain language)

- **`?gemphone=2` — “the glow breathes a little more”.** The stone is untouched: same buffer, same
  facet edges, 98–100 % of the high-frequency detail. What changes is the bloom: it is built at quarter
  resolution and paid back at gain 1.6, so the halation is **slightly broader and slightly coarser**
  (+17 % area, +76 % peak, 1.6× spill). At 1× I cannot point at a facet and say it moved; at 4× the glow
  around a highlight is chunkier and reaches a little further onto the stage. No aliasing, no banding on
  the girdle.
- **`?gemphone=1.5` — “a softer stone with a wider glow”.** This is the first arm with visible aliasing:
  the silhouette stair-steps at the culet tip and along the crown slope, and facet boundaries lose their
  crisp line (detail energy 79–80 % of default — a fifth of the high-frequency content gone). At 1× it reads soft — the stone looks like a smaller
  render scaled up, which is exactly what it is (56 % of the pixels). The bloom is strong and wide: the
  glow around the bright crown highlights bleeds ~4× its default footprint onto the stage. Texture is
  intact, but the “glass” crispness is gone. No girdle banding was observed.
- **`?gemphone=1` — “a low-res sprite”.** 25 % of the pixels. At 1× the stone is visibly mushy, the table
  highlight smears into the crown, and the silhouette is jagged; at 4× the stair-stepping is the first
  thing you see, with the specular islands blurred into blobs (58 % of detail energy). The halo is the
  strongest of the three in spill (3.4×) though slightly weaker in peak than cap 2. This is legible as
  “a different, cheaper render”, not as “the same stone”. If it is ever used, it should be behind an
  explicit low-power switch, not as a silent default.

## Cost, and a denominator correction the owner should see

Fill ratio vs the **shipped default** (measured buffers, exact): cap 1.5 = **1.78×** fewer fragments,
cap 1 = **4.0×** fewer, cap 2 = **1.0×** (identical buffer; only bloom traffic drops, 0.5×→0.25× B ⇒
~4× fewer bloom pixels, and bloom is a minority of the frame).

rev 7's table — “cap 1.5 = 2.8–3.4× cheaper, cap 2 = 2.1× cheaper” — is only consistent with a **dpr-3
denominator** (1029×1440 = 1.48 M px: 2.25× the cap-2 buffer, which is where “2.1×” sits; 4.0× the
cap-1.5 buffer, above its measured 2.8–3.4× because part of the frame is fixed cost). It cannot be read
against the shipped default: a dpr-3 phone already renders at `min(dpr,2) = 2`, so `?gemphone=2` and the
default share one buffer. That matters for the decision — on a 3× phone, **`?gemphone=2` buys no ratio
win at all**, only the bloom change. The lever that moves the phone is 1.5 (1.78× fewer fragments) or 1
(4×), and both are visibly softer. I did not re-measure frame time in this lane; the ms figures above are
rev 7's, re-expressed against denominators taken from buffers I did measure.

## Recommendation table (owner's call)

| option | look cost | what it buys | call |
|---|---|---|---|
| **Ship `?gemphone=2` as the phone default** | halo +17 % area / +76 % peak, 1.6× spill; stone detail 98–100 %; 0.93 % of 1× pixels >8, maxΔ 43 | bloom bandwidth only (B 343×480 → 171×240); **no** resolution or frame-time ratio win on a 3× phone | **safe, small** — say yes if the wider glow is acceptable on its own merits; do not sell it as a perf win |
| **Ship `?gemphone=1.5`** | visible softness at 1× (3.46 % >8, maxΔ 201), 70 % of rim px aliased at 4×, glow spill 3.9× | **1.78× fewer fragments** vs default — the only arm that meaningfully lightens the stone pass | **the real trade.** Only if the phone frame budget cannot be met at ratio 2. Worth a look on a handset before it becomes a default |
| **Ship `?gemphone=1`** | reads as a cheap sprite (5.57 % >8 at 1×, detail 58 %, rim 81 % aliased) | 4.0× fewer fragments | **not as a silent default.** Keep it as an explicit low-power mode at most |
| **Do nothing / keep default-off** | identical pixels | nothing | defensible while E5 has no handset numbers |
| **Fix the coverage gap first** | — | `?gemphone` is inert on `pitch.html` and bloom-less on `index.html`, so any policy decision today only lands on the gallery surface | **do this regardless**: decide per page, or add the two script tags to pitch/index before the policy is described as site-wide |

## Files

- Sheet (git-tracked): `.hermes/evals/2026-11-20-gem-mobile-perf/lane-E3-sheet.png`
- Scratch (prunes): `/Users/irfan/.hermes/cache/scratch/e3-gemphone/` — `capture.mjs`, `analyze.py`,
  `sheets.py`, `shots/capture.json`, `shots/analysis.json`, `shots/*.rgba` (45 raw buffers),
  `shots/sheet-{gallery,index,pitch}.png`, `shots/*@{1x,3x}.png`.
- No app source was modified; no commit was made.

## Limits

- M1 + ANGLE/Metal, not a phone GPU (E5 still needs hardware). Frame time was not re-measured here.
- One pinned pose per page; the caps were not swept across yaw, so a worse pose (silhouette against a
  bright facet, or the pavilion culet) is not ruled out.
- Region masks are row bands, not facet-group rasters; “crown/girdle/pavilion” here means the upper,
  middle and lower thirds of the stone silhouette, not the cut's facet groups.
- The 1× numbers are a LANCZOS downscale of the display grid — a proxy for an arm's-length read, not a
  measurement of the panel's own resampling.
