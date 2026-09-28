/* ADAM/SHARED — src/components/IllusionCube/illusion-form.js · rounded box form */
// [plan:2026-09-28_221212-illusion-cube-recreation.md#{#phase-1}] · box form (Task 3).
// — Box: subdivided box clamped to inner core then stepped out by radius —
// —       band takes radial normals, faces keep axis normals, no welding —
// Export map: ILLUSION_FORM.box(w,h,d,r,seg) → rounded BoxGeometry
(function () {
if (!window.THREE) return;
const T = window.THREE;
const api = {};
// — Box —
api.box = function (w, h, d, r, seg) {
const geo = new T.BoxGeometry(w, h, d, seg, seg, seg);
const pos = geo.attributes.position;
const nor = geo.attributes.normal;
const cx = Math.max(w / 2 - r, 1e-4);
const cy = Math.max(h / 2 - r, 1e-4);
const cz = Math.max(d / 2 - r, 1e-4);
for (let i = 0; i < pos.count; i++) {
const x = pos.getX(i);
const y = pos.getY(i);
const z = pos.getZ(i);
const kx = Math.max(-cx, Math.min(cx, x));
const ky = Math.max(-cy, Math.min(cy, y));
const kz = Math.max(-cz, Math.min(cz, z));
const ox = x - kx;
const oy = y - ky;
const oz = z - kz;
const len = Math.sqrt(ox * ox + oy * oy + oz * oz);
if (len < 1e-5) continue;
const s = r / len;
pos.setXYZ(i, kx + ox * s, ky + oy * s, kz + oz * s);
nor.setXYZ(i, ox / len, oy / len, oz / len);
}
return geo;
};
window.ILLUSION_FORM = api;
})();
