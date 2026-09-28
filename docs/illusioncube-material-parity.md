# IllusionCube material parity — phase 3 (2026-09-28)

Why this exists: every decoded surface lands in its own file with the same
uniform names the animation phase will tween; this table is the lookup.
Pictures: `.hermes/tmp/illusion-parity/pass-3full/clip-0.png` (composite),
`iso-shell-hidden` (inners), `iso-inner-hidden` (hollow shell).

## Layer → uniform map

| Spline layer | File | Uniforms (decoded default) |
|---|---|---|
| Main noise A (brand→crimson→amber→magenta, screen, α .32) | illusion-shell.js | uScaleA 1.37, uMoveA 4.1, uAlphaA .32, uPal[0..3] |
| Main noise B (same ramp, α .32) | illusion-shell.js | uScaleB 1.78, uMoveB −.04, uAlphaB .32 |
| Main fresnel rim (rim-blue, ×2, bias .1) | illusion-shell.js | uPal[4], in fres() call |
| Main photo matcap (rot 39, α .24) | illusion-shell.js | uPhoto, uMatRot 39° |
| Main matcap 4 (α .54) / matcap 5 × sheen-gray (α .24) | illusion-shell.js | uM4, uM5, uPal[8] |
| Main reflection band (size ~[80,20], axis y) | illusion-shell.js | uRefl, band in shader |
| Main sheen lobe (photo, rot −210, shininess 40, α .6) | illusion-shell.js | uPhoto, fixed −210° |
| Main glass wash (lo→mid→hi) + surface alpha | illusion-shell.js | uPal[5..7], uOpacity .55 |
| Cube band 1, x-axis (amethyst→plum, stops .1038/.2546) | illusion-inner.js | uO1(−2,−15,10) uN1 61.15 uF1 200 uS1 uC1a/b |
| Cube band 2 (white α0→citrine, stops .1038/.3462) | illusion-inner.js | uO2(14,17,−2) uN2 45.15 uF2 200 uS2 uC2a/b |
| Cube band 3 (redberyl α0→redberyl-500, ×, stops .2615/.373) | illusion-inner.js | uO3(9,−14,−67) uN3 94.15 uF3 199 uS3 uC3a/b |
| Cube phong lift (shininess 10) + white wash | illusion-inner.js | fixed light dir, in shader |
| Base fresnel black (overlay, ×2, bias .1) | illusion-base.js | in shader |
| Base sheen matcap (rot 181→87, overlay, α .6) | illusion-base.js | uSheen, uSheenRot 181° |
| Base matcap 0 (screen, α 1) / matcap 5 × sheen-gray (screen, α .5) | illusion-base.js | uM0, uM5, uTint |
| Base gray body (multiply, α .32) | illusion-base.js | uGray |
| Prism mask × photo matcap (rot −227, α .32) | illusion-prism.js | uTex, uRot −227°, uAlpha .32 |
| Wordmark ALPHA (5 glyphs, α .9) / subtext (α .6) / blurb (α 0) | illusion-overlay.js | material.uniforms.uAlpha |

## Proven

- Textures: six JPEGs byte-exact (139710/16456/44587/42057/53103/48098 B),
  4×1024² + 427² + 1080², sRGB, anisotropy max; `--check` green.
- Tokens: 14 `--primitive-illusion-*` in tokens.css, lint:tokens green.
- Noise trio byte-identical to cube-core.js after whitespace normalisation.
- Inner uniforms independent per cube (uS1 object identity differs).
- Blurb invisible at uAlpha 0; overlay 7 children; fog on.

## Approximations (tune or follow-up, not blockers)

- Blend modes 0/1/2/3 → normal/multiply/screen/overlay is INFERRED.
- Shell band y position and white inner layer (as fresnel lift) placed by eye.
- uOpacity .55 tuned by eye (no decoded final-surface value).
- Overlay: 51.44 pitch exact; glyph size/row height by eye; system mono
  stands in for Azeret Mono (needs a font-file follow-up).
- Custom shaders neither receive shadows nor tone-map; the key light shapes
  them through analytic terms only (shadow-receive is a follow-up).
- Fixes this phase: MATCAP chunk takes vec2 (vec2→vec3 never converts —
  it black-screened shell/base/prism); overlay group added to the scene;
  prism tag moved after gl.js (its new ILLUSION_GL dependency).
