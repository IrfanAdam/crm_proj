/* ADAM/SHARED — src/components/GemReward/gem-caustic-trace.js · analytic facet caustic field */
// [plan:2026-10-03_144222-gem-realism-round2.md#phase-10 Task 26] — ONE continuous glow, 1:1 with the stone.
// — Every downward facet refracts the key light (Snell 2.4, dispersion-averaged) to a floor point; soft Gaussian
// — splats + a Gaussian envelope merge them into one pool. No Monte Carlo, no trace on the render
// — path: the field is rebuilt from the live pose every frame (~2 ms). Entry refracts at the TABLE with the
// — pose-rotated normal (+y at rest → neutral-preserving), so tilt bends the entering ray and the exits alike.
// — field() also returns the PAVILION CHIEF RAY's floor point (cx,cz) — area-weighted, so it slides smoothly and
// — monotonically with tilt instead of jumping when the lit-facet set flips — and the landing points' RMS
// — spread sp, the caustic's focus: gem-bare puts the quad there and scales it by that ratio.
// — Export: GEM_CAUSTIC_TRACE.{S,pose,geomKey,field,refOf}.
(function () {
if (!window.THREE) return;
const O = (window.GEM_OPTICS && window.GEM_OPTICS.of('sapphire').caus) || { n: 2.4, disp: 0.06, sig: 5.2, streak: 0.42 }, S = 160, IOR = O.n, DISP = O.disp, FD = 0.5, SPAN = 2.4, SIG = O.sig, ENV = 0.86, CSX = 0.52, CSZ = 0.44, STREAK = O.streak, RAD = (S / 2) / SPAN, EA = 1 / IOR;
const LN = Math.hypot(3, 5, 4), LX = 3 / LN, LY = 5 / LN, LZ = 4 / LN, DX0 = -LX, DY0 = -LY, DZ0 = -LZ;
const CH = [IOR * (1 - DISP), IOR, IOR * (1 + DISP)];
const yminOf = function (G) { let y = 1e9; for (let i = 0; i < G.positions.length; i++) { const q = G.positions[i]; if (q[1] < y) y = q[1]; } return y; };
const yawPitchMat = function (yaw, pitch) { const cp = Math.cos(pitch), sp = Math.sin(pitch), cy = Math.cos(yaw), sy = Math.sin(yaw); return [cy, 0, sy, sp * sy, cp, -sp * cy, -cp * sy, sp, cp * cy]; };
const quatMat = function (q) {
const x = q.x, y = q.y, z = q.z, w = q.w, x2 = x + x, y2 = y + y, z2 = z + z, xx = x * x2, xy = x * y2, xz = x * z2, yy = y * y2, yz = y * z2, zz = z * z2, wx = w * x2, wy = w * y2, wz = w * z2;
return [1 - (yy + zz), xy - wz, xz + wy, xy + wz, 1 - (xx + zz), yz - wx, xz - wy, yz + wx, 1 - (xx + yy)];
};
const poseOf = function (p, G) {   // {yaw,pitch,lift,floorY} | quaternion → {R,yaw,pitch,floorY}
let yaw = 0, pitch = 0, R = null, lift = 0, fy = null;
if (p) { lift = p.lift || 0; if (p.floorY != null) fy = p.floorY;
if (p.yaw !== undefined || p.pitch !== undefined) { yaw = p.yaw || 0; pitch = p.pitch || 0; R = yawPitchMat(yaw, pitch); }
else if (p.w !== undefined) { R = quatMat(p); pitch = Math.asin(Math.max(-1, Math.min(1, R[7]))); yaw = Math.atan2(R[2], R[0]); } }
if (!R) R = yawPitchMat(yaw, pitch);
return { R: R, yaw: yaw, pitch: pitch, floorY: (fy != null ? fy : yminOf(G) - FD) - lift };
};
const geomKey = function (G) { return G.cells.length + ':' + G.positions.length + ':' + G.positions[0].join(','); };
const FACETS = {};
const facetsOf = function (G) {   // cached cut facets: centroid / outward normal / area, pavilion only
const k = geomKey(G);
if (FACETS[k]) return FACETS[k];
const P_ = G.positions, out = [];
for (let i = 0; i < G.cells.length; i++) {
const c = G.cells[i], a = P_[c[0]], b = P_[c[1]], e = P_[c[2]];
const e1x = b[0] - a[0], e1y = b[1] - a[1], e1z = b[2] - a[2], e2x = e[0] - a[0], e2y = e[1] - a[1], e2z = e[2] - a[2];
let nx = e1y * e2z - e1z * e2y, ny = e1z * e2x - e1x * e2z, nz = e1x * e2y - e1y * e2x;
const l = Math.hypot(nx, ny, nz) || 1; nx /= l; ny /= l; nz /= l;
if (ny > -0.04) continue;   // downward facets only — the pavilion is what throws the pool
out.push([(a[0] + b[0] + e[0]) / 3, (a[1] + b[1] + e[1]) / 3, (a[2] + b[2] + e[2]) / 3, nx, ny, nz, l / 2]);
}
FACETS[k] = out; return out;
};
const smoothstep = function (a, b, x) { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const KR = Math.ceil(SIG * 2), KX = [], KY = [], KW = [];
for (let a = -KR; a <= KR; a++) for (let b = -KR; b <= KR; b++) { const d2 = a * a + b * b; if (d2 <= KR * KR) { KX.push(a); KY.push(b); KW.push(Math.exp(-d2 / (2 * SIG * SIG))); } }
const kx = Int16Array.from(KX), ky = Int16Array.from(KY), kw = Float32Array.from(KW), KN = KW.length;
const ENVV = new Float32Array(S * S), CORE = new Float32Array(S * S);   // static envelope + core mound
for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
const dx = (x - S / 2) / RAD, dz = (y - S / 2) / RAD, j = y * S + x;
ENVV[j] = Math.exp(-(dx * dx + dz * dz) / (2 * ENV * ENV)); CORE[j] = Math.exp(-(dx * dx / (2 * CSX * CSX) + dz * dz / (2 * CSZ * CSZ)));
}
const BUF = new Float32Array(S * S), OUT = new Float32Array(S * S);
const field = function (G, P) {   // per-frame: refract each pavilion facet to the floor, splat, envelope
const F_ = facetsOf(G), M = P.R, fy = P.floorY;
const tnx = M[1], tny = M[4], tnz = M[7], dn = DX0 * tnx + DY0 * tny + DZ0 * tnz;   // table normal, posed
const c0 = EA * dn + Math.sqrt(Math.max(0, 1 - EA * EA * (1 - dn * dn)));   // Snell at the table, air → gem
let d1x = EA * DX0 - c0 * tnx, d1y = EA * DY0 - c0 * tny, d1z = EA * DZ0 - c0 * tnz;
{ const l = Math.hypot(d1x, d1y, d1z) || 1; d1x /= l; d1y /= l; d1z /= l; }
const PX = [], PZ = [], PW = []; let mx = 0, mz = 0, ws = 0, m2 = 0, ax = 0, ay = 0, az = 0, aw = 0, hx = 0, hy = 0, hz = 0;
for (let i = 0; i < F_.length; i++) {
const f = F_[i], nx = M[0] * f[3] + M[1] * f[4] + M[2] * f[5], ny = M[3] * f[3] + M[4] * f[4] + M[5] * f[5], nz = M[6] * f[3] + M[7] * f[4] + M[8] * f[5];
const nd = d1x * nx + d1y * ny + d1z * nz; if (nd <= 0.02) continue;   // ray must travel outward through the facet
const w = f[6] * smoothstep(0.30, 0.93, nd) * (0.55 + 0.45 * Math.max(0, -(nx * DX0 + nz * DZ0) / (Math.hypot(nx, nz) || 1)));
if (w < 1e-4) continue;
const cx = M[0] * f[0] + M[1] * f[1] + M[2] * f[2], cy = M[3] * f[0] + M[4] * f[1] + M[5] * f[2], cz = M[6] * f[0] + M[7] * f[1] + M[8] * f[2];
let px = 0, pz = 0, ok = 0;   // 9-tuple exit record [px,py,pz,dx,dy,dz,nx,ny,nz] → floor point, 3 channels
for (let c = 0; c < 3; c++) {
const ee = CH[c], cc = ee * nd + Math.sqrt(Math.max(1e-4, 1 - ee * ee * (1 - nd * nd)));
const rx = ee * d1x - cc * nx, ry = ee * d1y - cc * ny, rz = ee * d1z - cc * nz;
if (ry >= -1e-3) continue;
const t = (fy - cy) / ry; if (t <= 0) continue;
px += cx + rx * t; pz += cz + rz * t; ok++;
const a3 = f[6] * Math.max(0, nd) / 3, l3 = Math.hypot(rx, ry, rz) || 1;   // chief ray: area-weighted, no light gate
ax += cx * a3; ay += cy * a3; az += cz * a3; aw += a3; hx += rx / l3 * a3; hy += ry / l3 * a3; hz += rz / l3 * a3;
}
if (!ok) continue; px /= ok; pz /= ok;
if (px * px + pz * pz > 1.9) continue;   // no far-flung satellites — the pool stays one glow
PX.push(px); PZ.push(pz); PW.push(w); mx += px * w; mz += pz * w; m2 += (px * px + pz * pz) * w; ws += w;
}
BUF.fill(0);
if (ws) { mx /= ws; mz /= ws; }
const hl = Math.hypot(hx, hy, hz) || 1; let chx = 0, chz = 0;
if (aw > 1e-6 && hy / hl < -1e-3) { const tc = (fy - ay / aw) / (hy / hl); chx = ax / aw + hx / hl * tc; chz = az / aw + hz / hl * tc; }
for (let i = 0; i < PW.length; i++) {   // one splat per facet — the three channels are SUMMED here
const x0 = Math.round(S / 2 + (PX[i] - mx) * RAD), y0 = Math.round(S / 2 + (PZ[i] - mz) * RAD), w = PW[i];
for (let k = 0; k < KN; k++) { const px = x0 + kx[k], py = y0 + ky[k]; if (px < 0 || py < 0 || px >= S || py >= S) continue; BUF[py * S + px] += w * kw[k]; }
}
let smax = 0; for (let i = 0; i < S * S; i++) { const v = BUF[i] * ENVV[i]; OUT[i] = v; if (v > smax) smax = v; }
// — ONE glow: the facet streaks ride ON a continuous core mound instead of standing as separate islands.
const sc = smax > 0 ? STREAK / smax : 0; let fmax = 0;
for (let i = 0; i < S * S; i++) { const v = OUT[i] * sc + CORE[i]; OUT[i] = v; if (v > fmax) fmax = v; }
return { f: OUT, mx: fmax || 1, cx: chx, cz: chz, sp: ws ? Math.sqrt(Math.max(0, m2 / ws - mx * mx - mz * mz)) : 0 };
}; const REFS = {};
const refOf = function (G) { const k = geomKey(G); if (!REFS[k]) { const f = field(G, poseOf({ yaw: 0, pitch: 0, lift: 0 }, G)); REFS[k] = { cx: f.cx, cz: f.cz, sp: f.sp }; } return REFS[k]; };
window.GEM_CAUSTIC_TRACE = { S: S, pose: poseOf, geomKey: geomKey, field: field, refOf: refOf };
})();
