# Lane D — method design: 20 → 60 fps with the look held

Repo: `/Users/irfan/Documents/Portfolio Redo/crm_proj` · 2026-11-23 · **DESIGN ONLY** — no source edit, no server, no commit.
Reflow: the ask is **20 → 60 fps = 3.0×**, not 14.9×.

Labels: **[M]** = borrowed measurement — Lane A, Lane B (`lane-B-measured.md`: `EXT_disjoint_timer_query` p50, ANGLE/Metal, M1 Max, paced one-frame-in-flight), or an in-repo header comment. **[S]** = static estimate computed here from the source text or from the budget algebra. Unlabelled = arithmetic on those two.

---

## 0. The budget — taken from the measured fullscreen point, not from proportions

Lane A's 62 / 33 / 18 % came from a **786×640** probe at **43.8 % stone coverage**. The owner's surface is **1026×1434 (1.48 Mpx) at 27.4 % coverage** — 2.9× the pixels, 1.6× less stone — so those proportions do not transfer, and treating them as the phone's budget is the easiest way to design the wrong plan.

Lane B measured that surface pass by pass [M]:

| pass | ms | share | what it is |
|---|---|---|---|
| **trace** (`ent` + 3 × `tr`, one draw, floors hidden) | **14.71** | 29.4 % | 2,720 plane tests + ~44,000 FLOP-eq per stone px, 27.4 % coverage |
| **bloom pass** (9-tap + depth gate → B at 0.5×) | **13.78** | 27.6 % | quarter-res fill; the cost is target A's traffic and the pass itself |
| **composite** (A + B·0.32 → canvas) | **13.14** | 26.2 % | one full-screen pass, 2 fetches, writing to the **MSAA-4 canvas** |
| **scenery** (80×80 backdrop + 3 blended floor quads) | **8.37** | 16.8 % | residual: the owner's 50.0 ms minus the three measured passes |
| **frame** | **50.0** | | = 20 fps |

**Corroboration, not coincidence:** the three measured passes total 41.63 ms = **24.0 fps**, and Lane B measured exactly that frame rate. The 8.4 ms difference is the floor quads, which Lane B's protocol hides — so the owner's 20 fps and Lane B's 24 fps are the *same frame*, and the M1 per-pass milliseconds are used below at **1.0× scale** with no phone-derating fudge.

### The three findings the plan is built on

1. **The trace is 29 % of this frame, not 55 %.** A perfectly free trace is worth only **1.42×**. No rewrite of the 93 % term can carry a 3× ask.
2. **The bloom chain — bloom *plus* composite — is 53.8 %, and the composite alone is 26.2 %.** One full-screen additive pass costs as much as the 9-tap blur. That is not fill; it is per-pass cost plus the 4× canvas write.
3. **Three full-screen passes cost ~10 ms of fixed overhead.** Lane B's own intercept: at **41 k pixels** the whole fullscreen frame still reads **10.19 ms** — **3.4 ms per pass at negligible traffic** [M]. That term grows with pass count, not with work, and **no shader optimisation touches it.** The pass count is a lever the size of the trace.

Lane B's slope is 0.377 with 73 % of the frame pixel-proportional, so this surface is **fill/resolution-bound**, not ALU-bound. That inverts Lane A's ALU-first framing and decides where the 3× can come from.

### 0.1 Four corrections to Lane A that the design rests on

| # | Lane A said | what holds |
|---|---|---|
| D1 | `T·B·N` is "irreducible without changing pixels — 3 wavelengths are 3 traces *by design*" | The 3 taps must produce 3 different **results**, not 3 different **plane scans**. One scan serves all three under a provable guard (§1.5). The only exact lever on the 93 % term — unpriced by Lane A. |
| D2 | "MSAA 4 → 2 … **visible** silhouette AA" | Silhouette AA is separable: a 4-sample coverage mask on an R8 target (3 MB) reproduces the resolve arithmetic exactly. 78 MB → 15 MB at ≤1 LSB, **not** a visible change. |
| D3 | bloom 33 % vs 0.3 % ALU "→ target/memory/draw" | Correct — and Lane B shows the **composite is a separate 26 %**. Of the chain's 26.9 ms, ~6.8 ms is pure per-pass overhead; the rest is 4× canvas write and 16F traffic. All removable without touching a shader. |
| D4 | scenery 15–22 %, "trace-independent" | Right, and it is 16.8 % here — but two-thirds is *target* traffic from the same 4-sample 16F target, so C0/C1b/C6 move it too. |

---

## 1. A — EXACT ACCELERATION OF THE 93 % TERM

### 1.1 The lemma that decides every option below

Interior point `p` ⇒ `q = n·p + d < 0` for every plane (the builder flips so the origin is inside, `gem-facets.js:36`). The loop computes `ti = −q/den`, so **`ti > 0 ⟺ den > 0`**, and `den = dot(P.xyz, dl)` is the first thing it evaluates (`gem-shader-ext.js:55`).

**Corollary 1 (candidate half).** A plane with `den ≤ 0` cannot enter `ti > 2e-3` and cannot affect the argmin. Dropping it is **bit-exact** — no comparison changes, ascending index order preserved. Surviving set: **85 of 170** for a random direction.

**Corollary 2 (it does not pay).** The cull is per-lane. A warp is 16–32 adjacent pixels whose `dl` differ *by construction* — adjacent pixels sit on different facets; that is the image. P(a plane is culled in all 16 lanes) = 2⁻¹⁶ ≈ 0, so the body issues for the whole warp regardless and the predicate only suppresses the write. **Predicted 1.00×, risk −1…−2 %.** Hygiene only; never count it.

**Corollary 3.** Every *spatial* accelerator (BVH, cone tree, direction-cell list) is correct, conservative, and warp-divergent — same fate. Only two things reduce **warp-uniform** work: the length of the per-plane body (§1.6), and the number of **sequential passes over the plane set** (§1.5).

### 1.2 The options, priced

| option | tests / stone px | on the trace | on the frame | exactness | cost | verdict |
|---|---|---|---|---|---|---|
| **A(i) back-face cull** `if (den<=0.) continue;` | 2,720 issued, 1,360 with a full body | **1.00×** (1.37× if scalar) | 1.00× | **bit-identical**, proved | 0.2 d | hygiene |
| **A(i)′ direction-cell candidate list** | 170 → 42 median, p90 54, max 76 [M] | **0.55–1.0×** — *likely a loss* | — | **not exact**: 1 wrong facet / 10⁶ bounces at k=76 [M] | 4–6 d | **reject** (§1.3) |
| **A(ii) BVH over 444 tris / 224 verts** | ~110–220 tri tests × ~35 FLOP | **0.35–0.7×** (worse) | — | *more* exact → **visible change** | 6–8 d | **reject** (§1.4) |
| **A(iii) layered depth / cone hierarchy over normals** | 85 reached via ~16 dots of rejection | 1.00× realised (2.0× if warp-uniform) | 1.00× | bit-identical | 3 d | **reject** — same divergence, more registers |
| **A(iv) tap-shared geometry query** | 2,720 → **~1,190** | **2.0–2.3×** | **1.19×** (−7.3 ms) | **bit-identical**, proved | 3–4 d | **the lever** |
| **A(v) divide-free compare + hoist + scalarise** | 2,720 | 1.11–1.13× | 1.03× | divide-free is **not** bit-exact (§1.6) | 1 d | pixel-gated |

The column that matters: A(iv), a 2.1× on the trace's own ALU, is worth **1.19× on the frame**. That is the whole of A.

### 1.3 Why the direction-cell table is priced negative, not merely inexact

1. **It un-does the F2 bake.** A cell table returns *plane indices at runtime*, so the scan becomes `PLB[ORD[k]]` — a dynamic index into the 170-vector const array, which is exactly what forces it out of registers. The F2 const bake is a measured **−11.0 % frame** [M] *because* it removed that spill. The lever would repay 3.4× in test count by re-introducing the cost it was built to delete.
2. **Every candidate becomes a fetch.** 42 × 15 scans = 630 fetches/stone px. The in-repo record: the PLTEX path (plane tests → fetches) is **5–10× slower** [M]. 630 fetches ≈ 12,600–25,000 ALU-equiv against a 38,250 baseline → break-even at best.
3. **Memory and silence.** `170×128×64×k` at k=76 → 6.7 MB [S]; row width must be ≤ `MAX_TEXTURE_SIZE` [M]; and a miss returns a *valid-looking* hit on the wrong plane that the shader cannot detect — it reads as flecks, not as an error.

**Verdict: the only precompute that touches the 93 % term is net-negative on a tile GPU. Do not build it.**

### 1.4 Why a triangle BVH loses to 170 half-spaces

The plane set is already the acceleration structure: 444 tris were reduced to 170 half-spaces with no barycentric work, and a plane test is 2 dots + 1 divide + 2 compares where Möller–Trumbore needs that plus 3 edge determinants.

- 2-level tree, 8 nodes × ~55 tris: an interior ray reaches the nearest leaf in 1–2 tests, so **110–220 tri tests ≈ 3,850–7,700 FLOP-eq** against 2,550 → **1.5–3× worse.**
- **GLSL ES 1.00 cannot express traversal**: it needs `stack[]` with a dynamic index, and the dialect only permits constant-index-expressions into arrays — the file already records that ES 1.00 can't `max()` two ints (`gem-facets.js:77`). ES 3.00 allows it, but a dynamically-indexed local array becomes scratch memory: +16–24 registers of spill on a Mali thread budget.
- Buffer layout: nodes `RGBA32F` (min/max × 2) + tri planes — *more* memory than the current 680 floats, plus a fetch per node.
- **And it changes pixels**: it finds the true nearest triangle, so the girdle's known non-convexity resolves differently. The owner's look is frozen at the plane-set approximation.

### 1.5 A(iv) — tap-shared geometry query

**Mechanism.** `main` calls `tr()` three times (`gem-shader-ext.js:65-66`) with `n ∈ {ior(1−s), ior, ior(1+s)}`, `s ≈ 0.006` for sapphire. Each call re-runs the full 5 × 170 scan; the three direction sets are within ~0.2° at bounce 0, growing to ≲1° by bounce 5. **Interleave the three taps into one bounce loop and run one scan per bounce**, gated by a guard that proves the winner is shared.

**Guard (exactness proof).** For plane `i`, `t_i = q_i/den_i`, `q_i > 0`. Perturb `dl` by `|e| ≤ δ` ⇒ `den_i' ≥ den_i − δ` ⇒

```
t_i(1−ε_i) ≤ t_i' ≤ t_i(1+ε_i),        ε_i = δ/den_i
```

Let `t₁ < t₂` be the two smallest of the green tap's scan. Every candidate beyond rank 2 has `t ≥ t₂`, so the ranking is unchanged for **all three taps** iff

```
t₂·(1 − ε) > t₁·(1 + ε),      ε = δ / min(den₁, den₂)
```

— two multiplies and a compare, no per-plane work. When it holds, each tap recomputes only `ti = −q/den'` for the **same** plane index with its own `den'`; the expression and its inputs are identical to a full scan's, so the value is **bit-identical**. When it fails, that tap rescans 170 planes. `skip`/`sk2` are index-based and shared.

**Cost.** Baseline 15 scans/stone px; at a 15–25 % rescan rate `5 + 2·p·5` = 6.5–7.5 scans ⇒ **2.0–2.3×**. Registers: 3 × (`dl`, `ab`, `acc`, `skip`) + top-2 state ≈ 9–11 `vec4` on top of the current frame. **Risk: register spill on Mali, which would make this a loss.** Fallback: share only the R/B pair (Δn = 2s, divergence halves, ~1.5×).

**Second risk, silent, highest severity:** `δ` must be bounded from the *actual* accumulated direction difference, not a constant. A too-tight `δ` yields a wrong facet every ~10⁵ bounces — a pavilion flicker that reads exactly like the defect class already recorded in `gem-optics`, with no error anywhere.

### 1.6 A(v) — micro, and the one that is not exact

- **Hoisting** (`F0`, `chr/lum(uFt)`, `normalize(uKey)`, `studio` axes) and per-tap scalarisation (`ab`/`exp`/`acc` are `vec3`, 2/3 discarded): ~2 % of trace ALU [S], removes 3 `pow` per tap. Bit-identical.
- **Divide-free compare**: `ti < t` ⟺ `q < t·den`, `ti > 2e-3` ⟺ `q > 2e-3·den`, both for `den > 0` (Cor. 1 gives the sign). Removes 850 divides/stone px ≈ **11 %** [S]. **Not bit-exact** — cross-multiplication rounds differently, so exact-tie pixels can pick another plane. Lane A lists this as pixel-identical; it is *pixel-gated*.

---

## 2. B — FEWER TRACED PIXELS

Two mechanisms, different failure modes. Both greenfield: `GEM_ACCUM` is absent and no sub-resolution trace target exists [M].

### 2.1 B1 — internal trace scale + RCAS

Trace into a `k·W × k·H` target, upsample in the composite with a contrast-adaptive sharpener. No history, deterministic, no ghosting.

| k | area gain | trace ms | frame | fps |
|---|---|---|---|---|
| 0.80 | 1.56× | 4.27 | 17.9 | 56 |
| 0.75 | 1.78× | 3.75 | 17.4 | 58 |
| **0.667** | **2.25×** | **2.97** | **16.6** | **60** |

- **Only ~23 % of the frame is in scope** (trace 6.7 ms of a 20.3 ms post-exact frame), so a 2.25× on the trace buys **1.22× on the frame**. That is the whole arithmetic, and it is why B is the *last* lever, not the first.
- **Exactness: perceptually-equal at best, never bit-comparable.** At k=0.667 the facet junctions carrying the stone's structure blur over ~1.5 px and the sharpener draws a thin light/dark line on strong boundaries.
- **1×:** same stone at arm's length. What goes is *snap* — a TIR boundary between a bright crown facet and its neighbour spreads 1 px → ~1.5 px, the girdle's 48 walls lose their individual edges, and RCAS leaves a faint rim on the silhouette.
- **4×:** clearly visible. Soft ramp instead of stair-steps, 1–2 px dispersion flecks merged, and a sharpener halo the current build does not have. Measured precedent: a 2-px ramp took `seg_z` 5.94 → 1.92 and `jag p90` 0.110 → 0.150 [M].
- **Cost 1.5 d. Risk: fails the repo's own structure gates**; the only mitigation is more k, which removes the gain.
- **Measured upper bound on the whole idea:** applied to *every* pass (rig-wide 0.5× linear) this measured **41.43 → 20.05 ms, 2.07×, 24 → 50 fps** [M]. That is the ceiling for "just render fewer pixels", and it costs resolution everywhere including the canvas.

### 2.2 B2 — sparse trace + object-space reprojection + accumulation

Trace **1/f of the pixels at full resolution** each frame (rotating pattern), keep a full-res RGBA16F history plus the **entry distance** in an aux channel, reproject by the frame's rigid pose delta, accumulate with a 3×3 neighbourhood clamp, output the history directly. No upsample, no sharpener, no spatial softening.

**Why the reprojection is near-exact.** The trace runs in object space (`gem-shader-ext.js:62`: `ro`, `rd` after `R = mat3(uM)/sc`) — the radiance field is glued to the stone. For a pure rotation the map is `p_t = project(M_t · M_{t−1}⁻¹ · x_entry(p_{t−1}))`, with `x_entry` recovered from the stored entry distance. Rotation therefore contributes **zero** ghost; the ghost sources are disocclusion, the tint morph, and drag.

- **Convergence:** 1/f → full density in `f` frames. At the shipped 0.2835 rad/s (`spin` 0.315 × the 0.9 at `gem3d.js:52`) that is **0.27°/frame**, so 3 frames = 50 ms = **0.81°** of history — which is why the window can be this short. A held pose converges to `f × history-frames` spp (8–16) and is *sharper* than today.
- **Drag:** the warp stays correct (same rigid map), but revealed facets have no history → one frame at 1/f density there and a **2–4 px trail on the collar** while the pose steps. Policy: raise to f = 1–2 while `GEM_DRAG` is active; reset on `|Δyaw| > 3°/frame` and on any category/tint change.
- **Frame 1 / remount:** trace 1/1 once, or the first visible frame is a 1/f subset — visibly grainy on the pavilion.
- **Stills:** *not* bit-comparable — **better** (8–16 spp vs 1). A 1-frame still is worse. Gate: "≥ 4 frames accumulated".

| f | trace ms | + resolve | frame | fps |
|---|---|---|---|---|
| 2 | 3.34 | 0.9 | 17.8 | 56 |
| **3** | **2.22** | **0.9** | **16.7** | **60** |
| 4 | 1.67 | 0.9 | 16.2 | 62 |

- **1×:** indistinguishable at rest. Faint temporal grain on the pavilion for 2 frames after a pose change; a 2–4 px collar trail during a fast drag.
- **4×:** *sharper* than today at rest (3 spp, stationary grain decaying in 3 frames), no halos, no ramp. Noisier than today during drag.
- **Cost 5–7 d** (MRT/packed entry distance, history targets, warp uniform, clamp, invalidation and first-frame policy). **Risk:** the drag signature is visible and needs an owner ruling; it is the largest new surface in the plan.

---

## 3. C — BLOOM / SCENERY, ITEMISED

Frame ms are the measured baseline (trace 14.7 · scenery 8.4 · bloom 13.8 · comp 13.1 = 50.0).

| # | change | ms recovered | exactness | what visibly changes | cost |
|---|---|---|---|---|---|
| **C0** | `autoClearColor = false` — the 80×80 backdrop is opaque and full-screen, so the colour clear is redundant | bloom 13.8 → **11.4** (−24 MB of A's ~78) | **bit-identical** (every pixel overwritten) | nothing | 0.3 d |
| **C5** | canvas context `antialias:false` (`gem3d.js:17`) | comp 13.1 → **9.0** (the 4× canvas write + resolve dominates a 2-fetch pass) | **bit-identical** — a full-screen composite quad covers every sample; the 4× is pure allocation | nothing | 0.1 d |
| **C1a** | drop `target.depthTexture` (`gem-bloom.js:42`); the 9 depth fetches become a uniform gate | bloom → **9.6** (−24 MB) | bit-identical **in bare ceremony mode** — the gate is `1−smoothstep(.999,.9999,depth)`, inert wherever an opaque backdrop writes depth [S] (`gem-bare.js:53`) | nothing here; the staged surface needs its own gate | 0.5 d |
| **C1b** | `samples: 4 → 0` (`gem-bloom.js:41`) | bloom → **4.6** (−54 MB) | **visible alone** (4-level silhouette AA → stair-steps); restored by C2 | silhouette only | 1 d with C2 |
| **C2** | R8 `MSAA-4` colour-only coverage pass (3 MB, no depth, trivial FS; edge band ≈ 0.24 % of the buffer) + composite blends by resolved coverage | **+0.6** → **5.2** | **≤1 LSB** — the resolve is `cov·colour + (1−cov)·bg` at the same 4 sample positions, which is the arithmetic MSAA already performs | nothing; this *is* the AA | 1 d |
| **C3** | bloom at half-res **linear**: 4 bilinear taps at `res` 0.5 replacing 9 taps on a ±2-texel grid | → **4.6** | perceptually equal, arguably better — the 3×3 on a 2-texel grid is undersampled (Lane A §1 note 2), the faint comb in the glow | glow loses a blocky substructure; at `intensity` 0.32 it is subtle | 0.5 d |
| **C4** | fold the backdrop quad into the composite | scenery 8.4 → **7.2** | **not provably exact** — A is sRGB-encoded (`gem-bloom.js:44`) and `gem-bloom.js:4-6` records a **−5 % stage darkening** from a previous attempt at exactly this | stage background up to 5 % if the encode is wrong | 0.5 d |
| **C6** | **target A to RGBA8.** A is already *display-referred*: `isXRRenderTarget` + `sRGBColorSpace` makes three tone-map and encode into it, so 8 bits holds exactly what the 8-bit canvas shows | bloom 4.6 → **3.8**, comp 9.0 → **7.4**, scenery 7.2 → **5.0** (blend read-modify-write halves) | **≤1 LSB** *if* the bright-pass `smoothstep(0.78, 0.83, luma)` sees the same encoded values — it already thresholds in encoded space, so it should. Gate it, do not assume it | none expected; check the glow shoulder for banding | 1 d |
| **C7** | **fuse the quarter-res blur into the composite** — 2 full-screen passes, no B target | bloom 3.8 → **0**, comp 7.4 → **8.6**; net **−2.6** | ≤1 LSB (4 extra tScene fetches at half-res spacing instead of a separate pass) | none | 1.5 d |

**C alone: 50.0 → 28.3 ms = 35 fps (1.76×)** with every row and every gate. Without C6+C7 it is 35.5 ms = 28 fps.

**The two honesty notes that matter:**
- `gem-optics` lists "bloom target MSAA (4 → 2 or off)" as a **visible** lever. Correct **for the target alone** — that row was measured without a coverage replacement. C1b+C2 is a different object.
- **C7 is the only row that attacks the 3.4 ms/pass fixed cost** [M]. Everything else moves traffic. If the phone re-measure shows a *higher* per-pass cost (tile flush is not cheaper on Mali), C7 stops being optional and becomes the main lever.

---

## 4. THREE CANDIDATE METHODS

All three keep `T=3`, `B=5`, `N=170`, the const bake and the tone/chroma chain untouched. The look is the fixed constraint; only what is *redundant* is removed.

### M1 — EXACT ONLY ("free money")

**Mechanism:** C0, C5, C1a, C1b+C2, C3, C4, C6, C7, then A(v)-hoist and A(iv) tap-share, with A(i) as hygiene. Nothing traced changes.

| component | before | after | gain |
|---|---|---|---|
| trace | 14.7 | **6.7** | 2.19× |
| bloom pass | 13.8 | **0** (fused into the composite) | — |
| composite | 13.1 | **8.6** | 1.52× |
| scenery (incl. DOM) | 8.4 | **5.0** | 1.68× |
| **frame** | **50.0** | **20.3** | **2.47× → 49 fps** |

**Exactness:** bit-identical except three gated rows — A(v)'s divide-free compare (rounding), C4's encode (≤5 % stage risk), C6's 8-bit target (≤1 LSB) — each with a stated drop-out. **Cost:** 9–11 engineer-days. **Risk:** low; the only novel surfaces are the coverage pass and the tap-share guard. **Misses 60 fps by 3.6 ms (1.22×).**

### M2 — SPATIAL RESAMPLE (M1 + B1)

Adds an internal trace target at **k = 0.667** and a contrast-adaptive upsample in the composite.

| component | before | after | gain |
|---|---|---|---|
| trace | 14.7 | **2.97** | 4.95× |
| composite (with inline bloom) | 13.1 | **8.6** | 1.52× |
| scenery (incl. DOM) | 8.4 | **5.0** | 1.68× |
| **frame** | **50.0** | **16.6** | **3.02× → 60 fps** |

**Exactness: perceptually-equal, not bit-comparable.** Stills are soft, not converged. **Cost** +1.5 d. **Risk: medium-high — the candidate most likely to be vetoed on the look**, because the repo's own record says a ramped edge costs `seg_z` 5.94 → 1.92 and `jag p90` 0.110 → 0.150 [M].

### M3 — TEMPORAL RECONSTRUCTION (M1 + B2)

Adds the 1/f sparse trace, the entry-distance aux, the object-space reprojection and the 3×3 clamped accumulator.

| component | before | after | gain |
|---|---|---|---|
| trace | 14.7 | **2.22 + 0.9 resolve** | 4.72× |
| composite (with inline bloom) | 13.1 | **8.6** | 1.52× |
| scenery (incl. DOM) | 8.4 | **5.0** | 1.68× |
| **frame** | **50.0** | **16.7** | **2.99× → 60 fps** |

**Exactness:** converged, not bit-identical — a still after 4 frames is *better* than today (8–16 spp), a 1-frame still is worse. **Cost** +5–7 d (14–18 total). **Risk:** medium-high but in a different place — the spatial image is untouched (no ramp, no halo) so the structure gates pass by construction; the exposure is temporal (drag trail, first-frame grain, invalidation). **The only candidate with a quality dial:** f = 4 gives 62 fps, f = 2 gives 56 fps at higher fidelity.

---

## 5. RECOMMENDED SEQUENCE

Ordered by **risk-adjusted gain**. Steps 1–7 are bit-exact and independent of every contested decision; they are worth doing regardless of what happens at Step 8, and they are worth **2.47× on their own**.

| # | step | predicted | cumulative | kill gate | rollback |
|---|---|---|---|---|---|
| **P0** | **Probe, do not build.** Per-pass `GEM_TIMER.json()` on the device; confirm the buffer is the dpr the premise assumes (§7.1 of Lane A), and whether the card rig behind the ceremony is still live. | — | — | `WxH @ratio` on every row. If the card rig is live, **parking it is 11.18 → 7.14 ms, 1.57×, zero visual risk** [M] and it moves ahead of Step 1. If any pass's fixed cost exceeds 3.4 ms, Step 6 is mandatory, not optional | none |
| **1** | C0 + C5 | 50.0 → 43.5 | 1.15× | **pixel gate: 0.000 % > 0/255**, byte-identical `readPixels`, 2 frozen poses + 2 untuned angles | one flag each |
| **2** | C1a | → 41.7 | 1.20× | **pixel gate: 0.000 % > 1/255** on the ceremony surface; `GEM_BLOOM.on()` read back on every row | one line |
| **3** | C1b + C2 + C3 | → 36.7 | 1.36× | **silhouette gate: 0.000 % > 2/255 frame-wide, stone-mask IoU ≥ 0.9995, `jag p90` within ±0.005 of HEAD.** One stair-step outside the stone bbox fails the step. C3 gates separately on the glow: 0.000 % > 2/255 outside a ±12 px band | keep MSAA-4 |
| **4** | A(v) hoist + A(iv) tap-share | trace 14.0 → 6.7; frame → **28.7** | **1.74×** | **pixel gate: 0.000 % > 0/255** on 200 frozen frames × 3 stones; **rescan rate ≤ 25 %** logged; a single wrong-facet event → immediate revert | one function |
| **5** | C6 (RGBA8 target A) | → **24.1** | **2.08×** | **pixel gate: 0.000 % > 1/255** plus a glow-shoulder banding check (≤ 2 levels of step in a B gradient) | one format |
| **6** | C7 (fuse bloom into the composite) | → **21.5** | **2.33×** | **pixel gate: 0.000 % > 1/255**; `calls` drops by one pass and the frame must gain no visible seam at the glow's outer radius | one pass |
| **7** | C4 (backdrop fold) — *optional, last* | → **20.3** | **2.47×** | **pixel gate: 0.000 % > 1/255 on the stage background** — `gem-bloom.js:4-6` records a −5 % shift from this exact re-derivation. Fail → drop; the plan still lands 21.5 ms | one quad |
| **8a** | **Decision gate.** Size B against the *measured* residual: `R = 16.7 − (scenery + chain)`; `f = trace_ms / R` | — | — | if `R ≤ 0`, B cannot close it and the answer is §6 | — |
| **8b** | M3 at `f = ceil(f)` | → **16.7 ms, 60 fps** | **2.99×** | **structure gate, not a pixel gate:** `seg_z ≥ HEAD`, `jag p90 ≤ HEAD + 0.005`, `hp σ` within ±8 %, `plate ≤ HEAD + 1 pp`, on the 3 gated tilts **plus** 2 untuned angles, at 2× and 4× crops. Plus a **drag gate**: 30-frame pose sweep, no pixel displaced > 4 px from the f=1 reference | `f = 1` is current behaviour |
| **8c** | If 8b is vetoed on the drag signature, M2 at k = 0.667 | 16.6 ms, 60 fps | 3.02× | same structure gate; `seg_z` will decide it | sub-res target off |

**Why this order.** Steps 1–3 recover **13.3 ms** (50.0 → 36.7) for 2.9 days and three pixel gates, none of which needs a decision about the look — more than the trace can give by exact means. Step 4 is the only exact lever on the trace's ALU and is worth 8.0 ms. Steps 5–6 are worth another 7.2 ms and are the only way to remove the per-pass fixed cost. Steps 1–7 take the frame to **20.3 ms = 49 fps with the image bit-identical**; Step 8 is the first step that spends appearance, and the only one whose sizing is set by what was actually measured.

---

## 6. THE RESIDUAL GAP, STATED PLAINLY

**Exact means do not reach 3×.** M1 lands at **2.47× (49 fps)** and misses 60 fps by 3.6 ms — **1.22×**. At the optimistic end of every band at once (tap-share 2.3×, every C row landing) the exact column tops out near **2.55× (51 fps)**. Nothing between 51 and 60 fps exists without spending appearance.

It does not close by looking harder at the trace, because the trace is no longer where the frame is:

| term | ms after all exact work | why it cannot go lower |
|---|---|---|
| scenery | 5.0 | 3 blended floor quads are the look; the backdrop is already folded |
| composite | 8.6 | one full-screen pass + inline bloom ≈ 3.4 ms of pass overhead + fill at 1.48 Mpx |
| trace | 6.7 | 2.19× is the provable ceiling on `T·B·N` |
| **floor** | **20.3** | |

`T`, `B` and `N` are each already at their look constraint: `N = 170` is the cut's own set (the 16-fold version measured 72 526 px at Δ243 [M]); `B = 5` is the approved depth; `T = 3` → 1 is a measured **12.1 % of pixels at Δ > 2/255** [M]. So the last 1.22× can only come from **tracing fewer pixels and reconstructing** — and that is where "no visual compromise" stops being provable and becomes a claim to verify. The two honest options:

1. **M3 (temporal)** — the spatial image is untouched, so the look survives at 4×; the price is a drag-time trail and a first-frame grain the owner must rule on.
2. **M2 (spatial)** — deterministic, no ghosting, no new temporal surface; the price is ~0.6 px of softening at every facet junction, which the repo's own `seg_z`/`jag` history says is the deciding number.

**If both are vetoed: report 49 fps exact, with the last 1.22× unavailable without an appearance decision the owner has reserved.** Hand over the two-sided choice with crops (M2's softened junction vs M3's drag trail); do not keep grinding the shader.

**One honest caveat on the floor itself.** The 3.4 ms/pass figure is measured on M1 headless through ANGLE, whose per-pass overhead is high; a native mobile driver may be cheaper or dearer per tile flush. Lane B is explicit that absolute ms do not transfer — only the ranking and the ratios. If P0 shows a *lower* per-pass cost on the phone, the floor drops and M1 may already clear 60 fps. If it shows a higher one, **C7 is the plan**, and no amount of shader speed reaches the target on a 3-pass chain.

---

## 7. What this design does not do

- **No BVH, no direction-cell table, no plane folding** — all three priced above as losses or as visible changes, and all three already rejected in the repo's record for adjacent reasons.
- **No 2×2 supersample** — measured to *degrade* the edge gates while doubling frame time [M].
- **No DPR cap as the plan.** The controller stays as a safety. A rig-wide 0.5× linear is a *measured* 2.07× [M] — the fastest single lever in the building — and it is also the only one that touches every pixel of the image, which is precisely why it is not the plan.
- **No claim that stills stay bit-comparable past Step 7.** Past Step 7 the gate changes from a pixel gate to a structure gate — stated at each step rather than discovered at integration.
