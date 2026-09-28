/* ADAM/SHARED — src/components/IllusionCube/illusion-timeline.js · clock maths + tables */
// [plan:2026-09-28_221212-illusion-cube-recreation.md#{#phase-4}] · Task 25 tables.
// — Maths: easing 4, Newton bezier, legs; tables: decoded ends Phase 4/5 read —
// Export map: ILLUSION_TIMELINE.inOutCubic · .bezier · .leg · .osc · .mix · .pose
// — .rotOf · .scaleOf · .rad · .drift01 · .CUBES · .MAIN · .BASE · .LIGHTS —
// — .PRISM · .CAMERA · .REVEAL · .CHAIN —
(function () {
const api = {};
const DEG = Math.PI / 180;
const CA = function (a, b) { return 1 - 3 * b + 3 * a; };
const CB = function (a, b) { return 3 * b - 6 * a; };
const CC = function (a) { return 3 * a; };
const CU = function (t, a, b) { return ((CA(a, b) * t + CB(a, b)) * t + CC(a)) * t; };
const CS = function (t, a, b) { return 3 * CA(a, b) * t * t + 2 * CB(a, b) * t + CC(a); };
api.inOutCubic = function (p) {
if (p <= 0) return 0;
if (p >= 1) return 1;
if (p < 0.5) return 4 * p * p * p;
return 1 - Math.pow(-2 * p + 2, 3) / 2;
};
api.bezier = function (x1, y1, x2, y2) {
return function (p) {
if (p <= 0) return 0;
if (p >= 1) return 1;
let t = p;
for (let i = 0; i < 6; i++) {
const d = CS(t, x1, x2);
if (Math.abs(d) < 0.00001) break;
t = t - (CU(t, x1, x2) - p) / d;
}
return CU(t, y1, y2);
};
};
api.leg = function (t, delay, ms) {
if (t <= delay) return 0;
if (t >= delay + ms) return 1;
return api.inOutCubic((t - delay) / ms);
};
api.osc = function (t, delay, ms) {
if (t <= delay) return 0;
const c = (t - delay) % (2 * ms);
if (c < ms) return api.inOutCubic(c / ms);
return api.inOutCubic((2 * ms - c) / ms);
};
api.mix = function (a, b, w) {
return a + (b - a) * w;
};
api.rad = function (deg) {
return deg * DEG;
};
api.pose = function (out, a, b, w) {
out.set(api.mix(a[0], b[0], w), api.mix(a[1], b[1], w), api.mix(a[2], b[2], w));
};
api.rotOf = function (o, a, b, w) {
o.set(api.mix(a[0], b[0], w) * DEG, api.mix(a[1], b[1], w) * DEG, api.mix(a[2], b[2], w) * DEG);
};
api.scaleOf = function (m, a, b, w) {
m.scale.setScalar(api.mix(a, b, w));
};
api.drift01 = function (t, period) {
return (((t % period) + period) % period) / period;
};
api.CUBES = [
{ p0: [-7.9, 73.5, 15.2], r0: [75.7, 59, 164.2], s0: 1, delay: 0, ms: 8000,
p1: [28.2, 84.1, 21.1], r1: [31, -14.7, -11.9], s1: 0.7 },
{ p0: [54, 150.7, 9.8], r0: [0, 0, 0], s0: 0.3, delay: 8000, ms: 8000,
p1: [-36.4, 65.4, -45.4], r1: [-98.3, 25.7, -87.2], s1: 0.7 },
{ p0: [-53.4, 40.9, -69.1], r0: [-180, -4.8, -106.6], s0: 0.3, delay: 0, ms: 8000,
p1: [-11.4, 140, 44.3], r1: [-98.4, 25.7, -152.2], s1: 0.7 },
{ p0: [52.7, 20.4, -74], r0: [0, 0, -17.1], s0: 0.3, delay: 0, ms: 8000,
p1: [-27.7, 21.1, 62.6], r1: [10, 20, -10], s1: 0.4 }
];
api.MAIN = { legMs: 8000, ditherMs: 1000,
a0: { scale: 1.37, move: 4.1, alpha: 0.32 }, b0: { scale: 1.78, move: -0.04, alpha: 0.32 },
a1: { scale: 1.44, move: 6.39, alpha: 0.54 }, b1: { scale: 2.58, move: 0.03, alpha: 0.46 } };
api.BASE = { sheen0: 181, sheen1: 87, ms: 4000, once: true };
api.LIGHTS = [
{ from: [57.049979656199255, 12.199857180006802, 112.45136454567444], peak: 0.8,
to: [32.77265692860964, 8.405533059820298, 109.84670048246309], fade: 1000, delay: 8000, ms: 4000, drift: 0 },
{ from: [-113.54237269267794, 16.528549605580338, -39.705123501394496], peak: 1,
to: [-126.12543356866746, 16.528549605580338, -72.06981022075522], fade: 1000, delay: 8000, ms: 4000, drift: 0 },
{ from: [-121.50410125112523, 11.353790460176242, 68.47555138330435], peak: 1.705,
to: [-88.6826038462716, 24.006305882438028, 27.694865485336862], fade: 1000, delay: 8000, ms: 4000, drift: 0 }
];
api.PRISM = { rot0: -227, rot1: -169, ms: 8000 };
api.CAMERA = { ms: 6000, backMs: 1000, bx1: 0.6690234375, by1: 0.2228515625, bx2: 0.3199739583333333, by2: 1,
p0: [530.466, 489.436, 592.347], r0: [-28.261, 37.394, 18.08], z0: 0.97535,
p1: [-671.356, 471.105, 641.647], r1: [-31.288, -41.968, -22.116], z1: 2.45548,
key0: [966.415, 529.266, 254.882], key1: [889.08, 443.083, 432.592], keyMs: 8000 };
api.REVEAL = { outMs: 6000, backMs: 1000 };
api.CHAIN = { whooshAt: 4000, whooshVol: 0.3, bedAt: 8000, bedVol: 0.2,
blurbDelay: 3000, blurbMs: 3000, blurbA0: 0, blurbA1: 1, resetMs: 1000,
blurbZ0: 98.6648, blurbZ1: 101.1018 };
window.ILLUSION_TIMELINE = api;
})();
