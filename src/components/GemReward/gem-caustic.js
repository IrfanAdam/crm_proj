/* ADAM/SHARED — src/components/GemReward/gem-caustic.js · floor pool paint driver */
// [plan:2026-10-03_144222-gem-realism-round2.md#phase-10 Task 26] — ONE continuous luminous glow.
// — Alpha is a CONTINUOUS tone curve of the field (no stepped contour ladder: the old 0.95/0.44/0.14/0.02
// — ladder quantized a sparse field into 4 hard blobs — "very blotches"). Spectral channels are already
// — summed by the projector; the only colour separation left is a signed ±12 % fringe on R/B at the streak
// — ends, so dispersion reads as a faint chromatic edge, never as separate coloured spots.
// — Motion is 1:1: live() rebuilds the field from the pose it is handed on EVERY frame (~1 ms, no ray
// — tracing, no 90 ms gate, no hold-last-texture), so the pool moves exactly as far as the stone each frame.
// — Export: GEM_CAUSTIC.{gain, pool(color,cut,pose), live(map,color,cut,pose), lastMs}.
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
const t0 = performance.now(), f = K.field(G, P);
api.lastMs = performance.now() - t0; last.k = key; last.f = f; return f;
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
api.live = function (map, color, cut, poseIn) {
try {
if (!map || !map.userData || !map.userData.gemCaustic || !map.image || !map.image.getContext) return false;
const G = cutOf(cut); if (!G || !G.positions || !G.cells || !G.cells.length) return false;
blit(map.image.getContext('2d'), fieldOf(G, K.pose(poseIn, G)), color);
map.needsUpdate = true;
return true;
} catch (err) { return false; }
};
window.GEM_CAUSTIC = api;
})();
