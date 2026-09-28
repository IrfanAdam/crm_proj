/* ADAM/SHARED — src/components/IllusionCube/illusion-tween.js · reveal tween maths */
// [plan:2026-09-28_221212-illusion-cube-recreation.md#{#phase-5}] · Task 30: decoded poses, bezier, appliers.
// — Literals duplicate the timeline lane (illusion-timeline.js owns CAMERA/REVEAL; never drifted here) —
// Export map: ILLUSION_TWEEN.bez/ez4/cl/lp/mix3/snap/apply/keyOf · .OUT/BACK/LIGHT_MS
(function () {
var api = {};
var D = Math.PI / 180;
var A = { p: [530.466, 489.436, 592.347], r: [-28.261, 37.394, 18.08], z: 0.97535 };
var B = { p: [-671.356, 471.105, 641.647], r: [-31.288, -41.968, -22.116], z: 2.45548 };
var LA = [966.415, 529.266, 254.882];
var LB = [889.08, 443.083, 432.592];
var BX = [0.6690234375, 0.3199739583333333];
var BY = [0.2228515625, 1];
api.OUT_MS = 6000;
api.BACK_MS = 1000;
api.LIGHT_MS = 8000;
var cub = function (t, p, q) { return 3 * (1 - t) * (1 - t) * t * p + 3 * (1 - t) * t * t * q + t * t * t; };
var dcb = function (t, p, q) { return 3 * (1 - t) * (1 - t) * p + 6 * (1 - t) * t * (q - p) + 3 * t * t * (1 - q); };
api.bez = function (x) {
var t = x;
for (var i = 0; i < 5; i++) t -= (cub(t, BX[0], BX[1]) - x) / Math.max(dcb(t, BX[0], BX[1]), 0.001);
return cub(t, BY[0], BY[1]);
};
api.ez4 = function (t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; };
api.cl = function (v) { return Math.min(1, Math.max(0, v)); };
api.lp = function (a, b, w) { return a + (b - a) * w; };
api.mix3 = function (o, f, t, w) { o.set(api.lp(f[0], t[0], w), api.lp(f[1], t[1], w), api.lp(f[2], t[2], w)); };
var keyOf = function (rig) {
if (rig.lights && rig.lights.key) return rig.lights.key;
if (rig.key) return rig.key;
var f = null;
if (rig.scene) rig.scene.traverse(function (o) { if (!f && o.isDirectionalLight) f = o; });
return f;
};
api.keyOf = keyOf;
api.snap = function (rig, R) {
var c = rig.camera;
R.cp = [c.position.x, c.position.y, c.position.z];
R.cr = [c.rotation.x, c.rotation.y, c.rotation.z];
R.cz = c.zoom;
var k = keyOf(rig);
R.ck = k;
R.cl = k ? [k.position.x, k.position.y, k.position.z] : LA.slice();
};
api.apply = function (rig, R, out, cw, lw) {
var T = out ? B : A;
var L = api.lp;
var c = rig.camera;
api.mix3(c.position, R.cp, T.p, cw);
c.rotation.set(L(R.cr[0], T.r[0] * D, cw), L(R.cr[1], T.r[1] * D, cw), L(R.cr[2], T.r[2] * D, cw));
c.zoom = L(R.cz, T.z, cw);
c.updateProjectionMatrix();
if (R.ck) api.mix3(R.ck.position, R.cl, out ? LB : LA, lw);
};
window.ILLUSION_TWEEN = api;
})();
