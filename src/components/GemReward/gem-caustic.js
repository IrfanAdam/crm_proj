/* ADAM/SHARED — src/components/GemReward/gem-caustic.js · floor pool paint driver */
// [plan:2026-10-03_144222-gem-realism-round2.md#phase-13 Task 33] — the pool is painted from the TRACE's three
// — spectral channels, not from a luminance-gradient tint hack: each channel carries its own landing energy, so
// — the R−B fringe at the streak edges is the stone's dispersion (its width follows caus.disp) and it vanishes
// — when disp is 0. Alpha is a continuous tone curve of the summed field (no contour ladder, no blobs) and the
// — streak core is achromatic, so the pool stays ONE glow. live() takes the stone from the rig (dataset.gem) and
// — re-reads GEM_OPTICS per frame, so stone and floor share one optics record. Export: {gain,pool,live,lastMs,off}.
(function () {
if (!window.THREE || !window.GEM_CAUSTIC_TRACE) return;
const T = window.THREE, K = window.GEM_CAUSTIC_TRACE, S = K.S, PEAK = 242, GAM = 0.82;
const api = { gain: 1, lastMs: 0 };
const LUT = new Uint8Array(256);
for (let i = 0; i < 256; i++) LUT[i] = Math.min(PEAK, Math.round(PEAK * (1 - Math.exp(-2.6 * Math.pow(i / 255, GAM))) / 0.9257));
const cutOf = function (cut) { return cut && cut.positions && cut.cells ? cut : (window.GEM_CUT && window.GEM_CUT.gemCut ? window.GEM_CUT.gemCut(cut) : null); };
const stoneOf = function (rig, cut) {
const n = (rig && rig.canvas && rig.canvas.dataset.gem) || (typeof cut === 'string' ? cut : cut && (cut.name || cut.cat)); return n || 'sapphire'; };
const recOf = function (stone) { return (window.GEM_OPTICS && window.GEM_OPTICS.of(stone).caus) || { n: 2.4, disp: 0.06, sig: 5.2, streak: 0.42, gain: 1 }; };
const last = { k: '', f: null };
const fieldOf = function (G, P, stone) {   // one build per pose+record — pool() and live() share it
const r = recOf(stone);
const key = K.geomKey(G) + '|' + P.yaw.toFixed(4) + '|' + P.pitch.toFixed(4) + '|' + P.floorY.toFixed(4) + '|' + stone + r.n + r.disp + r.sig + r.streak + r.gain;
if (last.k === key && last.f) return last.f;
const rf = K.refOf(G, stone), t0 = performance.now(), f = K.field(G, P, stone);   // refOf first — field() owns the buffers
api.lastMs = performance.now() - t0; api.gain = r.gain;
api.off = { x: f.cx - rf.cx, z: f.cz - rf.cz, s: rf.sp > 1e-6 ? f.sp / rf.sp : 1 };
last.k = key; last.f = f; return f;
};
// — ANCHOR: rotation-only screen delta of the stone (ref = same lift, zero rotation — a float never
// — double-counts the key-light shift), mapped onto the pool's plane through the camera's own ray.
const ANCH = new WeakMap();
const meanNdc = function (a, mat, cam) {   // the stone's own screen position: mean of every vertex
let sx = 0, sy = 0; for (let i = 0; i < a.p.length; i += 3) { a.v.set(a.p[i], a.p[i + 1], a.p[i + 2]).applyMatrix4(mat).project(cam); sx += a.v.x; sy += a.v.y; }
return [sx / a.n, sy / a.n]; };
const onPlane = function (a, cam, y, nx, ny) {   // the floor point on the camera ray through (nx,ny)
a.v.set(nx, ny, 0.5).unproject(cam).sub(cam.position).normalize();
const t = (y - cam.position.y) / (a.v.y || -1e-6);
return [cam.position.x + a.v.x * t, cam.position.z + a.v.z * t]; };
const anchorOf = function (rig, cut) {
const g = rig.group, cam = rig.camera, mesh = g && g.children[0], fl = rig.floors;
if (!cam || !mesh || !mesh.geometry || !fl || !fl.caustic) return null;
let a = ANCH.get(cut);
if (!a) {   // dedupe the cut's vertices once — 1332 non-indexed verts collapse to ~1/5
const P = mesh.geometry.attributes.position.array, seen = {}, keep = [];
for (let i = 0; i < P.length; i += 3) { const k = P[i] + ',' + P[i + 1] + ',' + P[i + 2]; if (!seen[k]) { seen[k] = 1; keep.push(P[i], P[i + 1], P[i + 2]); } }
a = { p: Float32Array.from(keep), n: keep.length / 3, v: new T.Vector3(), w: new T.Vector3(), q: new T.Quaternion(), m: new T.Matrix4(), t: new T.Matrix4(), ref: null, lift: 1e9 };
ANCH.set(cut, a);
}
g.updateWorldMatrix(true, true);
if (a.lift !== g.position.y) { a.lift = g.position.y; const p = g.position;
a.m.makeTranslation(p.x, p.y, p.z).multiply(a.t.makeRotationFromQuaternion(a.q.copy(g.quaternion).invert()))
.multiply(a.t.makeTranslation(-p.x, -p.y, -p.z)).multiply(mesh.matrixWorld);
a.ref = meanNdc(a, a.m, cam); }
const cur = meanNdc(a, g.matrixWorld, cam), y = fl.caustic.position.y;
a.w.set(0, fl.base.cy, fl.base.cz).project(cam);   // the pool's own neutral screen point
const f1 = onPlane(a, cam, y, a.w.x + cur[0] - a.ref[0], a.w.y + cur[1] - a.ref[1]);
return { x: f1[0], z: f1[1] - fl.base.cz };   // delta from the plane's rest centre (gem-bare adds base)
};
const DIT = new Int8Array([-2, 0, 2, -1, 1, -2, 0, 2, 2, -1, -2, 0, 0, 2, -1, 1]);   // 4x4 ordered dither
const cl = function (v) { return v < 0 ? 0 : v > 255 ? 255 : v; };
const tone = function (v) { const u = v < 0 ? 0 : v > 1 ? 1 : v; return 0.15 + 0.85 * u * u * (3 - 2 * u); };
const blit = function (ctx, fld, color) {   // per-channel paint: the fringe is the trace's own R−B separation
const id = ctx.createImageData(S, S), D = id.data, pk = fld.pk || 1, ch0 = fld.r, ch1 = fld.g, ch2 = fld.b;
const tn = color && color.isColor ? color : null, cr = tn ? tn.r : 1, cg = tn ? tn.g : 1, cb = tn ? tn.b : 1;
const gain = fld.gain || 1;
for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
const i = y * S + x, a4 = i * 4, o = DIT[(x & 3) + ((y & 3) << 2)];
D[a4] = cl((cr + (1 - cr) * tone(ch0[i] * 3 / pk)) * 255 + o);
D[a4 + 1] = cl((cg + (1 - cg) * tone(ch1[i] * 3 / pk)) * 255 + o);
D[a4 + 2] = cl((cb + (1 - cb) * tone(ch2[i] * 3 / pk)) * 255 + o);
const u = Math.min(1, (ch0[i] + ch1[i] + ch2[i]) / pk);
D[a4 + 3] = Math.min(PEAK, cl(LUT[(u * 255) | 0] * gain + o));   // dither the alpha — kills 8-bit contour rings
}
ctx.putImageData(id, 0, 0);
};
api.pool = function (color, cut, poseIn, stone) {
try {
const G = cutOf(cut); if (!G || !G.positions || !G.cells || !G.cells.length) return null;
const nm = stone || stoneOf(null, cut), P = K.pose(poseIn, G), cv = document.createElement('canvas');
cv.width = cv.height = S;
blit(cv.getContext('2d'), fieldOf(G, P, nm), color);
const tex = new T.CanvasTexture(cv);
tex.colorSpace = T.SRGBColorSpace; tex.userData.gemCaustic = true;
return tex;
} catch (err) { return null; }
};
api.live = function (map, color, cut, poseIn, rig) {
try {
if (!map || !map.userData || !map.userData.gemCaustic || !map.image || !map.image.getContext) return false;
const G = cutOf(cut); if (!G || !G.positions || !G.cells || !G.cells.length) return false;
blit(map.image.getContext('2d'), fieldOf(G, K.pose(poseIn, G), stoneOf(rig, cut)), color);
const an = rig ? anchorOf(rig, cut) : null;   // the quad's own screen motion, world units on the plane
if (an) api.off = { x: an.x, z: an.z, s: api.off ? api.off.s : 1 };
map.needsUpdate = true;
return true;
} catch (err) { return false; }
};
window.GEM_CAUSTIC = api;
})();
