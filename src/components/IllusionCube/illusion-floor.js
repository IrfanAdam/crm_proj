/* ADAM/SHARED — src/components/IllusionCube/illusion-floor.js · fogged grid plane + bleed pool */
// [plan:2026-09-28_221212-illusion-cube-recreation.md#{#phase-7}] · crossed line layers + glow (Task C).
// — Grid: 200-unit cells align under the cube; fog minta the soft horizon —
// —   band() returns the decoded 1600x1200 horizon scaled to the canvas —
// — Glow: soft Task-A-hue pool under the cube, child of the plane (graybox hides it too); —
// —   Normal blending + baked low alpha keep the grid + streak readable, no neon wash —
// Export map: ILLUSION_FLOOR.build(scene) → { plane, glow } · .band(camera, w, h) → [yStart, yFull]
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
// — Glow texture: three soft Task-A blobs (violet/blue/amber) on transparent —
const glowTex = function () {
const c = document.createElement('canvas');
c.width = 256;
c.height = 256;
const g = c.getContext('2d');
g.clearRect(0, 0, 256, 256);
const SC = window.ILLUSION_SCENE;
const css = function (n, fb) {
return '#' + new T.Color(SC ? SC.tok(n, fb) : fb).getHexString();
};
const blobs = [[118, 112, 120, '--primitive-illusion-glass-hi', 0xb500ff],
[152, 132, 110, '--primitive-illusion-glass-lo', 0x003bff],
[104, 136, 100, '--primitive-illusion-amber', 0xc69e14]];
g.globalAlpha = 0.3;
blobs.forEach(function (b) {
const r = g.createRadialGradient(b[0], b[1], 0, b[0], b[1], b[2]);
r.addColorStop(0, css(b[3], b[4]));
r.addColorStop(1, 'rgba(0,0,0,0)');
g.fillStyle = r;
g.fillRect(0, 0, 256, 256);
});
g.globalAlpha = 1;
return new T.CanvasTexture(c);
};
// — Build —
api.build = function (scene) {
const mat = new T.MeshPhongMaterial({ map: gridTex(), transparent: true, depthWrite: false, shininess: 10 });
const plane = new T.Mesh(new T.PlaneGeometry(10000, 10000), mat);
plane.rotation.x = -Math.PI / 2;
plane.position.y = Y;
plane.receiveShadow = true;
scene.add(plane);
// — Glow: flat pool ~4 cube footprints wide, 1.5 units above the grid —
const glow = new T.Mesh(new T.PlaneGeometry(760, 760),
new T.MeshBasicMaterial({ map: glowTex(), transparent: true, depthWrite: false }));
glow.position.z = 1.5;
glow.renderOrder = 1;
plane.add(glow);
return { plane: plane, glow: glow };
};
// — Band: fog 1423.758–1987.781 reads as y 761→538 at 1600x1200 —
api.band = function (camera, cssW, cssH) {
const s = cssH / 1200;
return [Math.round(761 * s), Math.round(538 * s)];
};
window.ILLUSION_FLOOR = api;
})();
