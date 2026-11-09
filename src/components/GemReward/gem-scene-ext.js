/* ADAM/SHARED — src/components/GemReward/gem-scene-ext.js · cut cells → wound BufferGeometry */
// [plan:2026-10-03_144222-gem-realism-round2.md#round-19] · moved verbatim out of gem-scene.js (line-budget split).
// Export map: GEM_SCENE_EXT.geometry(cut) → BufferGeometry
(function () {
if (!window.THREE) return;
const T = window.THREE;
const geometry = function (cut) {
const p = cut.positions;
const v = [];
cut.cells.forEach(function (c) {
const a = p[c[0]], b = p[c[1]], d = p[c[2]];
if (!a || !b || !d) return;
const nx = (b[1] - a[1]) * (d[2] - a[2]) - (b[2] - a[2]) * (d[1] - a[1]);
const ny = (b[2] - a[2]) * (d[0] - a[0]) - (b[0] - a[0]) * (d[2] - a[2]);
const nz = (b[0] - a[0]) * (d[1] - a[1]) - (b[1] - a[1]) * (d[0] - a[0]);
const ox = (a[0] + b[0] + d[0]) / 3, oy = (a[1] + b[1] + d[1]) / 3, oz = (a[2] + b[2] + d[2]) / 3;
const s = nx * ox + ny * oy + nz * oz < 0 ? -1 : 1, f = s < 0 ? [a, d, b] : [a, b, d];
f.forEach(function (q) { v.push(q[0], q[1], q[2]); });
});
const geo = new T.BufferGeometry();
geo.setAttribute('position', new T.BufferAttribute(new Float32Array(v), 3));
geo.computeVertexNormals();
geo.computeBoundingBox();
return geo;
};
window.GEM_SCENE_EXT = { geometry: geometry };
})();
