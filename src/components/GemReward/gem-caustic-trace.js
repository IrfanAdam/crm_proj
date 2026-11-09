/* ADAM/SHARED — src/components/GemReward/gem-caustic-trace.js · per-stone facet caustic field */
// [plan:2026-10-03_144222-gem-realism-round2.md#phase-13 Task 33] — n / disp / sig / streak / gain come from
// — GEM_OPTICS.of(stone).caus on EVERY call (the splat kernel owns its sig key); the three spectral channels land
// — and splat separately, so the R−B fringe IS the traced dispersion; the streak core stays achromatic (ONE glow).
// — field(G,P,stone) also returns the chief ray's floor point (cx,cz) and the landing spread sp.
(function () {
if (!window.THREE) return;
const FALL = { n: 2.4, disp: 0.06, sig: 5.2, streak: 0.42, gain: 1 }, S = 160, SPAN = 2.4, ENV = 0.86, CSX = 0.52, CSZ = 0.44, RAD = (S / 2) / SPAN, CH = [0, 0, 0], LAND = [0, 0, 0];
const recOf = function (name) { const o = window.GEM_OPTICS, r = o && o.of(name); return (r && r.caus) || FALL; };
const LN = Math.hypot(3, 5, 4), LX = 3 / LN, LY = 5 / LN, LZ = 4 / LN, DX0 = -LX, DY0 = -LY, DZ0 = -LZ;
const { poseOf, smoothstep } = window.GEM_CAUSTIC_TRACE_EXT;
const geomKey = function (G) { return G.cells.length + ':' + G.positions.length + ':' + G.positions[0].join(','); };
const FACETS = {};
const facetsOf = function (G) {   // cached cut facets: centroid / outward normal / area, pavilion only
const k = geomKey(G); if (FACETS[k]) return FACETS[k];
const P_ = G.positions, out = []; for (let i = 0; i < G.cells.length; i++) {
const c = G.cells[i], a = P_[c[0]], b = P_[c[1]], e = P_[c[2]];
const e1x = b[0] - a[0], e1y = b[1] - a[1], e1z = b[2] - a[2], e2x = e[0] - a[0], e2y = e[1] - a[1], e2z = e[2] - a[2];
let nx = e1y * e2z - e1z * e2y, ny = e1z * e2x - e1x * e2z, nz = e1x * e2y - e1y * e2x;
const l = Math.hypot(nx, ny, nz) || 1; nx /= l; ny /= l; nz /= l; if (ny > -0.04) continue;   // downward facets only
out.push([(a[0] + b[0] + e[0]) / 3, (a[1] + b[1] + e[1]) / 3, (a[2] + b[2] + e[2]) / 3, nx, ny, nz, l / 2]);
} FACETS[k] = out; return out;
};
let KER = null; const kernel = function (sig) {   // Gaussian splat taps — rebuilt only when the record's sig changes
if (KER && KER.sig === sig) return KER;
const KX = [], KY = [], KW = [], KR = Math.ceil(sig * 2); for (let a = -KR; a <= KR; a++) for (let b = -KR; b <= KR; b++) { const d2 = a * a + b * b; if (d2 <= KR * KR) { KX.push(a); KY.push(b); KW.push(Math.exp(-d2 / (2 * sig * sig))); } }
return (KER = { sig: sig, kx: Int16Array.from(KX), ky: Int16Array.from(KY), kw: Float32Array.from(KW), n: KW.length });
};
const ENVV = new Float32Array(S * S), CORE = new Float32Array(S * S);   // static envelope + core mound
for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
const dx = (x - S / 2) / RAD, dz = (y - S / 2) / RAD, j = y * S + x; ENVV[j] = Math.exp(-(dx * dx + dz * dz) / (2 * ENV * ENV)); CORE[j] = Math.exp(-(dx * dx / (2 * CSX * CSX) + dz * dz / (2 * CSZ * CSZ)));
}
const BUF = [0, 1, 2].map(function () { return new Float32Array(S * S); });   // per-channel accumulators
const OUT = [0, 1, 2].map(function () { return new Float32Array(S * S); });
const field = function (G, P, stone) {   // per-frame: refract each pavilion facet per channel, splat each channel
const F_ = facetsOf(G), M = P.R, fy = P.floorY, RC = recOf(stone), IOR = RC.n;
CH[0] = IOR * (1 - RC.disp); CH[1] = IOR; CH[2] = IOR * (1 + RC.disp);
const KX = kernel(RC.sig), kx = KX.kx, ky = KX.ky, kw = KX.kw, KN = KX.n;
const tnx = M[1], tny = M[4], tnz = M[7], dn = DX0 * tnx + DY0 * tny + DZ0 * tnz;   // table normal, posed
const PX = [], PZ = [], PW = [], PXc = [0, 0, 0], PZc = [0, 0, 0]; let mx = 0, mz = 0, ws = 0, m2 = 0, ax = 0, ay = 0, az = 0, aw = 0, hx = 0, hy = 0, hz = 0;
for (let i = 0; i < F_.length; i++) {
const f = F_[i], nx = M[0] * f[3] + M[1] * f[4] + M[2] * f[5], ny = M[3] * f[3] + M[4] * f[4] + M[5] * f[5], nz = M[6] * f[3] + M[7] * f[4] + M[8] * f[5];
const cx = M[0] * f[0] + M[1] * f[1] + M[2] * f[2], cy = M[3] * f[0] + M[4] * f[1] + M[5] * f[2], cz = M[6] * f[0] + M[7] * f[1] + M[8] * f[2];
let sx = 0, sz = 0, ok = 0, w = 0;   // per-channel floor points, kept apart — never averaged into one landing
for (let c = 0; c < 3; c++) {
LAND[c] = 0;
const ee = CH[c], ea = 1 / ee;   // BOTH interfaces disperse: the table entry runs at this channel's index
const c0 = ea * dn + Math.sqrt(Math.max(0, 1 - ea * ea * (1 - dn * dn)));
let d1x = ea * DX0 - c0 * tnx, d1y = ea * DY0 - c0 * tny, d1z = ea * DZ0 - c0 * tnz;
const l1 = Math.hypot(d1x, d1y, d1z) || 1; d1x /= l1; d1y /= l1; d1z /= l1;
const nd = d1x * nx + d1y * ny + d1z * nz; if (nd <= 0.02) continue;   // ray must travel outward through the facet
const wc = f[6] * smoothstep(0.30, 0.93, nd) * (0.55 + 0.45 * Math.max(0, -(nx * DX0 + nz * DZ0) / (Math.hypot(nx, nz) || 1)));
if (wc < 1e-4) continue; if (c === 1) w = wc;
const cc = ee * nd + Math.sqrt(Math.max(1e-4, 1 - ee * ee * (1 - nd * nd)));
const rx = ee * d1x - cc * nx, ry = ee * d1y - cc * ny, rz = ee * d1z - cc * nz;
if (ry >= -1e-3) continue;
const t = (fy - cy) / ry; if (t <= 0) continue;
const qx = cx + rx * t, qz = cz + rz * t; LAND[c] = 1; PXc[c] = qx; PZc[c] = qz; sx += qx; sz += qz; ok++;
const a3 = f[6] * Math.max(0, nd) / 3, l3 = Math.hypot(rx, ry, rz) || 1;   // chief ray: area-weighted, no light gate
ax += cx * a3; ay += cy * a3; az += cz * a3; aw += a3; hx += rx / l3 * a3; hy += ry / l3 * a3; hz += rz / l3 * a3;
}
if (!ok || w <= 0) continue;
const px = sx / ok, pz = sz / ok;   // shared centre: channels that missed the floor fall back to it
if (px * px + pz * pz > 1.9) continue;   // no far-flung satellites — the pool stays one glow
for (let c = 0; c < 3; c++) { if (!LAND[c]) { PXc[c] = px; PZc[c] = pz; } PX.push(PXc[c]); PZ.push(PZc[c]); }
PW.push(w); mx += px * w; mz += pz * w; m2 += (px * px + pz * pz) * w; ws += w;
}
BUF[0].fill(0); BUF[1].fill(0); BUF[2].fill(0); if (ws) { mx /= ws; mz /= ws; }
const hl = Math.hypot(hx, hy, hz) || 1; let chx = 0, chz = 0; if (aw > 1e-6 && hy / hl < -1e-3) { const tc = (fy - ay / aw) / (hy / hl); chx = ax / aw + hx / hl * tc; chz = az / aw + hz / hl * tc; }
for (let i = 0; i < PW.length; i++) {   // one splat per facet PER CHANNEL — the three stay separate
const w = PW[i] * RC.gain / 3;
for (let c = 0; c < 3; c++) {
const x0 = Math.round(S / 2 + (PX[i * 3 + c] - mx) * RAD), y0 = Math.round(S / 2 + (PZ[i * 3 + c] - mz) * RAD), B = BUF[c];
for (let k = 0; k < KN; k++) { const px = x0 + kx[k], py = y0 + ky[k]; if (px < 0 || py < 0 || px >= S || py >= S) continue; B[py * S + px] += w * kw[k]; }
} }
const O0 = OUT[0], O1 = OUT[1], O2 = OUT[2]; let smax = 0; for (let i = 0; i < S * S; i++) {
const a = BUF[0][i] * ENVV[i], b = BUF[1][i] * ENVV[i], c = BUF[2][i] * ENVV[i];
O0[i] = a; O1[i] = b; O2[i] = c; const j = a + b + c; if (j > smax) smax = j;
}
// — ONE glow: the streaks ride ON a continuous core mound, achromatic, so the fringe never becomes coloured spots.
const sc = smax > 0 ? RC.streak / smax : 0; let fmax = 0; for (let i = 0; i < S * S; i++) {
const a = O0[i] * sc + CORE[i], b = O1[i] * sc + CORE[i], c = O2[i] * sc + CORE[i];
O0[i] = a; O1[i] = b; O2[i] = c; const j = (a + b + c) / 3; if (j > fmax) fmax = j;
}
return { r: O0, g: O1, b: O2, pk: 3 * (fmax || 1), cx: chx, cz: chz, sp: ws ? Math.sqrt(Math.max(0, m2 / ws - mx * mx - mz * mz)) : 0, gain: RC.gain };
}; const REFS = {};
const refOf = function (G, stone) { const k = geomKey(G) + '|' + (stone || ''); if (!REFS[k]) { const f = field(G, poseOf({ yaw: 0, pitch: 0, lift: 0 }, G), stone); REFS[k] = { cx: f.cx, cz: f.cz, sp: f.sp }; } return REFS[k]; };
window.GEM_CAUSTIC_TRACE = { S: S, pose: poseOf, geomKey: geomKey, field: field, refOf: refOf };
})();
