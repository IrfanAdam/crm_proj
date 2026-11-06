/* ADAM/SHARED — src/components/GemReward/gem-caustic.js · floor pool paint driver */
// [plan:2026-10-03_144222-gem-realism-round2.md#phase-10 Task 26] — ONE continuous luminous glow.
// — Alpha is a CONTINUOUS tone curve of the field (no stepped contour ladder: the old 0.95/0.44/0.14/0.02
// — ladder quantized a sparse field into 4 hard blobs — "very blotches"). Spectral channels are already
// — summed by the projector; the only colour separation left is a signed ±12 % fringe on R/B at the streak
// — ends, so dispersion reads as a faint chromatic edge, never as separate coloured spots.
// — Motion is 1:1 with the STONE: live() rebuilds the field from the pose it is handed on EVERY frame,
// — and publishes where the pool's quad belongs as GEM_CAUSTIC.off. The quad is pinned to the camera ray
// — through the stone's projected vertex centroid — the mean of every cut vertex on screen, i.e. the
// — stone's own screen position by any pixel measure — so the pool's screen motion IS the stone's motion,
// — exactly (the mapping is the camera's projection inverted, not a gain). off.s is the traced landing
// — points' RMS spread, so the pool's magnification follows the measured focus change.
// — Export: GEM_CAUSTIC.{gain, pool(color,cut,pose), live(map,color,cut,pose,rig), lastMs, off}.
(function () {
if (!window.THREE || !window.GEM_CAUSTIC_TRACE) return;
const T = window.THREE, K = window.GEM_CAUSTIC_TRACE, S = K.S, PEAK = 242, GAM = 0.82;
const api = { gain: 1, lastMs: 0 };
const LUT = new Uint8Array(256);
for (let i = 0; i < 256; i++) LUT[i] = Math.min(PEAK, Math.round(PEAK * (1 - Math.exp(-2.6 * Math.pow(i / 255, GAM))) / 0.9257));
const cutOf = function (cut) { return cut && cut.positions && cut.cells ? cut : (window.GEM_CUT && window.GEM_CUT.gemCut ? window.GEM_CUT.gemCut(cut) : null); };
const last = { k: '', f: null };
const fieldOf = function (G, P) {   // one build per pose — pool() and live() share it
const key = K.geomKey(G) + '|' + P.yaw.toFixed(4) + '|' + P.pitch.toFixed(4) + '|' + P.floorY.toFixed(4);
if (last.k === key && last.f) return last.f;
const rf = K.refOf(G), t0 = performance.now(), f = K.field(G, P);   // refOf first — field() owns the shared buffer
api.lastMs = performance.now() - t0;
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
const blit = function (ctx, fld, color) {   // continuous tone curve + summed channels + faint fringe
const id = ctx.createImageData(S, S), D = id.data, f = fld.f, fm = fld.mx || 1;
const tn = color && color.isColor ? color : null, cr = tn ? tn.r : 1, cg = tn ? tn.g : 1, cb = tn ? tn.b : 1;
for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
const i = y * S + x, u = Math.min(1, f[i] / fm), a4 = i * 4, w = 0.15 + 0.85 * u * u * (3 - 2 * u);
const gx = x > 0 && x < S - 1 ? f[i + 1] - f[i - 1] : 0;   // dispersion: fringe only at the streak edges
const h = Math.max(-1, Math.min(1, gx / (fm * 0.55))) * 0.12, o = DIT[(x & 3) + ((y & 3) << 2)];
D[a4] = cl((cr + (1 - cr) * w) * (1 + h) * 255 + o);
D[a4 + 1] = cl((cg + (1 - cg) * w) * (1 + h * 0.2) * 255 + o);
D[a4 + 2] = cl((cb + (1 - cb) * w) * (1 - h) * 255 + o);
D[a4 + 3] = Math.min(PEAK, cl(LUT[(u * 255) | 0] + o));   // dither the alpha — kills 8-bit contour rings
}
ctx.putImageData(id, 0, 0);
};
api.pool = function (color, cut, poseIn) {
try {
const G = cutOf(cut); if (!G || !G.positions || !G.cells || !G.cells.length) return null;
const P = K.pose(poseIn, G), cv = document.createElement('canvas');
cv.width = cv.height = S;
blit(cv.getContext('2d'), fieldOf(G, P), color);
const tex = new T.CanvasTexture(cv);
tex.colorSpace = T.SRGBColorSpace; tex.userData.gemCaustic = true;
return tex;
} catch (err) { return null; }
};
api.live = function (map, color, cut, poseIn, rig) {
try {
if (!map || !map.userData || !map.userData.gemCaustic || !map.image || !map.image.getContext) return false;
const G = cutOf(cut); if (!G || !G.positions || !G.cells || !G.cells.length) return false;
blit(map.image.getContext('2d'), fieldOf(G, K.pose(poseIn, G)), color);
const an = rig ? anchorOf(rig, cut) : null;   // the quad's own screen motion, world units on the plane
if (an) api.off = { x: an.x, z: an.z, s: api.off ? api.off.s : 1 };
map.needsUpdate = true;
return true;
} catch (err) { return false; }
};
window.GEM_CAUSTIC = api;
})();
