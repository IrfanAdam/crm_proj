/* ADAM/SHARED — src/components/GemReward/gem-cshape.js · cut plan-shape for the light pools */
// [plan:2026-09-28_000000-lump-sum-builds.md#phase-4] · the stone's own footprint, from GEM_CUT only.
// — Girdle: the vertices at the cut's max radius, angle-sorted and de-duped → the plan silhouette the —
// —         caustic pool is outlined by (48 corners on the default cut, one per facet column) —
// — Table:  the ring at the cut's max y — the 8 table corners the pool's bright core is drawn from —
// — Spokes: the 16-vertex pavilion break ring splits by radius into the 8 main-facet boundaries (the —
// —         longer throw) and the 8 lower-girdle centres (shorter) → the pool's facet divisions —
// Export map: window.GEM_CSHAPE.shape(cut) → { n, rmax, girdle[], table[], tableR, spokes[], notches[] }
//   unit = the cut's own space (girdle radius 1) · pure — no THREE, no DOM, no state, deterministic.
(function () {
const api = {};
const EPS = 1e-6;
const rad = function (q) { return Math.sqrt(q[0] * q[0] + q[2] * q[2]); };
const ringOf = function (p, keep) {
const r = p.filter(keep).map(function (q) { return { x: q[0], z: q[2], r: rad(q), a: Math.atan2(q[2], q[0]) }; });
r.sort(function (u, v) { return u.a - v.a; });
return r.filter(function (u, i) { return !i || Math.abs(u.a - r[i - 1].a) > EPS; });
};
const xz = function (r) { return r.map(function (u) { return [u.x, u.z]; }); };
const ang = function (r) { return r.map(function (u) { return u.a; }); };
api.shape = function (cut) {
const p = window.GEM_CUT.gemCut(cut).positions;
const rmax = p.reduce(function (m, q) { return Math.max(m, rad(q)); }, 0);
const ymax = p.reduce(function (m, q) { return Math.max(m, q[1]); }, -Infinity);
const girdle = ringOf(p, function (q) { return Math.abs(rad(q) - rmax) < EPS; });
const table = ringOf(p, function (q) { return Math.abs(q[1] - ymax) < EPS; });
const byR = {};
p.forEach(function (q) { const k = rad(q).toFixed(6); (byR[k] = byR[k] || []).push(q); });
const sixteens = Object.keys(byR).map(function (k) { return byR[k]; }).filter(function (g) { return g.length === 16; });
const brk = sixteens.length ? ringOf(sixteens[0], function () { return true; }) : [];
const rs = brk.map(function (u) { return u.r; });
const mid = rs.length ? (Math.min.apply(null, rs) + Math.max.apply(null, rs)) / 2 : 0;
const step = girdle.length ? girdle.length / 8 : 0;
const spokes = brk.length ? ang(brk.filter(function (u) { return u.r > mid; }))
  : ang(girdle.filter(function (u, i) { return step && i % step === 0; }));
const notches = brk.length ? ang(brk.filter(function (u) { return u.r <= mid; }))
  : spokes.map(function (a) { return a + Math.PI / 8; });
return { n: girdle.length, rmax: rmax, girdle: xz(girdle), table: xz(table),
  tableR: table.length ? table[0].r : rmax * cut.table, spokes: spokes, notches: notches };
};
window.GEM_CSHAPE = api;
})();
