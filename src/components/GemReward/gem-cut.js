/* ADAM/SHARED — src/components/GemReward/gem-cut.js · portable brilliant-cut */
// [plan:2026-09-21_000000-lump-sum-builds.md#phase-5] · pure cut math (Task 18).
// — CUT: facets = silhouette columns (16-fold, clamped ≥16) · girdle = girdle RADIUS ·
//   table/crown/pavilion/star/culet = × girdle (table 55% Ø · crown 16% Ø · pavilion 43% Ø) ·
//   band = thin girdle band height · starDrop = star tip below the table (× crown) ·
//   lower/scallop = lower-girdle break depth (× pavilion) at main edges / centres —
// — Cut: octagon table · 8 star · 8 bezel kites · upper-girdle fan · thin girdle band
//   (two close rings) · 8 pavilion mains · 16 lower-girdle facets · tiny culet ring —
// Export map: window.GEM_CUT = { CUT, CATEGORIES, gemCut(cut) } — zero DOM, zero THREE,
// deterministic (no Math.random); prototype/gems/gem_cut.py mirrors it, parity_check.py
// asserts identical vertex order + ≤1e-9. CATEGORIES also carries the legacy kebab alias;
// ior = real refractive index (ordinary ray) per stone — sapphire 1.77 · quartz 1.545 · red beryl 1.577.
window.GEM_CUT = {
CUT: { facets: 48, girdle: 1, table: 0.55, crown: 0.32, pavilion: 0.86, band: 0.055, star: 0.74, starDrop: 0.5, lower: 0.15, scallop: 0.75, culet: 0.06 },
CATEGORIES: {
sapphire: { token: '--primitive-sapphire-ui-400', hue: 0, spin: 0.35, ior: 1.77 },
citrine: { token: '--primitive-citrine-400', hue: 38, spin: 0.3, ior: 1.545 },
amethyst: { token: '--primitive-amethyst-400', hue: 265, spin: 0.4, ior: 1.545 },
redberyl: { token: '--primitive-red-beryl-400', hue: 310, spin: 0.5, ior: 1.577 },
},
gemCut: function (cut) {
const n = Math.max(16, cut.facets - cut.facets % 16);
const col = n / 8, brk = 16;
const g = cut.girdle, h = cut.band / 2;
const rCu = g * cut.culet, tabR = g * cut.table;
const dE = cut.pavilion * cut.lower, dO = dE * (1 + cut.scallop);
const cone = function (depth) { return g + (rCu - g) * (depth - h) / (cut.pavilion - h); };
const pos = [];
const ring = function (count, rad, y, off) {
const start = pos.length;
for (let i = 0; i < count; i++) {
const a = (i / count + (off || 0)) * Math.PI * 2;
pos.push([Math.cos(a) * rad, y, Math.sin(a) * rad]);
}
return start;
};
const tab = ring(8, tabR, h + cut.crown);
const star = ring(8, g * cut.star, h + cut.crown * (1 - cut.starDrop), 0.5 / 8);
const gt = ring(n, g, h);
const gb = ring(n, g, -h);
const br = pos.length;
for (let j = 0; j < brk; j++) {
const a = (j / brk) * Math.PI * 2;
const depth = j % 2 === 0 ? dE : dO;
const rad = cone(depth);
pos.push([Math.cos(a) * rad, -depth, Math.sin(a) * rad]);
}
const cu = ring(8, rCu, -cut.pavilion);
const cells = [];
const tri = function (a, b, c) { cells.push([a, b, c]); };
for (let i = 1; i < 7; i++) tri(tab, tab + i + 1, tab + i);
for (let k = 0; k < 8; k++) {
const c1 = tab + (k + 1) % 8, s = star + k;
const i0 = gt + k * col, i1 = gt + ((k + 1) % 8) * col;
tri(tab + k, c1, s);
tri(tab + k, s, i0);
tri(c1, i1, s);
for (let m = 0; m < col; m++) tri(s, gt + (k * col + m + 1) % n, gt + (k * col + m) % n);
}
for (let i = 0; i < n; i++) {
const j = (i + 1) % n;
tri(gt + i, gt + j, gb + j);
tri(gt + i, gb + j, gb + i);
}
const per = n / brk;
for (let j = 0; j < brk; j++) {
for (let m = 0; m < per; m++) tri(br + j, gb + (j * per + m) % n, gb + (j * per + m + 1) % n);
tri(gb + ((j + 1) * per) % n, br + (j + 1) % brk, br + j);
}
for (let k = 0; k < 8; k++) {
const a = br + (2 * k) % brk, b = br + (2 * k + 1) % brk, c = br + (2 * k + 2) % brk;
tri(cu + k, a, b);
tri(cu + k, b, c);
tri(cu + k, c, cu + (k + 1) % 8);
}
for (let i = 1; i < 7; i++) tri(cu, cu + i, cu + i + 1);
return { positions: pos, cells: cells };
},
};
Object.defineProperty(window.GEM_CUT.CATEGORIES, 'red-beryl', { value: window.GEM_CUT.CATEGORIES.redberyl });
