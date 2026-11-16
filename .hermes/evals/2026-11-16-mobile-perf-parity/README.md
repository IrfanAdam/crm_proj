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

| Lane | State | Landed? | Notes |
|---|---|---|---|
| 1 | running | — | |
| 2 | running | — | |
| 3 | running | — | |
| 4 | running | — | |
| 5 | running | — | |
| 6 | running | — | |
| 7 | running | — | |

## 5. Decision log

| # | Decision | Why |
|---|---|---|
| D1 | One plan for the whole build, not one per lane | Weekly build convention — lanes are workstreams, not plans |
| D2 | Lanes do **not** run `npm run build` / `npm test` / `ds-track` / `generate-*`, and do **not** commit | Those write shared generated files and race each other; the parent runs gates once at integration and owns the commits |
| D3 | Baseline is measured on a **frozen** `git archive HEAD` copy | The live tree is being edited by six lanes concurrently; a trace of the live tree measures a moving target |
| D4 | Zero-pixel-delta is a hard gate, so DPR caps, antialias removal and motion-feel changes are **out of scope** | They pay well but they change what the owner sees; flagged as proposals instead |
| D5 | Reports are written to this directory as each lane finishes | So the audit survives the session |

## 6. Known proposals parked (would pay, but change pixels or feel)

*(populated from lane reports — check `lane-*.md` for the mechanism and the measured cost)*

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
