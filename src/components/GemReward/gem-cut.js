/* ADAM/SHARED — src/components/GemReward/gem-cut.js · portable brilliant-cut
   [plan:2026-10-03_144222-gem-realism-round2.md#phase-9] · real facet wiring (Task 19/20).
   CUT: girdle=RADIUS, table/crown/pavilion/star/culet×girdle, band height, lower meet, bevelMin/Max/Apex,
   tipPhi = star-tip azimuth offset from its table corner (22.5 = mirror kite), bezelT = wide tip's station
   along the bezel (0 table → 1 girdle), tipVar = alternating radius fraction. Octagon table · 8 star · 8 bezel kites · 16 upper · 48 girdle ·
   8 mains · 16 lower · culet. Tip heights solve det(S_k−T,M−T,S_{k−1}−T)=0 (8×8 cyclic); junction columns at (g−bevelMin,±h) make both crown fans one plane. Export window.GEM_CUT; gem_cut.py mirrors it. */
window.GEM_CUT = {
CUT: { facets: 16, girdle: 1, table: 0.555, crown: 0.305, pavilion: 0.8845, band: 0.05, star: 0.5, lower: 0.80, culet: 0.012, bevelMin: 0.0012, bevelMax: 0.0097, bevelApex: 0.55, tipPhi: 22.8, bezelT: 0.383, tipVar: 0 },
CATEGORIES: {
sapphire: { token: '--primitive-sapphire-ui-400', hue: 0, spin: 0.35, ior: 1.77 },
citrine: { token: '--primitive-citrine-400', hue: 38, spin: 0.3, ior: 1.545 },
amethyst: { token: '--primitive-amethyst-400', hue: 265, spin: 0.4, ior: 1.545 },
redberyl: { token: '--primitive-red-beryl-400', hue: 310, spin: 0.5, ior: 1.577 },
},
gemCut: function (cut) {
const g = cut.girdle, h = cut.band / 2, S = 3, n = 16 * S;
const tabR = g * cut.table, rCu = g * cut.culet, c8 = Math.cos(Math.PI / 8), yTab = h + cut.crown;
const dLow = cut.pavilion * cut.lower, pav = cut.pavilion - h;
const meetR = (pav * g + (g - rCu * c8) * (h - dLow)) / (pav * c8);
const bMin = cut.bevelMin, bMax = cut.bevelMax, yCon = cut.bevelApex * g;
const phiT = cut.tipPhi * (Math.PI / 180), tVar = cut.tipVar || 0, rTip = [], rT = (tabR + (g - tabR) * cut.bezelT) / Math.cos(phiT);
for (let k = 0; k < 8; k++) rTip.push(rT * (1 + (k % 2 ? tVar : -tVar)));
const rJun = g - bMin, pos = [];
const ring = function (count, rad, y, off) {
const start = pos.length;
for (let i = 0; i < count; i++) { const a = (i / count + (off || 0)) * Math.PI * 2; pos.push([Math.cos(a) * rad, y, Math.sin(a) * rad]); }
return start;
};
const plane = function (a, b, c) {
const u = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], w = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
const nx = u[1] * w[2] - u[2] * w[1], ny = u[2] * w[0] - u[0] * w[2], nz = u[0] * w[1] - u[1] * w[0];
const L = Math.sqrt(nx * nx + ny * ny + nz * nz);
return [[nx / L, ny / L, nz / L], -(nx * a[0] + ny * a[1] + nz * a[2]) / L];
};
const yat = function (pl, r, phi) { return (-pl[1] - r * (pl[0][0] * Math.cos(phi) + pl[0][2] * Math.sin(phi))) / pl[0][1]; };
const crownPlanes = function (ty) {
const out = [];
for (let kf = 0; kf < 16; kf++) {
const k = Math.floor(kf / 2), a0 = kf * Math.PI / 8, a1 = (kf + 1) * Math.PI / 8, ac = k * Math.PI / 4 + phiT;
out.push(plane([rTip[k] * Math.cos(ac), ty[k], rTip[k] * Math.sin(ac)], [rJun * Math.cos(a0), h, rJun * Math.sin(a0)], [rJun * Math.cos(a1), h, rJun * Math.sin(a1)]));
}
return out;
};
const solve8 = function (A, B, C) {
const m = [];
for (let r = 0; r < 8; r++) m.push([0, 0, 0, 0, 0, 0, 0, 0, 0]);
for (let k = 0; k < 8; k++) { m[k][k] += A[k]; m[k][(k + 7) % 8] += B[k]; m[k][8] = C[k]; }
for (let col = 0; col < 8; col++) {
let piv = col;
for (let r = col + 1; r < 8; r++) if (Math.abs(m[r][col]) > Math.abs(m[piv][col])) piv = r;
if (Math.abs(m[piv][col]) < 1e-15) throw new Error('singular tip-height system');
const row = m[col]; m[col] = m[piv]; m[piv] = row;
const pv = m[col][col];
for (let r = col + 1; r < 8; r++) { const f = m[r][col] / pv; if (f !== 0) for (let cc = col; cc <= 8; cc++) m[r][cc] -= f * m[col][cc]; }
}
const y = [0, 0, 0, 0, 0, 0, 0, 0];
for (let r = 7; r >= 0; r--) { let s = m[r][8]; for (let cc = r + 1; cc < 8; cc++) s -= m[r][cc] * y[cc]; y[r] = s / m[r][r]; }
return y;
};
const cph = Math.cos(phiT), sph = Math.sin(phiT), cps = Math.cos(Math.PI / 4 - phiT), sps = Math.sin(Math.PI / 4 - phiT), dTab = rJun - tabR, eY = h - yTab, A = [], B = [], C = [];
for (let k = 0; k < 8; k++) {
const rk = rTip[k], rp = rTip[(k + 7) % 8], a = rk * cph - tabR, c = rk * sph, p = rp * cps - tabR, s = -rp * sps;
A.push(dTab * s); B.push(-c * dTab); C.push(a * eY * s - c * eY * p + (A[k] + B[k]) * yTab);
}
const yTip = solve8(A, B, C), tab = ring(8, tabR, yTab), mid = pos.length;
for (let k = 0; k < 8; k++) { const ac = k * Math.PI / 4 + phiT; pos.push([rTip[k] * Math.cos(ac), yTip[k], rTip[k] * Math.sin(ac)]); }
const low = ring(8, meetR, -dLow, 0.5 / 8), cu = ring(8, rCu, -cut.pavilion, 0.5 / 8), pls = crownPlanes(yTip), cols = [];
for (let i = 0; i < n; i++) {
const phi = (i / n) * Math.PI * 2, kf = Math.floor(i / S), k = Math.floor(kf / 2);
const a0 = kf * Math.PI / 8, a1 = (kf + 1) * Math.PI / 8, ac = (k + 0.5) * Math.PI / 4, cp = Math.cos(phi), sp = Math.sin(phi), pc = pls[kf];
const pp = plane([meetR * Math.cos(ac), -dLow, meetR * Math.sin(ac)], [g * Math.cos(a0), -h, g * Math.sin(a0)], [g * Math.cos(a1), -h, g * Math.sin(a1)]);
const w = bMin + (bMax - bMin) * (1 - Math.cos(16 * phi)) / 2, rt = g - w;
const gy = (i % S === 0) ? h : yat(pc, rt, phi), py = yat(pp, rt, phi);
cols.push([[rt * cp, gy, rt * sp], [g * cp, yCon + (g / rt) * (gy - yCon), g * sp], [g * cp, -yCon + (g / rt) * (py + yCon), g * sp], [rt * cp, py, rt * sp]]);
}
const GT = pos.length, BT = GT + n, BB = GT + 2 * n, GB = GT + 3 * n; for (let q = 0; q < 4; q++) for (let i = 0; i < n; i++) pos.push(cols[i][q]);
const cells = [], tri = function (a, b, c) { cells.push([a, b, c]); };
for (let i = 1; i < 7; i++) tri(tab, tab + i + 1, tab + i);
for (let k = 0; k < 8; k++) {
const t0 = tab + k, t1 = tab + (k + 1) % 8, s = mid + k, s0 = mid + (k + 7) % 8, m = GT + 2 * S * k;
tri(t0, t1, s); tri(t0, s, m); tri(t0, m, s0);
for (let q = 0; q < 2 * S; q++) tri(s, GT + (2 * S * k + q + 1) % n, GT + (2 * S * k + q) % n);
}
for (let i = 0; i < n; i++) {
const j = (i + 1) % n;
tri(GT + i, GT + j, BT + j); tri(GT + i, BT + j, BT + i);
tri(BT + i, BT + j, BB + j); tri(BT + i, BB + j, BB + i);
tri(BB + i, BB + j, GB + j); tri(BB + i, GB + j, GB + i);
}
for (let k = 0; k < 8; k++) {
const b0 = GB + 2 * S * k, p = low + k, pl = low + (k + 7) % 8, c = cu + k, cl = cu + (k + 7) % 8;
for (let q = 0; q < 2 * S; q++) tri(GB + (2 * S * k + q) % n, GB + (2 * S * k + q + 1) % n, p);
tri(b0, p, c); tri(b0, c, cl); tri(b0, cl, pl);
}
for (let i = 1; i < 7; i++) tri(cu, cu + i, cu + i + 1);
return { positions: pos, cells: cells };
},
};
Object.defineProperty(window.GEM_CUT.CATEGORIES, 'red-beryl', { value: window.GEM_CUT.CATEGORIES.redberyl });
