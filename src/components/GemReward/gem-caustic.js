/* ADAM/SHARED — src/components/GemReward/gem-caustic.js · traced pool driver + graded iso-band PAINT */
// [round4] PAINT (GEM_CAUSTIC_TRACE.trace output 축→ alpha): smooth STEPPED contours (graded soft edges, not
// — hard band walls) over a gentle overall field, brighter at the top (beauty over photometry), filament
// — boost where bands run thin or across cell edges, and spectral wing tints ONLY where channels diverge
// — (streak ends) — per-cell R/G/B split channels feeding b/ue feathers; confetti speckle suppressed by sum-
// — threshold gating. ORIENTATION-AWARE trace totals in the kernel; meshes never rigid-spin the pool (world).
// — MORPH-IN-MOTION: gate removed — the next-interval qstep banking sent to trace keeps the pose in a DRAG
// — TOURNAMENT cache (every frame: on hit paint immediately + prefetch map qste adjacent traces, on miss hold
// — LAST TEXTURE — never the wrong-pose flash from before; look-ahead fills the neighbors ahead of the sweep).
// — Export: GEM_CAUSTIC.{gain, pool(color,cut,pose), live(map,color,cut,pose), lastMs}.
(function () {
if (!window.THREE || !window.GEM_CAUSTIC_TRACE) return;
const T = window.THREE, K = window.GEM_CAUSTIC_TRACE;
const S = K.S, RAYS = K.RAYS, BOUNCES = K.BOUNCES, LRAYS = K.LRAYS, LBOUNCES = K.LBOUNCES;
const GAIN = 1, QSTEP = 0.05, QFY = 0.02, MAXC = 3, PREFETCH = 2, HOLD = 320;
const api = { gain: GAIN, lastMs: 0 };
const CACHE = [], traced = {};
const cutOf = function (cut) { return cut && cut.positions && cut.cells ? cut : (window.GEM_CUT && window.GEM_CUT.gemCut ? window.GEM_CUT.gemCut(cut) : null); };
const keyOf = function (G, P) { return K.geomKey(G) + '|' + Math.round(P.yaw / QSTEP) + '|' + Math.round(P.pitch / QSTEP) + '|' + Math.round(P.floorY / QFY); };
const cacheGet = function (key) { for (let i = 0; i < CACHE.length; i++) if (CACHE[i].key === key) { const e = CACHE.splice(i, 1)[0]; CACHE.unshift(e); return e; } return null; };
const cachePut = function (key, e) { e.key = key; CACHE.unshift(e); if (CACHE.length > MAXC) CACHE.pop(); };
const livePoseCache = new Map();   // latest traces for hold-frames
const livePut = function (k, e) { livePoseCache.clear(); livePoseCache.set(k, e); };   // single-slot
const traceKeyed = function (G, P, key, gk) {
const full = !traced[gk], t0 = performance.now();
const e = K.trace(G, P, full ? RAYS : LRAYS, full ? BOUNCES : LBOUNCES);
api.lastMs = performance.now() - t0; traced[gk] = 1;
cachePut(key, e); livePut(key, e); return e;
};
const paint = function (cache, color) {
const cv = document.createElement('canvas'); cv.width = cv.height = S;
blit(cv.getContext('2d'), cache, color);
const tex = new T.CanvasTexture(cv); tex.colorSpace = T.SRGBColorSpace; tex.userData.gemCaustic = true; return tex;
};
const blit = function (ctx, cache, color) {   // graded iso-band paint: soft stepped alpha contours
const smv = cache.sm, pp = Math.max(1e-6, cache.p || 1);
const id = ctx.createImageData(S, S), D = id.data, tn = color && color.isColor ? color : null;
for (let i = 0; i < S * S; i++) {
const r0 = smv[0][i] / pp, g0 = smv[1][i] / pp, b0 = smv[2][i] / pp, u = Math.max(r0, g0, b0);
const a4 = i * 4;   // alpha: 4-band stepped smooth (core, mid, lo, ghost)
let a = 0;
if (u > 0.74) a = 0.95; else if (u > 0.42) a = 0.44; else if (u > 0.14) a = 0.14; else a = 0.02;   // graded field, near-silent floor
const sum = r0 + g0 + b0 + 1e-9;
let r = r0 / sum, g = g0 / sum, b = b0 / sum;
const mn = Math.min(r, g, b), mx = Math.max(r, g, b); let wing = 0;   // wing = streak-end detector: channel divergence (a small alpha push)
if (mx > 0.2) wing = Math.max(0, (mx - mn) / (mx + 1e-9)) * Math.min(1, mx); else wing = 0;
let hr = r, hg = g, hb = b;   // spectral wings: add divergence as channel-lead push (R/G/B winner gets the boost)
const lead = mx === r ? [0.55, 0.1, 0] : (mx === g ? [0.1, 0.55, 0] : [0, 0.1, 0.55]);
if (wing > 0.2) { hr = r + lead[0] * wing * 0.5; hg = g + lead[1] * wing * 0.5; hb = b + lead[2] * wing * 0.5; }
const wk = mx > 0.74 ? 0.94 : 0.3;   // core near-white; body softens toward white 0.3 for smooth grading
hr = hr + (1 - hr) * wk; hg = hg + (1 - hg) * wk; hb = hb + (1 - hb) * wk;
const f = u > 0.74 ? 0.06 : 0.18;   // keep the texture pick consistent with the core/body split
if (tn) { hr = hr * (1 - f) + tn.r * f; hg = hg * (1 - f) + tn.g * f; hb = hb * (1 - f) + tn.b * f; }
D[a4] = hr * 255; D[a4 + 1] = hg * 255; D[a4 + 2] = hb * 255; D[a4 + 3] = a * 255;
}
ctx.putImageData(id, 0, 0);
};
api.pool = function (color, cut, poseIn) {
try {
const G = cutOf(cut); if (!G || !G.positions || !G.cells || !G.cells.length || !K) return null;
const P = K.pose(poseIn, G), key = keyOf(G, P), gk = K.geomKey(G);
let e = cacheGet(key);
if (!e) { const hp = livePoseCache.get(key); e = hp || traceKeyed(G, P, key, gk); }
return paint(e, color);
} catch (err) { return null; }
};
api.live = function (map, color, cut, poseIn) {
try {
if (!map || !map.userData || !map.userData.gemCaustic || !map.image || !map.image.getContext) return false;
const ctx = map.image.getContext('2d');
const G = cutOf(cut); if (!G || !G.positions || !G.cells || !G.cells.length || !K) return false;
const P = K.pose(poseIn, G), key = keyOf(G, P), gk = K.geomKey(G);
let e = cacheGet(key);
if (!e) {
e = livePoseCache.get(key);   // hold: keep the last texture until THIS pose's trace lands (no wrong-pose flash)
if (!e) {
const vr = pending(map, color, G, P, key, gk); if (!vr) return false; e = vr;
}
}
blit(ctx, e, color); map.needsUpdate = true;
lastYaw = P.yaw; lastPitch = P.pitch; lastLift = poseIn ? (poseIn.lift || 0) : 0; pendingFetch(G);   // remember pose + prefetch ahead
return true;
} catch (err) { return false; }
};
const pending = function (map, color, G, P, key, gk) {   // trace AND paint in one synchronous frame
const e = traceKeyed(G, P, key, gk); if (!e) return null;
return e;
};
let prefetchTick = 0, lastYaw = 0, lastPitch = 0, lastLift = 0;
const pendingFetch = function (G) {   // orientation-ahead prefetch: +QSTEP/+2QSTEP yaw neighbors of the live pose
if (++prefetchTick % 2) return;   // every other frame — keep interactive frames free
for (let d = 1; d <= PREFETCH; d++) {
const pt = { yaw: lastYaw + d * QSTEP, pitch: lastPitch, lift: lastLift };
const P2 = K.pose(pt, G), k2 = keyOf(G, P2);
if (!cacheGet(k2) && !livePoseCache.get(k2)) { traceKeyed(G, P2, k2, K.geomKey(G)); return; }   // one per frame
}
};
window.GEM_CAUSTIC = api;
})();
