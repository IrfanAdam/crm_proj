/* ADAM/SHARED — src/components/IllusionCube/illusion-prism.js · floor streak mask */
// [plan:2026-09-28_221212-illusion-cube-recreation.md#{#phase-2}] · exact quad + stand-in (Task 12).
// — Mask: object-space falloff along +x; the quad boundary stays invisible —
// —   Phase 3 repaints the flat white with the masked matcap + phong stack —
// Export map: ILLUSION_PRISM.build(scene) → mesh
(function () {
if (!window.THREE) return;
const T = window.THREE;
const api = {};
// — Build —
api.build = function (scene) {
const geo = new T.PlaneGeometry(921.2535744979286, 1082.0878980260457, 8, 8);
const c = document.createElement('canvas');
c.width = 256;
c.height = 1;
const g = c.getContext('2d');
const grad = g.createLinearGradient(0, 0, 256, 0);
grad.addColorStop(0, 'rgba(255,255,255,1)');
grad.addColorStop(0.668, 'rgba(255,255,255,1)');
grad.addColorStop(0.888, 'rgba(255,255,255,0)');
grad.addColorStop(1, 'rgba(255,255,255,0)');
g.fillStyle = grad;
g.fillRect(0, 0, 256, 1);
const mat = new T.MeshBasicMaterial({ map: new T.CanvasTexture(c), transparent: true, depthWrite: false });
const mesh = new T.Mesh(geo, mat);
mesh.position.set(-194.01257223931134, 0.7191718729590956, -8.388145252858408);
mesh.rotation.x = -Math.PI / 2;
mesh.receiveShadow = true;
mesh.castShadow = false;
scene.add(mesh);
return mesh;
};
window.ILLUSION_PRISM = api;
})();
