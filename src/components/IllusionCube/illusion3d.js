/* ADAM/SHARED — src/components/IllusionCube/illusion3d.js · canvas[data-illusion] mounts */
// [plan:2026-09-28_221212-illusion-cube-recreation.md#{#phase-1}] · mount + loop (Task 4).
// — Mount: renderer alpha false, DPR cap 2, NoToneMapping, ortho resize —
// —         one static frame under reduced motion · no THREE → painted stand-in —
// Export map: mounts canvas[data-illusion] on boot · ds:doc · DOM insert · ILLUSION3D.rigs · ILLUSION3D.still
(function () {
const THREE_ = window.THREE;
const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const rigs = [];
const css = function (n) { return getComputedStyle(document.documentElement).getPropertyValue(n).trim(); };
// — Fallback —
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
// — Start —
function start(rig) {
const canvas = rig.canvas;
const renderer = new THREE_.WebGLRenderer({ canvas: canvas, antialias: true, alpha: false });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.toneMapping = THREE_.NoToneMapping;
Object.assign(rig, window.ILLUSION_SCENE.stage(renderer, canvas.clientWidth / Math.max(canvas.clientHeight, 16)), { renderer: renderer });
// — Size —
const size = function () {
const w = Math.max(canvas.clientWidth, 16);
const h = Math.max(canvas.clientHeight, 16);
if (rig.w === w && rig.h === h) return;
rig.w = w;
rig.h = h;
renderer.setSize(w, h, false);
if (rig.resize) rig.resize(w, h);
else rig.camera.aspect = w / h;
if (!rig.resize) rig.camera.updateProjectionMatrix();
};
size();
if (still) {
renderer.render(rig.scene, rig.camera);
return;
}
// — Loop —
const loop = function () {
if (rig.gone || !canvas.isConnected) {
rig.gone = true;
rigs.splice(rigs.indexOf(rig), 1);
if (rig.renderer) { rig.renderer.dispose(); rig.renderer.forceContextLoss(); }
return;
}
requestAnimationFrame(loop);
const now = performance.now();
const dt = Math.min((now - rig.last) / 1000 || 0, 0.05);
rig.last = now;
size();
if (!rig.vis || document.hidden || !canvas.offsetParent) return;
window.ILLUSION_DRESS.step(rig, dt);
renderer.render(rig.scene, rig.camera);
};
requestAnimationFrame(loop);
}
// — Mount —
function mount(canvas) {
if (canvas.dataset.illusionDone) return;
canvas.dataset.illusionDone = '1';
const rig = { canvas: canvas, vis: false, t: 0, last: 0, w: 0, h: 0, gone: false };
rigs.push(rig);
if (!THREE_ || !window.ILLUSION_SCENE || !window.ILLUSION_FORM || !window.ILLUSION_DRESS) { fallback(canvas); return; }
if (!window.IntersectionObserver) { rig.vis = true; start(rig); return; }
new IntersectionObserver(function (es) {
rig.vis = es[0].isIntersecting;
if (rig.vis && !rig.renderer) start(rig);
}, { rootMargin: '160px' }).observe(canvas);
}
const added = function (n) {
if (n.nodeType === 1) (n.matches('canvas[data-illusion]') ? [n] : Array.prototype.slice.call(n.querySelectorAll('canvas[data-illusion]'))).forEach(mount);
};
const boot = function () { document.querySelectorAll('canvas[data-illusion]').forEach(mount); };
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
document.addEventListener('ds:doc', boot);
if (window.MutationObserver) new MutationObserver(function (list) {
list.forEach(function (m) { Array.prototype.forEach.call(m.addedNodes, added); });
}).observe(document.body, { childList: true, subtree: true });
window.ILLUSION3D = { rigs: rigs, still: still };
})();
