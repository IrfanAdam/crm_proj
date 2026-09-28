/* ADAM/SHARED — src/components/IntelCube/cube-form.js · block + core forms */
// [plan:2026-09-28_000000-lump-sum-builds.md#phase-5] · procedural forms (Task 20).
// — Block: a subdivided box whose vertices are clamped into an inner core and then stepped back —
// —        out along the offset by the edge radius; the rounding band takes radial normals and the —
// —        faces keep their axis normal — analytic, so the cut shades smooth on a coarse grid —
// — Core: an icosahedron the core shader displaces · Motes: deterministic points inside the block —
// Export map: CUBE_FORM.block(w, h, d, r, seg) · blob(radius, detail) · motes(count) · h(i, s) hash
(function () {
if (!window.THREE) return;
const T = window.THREE;
const api = {};
api.h = function (i, s) { const x = Math.sin(i * 12.9898 + s * 78.233) * 43758.5453; return x - Math.floor(x); };
api.block = function (w, h, d, r, seg) {
const geo = new T.BoxGeometry(w, h, d, seg, seg, seg);
const pos = geo.attributes.position;
const nor = geo.attributes.normal;
const cx = Math.max(w / 2 - r, 1e-4), cy = Math.max(h / 2 - r, 1e-4), cz = Math.max(d / 2 - r, 1e-4);
for (let i = 0; i < pos.count; i++) {
const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
const kx = Math.max(-cx, Math.min(cx, x));
const ky = Math.max(-cy, Math.min(cy, y));
const kz = Math.max(-cz, Math.min(cz, z));
const ox = x - kx, oy = y - ky, oz = z - kz;
const len = Math.sqrt(ox * ox + oy * oy + oz * oz);
if (len < 1e-5) continue;
const s = r / len;
pos.setXYZ(i, kx + ox * s, ky + oy * s, kz + oz * s);
nor.setXYZ(i, ox / len, oy / len, oz / len);
}
return geo;
};
api.blob = function (radius, detail) { return new T.IcosahedronGeometry(radius, detail || 4); };
api.motes = function (count) {
const p = [], size = [], seed = [], speed = [];
for (let i = 0; i < count; i++) {
const near = i % 5 < 3;
const x = near ? -0.36 + api.h(i, 1) * 0.3 : -0.42 + api.h(i, 2) * 0.84;
const y = near ? -0.36 + api.h(i, 3) * 0.3 : -0.44 + api.h(i, 4) * 0.86;
const z = near ? -0.28 + api.h(i, 5) * 0.44 : -0.3 + api.h(i, 6) * 0.6;
p.push(x, y, z);
size.push(0.011 + api.h(i, 7) * 0.016);
seed.push(api.h(i, 8) * 9);
speed.push(0.014 + api.h(i, 9) * 0.03);
}
const g = new T.BufferGeometry();
g.setAttribute('position', new T.Float32BufferAttribute(p, 3));
g.setAttribute('aSize', new T.Float32BufferAttribute(size, 1));
g.setAttribute('aSeed', new T.Float32BufferAttribute(seed, 1));
g.setAttribute('aSpeed', new T.Float32BufferAttribute(speed, 1));
return g;
};
window.CUBE_FORM = api;
})();
