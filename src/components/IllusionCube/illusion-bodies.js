/* ADAM/SHARED — src/components/IllusionCube/illusion-bodies.js · six decoded bodies */
// [plan:2026-09-28_221212-illusion-cube-recreation.md#{#phase-2}] · [plan:2026-09-29_135509-illusion-cube-surface-revision.md#{#phase-3}] · assembly at decoded transforms (Task 8).
// — Bodies: Main + Base extrusions plus four goo blobs under one Cubes group —
// —   the four decoded positions/rotations/scales below are FROZEN — the inners are —
// —   morphing blobs, not boxes; each blob carries its own additive halo as a CHILD —
// —   so halo position + scale ride the mesh for free (bodies.js supplies the index) —
// Export map: ILLUSION_BODIES.build() → { group, main, base, cubes, all }
(function () {
if (!window.THREE || !window.ILLUSION_FORM) return;
const T = window.THREE;
const api = {};
const DEG = Math.PI / 180;
// — Build —
api.build = function () {
const F = window.ILLUSION_FORM;
const D = F.DECODED;
const group = new T.Group();
group.position.set(0.5654364373828571, 97.03507571802716, 6.795859237940917);
const mainGeo = F.rect(D.MAIN.w, D.MAIN.h, D.MAIN.r, D.MAIN.depth, D.MAIN.bev, D.MAIN.bevSeg, 24);
const baseGeo = F.rect(D.BASE.w, D.BASE.h, D.BASE.r, D.BASE.depth, D.BASE.bev, D.BASE.bevSeg, 24);
const cubeGeo = F.blob(60.0428);
const mat = new T.MeshStandardMaterial({ color: 0x9aa3ab, roughness: 0.85, metalness: 0 });
const put = function (geo, p, r, s) {
const m = new T.Mesh(geo, mat);
m.position.set(p[0], p[1], p[2]);
m.rotation.set(r[0] * DEG, r[1] * DEG, r[2] * DEG);
m.scale.setScalar(s);
m.castShadow = true;
m.receiveShadow = true;
group.add(m);
return m;
};
const main = put(mainGeo, [0, -52.4, -5.795859237940908], [-90, 0, 0], 1);
const base = put(baseGeo, [0, -97.03507571802716, -5.795859237940917], [-90, 0, 0], 1);
const c1 = put(cubeGeo, [-8.521374173569408, -23.55471326715809, 8.451133961074877], [75.74512496206512, 59.061047822396276, 164.28674521569314], 1);
const c2 = put(cubeGeo, [53.440546456278305, 53.63087821913799, 2.981193736583908], [0, 0, 0], 0.3);
const c3 = put(cubeGeo, [-53.95107247711458, -56.16648277719783, -75.94923676944363], [-180, -4.783690037707766, -106.5582912807981], 0.3);
const c4 = put(cubeGeo, [52.21399409751854, -76.63084669032627, -80.82798331060346], [0, 0, -17.10904552531857], 0.3);
const cubes = [c1, c2, c3, c4];
// — Halos: children of the blobs (ILLUSION_INNER owns the texture + material) —
const I = window.ILLUSION_INNER;
if (I && I.haloFor) cubes.forEach(function (m, i) { m.add(I.haloFor(i)); });
return { group: group, main: main, base: base, cubes: cubes, all: [main, base, c1, c2, c3, c4] };
};
window.ILLUSION_BODIES = api;
})();
