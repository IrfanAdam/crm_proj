# Lane A — static render audit of the gem engine (cost model + hotspots)

Repo: `/Users/irfan/Documents/Portfolio Redo/crm_proj`
Date: 2026-11-23 · **READ-ONLY** (no source edits, no server, no commit). All paths below are absolute-source-relative to `src/components/GemReward/` unless written in full.

**Number labels used everywhere in this file**
- `[M]` = **measured / from probe or history**, quoted from `gem-optics/references/perf-budget.md` or an in-repo header comment. Not re-derived here.
- `[S]` = **static estimate**: counted from the source text (loop bounds, ops) or computed by the CPU mirrors in §Appendix. Not a runtime number.
- Anything not labelled is arithmetic on the two above.

Nothing in this report was produced by running the renderer. The two CPU mirrors (§Appendix) reproduce *geometry* and *the entry rule*, not GPU time.

---

## 0. TL;DR

| fact | value | label |
|---|---|---|
| Plane count per trace (`PLMAX` = `uCount`) | **170** | [S] reproduced by mirror (444 tris → 170 planes) |
| Plane tests per **stone pixel** | `N·(1 + T·B)` = **2,720** | [S] |
| Plane tests per frame (phone ceremony 780×960, stone 27.4 %) | **0.56 G** | [S] |
| Dominant term | `T · B · N` = 2,550 = **93 %** of the trace ALU | [S] |
| Trace share of frame | **~62 %** = 52 % bounce scan + 2 % entry + <8 % env panels | [M] (probe attribution at 13.6 ms, 786×640) |
| Bloom chain share of frame | **33 %** at 786×640 | [M] |
| Bloom ALU share (if it were ALU-bound) | **0.3 %** | [S] → the 33 % is target/memory/draw, not the 9 taps |
| Scenery (backdrop + 3 floor quads) | **15–22 %**, trace-independent | [M] |
| Pixel-identical optimisation ceiling | **≈1.3×** | [S] §5 |
| Visuals-held ceiling incl. visible levers (MSAA, backdrop merge) | **≈1.5×** | [S] §5 |
| Knob ceiling already measured | 1.9–2.7× | [M] |
| Phone need | 14.9× | [M] |
| Temporal accumulation / adaptive internal res in tree | **absent** (no `GEM_ACCUM`, no sub-resolution trace target) | [S] grep |

**Consequence:** no per-pixel rewrite of this shader reaches 14.9× with the look held. The audit's job is therefore to (a) name the real costs, (b) harvest the ~1.3× that is genuinely free, and (c) state that the remainder has to come from *fewer traced pixels* — a path that does not exist in the tree today.

---

## 1. Render graph — fullscreen ceremony (`gallery.html` → `#gem-screen`)

Surface: `gallery.html:38` `#gem-screen`, canvas created at `src/ds/gemreward-spec.js:45-53`, CSS `src/components/GemReward/gem-reward.css:43-46` → `width: min(100%,720px); height: min(58dvh,480px)`.
Buffer: `gem3d.js:20` `setPixelRatio(min(devicePixelRatio,2))`, controller at `gem-perf.js:31-34,42` (`setDrawingBufferSize`). **Ceiling is `min(dpr,2)`** — a phone at dpr 3 renders at 2 unless `?gemdpr=3` / `GEM_PERF_CONFIG.max=3`. See §7.

| # | pass | source | target size | loops / bounds | tex fetches / out px | precision |
|---|---|---|---|---|---|---|
| 0 | DOM glass / compositor | `src/glass/*.css` (`dock-lens.css:50,65,74,84`, `fab-gem.css:8`) | screen | backdrop-filter blur 4.5–6 px, saturate 128–138 % | — | — |
| 1a | backdrop quad | `gem-bare.js:52` (`bare` only) | full buffer | `PlaneGeometry(80,80)` = 2 tris, `toneMapped:false`, `renderOrder 1` | 0 | highp (default) |
| 1b | floor quads ×3 (shadow, contact, caustic) | `gem-bare.js:57-59,67`; `gem-bare-ext.js:5-11` | ~0.5–1.5× stone bbox each | shadow `order −2` + contact `−1.4` = NormalBlending, caustic `−1` = AdditiveBlending, all `depthWrite:false` | 1 (map) each | highp |
| 1c | **gem trace** (1 draw, `FrontSide`, `discard` off-silhouette) | `gem-scene.js:70` → `gem-shader.js:49` → `gem-shader-ext.js:60-68` | stone coverage of buffer | entry `N`; bounce `B≤6` (`uBounce`=5) × `N`; taps `T`=3 | ≤38 (see §1 note) | **none declared → three default `highp float`** |
| 1d | body `MeshPhysicalMaterial` | `gem-shader-body.js`, `gem-scene.js:71` | — | **not drawn in CORE mode** (`gem-scene.js:73` adds `core`, not `body`) | 0 | — |
| 1e | far-side proxy | `gem-shader.js:72` | — | **not created in CORE mode** (`proxy = !core && …`) | 0 | — |
| 2 | scene → **target A** | `gem-bloom.js:54-55`, target `:41-42` | `W×H` `RGBA16F`, **MSAA 4**, + `DepthTexture(W,H)` | wraps every `renderer.render` | — | 16F |
| 3 | bright-pass + 3×3 gaussian → **target B** | `gem-bloom.js:61`, shader `gem-bloom-ext.js:6-13` | `bw=⌊W·res⌋, bh=⌊H·res⌋`, `res`=0.5 (0.25 if `?gemphone>0`) (`gem-bloom.js:18,38`) | `i,j∈[-1,1]` = **9 taps**, gaussian σ=0.6, threshold 0.78 + 0.05, depth gate | **18** (9 colour + 9 depth) | highp |
| 4 | composite A + B·intensity → canvas | `gem-bloom.js:62-65`, shader `gem-bloom-ext.js:14-17` | full canvas (**MSAA from context** `gem3d.js:17`) | 1 tap each | **2** | highp |

Notes that change the mental model:
1. **There is no bloom mip chain.** One full-res target A + one half-res target B, one 3×3 blur pass, one composite. "Chain" = 2 targets, 3 draws.
2. **The blur is spatially coarse, not expensive:** `texel = api.spread / W` with `spread=4` (`gem-bloom.js:57`, `:20`) → tap offsets are ±4 **full-res** px = **±2 B texels** at `res`=0.5 (3 taps spanning 5 B texels ≈ 10 full-res px); at the phone's 0.25 res the same offset is ±4 B texels. A 3×3 gaussian sampled on a 2-texel grid is undersampled (comb artefacts in the glow) — cheap, and a quality note rather than a cost one.
3. **MSAA 4 belongs to the bloom wrapper but is paid by the gem pass.** The trace writes into a 4-sample 16F target with a 4-sample depth attachment (`gem-bloom.js:41-42`). Nothing in the gem uses per-sample anything; the 4× exists for the stone silhouette on a pass that is 73 % flat background.
4. `textureCubeUV` (envR) is the only place the trace samples a texture: 2 fetches per call (`gem-shader-ext.js:20-21`), mip selected by `uCr`=0.05 (crisp) and `uBr`=0.30 (broad).
5. `PLTEX` fallback would turn all 2,720 plane tests into texel fetches (`gem-shader-ext.js:15`) — not in use; `bake='const'` (`gem-facets.js:64-73`) is the shipped path, and `gem-mesh.js:8` confirms `MAX_FRAGMENT_UNIFORM_VECTORS` 1024 / const path.

---

## 2. Per-stone-pixel inner loop, exactly

Source: `gem-shader-ext.js` (the whole fragment program is lines 12–68).

**Setup** (`:60-64`)
- `w = normalize(vW - cameraPosition)` (1 rsqrt), `R = mat3(uM)/sc`, `ro`/`rd` = 2 × 3 dot3 (camera→object space) + 1 divide by `sc`.
- `tau = 0.9·(length(dFdx(rd)) + length(dFdy(rd)))` (`:64`) — two derivatives; forces 2×2 quad granularity and is the only derivative in the trace (used solely for the 1-px crease blend).

**Entry** — `ent()` `:42-52`, called once per pixel (`:64`), shared by all wavelengths.
- Loop `for (i=0; i<PLMAX; i++)`, **no early exit** (`if (i >= uCount) break` with `uCount == PLMAX == 170`).
- Per plane: `PL(i)` read + `dot(P.xyz, ro)` + `dot(P.xyz, rd)` + `t = -s/den` (**1 fp32 divide**) + 2 compares. ≈11 FLOP + 1 div ≈ 15 FLOP-eq. → **170 × 15 = 2,550 FLOP-eq**.
- Keeps the top-2 `t`, then a 1-px-wide normal blend gated at `dot(n1,n2) > 0.9935` (`:50`), one `normalize` (`:52`).

**CORE clamp** — `:64` (`#ifdef CORE`): `tf = length(vO - ro)`; if `E.x > 2.5·tf` → **a second 170-plane scan** with a match gate (`dot > 0.9995` && `|plane(vO)| < 6e-3`) + one `normalize`. Bound: ≤170 × 15 ≈ **2,550** extra. Static mirror says it fires on **0 of 12 pose/size samples** (§Appendix B) — see §7 for why that is not yet actionable.

**Per tap** — `tr()` `:53-59`, called `T` times with `n = ior·(1±uSpread)` (`:65-66`); `uSpread` is Abbe-derived `(d−1)/abbe/d` (`gem-optics.js:42`), ~0.006 for sapphire.
- `refract(rd, ne, 1/n)` once; `F0 = pow((n−1)/(n+1), 2)` **per fragment per tap** (`:56`) — a per-material constant.
- **Bounce loop** `for (b=0; b<6; b++) { if (float(b) >= uBounce) break; … }` (`:55`), `uBounce`=5 (`gem-optics.js:32`).
  - Inner `for (i=0; i<PLMAX; i++)` with `continue` on `i >= uCount || i == skip || i == sk2`. Per plane: `dot(P.xyz, dl)`, `dot(P.xyz,p)+P.w`, `ti = -(…)/den` (**1 divide**), two compares → **15 FLOP-eq**, ×170 = **2,550 per bounce**.
  - Per hit: `p += dl*t`, `gTot += t`, `ab *= exp(-uK*(t*uKS))` → **3 `exp` per bounce** (`:56`); `nh`, `c = clamp(dot(dl,nh))`; TIR test `n²(1−c²) < 1`.
  - **Escape** (non-TIR): Schlick `pow(1−c, 5)`, `envR(refract(dl,−nh,n), R)·ab`, `break` (`:57`).
  - **Total-internal-reflection**: `dl = reflect(dl, nh)`, `skip = hi`, next bounce. No transmittance cut-off — a dim path keeps marching to the cap (only `ab` shrinks, never used to exit).
  - After the loop, if no escape happened: `acc += ab·envR(dl,R)·0.20` (`:59`) — a 6th env evaluation.
- Cost per tap: 5 × 2,550 = **12,750** plane FLOP-eq + 5 × 3 `exp` + ≤6 `envR` + Fresnel + refract/reflect ≈ **13,650**.

**Dispersion** — `:65-66`: **3 full traces**, not a shared path. `c0 = tr(ior·(1−spread))`, `c4 = tr(ior·(1+spread))`, `c2 = tr(ior)`, then `acc = vec3(c0.r, c2.g, c4.b)`. `uTaps > 4` adds **2 more full traces** mixed 0.5 into c0/c4 (5 traces total). Every trace re-runs `ent`'s result (shared) but re-runs `refract`, `F0`, the whole bounce chain, `ab`, `gTot`, `envR`.
→ **2/3 of each trace's RGB arithmetic is discarded** (`ab` is vec3, `exp` is vec3, `acc` is vec3, then one channel is kept). Only the *directions* differ between wavelengths, so the fetches are genuinely distinct; the surrounding maths is not.

**Exit / grade** — `:67-68`
- CORE: `Ff` (one `pow`), `envR(reflect(rd,gNe), R)` (**2 more fetches**), `uFg·uFt·(1−Ff)` fill.
- Tone: `aces()`, `pow(…, 1/uGam)` (**3 `pow`**), white-desat `smoothstep`, curve-B lift, hue-preserving chroma solve with **2 divides** and `chr(uFt)`, `lum(uFt)`, `lum(o)` recomputed per fragment though `uFt` is a uniform. ≈550–600 FLOP-eq.
- Debug branches `dbg > 0.5` (`:67`) are uniform-gated — no divergence cost.

**Environment sampling** — `envR()` `:18-21`: **procedural + PMREM, both.**
- `keyT(e)`: `pow(dot,90)` + `pow(dot,5)` + 2 `normalize` (`:18`).
- `studio(e)`: 3 `pan()` panel tests, each with a `cross`, a `normalize`, a divide and a `smoothstep`, plus a 4th `normalize` for `kz` (`:19`).
- 2 `textureCubeUV` fetches from the PMREM (`:20`), then `sh()` tone-compress and `tint1()` (luma-preserving tint, 3 divides) (`:20`).
- All of this is evaluated **per envR call** — up to 6 per tap × 3 taps + 1 = **19 times per stone pixel**, though every input except `e` is a constant uniform.

**Iteration-bound summary (one stone pixel, shipped defaults)**

| stage | iterations | divides |
|---|---|---|
| entry | 170 | 170 |
| CORE rescan | ≤170 (0 in static mirror) | ≤170 |
| bounce scan | 3 taps × 5 bounces × 170 = **2,550** | **850** |
| bloom (per B px) | 9 | 0 |

---

## 3. Algorithmic waste with evidence

| # | waste | evidence | size |
|---|---|---|---|
| W1 | **Fixed 170-plane scan with no spatial acceleration**; every bounce tests every plane including the 48 girdle walls | `gem-shader-ext.js:55` | 2,550 tests/stone px = 93 % of trace ALU [S] |
| W2 | **One fp32 divide per plane candidate** (`ti = -(…)/den`), 850/stone px + 170 entry | `:55`, `:42` | ~11 % of the trace ALU is divide cost at div≈4 [S]; mobile div is 4–8 ops |
| W3 | **Full-res MSAA-4 RGBA16F + depth texture** for a pass that is 73 % flat background and has no per-sample work | `gem-bloom.js:41-42`, `MSAA=4` `:15` | ~24 MB colour write + 24 MB resolve + 12 MB depth write per 780×960 frame [S]; shares the frame's #2 cost slot [M 33 %] |
| W4 | **Per-tap channel maths is not scalarised**: `exp` (vec3), `ab` (vec3), `acc` (vec3) computed 3× and 2/3 discarded | `:56,59,66` | 45 `exp`/px where 15 are read [S]; ~1 % of ALU |
| W5 | **Material constants recomputed per fragment**: `F0` (×3), `chr(uFt)`, `lum(uFt)`, `tgt`'s denominator, `normalize(uKey)` (×2 per envR), `studio`'s `normalize` (×2 per envR) | `:56`, `:68`, `:18-19` | ~19 envR calls/px carry ~50 hoistable ops each [S]; ~1 % of ALU |
| W6 | **Backdrop shaded twice**: a full-screen 80×80 quad in the scene target (`gem-bare.js:52`, depth-rejected only where the stone covers) and again as the composite's `tScene` tap | `gem-bare.js:52`, `gem-bloom-ext.js:16` | scenery is 15–22 % of the frame [M]; the quad is trace-independent and could be folded into the composite (pixel-identical for a flat colour, `toneMapped:false`) |
| W7 | **9 depth fetches per B pixel**; the gate they feed is inert whenever an opaque backdrop writes depth | `gem-bloom-ext.js:10`, `gem-bare.js:52-53` | 9 of 18 fetches in the bloom pass [S] |
| W8 | **6th env evaluation per tap** when every bounce TIR'd (`acc += ab·envR(dl)·0.20`) | `:59` | 2 fetches + full `keyT/studio` per tap [S] |
| W9 | **No transmittance early-exit**: the bounce loop only leaves on a Fresnel escape, never on `ab → 0`, so a path that absorbs to black still pays all 5 scans | `:55-58` | up to 2,550 wasted tests on dark paths [S] (a per-fragment break is warp-granular, so the saving is partial) |
| W10 | **CORE entry rescan**: second 170-plane scan + normalize behind `E.x > 2.5·tf` | `:64` | ≤2,550 FLOP-eq, 0 observed in the static mirror [S] — unresolved, §7 |
| W11 | **`?gemmesh=1` already prices the entry scan**: −9.5 % frame, but 2.4 % of pixels differ (girdle 19.3 % > 8/255, maxΔ 243) | `gem-mesh.js:8-10` | a 1.10× lever that is a *visual change*, not free |
| W12 | **Caustic field is CPU, per pose change**: 268 cells → pavilion facets → 3 channels → ~377-tap Gaussian splat, plus 2 × 25 600-px passes | `gem-caustic-trace.js:41-91`, `gem-caustic.js:65-72` | 3.095 ms/frame [M]; 0.918 ms with the pose gate [M] |
| W13 | **No idle/static-frame cache**: the scene is re-traced every rAF even when the pose is frozen (drag hold, `prefers-reduced-motion` single render, spin 0) although the image is deterministic | `gem3d.js:31-60`, `gem-rig.js:81` gates only the caustic | 100 % of the trace on a held frame [S] |

Branch-divergence risks: `:55` `continue` on `skip/sk2` (uniform per fragment — no divergence), `:57` TIR branch (real divergence: neighbouring pixels leave the loop at different bounces, and the loop runs to the warp's max), `:64` CORE clamp (divergent, rare), `:42` entry top-2 update (divergent, shallow).

Over-draw (canvas pixels shaded, per frame): scene pass 1× (with the stone covering s≈0.27–0.45), composite 1×, bloom 0.25× of area → **~2.25 fragment invocations per buffer pixel**, of which the expensive one covers only `s·P`; plus **4 MSAA samples** stored/resolved on target A and again on the canvas (`gem3d.js:17` `antialias:true`).

Per-frame CPU (must not be on the hot path): `GEM_RIG.tick` → `backdrop` (loop over `mats`, idempotent) + `pool` (pose-gated; `field()` when it crosses the threshold) [M 3.095 → 0.918 ms], `GEM_PERF.tick` (one buffer write + a 30-sample sort per window). Everything else is one-time setup: PMREM cached per renderer (`gem-env.js:78-86`), plane set baked into the source once (`gem-facets.js:64-73`), caustic kernel/LUT/ImageData cached (`gem-caustic-trace.js:25-35`, `gem-caustic.js:11-12,60`).

---

## 4. Cost model

Symbols: `T` taps, `B` bounce cap, `N` planes (170), `E[β]` mean bounces executed, `P` buffer pixels, `s` stone coverage, `c_p = 15` FLOP-eq per plane test (11 FLOP + 1 divide at 4).

```
entry        : N · c_p                                         = 2,550
clamp        : ≤ N · c_p            (conditional)              = ≤2,550
bounce       : T · B · N · c_p                                 = 38,250
per-tap tail : T · ( refract + reflect + Fresnel + 3B·exp + 2(B+1)·envR )
             ≈ T · ( 24 + 12 + 12 + 45 + 6·110 )               ≈  2,400
exit+grade   : envR + Ff + aces + 3 pow + hue-solve            ≈    600
------------------------------------------------------------------
per stone px :                                                    44,000   (plane scan 93 %)
```

| pass | output px | plane tests / px | tex fetches / px | FLOP-eq / px | static share of frame ALU | measured share [M] |
|---|---|---|---|---|---|---|
| gem trace (entry+bounce+tail) | `s·P` | `N(1+T·B)` = 2,720 | ≤38 (≈24 avg) | 44,000 | **99.6 %** | 52 % bounce + 2 % entry + <8 % env panels |
| bloom gaussian | `res²·P` (0.25 P) | 0 | 18 per B px = 4.5 / canvas px | ~200 per B px | 0.3 % | **33 %** (whole 3-pass chain) |
| composite | `P` | 0 | 2 | ~15 | 0.1 % | shared with bloom row |
| scenery (backdrop + 3 floors) | `P` + stone | 0 | 0–1 | ~10 | 0.05 % | 15–22 % |
| caustic (CPU) | — | — | — | — | — | 3.095 ms → 0.918 ms gated |

**Bloom vs gem pass.** ALU ratio per canvas pixel ≈ `44,000·s : 45` ≈ **280 : 1** at s=0.45; measured wall-time ratio ≈ **1.6 : 1**. The bloom pass is ~175× more expensive per unit of arithmetic than the trace → it is **not** ALU-bound. Its cost is the full-res MSAA-4 16F target, its depth texture, the RAST+resolve, and 2 extra full-screen draws. Static byte estimate for A at 780×960: 24 MB colour write + 24 MB resolve-read + 6 MB resolved write + 12 MB depth write + 12 MB depth resolve ≈ **78 MB/frame** [S] (≈1.6 GB/s at 20 fps) — same order as the pass's 33 % share of a ~20 ms frame on a bandwidth-limited phone.

**Frame totals, phone ceremony at the coded ceiling** (780×960 = 0.75 MP, `s` = 27.4 % → 0.205 MP stone; `s` from the geometry mirror, §Appendix A):

- plane tests: `2,720 × 0.205 M` = **0.56 G/frame** → 11.1 G/s at 20 fps
- FLOP-eq: `44,000 × 0.205 M` = **9.0 G/frame** → 181 G/s at 20 fps
- consistency check: the measured 610 ns per stone px [M] × 0.205 M = **125 ms** for the trace; the trace is ~62 % of a 248 ms frame [M] → **~154 ms**. The model's 9.0 GFLOP-eq over 0.154 s implies **58 GFLOP-eq/s** of effective throughput — inside a Mali-G52-class FP32 envelope, i.e. the per-pixel op count is the right order of magnitude. The useful reading is the *term*, not the absolute: `2,720 plane tests/px` is what reproduces the measured per-pixel cost, so any lever that does not reduce `T·B·N` cannot move the phone.

**Theoretical lower bound, visuals held constant**

| lever | scope | saving | label |
|---|---|---|---|
| div-free plane compare (cross-multiply, keep the divide for the single winner) | 850 div/stone px | ~11 % of trace | [S] |
| scalarise per-tap `exp`/`ab`/`acc` to the tap's own channel | 3× redundant | ~1 % | [S] |
| hoist `F0`, `chr/lum(uFt)`, `normalize(uKey)`, `studio` axes into uniforms | ~19 envR/px | ~1 % | [S] |
| merge backdrop quad into the composite (flat colour, `toneMapped:false`) | one full-screen draw | scenery 18 % → ~2 % | [S] (pixel-identical) |
| MSAA 4 → 2 on A, drop the depth texture where the gate is inert | target memory | bloom 33 % → ~20 % | [S] (**visible** silhouette AA) |

- **Pixel-identical only** (rows 1–4): frame 113 → ~88 units ≈ **1.28×**.
- **Including the visible rows** (5): ≈ **1.5×**.
- Knob ceiling already measured: **1.9–2.7×** [M] (and that spends fire/bounce quality).
- Required: **14.9×** [M].

**Lower bound on the dominant term itself:** `T·B·N` is irreducible without changing pixels — 3 wavelengths are 3 traces *by design* (`:36-37` comment: the spectrum is a property of the path), `B=5` is the look, and `N=170` is the cut's own facet set (the 16-fold fold was measured and removed: 72 526 px at Δ243 [M]). The only precompute that touches it is the exit-facet candidate table (§6, #3), measured at 42 median candidates → ~3.4× fewer tests but not bit-exact below k=170 and it converts register reads into fetches (the PLTEX path is 5–10× slower [M]).

---

## 5. Top 10 hotspots, ranked by expected cost

| # | hotspot | file:line | size | label |
|---|---|---|---|---|
| 1 | Bounce plane scan (170 × B=5 × T=3 = 2,550/stone px) | `gem-shader-ext.js:55` | 52 % of frame; 87 % of trace ALU | [M]/[S] |
| 2 | Full-res **MSAA-4 RGBA16F + DepthTexture** target A (owned by the bloom wrapper) | `gem-bloom.js:41-42` | ≈78 MB/frame; bloom chain 33 % with its ALU at 0.3 % | [S]/[M] |
| 3 | Entry scan, 170 tests, no early exit | `gem-shader-ext.js:42,64` | **2 %** of frame (probe bucket); the whole entry *mechanism* (loop + 2 derivatives + 3 extra varyings) is bounded by the −9.5 % `?gemmesh=1` A/B | [M] |
| 4 | 850 fp32 divides/stone px (one per plane candidate) | `gem-shader-ext.js:55` | ~11 % of trace ALU | [S] |
| 5 | `envR` analytic lighting recomputed ~19×/px (2 `pow`, 4 `normalize`, 3 `pan`, 2 fetches) | `gem-shader-ext.js:18-21`; called `:56,57,59,67` | ~6 % of trace ALU + 38 fetches | [S] |
| 6 | Backdrop quad + composite = background shaded twice, full buffer, twice | `gem-bare.js:52`, `gem-bloom-ext.js:16` | scenery 15–22 % of frame | [M] |
| 7 | 3 full traces with 2/3 of each channel discarded (45 `exp`/px) | `gem-shader-ext.js:56,59,65-66` | ~1 % of trace ALU | [S] |
| 8 | Bloom 9-tap loop with 9 depth fetches (18 fetches per B px) | `gem-bloom-ext.js:9-12` | 4.5 fetches per canvas px; gate inert in bare mode | [S] |
| 9 | Caustic CPU field (268 cells × 3 ch × ~377-tap splat + 2 × 25.6 k-px sweeps) | `gem-caustic-trace.js:41-91` | 3.095 ms → 0.918 ms gated (main thread) | [M] |
| 10 | CORE entry rescan (second 170-plane scan + normalize) | `gem-shader-ext.js:64` | ≤2,550 FLOP-eq; fires 0/12 in the static mirror | [S] |

Deliberately **not** ranked: the far-side proxy and the `MeshPhysicalMaterial` body (both absent in CORE mode, `gem-scene.js:72-73`), the PMREM build (cached, `gem-env.js:78-86`), the plane bake (one-time, `gem-facets.js:64-73`), and DOM glass (not on the ceremony surface — the `backdrop-filter` chrome lives in `src/glass/dock-lens.css` / `fab-gem.css`, loaded by `index.html` only).

---

## 6. Top 5 "constant work that could be precomputed/cached"

| # | opportunity | what is constant | where it would go | expected |
|---|---|---|---|---|
| 1 | **Hoist `envR`'s static terms into uniforms** — `normalize(uKey.xyz)`, `normalize(vec3(-k.x,.30k.y,-k.z))`, `studio`'s `kz`, the 3 `pan` axes, `tint1`'s `1/lum` factors | all pure functions of uniforms (`uKey`, `uFt`, `uSw`, `uSh`, `gain`, `uLu`, `uLuB`) | `gem-shader.js:32-42` uniform block + `gem-optics.js:apply` | ~1 % ALU, removes ~76 `normalize`/stonepx (19 × 4) |
| 2 | **Per-material scalars as uniforms** — `F0`, `Ff` base, `chr(uFt)`, `lum(uFt)`, `tgt`'s denominator | `ior`, `uFt` | same | ~1 %; also removes 3 `pow` from the tap loop |
| 3 | **Exit-facet candidate table** (entry plane × direction cell → candidate plane list) — the only precompute that touches the 93 % term | object-space plane set is fixed for the life of the cut | `gem-facets.js` build, consumed at `gem-shader-ext.js:55` | 170 → **42** median candidates (3.4×) [M]; **not bit-exact** below k=170 (1 wrong facet per 10⁶ bounces at k=76) and pays a fetch per candidate — previously rejected on read cost [M]. Revisit only with a GPU-side measurement |
| 4 | **Pose-static frame cache** — when the pose, stone and tint are unchanged (drag hold, `prefers-reduced-motion`, spin 0), the trace image is bit-identical frame to frame; skip the scene pass and reuse target A | pose + category + tint | `gem3d.js:44-57` / `gem-rig.js:81` (same gate shape the caustic already uses) | 100 % of the trace on a held frame; zero visual risk |
| 5 | **Environment prefilter is already done — extend it to a *lookup* of the analytic layer too**: the studio tent is deterministic (25 blobs + 6 panels + 1 sun, `gem-env.js:27-75`). A small cube LUT of `keyT+studio` at ~64² replaces 2 `pow` + 4 `normalize` + 3 panel tests with one fetch | the analytic studio function is frame-invariant | `gem-env.js` (one-time, per renderer, alongside the PMREM) | ~6 % of trace ALU for +1 fetch per envR call (2 → 3, ≤38 → ≤57/stone px) — **a LUT is an approximation, so it needs a pixel gate**, not a free win |

Also already cached correctly, no action: PMREM (`WeakMap` per renderer), plane set as `const vec4 PLB[170]`, caustic kernel + 256-entry tone LUT + `ImageData`, the caustic field keyed on quantised pose (`gem-caustic.js:20-24`), and the `.stage`/`.shadow` canvas textures.

---

## 7. What a probe must settle (do not act on these first)

1. **Is the owner's phone actually at dpr 3?** The code's ceiling is `min(devicePixelRatio, 2)` (`gem3d.js:20`, `gem-perf.js:31`). A dpr-3 buffer needs `?gemdpr=3` or `GEM_PERF_CONFIG.max=3`. If the "20 fps at dpr 3" reading came from a 3× buffer, **2.25× of the gap is configuration**, not shader. Read `GEM_TIMER.json().canvas` (`gem-perf-timer-ext.js:72`) on the device.
2. **CORE clamp (W10).** A CPU mirror of `ent()` + the `2.5·tf` rule over 12 pose/size samples finds the plane-set entry equal to the fragment's own facet in 100 % of stone pixels (`max t1/tf = 1.0000`), i.e. the rescan never fires — yet the skill's history records the clamp firing on pavilion pixels (normal error 15.5 % of pavilion). The two cannot both be right. Settle it with the `dbg=1` channel before touching the branch; if it truly never fires, the branch + its 170-plane scan is dead code and should be removed, not optimised.
3. **Bloom's 33 % vs its 0.3 % ALU share** — attribute it by toggling `samples: 4 → 0` and dropping `depthTexture` on target A independently (`?gembloom=1` with a one-line patch in a scratch worktree). If the target is the cost, MSAA is the item, not the blur.
4. **Entry scan's true share.** `?gemmesh=1` prices *entry + varying attributes + crease data* together at −9.5 %; the probe's pass buckets cannot separate entry from trace (`gem-perf-timer-ext.js:5` — the stone is one pass). A single-tap, single-bounce probe run (`?gemtaps=1&gembounce=1`) is the closest separable reading.
5. **Mean bounces executed** (`gNb` via `dbg=1`) — decides how much W9 (transmittance exit) and the `b<6` cap actually cost.

---

## 8. Consequence for the 14.9× constraint

- The trace is **93 % one loop** whose size is `T × B × N` = 2,550 plane tests. Every term is load-bearing for the look: T is the fire, B is the depth, N is the cut.
- Everything the static audit can find that is **pixel-identical** totals **~1.28×** (divide elimination, hoisting, backdrop fold). Adding the visible levers (MSAA 2, bloom thinning) reaches **~1.5×**. Both are below the already-measured 1.9–2.7× knob ceiling, because knobs also buy quality.
- The 14.9× therefore cannot come from this pass structure at all. It has to come from **tracing fewer pixels and reconstructing** — and neither an accumulation buffer nor a sub-resolution trace target exists in the tree (`GEM_ACCUM` absent, no `setRenderTarget` at a reduced scale for the scene pass). That is greenfield work, not a tuning round.

---

## Appendix — method, and the two CPU mirrors

Files read (all under `src/components/GemReward/`): `gem-shader-ext.js`, `gem-shader.js`, `gem-shader-body.js`, `gem-optics.js`, `gem-facets.js`, `gem-scene.js`, `gem-env.js`, `gem-bloom.js`, `gem-bloom-ext.js`, `gem-rig.js`, `gem-bare.js`, `gem3d.js`, `gem-perf.js`, `gem-perf-timer-ext.js`, `gem-drag.js`, `gem-caustic.js`, `gem-caustic-trace.js`, `gem-cut.js`, `gem-cut-ext.js`, `gem-mesh.js`, `gem-textures.js`; plus `src/ds/gemreward-spec.js`, `src/components/GemReward/gem-reward.css`, `gallery.html:38`, `src/patterns/OppsHome/reward-sheet.css`.

**A. Silhouette coverage** (`/Users/irfan/.hermes/cache/scratch/gem_silhouette.js`) — builds the real cut via `gem-cut.js` + `gem-cut-ext.js`, dedupes to the plane set (reproduces **170 planes** from 444 tris / 224 verts), places the camera exactly as `gem-scene.js:52-55` (`FOV 32`, `FILL 0.75`, `dist` formula), rasterises the silhouette and counts coverage:

| buffer | aspect | camDist | stone px | coverage |
|---|---|---|---|---|
| 1440×960 (desktop ceremony @2) | 1.500 | 2.84 | 619 071 | **44.8 %** |
| 780×960 (phone ceremony @2, 390×480 CSS) | 0.813 | 4.77 | 204 884 | **27.4 %** |
| 786×640 (the probe's ceremony box) | 1.228 | 3.16 | 220 414 | **43.8 %** |
| 680×640 (app reward sheet @2) | 1.063 | 3.65 | 160 891 | **37.0 %** |
| 1020×446 (the old audit clip) | 2.287 | 2.84 | 133 613 | **29.4 %** |

Sanity: the 1020×446 row's 133.6 k px is within 11 % of the ~150 k px stone masks in the measurement record — the mirror is faithful to that framing.

**B. Entry-rule mirror** (`/Users/irfan/.hermes/cache/scratch/gem_clamp3.js`) — same geometry + camera, per-pixel rays from the inverse projection, perspective-correct `vO`, then the shader's own rule (`s > 1e-5 && den < -1e-6`, max `t`) compared against `tf = |vO − ro|`: at 360×240, 240×296 and 400×400, four spin/tilt poses each, `max(t1/tf) = 1.0000` and the `E.x > 2.5·tf` clamp fires **0/12**. See §7 item 2.
