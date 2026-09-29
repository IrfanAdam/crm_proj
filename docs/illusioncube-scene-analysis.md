# illusioncube — Spline scene analysis & code-recreation brief

**Source**: `https://my.spline.design/illusioncube-1e660ec82b20a77e5cc5dfd8f7b2074b/`
**Scene name**: `illusioncube` · **Page title**: "Alpha branding" · **Runtime**: `@splinetool/runtime@1.9.62`
**Payload**: 2.33 MB `.splinecode` (msgpackr-with-records) embedded in the 8.3 MB page as an `app.start([...])` byte array.
**Assets extracted** (this folder): `hero-assembled.png` (t≈14 s), `loop-16s.gif`, `keyframes-filmstrip.png`, `audio_bg.mp3` (ambient bed, 64 kbps 24 kHz), `audio_*.mp3` (whoosh, 256 kbps 48 kHz).

All numbers below were decoded from the scene binary and verified live (headless Chrome + runtime, object isolation tests, 28 s transform sampling).

---

## 1. What the thing actually is (the illusion)

On screen: **one** rounded cube on a thin plinth, holographic gradient flanks, matte white top, "ALPHA" on the front face, tiny "data in here don't lie" microcopy on the base band, pale-blue grid floor.

In the scene graph it is a **composite of six bodies + floating overlays**:

| # | Object | Geometry (units) | Role |
|---|--------|------------------|------|
| 1 | `Main` | rounded box 200×200×149 (r16 bevel 4) | the big translucent "glass" cube |
| 2 | `Base` | rounded slab 200×200×45 (r16 bevel 4) | the plinth |
| 3 | `Cube 1` | 120.1×111.4×120.1 box | 1st inner cube (scale 1 ↔ 0.7) |
| 4 | `Cube 2` | same box | 2nd inner cube (0.3 ↔ 0.7) |
| 5 | `Cube 3` | same box | 3rd inner cube (0.3 ↔ 0.7) |
| 6 | `Small Cube` | same box | 4th inner cube (0.3 ↔ 0.4) |
| — | `Plane` | 10 000² flat @ y=-199.45 | the grid floor |
| — | `Prism Effect` | 921×1082 masked matcap plane on the floor | floor light streak |
| — | `ALPHA` | Empty ×5 extruded letter shapes (scale 0.0443) | wordmark overlay |
| — | `Subtext` | TextGeometry, Azeret Mono 500/9 | "data in here don't lie" |
| — | `Blurb` | TextGeometry, Inter 600/15 | "Only CRM stack you need" (hidden until click) |

**The trick**: the four inner cubes fly around/through the glass box; from the fixed orthographic near-isometric camera their gradient faces align with `Main`'s silhouette, so the assembly reads as a single cube whose faces carry color bands **and the inner cubes are authored to stay hidden behind/inside `Main` at every pose** (projection-verified: even the widest "spread" pose of `Cube 2` lands at NDC (0.03, −0.06) — inside Main's screen silhouette and depth-tied just behind its front face; only a ~3 px sliver grazes Main's top edge). Isolation test proved the construction: hiding `Main` exposes the four inner cubes as an interpenetrating cluster; hiding `Cube 1` changes **nothing**. Text objects float ~100 units *in front* of the cube (z≈101), perspective-aligned so they look "printed" on faces. Postprocessing **is** enabled in the publisher payload — bloom 0.3 / threshold 0.257 / blurScale 0.91 plus a grade pass (brightness −0.278) — and so is fog (`near 1423.758` / `far 1987.781`, use-background-color), which is what fades the grid to the horizon. Background is flat `#C2DCFA`. *(Corrected 2026-09-28 against a live runtime probe — an earlier draft claimed "no postprocessing, fog off".)*

**What actually moves on screen**: the macro composition is rock-stable across the whole loop (filmstrip confirms). The visible "animation" is: the noise shimmer/churn of Main's holographic material, the slow inner gradient murmur read through Main's translucent shell as the hidden cubes move, the Base's matcap sheen rotation (181°→87°), the drifting point-light pools on the grid, the Prism floor streak, and the click reveal (camera orbit+zoom, whoosh, headline). It is a calm "living brand object", not a moving-object scene.

## 2. Camera & staging

- `Camera` (id 474c04ff, **OrthographicCamera**): position (530.47, 489.44, 592.35), rotation (-28.26°, 37.39°, 18.08°) — note the ~18° roll, that's part of the look; `orthographic.zoom = 0.9753`, near -100000, far 100000.
- `ownerCamera` (editor default, unused for playback): (593.5, 655.7, 554.7), rot (-45°, 35.3°, 30°).
- Ambient: a flat `AmbientLight` — gray 0.827451 × 0.75 (no hemisphere; no 0.509 value exists in the payload), soft shadows.
- `Directional Light`: white, intensity 0.8, pos (966.4, 529.3, 254.9), shadow map 1024, penumbra 0.84, radius 0.81.
- 3 × PointLight (`Point Light`, `2`, `3`) sitting low to the left of the slab — they make the moving light pools on the grid.
- Grid floor material = two crossed `pattern` layers, style "lines", frequency [1, 50], size 0.01, colorA `rgba(0, 0.243, 1, 0.3)`, colorB transparent, one layer rotated 90°.
- Parent group `Cubes` at (0.565, 97.035, 6.796). World: `Main` object position (0.6, 44.6, 1.0) — geometry origin is on the **bottom face**, so the body spans y 44.6→193.7, resting on the plinth; `Base` spans y 0→45. *(Corrected — position is not the center.)*

## 3. Materials (Spline layered-material stacks — the real visual engine)

Every material is a **stack of shader layers** with blend `mode`, `alpha`, and optional `isMask`. Recreate these as one custom shader per object family.

**Main Material** (~8 layers): 2 × `noise` (colorA brand blue `#1666AF` / colorB crimson `rgb(.761,.086,.272)` / colorC amber `rgb(.778,.620,.080)`, smoothness 0.3, noiseType 4, scale 1.37, move 4.1, size 100³, alpha 0.32) + `fresnel` (blue `rgb(0,.318,.889)`, intensity 2) + `matcap` photo-texture (image `7b83617b`, alpha 0.24) + `light`/phong (alpha 0.6) + color layers. Animation tweaks the noise scale/move/alpha → liquid holographic shimmer.

**Cube Material** (shared uuid, cloned per cube): 3 × `depth` gradient layers — 2-stop smooth vector gradients, stops e.g. `[0.104, 0.255]`, `[0.104, 0.346]`, `[0.261, 0.373]`, each with an origin vector (`[-2,-15,10]`, `[14,17,-2]`, `[9,-14,-67]`) — plus `light` specular + white `color`. The converge-state tween animates the stop positions and origins too → the bands sweep as the cube flies.

**Base Material**: fresnel black + 3 matcaps (`61a09fba` α0.6, `matcap_0` α1, `matcap_5` tinted gray α0.5) + light-gray color α0.32 + phong α0.6 + **transmission** `rgb(0, .424, 1)` (blue glass rim). Animated: matcap rotation 181° → 87°.

**Logo Material** (`55ab9a41`, on the 5 ALPHA letters): matcap `7b83617b` α0.6 + phong α0.6 (alphaOverride 0.9) + white α0.9.
**Subtext**: matcap + phong (silver mono text). **Blurb**: phong + white color layer with **alpha 0** (invisible until its state).
**Plane**: the 2 line patterns. **Prism Effect**: `depth` layer as **mask** (stops 0→1) + matcap + phong α0.6.

Textures in the scene (extractable): `7b83617b` "Untitled Image" 139 KB (the iridescent gradient/matcap photo), `61a09fba` 16 KB, `matcap_4` 42 KB, `matcap_5` 53 KB, `matcap_reflection` 48 KB.

## 4. Animation — a tiny event/tween state machine

Everything is `Start` events with `Transition` tweens (duration / delay / easing / repeat / direction) driving **states**. Observed live (28 s sampling @ 0.4 s):

**The four inner cubes** — Start → tween to shared state `57a8cefc` (they converge from spread poses into the glass box, ~8 s, easing 4) + infinite `pingpong` (`repeat -1`, 1000 ms) idle. Net effect: each cube then oscillates between its **spread** pose and **converged** pose on a ~16 s cycle (8 s each way). Only `Cube 2` carries a real delay (8000 ms); C1/C3/Small share one 0-delay envelope — their differing arcs come from differing **poses**, not phase offsets; scale pulses (Cube1 1↔0.7, Cube2/3 0.3↔0.7, Small 0.3↔0.4); rotations swing up to ~180° on all axes.
Converged local poses (in `Cubes` space): C1 (27.6, -12.9, 14.3) rot(30.9°, -14.7°, -12°) s0.7 · C2 (-37, -31.7, -52.2) s0.7 · C3 (-11.9, 43, 37.6) s0.7 · Small (-28.3, -75.9, 55.9) s0.4.

**`Main`** — static transform; only its material state (`49391770`) animates. Its 8 s material tween is `runMode: Once`; the **continuous** churn is the 1 s pingpong-rewind dither over those two states (not a 16 s cycle).
**`Base`** — 1 s pingpong-rewind idle + 4 s state (`9494db04`: matcap rotation 181°→87°, `runMode: Once` — holds at 87°, does not loop) + **ambient audio starts at t=0** (volume 0.5).
**Point lights** — Start: fade-in ~1 s, then after an ~8 s delay a 4 s move to their state position (e.g. PL: (-121.5, 11.4, 68.5) → (-88.7, 24, 27.7)), then `pingpong-rewind` drift tweens (12 s / 8 s / 6 s) — but their target state ids are **undefined** in the payload and the 28 s sample shows each light holding its state pose for the full 16 s after the move, so the drift is effectively invisible: ship it **default-off**. *(Corrected — the pools are static after the initial move.)*
**Prism Effect / Plane** — idle loops only.

**Click / tap (MouseUp on canvas) — the interactive reveal:**
1. `Camera` toggles (runMode **Toggle**) → state `7eb41845`: position (-671.4, 471.1, 641.6), rotation (-31.29°, -41.97°, -22.12°), **zoom 2.4555** (2.5×), duration 6000 ms, custom bezier (0.669, 0.223)/(0.320, 1.0). i.e. the camera **orbits ~80° around** to the other side and zooms in. Next click toggles back (1 s).
2. `Directional Light` toggles to its state (889.1, 443.1, 432.6) over 8 s (same bezier) → shadows flip sides.
3. `Blurb` **Conditional event** (condition: camera IS in state `7eb41845`): plays the whoosh audio (delay 4 s, vol 0.3) and fades "Only CRM stack you need" in (reset 1 s; state: alpha 0→1, z 98.66→101.10; delay 3 s, duration 3 s, easing 4). So: click → ~10 s later the heading is fully revealed.

**Audio summary**: `b33427af` bg (played by Base at start, vol 0.5; a second scheduled copy at +8 s vol 0.2 via the Blurb conditional) + `bf58f459` whoosh (on the click condition, +4 s). Both MP3s are extracted in this folder. (Browsers require a user gesture before playback — wire an "enable sound" affordance in the recreation.)

## 5. Recreation notes (three.js mapping)

- Camera: `OrthographicCamera` with the exact pose + zoom; keep the roll, it's part of the look. Orbit-on-tap = tween between the two decoded poses with the same duration/bezier.
- Geometry: `Main`/`Base` decode as Spline `RectangleGeometry` — a 200×200 rounded rect (r 16) extruded 149.07 / 45 with `extrudeBevelSize` 4 (4 segments), **origin on the bottom face** (not a centered `RoundedBoxGeometry`; in three.js either extrude a rounded-rect shape or offset a rounded box by half its depth). Inner cubes 120.086×111.43×120.086 (3.3% squashed on Y). *(Corrected against the payload.)*
- Materials: one shader per family — vector/object-space depth gradients (2-stop, animated), fbm noise (scale 1.37, speed 4.1), fresnel rim (blue, intensity 2), matcap sampling (extract the 6 embedded images — includes `matcap_0`), multiply/screen blend stack. Postprocessing: bloom 0.3 / threshold 0.257 / blurScale 0.91 + brightness −0.278 (UnrealBloom + grade pass, or material-side approximation); fog on (`near 1423.758` / `far 1987.781`). *(Corrected — not "no postprocessing".)*
- Grid: infinite plane + 2 crossed line patterns (freq 50, `rgba(0,0.243,1,0.3)`, 1% size lines).
- Timeline: port durations/delays/easings 1:1 (easing 4 ≈ smooth in-out cubic; camera bezier above). The 16 s oscillation loops are the heart of the "alive" feel; keep phase offsets per cube.
- Overlays: keep text meshes floating ~100 units in front aligned to the camera, not decals — simplest faithful approach is flat planes parallel to the cube's faces + `depthWrite` care.
- Deliverable feel to match: matte white top, iridescent flanks, soft blue shadow, drifting light pools, whisper-quiet microcopy, one interactive reveal (orbit + headline + whoosh).

## 6. Method appendix (how this was extracted)

1. Page fetched (8.3 MB); scene bytes live inline in `app.start([...])` → extracted to `illusioncube.splinecode` (2.33 MB, msgpackr + "structures/records" extension, ext codes: 0x72 object block, else fixed-ext stubs).
2. Decoded with npm `msgpackr` + permissive extension handlers → `mp_scene.json` (root: schema / scene / frames / shared / version).
3. Full dump of transforms, geometry, material layer stacks, states and events → `scene_tree.txt` (588 lines).
4. Live verification: runtime 1.9.62 + scene loaded in a local harness page; per-object isolation screenshots; 28 s @ 0.4 s transform sampling; canvas-click test; pixel-diff of hide-stages.
5. Assets (audio, screenshots, GIF) extracted/written as above.
