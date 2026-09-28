/* ADAM/SHARED — src/components/IntelCube/cube-floor.js · stage floor + caustic pool */
// [plan:2026-09-28_000000-lump-sum-builds.md#phase-7] · ground dresser (Task 23).
// — Grid: pale blue plane with a diamond weave the block floats over (token colours only) —
// — Caustic: a soft pool the core's live hue tints every frame — the rainbow smear that shifts —
// —          with the interior, exactly like the reference recording —
// — Shadow: the gem contact pool, reused — ground the block without a transmission pass —
// Export map: CUBE_FLOOR.dress(scene, rig, total) · step(rig, dt) · grid() → CanvasTexture
(function () {
if (!window.THREE) return;
const T = window.THREE;
const api = {};
const css = function (n) { return getComputedStyle(document.documentElement).getPropertyValue(n).trim(); };
const rgba = function (hex, a) {
const m = /^#?([0-9a-f]{6})$/i.exec(String(hex).trim());
if (!m) return 'rgba(214,228,248,' + a + ')';
const n = parseInt(m[1], 16);
return 'rgba(' + (n >> 16 & 255) + ',' + (n >> 8 & 255) + ',' + (n & 255) + ',' + a + ')';
};
api.grid = function () {
const cv = document.createElement('canvas');
cv.width = 512; cv.height = 512;
const c = cv.getContext('2d');
c.fillStyle = rgba(css('--primitive-sapphire-ui-100'), 1);
c.fillRect(0, 0, 512, 512);
c.strokeStyle = rgba(css('--primitive-sapphire-ui-300'), 0.42);
c.lineWidth = 1.5;
for (let d = -512; d <= 512; d += 32) {
c.beginPath();
c.moveTo(d, 0);
c.lineTo(d + 512, 512);
c.stroke();
c.beginPath();
c.moveTo(d + 512, 0);
c.lineTo(d, 512);
c.stroke();
}
const t = new T.CanvasTexture(cv);
t.colorSpace = T.SRGBColorSpace;
t.wrapS = T.RepeatWrapping;
t.wrapT = T.RepeatWrapping;
t.repeat.set(3.5, 3.5);
t.anisotropy = 8;
return t;
};
api.pool = function () {
const cv = document.createElement('canvas');
cv.width = 256; cv.height = 256;
const c = cv.getContext('2d');
const g = c.createRadialGradient(128, 128, 0, 128, 128, 128);
g.addColorStop(0, 'rgba(255,255,255,0.78)');
g.addColorStop(0.42, 'rgba(255,255,255,0.5)');
g.addColorStop(0.78, 'rgba(255,255,255,0.14)');
g.addColorStop(1, 'rgba(255,255,255,0)');
c.fillStyle = g;
c.fillRect(0, 0, 256, 256);
const t = new T.CanvasTexture(cv);
t.colorSpace = T.SRGBColorSpace;
return t;
};
api.dress = function (scene, rig, total) {
if (!rig.floorTex) rig.floorTex = api.grid();
if (!rig.poolTex) rig.poolTex = api.pool();
const y = -total / 2;
const grid = new T.Mesh(new T.PlaneGeometry(9, 9), new T.MeshBasicMaterial({ map: rig.floorTex }));
grid.rotation.x = -Math.PI / 2;
grid.position.y = y - 0.014;
grid.renderOrder = 0;
scene.add(grid);
let shadow = null;
if (window.GEM_TEXTURES) {
shadow = new T.Mesh(new T.PlaneGeometry(2.2, 1.4), new T.MeshBasicMaterial({ map: window.GEM_TEXTURES.shadow(), transparent: true, opacity: 0.42, depthWrite: false }));
shadow.rotation.x = -Math.PI / 2;
shadow.position.y = y - 0.01;
scene.add(shadow);
}
const pool = function (w, h, x, z, ly, op, hex) {
const m = new T.Mesh(new T.PlaneGeometry(w, h), new T.MeshBasicMaterial({ map: rig.poolTex, color: new T.Color(hex), transparent: true, opacity: op, depthWrite: false }));
m.rotation.x = -Math.PI / 2;
m.position.set(x, y - ly, z);
m.renderOrder = 1;
scene.add(m);
return m;
};
const caustic = pool(3.0, 2.0, -0.14, -0.1, 0.006, 0.52, css('--primitive-red-beryl-300') || 0xff85ab);
const counter = pool(1.9, 1.3, 0.42, 0.16, 0.005, 0.42, css('--primitive-sapphire-ui-300') || 0x7cbefb);
rig.floor = { grid: grid, caustic: caustic, counter: counter, shadow: shadow, white: new T.Color(css('--primitive-gray-white') || 0xffffff) };
};
api.step = function (rig) {
if (!rig.floor || !rig.cores.length) return;
const u = rig.cores[0].mat.uniforms;
rig.floor.caustic.material.color.copy(u.uCore.value).lerp(rig.floor.white, 0.1);
rig.floor.counter.material.color.copy(u.uCool.value).lerp(rig.floor.white, 0.2);
const s = 1 + 0.05 * Math.sin((rig.clock || 0) * 0.23);
rig.floor.caustic.scale.setScalar(s);
rig.floor.counter.scale.setScalar(2 - s);
};
window.CUBE_FLOOR = api;
})();
