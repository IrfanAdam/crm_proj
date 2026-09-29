# Illusion cube — surface revision: one floor, real frost, morphing goo, vector ALPHA

> **For Hermes:** Use subagent-driven-development skill to implement this plan task-by-task.

**Goal:** Act on the user's 2026-09-29 feedback pass on `cube-illusion.html` — calm the body grain, ground the assembly on ONE simple floor, replace the wobbling inner boxes with morphing goo that glows, make the body actually frost/blur what's inside it, restore the subtle metal, and rebuild the three text objects (`ALPHA` from the scene's own vector shapes, subtext on the base band, blurb on the body) at their **decoded** anchors.

**Architecture:** Same classic-script rig under `src/components/IllusionCube/`. One new extraction script feeds one new data file (`public/cube-illusion/alpha/alpha-vectors.json`); one new module (`illusion-frost.js`) owns a half-res render-target blur that the shell samples as its transmission term; `illusion-floor.js` collapses to a single grounded mesh; `illusion-prism.js` retires (its streak folds into the floor material); `illusion-form.js`/`illusion-inner.js` swap the four chamfer boxes for analytic-normal blobs under an fbm morph shader; `illusion-logo.js` builds the six decoded glyph outlines as real vector meshes; `illusion-overlay.js` places all three texts at their decoded transforms (everything flush-left at world x −73).

**Tech Stack:** three.js r160 (cdnjs classic scripts, `cube.html` pattern), vanilla JS modules ≤99 content lines, design-system tokens (`lint:tokens` clean, `ILLUSION_SCENE.tok` + `0x` fallbacks), CDP capture harnesses already trusted in this repo (`prototype/gems/illusion-probe.mjs`, `gem-shot.mjs`) on the agent's own Vite server (port **5174** — never touch the user's :5173), `msgpackr` for the splinecode decode.

**Tags:** Component, Motion, Layout, Tooling

**Feedback → verdict (read before Phase 1).** Nine bullets, each grounded against the payload the same day:

| # | User says | Ground truth (payload / captures) | Verdict |
|---|---|---|---|
| 1 | cube shape fine | six bodies reproduce the decoded forms | no change |
| 2 | grain on the body too much | shell `uFrost 1.4` per-pixel speckle — `frost70/clip-0.png` reads as TV static | calm it (Phase 4) |
| 3 | simple floor, cube sits on it — "elevated", "floor + light pane, its all one" | grid plane at y −199.45, prism pane at y 0.72, glow child — three ground-ish layers, base floats 199 u above the grid | one mesh at y 0 (Phase 2) |
| 4 | "alpha vector from the spline model shared, not some random text" | `ALPHA` Empty holds **six `VectorGeometry` bezier shapes** (A L P H A; the H is two shapes — why "Shape 1" repeats), offsets 0.854…1160.29, scale 0.04434 | extract + rebuild (Phases 1/5) |
| 5 | "data doesn't lie" must sit on the lower frame side | decoded Subtext pos (−4.6704, 18.7334, 101.094) — base band, NOT y 100 where the recreation put it | move (Phase 5) |
| 6 | logo + "only crm stack you need" left-aligned, proportional, on the body side | all three text blocks are center-anchored with widths that land their **left edges flush at x −73** (ALPHA's own edge) — the design rule; recreation centered them at x 0 | reproduce (Phase 5) |
| 7 | no blur/frost obscuring the morphing shapes | shell "frost" is only normal-perturbation noise — no backdrop is ever blurred | render-target blur (Phase 4) |
| 8 | inners were meant to be morphing goo + intrinsic glow | bodies are still `chamferBox` with trig wobble — boxes, not goo | blobs + morph + glow (Phase 3) |
| 9 | subtle metal on the body too; body animation is the goo's glow | shell has no metal term; the ramp4 "mesh gradient" drift is a standalone fake — the body's color should come from the goo through the frost | metal lobe + goo-glow transmission (Phase 4) |

**Decoded text anchors (verbatim, do not re-derive):** ALPHA Empty `(−73, 75.39, 101.0939895519962)` scale `0.044340229494009085`; six shapes, child-order x offsets `[1160.29, 863.562, 941.335, 576.473, 326.141, 0.854355]`, all points y ∈ [−227.85, 0] (world span 10.10 u; wordmark 63.70 u wide); Subtext `data in here don't lie`, Azeret Mono 500 / 9 px, letterSpacing −0.04, horizontalAlign 1 (center), w 136.6592, pos `(−4.67042297636263, 18.733398437500014, 101.0939895519962)`; Blurb `Only CRM stack you\nneed`, Inter 600 / 15 px, depth 2, horizontalAlign 1, w 84.8305, h 47.8768, pos `(−30.58474375808499, 110.03010329138462, 98.66477613230134)`. Left edges: −4.6704−68.3296 = −73.0000; −30.5847−42.4153 = −73.0000.

**Rules for every task:** files ≤99 content lines (`wc -l`; overflow by extraction, never packing); header `/* ADAM/<AREA> — <path> · <job> */` + `[plan:2026-09-29_135509-illusion-cube-surface-revision.md#{#phase-N}]` on new/modified files; colours via `ILLUSION_SCENE.tok('--token', 0xfallback)` only; verify on **:5174**; capture artifacts under `.hermes/tmp/illusion-parity/rev-<name>/`; `git stash` checkpoint before the one deletion (Task 5); no `git push`.

---

## Phase 1 — Revision lane: evidence + the scene's own vectors {#phase-1}

*Tags: Tooling, Component*

*Opens the lane with the instruments and the missing asset: the plan's changelog name, the extractor that turns the payload's six `VectorGeometry` letter shapes into a committed JSON the rig can build meshes from, and the before/truth captures every later phase is judged against.*

| # | Task | Done when |
|---|------|-----------|
| 1 | Register the plan in `changelog-names.json` | `npm run plan:names` prints `✓` and lists this plan among the named ones |
| 2 | `scripts/extract-illusion-alpha.mjs` + committed `alpha-vectors.json` | 6 shapes, point counts `[30,12,24,36,18,30]` in … child order, offsets exact; `--check` exits 0; raster proof reads ALPHA |
| 3 | Before/truth evidence captures | `rev-pass-0/` composite + shell-hidden + inner-hidden at 1600×1200, zero console errors; hero crop sheet attached |

### Task 1: Register the plan in `changelog-names.json` ✓ done

**Objective:** The repo gate `scripts/plan-names.mjs` fails the moment a plan file carries `## Phase` headings without a names entry, so the entry was landed **with** these phase sections at planning handoff, appended after the `2026-09-29_132702-ds-docs-experience.md` entry (chronological order preserved):

```json
  "2026-09-29_135509-illusion-cube-surface-revision.md": {
    "title": "IllusionCube — frost blur, morphing goo, one floor, vector ALPHA",
    "purpose": "surface revision round"
  }
```

**Files:** `src/ds/changelog-names.json`

**Verify:** `npm run plan:names` → `✓ plan:names — N phased plans named` with 0 missing; the entry is the last key.

### Task 2: `scripts/extract-illusion-alpha.mjs` — the scene's own letter vectors

**Objective:** The user's phrase is literal: `get the alpha vector from the spline model shared not just some random text`. The payload's `ALPHA` Empty (`d4616316-898c-46b4-8344-bac09b18fe39`) carries **six** `VectorGeometry` children whose `shape.points` are full bezier contours — `[{position:[x,y], controlPrevious:{position}, controlNext:{position}, roundness}]`. Six because the H is assembled from two shapes (a 56.811-wide left stem plus a 170.125-wide right piece, origins 863.562 and 941.335 — the duplicate `Shape 1` name is a copy, not an error). Clone the proven decode contract from `scripts/extract-illusion-textures.mjs` (same PAGE URL, same `docs/assets/illusioncube/illusioncube.splinecode` cache, same `--from`/`--check` flags, same msgpackr `Unpackr({structuredClone:true, useRecords:true})` + ext stubs 1–6) and walk `scene.objects → root → children` for `data.name === 'ALPHA'`, then its children in array order. Serialize:

```json
{ "anchor": { "pos": [-73, 75.39, 101.0939895519962], "scale": 0.044340229494009085 },
  "shapes": [ { "name": "Shape 0", "x": 1160.29, "z": 0,
                "points": [ { "p": [10.63, -227.85], "cp": [10.63, -227.85], "cn": [6.58, -227.85] } ] } ] }
```

to `public/cube-illusion/alpha/alpha-vectors.json` (stable 1-space key order so `--check` byte-compares; expected file ≈15 KB). No colour literals, ≤99 lines, `node --check` clean.

**Files:** `scripts/extract-illusion-alpha.mjs` (new), `public/cube-illusion/alpha/alpha-vectors.json` (new, committed)

**Verify:**
- `node scripts/extract-illusion-alpha.mjs --from ~/.hermes/cache/scratch/mp/illusioncube.splinecode` prints per shape `name x pts` — child order `Shape 0 1160.29 30`, `Shape 1 863.562 12`, `Shape 1 941.335 24`, `Shape 2 576.473 36`, `Shape 3 326.141 18`, `Shape 4 0.854355 30` (matches today's probe of `mp_scene.json`).
- A second run with `--check` exits 0; `python3 -c "import json;json.load(open('public/cube-illusion/alpha/alpha-vectors.json'))"` exits 0.
- Raster proof: build an SVG from the JSON (per shape: `M p0 C cn_i cp_i+1 p_i+1 …` closed; group at the decoded x, y-flipped once, scaled to ~1200 px wide), screenshot it with headless Chrome, and before attaching confirm it reads **ALPHA** upright with width:height ≈ 6.3:1 — if it reads mirrored or upside-down, the flip in the *proof*, not the JSON, is wrong; the JSON stays byte-exact to the payload. Store under `.hermes/tmp/illusion-parity/rev-alpha/`.

### Task 3: Before/truth evidence captures

**Objective:** Freeze the "before" set every revision claim will be diffed against, at the reference's own frame so vision comparisons compare content, not framing. Same recipe as phase 6/7 of the recreation plan — `prototype/gems/illusion-probe.mjs` (or scratch copy of `gem-shot.mjs`) against the agent's server on :5174, `--size 1600x1200 --scale 1`, clip `.cube-stage__frame`, `--at 0,8`, plus two isolation evals (hide the shell → inners; hide the inners → hollow shell) and one text eval (`JSON.stringify({alpha:..., sub:..., blurb:...})` reading the three overlay meshes' world positions). Also write the hero crop sheet: `hero-assembled.png` cropped to the specimen (`[600,440,1030,840]`) beside the same crop of the pass-0 composite, into `rev-pass-0/sheet.png` (PIL; the crop rectangles are the ones already used in this conversation). Start the dev server if down (`npm run dev` on 5174; never touch 5173).

**Files:** `.hermes/tmp/illusion-parity/rev-pass-0/` (f00/f08, iso-shell-hidden, iso-inner-hidden, sheet.png — all untracked)

**Verify:** every PNG non-blank; probe JSON reports `consoleErrors: []` and `three:160`; the sheet shows the current mismatchs verbatim (static grain, floating base, pale prism pane, flat canvas ALPHA mid-face, no microcopy visible).

---

## Phase 2 — One floor, grounded {#phase-2}

*Tags: Layout*

*The user's read is correct and the fix is structural: three ground-ish layers (grid plane y −199.45, prism pane y 0.72, glow child) become ONE mesh whose top surface the assembly stands on. The light streak is not deleted from the design — it is absorbed into the floor material so the quad edge can never read as a "pane" again.*

| # | Task | Done when |
|---|------|-----------|
| 4 | `illusion-floor.js` rebuilt — single mesh at y 0, wash absorbed | one mesh, grid + soft wash in one material, band eval recorded |
| 5 | Retire the separate panes (glow child + `illusion-prism.js`) | grep 0 importers; `?graybox=1` clean; stash checkpoint recorded |
| 6 | Grounding proof — the setup sits | contact shadow under the base; no gap in the silhouette capture; sit landmarks recorded |

### Task 4: `illusion-floor.js` — the one floor the setup sits on

**Objective:** Today: `PlaneGeometry(10000²)` at `y −199.453741` (grid) **plus** a 760² glow child plane (phase 7) **plus** `illusion-prism.js`'s 921×1082 streak pane at `y 0.7191718729590956` — the "floor + light pane" the user counts. Rebuild as ONE mesh:

- Plane 10000² at **y 0** (the assembly's own base plane — `Base` spans y 0→45, so the plinth stands directly on it; the base's 4-unit bottom bevel supplies the contact read). `rotation.x = -Math.PI/2`, `receiveShadow = true`.
- Keep the decoded grid: 512² `CanvasTexture`, `rgba(0,62,255,0.3)` lines ~5 px on transparent, `RepeatWrapping`, `repeat.set(50,50)` (one 200-u cell = the cube footprint). Keep `MeshPhongMaterial({ map, transparent:true, depthWrite:false, shininess:10 })` so the three point lights pool on it as decoded.
- **Absorb the streak** via `onBeforeCompile`: inject one term into the fragment's emissive stage — a soft blue-white wash at the old prism's world footprint: object-space vector gradient with the decoded constants (origin x 143.9266, direction (1,0,0), near 11.3091, far 214.4368) recentred on the floor (centre `(−194.01, −8.39)`, span 921.25×1082.09, quad rotated with the plane), colour from `--primitive-illusion-grid`-family tokens, strength ≈0.30 with `uWash` live. The mask must fade to zero before the old quad's edges so **no quad boundary ever shows** — that is the acceptance. The wash idle: drive `uWash` softly from the decoded `PRISM` osc (0→1 over 8000 ms pingpong, `TL.PRISM.ms`) so the floor keeps its decoded aliveness.
- Fog stays (`scene.fog`), but the band must be re-measured: run the existing math at 1600×1200 (`ILLUSION_FLOOR.band`) against a capture and record the new `[yStart, yFull]`; keep the decoded near/far unless the horizon reads wrong — any change is a recorded deviation, not a silent tune.
- Export map becomes `ILLUSION_FLOOR.build(scene) → { plane, wash() }` and `.band(camera, w, h)`; the old `glow` child is deleted.

**Files:** `src/components/IllusionCube/illusion-floor.js` (rewritten, ≤99), `src/components/IllusionCube/illusion-gl.js` (only if a chunk is missing)

**Verify:** eval `(()=>{const r=window.ILLUSION_STAGE.rig();let n=0;r.scene.traverse(o=>{if(o.isMesh&&o.position&&o.position.y<46&&o.position.y>-300)n++;});return JSON.stringify({under46:n, floorY:r.floor.plane.position.y})})()` → `under46` counts only the base + inners (floor at y 0 counts 1) — read the log, record the number; capture at 1600×1200 shows the plinth resting on the grid with its contact shadow and **no** pale pane; `?graybox=1` still hides the floor; `npm run lint:tokens` green.

### Task 5: Retire `illusion-prism.js` and the glow child

**Objective:** The unification is only real when the separate objects are gone. Remove `ILLUSION_PRISM.build` from `illusion-stage.js`, the `<script src="…/illusion-prism.js">` line from `cube-illusion.html`, and replace `ILLUSION_MOTION.prismStep` (which writes `rig.prism.material.uniforms.uRot`) with `floorStep` writing `rig.floor.plane.material.userData.uWash` from the same `TL.PRISM` table. Update `docs/illusioncube-material-parity.md`'s Prism row to point at the floor wash. Then delete the file under the repo's deletion protocol: `grep -rn "ILLUSION_PRISM\|illusion-prism" src cube-illusion.html prototype scripts` → 0 hits; `git stash` checkpoint BEFORE the delete; `npm run build` + specimen capture green after; if anything regresses, restore from the stash instead of patching forward.

**Files:** `src/components/IllusionCube/illusion-prism.js` (deleted), `illusion-stage.js`, `illusion-motion.js`, `cube-illusion.html`, `docs/illusioncube-material-parity.md`

**Verify:** the grep above returns nothing; `node --check` on every touched file; `?graybox=1` and default captures identical to Task 4's acceptance; console clean; `git stash list` shows the checkpoint (keep it until phase 6 closes).

### Task 6: Grounding proof — the setup sits

**Objective:** Prove "not elevated" with measurements, not vibes. At 1600×1200 on :5174: project the base's bottom corners through the camera and sample the capture just below the plinth's silhouette — the floor grid line directly under the plinth must be occluded by the base (contact), and the key light's shadow must anchor at the footprint (the decoded key at `(966.41, 529.27, 254.88)` throwing toward the origin already streaks left-up; at y 0 it now lands AT the base instead of 199 u below). Record the sit landmarks (plinth bottom-left corner px, shadow extent) in the phase log beside the hero's own (`footer y ≈ 803 px @1600×1200`).

**Files:** `.hermes/tmp/illusion-parity/rev-floor/` (captures + `sit.json`)

**Verify:** capture shows base-on-grid contact (no background pixels between the plinth's bottom edge and the first grid line beneath it along the base's centre column — sample 5 columns, report run lengths); shadow anchored at footprint; self-check against the hero crop (grounded, `footer ≈ 803 px`); no console errors; `npm test` green.

---

## Phase 3 — Morphing goo with intrinsic glow {#phase-3}

*Tags: Component, Motion*

*The four inners stop being chamfer boxes with a wobble shader and become what the user described: amorphous glowing masses that morph — the thing the frost exists to soften. The decoded choreography (positions, rotations, scale envelopes, delays) does not move a millimetre; only the geometry and material change.*

| # | Task | Done when |
|---|------|-----------|
| 7 | `illusion-form.js` gains `blob(r, detail)` — analytic radial normals | eval: sphere-derived bbox, radial normals, ≤99 lines; bodies build 4 blobs r 60.043 |
| 8 | `illusion-inner.js` morph rewrite | fbm domain-warp morph; 0/8/16 s captures visibly different shapes; `touch()` API unchanged |
| 9 | Intrinsic glow — emissive core + halo + pulse | isolation capture shows coloured orb glow; bleed lights hue-matched |
| 10 | Goo verification | decoded bbox trajectory ±3 u; shell-hidden sheet; perf/no-NaN/gates |

### Task 7: `illusion-form.js` — `blob(r, detail)` with analytic normals

**Objective:** The family rule from `cube-form.js` carries: **no welding, no `computeVertexNormals`** — vertex displacement rides the analytic radial normal (`normalize(position)`) so the morph can never facet. Add to `illusion-form.js`: `blob(r, detail)` → `SphereGeometry(r, 48, 32)`-class smooth base (the only smoothing any rig file may use is the sphere's own normals; document that in the header). `ILLUSION_BODIES.build()` swaps `chamferBox(D.CUBE…)` for `blob(60.0428, …)` on the four inners — r = half of the decoded 120.0856 side so the mass and bbox envelope match what the choreography was tuned against; decoded positions/rotations/scales untouched; `castShadow`/`receiveShadow` stay true (a glowing goo still needs to ground the assembly's shadow story).

**Files:** `src/components/IllusionCube/illusion-form.js`, `illusion-bodies.js`

**Verify:** eval `new THREE.Box3().setFromObject(rig.bodies.cubes[0])` → bbox within ±1 % of `±60.04` cube-equivalent at rest; `grep -c computeVertexNormals src/components/IllusionCube/illusion-form.js` is 0; `node --check` + `wc -l` ≤99 both files; capture shows four smooth masses inside the shell region (isolation).

### Task 8: `illusion-inner.js` — the morph shader

**Objective:** Replace the sine wobble (`sin(position.x*1.7+uTime*1.3…`) with a real morph: two fbm fields over a domain-warped position — `warpPos(position*uFreq + t*uDrift, t*uWarp)` from `ILLUSION_GL` (family-shared chunks; never re-declare noise) — one big lobe morph (`amp ≈ 0.22·r`, slow) plus a small ripple (`amp ≈ 0.05·r`); displacement still strictly `p += radialNormal * d`, normals stay analytic. Keep the interface frozen: `materialFor(i)` per-blob `uSeed/uColA/uColB/uGlow`, `material()`, `touch(mats,t)` unchanged so `illusion-dress.step` and `ILLUSION_INNER.touch` keep driving it with zero edits. Visibly *morphing* (lobes form/dissolve) rather than vibrating is the acceptance — judge on three clock states.

**Files:** `src/components/IllusionCube/illusion-inner.js` (≤99; extract to `illusion-gl.js` if the shader overflows)

**Verify:** probe captures at clock 0/8/16 with the shell hidden — the three silhouettes differ in shape (not just phase-shifted noise); no `NaN` in the eval'd mesh positions; per-frame allocation stays zero (`touch` writes scalars only); `node --check`, `wc -l` ≤99.

### Task 9: Intrinsic glow — orb core, halo, pulse

**Objective:** The glow is the payload of the frost interaction ("the intrinsic glowing orb like effect from the gooey object is causing on the cube body"). Three pieces: (a) fragment emissive core — fresnel-weighted radial glow inside the blob (`col += uGlow * (core + rim)`, hue ramp A→B by warp value, `toneMapped = false` + `#include <colorspace_fragment>`); (b) one additive halo sprite per blob (small `Sprite` or radial-canvas plane, `renderOrder 1`, `depthWrite false`, hue = blob's) parked at the blob's centre and scaled with it each frame in `cubesStep`'s write path (no new allocation); (c) a gentle pulse — `uGlow` scaled by `0.85 + 0.15·sin(t·0.6 + seed)` computed inside the existing steppers. Re-anchor the three phase-7 bleed point lights (`illusion-lights.js`, currently parked at the spread homes) to the blob centres so floor bleed follows the goo, and hue-check them against the blob hues.

**Files:** `illusion-inner.js`, `illusion-bodies.js` (halo attach), `illusion-motion.js` (pulse + halo pose), `illusion-lights.js` (bleed anchor)

**Verify:** shell-hidden capture at 1600×1200 shows four distinct token-hued glowing masses (sapphire/citrine/amethyst/rose per `HUES`) whose halos read as soft orbs; floor now shows matching tint pools near the base; eval confirms halo positions == blob world positions ±0.5 u at both clock ends; `lint:tokens` green (all colours via tokens).

### Task 10: Goo verification — trajectory, isolation, gates

**Objective:** The morph must not have moved the choreography. Sample `cubes[i].getWorldPosition` (or the existing motion probe) at t = 2.9/8.5/12.9/16.9 as Phase 4's Task 26 did and diff against the decoded table — tolerance ±3 u, ±2°; then the isolation sheet (shell hidden, f08) beside the phase-1 baseline's `iso-shell-hidden` so the before/after goo change is visible in one image; perf sanity (600-frame probe, heap growth under 4 MB, `rafP95` recorded).

**Files:** `.hermes/tmp/illusion-parity/rev-goo/` (captures + `traj.json`)

**Verify:** trajectory diff inside tolerance; console clean; no NaN; `npm test` green; sheet attached in the phase report.

---

## Phase 4 — The frosted body {#phase-4}

*Tags: Component, Design System*

*Frosting the body is not a material tweak — it is a render step. A half-res render target of everything behind the shell (goo, floor, sky), gaussian-blurred, sampled by the shell as its transmission term: the interior stops being visible shapes and becomes soft glowing colour — which is exactly the "enhance the frost effect" the user described. The grain comes down, the metal goes in, the fake mesh-gradient drift comes out.*

| # | Task | Done when |
|---|------|-----------|
| 11 | `illusion-frost.js` — half-res backdrop blur pass | module ≤99; wired in the mount loop + still path; on/off texture swap works |
| 12 | `illusion-shell.js` revision — grain down, frost in, metal on | speckle metric ≤ hero×1.5; interior reads as blurred glow; metal lobe present |
| 13 | Frost proof — on/off diff, gates, perf | uBackdropMix 0↔1 diff proves obscuring; reduced-motion still frosted; p95 within budget |

### Task 11: `illusion-frost.js` — the backdrop blur

**Objective:** New module owning the render step, classic-script IIFE → `window.ILLUSION_FROST`:

- `attach(rig, renderer)`: two `WebGLRenderTarget` at 0.5× drawing-buffer size (`HalfFloatType` not needed — LDR), a fullscreen ortho quad + `ShaderMaterial` with a 9-tap separable gaussian (two passes: H rtA→rtB, V rtB→rtA; radius ×1 at half-res ≈ 2 px full-res); recreate targets on resize (`rig.resize` seam).
- `update(rig)`: skip when `!rig.vis || document.hidden`; set `bodies.main.visible = false`, `overlay.visible = false`; render scene→rtA; blur; restore visibility; write `shell.material.uniforms.uBackdrop.value = rtA.texture` and `uScr.value.set(drawingBufferWidth, drawingBufferHeight)` (mutate in place — zero allocation).
- Called from `illusion3d.js`'s loop just before `renderer.render(scene,camera)`, and **once** in the reduced-motion still branch before its single render, so the still frame ships frosted too.
- The shell's own mesh must be invisible during capture — it is the thing being frosted; the overlay texts sit in front of the body and must not smear into the frost (they are drawn in the final pass only).

**Files:** `src/components/IllusionCube/illusion-frost.js` (new, ≤99), `illusion3d.js` (loop + still wiring), `cube-illusion.html` (script tag after `illusion-gl.js`, before `illusion-shell.js`)

**Verify:** eval `window.ILLUSION_FROST && !!window.ILLUSION_FROST.attach` true; with `uBackdropMix=0` vs `1` (two captures) the body region diff is large and confined to the body — proving the pass feeds pixels; `rig.frames` advances; no console errors; with `prefers-reduced-motion` emulated the single frame's body shows frosted colour; offscreen pause untouched.

### Task 12: `illusion-shell.js` — grain down, real frost, subtle metal

**Objective:** Three changes in one revision, judged against `hero-assembled.png` and the phase-1 crop sheet:

1. **Grain down.** Today `uFrost 1.4` perturbs the normal per-pixel from fbm and the ramp samples create salt-and-pepper static. Drop the perturbation to ≈0.2–0.3, lower the fbm contrast and frequency (large soft waves only), and remove the per-pixel matUV jitter (`(vec2(f1,f2)-0.5)*uFrost*0.6` term) — the surface must read as smooth frosted glass.
2. **Frost transmission.** New uniforms `uBackdrop` (sampler2D), `uScr` (vec2), `uRefr` (float), `uBackdropMix` (0..1, the on/off proof handle). Sample `texture2D(uBackdrop, gl_FragCoord.xy/uScr + N.xy*uRefr)` and mix it into the stack as the transmission term (mostly centre, modulated by the fresnel so edges stay reflective): the interior is only ever *blurred colour* — shapes can no longer be read. The **ramp4 drift (the standalone "mesh gradient") is removed**: the body's colour motion is the goo's glow moving through this term, exactly the user's correction.
3. **Subtle metal.** Add one restrained metal lobe: a wide Blinn term on the perturbed normal with cool tint and low gain (plus a faint anisotropic streak along the body's vertical axis), sitting on top of the decoded sheen/matcap stack — "subtle" is judged by the phase-4 capture against the hero: sheen readable on the top perimeter and nearest vertical edge, never chrome.

Keep every motion-facing uniform (`uTime uMoveA uMoveB uScaleA uScaleB uAlphaA uAlphaB uMatRot uOpacity uFrost uMilky`) — `mainStep` keeps writing them; they now drive the frost's slow micro-shimmer instead of static. Keep `transparent: true, depthWrite: false, FrontSide, renderOrder 4`, `toneMapped = false`, `#include <colorspace_fragment>`.

**Files:** `src/components/IllusionCube/illusion-shell.js` (≤99 — extract to `illusion-gloss.js` if it overflows, mirroring the matcap-extraction precedent)

**Verify:** grain metric — mean |neighbour difference| over a 3×3 patch grid on the body region ≤ 1.5× the same metric on the hero at matched size (report both numbers); on/off diff from Task 11 shows interior obscuring; capture shows soft glowing colour through the body (no readable shapes), subtle metal highlight; `grep -c transmission` remains 0; `node --check`, `wc -l` ≤99; `lint:tokens` green.

### Task 13: Frost proof — the phase acceptance

**Objective:** Close the phase on evidence: the on/off pair (uBackdropMix 0/1), the grain table, the reduced-motion still, the perf pass (rAF p50/p95, longtasks, heap, zero console errors — compare against Task 39's phase-6 numbers), and the `?graybox=1` regression check. Write the numbers into the phase log under `.hermes/tmp/illusion-parity/rev-frost/` and attach the composite beside the hero crop.

**Files:** `.hermes/tmp/illusion-parity/rev-frost/` (captures + `frost.json`)

**Verify:** all four proofs present; uBackdropMix 0 capture ≈ phase-1 baseline (sanity that nothing else moved); p95 within the recorded budget; `npm test` green; zero console errors; still-mode capture frosted.

---

## Phase 5 — Vector wordmark + decoded text anchors {#phase-5}

*Tags: Component, Layout*

*The three text objects go where the model put them and the wordmark becomes the model's own vectors. The discovery that anchors the whole phase: all three blocks are center-anchored with widths whose left edges land flush at x −73.0 (ALPHA's own edge) — the recreation's centered-at-0 canvas planes were the entire "misplaced" complaint.*

| # | Task | Done when |
|---|------|-----------|
| 14 | Bundle Inter 600 + Azeret Mono 500 | woff2s committed under `public/fonts/`; FontFace load + repaint works; no console noise |
| 15 | `illusion-logo.js` — the six vector shapes | wordmark builds from `alpha-vectors.json`; reads ALPHA at 51.44 u pitch; fallback intact |
| 16 | Overlay placement — decoded transforms for all three texts | ALPHA/body, subtext on the base band, blurb at (−30.585, 110.03, 98.665); left edges flush at −73 by eval |
| 17 | Text proof — crops vs hero, reveal intact | side-by-side crop sheet; blurb reveal chain still lands; frost interplay clean |

### Task 14: Bundle the scene's own fonts

**Objective:** The payload's `shared.fonts` names the fonts the text objects use: `Inter_600` and `Azeret Mono_500` (gstatic URLs). The material-parity doc recorded "system mono stands in for Azeret Mono (needs a font-file follow-up)" — close it: download both woff2s into `public/fonts/` (`inter-600.woff2`, `azeret-mono-500.woff2`; commit), load them via `FontFace` in `illusion-overlay.js` before canvas paint, and keep the existing `document.fonts.ready` repaint tick. Names/paths space-free.

**Files:** `public/fonts/inter-600.woff2`, `public/fonts/azeret-mono-500.woff2` (new), `illusion-overlay.js`

**Verify:** in the console `document.fonts.check('600 24px Inter')` and `document.fonts.check('500 24px "Azeret Mono"')` both true after load; subtext capture is crisp mono (no fallback face — compare a crop against the hero's microcopy); zero 404s.

### Task 15: `illusion-logo.js` — the wordmark from the scene's vectors

**Objective:** New module that turns `alpha-vectors.json` into the real wordmark: per shape build a `THREE.Shape` (for each point `p[i]`: `lineTo/bezierCurveTo` using `cn[i]` → `cp[i+1]` control positions; closed; `evenOdd` fill for the letter holes) → flat `ShapeGeometry` (decoded depth 0, bevel 0) → mesh at `x = shape.x` in the group; group at the decoded anchor `(−73, 75.39, 101.094)`, `scale 0.04434` (x and y — reproduce the positive y scale verbatim with the point data as decoded; the build's first capture against the hero is the orientation check — uppercased, upright ALPHA). Material: the decoded Logo stack as a small `ShaderMaterial` — `photo` matcap sample ×0.6 (rotation 0) + white wash ×0.9 (the decoded `alphaOverride`) + phong lift ×0.6, `transparent: true, depthWrite: false`, `renderOrder 5`, `toneMapped=false` + `#include <colorspace_fragment>`. Fetch the JSON at boot; **404 → keep the current canvas-glyph planes as the fallback** (degrades, never throws). Delete the five canvas-letter planes from `illusion-overlay.js` (`api.alpha` stays only as the fallback painter).

**Files:** `src/components/IllusionCube/illusion-logo.js` (new, ≤99), `illusion-overlay.js`, `cube-illusion.html` (script tag after `illusion-textures.js`)

**Verify:** capture at 1600×1200 — the wordmark sits lower-left on the body just above the base band (hero comparison crop), reads ALPHA, letterforms are the payload's (the H visibly built of its two decoded pieces, gap ≈0.93 u unreadable at scale); eval: wordmark bbox ≈ x −73.0 → −9.3, y 65.3 → 75.4 (world) ±0.5; no new console warnings; `node --check`, `wc -l` ≤99.

### Task 16: `illusion-overlay.js` — decoded transforms for all three texts

**Objective:** One placement table, decoded, no eyeballing:

| Text | pos (verbatim) | anchor | notes |
|---|---|---|---|
| ALPHA | (−73, 75.39, 101.094) | left flush x −73 | the `ILLUSION_LOGO` group (Task 15) |
| Subtext | (−4.67042297636263, 18.733398437500014, 101.0939895519962) | center → left edge −73.0 | base band, Azeret Mono 500 / 9 |
| Blurb | (−30.58474375808499, 110.03010329138462, 98.66477613230134) | center → left edge −73.0 | Inter 600 / 15, two lines |

Keep the `uAlpha` uniform contract bit-for-bit (`ILLUSION_CHAIN` reads/writes `mesh.material.uniforms.uAlpha` and `position.z` with `BZ0 98.6648 / BZ1 101.1018` — both already decoded; the blurb's mesh now *starts* at its decoded 98.6648, which is where the chain resets it anyway). Canvas planes for subtext/blurb keep their `PlaneGeometry` sizing but are re-derived from the geometry metrics (subtext 136.66 × 14.53, blurb 84.83 × 47.88) so the drawn text is proportional to the decoded boxes. Repaint with the Task-14 fonts. Subtext keeps its decoded ink (`glyph-ink` α0.6) and matcap sheen.

**Files:** `src/components/IllusionCube/illusion-overlay.js` (≤99)

**Verify:** eval returns the three meshes' world positions equal to the table above (±0.001); the three left edges land at −73.0 ±0.05 (project each block's left anchor through the camera and print px); capture vs hero crop: ALPHA lower-left above the band ✓, microcopy ON the base band flush-left ✓, blurb on the body at reveal ✓; blurb still invisible at rest (`uAlpha 0`).

### Task 17: Text proof — crops vs hero + reveal integrity

**Objective:** Judge the three texts as pixels, since that is the user's currency: crop the hero's specimen (`[600,440,1030,840]`) and the same region of the new composite into one two-up sheet; run the click series once (`illusion-probe.mjs --click`, samples of blurb `uAlpha`/`z` at +2/6/10/12 s) to prove the reveal chain survived the move; run the reduced-motion still once; verify the frost pass does not ghost the texts (they render after the frost capture — a text-shaped smear behind the body would show in the on/off diff from Task 13; re-check that diff region).

**Files:** `.hermes/tmp/illusion-parity/rev-text/sheet.png`, `click.json`, `still.png`

**Verify:** sheet shows the two placements agreeing (letters flush-left above the band; microcopy on the band); click series hits `uAlpha≈0` until ≈9 s, ≈1 by 12.2 s, z monotone 98.66→101.10; still frame shows all three texts; zero console errors.

---

## Phase 6 — Composite proof + close-out {#phase-6}

*Tags: Tooling*

*Close the revision the way this repo closes: every user bullet mapped to an artifact, gates green, phases stamped, nothing pushed.*

| # | Task | Done when |
|---|------|-----------|
| 18 | Composite proof + the nine-bullet acceptance table | sheet + table in the phase log; every row carries an artifact |
| 19 | Gates — lint, names, track, tests, build, graph | all green; 0 wip after commits |
| 20 | Close-out conventions | ✓ done marks, shipped lines, trailers, manifest refreshed |

### Task 18: Composite proof + acceptance table

**Objective:** One final composite at 1600×1200 beside the hero, one hero-crop sheet, and the acceptance table: nine rows (the feedback bullets), each with verdict + artifact path (`rev-pass-0` for "before", `rev-*` for "after") — including the two numeric proofs (grain metric, sit landmarks) and the one on/off proof (uBackdropMix). Any row that cannot be evidenced is written as `known gap` with its measurement — never blank.

**Files:** `.hermes/tmp/illusion-parity/rev-final/` (sheet + table), phase log entry

**Verify:** every row non-empty; the numeric rows carry both measurements; the sheet attached in the report.

### Task 19: Gates

**Objective:** `npm run lint:tokens` (0 raw leaks), `npm run plan:names`, `npm run ds:track` (0 wip after the task commits; `cont 20260909_145218_9888b1`), `npm test` (lint + build + the illusion-timeline suite), `node scripts/map-graph.mjs` (new files appear on `docs/graph.mmd`, no orphans/cycles), `wc -l` ≤99 on every new/modified module, and a `grep -rn "0x" src/components/IllusionCube/*.js` spot-read to confirm fallbacks only.

**Files:** `docs/graph.mmd` (regenerated, never hand-edited)

**Verify:** all commands green; graph diff shows only the regeneration + the new module edges.

### Task 20: Close-out conventions

**Objective:** Per house law: append `✓ done` to every Task heading that shipped, add `*Shipped in <sha> · Tasks a–b · phase-N.*` under each phase heading (short sha from `git rev-parse --short HEAD`, anchor spelled as the heading carries it), trailer `[plan:2026-09-29_135509-illusion-cube-surface-revision.md#{#phase-N}]` on each commit **subject** line, refresh `design-system/changelog-manifest.json` via `ds-track` (discard timestamp-only diffs with `git checkout --`), and keep the Task-5 stash until the changelog card reads complete, then drop it deliberately. No push: report what *would* push and stop — the user opens `:5174/cube-illusion.html` in Safari and judges.

**Files:** this plan file, `.hermes/plan-links.json` (only if a commit lands on non-DS paths), `design-system/changelog-manifest.json`

**Verify:** `npm run ds:track` → every new sha linked, 0 wip; the changelog card shows all six phases with badges; `npm test` green; `git status --short` clean apart from untracked `.hermes/tmp/`; the final report lists commits + the Safari line.

---
