/* ADAM/SHARED — src/components/IllusionCube/illusion-textures.js · texture registry */
// [plan:2026-09-28_221212-illusion-cube-recreation.md#{#phase-3}] · Task 17: JPEGs + fallbacks.
// — Registry: Spline wrap/filter equal three's defaults; only colorSpace set —
// — Fallback: a 404 synthesises a canvas sheen/ramp so the rig never throws —
// Export map: ILLUSION_TEX.load(renderer) → set · .rad(deg) · .canvas(n) · .ready()
(function () {
if (!window.THREE) return;
const T = window.THREE;
const api = {};
const DIR = 'cube-illusion/textures/';
const IDS = { photo: '7b83617b-037e-49b5-8c02-9f88e3fb82cf', sheen: '61a09fba-b94f-4145-ae08-eca8fc42eb93' };
IDS.matcap0 = 'matcap_0';
IDS.matcap4 = 'matcap_4';
IDS.matcap5 = 'matcap_5';
IDS.reflection = 'matcap_reflection';
let cache = null;
let done = 0;
const waiters = [];
// — Degrees to radians: Spline stores rotation in degrees —
api.rad = function (deg) { return deg * Math.PI / 180; };
// — Blank canvas helper —
api.canvas = function (n) {
const cv = document.createElement('canvas');
cv.width = n;
cv.height = n;
return { cv: cv, c: cv.getContext('2d') };
};
// — Fallback painters (hues mirror the illusion ramp) —
const sheenCv = function () {
const s = api.canvas(256);
const g = s.c.createRadialGradient(128, 100, 8, 128, 128, 170);
g.addColorStop(0, 'rgba(255,255,255,0.95)');
g.addColorStop(1, 'rgba(255,255,255,0)');
s.c.fillStyle = g;
s.c.fillRect(0, 0, 256, 256);
return s.cv;
};
const rampCv = function () {
const s = api.canvas(256);
const g = s.c.createLinearGradient(0, 0, 256, 256);
g.addColorStop(0, '#7cbefb');
g.addColorStop(0.5, '#a54cff');
g.addColorStop(1, '#ea005e');
s.c.fillStyle = g;
s.c.fillRect(0, 0, 256, 256);
return s.cv;
};
// — Fire: count completions (loads and fallbacks alike) —
const fire = function () {
done++;
if (done >= 6) waiters.forEach(function (w) { w(cache); });
};
// — Load: lazy, idempotent; ready() holds the first frame —
api.load = function (renderer) {
if (cache) return cache;
const max = renderer.capabilities.getMaxAnisotropy();
const loader = new T.TextureLoader();
const photo = function (k) { return k === 'photo'; };
cache = {};
for (const k of Object.keys(IDS)) {
const t = loader.load(DIR + IDS[k] + '.jpg', fire, undefined, function () {
t.image = photo(k) ? rampCv() : sheenCv();
t.needsUpdate = true;
fire();
});
t.colorSpace = T.SRGBColorSpace;
t.anisotropy = max;
cache[k] = t;
}
return cache;
};
api.ready = function () {
if (done >= 6) return Promise.resolve(cache);
return new Promise(function (res) { waiters.push(res); });
};
window.ILLUSION_TEX = api;
})();
