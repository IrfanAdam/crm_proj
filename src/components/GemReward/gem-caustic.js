/* ADAM/SHARED — src/components/GemReward/gem-caustic.js · floor pool paint driver */
// [plan:2026-10-03_144222-gem-realism-round2.md#phase-13 Task 33] — the pool is painted from the TRACE's three
// — spectral channels: each carries its own landing energy, so the R−B fringe at the streak edges is the stone's
// — dispersion and it vanishes when disp is 0. Alpha is a continuous tone curve of the summed field and the streak
// — core is achromatic, so the pool stays ONE glow. Export: {gain,pool,live,lastMs,off}.
(function () {
if (!window.THREE || !window.GEM_CAUSTIC_TRACE) return;
const T = window.THREE, K = window.GEM_CAUSTIC_TRACE, S = K.S, PEAK = 242, GAM = 0.82;
const api = { gain: 1, lastMs: 0 }, OFF = { x: 0, z: 0, s: 1 };   // OFF is api.off for the module's life — refilled in place
api.off = OFF;
const LUT = new Uint8Array(256);
for (let i = 0; i < 256; i++) LUT[i] = Math.min(PEAK, Math.round(PEAK * (1 - Math.exp(-2.6 * Math.pow(i / 255, GAM))) / 0.9257));
const cutOf = function (cut) { return cut && cut.positions && cut.cells ? cut : (window.GEM_CUT && window.GEM_CUT.gemCut ? window.GEM_CUT.gemCut(cut) : null); };
const stoneOf = function (rig, cut) {
const n = (rig && rig.canvas && rig.canvas.dataset.gem) || (typeof cut === 'string' ? cut : cut && (cut.name || cut.cat)); return n || 'sapphire'; };
const FALL = { n: 2.4, disp: 0.06, sig: 5.2, streak: 0.42, gain: 1 }, recOf = function (stone) { return (window.GEM_OPTICS && window.GEM_OPTICS.of(stone).caus) || FALL; };   // one record per stone: the cache keys on its identity
const last = { G: null, r: null, y: 0, p: 0, f: 0, F: null };
const q4 = function (v) { return Math.round(v * 1e4); };   // the 1e-4 key quantisation toFixed(4) encoded, without the string
const fieldOf = function (G, P, stone) {   // one build per pose+record — pool() and live() share it
const r = recOf(stone), y = q4(P.yaw), p = q4(P.pitch), fy = q4(P.floorY);
if (last.F && last.G === G && last.r === r && last.y === y && last.p === p && last.f === fy) return last.F;
const rf = K.refOf(G, stone), t0 = performance.now(), f = K.field(G, P, stone);   // refOf first — field() owns the buffers
api.lastMs = performance.now() - t0; api.gain = r.gain; OFF.x = f.cx - rf.cx; OFF.z = f.cz - rf.cz; OFF.s = rf.sp > 1e-6 ? f.sp / rf.sp : 1;
last.G = G; last.r = r; last.y = y; last.p = p; last.f = fy; last.F = f; return f;
};
// — ANCHOR: rotation-only screen delta of the stone (ref = same lift, zero rotation — a float never
// — double-counts the key-light shift), mapped onto the pool's plane through the camera's own ray.
const ANCH = new WeakMap();
const meanNdc = function (a, mat, cam, out) {   // the stone's own screen position: mean of every vertex
let sx = 0, sy = 0; for (let i = 0; i < a.p.length; i += 3) { a.v.set(a.p[i], a.p[i + 1], a.p[i + 2]).applyMatrix4(mat).project(cam); sx += a.v.x; sy += a.v.y; }
out[0] = sx / a.n; out[1] = sy / a.n; return out; };
const onPlane = function (a, cam, y, nx, ny, out) {   // the floor point on the camera ray through (nx,ny)
a.v.set(nx, ny, 0.5).unproject(cam).sub(cam.position).normalize();
const t = (y - cam.position.y) / (a.v.y || -1e-6);
out[0] = cam.position.x + a.v.x * t; out[1] = cam.position.z + a.v.z * t; return out; };
const anchorOf = function (rig, cut) {
const g = rig.group, cam = rig.camera, mesh = g && g.children[0], fl = rig.floors;
if (!cam || !mesh || !mesh.geometry || !fl || !fl.caustic) return null;
let a = ANCH.get(cut);
if (!a) {   // dedupe the cut's vertices once — 1332 non-indexed verts collapse to ~1/5
const P = mesh.geometry.attributes.position.array, seen = {}, keep = [];
for (let i = 0; i < P.length; i += 3) { const k = P[i] + ',' + P[i + 1] + ',' + P[i + 2]; if (!seen[k]) { seen[k] = 1; keep.push(P[i], P[i + 1], P[i + 2]); } }
a = { p: Float32Array.from(keep), n: keep.length / 3, v: new T.Vector3(), w: new T.Vector3(), q: new T.Quaternion(), m: new T.Matrix4(), t: new T.Matrix4(), lift: 1e9,
  nd: [0, 0], rf: [0, 0], pl: [0, 0], out: { x: 0, z: 0 } };   // per-frame destinations, allocated once per cut
ANCH.set(cut, a);
}
g.updateWorldMatrix(true, true);
if (a.lift !== g.position.y) { a.lift = g.position.y; const p = g.position;
a.m.makeTranslation(p.x, p.y, p.z).multiply(a.t.makeRotationFromQuaternion(a.q.copy(g.quaternion).invert()))
.multiply(a.t.makeTranslation(-p.x, -p.y, -p.z)).multiply(mesh.matrixWorld);
meanNdc(a, a.m, cam, a.rf); }
const cur = meanNdc(a, g.matrixWorld, cam, a.nd), y = fl.caustic.position.y;
a.w.set(0, fl.base.cy, fl.base.cz).project(cam);   // the pool's own neutral screen point
const f1 = onPlane(a, cam, y, a.w.x + cur[0] - a.rf[0], a.w.y + cur[1] - a.rf[1], a.pl);
a.out.x = f1[0]; a.out.z = f1[1] - fl.base.cz; return a.out;   // delta from the plane's rest centre (gem-bare adds base)
};
const DIT = new Int8Array([-2, 0, 2, -1, 1, -2, 0, 2, 2, -1, -2, 0, 0, 2, -1, 1]);   // 4x4 ordered dither
const cl = function (v) { return v < 0 ? 0 : v > 255 ? 255 : v; };
const tone = function (v) { const u = v < 0 ? 0 : v > 1 ? 1 : v; return 0.15 + 0.85 * u * u * (3 - 2 * u); };
const ID = new WeakMap(), idOf = function (c2d) { let id = ID.get(c2d); if (!id) ID.set(c2d, id = c2d.createImageData(S, S)); return id; };   // one ImageData per context
const blit = function (ctx, fld, color) {   // per-channel paint: the fringe is the trace's own R−B separation
const id = idOf(ctx), D = id.data, pk = fld.pk || 1, ch0 = fld.r, ch1 = fld.g, ch2 = fld.b;
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
api.live = function (map, color, cut, poseIn, rig, place) {   // place: anchor only — the paint is pose-gated by the rig
try {
if (!map || !map.userData || !map.userData.gemCaustic || !map.image || !map.image.getContext) return false;
const G = cutOf(cut); if (!G || !G.positions || !G.cells || !G.cells.length) return false;
if (!place) blit(map.image.getContext('2d'), fieldOf(G, K.pose(poseIn, G), stoneOf(rig, cut)), color);
const an = rig ? anchorOf(rig, cut) : null;   // the quad's own screen motion, world units on the plane
if (an) { OFF.x = an.x; OFF.z = an.z; }   // same record every frame: gem-bare reads it later in this same tick
if (!place) map.needsUpdate = true;
return true;
} catch (err) { return false; }
};
window.GEM_CAUSTIC = api;
})();
