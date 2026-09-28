/* ADAM/SHARED — src/components/IllusionCube/illusion-scene.js · ortho stage + gray box */
// [plan:2026-09-28_221212-illusion-cube-recreation.md#{#phase-1}] · stage builder (Task 3).
// — Stage: flat sky background, no fog yet, ortho camera, gray Main + plinth —
// —   pose is placeholder; real decoded pose lands in Phase 2 Tasks 7–14 —
// Export map: ILLUSION_SCENE.stage(renderer, aspect) → rig · ILLUSION_SCENE.tok(name, fallback)
(function () {
if (!window.THREE) return;
const T = window.THREE;
const api = {};
const VIEW = 260;
// — Tokens —
const css = function (n) {
return getComputedStyle(document.documentElement).getPropertyValue(n).trim();
};
api.tok = function (n, fb) {
return css(n) || fb;
};
// — Stage —
api.stage = function (renderer, aspect) {
const scene = new T.Scene();
scene.background = new T.Color(api.tok('--primitive-sapphire-ui-200', 0xc2dcfa));
scene.fog = null;
const group = new T.Group();
const gray = new T.MeshStandardMaterial({ color: 0x9aa3ab, roughness: 0.85, metalness: 0 });
const dark = new T.MeshStandardMaterial({ color: 0x6b7280, roughness: 0.9, metalness: 0 });
const body = new T.Mesh(window.ILLUSION_FORM.box(200, 200, 149, 16, 4), gray);
body.position.y = 153;
const plinth = new T.Mesh(window.ILLUSION_FORM.box(200, 45, 200, 8, 2), dark);
plinth.position.y = 22.5;
group.add(body, plinth);
scene.add(group);
const key = new T.DirectionalLight(0xffffff, 1.2);
key.position.set(300, 500, 400);
const amb = new T.AmbientLight(0xffffff, 0.6);
scene.add(key, amb);
const a = Math.max(aspect || 1, 0.5);
const camera = new T.OrthographicCamera(-VIEW * a, VIEW * a, VIEW, -VIEW, 0.1, 5000);
camera.position.set(400, 420, 560);
camera.lookAt(0, 95, 0);
camera.zoom = 1;
camera.updateProjectionMatrix();
return { scene: scene, camera: camera, group: group, view: VIEW, clock: 0 };
};
window.ILLUSION_SCENE = api;
})();
