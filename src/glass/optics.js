/* ADAM/GLASS — src/glass/optics.js · shared optical constants for both dock engines */
// Exports: OPTICS (SDF lens tune) · TOP_OPTICS (vendor Glass tune) · PULL (slices px)

// — Section — Dock lens optics (clear crystal, not milky) —
// The whole look lives here; retune here, not in CSS. Frost stays tiny because
// the dock's backdrop-filter already supplies material frost (frost 6-10 at
// bg 60%+ reads as frosted plastic, rejected).
export const OPTICS = {
  bleed: 18,
  band: 10,
  pull: 1.0,
  frost: 1.2,
  strength: 3.2,
  dispersion: 0.3,
  saturate: 1.12,
  brightness: 1.01,
};

// — Section — Shell pills vendor-Glass tune —
// Clear crystal glass for the workspace TopPills: tiny frost veil, strong
// refraction (dispersion/bend/depth do the liquid work, not frost).
export const TOP_OPTICS = {
  frost: 2.2,
  dispersion: 0.22,
  strength: 0.05,
  depth: 0.52,
  curvature: 0.36,
  bend: 0.42,
  bendWidth: 0.16,
  saturate: 1.08,
  brightness: 0.01,
  specular: 0.72,
  sheen: 0.24,
  sheenWidth: 2.8,
  sheenFalloff: 1.5,
  sheenAngle: 38,
  glow: 0.08,
  glowSpread: 0.9,
  glowFalloff: 0.55,
};

// — Section — Slices engine pull (direct px, no SDF scale) —
// Signed displacement scale for a slice's copy: outward at its own rim, so the
// world just outside the shape is pulled in and compressed along the edge.
// WebKit slices take direct px with no SDF scale factor, so PULL must not share
// OPTICS.strength. iOS rims squeeze ~4-6px at the contour; the Chromium SDF path
// gets the same punch via OPTICS.pull x scale.
export const PULL = 7;
