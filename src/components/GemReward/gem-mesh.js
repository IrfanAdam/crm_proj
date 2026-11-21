/* ADAM/SHARED — src/components/GemReward/gem-mesh.js · mesh entry normal for the interior trace (OPT-IN: ?gemmesh=1)
// The trace opens with ent() (gem-shader-ext.js): a max-t test against 170 facet planes. The visible stone already rasterises
// that same 444-tri cut, so the crossed facet is known for free — its interpolated world normal vN is the entry normal;
// entry normal. The plane set stays only where it is still exact, the 1..5 bounces in tr(). ONE call site is patched
// (ent → entM), at material creation. Kept: the plane-set parity check · aNb0..2 neighbour planes for the 0.9935 crease
// blend · the tfm surface clamp. Removed for good: the rejected back-face facet prepass (render target, depth texture,
// BackSide GREATER draw, facet-id in the bounce-0 search) — +6.1% and matched 0.01% of rays.
// Mode: OPT-IN · ?gemmesh=1 enables it, default (no param) = pure raymarch entry. It measured -9.5% frame
// (8.73 → 7.90 ms; 390x844 dpr3 · CPU x6 · bloom on), but it does not look the same: it shifts the girdle crease blend
// (girdle 19.3% of pixels >8/255 vs raymarch, bbox 2.4%, maxΔ 243, control 0.000%), so it stays opt-in pending a look
// ruling. Export: GEM_MESH { on · build · claim · attach · stats }
*/
(function () {
const api = {}, QS = String((window.location && window.location.search) || ''); window.GEM_MESH = api;
const qv = function (k) { const m = QS.match(new RegExp('[?&]' + k + '=([^&]*)')); return m ? m[1] : ''; };
api.on = function () { return qv('gemmesh') === '1'; };            // OPT-IN; only ?gemmesh=1 turns it on, default = raymarch
const COS = Math.cos((1 * Math.PI) / 180), DE = 4e-3, hub = [];    // hub: one record per claimed material
api.stat = { on: 0, tris: 0, planes: 0, patched: 0, entry: 'raymarch', errors: [] };   // console truth for the probe

// — tri → plane: the SAME merge gem-facets.js:37-39 does, in the same order, so index i here is PL(i) there.
function mapTris(cut) {
const p = cut.positions, cells = cut.cells, acc = [], tp = new Int16Array(cells.length);
for (let t = 0; t < cells.length; t++) {
const c = cells[t], a = p[c[0]], b = p[c[1]], d = p[c[2]];
if (!a || !b || !d) { tp[t] = -1; continue; }
const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2], wx = d[0] - a[0], wy = d[1] - a[1], wz = d[2] - a[2];
let nx = uy * wz - uz * wy, ny = uz * wx - ux * wz, nz = ux * wy - uy * wx, L = Math.hypot(nx, ny, nz);
if (L < 1e-9) { tp[t] = -1; continue; }
nx /= L; ny /= L; nz /= L; let dd = -(nx * a[0] + ny * a[1] + nz * a[2]);
if (dd > 0) { nx = -nx; ny = -ny; nz = -nz; dd = -dd; }
let hit = -1; for (let i = 0; i < acc.length && hit < 0; i++) if (acc[i][0] * nx + acc[i][1] * ny + acc[i][2] * nz > COS && Math.abs(acc[i][3] - dd) < DE) hit = i;
if (hit < 0) { acc.push([nx, ny, nz, dd]); hit = acc.length - 1; }
tp[t] = hit; }
return { acc: acc, tp: tp };
}

// — neighbours: up to 3 planes sharing an edge with the tri — the runner-up normal the 0.9935 crease blend needs.
function neighbours(cells, tp) {
const N = cells.length, key = function (i, j) { return i < j ? i + ':' + j : j + ':' + i; }, em = new Map(), out = [];
for (let t = 0; t < N; t++) { const c = cells[t]; for (let e = 0; e < 3; e++) { const k = key(c[e], c[(e + 1) % 3]), l = em.get(k); if (l) l.push(t); else em.set(k, [t]); } }
for (let t = 0; t < N; t++) { const c = cells[t], seen = [tp[t]], nb = [];
for (let e = 0; e < 3; e++) { const l = em.get(key(c[e], c[(e + 1) % 3])) || []; for (let q = 0; q < l.length; q++) { const p2 = tp[l[q]]; if (p2 < 0 || seen.indexOf(p2) >= 0) continue; seen.push(p2); nb.push(p2); } }
out.push(nb.slice(0, 3)); }
return out;
}

api.build = function () {
if (api._built) return api._built;                                  // built once per page, shared by every stone
const F = window.GEM_FACETS, C = window.GEM_CUT, T = window.THREE; if (!F || !C || !T || !F.planes.count) return null;
const cut = C.gemCut(C.CUT), m = mapTris(cut), R = F.planes.data;
if (m.acc.length !== F.planes.count) { api.stat.errors.push('plane-count ' + m.acc.length + ' vs ' + F.planes.count); return null; }
for (let i = 0; i < m.acc.length; i++) for (let q = 0; q < 4; q++) if (Math.fround(m.acc[i][q]) !== R[4 * i + q]) { api.stat.errors.push('plane ' + i + ' mismatch'); return null; }
const nbs = neighbours(cut.cells, m.tp), NO = [0, 0, 0, 1e9], pos = [], A = [], B = [], Cc = [];
for (let t = 0; t < cut.cells.length; t++) {
const c = cut.cells[t], k = nbs[t], f = [cut.positions[c[0]], cut.positions[c[1]], cut.positions[c[2]]];
const n0 = k[0] === undefined ? NO : m.acc[k[0]], n1 = k[1] === undefined ? NO : m.acc[k[1]], n2 = k[2] === undefined ? NO : m.acc[k[2]];
for (let v = 0; v < 3; v++) { pos.push(f[v][0], f[v][1], f[v][2]); A.push(n0[0], n0[1], n0[2], n0[3]); B.push(n1[0], n1[1], n1[2], n1[3]); Cc.push(n2[0], n2[1], n2[2], n2[3]); } }
const geo = new T.BufferGeometry(); geo.setAttribute('position', new T.Float32BufferAttribute(pos, 3));
geo.setAttribute('aNb0', new T.Float32BufferAttribute(A, 4)); geo.setAttribute('aNb1', new T.Float32BufferAttribute(B, 4)); geo.setAttribute('aNb2', new T.Float32BufferAttribute(Cc, 4));
api.stat.tris = cut.cells.length; api.stat.planes = m.acc.length;
return (api._built = { geo: geo, planes: m.acc, tp: m.tp, nb: nbs });
};

// — fragment side: entM() takes the rasterised entry plane + its 3 mesh neighbours, keeps the crease blend and the clamp,
// — and hands tr() plane index -1 (nothing to skip — the bounce chain stays on the plane set, unpatched).
// — VSD/FSY/ENTM live in gem-mesh-entry.js (line-budget split; loaded before this file).

api.patch = function (sm) {
const X = window.GEM_SHADER_EXT, E = window.GEM_MESH_ENTRY; let v = X.VS, f = sm.fragmentShader;
if (!E) { api.stat.errors.push('mesh-entry missing'); return 0; }
if (v.indexOf('aNb0') < 0) v = E.VSD + v.replace('void main() {\n', 'void main() {\n\tvNb0 = aNb0;\n\tvNb1 = aNb1;\n\tvNb2 = aNb2;\n');
if (f.indexOf('vec4 entM(') < 0) f = f.replace('uniform mat4 uM;', 'uniform mat4 uM;\n' + E.FSY).replace('vec3 tr( vec3 ro', E.ENTM + 'vec3 tr( vec3 ro');
if (f.indexOf('float tfm') < 0) f = f.replace('\tvec4 E = ent( ro, rd, tau );', '\tfloat tfm = length( vO - ro );\n\tvec3 nWv = normalize( vN );\n\tvec3 neM = normalize( vec3( dot( R[ 0 ], nWv ), dot( R[ 1 ], nWv ), dot( R[ 2 ], nWv ) ) );\n\tvec4 E = entM( ro, rd, tau, tfm, neM );');
if (v.indexOf('aNb0') < 0 || f.indexOf('varying vec4 vNb0') < 0 || f.indexOf('vec4 entM(') < 0 || f.indexOf('float tfm') < 0) { api.stat.errors.push('patch anchors missed'); return 0; }
sm.vertexShader = v; sm.fragmentShader = f; sm.needsUpdate = true; return 1;
};

// — claim(sm, o): from gem-shader.farside() at MATERIAL CREATION (never mid-animation). 0 = untouched raymarch entry.
api.claim = function (sm, o) {
if (!api.on() || !o || !o.core) return 0;
const b = api.build(); if (!b || !api.patch(sm)) return 0;
hub.push({ mat: sm, mesh: null, graft: 0 }); api.stat.on = 1; api.stat.patched += 1; api.stat.entry = 'mesh'; return 1;
};

// — attach(mesh): gem-shader.aim() on the core mesh's onBeforeRender. Once, it grafts the neighbour planes onto the VISIBLE
// — geometry (gem-scene-ext.js:20 builds its own buffer) so entM()'s crease blend has real data. No hook, no per-frame work.
api.attach = function (mesh) {
if (!mesh || !mesh.material || !api._built) return 0;
for (let i = 0; i < hub.length; i++) { const e = hub[i], g = mesh.geometry;
if (e.mat !== mesh.material) continue; if (!e.mesh) e.mesh = mesh;  // first real mesh for this material
if (e.graft || !g || !g.getAttribute('position')) continue;         // grafted already, or geometry not ready
if (!g.getAttribute('aNb0')) ['aNb0', 'aNb1', 'aNb2'].forEach(function (k) { const a = api._built.geo.getAttribute(k); if (a && a.count === g.getAttribute('position').count) g.setAttribute(k, a); });
e.graft = g.getAttribute('aNb0') ? 1 : 0; }                            // count mismatch → stays 0, retried next frame
return 1; };

api.stats = function () { return { on: api.stat.on, mode: api.on() ? 'mesh' : 'raymarch', tris: api.stat.tris, planes: api.stat.planes, patched: api.stat.patched, claims: hub.length, grafted: hub.filter(function (h) { return h.graft; }).length, errors: api.stat.errors }; };
})();
