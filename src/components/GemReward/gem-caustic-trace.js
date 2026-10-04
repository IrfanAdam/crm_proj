/* ADAM/SHARED — src/components/GemReward/gem-caustic-trace.js · caustic trace kernel (physics) */
// [plan:2026-09-28_000000-lump-sum-builds.md#phase-4] — Snell IOR 2.4 + 3-tap dispersion + TRUE TIR tracer
// — (physics unchanged). Hits splat with an exp kernel (SIG 3.2px, RS³ downsample + 1× blur = smooth graded
// — contours, no speckle) into R/G/B per-channel heat maps, p99-normalized via a 256-bin histogram (O(n)).
// — Per-cell channel DIVERGENCE is derivable in paint from sm[0..2] — approximates streak ends (R/G/B split).
// — PAINT lives in gem-caustic.js (iso-band graded alpha, filaments at grazing cells, spectral wings).
// — Export: GEM_CAUSTIC_TRACE.{S,RAYS,BOUNCES,LRAYS,LBOUNCES,pose,geomKey,trace}.
(function () {
if (!window.THREE) return;
const RES = 480, RS = 3, S = 160, FIT = 0.8333, IOR = 2.4, DISP = 0.06, FD = 0.5, RAYS = 24000, BOUNCES = 5, LRAYS = 4000, LBOUNCES = 3, SEED = 1.1, SPAN = 2.2, SIG = 3.2, BLUR = 1;
const LN = Math.hypot(3, 5, 4), LX = 3 / LN, LY = 5 / LN, LZ = 4 / LN, DX0 = -LX, DY0 = -LY, DZ0 = -LZ;
const yminOf = function (G) { let y = 1e9; for (let i = 0; i < G.positions.length; i++) { const q = G.positions[i]; if (q[1] < y) y = q[1]; } return y; };
const yawPitchMat = function (yaw, pitch) { const cp = Math.cos(pitch), sp = Math.sin(pitch), cy = Math.cos(yaw), sy = Math.sin(yaw); return [cy, 0, sy, sp * sy, cp, -sp * cy, -cp * sy, sp, cp * cy]; };   // R = Rx(pitch)·Ry(yaw) 'XYZ'
const quatMat = function (q) {
const x = q.x, y = q.y, z = q.z, w = q.w, x2 = x + x, y2 = y + y, z2 = z + z, xx = x * x2, xy = x * y2, xz = x * z2, yy = y * y2, yz = y * z2, zz = z * z2, wx = w * x2, wy = w * y2, wz = w * z2;
return [1 - (yy + zz), xy - wz, xz + wy, xy + wz, 1 - (xx + zz), yz - wx, xz - wy, yz + wx, 1 - (xx + yy)];
};   // THREE.Quaternion → local→world row-major 3x3
const poseOf = function (p, G) {   // {yaw,pitch,lift,floorY} | quaternion → {R,yaw,pitch,floorY}
let yaw = 0, pitch = 0, R = null, lift = 0, fy = null;
if (p) { lift = p.lift || 0; if (p.floorY != null) fy = p.floorY;
if (p.yaw !== undefined || p.pitch !== undefined) { yaw = p.yaw || 0; pitch = p.pitch || 0; R = yawPitchMat(yaw, pitch); }
else if (p.w !== undefined) { R = quatMat(p); pitch = Math.asin(Math.max(-1, Math.min(1, R[7]))); yaw = Math.atan2(R[2], R[0]); } }
if (!R) R = yawPitchMat(yaw, pitch);
return { R: R, yaw: yaw, pitch: pitch, floorY: (fy != null ? fy : yminOf(G) - FD) - lift };
};
const geomKey = function (G) { return G.cells.length + ':' + G.positions.length + ':' + G.positions[0].join(','); };
const nearest = function (A, NT, ox, oy, oz, dx, dy, dz) { let best = 1e9, bi = -1;   // A = flat [a,b,c verts, normal]×NT · Möller–Trumbore
for (let i = 0; i < NT; i++) { const o = i * 12, ax = A[o], ay = A[o + 1], az = A[o + 2], e1x = A[o + 3] - ax, e1y = A[o + 4] - ay, e1z = A[o + 5] - az, e2x = A[o + 6] - ax, e2y = A[o + 7] - ay, e2z = A[o + 8] - az;
const px = dy * e2z - dz * e2y, py = dz * e2x - dx * e2z, pz = dx * e2y - dy * e2x, det = e1x * px + e1y * py + e1z * pz; if (det < 1e-12 && det > -1e-12) continue;
const inv = 1 / det, tvx = ox - ax, tvy = oy - ay, tvz = oz - az, u = (tvx * px + tvy * py + tvz * pz) * inv; if (u < 0 || u > 1) continue;
const qx = tvy * e1z - tvz * e1y, qy = tvz * e1x - tvx * e1z, qz = tvx * e1y - tvy * e1x, v = (dx * qx + dy * qy + dz * qz) * inv; if (v < 0 || u + v > 1) continue;
const t = (e2x * qx + e2y * qy + e2z * qz) * inv; if (t > 1e-6 && t < best) { best = t; bi = i; } }
return bi < 0 ? null : [best, bi];
};
const trace = function (G, P, rays, bounces) {   // heavy half: cast rays in LOCAL frame, splat 3-channel bands
const M = P.R, M0 = M[0], M1 = M[1], M2 = M[2], M6 = M[6], M7 = M[7], M8 = M[8];
const U0 = M[0], U1 = M[3], U2 = M[6], U3 = M[1], U4 = M[4], U5 = M[7], U6 = M[2], U7 = M[5], U8 = M[8];   // U = Rᵀ (world→local)
const P_ = G.positions, CE = G.cells, NT = CE.length, A = [];
let ymin = 1e9, ymax = -1e9; for (let i = 0; i < P_.length; i++) { const q = P_[i]; if (q[1] < ymin) ymin = q[1]; if (q[1] > ymax) ymax = q[1]; }
for (let i = 0; i < NT; i++) { const c = CE[i], a = P_[c[0]], b = P_[c[1]], e = P_[c[2]], e1x = b[0] - a[0], e1y = b[1] - a[1], e1z = b[2] - a[2], e2x = e[0] - a[0], e2y = e[1] - a[1], e2z = e[2] - a[2];
const nx = e1y * e2z - e1z * e2y, ny = e1z * e2x - e1x * e2z, nz = e1x * e2y - e1y * e2x, l = Math.hypot(nx, ny, nz) || 1;
A.push(a[0], a[1], a[2], b[0], b[1], b[2], e[0], e[1], e[2], nx / l, ny / l, nz / l); }
const nrm = function (i) { const o = i * 12, n = [A[o + 9], A[o + 10], A[o + 11]], ln = Math.hypot(n[0], n[1], n[2]) || 1; return [n[0] / ln, n[1] / ln, n[2] / ln]; };
let dlx = U0 * DX0 + U1 * DY0 + U2 * DZ0, dly = U3 * DX0 + U4 * DY0 + U5 * DZ0, dlz = U6 * DX0 + U7 * DY0 + U8 * DZ0; const dln = Math.hypot(dlx, dly, dlz) || 1; dlx /= dln; dly /= dln; dlz /= dln;
const ex = [];
for (let i = 0; i < rays; i++) {   // fan in world, rotated into local by Rᵀ — orientation-aware (yaw 0..2π)
const rr = Math.sqrt((i + 0.5) / rays), th = i * 2.399963229728653;
const oxw = Math.cos(th) * rr * SEED + LX * 3.5, oyw = ymax + 0.5 + LY * 3.5, ozw = Math.sin(th) * rr * SEED + LZ * 3.5;
let ox = U0 * oxw + U1 * oyw + U2 * ozw, oy = U3 * oxw + U4 * oyw + U5 * ozw, oz = U6 * oxw + U7 * oyw + U8 * ozw, dx = dlx, dy = dly, dz = dlz;
const h = nearest(A, NT, ox, oy, oz, dx, dy, dz); if (!h) continue; const nn = nrm(h[1]); if (dx * nn[0] + dy * nn[1] + dz * nn[2] > 0) continue;
const ea = 1 / IOR, dn = dx * nn[0] + dy * nn[1] + dz * nn[2], kk = 1 - ea * ea * (1 - dn * dn); if (kk < 0) continue; const cc = ea * dn + Math.sqrt(kk); dx = ea * dx - cc * nn[0]; dy = ea * dy - cc * nn[1]; dz = ea * dz - cc * nn[2];
ox += h[0] * dx; oy += h[0] * dy; oz += h[0] * dz; let ll = Math.hypot(dx, dy, dz); dx /= ll; dy /= ll; dz /= ll;
for (let b = 0; b < bounces; b++) { const h2 = nearest(A, NT, ox, oy, oz, dx, dy, dz); if (!h2) break;
const nn2 = nrm(h2[1]), nd = dx * nn2[0] + dy * nn2[1] + dz * nn2[2], px = ox + h2[0] * dx, py = oy + h2[0] * dy, pz = oz + h2[0] * dz;
if (nd > 0 && 1 - IOR * IOR * (1 - nd * nd) >= 0) { ex.push([px, py, pz, dx, dy, dz, nn2[0], nn2[1], nn2[2]]); break; }   // exit = point + dir + facet normal (proj needs all three)
dx -= 2 * nd * nn2[0]; dy -= 2 * nd * nn2[1]; dz -= 2 * nd * nn2[2]; ll = Math.hypot(dx, dy, dz); dx /= ll; dy /= ll; dz /= ll;
ox = px + dx * 1e-6; oy = py + dy * 1e-6; oz = pz + dz * 1e-6; }
}
const floorY = P.floorY, RAD = RES / 2 * FIT / SPAN, CY1 = M1 * floorY, CY7 = M7 * floorY;
const proj = function (e, ee) { const dn = e[3] * e[6] + e[4] * e[7] + e[5] * e[8], k = 1 - ee * ee * (1 - dn * dn); if (k < 0) return null;   // refract exit at ior ee → local floor point + flux w
const c = ee * dn + Math.sqrt(k), rx = ee * e[3] - c * e[6], ry = ee * e[4] - c * e[7], rz = ee * e[5] - c * e[8];
if (ry >= -1e-4) return null; const tt = (floorY - e[1]) / ry; if (tt <= 0) return null;
return [e[0] + rx * tt, e[2] + rz * tt, Math.min(1, -ry)];
};
let mx = 0, mz = 0, ws = 0;   // mass-weighted centroid of the world floor cloud — recentring
for (let i = 0; i < ex.length; i++) { const q = proj(ex[i], IOR); if (!q) continue; const w = q[2] * q[2]; const wx = M0 * q[0] + M2 * q[1] + CY1, wz = M6 * q[0] + M8 * q[1] + CY7; mx += wx * w; mz += wz * w; ws += w; }
if (ws) { mx /= ws; mz /= ws; }
const rad = Math.ceil(SIG * 3), kdx = [], kdy = [], kw = [];
for (let a = -rad; a <= rad; a++) for (let b = -rad; b <= rad; b++) { const d2 = a * a + b * b; if (d2 <= rad * rad) { kdx.push(a); kdy.push(b); kw.push(Math.exp(-d2 / (2 * SIG * SIG))); } }
const KN = kw.length, KX = new Int16Array(KN), KY = new Int16Array(KN), KW = new Float32Array(KN);
for (let k = 0; k < KN; k++) { KX[k] = kdx[k]; KY[k] = kdy[k]; KW[k] = kw[k]; }
const bR = new Float32Array(RES * RES), bG = new Float32Array(RES * RES), bB = new Float32Array(RES * RES);
const CH = [IOR * (1 - DISP), IOR, IOR * (1 + DISP)], BUF = [bR, bG, bB];
for (let i = 0; i < ex.length; i++) for (let ch = 0; ch < 3; ch++) { const q = proj(ex[i], CH[ch]); if (!q) continue;
const wx = M0 * q[0] + M2 * q[1] + CY1, wz = M6 * q[0] + M8 * q[1] + CY7, buf = BUF[ch], w = q[2];
const x0 = Math.round(RES / 2 + (wx - mx) * RAD), y0 = Math.round(RES / 2 + (wz - mz) * RAD);
if (x0 < -rad || x0 > RES + rad || y0 < -rad || y0 > RES + rad) continue;
for (let k = 0; k < KN; k++) { const px = x0 + KX[k], py = y0 + KY[k]; if (px < 0 || py < 0 || px >= RES || py >= RES) continue; buf[py * RES + px] += w * KW[k]; } }
const sm = [new Float32Array(S * S), new Float32Array(S * S), new Float32Array(S * S)];
for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) { let sr = 0, sg = 0, sb = 0;   // RS³ downsample — smooth graded contours
for (let a = 0; a < RS; a++) for (let b = 0; b < RS; b++) { const ii = (y * RS + a) * RES + x * RS + b; sr += bR[ii]; sg += bG[ii]; sb += bB[ii]; }
const j = y * S + x; sm[0][j] = sr; sm[1][j] = sg; sm[2][j] = sb; }
for (let it = 0; it < BLUR; it++) for (let ch = 0; ch < 3; ch++) { const src = sm[ch], out = new Float32Array(S * S); for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) { let s = 0, n = 0;
for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) { const px = x + a, py = y + b; if (px < 0 || py < 0 || px >= S || py >= S) continue; s += src[py * S + px]; n++; }
out[y * S + x] = s / n; } sm[ch] = out; }
let mxv = 0; for (let i = 0; i < S * S; i++) { const v = Math.max(sm[0][i], sm[1][i], sm[2][i]); if (v > mxv) mxv = v; }   // p99 via 256-bin hist, O(n)
const H = new Float64Array(256); for (let i = 0; i < S * S; i++) { const v = Math.max(sm[0][i], sm[1][i], sm[2][i]); H[Math.min(255, (v / (mxv || 1)) * 255 | 0)]++; }
let acc = 0, p = mxv; for (let b2 = 255; b2 >= 0; b2--) { acc += H[b2]; if (acc > S * S * 0.01) { p = (b2 / 255) * (mxv || 1); break; } }
return { sm: sm, p: p || 1 };   // p99 normalization
};
window.GEM_CAUSTIC_TRACE = { S: S, RAYS: RAYS, BOUNCES: BOUNCES, LRAYS: LRAYS, LBOUNCES: LBOUNCES, pose: poseOf, geomKey: geomKey, trace: trace };
})();
