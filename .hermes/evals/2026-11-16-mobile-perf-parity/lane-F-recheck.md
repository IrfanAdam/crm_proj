# Lane F recheck — what `?dock=lean` actually looks like

**The decision:** Task 5 of the mobile-perf plan is the dock material call. `?dock=lean`
(`src/glass/slices-spec.js:42`) drops the 14-slice rim ladder and the 5-stop band mirror.
Keeping the rim costs **+63% main-thread time, +36% mean frame time** (lane F, rev 2 — not
re-measured here). This lane re-shoots the two arms frozen and answers one question:
**what does the owner actually give up, by eye?**

**Sheet:** `lane-F-dock-recheck.png` (this directory). Scratch originals, raw shots and JSON:
`/Users/irfan/.hermes/cache/scratch/task5-dock/` (`task5-sheet.png`, `capture.json`,
`diff.json`, `sweep-stats.json`).

Repo `dee15c3` (no tracked modifications), Vite 5 on **port 5412** (5411 was held by another lane's server;
mine started fresh with `--strictPort`), headless Chrome `--headless=new`, 393×852 dpr 3,
`?app=fullscreen&glass=slices` — the phone material, forced explicitly rather than by UA.
The desktop pass is 1440×900 dpr 2, same flag.

---

## 1 · What the flag changes in the material

`slices-spec.js` builds one masked clone of the whole feed per rim depth and slides each by
the displacement the SDF would apply there. Lean empties that ladder, so exactly one aligned
copy remains; `dock-band.css:20` also hides the five band-mirror copies.

| | default | lean |
|---|---|---|
| `.docklens` copies / slice wrappers | 15 / 14 | **1 / 0** |
| band-mirror copies rendered | 5 | **0** (gradient tint stays) |
| nodes inside `.docklens` | 8,917 | **2,673** |
| capsule, tint, specular ring, icons, selected pill, press/live states | present | **identical** |

## 2 · What it looks like (plain description)

At this scroll position the dock sits over a pale card with blue/pink feed text behind its
top edge. Both arms are byte-stable captures — three shots per arm, zero differing pixels
between repeats — so every number below is the material, not motion.

- **Default:** the top and bottom edges carry a soft, ~12 px deep bevel made of stacked
  copies. Backdrop glyphs are pulled about **1–2 css px deeper** into the edge (median
  penetration **12.3 px** vs **10.0 px** in lean), with a 4-step warm/cool fringe and a
  per-slice parallax. In the 4× zoom the two still read alike; in the vertical-×8 strip on
  the sheet the default edge clearly shows a faint extra, softened copy of the glyphs under the rim.
- **Lean:** the same highlight, but it is a single layer. The backdrop stops at the glass
  line instead of bleeding through it; the edge reads thinner and cleaner. The band mirror
  becomes a flat tint.
- **At 1:1 on a phone (299×62 css px, shown at actual size on the sheet): the two are not
  separable by eye.** Icon ink moves ≤4/255, labels and pill geometry are unchanged.

If the owner's taste is "the rim should feel like thickness", lean is the visible loss. If
the taste is "the rim should be crisp", lean arguably reads better — that is the call, and
it is a taste call, not a measurement.

## 3 · Measured delta, dock region only

Crop = capsule + 6 px top/left = **299×62 css px** (897×186 device px), fab excluded, same
as lane F. `#app-content` at scrollTop 600 (the richest of six sampled), rAF stubbed,
`document.getAnimations()` paused, transitions off.

| metric | value |
|---|---|
| pixels differing (any channel) | **35.53 %** |
| differing by **> 8/255** | **17.58 %** |
| max channel Δ | **81/255** |
| mean Δ on differing pixels | 14.19 |
| mean Δ over the whole crop | 5.04 |
| → lane F, same crop/state | 35.53 % / 17.58 % / 81 — **reproduced exactly** |

**Localisation (the claim under test).** Distance to the capsule's rounded-rect boundary:

| zone | % differ | % >8/255 | mean Δ | max |
|---|---|---|---|---|
| 0–4 px inside edge | 66.3 | 43.6 | 13.78 | 65 |
| 4–8 px | 66.6 | 38.3 | 10.48 | 67 |
| 8–12 px | 64.1 | 35.6 | 10.27 | 81 |
| 12–18 px | 21.4 | 3.4 | 1.12 | 38 |
| 18 px → body | 21.2 | 5.7 | 1.13 | 38 |

- **88.8 % of the >8/255 pixels inside the capsule lie within 12 css px of the edge** (87.4 % of
  all >8 pixels, counting the crop's 6 px margin). Depth percentiles: p50 6 px, p90 12.7 px,
  p95 26.3 px, **max 28 px at the rounded ends** — the sideways pull reaches further than the
  straight bevel.
- Row profile: y 8–20 css (top bevel) carries mean Δ **13.3**, y 48–62 (bottom bevel) **7.8**;
  the mid strip y 24–28 is **0.01 mean, max 1/255** (110 of 10,548 px nonzero).
- The remaining >8 pixels outside that rim hug the **selected pill**: its own
  `backdrop-filter` input changed from 15 copies to 1. Pill core: 26 % differ, 0.6 % >8,
  **mean 1.14/255**. Icon ink is unchanged: max Δ 4/255 on the home outline (AA), 1/255 on
  the users icon, 0 on the selected handshake.
- "Body unchanged" is therefore accurate as "no structural change", not "zero bytes": the
  flat body is within 1/255; the only >8 values there are the pill's frost edge.

**Across the feed** (same two renders, six scrolls):

| scrollTop | pixels differ | > 8/255 | max Δ |
|---|---|---|---|
| 0 | 10.44 % | 2.38 % | 68 |
| 150 | 17.11 % | 8.32 % | 78 |
| 300 | 27.05 % | 9.54 % | 76 |
| 450 | 25.48 % | 5.99 % | 51 |
| **600** | **35.53 %** | **17.58 %** | **81** |
| 750 | 7.68 % | **0.00 %** | 5 |

The delta is bounded by what is behind the dock: **0 % >8 over a near-flat card, 17.6 % over
the most detailed feed position.** It never leaves the rim/pill.

**Desktop 1440×900 dpr 2:** the fullscreen dock is a 1340 px stretched bar. Delta:
**7.93 % differ, 1.96 % >8, max 62**, concentrated at the two rounded ends (middle columns
read ~0.0 mean because that strip sits over flat content). Lean is a phone lever; the
desktop figure is reported for completeness, not as decision evidence.

## 4 · The trade, stated without a recommendation

| | keeping the refracted rim (default) | dropping it (`?dock=lean`) |
|---|---|---|
| look | 12 px soft bevel, 1–2 px deeper backdrop penetration, warm/cool fringe, per-slice parallax | one aligned copy, thinner/crisper edge, flat band tint |
| same at 1:1 | — | yes at this content state |
| cost | **+63 % main-thread, +36 % mean frame, +79 % long tasks** (lane F) | the baseline |
| pixels | — | 35.5 % of dock pixels, 17.6 % >8/255, max 81; 89 % of the inside change within 12 px of the edge |

The pixels do **not** show lean is invisible — 17.6 % of dock pixels move by >8/255 at the
worst feed position, and the rim's depth is visibly reduced at 4×. They do show the loss is
**confined to the rim and imperceptible at 1:1 on this content**. Whether that rim is worth
a third of the phone's frame time is the owner's call.

## 5 · Limits

- Chromium raster (software/GPU), not WebKit. iOS Safari is the phone target and its masked
  layers are more expensive; the cost side is lane F's, not re-measured here.
- One feed state (Opps) at six scrolls. The band-mirror removal measures ≤1/255 in the body
  here, but a dark/colourful image behind the OS edge band is the case most likely to show
  it, and it was not swept.
- The 4× zoom is true-aspect; the vertical-×8 strip is an explicit legibility aid, labelled
  as such on the sheet — it is not a photograph of what the eye sees.

## 6 · Reproduce

```bash
cd "/Users/irfan/Documents/Portfolio Redo/crm_proj"
npx vite --config /Users/irfan/.hermes/cache/scratch/task5-dock/vite.config.mjs   # 5412
cd /Users/irfan/.hermes/cache/scratch/task5-dock
NODE_PATH="/Users/irfan/Documents/Portfolio Redo/crm_proj/node_modules" node capture.mjs
NODE_PATH="..." node sweep.mjs
python3 diff.py && python3 sheet4.py
```
