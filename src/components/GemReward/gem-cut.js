/* ADAM/SHARED — src/components/GemReward/gem-cut.js · portable brilliant-cut */
// [plan:2026-10-03_144222-gem-realism-round2.md#phase-9] · real facet wiring (Task 19).
// — CUT: girdle = girdle RADIUS · table/crown/pavilion/star/culet = × girdle · band = girdle band height ·
//   starDrop = star-tip drop below the table (× crown) · lower = lower-girdle meet depth (× pavilion) —
// — Cut: octagon table · 8 star triangles · 8 bezel kites · 16 upper-girdle triangles · thin 16-gon girdle
//   band · 8 pavilion mains (kites) · 16 lower-girdle triangles · small culet octagon — 116 triangles.
// — Topology is 16-fold: the girdle is ONE ring of 16 shared vertices — bezel tips at 45k, star tips at
//   22.5+45k — so every facet is a facet. No 48-column fan, no scalloped break, no sliver triangles.
// Export map: window.GEM_CUT = { CUT, CATEGORIES, gemCut(cut) } — zero DOM, zero THREE,
// deterministic (no Math.random); prototype/gems/gem_cut.py mirrors it, parity_check.py
// asserts identical vertex order + ≤1e-9. CATEGORIES also carries the legacy kebab alias;
// ior = real refractive index (ordinary ray) per stone — sapphire 1.77 · quartz 1.545 · red beryl 1.577.
window.GEM_CUT = {
CUT: { facets: 16, girdle: 1, table: 0.55, crown: 0.32, pavilion: 0.86, band: 0.055, star: 0.775, starDrop: 0.5, lower: 0.72, culet: 0.06 },
CATEGORIES: {
sapphire: { token: '--primitive-sapphire-ui-400', hue: 0, spin: 0.35, ior: 1.77 },
citrine: { token: '--primitive-citrine-400', hue: 38, spin: 0.3, ior: 1.545 },
amethyst: { token: '--primitive-amethyst-400', hue: 265, spin: 0.4, ior: 1.545 },
redberyl: { token: '--primitive-red-beryl-400', hue: 310, spin: 0.5, ior: 1.577 },
},
gemCut: function (cut) {
const g = cut.girdle, h = cut.band / 2;
const tabR = g * cut.table, rCu = g * cut.culet;
const yTab = h + cut.crown, yMid = h + cut.crown * (1 - cut.starDrop);
const dLow = cut.pavilion * cut.lower;
const pav = cut.pavilion - h;
const cone = function (depth) { return g + (rCu - g) * (depth - h) / pav; };
const pos = [];
const ring = function (count, rad, y, off) {
const start = pos.length;
for (let i = 0; i < count; i++) {
const a = (i / count + (off || 0)) * Math.PI * 2;
pos.push([Math.cos(a) * rad, y, Math.sin(a) * rad]);
}
return start;
};
const tab = ring(8, tabR, yTab);
const mid = ring(8, g * cut.star, yMid, 0.5 / 8);
const gt = ring(16, g, h);
const gb = ring(16, g, -h);
const low = ring(8, cone(dLow), -dLow, 0.5 / 8);
const cu = ring(8, rCu, -cut.pavilion);
const cells = [];
const tri = function (a, b, c) { cells.push([a, b, c]); };
for (let i = 1; i < 7; i++) tri(tab, tab + i + 1, tab + i);
for (let k = 0; k < 8; k++) {
const t0 = tab + k, t1 = tab + (k + 1) % 8;
const s = mid + k, s0 = mid + (k + 7) % 8;
const m = gt + 2 * k, ml = gt + (2 * k + 1) % 16, mr = gt + (2 * k + 2) % 16;
tri(t0, t1, s);
tri(t0, s, m);
tri(t0, m, s0);
tri(s, ml, m);
tri(s, mr, ml);
}
for (let i = 0; i < 16; i++) {
const j = (i + 1) % 16;
tri(gt + i, gt + j, gb + j);
tri(gt + i, gb + j, gb + i);
}
for (let k = 0; k < 8; k++) {
const b0 = gb + 2 * k, bl = gb + (2 * k + 1) % 16, br = gb + (2 * k + 2) % 16;
const p = low + k, pl = low + (k + 7) % 8, c = cu + k;
tri(b0, bl, p);
tri(p, bl, br);
tri(b0, p, c);
tri(b0, c, pl);
}
for (let i = 1; i < 7; i++) tri(cu, cu + i, cu + i + 1);
return { positions: pos, cells: cells };
},
};
Object.defineProperty(window.GEM_CUT.CATEGORIES, 'red-beryl', { value: window.GEM_CUT.CATEGORIES.redberyl });
