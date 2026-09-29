/* ADAM/SHARED — src/components/IllusionCube/illusion-stage.js · rig composer */
// [plan:2026-09-28_221212-illusion-cube-recreation.md#{#phase-2}] · staging composer (Task 13) · [plan:2026-09-29_135509-illusion-cube-surface-revision.md#{#phase-2}]
// — Compose: flat sky + fog, six bodies, lights, the one grounded floor, decoded camera —
// —   NoToneMapping + sRGB keep the background byte-exact; never ACES here —
// Export map: ILLUSION_STAGE.build(renderer, w, h) → rig · .rig() · .step(dt) no-op to Phase 4
(function () {
if (!window.THREE) return;
const T = window.THREE;
const api = {};
let current = null;
// — Build —
api.build = function (renderer, cssW, cssH) {
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = T.PCFSoftShadowMap;
const scene = new T.Scene();
scene.background = new T.Color(0xc2dcfa);
scene.fog = new T.Fog(0xc2dcfa, 1423.758, 1987.781);
const bodies = window.ILLUSION_BODIES.build();
const tex = window.ILLUSION_TEX.load(renderer);
bodies.main.material = window.ILLUSION_SHELL.material(tex);
bodies.main.renderOrder = 4;
const innerMats = bodies.cubes.map(function (m, i) { const mt = window.ILLUSION_INNER.materialFor(i); m.material = mt; return mt; });
bodies.cubes.forEach(function (m) { m.renderOrder = 2; });
bodies.base.material = window.ILLUSION_BASE.material(tex);
bodies.base.renderOrder = 3;
scene.add(bodies.group);
const lights = window.ILLUSION_LIGHTS.build(scene);
const floor = window.ILLUSION_FLOOR.build(scene);
const overlay = window.ILLUSION_TEXT.build(tex);
scene.add(overlay);
const camera = window.ILLUSION_CAMERA.frame(cssW, cssH);
const graybox = new URLSearchParams(location.search).has('graybox');
if (graybox) {
const flat = new T.MeshLambertMaterial({ color: 0x9aa4b0 });
bodies.all.forEach(function (m) { m.material = flat; });
floor.plane.visible = false;
overlay.visible = false;
}
current = { scene: scene, camera: camera, bodies: bodies, innerMats: innerMats, lights: lights, floor: floor, overlay: overlay, graybox: graybox };
current.renderer = renderer;
current.resize = function (w, h) { window.ILLUSION_CAMERA.resize(camera, w, h); };
return current;
};
// — Rig —
api.rig = function () { return current; };
// — Step: no-op until Phase 4 owns motion —
api.step = function (dt) {};
window.ILLUSION_STAGE = api;
})();
