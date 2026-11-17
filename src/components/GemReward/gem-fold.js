/* ADAM/SHARED — src/components/GemReward/gem-fold.js · the cut's plane set under its own symmetry */
// [plan:2026-10-03_144222-gem-realism-round2.md#phase-18] · mobile parity: fold the interior trace.
// — The cut's 170-plane set is exactly invariant under its 16-fold symmetry (8 Y rotations x two mirrors;
// — probe: every plane maps onto a plane of the set with 0 residual). Folding a ray into the 22.5-deg
// — fundamental wedge leaves 17 distinct planes, so the trace can scan 17 instead of 170 and unfold only the
// — direction it hands to envR() — the same trace, one tenth of the plane tests.
// — Op order here is the shader's own (x-neg, z-neg, swap, 22.5-deg bisector) so CPU and GLSL agree.
// Export map: GEM_FOLD_PLANES { foldXZ(x,z) · foldSet(acc) → {count, data, map} · shader }.
(function () {
const api = {};
const T22 = 0.41421356, C45 = 0.70710678;
api.shader = !!(window.GEM_FACETS_FOLD === undefined) && !/[?&]gemfold=0/.test(window.location.search);
api.foldXZ = function (x, z) {
if (x < 0) x = -x;
if (z < 0) z = -z;
if (x < z) { const q = x; x = z; z = q; }
if (z > T22 * x) { const nx = (x + z) * C45, nz = (x - z) * C45; x = nx; z = nz; }
return [x, z];
};
api.foldSet = function (acc) {   // planes already in the wedge, plus the full-index → folded-index map
const out = [], map = new Array(acc.length).fill(-1);
for (let i = 0; i < acc.length; i++) {
const p = acc[i], f = api.foldXZ(p.n[0], p.n[2]);
let hit = -1;
for (let j = 0; j < out.length && hit < 0; j++) {
const q = out[j];
if (Math.abs(q[0] - f[0]) < 1e-6 && Math.abs(q[1] - p.n[1]) < 1e-6 && Math.abs(q[2] - f[1]) < 1e-6 && Math.abs(q[3] - p.d) < 1e-6) hit = j;
}
if (hit < 0) { out.push([f[0], p.n[1], f[1], p.d]); hit = out.length - 1; }
map[i] = hit;
}
const data = new Float32Array(4 * out.length);
out.forEach(function (q, i) { data[4 * i] = q[0]; data[4 * i + 1] = q[1]; data[4 * i + 2] = q[2]; data[4 * i + 3] = q[3]; });
return { count: out.length, data: data, map: map };
};
window.GEM_FOLD_PLANES = api;
})();
