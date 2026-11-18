# Eval M1 — Gem mobile stutter audit (2026-11-17)

**Question:** why is the gem smooth on desktop but very stuttery in a mobile browser?
**Owner bar:** *"as smooth on the mobile browser as in desktop"* — no visual change.
**Plan:** `.hermes/plans/2026-10-03_144222-gem-realism-round2.md` (optimisation part: Tasks 57–61).
**Pointer in plan:** `#### Eval M1` after Task 61 — this file is the mutable record, the plan holds the frozen verdict.
**Base commit:** `a406cf3` · **Branch:** main · **Date:** 2026-11-17
**Method:** static audit of the live render path (no mobile device in this session — every claim cites
`file:line`; numbers tagged `[static]` are derived from source, numbers tagged `[measured]` are quoted
from prior harnesses. Nothing here is a guess presented as a measurement.)

> **How to revise this file (for the next session):** it is deliberately mutable. Confirm or correct
> each ranked cause with a real phone trace, append rows to §5, and log every change in §7.
> Do not delete a cause that measured differently — mark it superseded with the new numbers.
> The iteration runs tomorrow (2026-11-18) starting from §6.

---

> **Owner constraint (2026-11-17): zero visual compromise.** Only pixel-identical wins ship —
> same effect, best performance. Quality step-downs (DPR, bloom, bounce, taps, caustic S) are
> rejected even behind capability gates. The iteration works the scheduling side only.

## 1. Verdict (read this first)

The stutter is **fragment-shader + fullscreen-pass overload on a tile GPU, multiplied by per-rig
duplication and per-frame CPU work that desktop absorbs**. Ranked:

| # | Cause | Where | Desktop why fine | Phone why stutters |
|---|---|---|---|---|
| 1 | Interior trace is ~2 700 plane evals / stone px / frame (`PLMAX` 170 × 5 bounces × 3 taps) | `gem-shader-ext.js:16-44`, `gem-optics.js:32` (`bounce: 5`), `gem-optics.js:36` (`taps: 3`) | Desktop ALU + bandwidth absorb it | Tile GPUs (Apple A / Adreno / Mali) are ALU- and bandwidth-bound per tile; sustained load throttles → hitches, not a flat low fps |
| 2 | Bloom = 3 extra fullscreen passes/frame/rig, MSAA4 HalfFloat + depth texture | `gem-bloom.js:32-61` | One fast resolve | Tile-memory resolve per pass; iOS Safari MSAA+HalfFloat is a known slow path |
| 3 | DPR cap 2 → 4× CSS pixels; no capability gate | `gem3d.js:17` | GPU headroom | 680×640 buffer for a 340×320 card; ceremony 1179×1500 (§Task 59). Mobile-perf Task 8 (capability gating) was **never started** |
| 4 | Caustic field rebuild: S=160² texels × 3 channels × ~380-tap splat per facet, plus 25.6k-px JS `blit` + texture upload — on every repaint | `gem-caustic-trace.js:8,24-38,70-75`, `gem-caustic.js:60-73` | 4×-throttled desktop: 3.1 ms → 0.9 ms after gating | Any spin/drag/tint repaints; texture upload stalls the pipeline mid-interaction — exactly when the user is watching |
| 5 | One WebGL context + rAF loop + 170-plane compile **per visible canvas** | `gem3d.js:14-58,83-85` | Contexts + compiles are cheap | Mobile context limits, slow shader compile (pre-warm compiles mid-scroll → long task), unsynchronised loops |
| 6 | Per-frame CPU per rig: `anchorOf` (~266 verts × project), `BARE.aim` project/unproject, backdrop + pool law | `gem-caustic.js:29-54`, `gem-bare.js:21-42`, `gem-rig.js:76` | Noise | Adds up at 4× CPU throttle alongside the field rebuild |
| 7 | Tint tween forces repaint every frame for 1 s (spin rewrite defeats pose gating + `pool()` every 2nd frame) | `gem-tint.js:43-74` | Absorbed | Stone switch = 1 s of guaranteed jank on phone |

**What was ruled out (do not re-investigate without new evidence):**

- `MeshPhysicalMaterial` transmission cost — the live path adds only `core` (`gem-scene.js:70-74`);
  the transmissive `body` is not in the scene when `SH.core` exists. No transmission RT is allocated.
- The Task 58/59 GPU numbers (0.27 ms, bloom 0.57/0.77 ms) — **withdrawn by A34**: the fragment
  program failed to link (`c0` undeclared), so every pixel comparison measured a blank stone.
  Only the CPU caustic numbers and the rig-lifecycle behaviour survive. **No GPU claim in this
  audit reuses those numbers.**

---

## 2. Cost model (static — verify on device tomorrow)

Per stone pixel, per frame, at live uniforms (`uBounce 5`, `uTaps 3`, `PLMAX 170`):

- `ent()`: one 170-plane loop to resolve entry (+ runner-up + `dFdx/dFdy` tau).
- `tr()` × 3 taps (`c0/c4/c2`): each up to 5 bounces × ~168 planes ≈ 840 plane evals →
  **≈ 2 500 + 170 ≈ 2 700 plane evals/px** (each: dot + divide + branches), plus 3+
  `textureCubeUV` PMREM taps, `studio()` + `keyT()` + `pan()` analytic env, tone curve.
- Card buffer 680×640 = 435k px; stone covers ~40 % → **~200–450M plane evals/frame**.
  Desktop eats this; a phone tile GPU does not — and sustained load thermally throttles,
  which is why it reads as *stutter* (hitches) rather than uniformly slow.

Per frame fixed costs (independent of stone pixels): bloom A (fullscreen MSAA4 HalfFloat +
depth) + B (half-res 9-tap) + composite; `anchorOf` + `aim` matrix/project work; backdrop law.
Per repaint (spin/drag/tint): full `field()` + `blit()` + `putImageData` + `needsUpdate` upload.

---

## 3. Why desktop is smooth (same code, different machine)

Desktop has: wide ALU + memory bandwidth for the 170-plane × 5-bounce × 3-tap fragment cost;
fast shader compile (170-plane program compiles once, quickly); many free WebGL contexts;
active cooling (no throttle inside a session); and throttled-desktop harnesses that *understate*
the phone gap (4× CPU throttle slows JS but does not reproduce tile-GPU fragment cost or
thermal onset). The phone fails on exactly the axes the harness does not model.

---

## 4. Interaction-specific stutter map

| Moment | What runs | Expected phone behaviour |
|---|---|---|
| Idle spin (0.315 rad/s) | trace every frame + pool repaint ~every 4th frame (0.02 rad gate) + bloom ×3 passes | baseline load; thermal throttle onset after seconds |
| Drag | field repaint **every frame** + anchor + aim + bloom | heaviest sustained — hitch cluster |
| Stone switch (pill) | 1 s tween: spin rewrite + `pool()` every 2nd frame + uniform churn | 1 s guaranteed jank |
| Scroll past gems | pre-warm compile (160 px margin) + loops still armed until IO fires (async on mobile) | compile long-task hitch while scrolling |
| Ceremony fullscreen | 1179×1500 × bloom chain | worst-case fragment load |

---

## 5. Lever backlog

### 5.1 Rejected — quality step-downs (owner: zero visual compromise, 2026-11-17)

DPR→1, bloom off/half-res, `uBounce` 5→3, `uTaps` 3→2, caustic S 160→96, `antialias:false` — all
change pixels. Not shipped, not even behind a capability gate.

### 5.2 Fidelity-preserving levers — the actual backlog

Each must be **bit-identical on the frozen-pose pixel oracle** (diff 0, not 0.05 %).

| # | Lever | Why it is bit-identical | Expected win |
|---|---|---|---|
| F1 | **Exact candidate-set / cone-hierarchy acceleration for the bounce loop** | The winner is `min t` over planes. A per-(entry facet, bounce) candidate set that is a *superset* of reachable planes, scanned in original index order, returns the same `t`, the same `hi` and the same normal — ties included (strict `<` resolves to the earlier index). Pruning only `ent()` is not worth it (170 of ~2 700 evals = 6 %); the win is the bounce loop, via directional buckets whose cone bound rejects a group in one test. Gate on a brute-force 170-plane reference over an exhaustive pose sweep. | **1.5–3× fewer plane evals** — superseded by F1b |
| **F1b** | **Bake the exit-facet map — replace the 170-plane linear search with a table lookup** | For a convex polyhedron the exit facet of an interior ray is **piecewise constant in direction** — the boundaries are exactly the spherical Voronoi diagram of the plane normals. So the scan is computing a lookup the slow way. Store, per (entry facet, direction), the winner **and** the runner-up; disambiguate at runtime with the exact `min`. Because the true winner is provably in that pair, the result is **bit-identical**, seams included. Then a bounce = 1 fetch + 1 divide instead of ≤168 plane tests. | **an order of magnitude or more** — the real answer (see §5.4) |
| F2 | **Bake the plane set as a `const vec4[170]` in the shader source** instead of `uniform vec4 uPl[170]` | Same values, same comparison order. A compile-time array lets the driver unroll and hoist into registers/immediates. | large on tile GPUs, where dynamic uniform indexing can force spills |
| F3 | **Prove the uniform path is taken (`PLTEX` off)** — `GEM_FACETS.choice` read back on the device | If the phone falls to `uPlTex`, every plane is a texture fetch: 170 fetches × 5 bounces = ~850/px. Baking F2 removes the branch entirely. | potentially 5–10× if the phone is on PLTEX today |
| F4 | **Kill the stall class** — shader precompile at idle, caustic upload moved off the drag frame, no per-frame allocation | Removes pipeline stalls; touches zero pixel values | removes the *hitch* character — what the owner reads as "stutter" |
| F5 | **Provably-occluded overdraw** — confirm opaque-first sort so additive floor quads fail early-Z | Depth test precedes blend; a rejected fragment contributes nothing | small, free |
| F6 | **Compile-time hoisting of the dead `uSw`/`uBk`/`pan()` terms** (A21) | A term whose uniform is permanently 0 contributes 0; removing it is bit-identical only if it is provably always 0 — verify per uniform before cutting | modest ALU |

**Not fidelity-safe, recorded so nobody retries:** plane-set folding (Task 58 — different stone),
temporal reuse/caching (the yaw is continuous, no pose recurs), atlasing the bloom chain across rigs
(half-res texel alignment shifts), mediump precision.

### 5.3 The physics floor — say it plainly

Static estimate, to be replaced by a device number: ~2 700 plane evals/px × ~180 k stone px on a
680×640 card ≈ **4.9 GFLOP/frame ≈ 290 GFLOP/s sustained at 60 fps** for one card, before bloom's
three fullscreen passes. An A-series GPU peaks around 1.5 TFLOP/s FP32 with 30–50 % achievable on
dependent, branch-heavy code — so one card is already 40–60 % of the phone, and a second visible card
plus the ceremony goes over the thermal line. Desktop has 5–10× that headroom. That is the whole gap.

**Consequence (superseded by §5.4):** pruning alone buys a multiple, not infinite headroom — which is
why F1b, not F1, is the lever. §5.4 shows the floor above prices the *current algorithm*, not the
problem.

### 5.4 The physics floor is NOT the cap — the linear scan is an implementation choice

§5.3 prices *the current algorithm*. That algorithm searches 170 planes one at a time for something
that is a **lookup table in disguise**:

- The stone is **convex** (F23.1: 0 violations). For a ray from an interior point, the exit facet is
  the `argmin` of `t` over planes — a function of **direction only**. As direction varies smoothly,
  `t_j(d)` changes continuously and the `argmin` switches only when two candidates tie. **So the exit
  facet is piecewise constant on the direction sphere**, and the regions are exactly the spherical
  Voronoi cells of the plane normals. Bounded: ≤ 202 planes ⇒ ≤ 202 regions.
- Therefore the 168-plane scan per bounce computes, in ~168 tests, what a single fetch can return.
- **Exactness — corrected after the p-sweep caveat:** the Voronoi cells are computed for a *fixed*
  interior point, and the trace's `p` slides across the entry facet, so a stored **pair** (winner +
  runner-up) is not always sufficient. The sound object is a **conservatively-bounded candidate set**
  per (entry facet, direction cell), valid for *every* interior point of that facet — typically
  k ≈ 4–8 planes. Scan that set with the real `argmin` and the original index order, and the result is
  identical to the 168-plane scan, ties included. Sampling coarse and snapping to the cell *plus its
  neighbours* is what makes the set conservative.
- **Win with k ≈ 6:** ~168 → ~6 plane tests per bounce ⇒ **~25×** on the bounce loop, with the entry
  loop unchanged. Still an order of magnitude on the whole trace.
- **Post-bake shape of the shader:** 15 bounces total (3 taps × 5) ⇒ 15 fetches + 15 divides +
  Fresnel/Beer instead of ~2 500 plane tests. The frame then costs what PMREM taps and the bloom
  chain cost — i.e. **a normal three.js scene**.

**Why the obvious caching ideas are worse (so nobody builds them):**

| Idea | Why rejected |
|---|---|
| Prerender a frame atlas (the 45°/22.5° yaw period is only ~75 frames at 60 fps) | Memory: ~110 MB of RGBA for one card and it repeats per stone. Safari's per-tab texture budget will evict or crash. Also breaks under arbitrary drag tilt, and float yaw `θ+22.5° ≠ θ` at the last ulp, so the pixel gate fails. |
| Temporal reuse / reprojection | The stone moves every frame and no pose recurs; reuse is a lag artefact. |
| Cube-map-only refraction ("classic gem look") | An approximation — loses the multi-bounce interior that *is* this stone's identity. |
| Render interior at half res and upscale | Changes pixels. |

**Honest scope:** F1b is the highest-value lever in this document and the largest piece of work — an
offscreen bake, a boundary/runner-up proof, a shader rewrite, and a brute-force equivalence gate over
an exhaustive pose sweep. It is a project, not a patch. But it means the answer to "same pixels,
phone-smooth" is **yes in principle** — the ceiling was the algorithm, and the algorithm is
replaceable.

**Revised expectation:** F3 + F2 + F1b together plausibly put the stone inside a phone's frame budget
with **zero** pixel change. That is the only route that reaches desktop-like smoothness without
softening the stone, and it should be scoped as its own task rather than smuggled into the perf pass.

### 5.5 Will the stutter go away, and what does it cost

**Two different symptoms, two different answers:**

| Symptom | Lever | Confidence |
|---|---|---|
| **Hitches** — frame spikes, jank on scroll / stone-switch / first paint | F3, F4 | **~90 %** — precompile, upload timing and per-frame allocation are mechanical; these are near-certain wins and they are what the eye calls "stutter" |
| **Sustained framerate** — the stone simply costs too much per frame | F2, F1b | **~60–70 %** — the mathematics is sound (piecewise-constant exit facet is a fact, not a hope), so the risk is engineering, not theory |

**Effort (focused engineering, excluding plan bookkeeping and the repo's gate ceremony):**

| Step | Estimate | Main risk |
|---|---|---|
| F3 device read-back + F4 stall fixes | 0.5 day | none — mechanical |
| F2 const-array bake | ~1 day | longer shader compile; some drivers cap source size. Fall back to the uniform path if it regresses |
| F1b bake tool (candidate sets, conservativeness bound) | 2–4 days | the bound may need k ≈ 12–16 on some facets, cutting the win to ~10× |
| F1b shader rewrite + packaging | 2–3 days | texture layout, PLTEX interaction, 99-line file budget |
| F1b equivalence gate (brute-force over exhaustive pose sweep) | 2–4 days | **where surprises live** — Task 58 already passed a symmetry proof and then failed its pixel gate |
| Integration, `npm test`, atlas/changelog regen, owner read | 1–2 days | mtime-bound regenerators, one-commit rule |

**Total ≈ 2–4 weeks of focused work**, dominated by F1b. The realistic shape is: **a day buys the
hitch class** (F3 + F4, ~4–5/10), **a week buys F2 + the F1b bake and proof** (~7/10), and **weeks buy
the 9–10/10** — and only if the equivalence gate holds.

**The honest failure mode:** F1b may land *almost* exact — a handful of pixels differing at maxΔ 1 in
rare boundary cells. That is not a silent degrade to hide; it is an owner decision between "three
pixels" and "ship". Write it down before starting, so the choice is made with the number in hand.




---

## 6. Iteration protocol for tomorrow

1. **Validity first:** assert zero `THREE.WebGLProgram` errors + stone mask ≥ 20k px in the
   reference capture before quoting any number (A34 gate). Re-run `mobile-cost.mjs` against the
   *valid* program; publish real card + ceremony GPU ms.
2. **Baseline on a real phone surface** (393×852 DPR 3): p50/p95 frame, long tasks, first-5s vs
   after-60s (thermal), per moment in §4.
3. **Isolate:** one fidelity lever at a time (§5.2), frozen pose, **pixel diff 0** — not 0.05 %.
   F3 first (it is a one-line read-back and it may explain the whole gap), then F2, then F1 with its
   brute-force superset proof.
4. **No capability gates, no degraded path.** Desktop and phone must render from the same shader with
   the same bytes; the only thing that may differ is scheduling.
5. **Close per Task 61:** mobile Chrome holds the card frame budget, no named artefact, owner
   confirms the stone unchanged.

---

## 7. Revision log (append — never rewrite rows)

| Date | Session | Change |
|---|---|---|
| 2026-11-17 | parent (static audit, no device) | Created from source. All GPU-severity claims `[static]` — confirm on phone. |
| 2026-11-17 | owner directive | **Zero visual compromise.** §5 quality levers (DPR, bloom, bounce, taps, caustic S) rejected; iteration works identical-pixels levers only (F1–F6, §5.2). |
| 2026-11-17 | parent analysis | §5 split into rejected / fidelity-preserving / physics floor. Key finding: **F3 (PLTEX) is unexplained and possibly the whole gap** — no device has ever reported `GEM_FACETS.choice`. |
| 2026-11-17 | owner challenge ("this can't be the cap") | **Correct — the cap was the algorithm, not the GPU.** Added §5.4 + **F1b**: the exit facet is piecewise constant in direction (spherical Voronoi of the plane normals), so the 168-plane scan is a lookup done the slow way. F1 demoted to "superseded". §5.3's floor now prices the current algorithm only. |
| 2026-11-17 | parent correction | **Stored pair → conservative candidate set.** The Voronoi cells are fixed-point-dependent and `p` slides across the facet, so winner+runner-up is unsound. The exact object is a per-(entry facet, direction cell) set of k ≈ 4–8, scanned with the real `argmin`; ~25× on the bounce loop. Added §5.5: confidence split (hitches ~90 %, sustained framerate ~60–70 %) and a 2–4 week effort table. |
| 2026-11-17 | owner phone read (mobile Chrome) | **F3 MEASURED: `choice='uniform'`, planes 170.** The PLTEX theory is dead — the phone is on the fast path. F2/F4 are now the afternoon; F1b opens only if they miss. |

## 8. Open questions for the revising session

1. Exact phone model + browser (Safari vs Chrome) and surface (gallery card / reward sheet / ceremony)?
2. Which moment stutters most (§4)? Idle, drag, stone switch, scroll, ceremony?
3. How many seconds until onset (thermal vs immediate)?
4. Does `?gem=high` (software path) change anything on the test phone?
5. Re-measured valid-program GPU ms for card + ceremony (replaces withdrawn §Task 59 numbers)?
