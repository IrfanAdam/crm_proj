/* ADAM/SHARED — src/components/IllusionCube/illusion-form.js · rect + chamfer + blob forms */
// [plan:2026-09-28_221212-illusion-cube-recreation.md#{#phase-2}] · [plan:2026-09-29_135509-illusion-cube-surface-revision.md#{#phase-3}] · fork of IntelCube block (Task 7).
// — Rect: centred rounded-rect extruded with rim bevel, z in [0, depth] —
// — Chamfer: non-indexed hard-facet box, the one computeVertexNormals use —
// — Blob: SphereGeometry base whose normals ARE analytic (normalize(position)) —
// —   the morph displaces along them, so this file welds and recomputes nothing —
// Export map: ILLUSION_FORM.rect(...) · ILLUSION_FORM.chamferBox(...) · .blob(r, seg) · .DECODED
(function () {
if (!window.THREE) return;
const T = window.THREE;
const api = {};
// — Rect —
api.rect = function (w, h, r, depth, bev, bevSeg, curveSeg) {
const iw = w - bev * 2, ih = h - bev * 2;
const x = -iw / 2, y = -ih / 2;
const s = new T.Shape();
s.moveTo(x + r, y); s.lineTo(x + iw - r, y);
s.absarc(x + iw - r, y + r, r, -Math.PI / 2, 0, false);
s.lineTo(x + iw, y + ih - r);
s.absarc(x + iw - r, y + ih - r, r, 0, Math.PI / 2, false);
s.lineTo(x + r, y + ih);
s.absarc(x + r, y + ih - r, r, Math.PI / 2, Math.PI, false);
s.lineTo(x, y + r);
s.absarc(x + r, y + r, r, Math.PI, Math.PI * 1.5, false);
const opt = { depth: depth - bev * 2, bevelEnabled: true, bevelThickness: bev, bevelSize: bev };
opt.bevelSegments = bevSeg; opt.curveSegments = curveSeg;
const geo = new T.ExtrudeGeometry(s, opt);
geo.translate(0, 0, bev);
return geo;
};
// — Blob: SphereGeometry(r, seg, 2/3·seg) — 48×32 at the default seg, always smooth —
// —   three writes the sphere's own radial normals; the displacement shader rides —
// —   those, so a blob can never facet and nothing here may be welded or recomputed —
api.blob = function (r, seg) {
const w = seg || 48;
const g = new T.SphereGeometry(r, w, Math.round(w * 2 / 3));
g.userData.blob = true;
return g;
};
// — Chamfer —
api.chamferBox = function (w, h, d, r) {
const H = [w / 2, h / 2, d / 2];
const Q = [H[0] - r, H[1] - r, H[2] - r];
const v = [];
const tri = function (a, b, c) { v.push(a[0], a[1], a[2], b[0], b[1], b[2], c[0], c[1], c[2]); };
const quad = function (a, b, c, e) { tri(a, b, c); tri(a, c, e); };
// — Faces: inset quads —
for (let a = 0; a < 3; a++) {
const u = (a + 1) % 3;
const k = (a + 2) % 3;
for (let s = -1; s <= 1; s += 2) {
const p = [[0, 0, 0], [0, 0, 0], [0, 0, 0], [0, 0, 0]];
const sg = [[-1, -1], [1, -1], [1, 1], [-1, 1]];
for (let i = 0; i < 4; i++) {
p[i][a] = s * H[a]; p[i][u] = sg[i][0] * Q[u]; p[i][k] = sg[i][1] * Q[k];
}
if (s > 0) quad(p[0], p[1], p[2], p[3]);
else quad(p[0], p[3], p[2], p[1]);
}
}
// — Edges: chamfer bands —
for (let e = 0; e < 3; e++) {
const b = (e + 1) % 3;
const c = (e + 2) % 3;
for (let sb = -1; sb <= 1; sb += 2) {
for (let sc = -1; sc <= 1; sc += 2) {
const p1 = [0, 0, 0], p2 = [0, 0, 0], p3 = [0, 0, 0], p4 = [0, 0, 0];
p1[e] = -Q[e]; p1[b] = sb * H[b]; p1[c] = sc * Q[c]; p2[e] = Q[e]; p2[b] = sb * H[b]; p2[c] = sc * Q[c];
p3[e] = Q[e]; p3[b] = sb * Q[b]; p3[c] = sc * H[c]; p4[e] = -Q[e]; p4[b] = sb * Q[b]; p4[c] = sc * H[c];
tri(p1, p3, p2); tri(p1, p4, p3);
}
}
}
// — Corners: chamfer triangles —
for (let sx = -1; sx <= 1; sx += 2) {
for (let sy = -1; sy <= 1; sy += 2) {
for (let sz = -1; sz <= 1; sz += 2) {
const px = [sx * H[0], sy * Q[1], sz * Q[2]];
const py = [sx * Q[0], sy * H[1], sz * Q[2]];
const pz = [sx * Q[0], sy * Q[1], sz * H[2]];
if (sx * sy * sz > 0) tri(px, py, pz);
else tri(pz, py, px);
}
}
}
const g = new T.BufferGeometry();
g.setAttribute('position', new T.Float32BufferAttribute(v, 3));
g.computeVertexNormals();
return g;
};
api.DECODED = {
MAIN: { w: 200, h: 200, r: 16, depth: 149.07015143605216, bev: 4, bevSeg: 4 },
BASE: { w: 200, h: 200, r: 16, depth: 45, bev: 4, bevSeg: 4 },
CUBE: { w: 120.08558997993715, h: 111.42530848890283, d: 120.08558997993715, r: 27, seg: 1 }
};
window.ILLUSION_FORM = api;
})();
