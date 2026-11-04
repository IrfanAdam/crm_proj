/* ADAM/SHARED — src/components/GemReward/gem-cut.js · portable brilliant-cut */
// [plan:2026-10-03_144222-gem-realism-round2.md#phase-9] · real facet wiring (Task 19).
// — CUT: girdle = girdle RADIUS · table/crown/pavilion/star/culet = × girdle · band = girdle band height ·
//   star = star-tip position along the bezel (0 = table edge, 1 = girdle) · lower = lower-girdle meet
//   depth (× pavilion) —
// — Cut: octagon table · 8 star · 8 bezel kites · 16 upper-girdle · ROUND girdle (48 segments) · 8 pavilion
//   mains · 16 lower-girdle · small culet octagon — 16 flat facets on a round outline, closed + manifold.
// — Girdle: the 16 facet corners sit ON the circle at ±band/2; the 48-segment ring between them follows each
//   facet's own plane, so the silhouette is a 48-gon (round) while every facet stays exactly ONE plane and
//   the band is a real girdle — not a 16-sided belt, not a 48-column sliver fan.
// Export map: window.GEM_CUT = { CUT, CATEGORIES, gemCut(cut) } — zero DOM, zero THREE,
// deterministic (no Math.random); prototype/gems/gem_cut.py mirrors it, parity_check.py
// asserts identical vertex order + ≤1e-9. CATEGORIES also carries the legacy kebab alias;
// ior = real refractive index (ordinary ray) per stone — sapphire 1.77 · quartz 1.545 · red beryl 1.577.
window.GEM_CUT = {
CUT: { facets: 16, girdle: 1, table: 0.55, crown: 0.32, pavilion: 0.86, band: 0.055, star: 0.5, lower: 0.72, culet: 0.06 },
CATEGORIES: {
sapphire: { token: '--primitive-sapphire-ui-400', hue: 0, spin: 0.35, ior: 1.77 },
citrine: { token: '--primitive-citrine-400', hue: 38, spin: 0.3, ior: 1.545 },
amethyst: { token: '--primitive-amethyst-400', hue: 265, spin: 0.4, ior: 1.545 },
redberyl: { token: '--primitive-red-beryl-400', hue: 310, spin: 0.5, ior: 1.577 },
},
gemCut: function (cut) {
const g = cut.girdle, h = cut.band / 2, S = 3, n = 16 * S;
const tabR = g * cut.table, rCu = g * cut.culet;
const c22 = Math.cos(Math.PI / 8), yTab = h + cut.crown;
const yMid = h + cut.crown * (1 - cut.star);
const rMid = (tabR + (g - tabR) * cut.star) / c22;
const dLow = cut.pavilion * cut.lower, pav = cut.pavilion - h;
const meetR = (pav * g + (g - rCu * c22) * (h - dLow)) / (pav * c22);
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
const mid = ring(8, rMid, yMid, 0.5 / 8);
const gt = ring(16, g, h);
const gb = ring(16, g, -h);
const low = ring(8, meetR, -dLow, 0.5 / 8);
const cu = ring(8, rCu, -cut.pavilion, 0.5 / 8);
const GT = pos.length;
for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2; pos.push([Math.cos(a) * g, h, Math.sin(a) * g]); }
const GB = pos.length;
for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2; pos.push([Math.cos(a) * g, -h, Math.sin(a) * g]); }
const cells = [];
const tri = function (a, b, c) { cells.push([a, b, c]); };
for (let i = 1; i < 7; i++) tri(tab, tab + i + 1, tab + i);
for (let k = 0; k < 8; k++) {
const t0 = tab + k, t1 = tab + (k + 1) % 8, s = mid + k, s0 = mid + (k + 7) % 8, m = GT + 2 * S * k;
tri(t0, t1, s);
tri(t0, s, m);
tri(t0, m, s0);
for (let q = 0; q < 2 * S; q++) tri(s, GT + (2 * S * k + q + 1) % n, GT + (2 * S * k + q) % n);
}
for (let i = 0; i < n; i++) {
const j = (i + 1) % n;
tri(GT + i, GT + j, GB + j);
tri(GT + i, GB + j, GB + i);
}
for (let k = 0; k < 8; k++) {
const b0 = GB + 2 * S * k, p = low + k, pl = low + (k + 7) % 8, c = cu + k, cl = cu + (k + 7) % 8;
for (let q = 0; q < 2 * S; q++) tri(GB + (2 * S * k + q) % n, GB + (2 * S * k + q + 1) % n, p);
tri(b0, p, c);
tri(b0, c, cl);
tri(b0, cl, pl);
}
for (let i = 1; i < 7; i++) tri(cu, cu + i, cu + i + 1);
return { positions: pos, cells: cells };
},
};
Object.defineProperty(window.GEM_CUT.CATEGORIES, 'red-beryl', { value: window.GEM_CUT.CATEGORIES.redberyl });
