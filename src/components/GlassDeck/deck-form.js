/* ADAM/SHARED — src/components/GlassDeck/deck-form.js · squircle plate geometry */
// [plan:2026-10-05_000000-lump-sum-builds.md#phase-1] · one slab, three opacities (Task 46).
// — Plate: rounded-rect Shape (radius 0.27w — iOS-squircle read) extruded with a polished bevel; —
// —        the bevel carries the rim highlight, so no stroke geometry is ever needed. —
// — Orientation: extrude runs +Z → rotateX(-π/2) stands the plate flat, then recentre on Y —
// Export map: DECK_FORM.slab(w, t) → BufferGeometry · W / R / THICK / GAP defaults
(function () {
if (!window.THREE) return;
const T = window.THREE;
const api = {};
api.W = 1;
api.R = 0.27;
api.THICKS = [0.145, 0.115, 0.095];
api.GAP = 0.075;
api.slab = function (w, t) {
const r = api.R * w;
const h = w / 2;
const s = new T.Shape();
s.moveTo(-h + r, -h);
s.lineTo(h - r, -h);
s.absarc(h - r, -h + r, r, -Math.PI / 2, 0);
s.lineTo(h, h - r);
s.absarc(h - r, h - r, r, 0, Math.PI / 2);
s.lineTo(-h + r, h);
s.absarc(-h + r, h - r, r, Math.PI / 2, Math.PI);
s.lineTo(-h, -h + r);
s.absarc(-h + r, -h + r, r, Math.PI, Math.PI * 1.5);
const bt = t * 0.26;
const g = new T.ExtrudeGeometry(s, {
depth: t - bt * 2, bevelEnabled: true, bevelThickness: bt, bevelSize: bt * 0.85,
bevelSegments: 5, curveSegments: 32,
});
g.rotateX(-Math.PI / 2);
g.translate(0, -(t - bt * 2) / 2, 0);
smoothWall(g);
return g;
};
// — The extruded wall is flat-shaded per segment; welding coincident wall normals turns the —
// — corner arcs into one smooth reflective band — the face/bevel crease stays crisp (top normals skipped)
function smoothWall(g) {
const p = g.attributes.position, n = g.attributes.normal;
const acc = new Map();
const key = function (i) {
return Math.round(p.getX(i) * 2e3) + '|' + Math.round(p.getY(i) * 2e3) + '|' + Math.round(p.getZ(i) * 2e3);
};
for (let i = 0; i < p.count; i++) {
if (Math.abs(n.getY(i)) > 0.85) continue;
const k = key(i);
let v = acc.get(k);
if (!v) { v = [0, 0, 0, 0]; acc.set(k, v); }
v[0] += n.getX(i); v[1] += n.getY(i); v[2] += n.getZ(i); v[3]++;
}
for (let i = 0; i < p.count; i++) {
if (Math.abs(n.getY(i)) > 0.85) continue;
const v = acc.get(key(i));
if (!v || !v[3]) continue;
const l = Math.hypot(v[0], v[1], v[2]) || 1;
n.setXYZ(i, v[0] / l, v[1] / l, v[2] / l);
}
n.needsUpdate = true;
}
window.DECK_FORM = api;
})();
