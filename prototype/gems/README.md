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
| numpy | software z-buffer, studio material | `prototype/gems/soft_render.py` | float RGB + coverage |
| sheet | PIL photography (card, shadow, labels) | `prototype/gems/render_gems.py` | `gems-preview.png` |

Every adapter consumes `positions` / `cells` plus one base colour and nothing else.

## How to port to a new engine (Blender, Unity, a shader, SVG)

1. get `positions` + `cells` from the core (JS or python) — that is the whole contract.
2. per face: normal = normalised Newell area vector of its vertices; flip it outward when
   `normal · centroid < 0` (holds for convex cuts, no winding assumptions).
3. fan-triangulate any n-gon cell and keep the face normal for all of its triangles —
   flat facets are the look, not an approximation to hide.
4. camera: orthographic-ish, ~15° elevation, 3/4 azimuth; project to (right, up) and keep
   forward as depth for the z-buffer.
5. material: base colour from the category token, Lambert diffuse + Blinn-Phong specular
   + fresnel rim, reflected against a two-tone studio env (bright above, dark below).
6. supersample 2x and box-filter down for clean edges; composite over a studio card.

`soft_render.py` is the reference implementation of exactly those six steps, in 100 lines.

## File map (`prototype/gems/`)

- `gem_cut.py` — python twin of the cut: `CUT`, `CATEGORIES`, `FALLBACK`, `gem_cut()`,
  `resolve_colors(css_path)` (reads exact token hexes out of `design-system/tokens.css`).
- `soft_render.py` — numpy adapter: orthographic camera, per-face normals, z-buffer
  rasteriser, two-tone studio material (diffuse + specular + fresnel + dispersion).
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

- `gem_cut.py` currently carries the round-brilliant upgrade: 32 facets → 104 verts /
  204 faces, and the vivid `-400` ramp (`#218aea`, `#ffb01e`, `#a54cff`, `#ea005e`).
  `gem-cut.js` and `gem3d.js` still build the older 16-facet cut (34 verts / 64 faces)
  with `-500` tokens until that upgrade lands — no adapter change is needed either way.
- Facets are opaque: the material fakes interior life with a bounce-card glow and an
  environment mirror, but there is no refraction, caustics or dispersion-by-ray. A
  ray-traced core would be the next step if true transparency is required.
- Colours come from `design-system/tokens.css`; a missing token falls back to the hexes
  in `gem_cut.py`'s `FALLBACK`, so the sheet always renders.
