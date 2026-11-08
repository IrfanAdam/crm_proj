/* ADAM/SHARED — src/components/GemReward/gem-optics.js · the optical parameter record */
// [plan:2026-10-03_144222-gem-realism-round2.md#phase-11] · Task 28: ONE record per stone, with provenance.
// — Every number driving reflection, refraction, absorption, radiance, fire, glint and the caustic lives here,
// — named after the material property it stands for and tagged: published (GEM_APPEARANCE, cited) / derived
// — (recomputed by formula, never hand-edited) / authored (art direction, said out loud).
// — n.d published index at 589 nm · n.trace the index the stone trace runs at (CATEGORIES.ior) · n.spread =
// — (d−1)/abbe/d, the physical dispersion half-width (0.60 % sapphire). caus.n stays authored 2.4 until Task 33.
// — Defaults reproduce the shipped look exactly — codifying optics must not move a pixel. set() deep-merges and
// — re-derives; apply(rigs) pushes into live materials/uniforms, so a sweep needs no rebuild and no code edit.
// Export map: GEM_OPTICS.{of,get,set,reset,apply,dump,provenance,k3,FIT,AMB}
(function () {
const api = {};
window.GEM_OPTICS = api;
const FIT = { sapphire: { e: 6.2, k: 1.00, g: 0.74, a: 0.10, sw: 0.35, bk: 0, fg: 0.30 }, citrine: { e: 3.8, k: 0.55, g: 0.74, a: 0.10, sw: 0.35, bk: 0, fg: 0 }, amethyst: { e: 3.8, k: 1.10, g: 0.74, a: 0.10, sw: 0.35, bk: 0, fg: 0.10 }, redberyl: { e: 7.0, k: 0.60, g: 0.74, a: 0.10, sw: 0.35, bk: 0, fg: 0.30 } };
api.FIT = FIT; api.AMB = 0.10;
const NAMES = ['sapphire', 'citrine', 'amethyst', 'redberyl'];
const hsv = function (h, s) {
const c = s, x = c * (1 - Math.abs(((h / 60) % 2) - 1)), m = 1 - c;
const q = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
return [q[0] + m, q[1] + m, q[2] + m];
};
api.k3 = function (name) {
const a = (window.GEM_APPEARANCE && window.GEM_APPEARANCE.stones && window.GEM_APPEARANCE.stones[name]) || { hue: 226.3, sat: 0.735 };
return hsv(a.hue, a.sat).map(function (q) { return -Math.log(Math.max(q, 1e-4)); });
};
const seed = function (name) {
const a = (window.GEM_APPEARANCE && window.GEM_APPEARANCE.stones && window.GEM_APPEARANCE.stones[name]) || {};
const C = window.GEM_CUT && window.GEM_CUT.CATEGORIES, F = FIT[name] || FIT.sapphire;
const d = a.ior || (C && C[name] && C[name].ior) || 1.768;
return {
n: { d: d, abbe: a.abbe || 70, trace: (C && C[name] && C[name].ior) || d, spread: 0 },
reflect: { fresnel: 0, bodySpec: 0.60, env: 0.35, rough: 0.06, win: 1.8, mirror: 2.2, crisp: 0.05, broad: 0.30, luma: 0.55, lumaB: 0.85, shK: 0.9, bounce: 5 },
absorb: { k: null, scale: F.k, atten: 1.45, thick: 0.9, tint: 0.10 },
light: { exp: F.e, gam: 0.74, amb: api.AMB },
fill: { path: 1.5, gain: F.fg || 0, tint: [1, 1, 1] },
fire: { taps: 3, mix: 0.6, spread: 0, bodySpread: 2 },
glint: { ceil: 0.60, weight: 0.92, achro: 0.025 },
caus: { n: 2.4, disp: 0.06, sig: 5.2, streak: 0.42, gain: 1 },
};
};
const derive = function (name, r) {
r.n.spread = r.n.abbe > 0 && r.n.d > 0 ? (r.n.d - 1) / r.n.abbe / r.n.d : 0;
r.reflect.fresnel = Math.pow((r.n.trace - 1) / (r.n.trace + 1), 2);
r.fire.spread = r.fire.spread || r.n.spread;   // Abbe-derived by default; a set() may widen it (author must say so)
r.absorb.k = api.k3(name);
// fill.tint = the stone's own transmittance at fill.path radii (≈ half the stone), normalised so its strongest
// channel passes 1.0: a CHROMA derived from measured hue/sat, never a picked RGB. Peak-normalising keeps tinted
// and white fill at the same radiance, so an A/B compares colour, not amplitude.
r.fill.tint = r.absorb.k.map(function (v) { return Math.exp(-v * r.fill.path); });
const fmax = Math.max(r.fill.tint[0], r.fill.tint[1], r.fill.tint[2]) || 1;
r.fill.tint = r.fill.tint.map(function (v) { return v / fmax; });
return r;
};
const STORE = {};
NAMES.forEach(function (n) { STORE[n] = derive(n, seed(n)); });
api.of = function (name) { return STORE[name] || STORE.sapphire; };
api.get = api.of;
const walk = function (a, b) {
Object.keys(b || {}).forEach(function (k) {
if (b[k] && typeof b[k] === 'object' && !Array.isArray(b[k])) walk(a[k] = a[k] || {}, b[k]); else a[k] = b[k];
});
return a;
};
api.set = function (name, patch) { return derive(name, walk(api.of(name), patch)); };
api.reset = function (name) { STORE[name] = derive(name, seed(name)); return STORE[name]; };
api.dump = function () {
const o = {};
NAMES.forEach(function (n) { o[n] = JSON.parse(JSON.stringify(api.of(n))); });
return o;
};
const PUB = { 'n.d': 'published', 'n.abbe': 'published', 'n.trace': 'published', 'n.spread': 'derived', 'reflect.fresnel': 'derived', 'fire.spread': 'derived', 'absorb.k': 'derived', 'fill.tint': 'derived' };
api.provenance = function (name) {
const r = api.of(name), out = {};
Object.keys(r).forEach(function (g) { Object.keys(r[g]).forEach(function (f) { out[g + '.' + f] = PUB[g + '.' + f] || 'authored'; }); });
return out;
};
const UM = { ior: 'n.trace', uExp: 'light.exp', uGam: 'light.gam', uAmb: 'light.amb', uKS: 'absorb.scale', uCr: 'reflect.crisp', uBr: 'reflect.broad', uLu: 'reflect.luma', uLuB: 'reflect.lumaB', uSh: 'reflect.shK', uBounce: 'reflect.bounce', gain: 'reflect.mirror', winGain: 'reflect.win' };
const at = function (o, p) { const q = p.split('.'); return o[q[0]][q[1]]; };
api.apply = function (rigs) {
const list = rigs || (window.GEM3D && window.GEM3D.rigs) || [];
list.forEach(function (rig) {
const name = (rig.canvas && rig.canvas.dataset.gem) || 'sapphire', o = api.of(name);
(rig.mats || []).forEach(function (m) {
if (!m) return;
if (m.isMeshPhysicalMaterial) {
m.ior = o.n.trace; m.roughness = o.reflect.rough; m.envMapIntensity = o.reflect.env;
m.thickness = o.absorb.thick; m.attenuationDistance = o.absorb.atten; m.needsUpdate = true;
}
const u = m.uniforms;
if (!u) return;
Object.keys(UM).forEach(function (k) { if (u[k]) u[k].value = at(o, UM[k]); });
if (u.uK) { const k = api.k3(name); u.uK.value.set(k[0], k[1], k[2]); }
if (u.uFt) { const f = o.fill.tint; u.uFt.value.set(f[0], f[1], f[2]); }
});
});
return list.length;
};
})();
