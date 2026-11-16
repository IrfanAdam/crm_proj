/* ADAM/SHARED — src/components/IllusionCube/illusion3d.js · canvas[data-illusion] mounts */
// [plan:2026-09-28_221212-illusion-cube-recreation.md#{#phase-7}] · [plan:2026-09-29_135509-illusion-cube-surface-revision.md#{#phase-4}] · mount + loop + explore hook.
// — Mount: renderer alpha false, DPR cap 2, NoToneMapping, ortho resize · the loop parks offscreen / hidden tab and IO +
// — visibilitychange re-arm it from the same clock; box read on a ResizeObserver, never in a frame · one static frame under
// — reduced motion · no THREE → painted stand-in — Export map: mounts canvas[data-illusion] on boot · ds:doc · DOM insert · ILLUSION3D.rigs · ILLUSION3D.still
(function () {
const THREE_ = window.THREE;
const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches, rigs = [];
const css = function (n) { return getComputedStyle(document.documentElement).getPropertyValue(n).trim(); };
const scale = function () { const s = window.__slowmo && window.__slowmo.getScale; return s ? s() : 1; };   // one clock: the slow-mo contract
const park = function (rig) { if (rig.raf) cancelAnimationFrame(rig.raf); rig.raf = 0; };
const arm = function (rig) { if (rig.raf || rig.gone || !rig.vis || document.hidden || rig.dead) return; rig.last = performance.now(); rig.raf = requestAnimationFrame(rig.frame); };
// — Fallback —
function fallback(canvas) {
const c = canvas.getContext('2d'), w = canvas.width = canvas.clientWidth || 480, h = canvas.height = canvas.clientHeight || 480;
const g = c.createLinearGradient(w * 0.2, 0, w * 0.9, h);
g.addColorStop(0, css('--primitive-sapphire-ui-200') || '#c1e0fd');
g.addColorStop(0.6, css('--primitive-amethyst-200') || '#debeff');
g.addColorStop(1, css('--primitive-red-beryl-200') || '#ffaac5');
c.fillStyle = g; c.globalAlpha = 0.5; c.beginPath(); c.roundRect(w * 0.14, h * 0.14, w * 0.72, h * 0.72, w * 0.08); c.fill();
}
// — Start —
function start(rig) {
const canvas = rig.canvas;
const renderer = new THREE_.WebGLRenderer({ canvas: canvas, antialias: true, alpha: false });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.toneMapping = THREE_.NoToneMapping;
Object.assign(rig, window.ILLUSION_SCENE.stage(renderer, canvas.clientWidth / Math.max(canvas.clientHeight, 16)), { renderer: renderer });
if (window.ILLUSION_EXPLORE) window.ILLUSION_EXPLORE.attach(rig, canvas);
const size = function () {
const cw = canvas.clientWidth, ch = canvas.clientHeight;
rig.dead = !cw || !ch;                                 // a display:none/0-box canvas has nothing to draw
const w = Math.max(cw, 16), h = Math.max(ch, 16);
if (rig.w === w && rig.h === h) return;
rig.w = w; rig.h = h; renderer.setSize(w, h, false);
if (rig.resize) rig.resize(w, h); else rig.camera.aspect = w / h;
if (!rig.resize) rig.camera.updateProjectionMatrix();
};
size();
if (window.ResizeObserver && !rig.ro) { rig.ro = new window.ResizeObserver(function () { size(); arm(rig); }); rig.ro.observe(canvas); }
if (window.ILLUSION_AUDIO) window.ILLUSION_AUDIO.arm();
if (!still && window.ILLUSION_CTL) window.ILLUSION_CTL.attach(rig, canvas);
if (still) {
window.ILLUSION_DRESS.still(rig);
rig.frames = 1; if (window.ILLUSION_FROST) window.ILLUSION_FROST.update(rig);
renderer.render(rig.scene, rig.camera);
return;
}
// — Loop —
const loop = function () {
rig.raf = 0;
if (rig.gone || !canvas.isConnected) {
rig.gone = true;
rigs.splice(rigs.indexOf(rig), 1);
park(rig);
if (window.ILLUSION_CTL) window.ILLUSION_CTL.detach(rig);
if (rig.renderer) { rig.renderer.dispose(); rig.renderer.forceContextLoss(); }
return;
}
const now = performance.now();
const dt = Math.min((now - rig.last) / 1000 || 0, 0.05) * scale();
rig.last = now;
if (!rig.vis || document.hidden || rig.dead) return;   // parked — no reschedule; the observers re-arm
if (rig.preset !== false) window.ILLUSION_DRESS.step(rig, dt);
if (window.ILLUSION_CTL) window.ILLUSION_CTL.step(rig, now); if (window.ILLUSION_FROST) window.ILLUSION_FROST.update(rig);
rig.frames = (rig.frames || 0) + 1;
renderer.render(rig.scene, rig.camera);
rig.raf = requestAnimationFrame(loop);
};
rig.frame = loop;
arm(rig);
}
// — Mount —
function mount(canvas) {
if (canvas.dataset.illusionDone) return;
canvas.dataset.illusionDone = '1';
const rig = { canvas: canvas, vis: false, t: 0, clock: 0, frames: 0, last: 0, w: 0, h: 0, raf: 0, frame: null, gone: false };
rigs.push(rig);
if (!THREE_ || !window.ILLUSION_SCENE || !window.ILLUSION_FORM || !window.ILLUSION_DRESS) { fallback(canvas); return; }
if (!window.IntersectionObserver) { rig.vis = true; start(rig); return; }
new IntersectionObserver(function (es) {
rig.vis = es[0].isIntersecting;
if (!rig.vis) return park(rig);
if (rig.renderer) arm(rig); else start(rig);
}, { rootMargin: '160px' }).observe(canvas);
}
const added = function (n) {
if (n.nodeType === 1) (n.matches('canvas[data-illusion]') ? [n] : Array.prototype.slice.call(n.querySelectorAll('canvas[data-illusion]'))).forEach(mount);
};
const boot = function () { document.querySelectorAll('canvas[data-illusion]').forEach(mount); };
const rearm = function () { for (let i = 0; i < rigs.length; i++) { if (rigs[i].vis && !document.hidden) arm(rigs[i]); else park(rigs[i]); } };
document.addEventListener('visibilitychange', rearm);
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
document.addEventListener('ds:doc', boot);
if (window.MutationObserver) new MutationObserver(function (list) {
list.forEach(function (m) { Array.prototype.forEach.call(m.addedNodes, added); });
}).observe(document.body, { childList: true, subtree: true });
window.ILLUSION3D = { rigs: rigs, still: still };
})();
