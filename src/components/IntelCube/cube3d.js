/* ADAM/SHARED — src/components/IntelCube/cube3d.js · canvas[data-cube] mounts */
// [plan:2026-09-28_000000-lump-sum-builds.md#phase-5] · mount + motion (Task 20). Slow yaw drift, eased tilt sway, pointer parallax;
// — the loop parks offscreen / hidden tab and IO + visibilitychange re-arm it from the same clock · box read on a
// — ResizeObserver, never in a frame · one static frame under reduced motion · no THREE → painted stand-in —
// Export map: mounts canvas[data-cube] on boot · ds:doc · DOM insert · CUBE3D.rigs · CUBE3D.still
(function () {
const THREE_ = window.THREE;
const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const rigs = [];
const css = function (n) { return getComputedStyle(document.documentElement).getPropertyValue(n).trim(); };
const scale = function () { const s = window.__slowmo && window.__slowmo.getScale; return s ? s() : 1; };   // one clock: the slow-mo contract
const park = function (rig) { if (rig.raf) cancelAnimationFrame(rig.raf); rig.raf = 0; };
const arm = function (rig) { if (rig.raf || rig.gone || !rig.vis || document.hidden || rig.dead) return; rig.last = performance.now(); rig.raf = requestAnimationFrame(rig.frame); };
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
const cw = canvas.clientWidth, ch = canvas.clientHeight;
rig.dead = !cw || !ch;                                 // a display:none/0-box canvas has nothing to draw
const w = Math.max(cw, 16), h = Math.max(ch, 16);
if (rig.w === w && rig.h === h) return;
rig.w = w; rig.h = h;
renderer.setSize(w, h, false);
rig.camera.aspect = w / h; rig.camera.updateProjectionMatrix();
if (rig.motes) rig.motes.material.uniforms.uProj.value = (h * renderer.getPixelRatio()) / (2 * Math.tan((rig.fov * Math.PI) / 360));
};
size();
if (window.ResizeObserver && !rig.ro) { rig.ro = new window.ResizeObserver(function () { size(); arm(rig); }); rig.ro.observe(canvas); }
rig.yaw0 = -0.42;
if (still) { rig.group.rotation.y = rig.yaw0; renderer.render(rig.scene, rig.camera); return; }
const loop = function () {
rig.raf = 0;
if (rig.gone || !canvas.isConnected) {
rig.gone = true; rigs.splice(rigs.indexOf(rig), 1);
park(rig);
if (rig.renderer) { rig.renderer.dispose(); rig.renderer.forceContextLoss(); }
return;
}
const now = performance.now();
const dt = Math.min((now - rig.last) / 1000 || 0, 0.05) * scale();
rig.last = now;
if (!rig.vis || document.hidden || rig.dead) return;   // parked — no reschedule; the observers re-arm
window.CUBE_DRESS.step(rig, dt);
renderer.render(rig.scene, rig.camera);
rig.raf = requestAnimationFrame(loop);
};
rig.frame = loop;
arm(rig);
}
function mount(canvas) {
if (canvas.dataset.cubeDone) return;
canvas.dataset.cubeDone = '1';
const rig = { canvas: canvas, vis: false, t: 0, last: 0, aim: 0, aimT: 0, w: 0, h: 0, raf: 0, frame: null, gone: false };
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
if (!rig.vis) return park(rig);
if (rig.renderer) arm(rig); else start(rig);
}, { rootMargin: '160px' }).observe(canvas);
}
const added = function (n) {
if (n.nodeType === 1) (n.matches('canvas[data-cube]') ? [n] : Array.prototype.slice.call(n.querySelectorAll('canvas[data-cube]'))).forEach(mount);
};
const boot = function () { document.querySelectorAll('canvas[data-cube]').forEach(mount); };
const rearm = function () { for (let i = 0; i < rigs.length; i++) { if (rigs[i].vis && !document.hidden) arm(rigs[i]); else park(rigs[i]); } };
document.addEventListener('visibilitychange', rearm);
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
document.addEventListener('ds:doc', boot);
if (window.MutationObserver) new MutationObserver(function (list) {
list.forEach(function (m) { Array.prototype.forEach.call(m.addedNodes, added); });
}).observe(document.body, { childList: true, subtree: true });
window.CUBE3D = { rigs: rigs, still: still };
})();
