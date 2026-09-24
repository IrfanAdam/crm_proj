# prototype/gems — the portable gem core (python twin)

One procedural cut, many renderers. The geometry lives in a single pure module per
runtime; everything after it — camera, material, environment, output — is a replaceable
adapter. Nothing downstream knows how the cut was built, so the cut can be upgraded
without touching a renderer.

## The portable core: one cut, two runtimes

| file | runtime | role |
| --- | --- | --- |
| `src/components/GemReward/gem-cut.js` | browser | cut math, zero DOM / zero THREE |
| `prototype/gems/gem_cut.py` | python | cut math, zero numpy / zero PIL |

Same data (`CUT` dims, `CATEGORIES` token + hue + spin), same expressions, same vertex
order: `gemCut(cut) -> {positions, cells}` ⇄ `gem_cut(cut) -> (positions, cells)`.
`positions` are `[x, y, z]` (y is up), `cells` are index triples, one per triangle.
Parity is asserted numerically at 1e-9 by the cut core's own parity check (see the header
of `gem_cut.py`; the check file lands with the JS cut upgrade).

## Renderer adapters (replaceable by design)

| adapter | engine | file | output |
| --- | --- | --- | --- |
| three.js | WebGL, MeshPhysicalMaterial | `src/components/GemReward/gem3d.js` | `canvas[data-gem]` |
| optics | the shipped material + stage numbers (no pixels) | `prototype/gems/gem_optics.py` | — |
| numpy | software z-buffer, same material as the browser | `prototype/gems/soft_render.py` | float RGB + coverage |
| sheet | PIL photography (card, shadow, labels) | `prototype/gems/render_gems.py` | `gems-preview.png` |

Every adapter consumes `positions` / `cells` plus one base colour, the stone's `ior` and the
stage colour; `gem_optics.py` holds the material numbers the two runtimes must agree on.

## How to port to a new engine (Blender, Unity, a shader, SVG)

1. get `positions` + `cells` from the core (JS or python) — that is the whole contract.
2. per face: normal = normalised Newell area vector of its vertices; flip it outward when
   `normal · centroid < 0` (holds for convex cuts, no winding assumptions).
3. fan-triangulate any n-gon cell and keep the face normal for all of its triangles —
   flat facets are the look, not an approximation to hide.
4. camera: orthographic-ish, ~15° elevation, 3/4 azimuth; project to (right, up) and keep
   forward as depth for the z-buffer.
5. material — the shipped recipe: refract the view ray at the entry facet, march `thickness`
   (0.9) through the stone, sample the stage backdrop at the projected exit point and
   attenuate it Beer-Lambert style (`attenuationColor` = base lerped 30% toward white, over
   `attenuationDistance` 0.6). Add the flat-facet surface — mirror env, fresnel rim, tight
   key glint, thin-film sheen — then ACES-tone-map at exposure 0.95.
6. fire: sample that march three times at `ior` ×0.985 / 1.0 / 1.015 and take R/G/B from each
   sample. Supersample 2x, box-filter down, composite over the light stage card.

`soft_render.py` (camera + rasteriser) and `gem_optics.py` (material + stage) are the
reference implementation of exactly those six steps.

## File map (`prototype/gems/`)

- `gem_cut.py` — python twin of the cut: `CUT`, `CATEGORIES`, `FALLBACK`, `gem_cut()`,
  `resolve_colors(css_path)` (reads exact token hexes out of `design-system/tokens.css`).
- `gem_optics.py` — the material + stage, runtime-free: Snell refraction, Beer-Lambert
  attenuation, the thin-film sheen, ACES, and the light stage backdrop.
- `soft_render.py` — numpy adapter: orthographic camera, per-face normals, z-buffer
  rasteriser, and the transmission march that samples the stage per channel.
- `render_gems.py` — the sheet: 2x2 studio tiles, soft elliptical contact shadow, labels,
  writes `gems-preview.png`.
- `gem-shot.mjs` — rating rig: headless Chrome screenshot + DOM probe for the browser
  adapter (full page + `--clip <selector>` crops, `--scale`, `--wait`, JSON summary of
  three.js revision, mounted `canvas[data-gem]`, 404s and console errors).
- `gems-preview.png` — the current sheet (regenerate, never hand-edit).

## Run each piece

```sh
python3 prototype/gems/render_gems.py    # → gems-preview.png (~0.4s; numpy + PIL only)
node prototype/gems/gem-shot.mjs <url> <outdir> [--clip <sel>] [--scale 2] [--wait 3500]
                                         # → <outdir>/full.png, clip-N.png, JSON probe
```

`render_gems.py` needs no venv and no matplotlib — the old matplotlib face renderer is
gone; numpy does the rasterising and PIL does the compositing.

## Status and known limits

- The cut cores agree: 48 silhouette columns → 136 verts / 268 faces, built from the vivid
  `-400` ramp (`#218aea`, `#ffb01e`, `#a54cff`, `#ea005e`) on both sides; `parity_check.py`
  asserts the vertex order at 1e-9.
- The software twin now runs the shipped material: a refracted march of `thickness` (0.9)
  through the stone, Beer-Lambert attenuation (`attenuationColor` / `attenuationDistance`
  0.6), per-stone `ior`, ACES at exposure 0.95, and the thin-film sheen. Facets are still
  single-bounce: no interior total-internal-reflection paths and no caustics, so the fire is
  per-facet colour rather than a traced sparkle.
- The refraction is sampled three times (`ior` ×0.985 / 1.0 / 1.015, R/G/B from each sample),
  but on this smooth stage the three exits land ~2 px apart, so the fringe measures ≈0.4/255
  in a still — the same reason it reads as fire in motion and not in a frame.
- Colours come from `design-system/tokens.css`; a missing token falls back to the hexes
  in `gem_cut.py`'s `FALLBACK`, so the sheet always renders. The stage base is the
  `--bg-interactive` token, resolved through its `var()` chain by `render_gems.py`.
