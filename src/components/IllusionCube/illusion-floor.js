/* ADAM/SHARED — src/components/IllusionCube/illusion-floor.js · fogged grid plane */
// [plan:2026-09-28_221212-illusion-cube-recreation.md#{#phase-2}] · crossed line layers (Task 11).
// — Grid: 200-unit cells align under the cube; fog minta the soft horizon —
// —   band() returns the decoded 1600x1200 horizon scaled to the canvas —
// Export map: ILLUSION_FLOOR.build(scene) → { plane } · .band(camera, w, h) → [yStart, yFull]
(function () {
if (!window.THREE) return;
const T = window.THREE;
const api = {};
const Y = -199.453741;
// — Grid texture: blue hairlines on transparent, one cell per 200 units —
const gridTex = function () {
const c = document.createElement('canvas');
c.width = 512;
c.height = 512;
const g = c.getContext('2d');
g.clearRect(0, 0, 512, 512);
g.fillStyle = 'rgba(0,62,255,0.3)';
g.fillRect(0, 0, 5, 512);
g.fillRect(0, 0, 512, 5);
const t = new T.CanvasTexture(c);
t.wrapS = T.RepeatWrapping;
t.wrapT = T.RepeatWrapping;
t.repeat.set(50, 50);
return t;
};
// — Build —
api.build = function (scene) {
const mat = new T.MeshPhongMaterial({ map: gridTex(), transparent: true, depthWrite: false, shininess: 10 });
const plane = new T.Mesh(new T.PlaneGeometry(10000, 10000), mat);
plane.rotation.x = -Math.PI / 2;
plane.position.y = Y;
plane.receiveShadow = true;
scene.add(plane);
return { plane: plane };
};
// — Band: fog 1423.758–1987.781 reads as y 761→538 at 1600x1200 —
api.band = function (camera, cssW, cssH) {
const s = cssH / 1200;
return [Math.round(761 * s), Math.round(538 * s)];
};
window.ILLUSION_FLOOR = api;
})();
