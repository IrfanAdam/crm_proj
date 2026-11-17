# Lane K — independent end-to-end audit of the uncommitted mobile-perf build

**Date:** 2026-11-16 · **Repo:** `/Users/irfan/Documents/Portfolio Redo/crm_proj` · **Base:** `b97b1de` (+ all uncommitted work)
**Auditor:** adversarial. No claim below was taken from the lane reports; every number is my own measurement.
**Port:** 5245 only, one headless Chrome, serially. No `git` write commands, no build/lint run in the live tree.

## Provenance of the numbers

| Tree | How | Used for |
|---|---|---|
| `$TMPDIR/k-snap` | `rsync -a` of the live tree, excluding `node_modules`/`dist`/`.git`; `node_modules` symlinked | build, laws, token grep, line budget. Snapshot taken 11:53. |
| `$TMPDIR/k-head` | `git archive b97b1de \| tar -x` | HEAD console baseline + HEAD dist for A/B |
| `$TMPDIR/k-dist` | `npx vite build --outDir $TMPDIR/k-dist` **inside the snapshot** → EXIT 0, "✓ built in 1.42s" | claim 1, 2, 5 |
| `$TMPDIR/k-head-dist` | same, inside `k-head` → EXIT 0, "✓ built in 2.41s" | HEAD baseline |

**Build blocker found and worked around (not a defect):** HEAD cannot build against this machine's
`node_modules`, because HEAD's `Icon.jsx` imports `@phosphor-icons/react@2.1.10` and this work uninstalled it.
I installed exactly `2.1.10` into scratch, built a symlink-farm `node_modules` for `k-head` with only that package
added, and re-ran the build. The live tree and the live `node_modules` were never touched. Without this step the
HEAD baseline does not exist at all — that itself is evidence the dependency is genuinely gone.

**Snapshot caveat:** the snapshot has no `.git`. `scripts/lint-tokens.mjs` enumerates via `git ls-files` and falls
back to a dot-dir-skipping walk when that throws, so in-snapshot it counts **1296** files, not 1757. Both runs exit 0.
The 1700s number is only reproducible in a real git worktree; I ran it read-only in the live repo to get it.

---

## Claim-by-claim verdict

| # | Claim | Verdict | My measured number |
|---|---|---|---|
| 1a | `<script>` count / classic tags in `dist/index.html` | **PASS** | 4 tags total: 1 module + 3 classic |
| 1b | Classic scripts lacking `defer`/`async` = 0 | **PASS** | **0 of 3** (`three.min.js`, `gem-boot.js`, `pitch-overlay.js` — all deferred) |
| 1c | Entry is modulepreloaded | **PASS** | entry `/assets/main-Ct8HM1Gu.js`; 3 `modulepreload` links, entry among them |
| 1d | `dist/vendor/{three.min.js,gem-boot.js,phosphor/}` exist | **PASS** | 669,884 B · 111,694 B · `Phosphor.woff`, `Phosphor.woff2`, `regular.css` |
| 1e | `dist/src/` no longer carries the 23 collapsed gem scripts **for the app entry** | **PASS (with a correction)** | `dist/index.html` declares **0** per-file gem scripts (the 23 are concatenated into `gem-boot.js`, which contains `GEM_CUT_EXT`/`GEM_CAUSTIC`/`GEM3D`). `dist/src/` *does* still hold **27** `gem-*.js` files (122 raw copies total) — but only because `gallery/pitch/cube/deck` still reference them; see next row. |
| 1f | `gallery.html` keeps its own gem scripts and is not broken | **PASS** | **29** gem script tags execute; `GEM_CUT/GEM_OPTICS/GEM_SCENE/GEM_RIG/GEM3D/GEM_FALLBACK` all defined; **0** resource failures; 23 nav items, 46 panels render |
| 2 | No console regressions across 9 MPA pages | **PASS** | per-page sets **identical** to HEAD; 0 new errors, 0 new warnings, 0 404s |
| 2b | `map.setBearing` is now silent | **UNPROVEN as a fix** | silent **at HEAD too**. `L.Map.prototype.setBearing` is a `function` in both builds (leaflet-rotate is dynamically imported), and opening the nearby map at HEAD throws nothing. The guard is real (`typeof map.setBearing === "function"`) and harmless, but the described "threw on every mount" does not reproduce. |
| 3a | `lint-tokens` → 0 leaks, 0 over-limit, file count in the 1700s | **PASS** | live tree: **1757 files**, 0 leaks, 0 over-limit, exit **0** |
| 3b | `plan-names` → exit 0, 22 plans | **PASS** | exit **0**, "✓ plan:names — **22** phased plans named" (both trees) |
| 3c | 100-line budget across changed files | **PASS** | max product file = **100** lines total = **99** content (`overlay-menu.css`, `chip.css`); next `rect-zoom.js` 99, `slider.css` 99 |
| 3d | `lint-tokens` hardened: 0 files → exit 2 | **PASS** | empty dir → "0 files enumerated … a lint that scans nothing is not a pass", exit **2** |
| 4 | No raw hex/rgb/px-magic introduced in changed CSS | **PASS** | **0** matches for `#hex`/`rgb()`/`hsl()` on added lines across all 21 changed CSS files |
| 5a | App boots past `#open-fullscreen` | **PASS** | button found, click → `body.app-fullscreen`; nothing else needed |
| 5b | Dock renders 3 icons at right size | **PASS** | House/Users/Handshake all **24×24** (attribute and `getBoundingClientRect`), `viewBox="0 0 256 256"` |
| 5c | Dock uses the right path data (regular + fill) | **PASS** | `d` lengths **256 / 406 / 723**; all **6** strings (3 glyphs × regular+fill) **byte-identical** to `@phosphor-icons/react@2.1.10/dist/defs/*` |
| 5d | Gem canvas is real WebGL2, not `GEM_FALLBACK` | **PASS** | `WebGL 2.0 (OpenGL ES 3.0 Chromium)`, context not lost; after opening the reward sheet the buffer is **340×182** with a texture bound; **no** fallback DOM; `GEM_FALLBACK` exposes only `paint` and is never engaged |
| + | Dock mirror `295 → 0` rect reads / 60-frame scroll | **PASS (direction + magnitude)** | identical procedure both trees: HEAD **290 total / 116 docklens** → snapshot **3 total / 1 docklens** |
| + | `transition: all` → explicit lists | **PASS** | **0** occurrences of `transition: all` anywhere in `src/**/*.css` |
| + | Containment kept | **PASS** | `reward-sheet.css` still carries `contain:layout paint` / `contain:layout` on its unchanged lines |
| + | Focus-ring defect real, and fixed | **PASS (1 of 4 sites runtime-proven)** | `--focus-ring` is `0 0 0 2px …` — a **box-shadow**, so as an `outline` it computes to none (diagnosis correct). Activity bar on keyboard focus now computes `rgb(33,138,234) solid 2px`, offset `2px`. |
| + | Icon removal actually shrinks the bundle | **PASS** | main chunk **486,578 B → 362,552 B** (−124,026 B, −25.5%) |
| + | `?dock=lean` leaves the default unchanged | **PASS (default) / UNPROVEN (lean engaged)** | default and `?dock=lean` render identical dock (24px, `d` 256/406/723), 0 errors; nothing in the DOM distinguishes lean mode, so I cannot prove the lean path actually ran |

---

## Console sweep — every MPA page, snapshot vs HEAD

Both dists built from the same machine, same Chrome, 2.5 s settle after `load`, three.js deprecation warning is the noise floor.

| Page | Snapshot build | HEAD `b97b1de` | Delta |
|---|---|---|---|
| `index.html` | 1 warn: three.js r150 deprecation | same 1 | none |
| `gallery.html` | warn + `TypeError: Cannot read properties of undefined (reading 'el')` @ `src/ds/deck-lab.js:16` | same | **pre-existing** |
| `pitch.html` | 1 warn | same | none |
| `changelog.html` | clean | clean | none |
| `preview.html` | clean | clean | none |
| `cube.html` | warn + `TypeError: … (reading 'shadow')` @ `src/components/GemReward/gem-textures.js:43` | same | **pre-existing** |
| `deck.html` | 1 warn | same | none |
| `cube-spline.html` | 4 warns (`updating from 131 to 115`, splinecode newer than loader, `encodings_fragment` chunk) + `THREE.WebGLProgram: Shader Error 0 — VALIDATE_STATUS false` | same set (+ `mergeBufferGeometries` deprecation warn) | **pre-existing**; snapshot has *one fewer* warning |
| `cube-illusion.html` | 1 warn | same | none |

**Answering the two specific questions:**
- **`gem-icons.js` deletion and `@phosphor-icons/react` removal broke nothing.** No page produces a module-resolution error, no icon renders empty, `gallery` has zero failed requests despite 29 classic gem scripts, and the app dock renders all three glyphs with correct geometry. The only symptom anywhere is the pre-existing upstream three.js deprecation warning, present at HEAD.
- **`map.setBearing` is silent — but it was silent before.** See 2b. The map builds, 16–23 tiles load, no exception at either revision. The guard is defensively correct but the "reproduced defect, then fixed" framing does not survive measurement.

Note on the sweep: the `gallery`/`cube` errors and the `cube-spline` shader error are third-party/entry-point issues that exist verbatim at `b97b1de`. They are regressions of nothing in this change set, but they *are* live defects on those pages.

---

## Law-check exit codes

| Command | Where | Output | Exit |
|---|---|---|---|
| `node scripts/lint-tokens.mjs` | live repo (read-only) | `✓ 0 raw leaks, 0 over-limit (1757 files scanned)` | **0** |
| `node scripts/lint-tokens.mjs` | snapshot (no `.git`) | `✓ … (1296 files scanned)` — walk fallback | **0** |
| `node scripts/lint-tokens.mjs` | empty dir | `✗ 0 files enumerated … a lint that scans nothing is not a pass` | **2** |
| `node scripts/plan-names.mjs` | live repo | `✓ 22 phased plans named` | **0** |
| `node scripts/plan-names.mjs` | snapshot | `✓ 22 phased plans named` | **0** |

### 100-line budget, all 58 changed files

Gate semantics confirmed in `lint-tokens.mjs:23` — `lines = txt.split('\n')`, fail when `lines.length > 100`,
so **content must be ≤ 99**. Measured over `git diff HEAD --name-only` (58 files; note plain `git diff` shows only
11 — the rest are staged):

- Product files at the edge, all **compliant**: `src/components/Overlay/overlay-menu.css` 100 (99 content),
  `src/components/Chip/chip.css` 100 (99), `src/glass/rect-zoom.js` 99, `src/components/Slider/slider.css` 99,
  `src/components/Avatar/avatar.css` 99, `src/components/TextInput/text-input.css` 98.
- **Over 100 but exempted** by `lint-tokens`' `.hermes/` clause: `tools/deterministic.mjs` **788**,
  `tools/trace.mjs` **511**, `tools/gate.mjs` **183**. Exempt, but the gate's green tick does not cover them.
- Over 100, not gated by extension: `design-system/plan-history.json` 13,600, `changelog-manifest.json` 4,749,
  `package-lock.json` 1,754, `src/arch/atlas.json` 488, `docs/graph.mmd` 365. Generated/host-owned, not product source.
- **Gate blind spot worth knowing:** `lint-tokens` only checks `.css|.html|.js|.mjs`. The four changed `.jsx` files
  (`Icon.jsx` 38, `lens-copy.jsx` 43, `slice-bands.jsx` 36, `icons.jsx` 49) are outside the budget gate entirely.
  All are comfortably under it, but nothing enforces that.

---

## Token law on the changed CSS

21 CSS files changed. Zero raw `#hex` / `rgb()` / `hsl()` on any added line.

The focus-ring fix uses `outline: var(--border-width-medium) solid var(--primitive-sapphire-ui-400)`, and both
tokens are real: `--border-width-medium: 2px`, `--primitive-sapphire-ui-400: #218aea`. **Layering note (not a gate
failure):** that is a *primitive* used directly in component CSS, bypassing any semantic `--focus-outline` token.
Legal under `lint-tokens` (it only bans raw literals), consistent with the `--focus-ring` token's own definition,
but it means the focus colour is now hard-wired in four files rather than behind one semantic alias.

Runtime proof (1 of 4 sites): tabbing to `.activity-strip__bar[role="button"]` gives
`outline: rgb(33,138,234) solid 2px; outline-offset: 2px`. Measurement trap for whoever re-checks this: a
programmatic `el.focus()` does **not** satisfy `:focus-visible` in Chrome and reports `outline: none` — you must
drive real `Tab` key events or the fix looks broken when it is not.

---

## Claim 5 in detail — boot with the dependency removed

```
entry chunk         /assets/main-Ct8HM1Gu.js   (362,552 B; HEAD was 486,578 B → −124,026 B / −25.5%)
modulepreloads      3, entry included
dock                Home     24×24  viewBox 0 0 256 256  d=256  fill=currentColor  rgb(41,41,41)
                    Leads    24×24  viewBox 0 0 256 256  d=406  fill=currentColor  rgb(41,41,41)
                    Opportunities 24×24 viewBox 0 0 256 256 d=723 fill=currentColor rgb(22,102,175)  ← active = fill weight
gem canvas          WebGL2 "WebGL 2.0 (OpenGL ES 3.0 Chromium)", not lost, drawingBuffer 340×182, texture bound
GEM_FALLBACK        exists, keys = ["paint"], never engaged, no fallback DOM node
console             1 warn (three.js deprecation), 0 errors
```

Path parity was checked against the real package, not the comment: all six `d` strings for
House/Users/Handshake × regular/fill are byte-identical to `@phosphor-icons/react@2.1.10`, which I installed
solely to diff against. The active dock item correctly switches to the **fill** variant (723 chars = Handshake fill).

---

## What I could not verify, and why

1. **`map.setBearing` as a defect fix** — unreproducible. `setBearing` exists at both revisions; nothing throws at HEAD. Verdict is "guard is correct, defect claim is not demonstrated", not "fixed".
2. **Three of the four focus-ring sites** — `overlay-menu.css`, `overlay-base.css`, `pitch-changelog.css`. I proved the token pairing and proved one site at runtime (reward-sheet). The other three need those specific overlays driven to keyboard focus on `gallery.html` / `changelog.html`; I verified them by source + token existence only.
3. **`?dock=lean` actually engaging** — default and lean render identically with no DOM marker, so I can confirm the default is unchanged and lean does not error, but not that the lean code path executed.
4. **The other `.hermes/evals/lane-*.md` numbers** — out of scope; I did not re-run other lanes' measurements (link-rate, FPS, memory, throttled mobile timings).
5. **Real mobile / CPU-throttled performance** — desktop headless Chrome only. No throttling, no real device. All perf numbers are structural (rect counts, chunk bytes), not frame timings.
6. **`gem-rig.js` ResizeObserver re-arm** — code differs as described (`api.arm` + `api.arm(rig)` inside the RO callback), but I did not force a dead-box-then-resize cycle to watch it revive.
7. **`dist/src/` literal reading of claim 1e** — the 27 gem files *are* physically present in `dist/src/`. They are unreferenced by `index.html` and exist only for the MPA pages. If the claim is meant literally about directory contents, it is false; if it means "the app entry no longer loads them one-by-one", it is true. Reported as PASS with that correction.

---

## Bottom line

The uncommitted work builds clean, boots clean, and regresses nothing measurable. The three claims I would
downgrade are 2b (`setBearing` — descriptive, not a reproduced defect), 1e (literal `dist/src` wording), and the
"all four focus rings fixed" framing (one proven at runtime, three by inspection). The numbers that matter hold:
**0** classic scripts without `defer`, **1757** files with **0** token leaks, **0** raw colours added, **3**
correct dock glyphs byte-identical to Phosphor, a **live WebGL2** gem canvas, and dock rect reads down from **116
to 1** per 60-frame scroll. Main chunk is **124 KB** lighter.
