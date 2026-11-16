# Mobile perf parity — desktop smoothness on a phone

**Goal:** The Alphas prototype runs on a mobile browser as smooth as on desktop, with zero visual change.
**Architecture:** Six file-disjoint workstreams (load path, glass compositing, WebGL/motion, interaction, CSS paint budget, measurement harness) landed as one build; every edit gated by a pixel oracle and a throttled mobile trace.
**Tech Stack:** Vite 5 MPA, vanilla CSS/JS + React 19 islands, three.js rigs, DTCG tokens; headless-Chrome CDP harness (`ws`).
**Tags:** Performance, Mobile, Design System

*Eval record (baseline numbers, lane roster, decision log, resume protocol): `.hermes/evals/2026-11-16-mobile-perf-parity/README.md` — read it before touching this build.*

---

## Phase 1 — Load path: stop blocking the parser {#phase-1}

*Tags: Performance, Mobile*

*2026-11-16 · On a phone the first paint waits on a third-party CDN round-trip for `three.min.js` plus 24 unminified classic gem scripts served raw out of `dist/src/` — 25 parser-blocking requests before the app bundle even executes. Bundle what the app boots with; defer what it does not.*

| # | Task | Done when | Overall |
|---|------|-----------|---------|
| 1 | Vendor `three.min.js` out of cdnjs into `public/vendor/` and load it deferred | `dist/` has zero `https://cdnjs.` references; three.js is same-origin and non-blocking | pending |
| 2 | Collapse the 22 classic GemReward scripts into one deferred asset with order preserved | one request, deferred, `window.GEM_CUT`/`GEM_RIG`/`GEM3D` globals identical at run time | pending |
| 3 | Preload the module entry + font `display=swap` + preconnect cleanup | no `document.write`-class blocking; LCP not gated on CSS/JS | pending |

## Phase 2 — Glass compositing: fewer, cheaper backdrop layers {#phase-2}

*Tags: Performance, Glass*

*2026-11-16 · Fullscreen mobile paints a progressive-blur edge stack plus a liquid dock lens (`backdrop-filter` on stacked spans carrying `will-change`), a FAB gem lens and two glass bars — the most expensive thing the compositor does every scroll frame.*

| # | Task | Done when | Overall |
|---|------|-----------|---------|
| 4 | Right-size the edge-material layer stack; drop `will-change` on permanently-animating spans | layer count and per-layer blur radius measured before/after; pixels identical | pending |
| 5 | De-duplicate dock lens / band / fab glass into one backdrop surface each | no nested `backdrop-filter` inside a filtered ancestor | pending |
| 6 | Contain every glass island (`contain: paint` / `isolation`) so a blur cannot force a full-page repaint | trace shows no full-page paint during scroll | pending |

## Phase 3 — Runtime: WebGL and motion loops {#phase-3}

*Tags: Performance, WebGL*

*2026-11-16 · `gem3d` calls its rig `size()` — a forced layout read — inside the render loop, and every rig paints at DPR 2 with antialias on, whether or not the device can afford it.*

| # | Task | Done when | Overall |
|---|------|-----------|---------|
| 7 | Hoist per-frame rect/layout reads out of the gem loop | zero `getBoundingClientRect`/`clientWidth` reads inside `requestAnimationFrame` callbacks | pending |
| 8 | Gate rig quality on device capability, not just `prefers-reduced-motion` | mobile trace frame time at parity with desktop; no visible softening at 1× | pending |
| 9 | One shared rAF clock; offscreen and hidden-tab rigs fully parked | no more than one rAF loop alive per visible surface | pending |

## Phase 4 — Interaction: scroll and pointer handlers {#phase-4}

*Tags: Performance, Interaction*

*2026-11-16 · The feed scroll handler, elastic scroll and pointer tilt paths re-measure geometry on every event; on a phone that is the difference between 60 fps and 30.*

| # | Task | Done when | Overall |
|---|------|-----------|---------|
| 10 | Cache geometry per scroll frame instead of per event | scroll trace shows 0 forced reflow events | pending |
| 11 | Mark every non-cancelling listener passive; move work off the event tick | no long task over 50 ms during a scripted scroll | pending |

## Phase 5 — CSS paint budget {#phase-5}

*Tags: Performance, CSS*

*2026-11-16 · 119 `box-shadow` declarations and no `content-visibility` anywhere — offscreen feed cards and sheets paint every frame.*

| # | Task | Done when | Overall |
|---|------|-----------|---------|
| 12 | `content-visibility: auto` + `contain-intrinsic-size` on offscreen feed/sheet lists | paint count during scroll drops; layout height unchanged | pending |
| 13 | Collapse shadow stacks that paint the same pixels | computed shadow values unchanged or visually identical in the pixel gate | pending |

## Phase 6 — Gate: measure and prove no visual change {#phase-6}

*Tags: Performance, Verification*

*2026-11-16 · A perf build with no measurement is a guess, and a perf build that shifts pixels is a regression.*

| # | Task | Done when | Overall |
|---|------|-----------|---------|
| 14 | Frozen mobile + desktop still set from HEAD serves as the pixel oracle | every post-change still diffs ≤0.05 % of pixels at ≤1/255 | pending |
| 15 | Throttled mobile trace (4× CPU, 393×852 DPR 3) recorded before and after | long tasks, frame time and TBT reported as before → after numbers | pending |
