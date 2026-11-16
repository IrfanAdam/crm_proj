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

| Lane | State | Landed? | Headline number |
|---|---|---|---|
| 1 | done | harness + reports only | baseline: 25 parser-blocking scripts, 150 req / 10.15 MiB, **p95 frame 483 ms, 96.6 % frames > 33 ms** |
| 2 | done | yes | script tags **26 → 4**, parser-blocking **25 → 0**, requests **54 → 32**, origin hops −3 |
| 3 | **interrupted** | partial (the one safe edit) | `.device__edge > span` `will-change` removed — the exact patch lane 7 independently pixel-proved |
| 4 | done | yes | offscreen gem rAF **10–12/s → 0**, forced reflow **2.6–3.2/s → 0** (pixel proof outstanding) |
| 5 | done | yes | scroll LayoutDuration **73.8 → 6.1 ms**, long tasks **51 → 7**; **0 px differ** |
| 6 | **interrupted** | partial (containment edits) | no report, no pixel proof — parent verified instead |
| 7 | done | read-only | **92 % of all DOM is duplicated inside the dock** (8 917 / ~9 776 nodes); hiding it = **−62 % frame time** |

## 4b. What the numbers actually say (synthesis)

The mobile cost is **not** micro-optimisation. Ranked by measured win:

1. **The dock's slice ladder duplicates the whole feed 15×.** 8 917 of ~9 776 DOM nodes, rendered
   through a 293×56 px window. Hiding `.docklens` → frame time −62 %, long tasks 1 480 → 68 ms;
   hiding only the 14 slice copies → −37 %. `placeBand()` also forces ~36 layouts per scroll.
2. **The React dock island is most of the boot.** Blocking it: boot **76 308 → 4 050 ms**,
   ScriptDuration **73 310 → 2 270 ms**; 72.6 % of boot samples sit in `createElement`; the single
   biggest download was a **6.62 MB** `@phosphor-icons/react` dev prebundle.
3. **25 parser-blocking scripts** — fixed (lane 2).
4. **153 composited layers, 22 backdrop-filter, 341.7 MiB of layer bitmaps** at DPR 3.
5. Feed scroll residual: 3.74 s task / 65 layouts — 5 `gBCR` + 2 `scrollTop` reads per frame come from
   `src/glass/lens-copy.jsx` + `band-mirror.js`, which **no lane owns** (lane 5 flagged it).

**The eval cannot close at zero visual change.** Lane 7's finding is structural: the dock's 14-slice
mirror, the 5-stop band, and the 6px capsule frost are ~88 % of the dock cost and all three are
*visible by construction*. The zero-pixel subset is worth ~5–12 %; the gate is 18.7× away. Closing
this eval needs an owner decision on dock material — that is a design call, not a perf tweak.

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

## 6. Known proposals parked (would pay, but change pixels or feel)

*(populated from lane reports — check `lane-*.md` for the mechanism and the measured cost)*

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

1. `git status` + `git log --oneline -5` — read which lanes have landed. Uncommitted edits in the
   ownership table above are in-flight lane work; do not revert them.
2. Read the status board and every `lane-*.md` that exists. Their measured numbers are the audit.
3. Re-run the gates — these are the only two commands that matter:
   - pixel parity: the harness written by lane 1, `.hermes/tmp/perf-mobile/trace.mjs`
     (command + flags are recorded at the top of `lane-1.md`)
   - full suite: `npm run test && npm run build`
4. Any lane whose numbers do not reproduce gets re-run as a fresh lane on the landed tree, not
   re-argued from its transcript.
5. Close the plan per convention: mark tasks `✓ done` with the shipped sha, then `npm run ds:track`
   and commit the plan + generated files with the same plan trailer.
