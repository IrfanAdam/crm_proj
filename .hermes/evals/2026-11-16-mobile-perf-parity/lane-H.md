# Lane H — two pre-existing defects: the map's unguarded `setBearing` and a dead focus ring

**Scope:** `src/patterns/OppsHome/live-map.js`, `src/patterns/OppsHome/reward-sheet.css`,
`src/components/Overlay/overlay-menu.css`, `src/components/Overlay/overlay-base.css` — nothing else
was edited. No commit. Both defects are pre-existing repairs, not perf work.

**Port:** 5242 (dev server for every capture; the built tree was briefly served on the same port).
**Browser:** one Chrome, serially — `--headless=new --disable-gpu-rasterization --use-angle=metal`,
393×852 dpr3 for the pixel work, 430×932 dpr1 for the focus A/B.
**This machine has no GPU** (SwiftShader), so the full app page blocks the renderer for long stretches;
every measurement below therefore runs on the repo's own CDP harness
(`tools/deterministic.mjs`, 180 s evaluate timeout, rAF/timer kill, animation seek, tile fade off) rather
than through the 5-second-timeout helper path. `app.html` is only a redirect stub to `/`; the app entry
used here is `/?app=fullscreen`.

---

## 0. Verdict table

| # | Claim | Result |
|---|---|---|
| 1 | `map.setBearing is not a function` is a **standing console error on the app path** | **NOT REPRODUCED** — not in dev, not in `dist/`. The plugin loads, the method exists, the pane is rotated 145°, console empty. See §1 |
| 2 | The call is nonetheless **ungenuarded and fatal when the capability is absent** | **CONFIRMED, FIXED** — the exact `TypeError` reproduced by removing the capability; the shipped line returns clean and the map still completes (§1.3) |
| 3 | `outline: var(--focus-ring)` removes the keyboard ring | **CONFIRMED on all three sites** — `outline-style: none`, `box-shadow: none` while `:focus-visible` matched (§2) |
| 4 | The audit's `reward-sheet.css:37` | **CORRECT — the line is there, verbatim, and live** (7 elements match). The parent's grep was wrong, not the audit (§2.1) |
| 5 | Pixel-neutral at rest | **0 differing pixels** on all four resting surfaces; map + strip + menu crops are byte-identical (§3) |
| 6 | Focused state shows a ring that was not there | **CONFIRMED** — 486 / 872 / 318 pixels of new ring; computed `outline` goes `none` → `solid 2px rgb(33,138,234)` (§4) |
| 7 | Line budget / token lint | 77 / 38 / 100 / 59 lines; `node scripts/lint-tokens.mjs` → **✓ 0 leaks, 0 over-limit (1754 files)** |

---

## 1. Defect 1 — the map's bearing call

### 1.1 What the code was doing

`live-map.js:32` (at `b97b1de`):

```js
const applyBearing = () => map.setBearing(BEARING);
applyBearing();                                   // line 33
new ResizeObserver(applyBearing).observe(el);     // line 34
```

`BEARING = 360 - HEADING = 360 - 215 = 145` (`live-map-config.js`). The intent is real and load-bearing:
the map is oriented heading-up, the blip arrow reads screen-up, and the pane must be re-rotated about
the container centre whenever the container is resized — precisely because the sheet builds a map while
it is still `0×0` and hidden. `setBearing` is **not** Leaflet: it is added to `L.Map` by
`leaflet-rotate` (0.2.8, `dist/leaflet-rotate.js:1`, `L.Map.include({ setBearing … })`), a UMD module that
patches whatever `window.L` happens to be when it evaluates — `leaflet-lazy.js` sets `window.L` first and
then `await import('leaflet-rotate')`.

### 1.2 The repro attempt, and what it actually found

Loaded `/?app=fullscreen` on the dev server with an error collector installed through
`Page.addScriptToEvaluateOnNewDocument` (so it sees every `error` and `unhandledrejection` from the first
byte of app script), froze the page, and read the map out of the live DOM:

```json
{ "leaflet": true, "pluginMethod": true, "rotatePane": true,
  "tiles": 4, "tilesLoaded": 4, "markers": 4, "pins": 3, "me": 1, "hotspot": true,
  "rotatePaneTf": "matrix(-0.819152, 0.573576, -0.573576, -0.819152, 386.19, 86.2348)",
  "errs": [] }
```

`2.53073 rad` = **145.0°** — the bearing is applied, and it is applied by *this* call: had line 33 thrown,
the function would have aborted before `L.tileLayer(...)` on line 38 and there would be no tiles and no
markers at all. There are 4 of each. The same census on the **built** `dist/` (served on 5242, `--only app`)
is identical: `pluginMethod: true`, same rotate-pane matrix, 4 tiles, 4 markers, `errs: []`.

So on this machine, on both the dev server and the current `dist/`, the audit's error is **not
reproducible**. I could not find a call path that produces it: `createLiveMap` is the only caller
(`nearby-map.js:37`, `nearby-sheet.js:54`), both go through the same lazy plugin import, and the plugin
patches the same `L` instance the map is built from. The collector is not silently dead — a
deliberately-rejected promise during the same session is recorded
(`collectorSelfTest: {"fired": true, "recorded": true}`).

The plausible mechanism for the audit's reading is a second Leaflet instance (the map built from a copy
whose prototype the plugin never touched, which renders tiles and markers perfectly and only fails on
rotation) — but that is a hypothesis I could not reproduce, and I am not going to report it as measured.

### 1.3 Why the line still needed fixing — reproduced directly

The call was unguarded on a **plugin** method. That is one dropped side-effect module away from being
fatal on every mount, and it fails *silently in the worst way*: the throw lands inside an `async` function,
so it surfaces as an unhandled rejection and the rest of `createLiveMap` — tile layer, hotspot, pins, the
blip — never runs. Removing the capability from the live prototype reproduces both halves
(`tools/lh-map-guard.mjs`, output in `lane-H-focus/map-guard.json`):

```json
{ "bearing": 145, "before": "function", "after": "undefined",
  "oldCall": "TypeError: m.setBearing is not a function",
  "newCall": "no throw",
  "markersAfter": 1, "restored": "function" }
```

The old expression throws the audit's exact error. The shipped expression returns without throwing and
the rest of the map still builds (marker added after the call). The live map is untouched by the
experiment: `tiles 6, markers 4, hotspot true, errs []`.

### 1.4 The fix — chosen: keep the bearing, guard the capability (option b)

```js
// the rotation pivot is the container centre, so re-apply on resize — a map built while
// hidden (0×0, e.g. the sheet) would otherwise stay rotated about its corner.
// setBearing is leaflet-rotate's (it patches L.Map from a global-script module), so a bundle that
// drops the plugin leaves a stock north-up Leaflet map. An unguarded call threw on every mount and
// skipped the tile layer below; keep the bearing where the capability exists, degrade silently if not.
const applyBearing = () => { if (typeof map.setBearing === "function") map.setBearing(BEARING); };
```

**Why not option (a), transform the pane myself:** with the plugin present, rotation is already correct
and the plugin owns the pivot, the pane offsets and the counter-rotation of markers/tooltips. With it
absent there is no `rotatePane`; the only pane left is `.leaflet-map-pane`, which Leaflet rewrites on
every `setPosition`/pan/zoom — a CSS transform there is overwritten on the next frame, and even if it
held, the pins and the heading-up blip arrow would rotate with the tiles instead of staying screen-upright,
i.e. the map would look wrong rather than merely unrotated. Degrading to north-up is the honest outcome;
a half-applied rotation is not.

The bearing is **not** deleted: with the plugin loaded the behaviour is byte-for-byte what it was
(same 145°, same matrix), which §3 proves at the pixel level.

---

## 2. Defect 2 — `outline: var(--focus-ring)`

### 2.1 What the token is, and the audit's `reward-sheet.css:37`

`design-system/tokens.css` (both themes):

```css
--focus-ring: 0 0 0 2px var(--primitive-sapphire-ui-400);   /* a BOX-SHADOW */
--focus-ring-offset: 0 0 0 4px rgba(33,138,234,0.15);
```

There is **no** outline token — `--focus-ring` is a shadow list, and `--ring-primary` is just an alias of it
(`tokens/mechanics-compat.json:111`). An `outline` whose value is a shadow list is invalid at
computed-value time, so the property falls back to its initial value: `outline-style: none`. The
consequence is worse than "no ring": it *overrides the UA's own focus ring*, so the control ends up with
less indication than an unstyled button.

**The audit was right and the parent's grep was wrong.** `src/patterns/OppsHome/reward-sheet.css:37` is,
verbatim:

```css
.activity-strip__bar[role="button"]:focus-visible{outline:var(--focus-ring);outline-offset:2px;border-radius:var(--radius-full)}
```

And it is not dead CSS. `src/patterns/OppsHome/reward-sheet.js:54` gives the peak bar
`role="button"` + `tabindex="0"` + an `aria-label` + Enter/Space handlers, so the selector matches **7**
elements in the live app (`selectorMatches: 7`, `focusable: 7` out of 392 bars). A keyboard user tabbing
onto the peak bar gets nothing.

### 2.2 The right pattern per site (no doubling)

`--focus-ring` as a box-shadow on `:focus-visible` is the house pattern where the element already owns a
shadow: `.btn:focus-visible` (`button-base.css:68`) sets **both** `box-shadow: var(--focus-ring)` and a real
`outline: 2px solid var(--primitive-sapphire-ui-400)`. So the rule was: give a real outline only where
nothing else paints a ring, and never add a second one.

| File:line | Before | After | Why |
|---|---|---|---|
| `overlay-menu.css:37` `.menu__item` | `outline: var(--focus-ring)` → none | `outline: var(--border-width-medium) solid var(--primitive-sapphire-ui-400)`, offset `-2px` (unchanged) | Flat menu row, no shadow of its own → real outline |
| `overlay-base.css:39` `.overlay :focus-visible` | `outline: var(--focus-ring)` → none | `.overlay :focus-visible:not(.btn)` with the same real outline, offset `2px` | `.overlay__close` had no ring at all; **`.btn` is excluded** because it already paints `--focus-ring` as a box-shadow plus its own outline — a second ring here would double it |
| `reward-sheet.css:37` `.activity-strip__bar[role="button"]` | `outline: var(--focus-ring)` → none | same real outline, offset `2px`, `border-radius` kept | Span-turned-button, no shadow → real outline |
| `reward-sheet.css:28` `.reward-sheet__close` | `outline:none; box-shadow: var(--focus-ring)` | **left alone** | Already correct — already consumes the token as a box-shadow |

Colour and width come from tokens (`--border-width-medium` = 2px, `--primitive-sapphire-ui-400` = the
same blue `--focus-ring` uses), matching `button-base.css:70`, `chip.css:50`, `search.css:65`. No raw hex.

### 2.3 Out of scope, flagged not fixed

`src/pitch/pitch-changelog.css:66` — `.ds-tags-more:focus-visible{outline:var(--focus-ring)}` — is the same
bug on a `role="button"` element (`src/pitch/changelog/paint-plan.js:62`). Not one of my four files, so I
left it; it needs the same one-line change by whoever owns pitch.

---

## 3. Pixel-neutral at rest

Protocol: dev server, 393×852 dpr3, `prefers-reduced-motion: reduce`, then
`freezePage()` — every rAF chain and timer killed, `transition-property: none !important`,
`animation-play-state: paused !important`, animations seeked to a fixed phase, status clock fixed, tile
fade off, map ring phase 0 — then `shootClip()`, which captures, waits 250 ms, captures again, and
**rejects the file unless the two are byte-identical**. Every file below passed that self-proof
(`stable: true` in `lane-H-before/laneH.json` and `lane-H-after/laneH.json`).

`tools/lh-diff.mjs`, before-tree vs after-tree, same crops, same frames:

| surface | file | size | bytes identical | differing px | pct | maxΔ |
|---|---|---|---|---|---|---|
| map widget | `app-map-rest.png` | 2142×1236 | **true** | **0** | 0 | 0 |
| activity strip | `app-strip-rest.png` | 306×1008 | **true** | **0** | 0 | 0 |
| menu (gallery) | `gallery-menu-rest.png` | 1140×192 | **true** | **0** | 0 | 0 |
| overlay close (gallery) | `gallery-overlay-rest.png` | 210×264 | false | 8445 | 15.2 | 222 |

The last row is a **bad crop, not a regression**: `.overlay` is `position: fixed`, so its rect is
viewport-relative, and clipping by page coordinates photographs whatever sits at that document offset
(the `.overlay` is also lazily opened, so the two runs caught different content). It is discarded and
replaced by the in-page A/B in §4, where the overlay control's resting crop is compared inside a single
document: **0 differing pixels** (row 3 of §4). Every other resting surface is byte-identical, which is
the strongest form the claim can take.

Map census, before vs after (same harness, same viewport):

| | before | after |
|---|---|---|
| tiles / loaded | 4 / 4 | 4 / 4 |
| markers (3 pins + me) | 4 | 4 |
| hotspot circle | true | true |
| rotate-pane transform | `matrix(-0.819152, 0.573576, -0.573576, -0.819152, 386.19, 86.2348)` | identical |
| console (self-tested collector) | `[]` | `[]` |

---

## 4. The fixes working — focused-state A/B

`tools/lh-focus.mjs`. Rather than run two trees, the **pre-fix declaration is replayed in the same
document** (a later stylesheet carrying the old `outline: var(--focus-ring)` at matching specificity), so
"before" and "after" are one document, one scroll position, one frame — the only variable is the
declaration. Focus is set on the element itself and verified through `:focus-visible`; captures are
full-viewport at dpr1 (1 px = 1 css px), cropped and encoded in node, because CDP `clip` wants page
coordinates and two of these elements are `position: fixed`. Evidence: `lane-H-focus/focus.json` and the
PNGs beside it.

| control | `:focus-visible` | computed `outline` before | computed `outline` after | box-shadow | rest diff | focused diff |
|---|---|---|---|---|---|---|
| app peak bar `.activity-strip__bar[role="button"]` | true | `none 3px rgb(34,34,34)` (offset 2px) | **`solid 2px rgb(33,138,234)`** (offset 2px) | none → none | **0 px** | **486 px, 11.03 %, maxΔ 217** |
| gallery `.menu__item` (Rename) | true | `none 3px rgb(34,34,34)` (offset −2px) | **`solid 2px rgb(33,138,234)`** (offset −2px) | none → none | **0 px** | **872 px, 7.28 %, maxΔ 222** |
| gallery `.overlay__close` | true | `none 3px rgb(115,115,115)` (offset 2px) | **`solid 2px rgb(33,138,234)`** (offset 2px) | none → none | **0 px** | **318 px, 11.83 %, maxΔ 222** |

The offsets are the tell: `2px` / `-2px` were already being applied *before* the fix, which is how we know
the rule matched and only the outline itself was silently dropped. `box-shadow` stays `none` throughout —
no second ring was introduced, and `.btn` inside an overlay keeps its own `--focus-ring` shadow plus its
own outline (it is excluded from the new selector).

Visual check (each pair inspected at 5–6× nearest-neighbour):

- `lane-H-focus/app-peak-bar--old-focus.png` — "no visible blue or coloured focus ring"
  vs `app-peak-bar--new-focus.png` — "a distinct, continuous blue outline … completely surrounds the
  outer edge".
- `lane-H-focus/gallery-menu-item--old-focus.png` — "no visible focus ring; the focused row is shown only
  with a gray highlight" vs `gallery-menu-item--new-focus.png` — "a thick, solid bright blue rectangular
  outline" around "Rename".
- `lane-H-focus/gallery-overlay-close--old-focus.png` — "no … focus indicator visible around the icon"
  vs `gallery-overlay-close--new-focus.png` — "a thick, rounded, bright blue outline forming a pill".

---

## 5. Files changed

| file | lines | change |
|---|---|---|
| `src/patterns/OppsHome/live-map.js` | 77 | `applyBearing` guards `setBearing`; 3 comment lines say why (bearing preserved, degrades to north-up) |
| `src/components/Overlay/overlay-menu.css` | 100 | `.menu__item:focus-visible` → real outline + one-line comment |
| `src/components/Overlay/overlay-base.css` | 59 | `.overlay :focus-visible` → `:not(.btn)` with a real outline + comment |
| `src/patterns/OppsHome/reward-sheet.css` | 38 | peak bar → real outline + inline comment; `.reward-sheet__close` (line 28) left as-is |

All ≤100 lines as `split('\n')` counts them; `node scripts/lint-tokens.mjs` → `✓ lint:tokens — 0 raw leaks,
0 over-limit (1754 files scanned)`. No raw hex; `var(--token)` only.

**Not committed.** Harness scripts (`tools/laneH.mjs`, `tools/lh-focus.mjs`, `tools/lh-map-guard.mjs`,
`tools/lh-diff.mjs`) and all evidence live under
`.hermes/evals/2026-11-16-mobile-perf-parity/` (`lane-H-before/`, `lane-H-after/`,
`lane-H-before-dist/`, `lane-H-focus/`).

---

## 6. Honest residue

1. **The map error did not reproduce.** I report that rather than manufacture it. What I did verify is the
   failure mode it describes, reproduced by removing the capability, and the fix surviving that condition.
   If the audit has a stack trace or the exact URL/mode it saw, that would settle whether a second Leaflet
   instance is in play — that would be a real defect in `leaflet-lazy.js`, outside my ownership.
2. **The overlay focus ring is proven on the DS gallery**, because `index.html` does not link
   `overlay-base.css` / `overlay-menu.css` at all — the two files only apply on gallery-side surfaces. The
   peak bar proof is on the real app screen.
3. `gallery-overlay-rest.png` in the page-coordinate pass is a bad crop and is superseded by the in-page
   resting comparison (0 px). Left in place so the mistake is visible rather than quietly deleted.
