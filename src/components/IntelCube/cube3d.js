/* ADAM/SHARED — src/components/IntelCube/cube3d.js · canvas[data-cube] mounts */
// [plan:2026-09-28_000000-lump-sum-builds.md#phase-5] · mount + motion (Task 20).
// — Motion: slow yaw drift, eased tilt sway, pointer parallax; paused offscreen, hidden tab, —
// —         one static frame under reduced motion · no THREE → a painted stand-in —
// Export map: mounts canvas[data-cube] on boot · ds:doc · DOM insert · CUBE3D.rigs · CUBE3D.still
(function () {
const THREE_ = window.THREE;
const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const rigs = [];
const css = function (n) { return getComputedStyle(document.documentElement).getPropertyValue(n).trim(); };
function fallback(canvas) {
const c = canvas.getContext('2d');
const w = canvas.width = canvas.clientWidth || 480;
const h = canvas.height = canvas.clientHeight || 480;
const g = c.createLinearGradient(w * 0.2, 0, w * 0.9, h);
g.addColorStop(0, css('--primitive-sapphire-ui-200') || '#c1e0fd');
g.addColorStop(0.6, css('--primitive-amethyst-200') || '#debeff');
g.addColorStop(1, css('--primitive-red-beryl-200') || '#ffaac5');
c.fillStyle = g;
c.globalAlpha = 0.5;
c.beginPath();
c.roundRect(w * 0.14, h * 0.14, w * 0.72, h * 0.72, w * 0.08);
c.fill();
}
function start(rig) {
const canvas = rig.canvas;
const renderer = new THREE_.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.toneMapping = THREE_.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;
Object.assign(rig, window.CUBE_SCENE.stage(renderer, canvas.clientWidth / Math.max(canvas.clientHeight, 16)), { renderer: renderer });
const size = function () {
const w = Math.max(canvas.clientWidth, 16), h = Math.max(canvas.clientHeight, 16);
if (rig.w === w && rig.h === h) return;
rig.w = w; rig.h = h;
renderer.setSize(w, h, false);
rig.camera.aspect = w / h; rig.camera.updateProjectionMatrix();
if (rig.motes) rig.motes.material.uniforms.uProj.value = (h * renderer.getPixelRatio()) / (2 * Math.tan((rig.fov * Math.PI) / 360));
};
size();
rig.yaw0 = -0.42;
if (still) {
rig.group.rotation.y = rig.yaw0;
renderer.render(rig.scene, rig.camera);
return;
}
const loop = function () {
if (rig.gone || !canvas.isConnected) {
rig.gone = true; rigs.splice(rigs.indexOf(rig), 1);
if (rig.renderer) { rig.renderer.dispose(); rig.renderer.forceContextLoss(); }
return;
}
requestAnimationFrame(loop);
const now = performance.now();
const dt = Math.min((now - rig.last) / 1000 || 0, 0.05);
rig.last = now;
size();
if (!rig.vis || document.hidden || !canvas.offsetParent) return;
window.CUBE_DRESS.step(rig, dt);
renderer.render(rig.scene, rig.camera);
};
requestAnimationFrame(loop);
}
function mount(canvas) {
if (canvas.dataset.cubeDone) return;
canvas.dataset.cubeDone = '1';
const rig = { canvas: canvas, vis: false, t: 0, last: 0, aim: 0, aimT: 0, w: 0, h: 0, gone: false };
rigs.push(rig);
canvas.addEventListener('pointermove', function (e) {
const b = canvas.getBoundingClientRect();
if (b.width < 1) return;
rig.aimT = ((e.clientX - b.left) / b.width - 0.5) * 0.24;
});
canvas.addEventListener('pointerleave', function () { rig.aimT = 0; });
if (!THREE_ || !window.CUBE_SCENE || !window.CUBE_FORM || !window.CUBE_CORE) { fallback(canvas); return; }
if (!window.IntersectionObserver) { rig.vis = true; start(rig); return; }
new IntersectionObserver(function (es) {
rig.vis = es[0].isIntersecting;
if (rig.vis && !rig.renderer) start(rig);
}, { rootMargin: '160px' }).observe(canvas);
}
const added = function (n) {
if (n.nodeType === 1) (n.matches('canvas[data-cube]') ? [n] : Array.prototype.slice.call(n.querySelectorAll('canvas[data-cube]'))).forEach(mount);
};
const boot = function () { document.querySelectorAll('canvas[data-cube]').forEach(mount); };
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
document.addEventListener('ds:doc', boot);
if (window.MutationObserver) new MutationObserver(function (list) {
list.forEach(function (m) { Array.prototype.forEach.call(m.addedNodes, added); });
}).observe(document.body, { childList: true, subtree: true });
window.CUBE3D = { rigs: rigs, still: still };
})();
