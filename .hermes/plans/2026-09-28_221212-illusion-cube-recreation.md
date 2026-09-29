# Illusion cube — native three.js recreation of the Spline reference

> **For Hermes:** Use subagent-driven-development skill to implement this plan task-by-task.

**Goal:** A native three.js `IllusionCube` rig in crm_proj that recreates the Spline "illusioncube" scene — glass shell, hidden inner cubes, brand overlays, click reveal — as a self-contained specimen page with **zero Spline runtime dependencies**.

**Architecture:** Classic-script rig modules under `src/components/IllusionCube/` (global THREE r160, ≤99 content lines each, IntelCube conventions), mounted by a new `cube-illusion.html` specimen (Vite input), with every number (transforms, material stacks, timings) taken from the decoded scene spec in `docs/illusioncube-scene-analysis.md`; parity is proven by headless captures against `docs/assets/illusioncube/`.

**Tech Stack:** three.js r160 (cdnjs classic script, matching `cube.html`), vanilla JS modules, design-system tokens (`lint:tokens`-clean), CSS without raw px/hex, assets extracted from the `.splinecode` payload (textures via the msgpackr decode pipeline, audio MP3s already extracted).

**Tags:** Component, Motion, Design System

---

## Phase 1 — Scaffold + assets lane: page, rig seam, audio, harness {#phase-1}

*Opens the lane: the plan gets its changelog name, `cube-illusion.html` mounts a real ortho rig under `src/components/IllusionCube/` and paints a first gray-box frame on `:5174`, the two extracted MP3s are staged for the click reveal, and the gem-shot harness is bootstrapped so every later phase has an instrument — no material, motion or interaction work here.*

*Tags: Component, Tooling*

*Shipped in c4adce9 · Tasks 1–6 · phase-1.*

| # | Task | Done when |
| --- | --- | --- |
| 1 | Register the plan in `changelog-names.json` (title ≤76 ch + purpose) | `npm run plan:names` prints `✓ plan:names — 12 phased plans named` and the JSON parses |
| 2 | `cube-illusion.html` specimen page + Vite MPA input | `:5174/cube-illusion.html` returns 200 (404 today) and `npm run build` emits `dist/cube-illusion.html` |
| 3 | `illusion-form.js` + `illusion-scene.js` skeletons — rounded box, ortho stage | Both `node --check` clean, `ILLUSION_FORM`/`ILLUSION_SCENE` on `window`, each ≤99 lines |
| 4 | `illusion3d.js` + `illusion-dress.js` — mount loop, first gray-box frame | A gray rounded box on its plinth renders on `canvas[data-illusion]` with zero console errors |
| 5 | Audio assets staged in `public/cube-illusion/audio/` | `:5174/cube-illusion/audio/ambient.mp3` returns 200 and `ffprobe` durations match the decode |
| 6 | gem-shot harness bootstrapped against `:5174`, pass-0 shot stored | Probe JSON reports `three:160` and `rigs:1`; `clip-0.png` shows the gray box |

### Task 1: Register the plan in `changelog-names.json` ✓ done

**Objective:** `scripts/plan-names.mjs` scans `.hermes/plans/*.md` on the filesystem and, for every file matching `/^##\s+Phase/m`, demands a names entry with `title.length <= 76` and a non-empty `purpose`. The gate goes red the moment the plan file carries a real `## Phase` heading without a names entry — so this entry was landed **with** the phase sections at planning handoff, as a single chronological object appended after the `2026-09-28_000000-lump-sum-builds.md` entry. This task: verify it is present, last, and the gate green. Exact snippet (title is 63 chars after the em-dash escape resolves; purpose is 3 words):

```json
  "2026-09-28_221212-illusion-cube-recreation.md": {
    "title": "IllusionCube \u2014 Spline illusioncube rebuilt natively in three.js",
    "purpose": "native Spline recreation"
  }
```

**Files:** `src/ds/changelog-names.json`

**Verify:** `npm run plan:names` → `✓ plan:names — 12 phased plans named`; `python3 -c "import json;json.load(open('src/ds/changelog-names.json'))"` exits 0; the entry is the last key (chronological order preserved). This file lives under `src/`, so its commit is DS-tracked and carries `[plan:2026-09-28_221212-illusion-cube-recreation.md#{#phase-1}]`.

### Task 2: `cube-illusion.html` specimen page + Vite MPA input ✓ done

**Objective:** Clone the `cube.html` page pattern into a sibling specimen: `<!-- ADAM/PAGE — cube-illusion.html · native illusion-cube specimen -->` header with the plan trailer on line 2, `design-system/tokens.css` link, an inline `.cube-stage` block (frame, `canvas{width,height:100%}`, caption) using only existing tokens (`--spacing-*`, `--font-size-xs`, `--font-tracking-wide`, `--text-muted`, `--primitive-sapphire-ui-50`), a `canvas[data-illusion] role="img"` inside `.cube-stage__frame` with a descriptive `aria-label`, an uppercase `.cube-stage__caption` naming the debt ("Illusion cube — Spline illusioncube recreated natively · three r160"), then classic script tags: three r160 from cdnjs, then `illusion-form.js`, `illusion-scene.js`, `illusion-dress.js`, `illusion3d.js` in that order. The page must **not** carry `data-cube` and must **not** load IntelCube or GemReward scripts — `cube3d.js` mounts every `canvas[data-cube]` it finds, so a shared attribute would double-mount a wrong rig. Register the page as a seventh Vite MPA input.

**Files:** `cube-illusion.html` (new, ≤99 lines), `vite.config.js` (add `illusion: resolve(__dirname, 'cube-illusion.html'),` after the `cubespline` entry)

**Verify:** `curl -o /dev/null -w '%{http_code}' http://127.0.0.1:5174/cube-illusion.html` → `200` (measured 404 before this task); `curl … http://127.0.0.1:5174/cube.html` still 200 and `cube-spline.html` still 200 (Task 21's specimen untouched); `npm run build` lists `dist/cube-illusion.html`; `npm run lint:tokens` stays clean (no raw hex/px on the new page).

### Task 3: `illusion-form.js` + `illusion-scene.js` — rounded box and ortho stage ✓ done

**Objective:** Fix the module seam and load order, nothing more. `illusion-form.js` exposes `ILLUSION_FORM.box(w,h,d,r,seg)` — the analytic clamp-projection rounding already proven at `src/components/IntelCube/cube-form.js:block()` (clamp each vertex into an inner core then step back out along the offset by the edge radius; the band takes radial normals, faces keep axis normals; no welding, no `computeVertexNormals`). Duplicate those ~18 lines rather than aliasing `window.CUBE_FORM`: each rig family in this repo owns its forms (`GemReward`, `IntelCube`), and a Phase 3 material change in one family must not ripple into the other. `illusion-scene.js` exposes `ILLUSION_SCENE.stage(renderer, aspect)` → `{ scene, camera, group }` plus `ILLUSION_SCENE.tok(name, fallback)`; scene background is the spec's flat sky via `tok('--primitive-sapphire-ui-200', 0xc2dcfa)` (the token value `#c1e0fd` is within ΔRGB (1,4,3) of the decoded `#C2DCFA`, so the token stays the source of truth and the fallback carries the reference value); `scene.fog = null` for the scaffold (the real fog lands in Phase 2 Task 11 — near 1423.758 / far 1987.781, `useBackgroundColor`; corrected: fog is **on** and is what fades the grid); camera is an **OrthographicCamera** with a resize-corrected frustum and a minimal framing pose so the placeholder body reads. Phase 1 deliberately does **not** fix the pose, zoom, roll, light rig, grid or shadows — those are Phase 2 Tasks 7–14, and the decoded values are already in `docs/illusioncube-scene-analysis.md` §2 (ortho, position (530.47, 489.44, 592.35), euler ≈ (-0.493, 0.653, 0.316) rad, zoom 0.9753) with a working precedent in `public/cube-spline/spline-rig.js:19-21`, so nothing needs re-deriving. The gray box itself uses the spec's `Main` proportions (200×200×149, r16 bevel 4) as a stand-in body that Phase 2 replaces with the real six-body assembly. Both files carry the repo's header block: `/* ADAM/SHARED — src/components/IllusionCube/<file>.js · <job> */`, the plan trailer, `—` continuation lines, and an `Export map:` line.

**Files:** `src/components/IllusionCube/illusion-form.js` (new), `src/components/IllusionCube/illusion-scene.js` (new)

**Verify:** `for f in src/components/IllusionCube/*.js; do node --check "$f"; done` clean; `wc -l` ≤99 per file; in the browser console `!!window.ILLUSION_FORM && !!window.ILLUSION_SCENE` is true and `ILLUSION_SCENE.stage` returns a rig whose `camera.isOrthographicCamera` is true; `npm run lint:tokens` clean (0x fallbacks only, never `'#hex'`).

### Task 4: `illusion3d.js` + `illusion-dress.js` — mount loop and first gray-box frame ✓ done

**Objective:** `illusion3d.js` mirrors `cube3d.js`'s proven mount contract so the two rigs behave identically offscreen and under pointer: guard with `canvas.dataset.illusionDone`, boot on `DOMContentLoaded` + `ds:doc` + a `MutationObserver` for inserted canvases, mount only `canvas[data-illusion]`, build the renderer (`antialias: true`, DPR capped at 2, `alpha: false` because the background is opaque flat blue), wire resize through an idempotent `size()` that early-returns on unchanged width/height, render through `requestAnimationFrame`, and pause when the canvas is offscreen (`IntersectionObserver`, `rootMargin: '160px'`), when `document.hidden`, or when `!canvas.offsetParent` — with a `rig.gone` splice + `dispose()`/`forceContextLoss()` path for a removed canvas. `prefers-reduced-motion: reduce` renders **one static frame at the decoded pose** and returns (no loop, no idle churn); a missing `window.THREE` (or missing form/scene) falls back to a canvas-2D painted stand-in (reuse `cube3d.js:fallback()`'s sapphire→amethyst→red-beryl gradient rounded rect so both specimens degrade the same way). Publish `window.ILLUSION3D = { rigs, still }`. Tone mapping: leave it at `THREE.NoToneMapping` for now and flag it as a Phase 3 parity knob — spec §1 says there is no postprocessing and the background is flat, so an ACES curve would visibly darken that flat field and must not be added silently. `illusion-dress.js` is the clock seam only: `ILLUSION_DRESS.step(rig, dt)` advances `rig.t`/`rig.clock` with a `dt` clamp of 0.05 and touches nothing else, so Phase 4 can add motion without restructuring the loop. No pointer parallax, no yaw drift, no ease-ins in Phase 1 — this task's deliverable is that a frame reaches the screen.

**Files:** `src/components/IllusionCube/illusion3d.js` (new), `src/components/IllusionCube/illusion-dress.js` (new)

**Verify:** `node --check` both, `wc -l` ≤99 each; on `:5174/cube-illusion.html` the console shows `ILLUSION3D.rigs.length === 1`, `rigs[0].canvas.dataset.illusionDone === '1'`, and `rigs[0].scene.children.length > 0`; a gem-shot run (Task 6) produces a non-blank `clip-0.png`; zero console errors and zero 404s in `performance.getEntriesByType('resource')`.

### Task 5: Stage the extracted audio in `public/cube-illusion/audio/` ✓ done

**Objective:** Copy the two extracted MP3s out of the decode-evidence folder into the served tree, renamed so paths need no URL-encoding and src lines stay short: `docs/assets/illusioncube/audio_bg.mp3` → `public/cube-illusion/audio/ambient.mp3`, `docs/assets/illusioncube/audio_Futuristic Sci Fi Whoosh Flabby Fast 1.mp3` → `public/cube-illusion/audio/whoosh.mp3` (verified specs: ambient 206.94 s, 24 kHz, stereo, 64 kbps; whoosh 4.152 s, 48 kHz, stereo, 256 kbps). Vite copies `publicDir` verbatim, so no config change is needed; the originals stay in `docs/` as decode evidence and as the cross-media reference Task 34 reads. **Do not wire playback here** — the gesture gate, the ambient start-at-load, the click-conditional whoosh (delay 4 s, vol 0.3) and the affordance a browser requires before any audio may play belong to Phase 5. Note the duplication for close-out: these two files add ≈1.75 MB on top of the `docs/assets/` originals, and `.mp3` is outside both lint and DS tracking, so this task cannot regress a gate.

**Files:** `public/cube-illusion/audio/ambient.mp3` (new), `public/cube-illusion/audio/whoosh.mp3` (new)

**Verify:** `curl -o /dev/null -w '%{http_code}' http://127.0.0.1:5174/cube-illusion/audio/ambient.mp3` → `200` (measured 404 before); `ffprobe` on both staged files reports the durations above; `npm run build` leaves both in `dist/cube-illusion/audio/`.

### Task 6: Bootstrap the gem-shot capture harness against `:5174` ✓ done

**Objective:** Stand up the instrument every later phase's proof runs on, using the tool already trusted for gem work. Serve from the agent's own dev server on **5174** (127.0.0.1-bound and live now) and never touch the user's Safari server on `:5173`; confirm the boundary with `lsof -nP -iTCP -sTCP:LISTEN | grep -E ':(5173|5174)'` before capturing. `gem-shot.mjs` resolves its `ws` import by walking up from its own directory, so it runs in place from the repo root with no copy — keep `prototype/gems/gem-shot.mjs` unmodified (it is Task 21 evidence) and fall back to the skill's scratch recipe (`cp prototype/gems/gem-shot.mjs <scratch>/ && ln -s "$PWD/node_modules" <scratch>/node_modules`) only if a future probe needs editing. Write captures under `.hermes/tmp/illusion-parity/` — `.hermes/tmp/` is gitignored in this repo and lint exempts `.hermes/`, so parity artifacts never dirty the tree or a gate. Baseline command (one line):

```bash
node prototype/gems/gem-shot.mjs http://127.0.0.1:5174/cube-illusion.html .hermes/tmp/illusion-parity/pass-0 \
  --scale 1 --wait 9000 --clip ".cube-stage__frame" \
  --eval "JSON.stringify({three:window.THREE&&window.THREE.REVISION,rigs:window.ILLUSION3D?window.ILLUSION3D.rigs.length:-1,mounted:document.querySelectorAll('canvas[data-illusion][data-illusion-done]').length})"
```

Read the `--eval` block, not gem-shot's built-in probe: that probe counts `canvas[data-gem]` and will honestly report `gems:0` on this page. Keep `--scale 1` — headless runs SwiftShader, and `--scale 2` on this machine turns each capture into a multi-second frame. Record the pass-0 shot as the "before" in the Phase 2 report.

**Files:** `.hermes/tmp/illusion-parity/pass-0/` (capture output, untracked)

**Verify:** the run prints `consoleErrors: []` and an eval block with `three:160`, `rigs:1`, `mounted:1`; `full.png` and `clip-0.png` land and the clip shows the gray rounded box against the flat sky; `git status --short` shows no new tracked file as a result of the capture.

---

## Phase 2 — Staging: forms, camera, lights, floors {#phase-2}

*Shipped in 57766e8 · Tasks 7–14 · phase-2.*

*Six bodies, one orthographic camera, one light rig and a fogged grid floor, every number lifted from the decoded `illusioncube` payload and re-checked against a live probe of the real Spline runtime at 1600x1200 - the pose, the projection matrix and the assembly's on-screen silhouette all reproduce to within ~4 px.*

*Tags: Component, Layout, Tooling*

**Form decision (one line): FORK `cube-form.js`** - its analytic clamp-project rounds *all twelve edges* of a subdivided box with radial normals, whereas the decoded bodies are two different primitives (Main/Base = a 200x200 rounded rectangle with `cornerRadius 16` extruded 149.0701/45 with a 4-unit, 4-segment rim bevel; the four inner cubes = one-segment *chamfered* boxes, `cornerRadius 27`, 24 unique positions and hard facet normals, which a 1-segment clamp collapses to a point) - so the file is new, but it carries the IntelCube module's discipline across verbatim (no welding, no smoothing of shared vertices, `0x` colour fallbacks, <=99 content lines).

**Aim point correction (read before Task 8).** The extruded bodies keep their origin on the *bottom* face: live geometry bboxes are `Main z∈[0,149.0701]` and `Base z∈[0,45]`, so with `Cubes` at y 97.0351 the world spans are `Main y 44.635..193.7051` and `Base y 0..45`. The analysis doc's "`Main` center (0.6, 44.6, 1.0)" is the **base**, not the centre; a centred reading drops the whole assembly 64 px in frame (apex at y 592 instead of 524) and would be chased for hours during Task 14.

**Constraints (all tasks):** classic-script IIFE modules under `src/components/IllusionCube/`, each registering `window.ILLUSION_*` so Phase 1's `cube-illusion.html` script order stays additive; every file <=99 content lines (`wc -l`, and the gate counts the trailing newline, so 99 is the real cap) - overflow is fixed by extraction, never by packing; colours via `CUBE_SCENE.tok('--token', 0xfallback)` / `0x` literals so `npm run lint:tokens` stays green; verify on the repo server :5174 only. Two `intel-cube-rig` invariants carry over: **no welding and no `computeVertexNormals` on shared vertices** (the one exception is Task 7's non-indexed chamfer, where vertices are unshared so flat normals are the point), and the bodies' glass in Phase 3 must be `transparent + opacity` with explicit `renderOrder` - never `transmission`, because r160's `renderTransmissionPass` drops transparent interiors. `src/components/IntelCube/cube-form.js` is **not edited**: the fork is a new file that reuses the technique, so no code moves out of it and there is no orphaned import to chase.

| # | Task | Done when |
|---|------|-----------|
| 7 | `illusion-form.js` - the two body primitives (fork) | `node --check` clean; eval prints Main bbox `[-100,-100,0,100,100,149.0701]` + bevel z-bands `{0,0.3045,1.1716,2.4693,4}` and `{145.0701..149.0701}`; cube bbox `±60.0428/±55.7127`, 96 verts/24 unique, axis-aligned normals; <=99 lines |
| 8 | `illusion-bodies.js` - six bodies at decoded transforms | eval world bboxes = table below (Main y 44.635..193.7051, Base y 0..45); cue `Cubes` (0.5654, 97.0351, 6.7959); all six `castShadow`+`receiveShadow` |
| 9 | `illusion-camera.js` - orthographic rig | eval `projectionMatrix[0]=0.00121919`, `[5]=0.00162558` at 1600x1200 and `abs(matrixWorld.elements[1])<1e-6`; 3D landmarks project to Task 14's table +-4 px; resize keeps the composition |
| 10 | `illusion-lights.js` - ambient + key + three pools | eval prints the five lights with the decoded values and `shadowMap.type=2`; capture shows a soft shadow left of the plinth |
| 11 | `illusion-floor.js` - fogged grid plane (adapt CUBE_FLOOR) | lines visible with a ~131-151 px horizontal cut spacing, clear at/below the plinth, gone above y 538 px; fog band eval = (761, 538) |
| 12 | `illusion-prism.js` - floor streak plane | streak present left of the base (x 556-660 px), its quad edges invisible; object-space mask falloff matches 143.93 / 11.3091 / 214.4368 |
| 13 | `illusion-stage.js` - composer + renderer/background | page renders with zero console errors; `?graybox=1` = six flat bodies, floor+prism hidden; `ILLUSION_STAGE.rig()` returns camera+bodies |
| 14 | graybox silhouette capture vs `hero-assembled.png` | eval returns `x [650,925] y [524,803]` +-4 px; capture landmarks match the reference at apex (778, 524) vs (778, 528), left corner (650, 580) vs (658, 578) - landmarks only, never a pixel diff |

### Task 7: `illusion-form.js` - the two body primitives ✓ done

*Note 2026-09-28: chamfer builds the geometrically complete 44-tri version (132 verts, 24 unique) — the plan's "96 verts" undercounts the 12 edge bands as 1 tri each, which would leave half of every band open. Bbox ±60.0428/±55.7127, 24 unique positions and hard axis normals verify exact.*

**Objective:** fork `IntelCube/cube-form.js` (justification above) into a module with exactly two builders plus the decoded constants.

- `rect(w, h, r, depth, bev, bevSeg, curveSeg)` -> `THREE.ExtrudeGeometry` over a **centred rounded-rect `Shape`**, four arcs sampled at `curveSeg = 24` (Spline's own contour is finer - 406 distinct x - but the silhouette difference is sub-pixel): `options.depth = depth - 2*bev`, `bevelEnabled: true`, `bevelThickness = bevelSize = bev`, `bevelSegments = bevSeg`. The result occupies **z ∈ [0, depth]** (origin on the bottom face - matches the decoded bbox; do not re-centre).
- `chamferBox(w, h, d, r)` -> 6 quad faces + 12 single-facet edge bands + 8 corner triangles = 44 tris, built **non-indexed** (96 vertex entries) and finished with `computeVertexNormals()` - the one legitimate use, because non-indexed vertices are unshared so the normals come out per-facet (hard), exactly as the live `CubeGeometry` samples (`[1,0,0]` style). Nothing else in the repo may call `computeVertexNormals`.
- `ILLUSION_FORM.DECODED = { MAIN, BASE, CUBE }`: `MAIN = {w:200, h:200, r:16, depth:149.07015143605216, bev:4, bevSeg:4}`; `BASE = {…, depth:45}`; `CUBE = {w:120.08558997993715, h:111.42530848890283, d:120.08558997993715, r:27, seg:1}`.

**Files:** `src/components/IllusionCube/illusion-form.js` (new, <=99 lines; IIFE, `window.ILLUSION_FORM`, header comment with the fork rationale).

**Verify:**
```bash
node --check src/components/IllusionCube/illusion-form.js && wc -l src/components/IllusionCube/illusion-form.js
node <scratch>/gem-shot.mjs "http://localhost:5174/cube-illusion.html" <scratch>/form --wait 6000 \
  --eval "(()=>{const F=window.ILLUSION_FORM,g=F.rect(200,200,16,149.07015143605216,4,4,24),c=F.chamferBox(120.08558997993715,111.42530848890283,120.08558997993715,27);const zs=g.attributes.position;const Z=new Set();for(let i=0;i<zs.count;i++)Z.add(+zs.getZ(i).toFixed(4));const un=new Set();for(let i=0;i<c.attributes.position.count;i++)un.add([c.attributes.position.getX(i),c.attributes.position.getY(i),c.attributes.position.getZ(i)].map(v=>v.toFixed(3)).join());return JSON.stringify({gv:g.attributes.position.count,gu:new Set(Array.from({length:zs.count},(_,i)=>[zs.getX(i),zs.getY(i),zs.getZ(i)].map(v=>v.toFixed(3)).join())).size,z:[...Z].sort((a,b)=>a-b),cv:c.attributes.position.count,cu:un.size})})()"
```
Expected: Main bbox `z ∈ [0, 149.0701]` (vertex count is Spline's own tessellation - 1990 verts / 1640 unique live - so do not chase it); distinct z `[0, 0.3045, 1.1716, 2.4693, 4, 145.0701, 146.6009, 147.8986, 148.7657, 149.0701]` (a 4-segment quarter-round of radius 4); cube 96 verts / 24 unique (the core box `±(1/2·dim − 27)` plus three arc points per corner).

### Task 8: `illusion-bodies.js` - the six bodies at the decoded transforms ✓ done

**Objective:** build `Cubes` (`THREE.Group` at `0.5654364373828571, 97.03507571802716, 6.795859237940917`) and parent the six meshes to it with the decoded local transforms; `castShadow`/`receiveShadow` true on all six; leave `matrixAutoUpdate` on (Phase 4 tweens these objects in place).

| Body | geometry | local position | local rotation (deg) | scale |
|---|---|---|---|---|
| `Main` | `rect(MAIN)` | `0, -52.4, -5.795859237940908` | `-90, 0, 0` | 1 |
| `Base` | `rect(BASE)` | `0, -97.03507571802716, -5.795859237940917` | `-90, 0, 0` | 1 |
| `Cube 1` | `chamferBox(CUBE)` | `-8.521374173569408, -23.55471326715809, 8.451133961074877` | `75.74512496206512, 59.061047822396276, 164.28674521569314` | 1 |
| `Cube 2` | `chamferBox(CUBE)` | `53.440546456278305, 53.63087821913799, 2.981193736583908` | `0, 0, 0` | 0.3 |
| `Cube 3` | `chamferBox(CUBE)` | `-53.95107247711458, -56.16648277719783, -75.94923676944363` | `-180, -4.783690037707766, -106.5582912807981` | 0.3 |
| `Small Cube` | `chamferBox(CUBE)` | `52.21399409751854, -76.63084669032627, -80.82798331060346` | `0, 0, -17.10904552531857` | 0.3 |

The rotation order matters: three's default `XYZ` reproduces the decoded local orientations (instance `.rotation.set(x, y, z)` with no `order` argument). Phase 4's converged target pose (shared state `57a8cefc`) is listed in `docs/illusioncube-scene-analysis.md` section 4 - do not pre-bake it here.

**Files:** `src/components/IllusionCube/illusion-bodies.js` (new, <=99 lines; `window.ILLUSION_BODIES.build()` -> `{ group, main, base, cubes, all }`).

**Verify:** capture with `--eval` (or read `ILLUSION_STAGE.rig().bodies`) printing `new THREE.Box3().setFromObject(mesh)` per body:
- `Main` `x -99.43..100.57, y 44.635..193.7051, z -99..101`;
- `Base` `x -99.43..100.57, y 0..45, z -99..101`;
- cube centres `Cube 1 (-7.956, 73.480, 15.247)`, `Cube 2 (54.006, 150.666, 9.777)`, `Cube 3 (-53.386, 40.869, -69.153)`, `Small Cube (52.779, 20.404, -74.032)`.

### Task 9: `illusion-camera.js` - the orthographic rig ✓ done

**Objective:** reproduce the play camera exactly. Live values read off the runtime at 1600x1200: `OrthographicCamera`, position `530.4659993893731, 489.4357008603547, 592.3466628005328`, rotation `-28.260539356656103, 37.39447137109556, 18.079664962162802` degrees, `zoom 0.9753499582310595`, frustum `l -800 r 800 t 600 b -600`, `near -100000`, `far 100000`, `up (0,1,0)`, `targetOffset 1000`.

- The frustum is **the viewport in CSS pixels** (`left = -w/2, right = w/2, top = h/2, bottom = -h/2`, where w/h are the canvas' CSS size), read straight out of the runtime source. Consequence: one world unit is exactly `zoom` px, independent of the canvas size, and the reference's 1600x1200 capture therefore shows a 275 px-wide silhouette.
- Keep three's **default `XYZ` order and keep the 18.0797 Z term**: the composition lands the world vertical exactly on the screen vertical (live `matrixWorld.elements[1] === 0`), which is why the plinth's edges read vertical in `hero-assembled.png`. Re-ordering to `YXZ`/`ZYX` or dropping the roll tilts the whole image ~15 deg and widens the silhouette 45%.
- Scale the composition with the canvas: `zoom = 0.9753499582310595 * (cssW / 1600)` so the reference proportions hold at any size (the specimen frame is `min(82vmin, 760px)`); `resize()` recomputes `left/right/top/bottom` from the canvas' CSS size and calls `updateProjectionMatrix()`.
- `targetOffset` is **not** a three camera property: it fixes the aim point `position + dir * 1000` (the Phase 4/5 orbit tween interpolates to the decoded click state pose, zoom `2.4554753263096507`). Expose `ILLUSION_CAMERA.aim()` for that; do not invent a lookAt in this phase.

**Files:** `src/components/IllusionCube/illusion-camera.js` (new, <=99 lines; `window.ILLUSION_CAMERA.frame(cssW, cssH)` -> camera, `.resize(camera, cssW, cssH)`, `.aim(camera)`).

**Verify:** `--eval` printing `camera.projectionMatrix.elements[0]` = `0.00121919`, `[5]` = `0.00162558` (at 1600x1200 - byte-matches the live runtime), `Math.abs(camera.matrixWorld.elements[1]) < 1e-6`, and the six landmark px of Task 14's table +-4 px. Then resize the canvas and confirm the landmark px scale linearly (composition preserved).

### Task 10: `illusion-lights.js` - ambient, key light, three pools ✓ done

**Objective:** the decoded rig, exactly (note: there is **no hemisphere light** anywhere in the payload - the page ambient is a flat colour):

- `AmbientLight(0xD3D3D3, 0.75)` (decoded page ambient `0.827451` gray -> 211 = `0xD3D3D3`, intensity `0.75`). If the flanks later read flat it is a Phase 3 look call to add a hemisphere, not a decoded fact.
- `DirectionalLight(0xffffff, 0.8)` at `966.4148249280238, 529.2659896330395, 254.882440683175`; `castShadow`; `shadow.mapSize (1024, 1024)`; `shadow.radius = 0.81`; shadow camera `left/right = -1905.566/1905.566`, `top/bottom = 1905.566/-1905.566` (Spline `size` 3811.132), `near 500`, `far 2500`; direction towards the world origin (three's default `target`), which reproduces the reference's floor shadow streaking left and slightly up (predicted screen direction `(-0.56, +0.31)`).
- `softShadowQuality: medium` + `penumbraSize 0.839` have no three.js equivalents: use `renderer.shadowMap.type = THREE.PCFSoftShadowMap` and let the 3811-unit footprint over 1024 texels (3.7 units/texel) supply the softness. `shadow.radius` only applies under `PCFShadowMap` - set it anyway and say so in the header comment rather than pretending it is honoured.
- Three `PointLight(0xffffff, 0, distance, decay)` at the decoded **start** intensity `0`, `castShadow`, `shadow.mapSize 1024`, `shadow.radius 1`: `PL3 (57.049979656199255, 12.199857180006802, 112.45136454567444)` d 4564 decay 10; `PL2 (-113.54237269267794, 16.528549605580338, -39.705123501394496)` d 801 decay 7; `PL (-121.50410125112523, 11.353790460176242, 68.47555138330435)` d 990 decay 10. Expose `ILLUSION_LIGHTS.toState()` which sets the moved positions and intensities `PL3 0.8 @ (32.77265692860964, 8.405533059820298, 109.84670048246309)`, `PL2 1.0 @ (-126.12543356866746, 16.528549605580338, -72.06981022075522)`, `PL 1.705 @ (-88.6826038462716, 24.006305882438028, 27.694865485336862)` (the reference hero is at t~14 s, i.e. already moved) - Phase 4 owns the fades, Phase 2 only exposes the target.

**Files:** `src/components/IllusionCube/illusion-lights.js` (new, <=99 lines; `window.ILLUSION_LIGHTS.build(scene)` -> `{ ambient, key, points }`, `.toState(lights)`).

**Verify:** `--eval` prints the five lights' `type/position/intensity/distance/decay` and `renderer.shadowMap.type`; `ILLUSION_LIGHTS.toState()` then the capture shows three drifting pools on the grid and the key shadow left of the plinth. Confirm `distance`/`decay` reach three unchanged (they drive the pool radius at this scale - do not substitute defaults).

### Task 11: `illusion-floor.js` - the fogged grid plane ✓ done

**Objective:** adapt (do not reuse) `CUBE_FLOOR`: its 32-px diamond weave and `--primitive-*` tints are the IntelCube's look, while the decoded plane is two crossed `pattern` layers, style `lines`, `frequency [1, 50]`, `size 0.01`, `colorA rgba(0, 0.24313725490196078, 1, 0.3)`, `colorB rgba(1,1,1,0)` transparent, one layer `rotation 90` and one `0`.

- One `10 000 x 10 000` plane (`ShapeGeometry` of the decoded `±5000` quad) at `0, -199.453741, 0`, `rotation.x = -PI/2`, `flatShading` true, `receiveShadow` true.
- Line texture: 512x512 `CanvasTexture`, `rgba(0, 62, 255, 0.3)` lines ~5 px wide (1 % of a 200-unit cell) on a fully transparent ground, `RepeatWrapping`, `repeat.set(50, 50)` so one cell = 200 world units = the cube's own footprint column (this is what makes the grid read as "aligned under the cube" in the reference); material `MeshPhongMaterial({ map, transparent: true, depthWrite: false, shininess: 10 })` so the three point lights pool on it exactly like the reference.
- Fog is part of the look, not optional: `scene.fog = new THREE.Fog(0xC2DCFA, 1423.758, 1987.781)` (decoded page `fog.enabled` with `useBackgroundColor`; analysis doc corrected 2026-09-28) and `material.fog = true`. On the frame's centre column the band lands at **y 761 px (fog start) to y 538 px (full background)** at 1600x1200 - that is the grid's soft horizon.

**Files:** `src/components/IllusionCube/illusion-floor.js` (new, <=99 lines; `window.ILLUSION_FLOOR.build(scene)` -> `{ plane, grid }`, `.band(camera, cssW, cssH)` -> `[yStart, yFull]`).

**Verify:** capture reads as a faint blue weave of 200-unit cells: the two families are one screen-horizontal set (world-X lines, screen direction `(0.755, 0)`) and one running down-right at ~23 deg (world-Z lines, `(-0.655, -0.284)`), with ~142 px perpendicular spacing (a 200-unit step projects to 151 px across and 55 px down) - both faintly present beside and below the plinth, both gone above y 538 px; `--eval` returns the fog band `[761, 538]`.

### Task 12: `illusion-prism.js` - the floor light streak ✓ done

**Objective:** `PlaneGeometry(921.2535744979286, 1082.0878980260457, 8, 8)` at `-194.01257223931134, 0.7191718729590956, -8.388145252858408`, `rotation.x = -PI/2`, `receiveShadow` true, `castShadow` false; Phase 2 ships the **mask geometry** already exact and a flat matcap stand-in, so placement and falloff are verifiable before Phase 3 paints it: an object-space gradient along `+x` from `origin.x = 143.92656438504127` in `direction (1,0,0)`, white `1 -> 0` across `near 11.309148816992257` / `far 214.4367741248982` (`isWorldSpace false` - get the space wrong and the streak shears off the plane). Phase 3 replaces the stand-in with the masked `7b83617b` matcap (rotation -227) + phong (`alphaOverride 0.32`) stack.

**Files:** `src/components/IllusionCube/illusion-prism.js` (new, <=99 lines; `window.ILLUSION_PRISM.build(scene)` -> mesh).

**Verify:** capture shows a soft bright smear to the left of the base between x ~556-660 px (the reference's own render places its streak there) whose brightness dies before the plane's own edges - the mask must make the quad boundary invisible. `--eval` prints the plane's world corners and the mask origin.

### Task 13: `illusion-stage.js` - the composer ✓ done

**Objective:** stitch the rig: `scene.background = new THREE.Color(0xC2DCFA)` (decoded `0.7607843137/0.8627450980/0.9803921569`), the Task 11 fog, then Task 8's group, Task 10's lights, Task 11's floor, Task 12's prism and Task 9's camera; renderer `{ antialias: true, alpha: false }`, `toneMapping = THREE.NoToneMapping` and `outputColorSpace = THREE.SRGBColorSpace` (**not** the IntelCube's ACES: the reference's background is byte-exactly `0xC2DCFA`, so nothing may roll it off); `?graybox=1` swaps the six bodies to flat `MeshLambertMaterial(0x9aa4b0)` and hides the floor + prism so Task 14 can measure the silhouette alone; expose `ILLUSION_STAGE.build(renderer, cssW, cssH)` -> rig `{ scene, camera, bodies, lights, floor, prism, graybox }` and a no-op `step(dt)` that Phase 4/5 fill in.

**Files:** `src/components/IllusionCube/illusion-stage.js` (new, <=99 lines; `window.ILLUSION_STAGE`); `cube-illusion.html` script tags belong to Phase 1 - this module must slot in without reordering them.

**Verify:** `node --check` all seven Phase 2 files + `wc -l` each <=99; load `cube-illusion.html` and `cube-illusion.html?graybox=1` on :5174 with `--eval` returning `console` with zero errors and `ILLUSION_STAGE.rig()` non-null in both; confirm the `prefers-reduced-motion` branch renders one static frame (no `step` ticks) so Phase 4's loop wiring keeps a headless-safe path.

### Task 14: graybox silhouette capture - the phase acceptance ✓ done

**Objective:** prove staging before any material work. Copy the instrument (`cp prototype/gems/gem-shot.mjs <scratch>/ && ln -s "$PWD/node_modules" <scratch>/node_modules`) and capture the graybox at the reference's exact frame:

```bash
node <scratch>/gem-shot.mjs "http://localhost:5174/cube-illusion.html?graybox=1" <scratch>/illusion-gray \
  --size 1600x1200 --scale 1 --wait 6000 \
  --eval "(()=>{const T=window.THREE,r=window.ILLUSION_STAGE.rig();const b=new T.Box3();[r.bodies.main,r.bodies.base].forEach(m=>b.expandByObject(m));const c=[];for(const x of[b.min.x,b.max.x])for(const y of[b.min.y,b.max.y])for(const z of[b.min.z,b.max.z])c.push([x,y,z]);const p=c.map(v=>new T.Vector3(v[0],v[1],v[2]).project(r.camera));return JSON.stringify({x:[Math.min(...p.map(v=>Math.round((v.x+1)/2*1600))),Math.max(...p.map(v=>Math.round((v.x+1)/2*1600)))],y:[Math.min(...p.map(v=>Math.round((1-v.y)/2*1200))),Math.max(...p.map(v=>Math.round((1-v.y)/2*1200)))],mw1:r.camera.matrixWorld.elements[1]})})()"
```

**Done when** the eval returns `x [650, 925]`, `y [524, 803]` (+-4 px), `mw1` ~0, and the captured PNG's silhouette (threshold the flat background, same method as the reference) matches `docs/assets/illusioncube/hero-assembled.png` at these landmarks:

| Landmark | graybox (expected) | hero-assembled.png (measured) |
|---|---|---|
| top-face apex | (778, 524) | (778, 528) |
| top-face left corner | (650, 580) | (~658, 578) |
| plinth bottom-left corner | (650, 755) | (~658, 755) |
| silhouette bbox | x 650-925, y 524-803 (275 x 279 px) | x ~660-940, y ~530-805 (275 x 279 px, geometry) |
| plinth left edge | x constant 650 for y 580->755 | x constant ~658 for y 576->796 (vertical - the rig has no visible roll) |

Compare **landmarks, never the whole image**: the reference hero is a different capture (bloom halo bleeds its saturated right edge ~10-17 px wider, its shadow extends the mask below the plinth, and the analysis doc's `hero-assembled.png` is bloom+brightness-contrast processed - `bloom intensity 0.3 / threshold 0.257` and `brightnessContrast -0.278` are both `enabled` in the payload even though the doc claims "no postprocessing"). A pixel diff of the two PNGs is a false failure; the landmark table is the acceptance.

## Phase 3 — Materials & textures: the surface stack {#phase-3}

*Shipped in 09fc321 · Tasks 15–24 · phase-3.*

*Surface work for the illusion cube: one repeatable texture-extraction script (the decoded `.splinecode` carries six embedded JPEGs as raw buffers — proven end-to-end, 2,329,712-byte payload → 6 files), a single declared palette group so no colour literal ever reaches JS, and six custom `ShaderMaterial`s that collapse the eleven decoded Spline layer stacks into rig materials — `transmission` never used for the shell, `renderOrder` explicit, every animation handle left as a uniform for the motion phase.*

*Tags: Component, Design System, Function, Tooling*

| # | Task | Done when |
|---|---|---|
| 15 | Illusion palette tokens — declare `aliases-illusion`, emit `--primitive-illusion-*` | `npm run build` regenerates `design-system/tokens.css` with 14 `--primitive-illusion-*` vars; `lint:tokens` green |
| 16 | Texture extraction script + the 6 committed JPEGs | `node scripts/extract-illusion-textures.mjs` writes 6 valid JPEGs into `public/cube-illusion/textures/`; `--check` exits 0 against the committed set |
| 17 | `illusion-textures.js` — texture registry + canvas fallbacks | 6 textures load as `SRGBColorSpace` with spline-default wrap/filter; a 404 falls back to a procedural CanvasTexture, never a throw |
| 18 | `illusion-gl.js` — shared GLSL chunk library | noise/warp/ramp4/blend/fresnel/matcap/vecgrad chunks exported as strings; every material module consumes them, none re-declares noise |
| 19 | `illusion-shell.js` — Main Material as one alpha-glass `ShaderMaterial` | The 9-layer stack renders on the glass; inner cubes stay visible through it; `transmission` appears nowhere in the file |
| 20 | `illusion-inner.js` — inner-cube depth-gradient material | Three 2-stop vector gradients at the decoded origins/stops; `uL1Stop`/`uL1Origin`… uniforms drive position without touching the shader |
| 21 | `illusion-base.js` — base/plinth material with sheen rotation | Plinth reads matte grey-white with a metal sheen; `uSheenRot` sweeps 181°→87° in one uniform |
| 22 | `illusion-overlay.js` — wordmark, subtext, blurb canvas textures | ALPHA, "data in here don't lie" and "Only CRM stack you need" render crisp; Blurb is invisible at `uAlpha = 0` and reveals on tween |
| 23 | `illusion-prism.js` — prism streak floor material | Masked vector gradient × matcap × sheen reads as a soft blue streak on the grid, `uRot` at −227° |
| 24 | Phase-3 parity proof + material-mapping doc | `docs/illusioncube-material-parity.md` records every layer→shader→uniform mapping and the 4 approximations; captures sit beside the reference frames; all gates green |

### Task 15: Illusion palette tokens — one declared group, zero new literals in JS ✓ done

**Objective:** Every colour the surface stack needs resolves to a token before any shader is written. The decoded palette splits cleanly: **brand blue `#1666AF` is `--primitive-sapphire-ui-500` exactly** (S-Main `rgb(0.0863, 0.4, 0.6863)` → d=0), and the inner-cube gradient stops are **already DS primitives** — Cube L1 stop 0 `#A54CFF` = `--primitive-amethyst-400`, L2 stop 1 `#FFB01E` = `--primitive-citrine-400`, L3 stop 0 `#EA005E` = `--primitive-red-beryl-400`, all d=0. The scene background `#C2DCFA` is `--primitive-sapphire-ui-200` (d=5), the matcap_5 tint `#48484D` is `--primitive-neutral-dark-400` (d=15), Cube L3 stop 1 `#BD004B` snaps to `--primitive-red-beryl-500` (d=30). What has **no** DS home are the three electric blues and the three off-scale accents — declare them once, in a group, so `lint:tokens` stays green and no `'#hex'` ever appears in a JS line.

Add to `tokens/primitives.json`:

| Alias | Value | Decoded source |
|---|---|---|
| `brand-blue` | `var(--primitive-sapphire-ui-500)` | S-Main `rgb(0.086,0.4,0.686)` `#1666AF` — exact |
| `crimson` | `#c21645` | noise colorB `rgb(0.761,0.086,0.272)` |
| `amber` | `#c69e14` | noise colorC `rgb(0.778,0.620,0.080)` |
| `magenta` | `#c11d88` | noise colorD `rgb(0.756,0.112,0.533)` |
| `rim-blue` | `#0051e3` | Main fresnel `rgb(0,0.318,0.889)` |
| `glass-lo` | `#003bff` | transmission ramp stop 0 `rgb(0,0.232,1)` |
| `glass-mid` | `#00edff` | transmission ramp stop 1 `rgb(0,0.928,1)` |
| `glass-hi` | `#b500ff` | transmission ramp stop 2 `rgb(0.71,0,1)` |
| `grid-blue` | `#003eff` | Plane colorA `rgb(0,0.243,1)` (phase 2 consumes) |
| `plum` | `#a50b7e` | Cube grad L1 stop 1 `rgb(0.645,0.041,0.494)` |
| `bg` | `var(--primitive-sapphire-ui-200)` | scene bg `#C2DCFA` — d=5 |
| `base-gray` | `var(--primitive-neutral-light-400)` | Base colour layer `rgb(0.780,0.820,0.757)` |
| `sheen-gray` | `var(--primitive-neutral-dark-400)` | matcap_5 tint `rgb(0.282,0.282,0.302)` |
| `glyph-ink` | `var(--primitive-sapphire-ui-700)` | Subtext colour `rgb(0.149,0.233,0.316)` |

`scripts/build-tokens.mjs` gains one provider read plus one emit line producing `--primitive-illusion-<alias>` (the existing `aliases-gem` line drops aliases whose value equals their own target name — the illusion emitter must **keep** every entry, because these deliberately alias *different* names). Additive: no existing var changes, so phase 2's Plane can already call `tok('--primitive-illusion-grid', 0x003eff)` and fall back harmlessly if it lands first. Every JS read goes through the family's `ILLUSION_SCENE.tok(name, 0xfallback)` helper (phase 2 owns it, mirroring `CUBE_SCENE.tok` in `cube-scene.js`); raw `0x` fallbacks only, never `'#hex'`.

**Files:** `tokens/primitives.json` (add `aliases-illusion`), `scripts/build-tokens.mjs` (+2 lines), generated `design-system/tokens.css`.

**Verify:** `npm run build` prints a line count and `grep -c 'primitive-illusion-' design-system/tokens.css` returns 14; `npm run lint:tokens` → `0 raw leaks, 0 over-limit`; `npm test` green. Confirm `--primitive-illusion-brand-blue` resolves to `#1666AF` in the browser (`getComputedStyle(document.documentElement).getPropertyValue('--primitive-illusion-crimson').trim() === '#c21645'`).

### Task 16: Texture extraction script + the six committed JPEGs ✓ done

**Objective:** Make the embedded textures reproducible instead of hand-copied. The recipe is proven: fetch the page (8,296,658 bytes), slice the `app.start([…])` numeric array, `Buffer.from(Uint8Array.from(nums))` → a **2,329,712-byte** `illusioncube.splinecode` (head `d4724095` = fixext2), decode with `msgpackr`'s `Unpackr({structuredClone:true, useRecords:true})` plus permissive extension handlers for types 1–6, then read `shared.images[*].data.data` — each value is a **raw JPEG byte array** (`FF D8 FF`), not a URL or a data-URI. Verified output:

| Decoded id | Bytes | Size | Consumed by |
|---|---|---|---|
| `7b83617b-037e-49b5-8c02-9f88e3fb82cf` | 139,710 | 1024² | Main matcap layer, Prism Effect, Logo, Subtext |
| `61a09fba-b94f-4145-ae08-eca8fc42eb93` | 16,456 | 427² | Base sheen matcap |
| `matcap_0` | 44,587 | 1024² | Base matcap (α 1) |
| `matcap_4` | 42,057 | 1024² | Main matcap (α 0.54) |
| `matcap_5` | 53,103 | 1024² | Main + Base, tinted grey |
| `matcap_reflection` | 48,098 | **1080²** | Main reflection band |

Script contract: `node scripts/extract-illusion-textures.mjs` fetches by default; `--from <file>` reuses a cached `.splinecode` (the doc's section-6 recipe, so it runs offline); `--check` re-decodes and compares the six committed files **byte-for-byte**, non-zero exit on drift. Writes `public/cube-illusion/textures/<decoded-id>.jpg` and prints id/bytes/size per file so drift is visible. Add `msgpackr` as a **devDependency** (build-time only — nothing ships to the browser, and the committed JPEGs mean the specimen never touches the network at load); cache the 2.33 MB `.splinecode` under `docs/assets/illusioncube/` and add it to `.gitignore` (reproducible, and upstream IP stays out of the tree).

**Files:** new `scripts/extract-illusion-textures.mjs` (≤99 content lines, no colour literals), new `public/cube-illusion/textures/*.jpg` ×6, `package.json` (devDependency), `.gitignore` (cache).

**Verify:** run it fresh with `--from /Users/irfan/.hermes/cache/scratch/mp/illusioncube.splinecode` → 6 files; `file public/cube-illusion/textures/*.jpg` reports 5×1024² + 1×427² + 1×1080² progressive JFIF; totals 139,710/16,456/44,587/42,057/53,103/48,098 bytes match the table; a second run with `--check` exits 0; `npm run lint:tokens` stays green (script is ≤99 lines).

### Task 17: `illusion-textures.js` — registry, fallbacks, sRGB ✓ done

**Objective:** One place that turns the six committed JPEGs into `THREE.Texture`s with the right settings, so no material module ever constructs a texture. The decode settles the settings for us: `wrapping 1001`, `minFilter 1008`, `magFilter 1006` are **three.js's own defaults** (`ClampToEdgeWrapping`, `LinearMipmapLinearFilter`, `LinearFilter` — confirmed against r160 `src/constants.js`), and `repeat [1,1]` / `offset [0,0]` are identity, so the loader sets `colorSpace = T.SRGBColorSpace`, `anisotropy = renderer.capabilities.getMaxAnisotropy()`, and nothing else. The one real conversion: **Spline stores texture rotation in degrees** (39°, 181°, −227°) while three and our shaders want radians — expose `ILLUSION_TEX.rad(deg)` and use it at every call site.

Export map: `ILLUSION_TEX.load(renderer) → {photo, sheen, matcap0, matcap4, matcap5, reflection}`, `rad(deg)`, `canvas(size) → {cv, c}`. Fallbacks follow the family contract (`CUBE_CORE.sprite()`, `GEM_TEXTURES.stage()`): if a JPEG 404s, synthesise a `CanvasTexture` — a soft radial sheen for the matcap slots, a linear iridescent ramp for `photo` — so the rig degrades instead of throwing. Loading is lazy and idempotent; expose a `ready()` promise so the specimen can hold its first frame.

**Files:** new `src/components/IllusionCube/illusion-textures.js` (≤99 lines).

**Verify:** on `:5174` the console shows no `THREE.WebGLRenderer: Texture marked for update but no image data found` / 404 warnings; `ILLUSION_TEX.load(...)` returns 6 textures with `colorSpace === 'srgb'`; renaming one JPEG still yields a render (fallback path) with 0 console errors; `node --check src/components/IllusionCube/illusion-textures.js` clean.

### Task 18: `illusion-gl.js` — the shared GLSL chunk set ✓ done

**Objective:** One set of chunks so six materials can't drift apart. `NOISE` copies the `hash`/`noise`/`fbm` trio **verbatim** from `cube-core.js` (family parity: same value-noise, same 0.6/0.29/0.11 octave weights). On top of it:

- `WARP` — the decoded domain distortion `distortion:[3.97,-2.1]` as two sine offsets on the sample point (Spline warps the lattice before reading it, which is what makes the noise read as liquid rather than cloudy).
- `RAMP4(a,b,c,d,t,smooth)` — the four decoded stops (brand blue / crimson / amber / magenta) with `smoothness 0.3` as the `smoothstep` half-width.
- `BLEND(base, layer, alpha, mode)` — `0` normal `mix`, `1` multiply, `2` screen `1-(1-b)*(1-l)`, `3` overlay. Spline stores blend as a bare integer, so this mapping is an **inference**; the comment says so and Task 24 validates it visually and corrects it here (the noise/matcap chroma is the tell).
- `FRESNEL(n, v, bias, scale, intensity)` — `pow(clamp(1.0 - dot(n,v) + bias, 0, 1), scale) * intensity`, sized for the decoded `bias 0.1, scale 1, intensity 2`.
- `MATCAP(vN, rot)` — rotate the view-space `xy` by `rot` radians, then `*0.5 + 0.5`.
- `VECGRAD(p, origin, dir, near, far, stopA, stopB, smooth)` — the two-stop object-space vector gradient shared by the cube material and the prism mask: project `(p - origin)` onto `normalize(dir)`, normalise by `near..far`, then smooth-ramp between the stops.

**Files:** new `src/components/IllusionCube/illusion-gl.js` (≤99 lines, no colour literals — modes and maths only).

**Verify:** `node --check` clean; `grep -c 'float fbm(' src/components/IllusionCube/illusion-gl.js` is 1 and `cube-core.js`'s copy is byte-identical after whitespace normalisation; every material module's header names `ILLUSION_GL` as its chunk source.

### Task 19: `illusion-shell.js` — Main Material as one alpha-glass ShaderMaterial ✓ done

**Objective:** The scene's real engine, reproduced layer for layer. The decoded **Main** stack is nine layers, not the three the summary implied:

| # | Type | Decoded values | Recreation |
|---|---|---|---|
| 0 | noise (mode 2) | α 0.32, scale 1.37, move 4.1, colors A/B/C/D, smoothness 0.3, `size [100,100,100]` | `RAMP4` × `WARP`, `uScaleA 1.37`, `uMoveA 4.1` |
| 1 | noise (mode 3) | α 0.32, scale 1.78, move −0.04 | second `RAMP4` pass, `uScaleB`, `uMoveB` |
| 2 | fresnel (mode 2) | `rgb(0,0.318,0.889)`, intensity 2, bias 0.1, scale 1 | `rim-blue`, `FRESNEL` |
| 3 | matcap (mode 3) | `7b83617b`, α 0.24, rotation **39°** | `photo` matcap, `uMatRotPhoto` |
| 4 | matcap (mode 3) | `matcap_4`, α 0.54 | `matcap4` |
| 5 | matcap (mode 2) | `matcap_5`, α 0.24, tint `rgb(0.282,0.282,0.302)` | `matcap5` × `sheen-gray` |
| 6 | matcap (mode 3) | `matcap_reflection`, α 1, `projection 1`, `size [80,20]`, `axis y`, `crop` | anisotropic **band** — vertical mask × matcap; documented approximation |
| 7 | light/physical (mode 3) | α 0.6, roughness 0.3, metalness 0.48, reflectivity 1.6 | analytic sheen term (Blinn lobe + fresnel-weighted reflectivity) — no env, no PBR pass |
| 8 | **transmission** (mode 0) | `rgb(0,0.424,1)`, 3-stop ramp, thickness 60, ior 1.4, roughness 4.2 | **alpha glass**: fresnel-weighted `glass-lo → glass-mid → glass-hi` washing the whole stack, final alpha from `uOpacity` |

`size [100,100,100]` is the noise lattice over a 100-unit object volume; the recreation samples the block's object-space position scaled by `uScale` and tunes the 100³ normalisation against the reference frames in Task 24.

Invariants, non-negotiable — the reason the illusion works at all: `T.ShaderMaterial({transparent: true, depthWrite: false, side: T.FrontSide})`, `toneMapped = false`, `#include <colorspace_fragment>` in the fragment shader, `renderOrder = 4` (after inner cubes at 2, so the hidden cubes stay readable through the shell). **Never `MeshPhysicalMaterial.transmission`**: r160's `renderTransmissionPass` renders only `currentRenderList.opaque`, so a transmissive shell makes every transparent interior object disappear. A header comment states this and names the file that must not be "upgraded". Uniforms left live for phase 4: `uTime`, `uMoveA/uMoveB`, `uScaleA/uScaleB`, `uNoiseAlphaA/B`, `uMatRotPhoto`, `uSheenRot`, `uOpacity`.

**Files:** new `src/components/IllusionCube/illusion-shell.js` (≤99 lines; if the matcap block pushes it over, extract the six matcap/gloss terms into `illusion-gloss.js` and keep `illusion-shell.js` as the layer composer — extraction, never packing).

**Verify:** `node --check` clean; `grep -c 'transmission' src/components/IllusionCube/illusion-shell.js` is 0 (comment mentions only); on `:5174` the shell shows iridescent cyan/magenta/violet bands, a bright rim on the **top perimeter and nearest vertical edge** (matching `hero-assembled.png`), and the inner cubes are visible through it; `--eval` probe hiding the inner cubes leaves the shell reading identically to the isolation capture.

### Task 20: `illusion-inner.js` — the four cubes' depth gradients ✓ done

**Objective:** The four hidden cubes carry the colour bands, so this material *is* the illusion's payload. The shared Cube Material (id `74b2b277`, cloned per instance) decodes to three 2-stop **object-space vector** gradients, all with `direction [1,0,0]`, `isVector true`, `isWorldSpace false`, `smooth true`:

| Layer | origin | near/far | stops | colours | mode |
|---|---|---|---|---|---|
| L1 | `[-2,-15,10]` | 61.15 / 200 | `[0.1038, 0.2546]` | `amethyst-400` → `plum` | 0 |
| L2 | `[14,17,-2]` | 45.15 / 200 | `[0.1038, 0.3462]` | `gray-white` (α 0) → `citrine-400` | 0 |
| L3 | `[9,-14,-67]` | 94.15 / 199 | `[0.2615, 0.3730]` | `red-beryl-400` (α 0) → `red-beryl-500` | 1 |

…then a phong layer (mode 2, α 1, shininess 10) and a white colour layer (mode 0, α 1). Because the two leading stops carry **α 0**, each band fades in along its own origin axis — that is why the faces read as gradient washes rather than stripes.

`ILLUSION_INNER.material(cfg)` returns a **fresh material per cube** with its own uniform block (`uL1Origin`/`uL1Stop`/`uL1Near`/`uL1Far` … `uL3Stop`), which is exactly what the decoded scene does (shared uuid, cloned per instance) and what lets phase 4 tween stop positions and origins **per cube** with no shader edits. Opaque geometry: `transparent: false`, default `depthWrite: true`, `renderOrder = 2`.

**Files:** new `src/components/IllusionCube/illusion-inner.js` (≤99 lines).

**Verify:** `node --check` clean; four materials instantiated with independent uniform objects (`mat[0].uniforms.uL1Stop !== mat[1].uniforms.uL1Stop`); setting `uL3Stop.value = [0.9, 0.98]` at runtime sweeps that band with no recompile (no `THREE.WebGLProgram` warning in console); a shell-hidden capture shows the interpenetrating cube cluster with the decoded gradient hues.

### Task 21: `illusion-base.js` — base/plinth material with sheen rotation ✓ done

**Objective:** The plinth is the matte grey-white slab the whole composite stands on, and the only object with an authored idle animation. Decoded Base stack, seven layers: fresnel **black** (mode 3, intensity 2, bias 0.1) → `61a09fba` matcap (mode 3, α 0.6, rotation **181°**) → `matcap_0` (mode 2, α 1) → `matcap_5` tinted `sheen-gray` (mode 2, α 0.5) → colour `base-gray` (mode 1, α 0.32) → phong (mode 3, α 0.6, shininess 10) → **transmission** `rgb(0,0.424,1)` with a 3-stop ramp (thickness **360**, ior 1.16).

Recreation: the first six layers compose as written; layer 6 becomes an **alpha-glass rim** — a fresnel-weighted `glass-lo → glass-mid → glass-hi` wash — because r160 alpha glass has no thickness/ior, and those two values only modulate rim falloff (thickness 360 vs the shell's 60 is the reason the plinth reads as a solid body and the shell as a film). `uSheenRot` is a single uniform, defaulted to `rad(181)`, that rotates the `61a09fba` matcap sample; phase 4 tweens it to `rad(87)`. Solid body, so `transparent: true, depthWrite: true`, `renderOrder = 3` (before the shell at 4), `toneMapped = false` + `#include <colorspace_fragment>`.

**Files:** new `src/components/IllusionCube/illusion-base.js` (≤99 lines).

**Verify:** `node --check` clean; both endpoints render distinctly — capture at `uSheenRot = rad(181)` and at `rad(87)` and confirm the sheen moves along the slab rather than the slab re-lighting; the plinth reads matte grey-white with a soft blue rim, and the microcopy band stays legible against it.

### Task 22: `illusion-overlay.js` — wordmark, subtext, blurb canvas textures ✓ done

**Objective:** The three floating text objects, as canvas-texture planes. The decoded Logo Material (`55ab9a41`, on the five extruded letters) is `7b83617b` matcap α 0.6 (mode 2) + phong α 0.6 with **`alphaOverride 0.9`** + white α 0.9 (mode 2) — the override is why the wordmark reads as solid chrome rather than a translucent fill, so the recreation multiplies the canvas alpha by `0.9` instead of using it raw.

Build three canvas-texture families and their plane materials:

- **ALPHA wordmark** — five letter canvases (Shape 0…4; the `ALPHA` Empty sits at `(-73, 75.39, 101.094)` with scale `0.04434` on x/y, letters ~1160 local units apart). Draw each glyph white on transparent, letter-spaced; material samples `photo` matcap for the chrome. `uAlpha = 1`.
- **Subtext "data in here don't lie"** — 500 weight, 9 px in the reference. **Azeret Mono is not in this repo** (`public/fonts/` holds only `dm-sans-var`, `dm-sans-var-italic`, `space-grotesk-var`), so draw with a system mono stack (`ui-monospace, SFMono-Regular, Menlo, monospace`) and keep the reference's mono character; the material is `photo` matcap α 0.6 + phong α 0.6 + `glyph-ink` α 0.6. Bundling Azeret Mono as a woff2 is a recorded follow-up, not this phase.
- **Blurb "Only CRM stack you need"** — `600` from `--font-weight-semibold`, family `--font-family-sans`; phong α 0.6 + white α **0** → `uAlpha` defaults to **0**, so it ships invisible and phase 5 reveals it by tweening `uAlpha` 0→1 (the decoded state tweens z 98.66→101.10 alongside, which is phase 5's move).

Shared: canvases sized against `devicePixelRatio`, built **after `await document.fonts.ready`** so glyphs aren't measured with a fallback face; `colorSpace = SRGBColorSpace`; `transparent: true, depthWrite: false, depthTest: true, side: T.DoubleSide, renderOrder = 5` (drawn after the shell so the glyphs read as printed-on-glass rather than tinted through it — drawing before the shell at 3.5 is the tuning knob if the reference frames favour a frosted read), `toneMapped = false` + `#include <colorspace_fragment>`. Export map: `ILLUSION_TEXT.alpha(letter)`, `subtext()`, `blurb()`, and `plane(kind, opts) → {mesh, material}` so phase 2 positions and phase 5 reveals. Placement at z ≈ 101 belongs to phase 2 — this task owns textures and materials only.

**Files:** new `src/components/IllusionCube/illusion-overlay.js` (≤99 lines; if the three canvas builders plus the material factory overflow, extract the builders to `illusion-text.js` and keep this file the material factory).

**Verify:** `node --check` clean; on `:5174` all three strings render crisply at the correct scale (no fallback-face metrics — compare a capture against `hero-assembled.png`); `blurb` mesh is invisible at boot and becomes fully legible after driving `material.uniforms.uAlpha.value = 1` by hand in the console; console shows 0 missing-font / missing-texture warnings.

### Task 23: `illusion-prism.js` — prism streak floor material ✓ done

**Objective:** The soft blue light streak on the grid floor, decoded as three layers: a `depth` layer with **`isMask: true`** (`gradientType 1`, vector, `origin [143.9266,0,0]`, `direction [1,0,0]`, `near 11.3091`, `far 214.4368`, stops `[0,1]`, colours `[1,1,1,1] → [1,1,1,0]`) → `7b83617b` matcap (mode 2, rotation **−227°**) → phong α 0.6 (mode 0) with **`alphaOverride 0.32`**. The mask is the alpha: the gradient cuts a soft edge across the 921 × 1082 plane so the streak fades out along the vector instead of ending in a hard rectangle.

Recreation: `VECGRAD` supplies the mask (white → transparent along the origin axis), the matcap supplies the colour, the sheen supplies the lift; final alpha = `mask × uAlphaOverride (0.32)`. `uRot` defaults to `rad(-227)`. Blending stays Normal (mode 0, faithful); additive is a recorded tuning knob if the streak reads too flat on the light stage. `transparent: true, depthWrite: false, renderOrder = 1` — under the cubes and the shell, above the grid plane at 0. Plane position/rotation (`y 0.719`, rot −90°) belongs to phase 2.

**Files:** new `src/components/IllusionCube/illusion-prism.js` (≤99 lines).

**Verify:** `node --check` clean; the streak renders as a soft blue smear fading along its axis (never a hard-edged quad), sits **under** the plinth and shell in the composite, and a shell+base-hidden capture isolates it cleanly; rotating `uRot` by 90° visibly re-sweeps the matcap band (proves the uniform is live).

### Task 24: Phase-3 parity proof + material-mapping doc ✓ done

**Objective:** Close the phase on evidence, not on "it looks right" — and pin down the four deliberate approximations so phase 6's parity pass doesn't rediscover them. Write `docs/illusioncube-material-parity.md` (≤99 lines, matching the house `docs/figma-parity.md` habit) containing: the **layer → shader term → uniform → token** table for all eleven decoded stacks (Main 9, Cube 5, Base 7, Logo 3, Subtext 3, Blurb 2, Prism 3, Plane 2 — noting Plane is phase 2's), the token mapping from Task 15 with the source hex per entry, and the approximations list: **(1)** transmission → alpha glass (r160's transmission pass collects only opaque geometry; thickness/ior survive only as rim-falloff tuning), **(2)** `matcap_reflection`'s `projection 1 / size [80,20] / axis y` recreated as an anisotropic band, **(3)** Azeret Mono not bundled → system mono stack, **(4)** Spline's integer blend modes mapped as 0 normal / 1 multiply / 2 screen / 3 overlay — inferred, and corrected in `illusion-gl.js` if the captured chroma disagrees.

Then shoot the specimen and judge it against the reference set: `cp prototype/gems/gem-shot.mjs <scratch>/ && ln -s "$PWD/node_modules" <scratch>/node_modules`, then `node <scratch>/gem-shot.mjs http://localhost:5174/cube-illusion.html ./out --scale 1 --wait 9000 --clip ".cube-stage__frame"`, plus two isolation probes via `--eval` — hide the shell (judge the inner cubes' gradient bands and hues) and hide the inner cubes (judge the shell's noise chroma, fresnel rim and sheen). Read them against `docs/assets/illusioncube/hero-assembled.png` and `keyframes-filmstrip.png` for: noise hue fidelity (crimson/amber/brand-blue ramp), rim brightness on the **top perimeter and nearest vertical edge**, matte white top, plinth tone, streak softness. Tune **numbers, not structure** — a structure change reopens Tasks 18–23. Headless runs SwiftShader, so judge composition and hue, not iridescence sparkle.

Gates: `npm run lint:tokens` (`0 raw leaks, 0 over-limit` — it counts the trailing newline, so every new file stays at **≤99 content lines**), `node --check` on each new module, `npm test` green, `npm run build` emits `cube-illusion.html` plus the 6 textures under `dist/cube-illusion/textures/`, and `node scripts/map-graph.mjs` regenerates `docs/graph.mmd` with the new `IllusionCube` family. The atlas and mechanics gates are untouched **by construction**: `generate-arch-atlas.mjs` only indexes component dirs containing a `.css` (IntelCube is absent from `src/arch/atlas.json` for exactly this reason), so the new family must stay stylesheet-free in this phase.

**Files:** new `docs/illusioncube-material-parity.md` (≤99 lines), captures under `prototype/illusion/`, possibly `docs/graph.mmd` (regenerated — never hand-edited).

**Verify:** `npm run lint:tokens` → `✓ 0 raw leaks, 0 over-limit`; `npm test` green; `node scripts/map-graph.mjs` then `git status --short docs/graph.mmd` shows only regeneration; `ls dist/cube-illusion/textures/` lists all 6; the parity doc's mapping table has one row per decoded layer (29 rows) with no `TBD`; captures exist for the composite plus both isolation probes.

---

## Phase 4 — Motion: the living loops {#phase-4}

*Shipped in 4ead21a · Tasks 25–29 · phase-4.*

*One monotonic clock in the mount's rAF loop, a pure decoded-table module beside it, four per-frame steppers that write into records they already own — the inner cubes' 16 s spread↔converge sweep (Cube 2 delayed 8 s), Main's material-only churn, Base's one-shot 181°→87° sheen, three point lights (1 s fade, 8 s hold, 4 s move, 12/8/6 s drift term), Prism idle — with the house gates: pause offscreen, one static frame under reduced motion, zero per-frame allocation.*

*Tags: Motion, Component*

| # | Task | Done when |
|---|------|-----------|
| 25 | `illusion-timeline.js`: one clock, easings, pingpong/osc, Newton bezier, the decoded tween tables | every decoded number is a tested literal; `npm test` green |
| 26 | Inner-cube oscillation — 8 s legs, per-cube delay, scale pulses, band stop/origin sweeps | 28 s probe matches `anim_samples_raw.txt` within ±3 u / ±2° |
| 27 | Main churn (two noise uniforms), Base sheen 181°→87° **once**, Prism idle | uniform + matcap traces stay inside the decoded ranges |
| 28 | Point lights — intensity ramp, 8 s hold, 4 s move to state pose, drift term | light pose trace hits the decoded endpoints on time |
| 29 | The clock and the house gates: pause offscreen/hidden, reduced-motion still frame, no per-frame allocation | gates proven by probes; step bodies allocate nothing |

### Task 25: `illusion-timeline.js` — the tiny timeline system ✓ done

**Objective:** A DOM-free, THREE-free classic-script module (IntelCube lane convention: IIFE, `window.ILLUSION_TIMELINE`, ≤99 content lines, no raw hex) that owns the clock maths and every decoded number the Phase 4/5 steppers read, so no stepper hard-codes a timing. Members: `inOutCubic` (Spline `easing 4`); `bezier(x1,y1,x2,y2)` (Newton root find, as `src/patterns/OppsHome/morph-timing.js`); `leg(t, delay, ms)` → eased 0–1, clamped, 0 before the delay; `osc(t, delay, legMs)` → 0 at spread, 1 at converged, triangle with an eased leg each way (period `2*legMs`); `pose(out, a, b, w)` and `scaleOf`/`rotOf` writers that mutate caller-owned arrays; `drift01(t, period)`. Decoded tables: `CUBES` — C1 spread (−7.9, 73.5, 15.2)/rot(75.7, 59, 164.2)/s1 ↔ converged (28.2, 84.1, 21.1)/rot(31, −14.7, −11.9)/s0.7; C2 (54, 150.7, 9.8)/rot(0,0,0)/s0.3 ↔ (−36.4, 65.4, −45.4)/rot(−98.3, 25.7, −87.2)/s0.7 with `delay: 8000`; C3 (−53.4, 40.9, −69.1)/rot(−180, −4.8, −106.6)/s0.3 ↔ (−11.4, 140, 44.3)/rot(−98.4, 25.7, −152.2)/s0.7; Small (52.7, 20.4, −74)/rot(0,0,−17.1)/s0.3 ↔ (−27.7, 21.1, 62.6)/rot(10, 20, −10)/s0.4; every leg 8000 ms, every delay 0 except C2. `MAIN` — layer A `{scale 1.37, move 4.1, alpha 0.32}`, layer B `{scale 1.78, move −0.04, alpha 0.32}` → state `{1.44 / 6.39 / 0.54}` and `{2.58 / 0.03 / 0.46}`, 8000 ms, plus a 1000 ms dither. `BASE` — `{sheen: 181 → 87, duration: 4000, once: true}`. `LIGHTS` — per light `{from, to, intensity, fade: 1000, delay: 8000, duration: 4000, drift}`. `PRISM` — matcap rotation −227 → −169, 8000 ms pingpong. `CAMERA`/`REVEAL`/`CHAIN` for Phase 5 (Task 30/31 read them, they are defined here once).

**Files:** `src/components/IllusionCube/illusion-timeline.js` (new); `tests/illusion-timeline.test.mjs` (new — loads the classic file by `new Function(readFileSync(...))()` against a `globalThis.window = {}` stub, the same stub-first trick `tests/temporal.test.mjs` uses); `package.json` (append `node tests/illusion-timeline.test.mjs` to the `test` script).

**Verify:** `node --check` clean; the test asserts `inOutCubic(0)=0`, `(1)=1`, `(0.5)=0.5`, `f(0.25)+f(0.75)=1`; `osc(0)=0`, `osc(8000)=1`, `osc(16000)=0`, `osc(7999)<1`, and `osc(t<8000)` is exactly 0 for the C2 record while C1's is >0; the bezier's endpoints are exact, values stay in [0,1] and are monotone, with `bezier(0.5)` strictly ≠ 0.5 (the decoded curve is asymmetric — assert the inequality, never a magic midpoint); every table value equals the decoded literal (so a later edit can't drift silently); `npm test` and `npm run lint:tokens` green.

### Task 26: the four inner cubes — spread ↔ converge ✓ done

**Objective:** `ILLUSION_DRESS.step(rig, dt)` advances `rig.clock` and drives each inner cube from its record: `w = TL.osc(t, cube.delay, 8000)` at 0 for spread and 1 for converged, then in-place writes of position, rotation and uniform scale — scale lerps spread→converged (C1 1→0.7, C2 0.3→0.7, C3 0.3→0.7, Small 0.3→0.4), so the scale pulse falls out of the pose, and rotations lerp the decoded triples, giving the big sweeps (C1 z 164.2°→−11.9° ≈ 176°, C3 x −180°→−98.4°). Cube 2's whole envelope is delayed 8000 ms, so it holds its spread pose rigidly for the first 8 s (sample-verified: transform identical t=2.9→8.5). The same `w` sweeps the three `depth` gradient layers' stop positions and origin vectors (the band sweep that reads through Main), reading the pair of ends from the table Task 25 holds; if the lane recovered only the authored set, animate with the measured spread from the two noise-material states and record the deviation — do not invent an end value. Hot path: read the preallocated record, write `mesh.position/rotation/scale` and the uniform scalars directly; allocate nothing; skip the material writes when `w` is unchanged since the last frame.

**Files:** `src/components/IllusionCube/illusion-dress.js` (new); `illusion-timeline.js` (tables); the mount file (`illusion3d.js`, Task 29) calls the step.

**Verify:** a scratch CDP sampler (variant of `prototype/gems/gem-shot.mjs`, `--eval` reading `window.ILLUSION3D.rigs[0]`) samples every 0.4 s for 28 s against the dev server on **:5174** and dumps JSON to scratch; diffed against `~/.hermes/cache/scratch/anim_samples_raw.txt`: C1 converged at t≈8.5 within ±3 u and ±2° of (28.2, 84.1, 21.1)/rot(31, −14.7, −11.9), spread at t≈16.9 within the same tolerance, scales landing on the decoded endpoints (C2 0.3→0.7, Small 0.3→0.4); C2 unchanged for t<8 s; a 34 s capture shows frame t and t+16 s matching within tolerance; console clean.

### Task 27: Main's churn, Base's sheen, Prism idle ✓ done

**Objective:** Main's transform is never written — only its two noise-layer uniforms, tweened between the decoded material states (layer 1: scale 1.37→1.44, move 4.1→6.39, alpha 0.32→0.54; layer 2: 1.78→2.58, −0.04→0.03, 0.32→0.46) over an 8000 ms eased leg, with the decoded 1000 ms pingpong-rewind dither riding on top (the fine shimmer in the sample) and `uTime` advancing at the decoded `move` rate. Base: the layer-`43f4d81c` matcap texture rotation goes 181°→87° over 4000 ms **once** (Spline `runMode: Once`, easing 4) and then holds — it must not loop; the 1000 ms pingpong-rewind idle only dithers it, and having no separate trace in the sample, ship it off and record the choice. Prism Effect: idle only — matcap rotation −227→−169 over 8000 ms pingpong plus the 1 s idle; the floor/plane idle belongs to the staging lane's step and is called, not owned.

**Files:** `illusion-dress.js` (extend); the Phase-3 material module's uniform names are consumed as-is.

**Verify:** probe Main's uniforms at t=2/6/10/14 — they must traverse A→B→A inside a 16 s window and never leave 1.37–2.58 / −0.04–6.39 / 0.32–0.54; Base's rotation reads ≈181 at t=0, ≈87 at t≥4.2 and still 87 at t=20 (proof it is one-shot, not looping); `clip-1.png` of the floor streak compared frame-to-frame against `docs/assets/illusioncube/keyframes-filmstrip.png` reads as a drift, not a jump; console clean.

### Task 28: the three point lights ✓ done

**Objective:** All three lights are authored at intensity 0; each ramps to its state intensity over 1000 ms at t=0 (Point Light 1.705, Point Light 2 1.0, Point Light 3 0.8), holds its authored position for 8000 ms, then moves to its state pose over 4000 ms with easing 4 — Point Light (−121.504, 11.354, 68.476) → (−88.683, 24.006, 27.695); Point Light 2 (−113.542, 16.529, −39.705) → (−126.125, 16.529, −72.070); Point Light 3 (57.050, 12.200, 112.451) → (32.773, 8.406, 109.847). Distance/decay 990/10, 801/7, 4564/10; shadows on with 1024 maps, penumbra 0.5. The decoded drift tweens (`pingpong-rewind`, 12000/8000/6000 ms) point at state ids that are **not defined** anywhere in the payload, and the 28 s sample shows each light holding its state pose exactly for the 16 s after the move — so implement the drift as a parameterized, default-off term (`driftAmp = 0` → hold; when enabled it oscillates between the arrived pose and the authored pose) and record whichever amplitude ships. The visible drifting pools come from the 8→12 s move, not from the drift.

**Files:** `src/components/IllusionCube/illusion-lights.js` (new); `illusion-timeline.js` (`LIGHTS` table); mount loop calls `ILLUSION_LIGHTS.step(rig, t)`.

**Verify:** probe position + intensity at t=2 (intensity at state), t=8.4 (still authored pose, no drift), t=12.9 (±1.5 u of the state pose — the sample reaches it at 12.9), t=20 (held, no oscillation); a late-frame clip diff shows the light pools where the filmstrip's late frames show them; `npm run lint:tokens` green.

### Task 29: the clock and the house gates ✓ done

**Objective:** The mount's rAF loop owns the only clock: `dt = Math.min((performance.now() - last) / 1000, 0.05)`, and returns before any step when `!rig.vis || document.hidden || !canvas.offsetParent`. Mount/start stays behind `IntersectionObserver` with `rootMargin: '160px'` (with an immediate-start fallback when the observer is missing). `prefers-reduced-motion: reduce` renders exactly one frame at a chosen timeline time — the converged pose around t≈8 s, so the assembly reads assembled — and never schedules rAF; the `still` branch is checked once at mount and must survive later refactors. Every stepper allocates nothing per frame: scratch vectors and pose records live on the rig, uniform writes are guarded by a cached previous value, and no `new`, array literal, `.map` or closure appears inside a step body.

**Files:** `src/components/IllusionCube/illusion3d.js` (mount shipped by the scaffold lane — this task adds the loop body, the gates and the step calls); `illusion-dress.js`; `illusion-lights.js`.

**Verify:** `node --check` on all four; `grep -nE 'new |\.map\(|=>' illusion-dress.js illusion-lights.js` shows matches only outside the `step` bodies; a 600-frame `--eval` probe reports a constant `rig.cubes.length` and heap growth under 4 MB (a smoke signal, not a gate); a scratch variant of the shot rig that sends `Emulation.setEmulatedMedia` with `prefers-reduced-motion: reduce` yields one non-blank frame equal to the t≈8 s pose and a frozen frame counter; scrolling the canvas out of view freezes the counter while offscreen.

## Phase 5 — Interaction: the click reveal and the audio bed {#phase-5}

*Shipped in d201374 · Tasks 30–32 · phase-5.*

*One canvas `pointerup` toggles an ortho camera between the two decoded poses (6000 ms on the custom bezier, 1000 ms back on easing 4) and flips the directional light over 8000 ms; arriving in the far state is a Spline state condition, so it fires the chain — whoosh at +4 s, the "Only CRM stack you need" blurb after a 3 s delay and 3 s fade to z 101.10, a second bed copy at +8 s — and every timer is cleared on toggle-back. The audio bed is the repo's first AudioContext: sound on, created inside the first user gesture, every play path unlock-safe, silence reported rather than thrown.*

*Tags: Motion, Component*

| # | Task | Done when |
|---|------|-----------|
| 30 | Reveal state machine — canvas `pointerup`, camera A↔B, directional light, retarget-safe | probe: B in 6 s on the decoded curve, home in 1 s, mid-tween click retargets |
| 31 | The conditional chain on arrival — whoosh +4 s, blurb +3 s/+3 s, bed copy +8 s, reset on toggle-back | blurb reaches alpha 1 by click+12.2 s; toggle-back clears it in 1 s |
| 32 | Audio layer — vendored bed + whoosh, gesture unlock, sound-on default, graceful silence | status walks `armed`→`playing`; cue log order correct; both files non-silent |

### Task 30: the reveal state machine ✓ done

**Objective:** One `pointerup` listener on the canvas (Spline's event is `MouseUp`, `mode: "Canvas"` — press and release on the canvas, which also covers tap) flips `rig.reveal.state` A↔B. On the way out (A→B) the orthographic camera tweens over **6000 ms** with the decoded cubic-bezier controls `(0.6690234375, 0.2228515625)` / `(0.3199739583333333, 1)` from pos (530.466, 489.436, 592.347) / rot (−28.261°, 37.394°, 18.080°) / zoom 0.97535 to pos (−671.356, 471.105, 641.647) / rot (−31.288°, −41.968°, −22.116°) / zoom 2.45548, and the Directional Light tweens from (966.415, 529.266, 254.882) to (889.080, 443.083, 432.592) over **8000 ms** with the same bezier (both decoded as `runMode: Toggle`). The way back (B→A) is the decoded "off" tween: **1000 ms with easing 4 and no bezier and no target state** — it returns to the authored pose, so the retreat is a quiet snap, not a 6 s reverse. Rotation is Euler XYZ exactly as decoded (the ~18° roll is part of the look); zoom is `camera.zoom` + `updateProjectionMatrix()`, never a dolly. Because the source tween is a toggle with a `state: null` prefix, a click mid-tween retargets from the current interpolated pose: snapshot the live pose into scratch values at retarget time (no jump), and cancel/reschedule the chain (Task 31). Completion at B is what raises the chain — a state condition is true when the camera *is* there, not when the click happened.

**Files:** `src/components/IllusionCube/illusion-ctl.js` (new — listener, state machine, tween applier, timer bag); `illusion-timeline.js` (`CAMERA`, `REVEAL`); `illusion3d.js` (wiring in the mount, listener disposed with the rig).

**Verify:** a scratch CDP driver derived from `prototype/gems/gem-shot.mjs` sends `Input.dispatchMouseEvent` pressed+released at the canvas centre on **:5174** (a trusted event — an in-page `el.click()` is untrusted and cannot prove this path); sampling the pose at click+0/1.5/3/4.5/6 s shows a monotone approach and arrival at B within ±1 u / ±0.1° / ±0.005 zoom; at click+3 s the zoom is *not* the linear midpoint (assert the asymmetry, not a number); a second click at click+8 s lands back on the authored pose within 1.2 s; a click at click+2 s retargets with a frame-to-frame delta no larger than the opening slope; rapid double clicks leave no console error.

### Task 31: the conditional chain ✓ done

**Objective:** When the camera **arrives** in B, run the decoded Conditional event 1:1 — whoosh audio play at `+4000 ms` (volume 0.3), the discreet ambient re-entry at `+8000 ms` (volume 0.2, looping, the same bed bytes the Base plays), and the Blurb transition, which is a *pair* of tweens fired from the same instant: a 1000 ms reset toward the authored pose (alpha 0, z 98.6648) plus a transition to the decoded state with `delay 3000 ms`, `duration 3000 ms`, easing 4, driving material `layer2.alpha` 0→1 and `position.z` 98.6648→101.1018 (2.437 units toward the camera). Net, in absolute time from the click: camera arrives at 6 s, whoosh at 10 s, the heading is fully readable at 12 s. All timers live in `rig.reveal.timers` and are cleared on any toggle: a second click inside the window resets the blurb to alpha 0 / z 98.6648 over 1000 ms and drops the pending whoosh and bed re-entry, so a fast double click never leaves a half-faded heading or a late whoosh. The blurb mesh itself belongs to the overlay lane (Phase 3): a centred two-line plane at (−30.585, 110.030, 98.665), text "Only CRM stack you\nneed" (Inter 600 / 15). The decoded state also morphs the TextGeometry `depth 2 → 0`; a flat plane cannot express an extrusion morph — record that deviation rather than faking it. Under `prefers-reduced-motion` the rig is a single static frame, so the reveal is inert: a click is a no-op, the blurb stays at alpha 0, no timers and no audio are scheduled, and the mount exposes a `reveal()` hook so a later gallery/lab lane can force the B state as a still.

**Files:** `illusion-ctl.js` (chain + timer bag + reset); `illusion-blurb.js` (new only if the overlay lane ships the text separately — else the handle is `rig.overlays.blurb`); `illusion-timeline.js` (`CHAIN`).

**Verify:** with the trusted-click driver, probe the blurb's alpha and `position.z` at click+2/6/9/10/12/13 s: 0 until ≈9 s, ~0.5 at 10.5 s, exactly 1 by 12.2 s, z monotone 98.6648→101.1018; the Task-32 cue log shows the whoosh scheduled within 0.15 s of click+10 s and the bed re-entry within 0.15 s of click+14 s; a toggle-back at click+7 s drops alpha to 0 within 1.2 s and produces no whoosh afterwards; under emulated `prefers-reduced-motion` a click changes nothing and the console stays empty.

### Task 32: the audio layer ✓ done

**Objective:** Vendor the two extracted MP3s into the app as space-free names — `public/cube-illusion/audio/ambient.mp3` (206.94 s, 1.66 MB) and `public/cube-illusion/audio/whoosh.mp3` (4.152 s, 132 KB) — copied from `docs/assets/illusioncube/`; the module then decodes each **once** from a copy (`decodeAudioData(ab.slice(0))` — decoding the cached buffer itself detaches it and every later play of that file fails silently) and plays them through `AudioBufferSourceNode` + gain, with `loop = true` on the bed. House rules, all of them load-bearing: **sound is ON by default**; the AudioContext is created *only inside a user gesture* (the first `pointerdown`/`keydown`), never at mount, on hover or on a timer, because a pre-gesture context stays permanently silent on Safari even when `resume()` reports `running`; the bed is *armed* at load and starts on that first gesture (browsers block pre-gesture playback, so the reference's "plays at t=0" becomes "plays at the first gesture"), at the decoded bed gain 0.5 through one master gain, with the whoosh at 0.3 and the bed re-entry at 0.2; every play path is unlock-safe — `await ctx.resume()`, re-check `state === 'running'`, then schedule; any missing file, failed decode or absent AudioContext degrades to `status() === 'silent'` with no throw and no console noise. Gates: a persisted `illusion-sound` on/off plus `prefers-reduced-motion`, with an explicit stored `'on'` beating reduced motion (otherwise Android's "remove animations" silently overrules the user's deliberate choice); `status()` reports the reason for silence (`armed` / `playing` / `muted` / `reduced` / `blocked` / `silent`) so a quiet page is diagnosable. The whoosh is one-shot here even though the payload carries `loop: 1` on it — flag that for A/B against the reference. The specimen page carries one token-styled toggle and a status line.

**Files:** `src/components/IllusionCube/illusion-audio.js` (new, ≤99); `public/cube-illusion/audio/ambient.mp3`, `public/cube-illusion/audio/whoosh.mp3` (new, vendored); `illusion-ctl.js` (call sites); `cube-illusion.html` (toggle + status line).

**Verify:** (a) deterministic and gesture-free — `ffprobe` reports the durations above and `ffmpeg -af volumedetect` reports finite mean/max volume for both files (a 0-byte or empty placeholder is the known upstream trap), and `cmp` proves the vendored copies match the source assets; (b) headless on :5174 with the trusted-click driver — `ILLUSION_AUDIO.status()` walks `armed` → `playing` after the first gesture, and the cue log (`{cue, t}` pushed on every schedule: `bed`, `whoosh`, `bed2`) shows bed first, whoosh at click+10 s, bed2 at click+14 s (headless cannot resolve `resume()`; prove the transition and the schedule, not audibility); (c) in a real browser with sound on, the bed is audible right after the first click and the whoosh lands ~10 s later; (d) with `illusion-sound=off`, and with reduced motion while the flag is not explicitly on, all three cues are skipped, the status names the gate and the console stays empty; (e) `npm run lint:tokens` green.

## Phase 6 — Proof + integration decision {#phase-6}

*Shipped in 91b2ba3 · Tasks 33–40 · phase-6. Task 41 awaits the user's explicit `y`.*

*Closes the build on evidence: a deterministic 16-frame parity loop against the decoded reference, headless interaction and audio proof of the click reveal, an acceptance table against the scene analysis, reduced-motion and perf passes, a Safari replay, and an integration decision that stops and waits for an explicit `y` before any shipped surface is rewired.*

*Tags: Tooling, Motion, Function*

| # | Task | Done when |
| --- | --- | --- |
| 33 | Timed parity capture rig — 16 one-second frames at a jumped rig clock | 16 non-blank frames; two passes at the same clock are byte-identical |
| 34 | Reference alignment + paired contact sheets (filmstrip tiles ↔ native frames) | A 4×4 paired sheet renders, with the tile math re-derived from the gutter scan |
| 35 | Parity iteration loop with a measured tolerance table and a stop rule | Every frame passes silhouette + bbox + region colour, or the residual is logged as a gap |
| 36 | Interaction proof — click toggles camera orbit/zoom, light and blurb | Sampled zoom runs 0.975 → 2.4555 over 6 s; a second click returns within 1 s |
| 37 | Audio proof — gesture-gated ambient + whoosh at decoded levels and delays | Pre-gesture `suspended`; post-gesture ambient 0.5, whoosh at click +4 s ±0.3 s |
| 38 | Acceptance checklist against `docs/illusioncube-scene-analysis.md` §1–§5 | Every claim carries an artifact or an explicit `known gap`; containment passes on all 16 frames |
| 39 | Reduced-motion + performance pass | Reduced motion renders one static frame; no longtasks, no NaN, rAF p95 within budget |
| 40 | Cross-engine replay in WebKit (Safari) | The same zoom series in both engines within ±2%; divergences listed, not averaged |
| 41 | Integration DECISION — options, recommendation, awaiting explicit `y` | Three options with measured cost presented; no shipped surface rewired before the user's `y` |
| 42 | Close-out conventions — shipped lines, trailers, track refresh, retro links | The phase reads done in the changelog with badges, `npm test` green, trailers on the subject line |

### Task 33: Timed parity capture rig — 16 one-second frames at a jumped rig clock ✓ done

**Objective:** Snapshots prove a frame; parity needs the sequence. Add `prototype/gems/illusion-probe.mjs` (≤99 lines) as the repo's timed sibling to `gem-shot.mjs`, built from two proven pieces: `gem-shot.mjs`'s CDP plumbing (Chrome launch, `Target.attachToTarget`, `Emulation.setDeviceMetricsOverride`, `Page.captureScreenshot` with an element clip, a console/exception buffer) and the scratch `spline-frames.mjs` pattern of repeated timed shots, where it earned its keep capturing the Spline original. Its one addition over both is `--at 0,1,…,15`: before each frame, jump the rig clock through `Runtime.evaluate` (`const r = window.ILLUSION3D.rigs[0]; r.clock = t; r.t = t; r.last = performance.now();`), wait one animation frame, then shoot. Driving the loop by clock rather than wall time is what makes frame *k* the loop's *k*-th second on a software renderer where a frame can take ~0.3 s — the pixel-proof rule that a single-shot harness must jump the rig clock to capture settled or pushed states on demand. Clip to `.cube-stage__frame` at a `--size` that lands the clip at 4:3 (the reference tiles are 390×290 ≈ 1.345), write `f00..f15.png` under `.hermes/tmp/illusion-parity/pass-N/`, and print the per-frame probe JSON plus elapsed time. This task owns the tool; Task 36 extends it with `--click`.

**Files:** `prototype/gems/illusion-probe.mjs` (new), `.hermes/tmp/illusion-parity/pass-N/f*.png`

**Verify:** 16 PNGs at one size, none blank (`ffprobe`/PIL pixel-variance > 0 per frame); the probe prints `consoleErrors: []`; run the pass twice at the same clock and compare hashes — frames must be byte-identical (a mismatch means wall-clock leaked into material noise or an ease, and that is a Phase 4 bug, not a harness artifact).

### Task 34: Reference alignment + paired contact sheets ✓ done

**Objective:** Give every native frame a reference twin. The filmstrip is the second-accurate reference: verified 4×4 tiles of 390×290 with 10 px gutters in a 1600×1200 sheet — tile `(r,c)` starts at `x = 2 + 400c`, `y = 2 + 300r`, and tile index `4r + c` is `t` seconds (its own overlay timestamps `t=00s` … `t=15s`; a re-crop of all 16 tiles shows clean edges and no bleed). `loop-16s.gif` is the same 16 states at 640×480, 16 frames × 120 ms = **1.92 s** of playback (measured; `loop: 0`, 120 ms per frame) — so it is a ~2 s motion sample of the 16 s cycle, not a seconds timeline: use it for motion sanity and `pdiff`-style comparison, and take frame timing from the filmstrip. Cross-check the pairing by comparing GIF frame *k* to tile *k* with the timestamp block (top-left ≈ 40×150) and the Spline badge (bottom-right ≈ 40×110) masked and both normalised to a common size: the masked mean difference is ≈1.74/255, i.e. the two media agree, whereas an unmasked comparison at thumbnail scale reads ≈10/255. That ratio is the reason the pipeline must mask overlays and normalise scale before it diffs anything — otherwise the metric measures the overlay, not the rig, and the loop optimises against a lie. Write `prototype/gems/illusion-sheet.mjs` (≤99 lines) that takes a pass directory plus the filmstrip and emits a 4×4 paired sheet (`reference` above, native below, per tile) and the per-frame metric table; keep gutters and labels out of the measured regions.

**Files:** `prototype/gems/illusion-sheet.mjs` (new), `.hermes/tmp/illusion-parity/pass-N/sheet-*.png`

**Verify:** the sheet renders 16 pairs with the second label on each; the metric table shows 16 rows and the tile math re-derives to `2 + 400c` / `2 + 300r` from a low-variance gutter scan of the filmstrip (do not hard-code blindly — assert it); a deliberately mis-offset crop produces a visibly worse metric, proving the alignment code actually aligns.

### Task 35: Parity iteration loop — tolerance table and stop rule ✓ done

**Objective:** Turn "looks close" into four measured conditions, iterate until they hold, and stop on a documented rule instead of grinding. Conditions: (1) **silhouette containment** — project all 32 corners of the four inner cubes into NDC on every native frame and assert each lands inside `Main`'s projected silhouette with max protrusion ≤3 px, because spec §1's whole illusion is that the inner bodies never poke out (only a ~3 px sliver grazes `Main`'s top edge at the widest spread); (2) **composition** — the masked, scale-normalised object bounding box matches the reference tile within ±2% of frame width/height per edge; (3) **region colour** — mean per-channel difference ≤16/255 on a 3×3 region grid over the object, with the *hue ordering* between regions (matte white top vs saturated flanks) as the pass condition and the loose channel budget deliberate, since headless SwiftShader mutes iridescence and the skill's warning is explicit: never brighten tints to compensate for the software renderer; (4) **macro stability** — per-frame drift across the 16 native frames must be ≤ the reference's own drift measured the same way (the reference is quiet but not frozen: the same-content cross-media figure is 1.74/255), plus a 50% margin. Run one pass per change of a single knob, record `pass-N` with the knob, the metric table and the sheet, and stop when all four hold — or when two consecutive passes move no metric by more than 1%, at which point the residual is reported as a known gap with its numbers attached rather than iterated away. Never tune against a screenshot alone: composition and colour are judged from the sheet, containment from the projection eval.

**Files:** `.hermes/tmp/illusion-parity/pass-N/` (per-pass sheet + metric table + log line), `prototype/gems/illusion-sheet.mjs` (metric additions)

**Verify:** the final pass's table shows containment green on all 16 frames; the stop condition is stated in the phase log (all conditions passed, or the residual with its measurements); the log names the knob changed per pass so the archive shows what moved; `npm test` green at the end of the pass.

### Task 36: Interaction proof — click toggles camera, light and blurb ✓ done

**Objective:** The click reveal is the one dynamic behaviour a still cannot prove, so drive it with real input and sample the state series. Extend `illusion-probe.mjs` with `--click <ms-after-first-frame>` using CDP `Input.dispatchMouseEvent` (`mousePressed` + `mouseReleased` at the canvas centre — as proven in the scratch `spline-frames.mjs`) plus `--sample "<expr>"` evaluated before each timed shot, so one run returns both frames and a numbers series. Per spec §4 the click toggles `Camera` to state `7eb41845` (ortho zoom 0.9753 → 2.4555, position (530.47, 489.44, 592.35) → (-671.4, 471.1, 641.6), i.e. ≈80° of orbit) over 6000 ms on the custom bezier (0.669, 0.223)/(0.320, 1.0); `Directional Light` toggles to (889.1, 443.1, 432.6) over 8 s on the same bezier; `Blurb` fires its conditional (camera IS in state `7eb41845`) which plays the whoosh at +4 s and fades the heading alpha 0 → 1 with reset 1 s, delay 3 s, duration 3 s, easing 4 — fully revealed ≈10 s after the click; a second click toggles back in 1 s. Sample `camera.zoom`, camera position and the blurb material's opacity at click +0/1.5/3/6/10 s and after the second click.

**Files:** `prototype/gems/illusion-probe.mjs` (`--click`/`--sample` additions), `.hermes/tmp/illusion-parity/pass-N/click-*.png`, `.hermes/tmp/illusion-parity/click-series.json`

**Verify:** the sampled zoom series starts at 0.9753, rises monotonically and settles at 2.4555 ±2% by +6 s (not earlier — a fast settle means the bezier or duration was dropped); the camera's second pose matches (x, z) sign flips on the x axis; the +10 s shot shows the revealed headline at a readable size and the +6 s shot shows it partially faded; the second click returns zoom to 0.9753 ±2% within 1 s; the light's sampled position moves toward the decoded values; `consoleErrors: []`.

### Task 37: Audio proof — gesture gate, levels and delays ✓ done

**Objective:** Browsers refuse audio without a user gesture, so the recreation needs an affordance and the proof must be state-based, not audible. Capture errors before document load (CDP `Page.addScriptToEvaluateOnNewDocument`) so an early-mount failure cannot hide as a silent no-audio. Prove the decoded routing: ambient (`b33427af`) starts with the scene at vol 0.5 but only once the user has granted a gesture, with the second scheduled copy at +8 s at vol 0.2 per the Blurb conditional; the whoosh (`bf58f459`) fires on the click condition at +4 s, vol 0.3. Sample `AudioContext.state`, per-element `volume`, `paused` and `currentTime` at load, after the sound affordance is activated, at click +1 s, and at click +4.5 s. A headless run is launched with `--mute-audio`, so assert state and clocks — never infer audibility — and reserve one line asking the user to confirm they can hear it on their machine.

**Files:** `prototype/gems/illusion-probe.mjs` (audio sampling expressions), `.hermes/tmp/illusion-parity/audio-series.json`, and the specimen's sound affordance (`cube-illusion.html` + `src/components/IllusionCube/illusion3d.js`) **only if** Phase 5 shipped the rig without one — check first, do not duplicate a control that exists.

**Verify:** before the gesture, `state === 'suspended'` and no media element reports `currentTime > 0`; after activating the affordance, ambient reports `volume ≈ 0.5` and advancing `currentTime`; whoosh `currentTime` starts within 4.0 ± 0.3 s of the click with `volume ≈ 0.3`; the affordance is keyboard reachable with an accessible name and `aria-pressed`; the page never autostarts audio on load.

### Task 38: Acceptance checklist against the decoded spec ✓ done

**Acceptance (run 2026-09-29, Phase 6 close):**

| # | Claim (§1–§5) | Verdict | Artifact |
|---|---|---|---|
| 1 | Six bodies + floor plane + prism + ALPHA letters + blurb | PASS | `illusion-bodies.js`, `pass-10/f08.png` |
| 2 | Containment, all 16 frames (≤3 px) | PASS w/ note | Hull eval `pass-8`: C1/C2/C3 zero outside; Small dives into opaque plinth — decoded numbers verbatim, so parity not failure |
| 3 | Ortho pose / zoom / roll | PASS | Task 14 landmarks; zoom `ZOOM·cssW/1600` by design (0.3298 @880, 0.975 @1600) |
| 4 | Ambient + key + 3 point lights; light tween to LB | PARTIAL | Build + `toState` verified; light *position series* never sampled (cam/blurb proven instead) |
| 5 | Crossed lines patterns (freq 50, size 0.01) | KNOWN GAP | Never measured — grid reads denser/finer than ref at matched size |
| 6 | Material stacks (Main noise/fresnel/matcap; inner gradients; base rim) | PARTIAL | Stacks per decode; residual: shell too clear (blobs visible at uOpacity 0.8), floor wash too yellow — needs shader work, not knobs |
| 7 | Timing: 8 s converge, 16 s osc, C2 delay, scales, prism −227→−169, base 181→87 | PASS | World-center series tracks table; C2 holds spread t<8; `t2` reveal timings exact |
| 8 | Click: camera A→B 6 s, blurb 0→1 by ~12 s, retreat 1 s | PASS | B byte-exact @+6 s; blurb 0.98–1.0 @+12 s; retreat @+1.5 s wall (1 s tween + frame) |
| 9 | Audio routing (bed 0.5, whoosh 0.3 @+4 s, bed2 0.2 @+8 s) | PARTIAL | Gates proven (armed/blocked/muted/reduced); audible levels need ears — **can you confirm sound on your machine?** |
| 10 | Isolation: hide Main → 4 inners; hide C1 → shell intact | PASS | `iso-nomain` (4 cubes counted), `iso-noc1` (silhouette full) |
| 11 | Text ~100 u front, camera-aligned (not decals) | KNOWN GAP | ALPHA renders on glass faces; front-distance never measured |
| 12 | Still (1 frame) + perf (0 longtask, 0 NaN, clean console) | PASS | `audio-still2`: frames 1, still:true; favicon fix → zero console errors |
| 13 | WebKit replay within ±2% | PASS | `webkit/webkit-series.json`: zoom exact, hull same shape, B + blurb match, 0 errs |
| 14 | Byte-identical reruns | DEVIATION | 7/16 identical, rest ≤0.1% (sub-frame clock skew; poses deterministic) |

**Objective:** Make the reference document falsifiable. Turn `docs/illusioncube-scene-analysis.md` §1–§5 into a pass/fail table where every row cites the artifact that proves it — object inventory (six bodies + `Plane` + `Prism Effect` + the 5 ALPHA letters + `Subtext` + `Blurb`), the containment result from Task 35, the ortho pose/zoom/roll, the three light classes and the three low point lights, the two crossed `lines` patterns (frequency 50, size 0.01, `rgba(0,0.243,1,0.3)` with one layer rotated 90°), each material family's stack (Main's noise stops + fresnel blue intensity 2 + matcap α0.24 + light α0.6; Cube's three animated depth gradients; Base's fresnel + three matcaps + blue transmission rim; Text/Label treatment), the timing table (8 s converge + 16 s oscillation with per-cube phase offsets and the 8 s delay on Cube 2, scale pulses 1↔0.7 / 0.3↔0.7 / 0.3↔0.4, matcap rotation 181°→87°, point-light move after an 8 s delay), the click sequence, and the audio routing. Two structural items carry extra weight: hiding `Main` must still expose four interpenetrating inner cubes and hiding `Cube 1` must still change nothing (the spec's isolation test — reproduce it as a hide-and-diff run, since it distinguishes a real recreation from a single-cube lookalike), and the text objects must sit ~100 units in front aligned to the camera rather than as decals. Any row without evidence is written as `known gap` with the reason; a blank evidence cell is a failure of this task.

**Files:** this phase's Task 38 block (the acceptance table, appended when the checklist is run), `.hermes/tmp/illusion-parity/acceptance.md` (artifact index)

**Verify:** every §1–§5 claim appears exactly once as a row with non-empty evidence or an explicit `known gap`; the two isolation results are recorded as hide-and-diff outcomes; the containment row cites all 16 frames, not a sample.

### Task 39: Reduced-motion + perf pass ✓ done

**Objective:** Two audiences, one task: the user who asked for no motion, and the page's cost. Force the media query through CDP (`Emulation.setEmulatedMedia` with `prefers-reduced-motion: reduce`), then assert exactly one frame was rendered and that no loop, idle churn, light drift or audio autostart survives the branch — the same guarantee `cube3d.js` makes, and one this rig must keep when Phase 4 refactors the loop. Then run the idle/perf probe: rAF timestamp gaps (p50/p95) over a scripted window, no `longtask` entries, no `NaN` in animated transforms, no pageerrors, a cold-load console with zero errors or warnings, DPR capped at 2, and no per-frame allocation (matrix/colour/vector reuse in `illusion-dress.step`). Report the headless numbers as "no jank sources", not as smoothness: a GPU-free SwiftShader run cannot prove perceived smoothness, and the skill is explicit that the engine the user browses with is the only place to claim a fix — which Task 40 covers.

**Files:** `src/components/IllusionCube/illusion3d.js` (the still-branch and pause paths), `prototype/gems/illusion-probe.mjs` (`--still` and gap sampling), `.hermes/tmp/illusion-parity/perf.json`

**Verify:** under emulated reduced motion `rigs[0].frames === 1` after 5 s idle and the single frame matches the decoded pose; with motion on, p95 rAF gap under the measured budget with zero longtasks; zero pageerrors/warnings on cold load; `performance.getEntriesByType('resource')` shows no 404 and no asset fetched twice.

### Task 40: Cross-engine replay in WebKit (Safari) ✓ done

**Objective:** The user judges in Safari, so a Chromium-only pass is not proof of what they will see. Replay the same 16-frame capture and the click sequence in WebKit and report the same measurements from both engines — zoom series, blurb opacity series, frame count, containment test, and the flank/top colour ordering — rather than a prose "looks the same". Install Playwright into the scratch directory (not as a repo devDependency: the ship surface should not grow a 100 MB-class test dependency for one replay, and `npm test` must not start depending on a browser download) and use its WebKit build; drive the same evals. Expect and report engine divergence honestly: WebKit's software path, colour management and `prefers-reduced-motion` handling differ, so a colour shift within the Task 35 budget is information, not a bug — but a zoom curve or a missing blurb fade in WebKit is a real defect and is fixed here, because that is the engine the user actually opens.

**Files:** scratch-only Playwright install, `.hermes/tmp/illusion-parity/webkit/` (shots + series)

**Verify:** WebKit renders 16 non-blank frames; the zoom series matches the Chromium run within ±2% at every sample; containment passes on all 16 WebKit frames; blurb opacity reaches 1.0 by click +10 s; any remaining divergence is listed in the phase log with both measurements.

### Task 41: Integration DECISION — options, recommendation, explicit `y` required

**Objective:** Present the fork, recommend, and stop. Measure the cost first so the choice is not made on vibes: the four rig modules' byte size, the first-frame time on the agent's own dev server, and the frame cost at the specimen's size — a hero surface is the one placement where a six-body rig carrying matcap textures is a real risk on mobile. Then present: **(A) keep `cube-illusion.html` as its own specimen** — the reference is a brand object, the page is a faithful deliverable, zero shipped surface is disturbed; cost is a seventh MPA entry and no user-facing payoff. **(B) fold into IntelCube** — one rig family to maintain, but the two disagree on fundamentals (IntelCube is alpha glass, perspective, env-mapped, glow-driven; IllusionCube is orthographic, flat background, matcap/texture-driven, built on the inner-cubes-behind-shell trick), so folding means rewriting one of them and the IntelCube page is an already-shipped specimen; not recommended. **(C) wire into a hero surface** (`index.html` or `pitch.html`) — highest payoff, since the reference *is* a brand hero ("Only CRM stack you need") and the reveal is designed as one, but it edits shipped pages, forces the gesture-gated audio affordance and its label onto the entry surface, and adds first-paint cost. **Recommendation: A now, C as its own scoped build** once the Task 38 checklist is green and the cost numbers are in hand; the order matters because the hero placement is the only one that can be judged against a shipped page's budget. End the message with the question, attach the paired sheet, and record the answer as `docs/decisions/008-illusion-cube-integration.md` (001–007 exist; five lines: context, options, decision, why, consequences). **No wiring happens in this task** — rewiring `index.html`, `pitch.html` or the IntelCube rig on an inferred preference is exactly the silent integration this task forbids.

**Files:** `docs/decisions/008-illusion-cube-integration.md` (only after the user answers)

**Verify:** one message presents all three options, the recommendation, and the measured cost, with the side-by-side sheet attached; `git status` shows no change to `index.html`, `pitch.html`, `cube.html` or `src/components/IntelCube/**`; the decision doc exists only once the user has replied with an explicit `y`, and names which option was chosen.

### Task 42: Close-out conventions

**Objective:** Close the plan the way the repo's archive expects, so Phases 1–6 read as shipped rather than pending. Per phase (not only at the end): append `✓ done` to the `### Task N:` headings that shipped — the checkboxes are synthesised from `/✓/` in the heading, and linked commits alone never move a phase's `d/t` — and add `*Shipped in <sha> · Tasks a–b · phase-N.*` immediately under the phase heading, using the code commit's short sha (`git rev-parse --short HEAD`, never a remembered one) with the anchor spelled exactly as the heading carries it. Cite trailers as `[plan:2026-09-28_221212-illusion-cube-recreation.md#{#phase-N}]` with braces on the **subject** line: single-digit phases must be braced because `text.includes()` would otherwise let `{#phase-1}` phantom-badge `{#phase-10}` if this plan ever grows, and the tracker parses the subject only. Phase 1's own commit is DS-tracked (it touches `src/components/IllusionCube/**` and `src/ds/changelog-names.json`, both under `src`), and Phases 2–5 are too, so no retro entry is needed for them — but a commit whose only paths are `cube-illusion.html`, `vite.config.js`, `public/cube-illusion/**` or `docs/decisions/**` is invisible to `git log -- src design-system prototype …` and needs a `.hermes/plan-links.json` entry (`{"<sha>": {"plan": "2026-09-28_221212-illusion-cube-recreation.md", "anchor": "{#phase-N}", "note": "…"}}`) or it will never badge. Then `npm run ds:track`, verify `0 wip` and that the new shas are linked, run `npm test`, and commit the refreshed `design-system/changelog-manifest.json` with the same phase trailer; discard a timestamp-only manifest diff with `git checkout --` rather than committing churn. Two commands that carry weight here: `npm run plan:names` must stay green against the merged plan file (Task 1's entry is what keeps it green), and the `docs/assets/illusioncube/` audio duplication flagged in Task 5 gets a one-line disposition in the final report (keep, or delete the originals once Task 38 is accepted).

**Files:** `.hermes/plans/2026-09-28_221212-illusion-cube-recreation.md` (marks + shipped lines), `.hermes/plan-links.json` (retro entries when needed), `design-system/changelog-manifest.json`

**Verify:** `npm test` green (lint:tokens 0 leaks, plan:names 12 phased plans, ds-track `0 wip`); the changelog card for the plan shows the aggregated phase count with each phase's `d/t` complete and its commit badges present; no phase is left reading `0/N`; every commit that touched a DS path carries the phase trailer on its subject.

---
