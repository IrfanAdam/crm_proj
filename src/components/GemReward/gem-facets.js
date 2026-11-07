/* ADAM/SHARED — src/components/GemReward/gem-facets.js · the cut as a plane set (analytic interior) */
// [plan:2026-11-01_000000-gem-analytic-facets.md#facets] · exact far-facet geometry, no render target.
// — build(cut | BufferGeometry): every triangle → a plane (nx,ny,nz,d). The origin is inside the stone, so an
// —   outward normal is the one with d < 0 (flip when d > 0). Triangles whose normals agree within 1° and whose
// —   d agrees within 4e-3 are one facet: 268 triangles → 202 planes, 136 vertices, bbox y −0.860..0.348.
// —   Measured (probe: 500 interior points × 16 dirs): the nearest plane with t > 0 is a real boundary point of
// —   the solid 100% of the time (0/8000 spurious), so the trace needs no per-triangle containment test even
// —   though the cut is not convex (536 vertex/plane violations, max 0.197).
// — set(material, canvas): pushes the set as `vec4 uPl[N]` when the fragment program can take it — checked
// —   against MAX_FRAGMENT_UNIFORM_VECTORS at runtime — else as an RGBA32F 1×N DataTexture (api.choice says which).
// — k3(cat): per-channel Beer–Lambert absorption from GEM_APPEARANCE's measured hue/sat, κ = −ln(hsv(H,S,1)):
// —   a path of one stone radius reproduces the measured stone colour exactly and a longer path only deepens it,
// —   so hue is path-invariant and saturation is a readout of path length — not a ramp.
// Export map: api.build · api.planes{count,data,bbox} · api.set · api.choice · api.k3 · api.kAt · api.stones
(function () {
const api = {};
window.GEM_FACETS = api;
const COS = Math.cos((1 * Math.PI) / 180), DE = 4e-3;
api.choice = '';
api.planes = { count: 0, data: null, bbox: null };
api.stones = { sapphire: [227.0, 0.871], citrine: [25.0, 0.867], amethyst: [283.9, 0.62], redberyl: [340.3, 0.88] };
const trisOf = function (src) {
const out = [];
if (src && src.cells && src.positions) { src.cells.forEach(function (c) { out.push(src.positions[c[0]], src.positions[c[1]], src.positions[c[2]]); }); return out; }
const p = src.attributes.position.array, ix = src.index && src.index.array;
if (ix) for (let i = 0; i < ix.length; i++) out.push([p[3 * ix[i]], p[3 * ix[i] + 1], p[3 * ix[i] + 2]]);
else for (let i = 0; i < p.length; i += 3) out.push([p[i], p[i + 1], p[i + 2]]);
return out;
};
api.build = function (src) {
const v = trisOf(src), bb = [[1e9, 1e9, 1e9], [-1e9, -1e9, -1e9]];
const acc = [];
for (let t = 0; t < v.length; t += 3) {
const a = v[t], b = v[t + 1], c = v[t + 2], u = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], w = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
let n = [u[1] * w[2] - u[2] * w[1], u[2] * w[0] - u[0] * w[2], u[0] * w[1] - u[1] * w[0]];
const l = Math.hypot(n[0], n[1], n[2]);
if (l < 1e-9) continue;
n = [n[0] / l, n[1] / l, n[2] / l];
let d = -(n[0] * a[0] + n[1] * a[1] + n[2] * a[2]);
if (d > 0) { n = [-n[0], -n[1], -n[2]]; d = -d; }
[0, 1, 2].forEach(function (q) { bb[0][q] = Math.min(bb[0][q], a[q], b[q], c[q]); bb[1][q] = Math.max(bb[1][q], a[q], b[q], c[q]); });
let hit = null;
for (let i = 0; i < acc.length && !hit; i++) if (acc[i].n[0] * n[0] + acc[i].n[1] * n[1] + acc[i].n[2] * n[2] > COS && Math.abs(acc[i].d - d) < DE) hit = acc[i];
if (hit) hit.k++; else acc.push({ n: n, d: d, k: 1 });
}
const data = new Float32Array(4 * acc.length);
acc.forEach(function (p, i) { data[4 * i] = p.n[0]; data[4 * i + 1] = p.n[1]; data[4 * i + 2] = p.n[2]; data[4 * i + 3] = p.d; });
api.planes = { count: acc.length, data: data, bbox: { min: bb[0], max: bb[1] } };
api._vecs = null;
return api.planes;
};
api.vecs = function () {
const T = window.THREE, n = api.planes.count;
if (!T) return null;
if (api._vecs && api._vecs.length === n) return api._vecs;
const out = [], d = api.planes.data;
for (let i = 0; i < n; i++) out.push(new T.Vector4(d[4 * i], d[4 * i + 1], d[4 * i + 2], d[4 * i + 3]));
return (api._vecs = out);
};
api.set = function (material, canvas) {
const T = window.THREE, u = material && material.uniforms, n = api.planes.count;
if (!T || !u || !n) return '';
let lim = 256;
try { const gl = canvas && (canvas.getContext('webgl2') || canvas.getContext('webgl')); if (gl) lim = gl.getParameter(gl.MAX_FRAGMENT_UNIFORM_VECTORS) || lim; } catch (e) { lim = 256; }
if (u.uPl && n + 72 <= lim) { u.uPl.value = api.vecs(); u.uCount.value = n; api.choice = 'uniform'; return 'uniform'; }
if (!u.uPlTex) return '';
const tex = new T.DataTexture(api.planes.data, n, 1, T.RGBAFormat, T.FloatType);
tex.minFilter = T.NearestFilter; tex.magFilter = T.NearestFilter; tex.needsUpdate = true;
u.uPlTex.value = tex; u.uCount.value = n;
material.defines.PLTEX = 1; material.needsUpdate = true;
api.choice = 'texture';
return 'texture';
};
const hsv = function (h, s) {
const c = s, x = c * (1 - Math.abs(((h / 60) % 2) - 1)), m = 1 - c, q = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
return [q[0] + m, q[1] + m, q[2] + m];
};
const stone = function (cat) {
const A = window.GEM_APPEARANCE && window.GEM_APPEARANCE.stones && window.GEM_APPEARANCE.stones[cat];
if (A) return [A.hue, A.sat];
return api.stones[cat] || api.stones.sapphire;
};
api.k3 = function (cat) { if (window.GEM_OPTICS && window.GEM_OPTICS.k3) return window.GEM_OPTICS.k3(cat); const s = stone(cat), v = hsv(s[0], s[1]); return v.map(function (q) { return -Math.log(Math.max(q, 1e-4)); }); };
api.kAt = function (cat, nm) {
const A = window.GEM_APPEARANCE;
if (A && A.kAt) return A.kAt(cat, nm);
return 0;
};
})();
