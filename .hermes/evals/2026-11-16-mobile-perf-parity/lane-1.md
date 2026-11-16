# Lane 1 — mobile perf baseline trace + pixel oracle (Alphas CRM)

Baseline commit: **6b6b82864af4e4e67966c09562217aed059bd5a9** (HEAD at capture time), measured on a **frozen `git archive` copy**, never the live tree.
Harness: `.hermes/tmp/perf-mobile/trace.mjs` (new, reusable; read-only on repo source).
Captured: 2026-11-16 23:20–00:16 IST. Host load average during captures: **159–281** (other lanes' headless Chrome + build jobs). Absolute ms are inflated 2–4× by that contention; **ratios and request/byte/layer/DOM counts are load-independent and are the load-bearing evidence.**

---

## 1. Objective

Prove or refute, with numbers, that the fullscreen mobile surface (`body.app-fullscreen`, toggled by `#open-fullscreen` in `src/workspace/mobile-fullscreen.js`) is slow on a phone, and produce (a) a reusable trace harness, (b) the baseline numbers, (c) a pixel oracle for regression comparison, (d) a ranked hotspot list backed by metrics.

Measured surface = `index.html` served at `/` (393×852 dpr3, mobile emulation, 4× CPU throttle, headless Chrome, Metal GPU path), app entered through the real `#open-fullscreen` click.

---

## 2. Exact commands

```bash
REPO="/Users/irfan/Documents/Portfolio Redo/crm_proj"
BASE="$TMPDIR/perf-base"

# --- freeze HEAD (repeat this for every run: the live tree changes under you) ---
rm -rf "$BASE" && mkdir -p "$BASE"
cd "$REPO" && git archive HEAD | tar -x -C "$BASE"
ln -s "$REPO/node_modules" "$BASE/node_modules"

# --- serve the frozen copy (port 5210 only; 5173/5174/5194/5195 are someone else's) ---
cd "$BASE" && npx vite --port 5210 --host 127.0.0.1 --strictPort
#   start it with the tool's background mode, then verify:
curl -s -o /dev/null -w "%{http_code}\n" http://127.0.0.1:5210/    # expect 200

# --- trace (one cold measured pass, warm-up pass first) ---
cd "$REPO"
node .hermes/tmp/perf-mobile/trace.mjs --port 5210 --label base

# --- trace, single cold pass, no warm-up (this is what produced out/base.json) ---
node .hermes/tmp/perf-mobile/trace.mjs --port 5210 --label base --no-warm --runs 1

# --- attribution A/B: same tree with the React dock island blocked ---
node .hermes/tmp/perf-mobile/trace.mjs --port 5210 --label ab-nodock --no-warm --runs 1 \
  --ready cards --block '*glass/main.jsx*,*BottomDock*,*@phosphor-icons*'

# --- pixel oracle (CPU 1x; stills are not a timing measurement) ---
node .hermes/tmp/perf-mobile/trace.mjs --port 5210 --label base --mode oracle --no-throttle

# --- everything in one go ---
node .hermes/tmp/perf-mobile/trace.mjs --port 5210 --label base --mode both
```

Flags: `--port` `--label` `--mode trace|oracle|both` `--url <base>` `--runs N` `--no-warm` `--no-throttle` `--trace-swift` `--ready dock|cards` `--block 'a,b,c'` `--boot-timeout ms` `--out <dir>` `--oracle-dir <dir>`.
Outputs: `out/<label>.json` (+ `.run.log`), `oracle/<label>/*.png` + `oracle/<label>/index.json`.

---

## 3. Baseline numbers (label `base`, cold pass)

`out/base.json` — 393×852 dpr3, mobile:true, CPU 4×, Metal, first navigation with the HTTP cache disabled (no warm-up pass, so this is a true cold visit), load avg 218.8.

| metric | value |
|---|---|
| boot: hydrated (feed + `.tabbar` + `.fab-gem`) | **76 308 ms** |
| boot: fullscreen entered | 85 980 ms |
| DOMContentLoaded / load | 71 629 / 71 873 ms |
| FCP / LCP | 2 640 / 85 472 ms |
| requests / transfer | **150 / 10 654 704 B (10.15 MiB)** |
| … Script | 95 req / 10 088 KiB |
| … Stylesheet | 28 req / 123 KiB |
| … Image / Font | 20 / 1 (31 KiB / 145 KiB) |
| external requests | 23 (cdnjs, jsdelivr, i.pravatar.cc, arcgisonline) |
| parser-blocking classic `<script>` (no defer/async, no `type=module`) | **25** |
| script tags / module scripts / defer+async | 33 / 9 / **0** |
| stylesheet links in `<head>` | **28** (1 truly external, jsdelivr Phosphor) |
| boot `TaskDuration` | **84 800 ms** |
| boot `ScriptDuration` | **73 310 ms** (86 % of task time) |
| boot `LayoutDuration` / `RecalcStyleDuration` | 2 980 / 2 860 ms |
| boot layout count / recalc count | 28 / 42 |
| boot `JSHeapUsedSize` / `Nodes` | 48.6 MB / 14 671 |
| long tasks at boot | **33, total 81 986 ms, worst 65 213 ms** |
| scroll pass (60 rAF steps) ΔTask / ΔScript | **10 280 / 1 710 ms** |
| scroll ΔLayoutCount / ΔRecalcStyleCount | 66 / 184 |
| scroll long tasks | 44, total 9 581 ms, worst 529 ms |
| frame p50 / p95 / worst | **233.3 / 483.4 / 550 ms** |
| frames >16.7 ms / >33 ms | 58/59 (98.3 %) / 57/59 (96.6 %) |
| composited layers | **153** (131 draw content) |
| layers with a backdrop-filter reason | **22** |
| total layer bitmap at dpr3 | **341.7 MiB** |
| largest layer | 393 × 1622 CSS px |
| DOM blur surfaces (`backdrop-filter != none`) | **20** |
| DOM nodes total | 3 753 |
| `.docklens*` nodes | **2 877 (76.7 % of all nodes)**, 6 copies, 24 duplicated feed cards |
| will-change elements | 48 |

Repeat samples (same host, other load levels) for scale: warm-cache pass `hydrated 32 852 ms`, ΔTask 4 430 ms, frames p50 83.3 ms, at load ≈165; swiftshader pass `hydrated 47 086 ms`, frames p50 466.6 ms.

### Attribution A/B (label `ab-nodock`, load 158.6)

| metric | base | dock island blocked | delta |
|---|---|---|---|
| boot hydrated | 76 308 ms | **4 050 ms** | −72.3 s (19×) |
| boot `TaskDuration` | 84 800 ms | 6 190 ms | −78.6 s |
| boot `ScriptDuration` | 73 310 ms | 2 270 ms | −71.0 s |
| requests / transfer | 150 / 10.15 MiB | 115 / 2.20 MiB | −35 req / −7.95 MiB |
| DOM nodes | 3 753 | 849 | −2 904 |
| DOM blur surfaces | 20 | 16 | −4 |
| composited layers (backdrop) | 153 (22) | 4 (0) | −149 / −22 |
| frames p50 / >33 ms | 233.3 ms / 96.6 % | 100 ms / 93.2 % | cadence did **not** recover |
| scroll ΔLayout / ΔRecalcStyle | 66 / 184 | 65 / 65 | — |

Blocked URLs: `*glass/main.jsx*`, `*BottomDock*`, `*@phosphor-icons*`. The run stopped at `--ready cards` (feed + `window.THREE`), so `.tabbar`/`.fab-gem` never mounted.

---

## 4. Ranked hotspots (each backed by a number above)

1. **The React dock island is the boot cost, not the feed.** Blocking `glass/main.jsx` + `BottomDock` + `@phosphor-icons` drops boot from **76 308 → 4 050 ms** and `ScriptDuration` from **73 310 → 2 270 ms**. A CPU profile of the boot window attributes **15.24 s of 21.0 s sampled (72.6 %)** to `exports.createElement` inside the Vite-prebundled React chunk, and the single largest download is `/node_modules/.vite/deps/@phosphor-icons_react.js` at **6 619 706 B (6.3 MiB)** — 65 % of all script bytes. (That path is a dev-only prebundle of the `@phosphor-icons/react` barrel; the lever for the shipped app is that barrel import + the `liquid-glass` render tree, not the file itself.)
2. **25 parser-blocking classic scripts, zero defer/async.** Frozen `index.html` = 32 `<script src>` (25 classic: CDN `three.min.js` + 23 `gem-*.js` + `pitch-overlay.js`; 7 module). Boot `ScriptDuration` **73 310 ms of 84 800 ms `TaskDuration` (86 %)**, worst single long task **65 213 ms**, DCL **71 629 ms**. Parser-blocking is structural: none of the 25 carries `defer`/`async`.
3. **Compositing/layer bloat in fullscreen.** **153 composited layers, 22 carrying a backdrop-filter reason, 341.7 MiB** of layer bitmap at dpr3 (largest 393×1622). 18 of the 20 blur surfaces are the `.device__edge` slice stacks (10 top at 393×104, 8 bottom at 393×78) — they sit over the scrolling feed, which is why the scroll pass re-blurs every frame.
4. **The dock lens multiplies the DOM.** `.docklens*` = **2 877 of 3 753 nodes (76.7 %)**, from **6 copies**, including **24 duplicated `.opp-card`** (feed itself is 4). Any per-node work (style recalc, createElement, cloneNode) pays that multiplier.
5. **Scroll interaction is task-bound, and the residual is the feed + edge blur.** Over 60 rAF scroll steps: **ΔTaskDuration 10 280 ms**, **ΔRecalcStyleCount 184**, **ΔLayoutCount 66**, 44 long tasks (9 581 ms, worst 529 ms). With the dock blocked it is still **ΔTask 3 740 ms / layout 65 / recalc 65** — i.e. the dock is ~63 % of scroll task time, the rest is feed + blur layers.
6. **28 render-blocking stylesheets, unbundled.** 28 `<link rel=stylesheet>` in `<head>`, 0 deferral possible; 123 KiB total but 28 blocking round-trips before first paint (FCP 2 640 ms even with TTFB 6 ms).
7. **Second-order: frames are load-bound on this host.** p50 233 ms at load 219 vs 83 ms at load 165 vs 100 ms with the dock removed — do **not** quote a frame number without the load average; re-measure on a quiet machine before/after a fix.

---

## 5. Pixel oracle (frozen baseline)

Directory: `.hermes/tmp/perf-mobile/oracle/base/` — 8 surfaces × 2 PNGs (`*.full.png` full-page via `captureBeyondViewport`, `*.vp.png` viewport), plus `index.json` with `reachedBy` per surface. Desktop = 1440×900 dpr1 (full = 1440×908); mobile = 393×852 dpr3 (1179×2556). `prefers-reduced-motion: reduce` forced; CPU 1×.

| surface | state | file(s) | how it was reached |
|---|---|---|---|
| desktop | home-rest | `desktop--home-rest.full.png` / `.vp.png` | `GET /` at 1440×900 dpr1, untouched |
| desktop | feed-mid | `desktop--feed-mid.*` | `#app-content.scrollTop = 55 %` of scroll range |
| desktop | dock-fab | `desktop--dock-fab.*` | `#app-content` at end — `.tabbar` + `.fab-gem` over content |
| desktop | sheet-reward | `desktop--sheet-reward.*` | click the wired peak `.activity-strip` bar (`role=button`) → `#reward-sheet` unhidden |
| mobile | home-rest | `mobile--home-rest.*` | 393×852 dpr3 mobile → click `#open-fullscreen` → `body.app-fullscreen`, scrollTop 0 |
| mobile | feed-mid | `mobile--feed-mid.*` | `#app-content.scrollTop = 50 %` |
| mobile | dock-fab | `mobile--dock-fab.*` | `#app-content` at end |
| mobile | sheet-reward | `mobile--sheet-reward.*` | same peak-bar click; gem canvas + "Rock Solid Goals" overlay |

Nondeterministic by nature (declared in `index.json`): Esri raster map tiles, `i.pravatar.cc` avatars, WebGL gem frames. Diff the before/after sets with `python3 .hermes/tmp/perf/pngdiff.py`; expect nonzero diffs confined to those three regions.

Mobile `.full` ≈ `.vp` because the fullscreen document is exactly `100dvh`; the feed scrolls inside `#app-content`, not the document.

---

## 6. What did NOT work / corrected mid-flight

- **swiftshader** (`--trace-swift`): frames p50 466 ms and a single 24.6 s task — software GL, not a phone. Use the Metal path (default); `--trace-swift` exists only as a fallback.
- **`LayerTree` returns 0 layers** unless the compositor actually produces a new tree after `LayerTree.enable`; the first event can also be a small tree. Fix in the harness: keep the **largest** tree seen and nudge with a 40 px scroll. Empty result is a harness bug, not "0 layers".
- **Warm-up + `Network.setCacheDisabled`** made the measured pass report **16 KiB / 141 requests** (memory-cache hits). Cache is now disabled only when a warm-up pass ran; a single cold pass is the default for byte counts.
- **`node trace.mjs | tail -60`** buffers everything to exit — write to a log file instead.
- **`npx vite … &` inside a one-shot terminal call dies with the shell.** Start the server with the tool's tracked background mode and verify with `curl`/`lsof -iTCP:5210`.
- **Reward sheet trigger**: the wired element is the *peak* bar (`PEAK = BARS.indexOf(max)`), not the last child — first oracle pass captured 6/8 surfaces with `peak-not-wired`. Now selects `[role=button]`/`[tabindex]`.
- **`dist/` is untracked and volatile** (rebuilt by another lane at 23:05 → 23:18 → … during this session), so it cannot be a baseline. Static counts only: `dist/index.html` = 26 `<script src>` (25 classic, 1 module, **0 defer/async**) + 5 stylesheets — this **confirms** the "1 module bundle + 26 script tags, 25 classic parser-blocking" item. Breakdown of the 25: CDN `three.min.js` + 23 `src/components/GemReward/gem-*.js` + `src/pitch/pitch-overlay.js` (the "24 raw scripts" are 23 gem + pitch-overlay).
- **`cssLinksExternal: 28`** in the JSON is a regex artifact (Vite rewrites `href` to absolute URLs); true external stylesheets = 1.
- Vite dev adds noise the shipped app does not have: `/@vite/client`, `/@react-refresh`, 9 module entries, and the 6.3 MiB icons prebundle → 95 script requests vs 26 tags in `dist`. Judge a fix against the same dev baseline, or serve `dist/` statically on a spare port and trace with `--url`.

---

## 7. Gotchas for whoever resumes

- The live tree is being edited by sibling lanes (`index.html`, `gem-*.js`, `mobile-fullscreen.js`, `vite.config.js` all dirty during capture). **Always re-freeze** `$TMPDIR/perf-base` from `git archive HEAD` before measuring; the harness will happily trace a tree someone else is mid-edit on.
- `vite.config.js` plugins write into the served tree (`graphData*.js` timestamps, `.hermes/plans`) — that is why the frozen copy must be disposable, and why the live tree must never be served for these runs.
- The harness is read-only: it clicks, scrolls and reads. It never writes into the repo except `out/` and `oracle/`.
- Ports: harness/serve on **5210** only. `--block` A/B runs are diagnostics, not baselines — keep them labelled `ab-*`.
- Files: `trace.mjs` (harness), `probe-boot.mjs`, `probe-census.mjs`, `profile-boot.mjs`, `probe-layers.mjs` (one-off diagnostics; each is self-contained and safe to delete).
- `out/base.json`, `out/ab-nodock.json`, `out/*.run.log`, `oracle/base/*`.
- Re-run the gate list when a fix lands: `node .hermes/tmp/perf-mobile/trace.mjs --port 5210 --label after --mode both`, then compare `out/base.json` vs `out/after.json` (same host load band) and `oracle/base` vs `oracle/after`.
