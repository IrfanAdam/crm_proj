# Eval — Mobile perf parity (2026-11-16)

**Question this eval answers:** does the Alphas prototype run on a mobile browser with the same
smoothness it has on desktop, at zero visual change?

**Owner bar:** *"I need it moving as smooth on the mobile browser as in desktop"* — no visual change.
**Plan:** `.hermes/plans/2026-11-16_225300-mobile-perf-parity.md`
**Started:** 2026-11-16 22:53 IST · **Branch:** main · **Base commit:** `6b6b828`

> Resume protocol is at the bottom. Everything a fresh session needs to continue is in this file and
> the `lane-*.md` siblings. Do not re-derive the baseline from scratch — it is recorded below.

---

## 1. Acceptance gate

A change belongs to this eval only if **both** hold:

1. **No visual change** — rendered PNG stills before/after diff at `pixelDiff == 0`, or at worst
   `≤0.05 %` of pixels with `maxChannelDelta ≤ 1/255`. Anything above that is reverted, not argued.
2. **A measured win** — the lane names the metric that improved and the before → after numbers.
   "Feels faster" is not a result. A lane that returns `no-change` *with numbers* is a valid outcome.

The eval as a whole closes when the throttled-mobile frame cadence reaches desktop parity
(target: **p95 frame ≤ 20 ms and 0 frames > 33 ms** during a scripted scroll at 393×852 DPR 3, 4× CPU
throttle), with every gate below green.

## 2. Baseline recon (measured on HEAD `6b6b828`, before any lane edited anything)

Load path — from `dist/index.html` and `du`/`gzip`:

| Fact | Number |
|---|---|
| Script tags on `/` | **26** — 1 module bundle + 25 classic |
| Parser-blocking scripts | **25** (no `defer`/`async` on any) |
| Third-party CDN | `cdnjs.cloudflare.com/…/three.js@0.160.0/three.min.js` (~600 K raw / ~150 K gz) |
| Classic gem scripts served raw from `dist/src/` | **24** (`src/components/GemReward/*.js` + `src/pitch/pitch-overlay.js`) |
| `dist/src/` payload | **122 files · 624 K**, copied verbatim by `rawSourceRefsPlugin` |
| Main bundle | `main-*.js` 476 K raw / **140 K gz** |
| Main CSS | `main-*.css` 56 K raw / **9 K gz** |
| Stylesheets in dev `index.html` | **28** render-blocking links (prod bundles to 5) |
| `dist` total | 7.1 M |

Compositor / paint census — from grep over `src/`:

| Fact | Number |
|---|---|
| `backdrop-filter` sites | 44 total; **8 in `src/glass/dock-lens.css`**, 4 in `mechanics.css`, 2 each in `edge-material`/`shell`/`atlas`/`nearby-sheet`/`pitch-*` |
| Animated filter | `dock-lens.css:52` — `transition: … backdrop-filter 220ms ease` (a transitioning filter cannot composite) |
| Permanent promotion | `edge-material.css:5` — `.device__edge > span` carries `will-change: backdrop-filter` on always-visible spans |
| Progressive-blur stack | `.device__edge` stacks N gradient-masked `backdrop-filter` spans, shown full-bleed in `body.app-fullscreen` |
| `filter: blur()` sites | 26 |
| `box-shadow` declarations | **119** |
| `content-visibility` usage | **0** |
| rAF loop sites | 18 files |

Runtime — read from source:

| Fact | Location |
|---|---|
| rAF rescheduled **before** the visibility check → offscreen/hidden rigs keep a hot loop forever | `GemReward/gem3d.js` (`requestAnimationFrame(loop)` precedes the `!rig.vis` early-return); same shape suspected in `deck3d.js`, `cube3d.js`, `illusion3d.js` |
| Forced layout **inside** the render loop | `gem3d.js` calls `window.GEM_RIG.size(rig)` every frame (reads `clientWidth`/`clientHeight`) |
| Perpetual rAF with no park | `patterns/OppsHome/live-map-breath.js` |
| Pixel-ratio cap | every rig: `Math.min(devicePixelRatio, 2)` + `antialias: true, alpha: true` |
| `passive: false` listeners | 3 sites |

## 3. Lane roster

Each lane owns a disjoint file set — no two lanes write the same file. Ports: never 5173/5174
(owner's servers) or 5194/5195 (existing gem harness).

| Lane | Scope | Write ownership | Port | Report |
|---|---|---|---|---|
| 1 | Trace harness + frozen pixel oracle | read-only (`.hermes/tmp/perf-mobile/`) | 5210 | `lane-1.md` |
| 2 | Load path: vendor three.js, collapse 24 scripts | `index.html`, `vite.config.js`, `public/vendor/` | 5211 | `lane-2.md` |
| 3 | Glass compositing: edge stack, dock lens | `src/glass/*.css`, `src/os/edge-material.css`, `src/shell/shell.css`, `src/device/frame.css` | 5212 | `lane-3.md` |
| 4 | WebGL/motion: park loops, hoist layout reads | `src/components/**/*.js`, `src/motion/*.js`, `src/logic/time-scale.js` | 5213 | `lane-4.md` |
| 5 | Interaction: scroll/pointer thrash | `src/patterns/OppsHome/*.js`, `src/workspace/*.js`, `src/os/status-bar.js` | 5214 | `lane-5.md` |
| 6 | CSS paint budget: containment, shadow stacks | `src/components/**/*.css`, `src/patterns/**/*.css` | 5215 | `lane-6.md` |
| 7 | iOS-Safari diagnostic (read-only) | none | 5216 | `lane-7.md` |

## 4. Status board

### Batch 1 — foundation, landed in `b97b1de`

| Lane | State | Landed? | Headline number |
|---|---|---|---|
| 1 | done | harness + reports only | baseline: 25 parser-blocking scripts, 150 req / 10.15 MiB, p95 frame 483 ms, 96.6 % frames > 33 ms |
| 2 | done | yes | script tags **26 → 4**, parser-blocking **25 → 0**, third-party origins **5 → 3** (request count: see §4c) |
| 3 | interrupted | partial (the one safe edit) | `.device__edge > span` `will-change` removed — then lane D showed the whole stack is unmeasurable |
| 4 | done | yes | offscreen gem rAF **21.5/s → 0** (lane G re-measured), resume-without-jump verified |
| 5 | done | yes | LayoutCount **86 → 41**; magnitudes corrected in §4c |
| 6 | interrupted | partial (containment edits) | no report — lane E audited these instead (§4, batch 2) |
| 7 | done | read-only | **92 % of all DOM is duplicated inside the dock** (8 917 / ~9 776 nodes); hiding it = −62 % frame time |

### Batch 2 — deep, reports `lane-B.md` … `lane-G.md`

| Lane | State | Landed? | Headline number |
|---|---|---|---|
| **B** | done | yes | dock-mirror layout reads **295 → 0** per 60-frame scroll (`4.92 → 0.00` gBCR/frame); RecalcStyleCount **−32 %** |
| **C** | done | yes | cold-load JS **9.49 → 3.56 MiB (−62.4 %)**; ScriptDuration **16.7 s → 1.67 s**; fullscreen **17.0 s → 1.6 s**; glyphs byte-identical (3 independent proofs) |
| **D** | done | **nothing landed** | the +55 % does **not** reproduce; deleting the *entire* edge stack buys 0 ± 4 %. Negative result, useful |
| **E** | done | yes (CSS only) | containment audited rule by rule; `transition: all` → explicit lists in **18 files / 25 declarations**; no shadow stack collapses safely |
| **F** | done | **opt-in only** (`?dock=lean`) | **35.5 % of dock pixels by ≤81/255, all in the rim bevel, for −63 % main-thread / −36 % frame time** |
| **G** | done | read-only | 13 claims audited: 8 PASS, 3 PASS-on-direction-magnitude-wrong, 1 FAIL on a count, 1 PARTIAL — see §4c |
| **A** | **not reported at commit time** | tools/ | deterministic gate. The preserved `tools/gate.mjs` is the **pre-hardening** copy and no green run is on disk — see the batch-3 rows and §7 before trusting any pixel claim above |

### Batch 3 — defects, tooling, gate — all uncommitted at this writing

| Lane | State | Landed? | Headline number |
|---|---|---|---|
| **C2** | done | yes | dead `gem-icons.js` (88 lines) deleted, `@phosphor-icons/react` dropped from `package.json` + lock (13 lock lines, nothing else moved); entry chunk **362 571 raw / 112 762 gz — unchanged**, all **361** dist files byte-identical, 6/6 icon×weight markup snapshots identical, `npm ci` exit 0 |
| **H** | done | yes | two pre-existing defects: `live-map.js:32` called the plugin-only `setBearing` unguarded (throws before `L.tileLayer()`, so the map silently loses tiles) — now guarded, and the audit's *standing* console error **did not reproduce**; `outline: var(--focus-ring)` is invalid (that token is a box-shadow) so 4 `:focus-visible` sites rendered **no** ring — restored: **486 / 872 / 318 px** of ring that was not there, resting diff **0 px** |
| **I** | done | yes | `lint:tokens` used to exit 0 after enumerating **0 files**; now exits **2** naming the cause and the cwd, and a green run prints its file count. `gem-rig.js` now arms from its own ResizeObserver like deck3d/cube3d/illusion3d — a restored box goes **0 → 57 rAF/s** with no `t` jump |
| **J** | done | yes | generated artifacts resynced with the repo's own generators, nothing hand-edited: `map-graph` (266 modules, **222 edges**, 0 cycles) → `gen:atlas` (46/16) → `gen:mechanics` (15/19/13) → `ds:track`. `docs/graph.mmd` **+102/−9** (96→125 nodes, 158→222 edges) and the deleted `Icon → gem-icons.js` edge is **gone — 0 occurrences** in `.mmd`, `atlas.json` and every `graphData*`; `atlas.json` and `graphData*` changed in **metadata only**; `changelog` wip 31→37; `plan-history` +148 lines → **341 revs**, rerun byte-identical. Verifiers: `verify:atlas` fresh, `verify:mechanics` fresh, `lint:tokens` 0 leaks over **1 758 files** (not zero, so the new guard is not masking), `plan-names` 22/22, full `npm test` **197 assertions, 0 failures**. The dead edge had no generator invocation path at all — `map-graph.mjs` is wired to no npm script and no hook, which is why it sat from Oct 3 |
| **K** | done | yes | independent adversarial re-verification from a snapshot. Build **exit 0**, `dist/index.html` = 4 script tags (1 module + 3 classic), **0 of 3** lacking `defer`/`async`, entry modulepreloaded, `dist/vendor/{three.min.js,gem-boot.js,phosphor/}` all present; entry chunk **486 578 → 362 552 B (−124 KB)**. **9 MPA pages swept, error sets identical to `b97b1de`** — the dependency removal broke nothing. Dock glyphs 24×24, `d` lengths 256/406/723, all 6 path strings **byte-identical to the real `@phosphor-icons/react@2.1.10`** (installed and diffed, not trusted). Gem canvas live WebGL2, no fallback. Tokens: **0** raw hex/rgb/hsl on added lines across 21 changed CSS files; longest file **100 total = 99 content** |
| **A** | done (parent-finished) | harness only | three subagent attempts died mid-run; finished by the parent, report written by the parent — `lane-A.md`. Determinism **15 / 16 rows byte-identical** at `--strict` across two independent launches, every shot asserted byte-identical on a 300 ms repeat. The 16th (`desktop--feed-mid.full`) differs **30 px, maxΔ 21**, proved to be edge anti-aliasing (identical bbox, **IoU 0.99954**, 2 px across the threshold, 77 % of diffs on the boundary). The outlier the dead lane was chasing (`desktop--sheet-reward.vp`, maxΔ 38) is now **0 px / maxΔ 0**. Gate hardened **8 932 → 18 579 B** with `--strict`, `--noise`, `--capture-only`, refuses incomplete sets and legacy oracles, and now resolves its oracle dir from the repo root so the durable `tools/` copy runs standalone |

**Three claims K could not substantiate, recorded rather than smoothed over:** the `map.setBearing` defect
does not reproduce with the plugin present (both H and K agree — the guard is correct defensive code, the
reported "throws on every mount" is not), `dist/src/` still holds **27 gem files / 122 copies** because
gallery/pitch/cube/deck legitimately declare them (only the app entry declares none — see D6), and the
focus-ring fix is runtime-proven on **1 of 4** sites (the others are token-diagnosed; note that programmatic
`.focus()` reports `outline: none`, so real `Tab` events are required).

## 4b. What the numbers actually say (synthesis)

The mobile cost is **not** micro-optimisation. Ranked by measured win:

1. **The dock's slice ladder duplicates the whole feed 15×.** 8 917 of ~9 776 DOM nodes, rendered
   through a 293×56 px window. Hiding `.docklens` → frame time −62 %, long tasks 1 480 → 68 ms;
   hiding only the 14 slice copies → frame p50 **−18 % quiet … −45 % busy**, TaskDuration **−49 %**, long
   tasks **−61 %** (lane F measured it; the single "37 %" figure that circulated is the floor of the frame
   win, not the whole effect). `placeBand()` also forced ~36 layouts per scroll.
2. **The React dock island is most of the boot.** Blocking it: boot **76 308 → 4 050 ms**,
   ScriptDuration **73 310 → 2 270 ms**; 72.6 % of boot samples sit in `createElement`; the single
   biggest download was a **6.62 MB** `@phosphor-icons/react` dev prebundle (6.21 MB as built, §5c).
3. **25 parser-blocking scripts** — fixed (lane 2).
4. **153 composited layers, 22 backdrop-filter, 341.7 MiB of layer bitmaps** at DPR 3.
5. Feed scroll residual: 3.74 s task / 65 layouts — 5 `gBCR` + 2 `scrollTop` reads per frame came from
   `src/glass/lens-copy.jsx` + `band-mirror.js`, which no lane owned when this was written. **Lane B has
   since taken them to 0.00 reads per frame** (RecalcStyleCount −32 %, pixel-identical).

**The eval cannot close at zero visual change.** Lane 7's finding is structural: the dock's 14-slice
mirror, the 5-stop band, and the 6px capsule frost are ~88 % of the dock cost and all three are
*visible by construction*. The zero-pixel subset is worth ~5–12 % — nowhere near the frame target. Closing
this eval needs an owner decision on dock material — that is a design call, not a perf tweak.

## 4c. Corrections from the independent audit (lane G)

Lane G rebuilt `b97b1de` from a frozen `git archive` and re-measured it adversarially. Where its number
disagrees with a lane's self-report, **G's number is the one to quote**:

| claim as first reported | audited reality |
|---|---|
| requests 54 → 32 | **63 → 41** on a built `dist` (the 54→32 pair came from a different dev-server run). Direction correct, count wrong |
| scroll LayoutDuration **73.8 → 6.1 ms** (12×) | **34.2 → 11.2 ms** (3.1×). LayoutCount 86 → 41 does reproduce |
| long tasks **51 → 7** | **33 → 16** |
| forced reflow 2.6–3.2/s → 0 | structurally true (0 in-frame reads); the 2.6–3.2/s magnitude did not reproduce |
| deck/cube/illusion/gooey parking | source-verified, still render correctly; offscreen behaviour **not** instrumented → PARTIAL |

Everything else in G's table is PASS, including the two that mattered most: **4 script tags / 0
parser-blocking** (baseline 26/25 reproduces exactly), and **zero-pixel** on the feed (byte-identical
PNGs at rest and at scrollTop 760).

## 5. Decision log

| # | Decision | Why |
|---|---|---|
| D1 | One plan for the whole build, not one per lane | Weekly build convention — lanes are workstreams, not plans |
| D2 | Lanes do **not** run `npm run build` / `npm test` / `ds-track` / `generate-*`, and do **not** commit | Those write shared generated files and race each other; the parent runs gates once at integration and owns the commits |
| D3 | Baseline is measured on a **frozen** `git archive HEAD` copy | The live tree is being edited by six lanes concurrently; a trace of the live tree measures a moving target |
| D4 | Zero-pixel-delta is a hard gate, so DPR caps, antialias removal and motion-feel changes are **out of scope** | They pay well but they change what the owner sees; flagged as proposals instead |
| D5 | Reports are written to this directory as each lane finishes | So the audit survives the session |
| D6 | Lane 2's gem-boot collapse is scoped to `index.html` only | Applying it to every MPA entry silently broke `gallery.html` (its own 27-file gem stack + bloom/tint). Consequence stated plainly: `dist/src/` stays 122 files because other pages still declare those files; the **app entry requests none of them** |
| D7 | `public/vendor/` is exempt from the 100-line lint | Vendored third-party files are not ours to compress — same class as `node_modules/`. Applied when the vendored Phosphor CSS (4 629 lines) reddened `lint:tokens` |
| D8 | `vite.config.js` split into `scripts/vite/gem-boot.mjs` + `scripts/vite/entry-preload.mjs` | Lane 2's three plugins put the config at 237 lines. Behaviour unchanged; `__dirname` replaced with `fileURLToPath` because `__dirname` does not exist inside an imported ESM module |
| D9 | Lane 3 and lane 6 were interrupted mid-run; their landed edits were kept | Both were small, coherent, and non-half-written (verified by diff before keeping). Their pixel proofs were re-run by the parent instead of accepted as self-reports |

## 5b. Integration gate results (parent)

- `lint:tokens` ✗ → fixed: five lane-touched files trimmed from 101 to 100 `split('\n')` entries
  (the gate counts the trailing newline, so content must be ≤99 lines), vendor + config exemptions
  added, config split. Now ✓ 0 raw leaks, 0 over-limit.
- `npm run test` ✓ — all suites green (plan:names 22 named, ds-track 22/22 tagged, verify:atlas fresh,
  verify:mechanics fresh). `gen:atlas` was required first because gem-file edits make `verify:atlas`
  mtime-stale.
- `npm run build` ✓ — `dist/index.html` ships 4 script tags (1 module + 3 `defer`),
  **0 classic scripts without `defer`**, and `dist/vendor/{three.min.js, gem-boot.js, phosphor/}`.

## 5c. Before → after, measured on the real app (harness `trace.mjs --mode trace`)

⚠️ **The host was not quiet for both runs** — base was traced at load avg 219 while the *after* run
saw 65, so absolute milliseconds are not a clean A/B. Counts, bytes and node totals are
load-independent and are the trustworthy columns; frame numbers are directional only. The reliable
statement about scroll smoothness is lane 5's load-controlled pair **as corrected in §4c**:
LayoutDuration **34.2 → 11.2 ms** (3.1×, not the 12× first reported), long tasks **33 → 16** (not
51 → 7), LayoutCount 86 → 41.

| metric | base (6b6b828) | after (b97b1de) |
|---|---|---|
| classic scripts without `defer`/`async` | **25** | **0** |
| script tags | 33 | 11 |
| requests on `/` | 150 | 119 |
| third-party requests | 23 | 14 |
| third-party origins | 5 | 3 (`cdnjs` + `jsdelivr` gone) |
| total transfer | 10.16 MiB | 9.84 MiB |
| boot (hydrated) | 76 308 ms @load 219 | 21 824 ms @load 65 |
| frame p50 / p95 | 233 / 483 ms | 33.5 / 83 ms |
| % frames over 33 ms | 96.6 % | 59.3 % |
| DOM nodes | 3 753 | 3 606 |
| **dockLens nodes** | **2 877** | **2 769** |

Two request counts live in this file and they are not the same measurement: **150 → 119** (this table) is
every request the `/` trace observed, subresources included; **63 → 41** (§4c) is the built-`dist` count lane
G re-ran. Quote the one whose method matches yours. The same applies to script tags: **26 → 4** is the
`dist/index.html` count that lane G verified against the baseline; **33 → 11** below is this trace's runtime
census.

The last row is the point: six lanes of correct work moved the app's DOM by 4 %, because the dock —
92 % of the nodes — was deliberately left alone. The biggest single download in the base run was
`@phosphor-icons_react.js` at **6.21 MB**; lane C took it out of the import graph (cold-load JS −62.4 %)
and lane C2 then removed the package itself, at **0 bytes** of change to the shipped entry.

## 5d. What actually changed the phone

Ranked by measured win. Each number is a lane's, with its caveat attached; none is a feel claim.

1. **The icon library left the boot path — 62 % of cold-load JS.** Cold-load JS **9.49 → 3.56 MiB
   (−62.4 %)**, ScriptDuration **16.7 s → 1.67 s**, fullscreen mount **17.0 s → 1.6 s**, glyphs
   byte-identical (lane C). Lane C2 made it irreversible: dependency and lock entry gone, `npm ci` exit 0,
   entry chunk **362 571 raw / 112 762 gz unchanged**, all 361 dist files byte-identical. The removal itself
   bought **0 bytes** — it stops the 6.2 MB prebundle coming back, nothing more.
2. **The lean dock — 63 % less main-thread work, behind a flag.** `?dock=lean`: TaskDuration
   **2 630 → 970 ms (−63.1 %)**, long tasks **1 941 ms in 17 → 400 ms in 4 (−79.4 %)**, frame mean
   **84.2 → 53.5 ms (−36.4 %)**, dock nodes 8 917 → 2 673 (448 rendered). Cost: **35.53 % of dock pixels
   differ by ≤81/255, all in the rim bevel** (lane F). Default rendering untouched.
3. **The dock mirror stopped measuring itself — 295 → 0 layout reads.** **4.92 → 0.00**
   `getBoundingClientRect` per scroll frame, RecalcStyleCount **182 → 123 (−32 %)** — pixelDiff
   **0 / 1 926 828** across six pairs, on a side that repeats byte-identically (lane B). No frame-time claim
   is made: the host was contention-limited.

**Still not solved: the dock material.** Lean is opt-in and the default still paints the 14-slice ladder plus
the 5-stop band, so on a phone nothing in items 1–3 moves unless the rim decision is taken — the default path
stays outside the parity target. This eval is not done.

## 6. Known proposals parked (would pay, but change pixels or feel)

*(populated from lane reports — check `lane-*.md` for the mechanism and the measured cost)*

| # | Proposal | Cost | Win | Verdict |
|---|---|---|---|---|
| D-1 | `bleed1` edge-material variant — crop each span 1× its blur radius past the fade start; blur area 357 630 → 254 530 px² (−28.8 %, 3.22 M → 2.29 M device px re-filtered per frame at DPR 3). Exact CSS in `lane-D.md` §8 | maxΔ **3/255** on 0.4–1.1 % of band pixels — over the gate. 2×/3× bleed and device-pixel snapping all plateau at 3/255, so zero is unreachable for this stack | **0 ± 4 %** | **do not apply.** Over-gate pixels for an unmeasurable win |
| E-P2 | `GoalBar/goal-bar.css:27` `transition: width` → transform | the fill carries its own label/value text inside the animated box; `scaleX` stretches it. Identical equivalent needs a two-layer fill (markup change) | unmeasured | parked |
| E-P3 | `Sparkline/sparkline.css:22` `transition: height` → transform | bars are `flex:1` with `--radius-xs` caps and a 2 px `--stroke` border box; `scaleY` distorts both | unmeasured | parked |
| E-P4 | `Accordion/accordion.css:57` `transition: grid-template-rows` | `0fr→1fr` **is** the mechanism; a composited version needs a measured fixed height — different failure modes | unmeasured | parked |
| E-P5 | `Table/table.css:84` + `@keyframes table-shimmer:86` animating `background-position` | a transform overlay is standard, but the gradient's 200 % tile seam is not provably identical at the wrap; no `.table` node exists in the app DOM (gallery only) | unmeasured | parked |
| E-P1 | `OppsHome/opps-home.css:24` `.opps__map{transition:filter}` → composited `::after` overlay | **measured, not identical:** **35 716 / 682 290 device px differ, maxΔ 9 (5.2 %)** at the pressed state — Chrome's filter path and alpha compositing round differently, and the map's dither survives one and not the other. Rest state 0/0 | — | parked |

**Dead ends — closed, do not re-run:**

- **The `+55 %` edge-material win does not reproduce (lane D).** Deleting the *entire* 10-span stack
  (−100 % blur area, 0 passes) measured **0 ± 4 %** at 4× throttle — inside the A/A control's own error band.
  Every single span is load-bearing (hiding one moves 5–87/255), so there is no free layer and no mergeable
  pair. Layer count never drops for any zero-pixel crop: cropping shrinks a raster, it does not remove a pass.
- **No shadow stack collapses safely (lane E).** No repeated card type declares a shadow at all
  (`funnel-card`, `profile-card`, `list-row`, `timeline`, `kpi` = 0 declarations; `.opp-card` computes
  `box-shadow: none` in the live feed). The only multi-layer stacks are five single-instance elements whose
  layers each contribute measured pixels.

## 6b. Interference: gem crease fix landed mid-build (047febc)

The owner reported, while this build was running, that the gem crown's left and right facet edges
looked **rounded instead of sharp**. That fix is a deliberate, owner-requested **visual** change and
it landed on `main` during the perf build:

- Cause (measured, not guessed): `ent()` in the interior trace blended the entry normal for any two
  planes within 13.1° (`dot > 0.974`). Every real crown crease on this cut is 9.96–15.52°, so **16 of
  the 40 crown crease pairs** were being averaged into a bevel — worst exactly on the outer left/right
  shoulders, which is where the owner saw it. The cut itself audits green (202 planes @0.01°, convex,
  0 violations) — the geometry was never the problem.
- Fix: threshold `0.974` → `0.9935` (6.5°), which splits the measured populations — girdle walls
  1.19° and collar transitions 5.42–5.64° stay blended (that blend is what stops the collar flicker);
  every crease ≥7.53° is now hard. File: `src/components/GemReward/gem-shader-ext.js`.
- Rejected: `0.99` (8.1°) left the pavilion's 7.53° junctions soft; the owner asked for **all**
  junctions sharp. Speckle measured *lower* after the change (crown 15.01% → 13.84% high-local-contrast
  pixels), so the hardness bought no noise.
- Plan: `.hermes/plans/2026-11-16_000000-lump-sum-builds.md` Task 1, shipped `047febc`.

**Consequence for this eval's pixel gate:** the frozen oracle in `.hermes/tmp/perf-mobile/oracle/base/`
predates this change, so any still that contains the gem will diff on the crown. Treat gem pixels as
an **accepted exception**: re-capture the oracle at the integrated HEAD, or crop the gem out, before
failing a lane on a crown diff. Every other surface must still hold at ≤0.05 %.

## 7. Resume protocol — picking this up in a fresh session

**1. The one open decision — the dock material.** Everything else is landed or a closed dead end; this is
the only thing blocking closure. Read `lane-F.md` §5 and open `lane-F-dock-default-vs-lean.png`:

> Keep the refracted dock rim → the default path cannot reach p95 ≤ 20 ms (measured 83 ms after batch 1, §5c)
> and this eval cannot close.
> Drop it (`?dock=lean`) → **35.53 % of dock pixels move, by at most 81/255, all inside the rim bevel**,
> in exchange for **−63 % main-thread time, −79 % long tasks, −36 % frame time**.

That is a design call, not a perf tweak. Answer it, then:

- **Lean accepted:** flip the default (`LEAN` in `src/glass/slices-spec.js`), delete the flag, re-capture the
  oracle at the new HEAD to record the *new* baseline, and close the parity target.
- **Rim stays:** close the eval `cancelled` on its parity target with §5d as the reason — mobile parity at
  zero visual change is not reachable while the dock mirrors the feed 15×.

**2. The gate is live and certifies one thing only — read `lane-A.md` before using it.** Three subagent
attempts died mid-run; the parent finished the job and wrote the report that none of them produced.
As of the last commit-pending state:

- **`tools/gate.mjs` is now the hardened build** (18 579 B, was a stale 8 932 B copy with no `--strict`).
  It resolves its oracle dir from `tools/oracle/` if present, else `<cwd>/.hermes/tmp/perf-mobile/oracle`,
  so `node .hermes/evals/…/tools/gate.mjs --baseline a --candidate b --strict` works from the repo root.
  The harnesses are under `tools/` **because `.hermes/tmp/` is gitignored** — anything left only there is lost.
- **Determinism: 15 / 16 rows byte-identical** across two independent Chrome launches of the unchanged
  tree (`gate-c` vs `gate-d`, `--strict`), with every shot asserted byte-identical on a 300 ms repeat.
  The 16th row (`desktop--feed-mid.full`) differs by **30 px, maxΔ 21**, and that is proved to be edge
  anti-aliasing — identical bbox, IoU 0.99954, 2 px flipping across the darkness threshold, 77 % of the
  diffs on the shape's boundary. Full table and the AA arithmetic: `lane-A.md` §3.
- **The gate cannot certify parity against `6b6b828`.** `oracle/base` predates the freeze protocol and the
  gate refuses it (`no freeze assertions`). Forced through with `--allow-legacy` it reports 12/16 outside
  tolerance — a 12 %-sized artefact of a 12 % noise floor (§1), not a regression. An absolute statement
  needs `git archive 6b6b828` served and captured with this harness. `lane-A.md` §4.
- **Exit codes:** 1 = FAIL, 2 = harness error — **but a pipe hides both** (`| tail` reports `tail`'s status).
  Use `… >/tmp/gate.out 2>&1; echo $?` or `set -o pipefail`.

So treat the pixel claims in this file as **measured with their own per-lane harnesses**; the shared gate
now proves the tree is stable and that a same-session change moved nothing, and nothing more.

Re-run, from the repo root, against two *fresh* freeze-asserted oracle sets:

```
node .hermes/evals/2026-11-16-mobile-perf-parity/tools/gate.mjs --baseline <set-a> --candidate <set-b> --strict
```

**3. Verify the batch-3 work, don't redo it.** Lane C2 already removed `@phosphor-icons/react` from
`package.json` and the lock (the load path is closed — `grep -r` it if you want the proof), lane H's two
defect fixes are in, and lane I hardened `lint:tokens` (a green run now prints its file count; 0 files exits 2).

**4. The standard close.** Gates are `npm run test` and `npm run build`. **Both were re-run green on the
final tree after batch 3** (`gen:atlas`/`gen:mechanics` fresh, lint 0 leaks, `npm test` 197 assertions,
`vite build` exit 0) and the whole batch landed as **`70367e7`** — re-run them anyway rather than trusting
this paragraph. Then mark plan tasks `✓ done`,
`npm run ds:track`, and commit plan + generated files with the same `[plan:…]` trailer.

**5. Known loose ends in the tree**, all reported and deliberately not patched — none is a regression:
`map-graph.mjs` has no `root` subgraph (it prints 266 modules but declares 125 nodes; 141 in
`src/{ds,pitch,js,shell,arch}` get edges only — pre-existing at `b97b1de`); `graphData` node `rule-morph`
points at `src/logic/morph-timing.js`, which does not exist (the real file is in `src/patterns/OppsHome/`),
and the `(mtime||0) > threshold` rule makes that failure silently report `stale:false`; `DESIGN_SYSTEM.md:10`
still describes `Icon` as Phosphor; and plan **Task 12 is false** — `content-visibility` has never existed
anywhere in `src/` (`grep -r` and `git log -S` are both empty), so it was reopened rather than left shipped.

**Do not re-derive:** the baseline table (§2), the numbers in §5c and the corrections in §4c are
measured facts. Re-running a lane whose number already has a G-verdict is wasted work.
