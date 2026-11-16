# Lane 2 — mobile load path: vendor three.js, collapse the gem scripts, head hygiene

Status: done, verified against a production build served on :5211. Zero visual change (pixel-diffed).
Owned files touched: `index.html`, `vite.config.js`, `public/vendor/**` (+ this audit file).

## Objective

`index.html` shipped 26 classic `<script>` tags: a render-blocking `three.min.js` from cdnjs plus 23
`src/components/GemReward/*.js` files and `src/pitch/pitch-overlay.js`, all parser-blocking, in strict
document order (each file reads `window.THREE` / prior `window.GEM_*` at parse time). Goal: remove the 25
parser-blocking round-trips while keeping that execution order, and drop the third-party origins from the
critical path.

## Result (before → after, `/` at 393×852, cache disabled, reward sheet opened to force the gem to draw)

| metric | before | after | Δ |
|---|---|---|---|
| `<script>` tags with `src` | 26 | 4 (1 module + 3 `defer`) | −22 |
| parser-blocking classic scripts | 26 (1 CDN three + 23 gem + 1 pitch) | 0 | −26 |
| total requests on `/` | 54 | 32 | −22 |
| script requests | 30 | 8 | −22 |
| JS bytes, gzip sum (from disk, same files) | 412,274 | 403,137 | −9,137 (−2.2%) |
| JS bytes, brotli sum | 345,445 | 337,221 | −8,224 (−2.4%) |
| JS wire bytes as served | 390,862 | 406,379 | +15,517 (artefact: `vite preview` ships gzip for the vendored three, cdnjs shipped brotli for the *same* file) |
| render-blocking resources (Chrome `renderBlockingStatus`) | 5 — 4 local CSS + **1 CDN CSS** | 5 — all local CSS | third-party CSS out of the chain |
| third-party requests | 17 | 14 | −3 (cdnjs three, jsDelivr CSS, jsDelivr woff2) |
| `dist/src/` raw copies | 122 files / 624 K | 122 files / 628 K | **no change — see gotcha 4** |
| gem draws | 452 tris / 5 calls / WebGL2 | 452 tris / 5 calls / WebGL2 | identical |

Both columns were built from the *same* working-tree `src/` (the `before` tree symlinks `src/`, `public/`,
`design-system/`, `tokens/`, `scripts/`, `node_modules/` and only takes the HEAD `*.html` + `vite.config.js`),
so the byte delta is attributable to this lane and not to parallel lanes' edits.

Honest read: the win is **round-trips and origin hops, not bytes**. three.js is the same 669,884 B file
either way; the −2% is the 23 per-file HTTP/comment overheads removed. On a brotli host (Vercel) the vendored
three lands at ~136 KB, i.e. byte-identical to the old cdnjs response. The measured wire increase is a
compression artifact of `vite preview` (gzip), not a regression.

`window.GEM3D` etc. still exist and the gem still renders — see "runtime verification".
`vendor/gem-boot.js` is 110,673 B raw / ~39.1 KB gzip; its content hash moves whenever a lane edits a
`src/components/GemReward/*.js` file (`?v=<sha1[:10]>` is recomputed per build / per dev request).

## Mechanism per change

1. **Vendored three.js** — `public/vendor/three.min.js` (669,884 B, sha256 `170c6789f43217c9…`, the exact
   `three.js/0.160.0` UMD build). `<script defer src="/vendor/three.min.js">` replaces the cdnjs tag **in the
   same document position**, i.e. before the gem block. Classic `defer` scripts execute in document order,
   so `window.THREE` exists when the gem chain runs.
2. **Vendor guard** — `gemBootPlugin.buildStart()` calls `assertThree()`: missing or `< 500 KB` fails the build
   with the curl line to restore it. Verified by moving the file away: build dies in 480 ms with
   `[gem-boot] vendor guard: public/vendor/three.min.js is missing or truncated …`.
3. **23 gem scripts → one deferred asset** — `gemBootPlugin` in `vite.config.js`. `index.html` keeps the 23
   tags as the ordered manifest; `transformIndexHtml` replaces that contiguous run with
   `<script defer src="/vendor/gem-boot.js?v=<sha1[:10]>">` in **dev and build** (scoped to `index.html` by
   `ctx.filename`, `isAppEntry`). Content = sources concatenated in document order with `\n;\n` between files
   and a `/* ---- path ---- */` banner each; only `sourceMappingURL` lines stripped. Order in the artefact:
   `gem-cut-ext → gem-cut → gem-appearance → gem-optics → gem-facets → gem-env → gem-shader-body →
   gem-shader-ext → gem-shader → gem-textures-ext → gem-textures → gem-scene-ext → gem-scene → gem-cshape →
   gem-caustic-trace-ext → gem-caustic-trace → gem-caustic → gem-bare-ext → gem-bare → gem-drag → gem-fallback
   → gem-rig → gem3d`.
   - dev: middleware serves it per request (fresh read of the 23 files), `Cache-Control: no-cache,
     must-revalidate`, `ETag: W/"<sha1[:10]>"`, 304 on `If-None-Match`; the `?v=<hash>` in the dev HTML is
     recomputed every request, so an edit to any gem source busts it.
   - build: `this.emitFile({ fileName: 'vendor/gem-boot.js' })` → 110,673 B raw / ~39.1 KB gzip.
4. **Concatenation is semantics-preserving** — every gem file is already an IIFE or shares the classic global
   scope, so one script vs 23 scripts is the same global lexical environment; `;` joins prevent ASI joins.
5. **`pitch-overlay.js` deferred** — the remaining classic script; it only reads `#pitch-overlay` /
   `#pitch-frame` and attaches listeners, so `defer` is safe (verified: overlay opens, lazy iframe src set,
   `?pitch=1` deep link applied).
6. **Phosphor icons vendored** — the app *does* use the classes (`i.ph ph-envelope`, `ph-flame`,
   `ph-sliders-horizontal` in `opps-home.js`; toolbar/tabbar labs), so the stylesheet could not be dropped.
   Copied `style.css` + `Phosphor.woff2` + `Phosphor.woff` to `public/vendor/phosphor/`, rewrote the
   `@font-face` `src` to `/vendor/phosphor/…` (ttf/svg fallbacks keep the CDN URL as an ancient-browser last
   resort, never fetched by modern engines). `font-display: block` kept verbatim — changing it would shift
   paint. Effect: the 12,936 B CSS and 147 KB woff2 are now same-origin (2 third-party hops removed).
7. **Module-entry preload** — `entryPreloadPlugin` injects `<link rel="modulepreload" href="/src/glass/main.jsx">`
   in dev, and in the build post-processes the emitted `index.html` to add
   `<link rel="modulepreload" crossorigin href="/assets/main-<hash>.js"/>` (entry chunk name is only known
   after the HTML is finalised). Both verified present.
8. **`rawSourceRefsPlugin` fixes** — now resolves `config.build.outDir` instead of hardcoding `dist` (before,
   any `--outDir` build copied raw sources into the repo's `dist/` and the scratch build 404'd all 23 gem
   files), and normalises an optional leading `/` in refs. It still only copies refs that survive in built
   HTML, which is why its footprint did not change (gotcha 4).
9. **No fonts to `display=swap`** — `index.html` has no Google Fonts / remote font link; the app's own faces
   come from `public/fonts` via `src/ds/fonts.css`, which already declares `font-display: swap`.

## Commands (copy-paste)

```bash
cd "/Users/irfan/Documents/Portfolio Redo/crm_proj"

# production build into a scratch dir (never repo dist/)
npx vite build --outDir "$TMPDIR/l2-dist"

# serve it (only port 5211 is ours; kill between builds — strictPort)
npx vite preview --outDir "$TMPDIR/l2-dist" --port 5211 --strictPort --host 127.0.0.1

# dev server (same port), to check the dev-side gem-boot path
npx vite --port 5211 --strictPort --host 127.0.0.1

# inspect what the browser actually loads (puppeteer-core + headless Chrome, scratch harness)
node ~/.hermes/cache/scratch/l2/measure.mjs "http://127.0.0.1:5211/?app=fullscreen" ./after.json after
node ~/.hermes/cache/scratch/l2/summarize.mjs after.json "$TMPDIR/l2-dist"
```

`measure.mjs` records CDP `encodedDataLength` per response, `performance` entries with
`renderBlockingStatus`, the boot assertions, and a PNG pixel histogram of the gem canvas; `summarize.mjs`
recomputes raw/gzip/brotli byte totals **from the built files on disk** (server compression differs between
cdnjs and `vite preview`, so only disk totals are comparable).

Reproducing the "before" build: `git show` the HEAD copies of the 10 MPA `.html` files + `vite.config.js`
into a scratch tree whose `src/ public/ design-system/ tokens/ scripts/ node_modules/` are symlinks to the
repo (that is what `~/.hermes/cache/scratch/l2/base-repo` is). HEAD's `rawSourceRefsPlugin` writes into
`_dirname/dist`, so a plain `--outDir` build is not a valid baseline.

## Runtime verification (headless Chrome, iPhone UA, 393×852@3x, `/?app=fullscreen`)

- `window.THREE` object (REVISION 160), `window.GEM_CUT`, `window.GEM_RIG`, `window.GEM3D`,
  `window.GEM_APPEARANCE`, `window.GEM_SCENE` all `object`. `window.GEM_CUT_EXT … GEM_DRAG, GEM_FALLBACK`
  present in the same boot.
- Gem canvas: `WebGL2RenderingContext`, `renderer.info.render.triangles = 452`, `calls = 5` (the sheet must
  be opened — `.activity-strip [aria-label="Open goal reward"]` — or the canvas is `display:none` at 0×0).
  Canvas screenshot: 1020×960, 95.3–96.0 % non-background across runs (before: 96.0 %, after: 95.6 %;
  the delta is animation phase), ~1850–2170 distinct colours, visually the same faceted
  sapphire + caustic pool as before (vision-checked both).
- `document.body.classList.contains('app-fullscreen')` true on `?app=fullscreen`; `#exit-fullscreen` present.
- Console/page errors: `[]` in both before and after runs.
- Deferred `pitch-overlay.js` works: click `[data-open-pitch]` → `#pitch-overlay.hidden === false`,
  `#pitch-frame` gets its lazy `src`, URL gains `?pitch=1`.
- Request sanity: `/vendor/three.min.js` fetched exactly once (preload/`defer` did not double-fetch),
  `/vendor/gem-boot.js` exactly once, zero `src/components/GemReward/*.js` requests, no 4xx.
- Pixel diff before/after full-page screenshots (1179×2556): **0.0 % differing pixels in every 120 px band
  outside y=600…1289** (the animating gem sheet). All differences sit in the gem animation region.
- DS gallery unaffected: `/gallery.html` still has its 72 classic scripts / 27 gem tags, `window.GEM3D`
  present, 2 gem canvases, no new 404s; its pre-existing `TypeError: … reading 'el'` console errors are
  identical on the HEAD build (not introduced here).

## What did not work / was reverted

1. **`<link rel="modulepreload" href="./src/glass/main.jsx"/>` in the source head** — Vite's build asset
   pipeline inlined the JSX as a `data:text/jsx;base64,…` href (useless, ~1 KB of HTML, would have been
   parsed as a preload). Reverted; replaced with the build-time post-injection of the hashed entry chunk.
2. **Applying the gem-boot transform to every HTML entry** — `gallery.html` declares its own, longer classic
   gem stack (27 files, incl. `gem-bloom*` / `gem-tint*`, plus 49 other lab scripts). The unscoped transform
   collapsed it to a gem-boot built from `index.html`'s list, silently dropping bloom/tint. Caught by diffing
   built HTML; fixed by scoping to `index.html`. Not attempted for other pages (order-sensitive labs).
3. **`this.error()` in `buildStart` was masked** by `entryPreloadPlugin`/`rawSourceRefsPlugin` `closeBundle`
   hooks throwing `ENOENT` on the aborted build. Both now `return` when `outDir`/`index.html` is absent, so
   the guard message is the one the operator sees.
4. **Dev transform regex** — Vite rewrites `src="src/…"` to `src="/src/…"` before plugin HTML hooks, so the
   first version collapsed nothing in dev (prod was clean). Regex now allows the optional leading slash.
   Symptom to remember: dev shows 23 blocking tags, build shows 4.

## Gotchas for a successor

1. **Document order is the contract.** `three.min.js` must stay *above* the gem block, and the 23 tags in
   `index.html` are a manifest, not requests. Do not sort/reformat them, do not move the module tags above the
   gem block (module scripts and deferred classics share one ordered list; moving `main.jsx` earlier would
   change execution order).
2. **Never verify "the gem rendered" from a screenshot alone.** `gem3d.js` caches `const THREE_ = window.THREE`
   at parse time; if three lands late, it silently paints `GEM_FALLBACK`'s 2D gem, which looks plausible.
   Assert `GEM3D.rigs[i].renderer.info.render.triangles > 0` and `canvas.getContext('webgl2')`.
3. **The gem canvas only mounts visibly when the reward sheet opens** — click
   `.activity-strip [aria-label="Open goal reward"]` first, else the canvas is 0×0/`display:none`.
4. **`dist/src/` does not shrink.** `rawSourceRefsPlugin` copies the *union* of what built HTML still
   references; `gallery.html`, `deck.html`, `pitch.html`, `cube*.html` still declare the same 27
   `GemReward/*.js` files, so 122 → 122 files. The app entry alone requests none of them. Collapsing the
   gallery too would need a per-page gem-boot (its list differs) — proposed, not done: its `gem-panel.js` /
   `gem-resize.js` labs are classic and order-sensitive.
5. **`gem-boot.js?v=<sha1[:10]>`** — the query changes only when the concatenation changes; the file itself is
   emitted at a stable path (`vendor/gem-boot.js`), so a host with immutable caching on `/vendor/*` would pin
   it. Vercel does not; if you move it under `/assets/`, emit a hashed filename instead.
6. **The vendored three is the deprecated UMD build** (it logs a `console.warn` on load) — same as the old
   cdnjs tag. Migrating to ESM `three` would require touching the 23 gem sources (other lane's files).
7. **Phosphor woff2 is 147 KB** — now the second-largest asset after three.js. Per-icon inline SVGs (the app
   uses ~12 glyphs) would cut it, but that changes markup → out of scope, propose to the DS lane. Also:
   `@phosphor-icons/react` is a dependency but the app uses the CSS font, not the React package.
8. **`npx vite build` runs `mechanicsGraphPlugin`** (spawns `scripts/generate-mechanics-graph.js`, idempotent
   when fresh) and `dsDueWriter` is preview/dev-only. `node scripts/generate-mechanics-graph.js --check`
   still reports "graph fresh" after this lane.
9. **Port discipline** — every server above is `--port 5211 --strictPort`; kill it before starting the next
   build, or preview silently keeps serving the old `outDir`.
10. The measurement harness is scratch-only (`~/.hermes/cache/scratch/l2/{measure,summarize,probe,fn-check}.mjs`);
    nothing was added to `scripts/`.

## Proposal (not applied, needs files I do not own)

- `gallery.html` + `pitch.html` etc. still pay 25–27 parser-blocking gem requests each. A per-page gem-boot
  (list read from that page's own tags, emitted as `vendor/gem-boot-<page>.js`) would remove ~24 requests per
  DS page — but only after confirming those pages' classic lab scripts don't read gem globals at parse time.
- Phosphor: replace the 147 KB icon font with the ~12 inline SVGs the app actually uses.
