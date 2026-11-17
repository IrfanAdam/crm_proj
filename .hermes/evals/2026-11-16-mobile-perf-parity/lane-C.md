# Lane C — the icon/library boot cost

**Scope:** `@phosphor-icons/react` as the boot bottleneck. **Port:** 5232. **Base:** `b97b1de` (working tree, other lanes' edits live).
**Result:** dev-path boot **16.7 s → 1.67 s** ScriptDuration, JS transfer **9.95 MB → 3.74 MB**, and **0 pixels changed**
(3 frozen stills + dock markup byte-identical). Production entry also lost **124 KB raw / 30.7 KB gz**.

---

## 1. What is actually big — dev vs prod are different problems

| Where | Size | Verdict |
|---|---|---|
| Dev optimizeDeps prebundle `node_modules/.vite/deps/@phosphor-icons_react.js` | **6 213 740 B** (+ 8 581 271 B `.map`) | this is the 6.6 MB figure. **Dev-only.** |
| Prod `main-*.js` (the only module `/` loads) | **486 922 B raw / 143 753 B gz**, of which **124 372 B raw / 30 749 B gz is Phosphor** | real, but nowhere near 6.6 MB |

The parent's `6.62 MB` is the **dev prebundle** and nothing else — measured here at 6 213 740 B (6.21 MB /
5.93 MiB) on Vite 5.4 + `@phosphor-icons/react@2.1.10`; sourcemap adds 8.58 MB. Production ships the
tree-shaken subset: 31 KB gzipped. So the phone-against-dev-server pain is 200× the production cost, and
that is the cost this lane attacked — while also taking the 31 KB gz out of prod for free.

**Why the dev prebundle is the whole library:** `index.es.js` re-exports ~1 500 icons × 6 weights, and
esbuild prebundles a bare specifier as one unit — tree-shaking does not apply in dev. Rollup *can* shake
prod, which is exactly the 474 KB → 362 KB difference.

### Import inventory (at `b97b1de`)

| Fact | Number |
|---|---|
| Files importing the package | **2** — `src/components/Icon/Icon.jsx` (27 components), `src/components/Icon/gem-icons.js` (19) |
| Distinct components imported | **44** (Diamond + Sparkle overlap) |
| Registry keys exposed (`MAP` + `GEM_MAP`) | 38 |
| Components **rendered** at runtime | **3** — `House`, `Users`, `Handshake` |
| Weights actually passed | **2** — `regular`, `fill` (`dock-track.jsx:91`) |
| Reachable call sites | `index.html → src/glass/main.jsx → BottomDock → dock-track.jsx` + `FabGem.jsx → Icon` |

`FabGem` renders `gem-minimal`, which is the local `GemMinimal.jsx` — never Phosphor. No other page imports
`Icon.jsx` (`gallery.html` is vanilla and uses the CDN/vendored Phosphor **font**), and nothing imports
`IconMap`. So 41 of the 44 components and 4 of the 6 weights were dead weight on the only path that matters.

## 2. What changed

| File | Change |
|---|---|
| `src/shell/icons.jsx` (**new**, 48 lines) | 6 path strings (2 785 B of `d`, verbatim from `dist/defs/*.es.js`) + a Phosphor-`IconBase`-shaped `forwardRef` factory. Exports `House`, `Users`, `Handshake`. |
| `src/components/Icon/Icon.jsx` (99 → 37 lines) | Package import dropped; registry re-pointed at the inline glyphs + the three local gem components. Unknown names still fall back to `House` (unchanged behaviour). |

`package.json` is **unchanged on purpose** — see §6. No new dependency; net dependency **usage** is zero.

## 3. Glyph-equality proof (three independent layers)

1. **Markup oracle** — the real components rendered through `react-dom/server` vs the new file transformed by
   esbuild, compared as `{root attributes} + {path d per element}`:

   ```
   $ node .hermes/tmp/lane-c/extract.mjs           # snapshot the real Phosphor markup
   $ node .hermes/tmp/lane-c/extract.mjs --diff    # snapshot vs src/shell/icons.jsx
   MATCH House.regular      root: aria-hidden=true class= fill=currentColor height=24 viewBox=0 0 256 256 width=24 xmlns=... | 1 path | 256 B
   MATCH House.fill         ... 193 B      MATCH Users.regular ... 406 B    MATCH Users.fill ... 409 B
   MATCH Handshake.regular  ... 798 B      MATCH Handshake.fill ... 723 B
   ALL GLYPHS IDENTICAL
   ```
   All 6 (icon × weight) combinations the app can reach — `regular` and `fill` on all three dock glyphs — are
   identical in root attributes *and* path data. Those 6 cover every dock state (Home/Leads/Opps × hot).

2. **Live DOM** — the three rendered `<svg>`s read out of the running dev page, before vs after:
   `markup.json` **1 887 B, sha256 `340121d85a569101…`, identical**; per element
   `xmlns/width=24/height=24/fill=currentColor/viewBox=0 0 256 256` + `d` lengths `256, 406, 723`.

3. **Frozen stills** (393×852 DPR 3, all rAF neutered, `animation-play-state:paused`, `transition:none`,
   `document.getAnimations().pause()`, two freeze passes, 1.8 s settle), captured before and after:

   | Crop | sha256 (before = after) |
   |---|---|
   | `nav.png` — `.tabbar__nav` 285×48 | `9d7b5c93fd0a34dd…` |
   | `bar.png` — whole `.tabbar` + 6 px bleed | `37a6e6cafe7bc53c…` |
   | `screen.png` — full 393×852 viewport | `c3ceb6def3b74937…` |

   Byte-identical PNGs, i.e. `pixelDiff == 0` — no tolerance flag needed. Vision check on both crops
   describes the same three glyphs (House outline, Users outline, Handshake **fill** in the active pill).

## 4. Before → after on the dev path the owner uses (`/`, cold, cache disabled, 4× CPU, 393×852 DPR 3)

`node probe.mjs` = headless Chrome + CDP: `Network.setCacheDisabled`, `Emulation.setCPUThrottlingRate(4)`,
`Performance.getMetrics` for ScriptDuration, in-page marks for the milestones, `encodedDataLength` summed over
`responseReceived{type:Script}`. Helper: TTF stamps happen at the first rAF/mutation callback the main thread
can service, so they measure **when the app stops blocking**, not CSS paint (FCP is ~0.3 s on both sides).

Given the host load (load average **64–101** during these runs, other lanes active), absolute ms are noisy:
each side is 3–5 runs, median reported, range in brackets.

| Metric | before | after | delta |
|---|---|---|---|
| **JS transferred on cold `/`** | **9 953 660 B** (9.49 MiB) | **3 737 667 B** (3.56 MiB) | **−6 215 993 B, −62.4 %** |
| … of which the Phosphor prebundle | 6 213 740 B | **0** (absent from the dep cache) | −6 213 740 B |
| **ScriptDuration** | **16 726 ms** [14 878–25 714] | **1 674 ms** [1 449–4 467] | **−90.0 % (10.0×)** |
| **time-to-`#open-fullscreen`-visible** | **17 001 ms** [15 176–17 050] | **1 598 ms** [1 476–1 663] | **−90.6 % (10.6×)** |
| dock hydrated (tabbar + fab + icons in DOM) | 17 196 ms [15 475–17 948] | 1 895 ms [1 745–1 982] | −89.0 % |
| worst single long task | 15 396 ms [13 966–23 310] | 585 ms [422–1 158] | −96.2 % |
| JS heap used | 43 528 KB | 6 470 KB | −85.1 % |
| requests on `/` | 125 | 123 | −2 (…and 6.07 MB lighter) |

Outliers, stated rather than hidden: before had one run at 27 174 ms / 25 714 ms and after one at
7 068 ms / 4 467 ms — both during load spikes, both included in the ranges above, excluded from medians.

**Production bytes that ship** (`npx vite build --outDir $TMPDIR/c-dist-{base,after}`, entry = `main-*.js` + `index-*.js`):

| | raw | gzip |
|---|---|---|
| before | 508 455 B | 149 600 B |
| after | 384 083 B | 118 851 B |
| delta | **−124 372 B (−24.5 %)** | **−30 749 B (−20.6 %)** |

Verified post-build that only the three used glyph path sets survive in `dist/assets` (no `MagnifyingGlass`,
`DiamondsFour`, …); `index.html` still has 4 script tags, unchanged.

## 5. Reproduce

```bash
# isolated dep cache + port 5232; never touches vite.config.js or node_modules/.vite
npx vite --config .hermes/tmp/lane-c/vite.probe.mjs
node .hermes/tmp/lane-c/probe.mjs --url=http://127.0.0.1:5232/ --out=after.json --label=after
node .hermes/tmp/lane-c/shot.mjs  --url=http://127.0.0.1:5232/ --dir=after-shots
node .hermes/tmp/lane-c/extract.mjs --diff          # glyph oracle
npx vite build --outDir "$TMPDIR/c-dist-after"      # prod bytes
```
`vite.probe.mjs` is the real config with `cacheDir: node_modules/.vite-laneC` + port 5232. Baselines were
re-measured by restoring `HEAD:src/components/Icon/Icon.jsx` for a run and putting the new file back —
`git status` is clean of that swap now.

## 6. Decisions and loose ends

- **D-C1 · `package.json` untouched.** Removing the dep here would leave `package-lock.json` out of sync
  (`npm ci` then fails) and the lock is outside this lane's write ownership — regenerating it needs
  `npm install` in the repo, which the lane rules forbid. Nothing reachable imports the package any more, so
  the entry no longer pays for it. **Follow-up for the parent (one commit):** delete `src/components/Icon/gem-icons.js`
  (now unreferenced, still imports the package), drop `"@phosphor-icons/react"` from `dependencies`, run
  `npm install` to refresh the lock.
- **D-C2 · 44 components → 3.** The other 41 were registered but never rendered by any page (verified: no
  `<Icon name=…>` outside the dock, no `IconMap` importer, `gallery.html` uses the font, the `src/ds/*`
  hits are code samples in text nodes). They are gone from the registry rather than silently mapped to a
  different glyph; unknown names still fall back to `House` as before.
- **D-C3 · Weights limited to `regular` + `fill`** — the only two the app passes. Any other weight falls back
  to `regular`. Adding a weight means adding one `d` string from `dist/defs/<Name>.es.js`, never a redraw.
- **D-C4 · No `alt`/`mirrored`/`IconContext` support** in the inline glyphs — Phosphor's `IconBase` features
  for those render a `<title>`, a `transform` attr and a context read; no call site uses any of them, and
  `aria-hidden` (what the dock does use) is preserved.
- **D-C5 · Dev numbers are dev-server numbers.** The 6.21 MB prebundle is what a phone against `npm run dev`
  downloads; a production build never shipped it (31 KB gz). If the owner judges on the built site, the honest
  headline is the −30.7 KB gz, not −6.2 MB.
- **D-C6 · Other lanes' work was live during measurement** (load avg 64–101, `src/glass/*` and CSS edits in
  the tree). The A/B differs only in the two files above; a 10× ScriptDuration delta swamps that noise, and
  the byte columns are load-independent.
