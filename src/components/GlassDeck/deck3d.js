/* ADAM/SHARED — src/components/GlassDeck/deck3d.js · canvas[data-deck] mounts */
// [plan:2026-10-05_000000-lump-sum-builds.md#phase-1] · mount + loop + lab verbs (Task 46).
// — Motion: paused offscreen, hidden tab; one static read frame under reduced motion · —
// —         no THREE → DECK_FALLBACK paints the stand-in —
// Export map: mounts canvas[data-deck] on boot · ds:doc · DOM insert · DECK3D.rigs ·
// —           DECK3D.station(name) · setMode('hold'|'loop') · control(el, p) · gap(k) · words(e, w)
(function () {
const THREE_ = window.THREE;
const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const rigs = [];
function start(rig) {
const canvas = rig.canvas;
const renderer = new THREE_.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.toneMapping = THREE_.NoToneMapping;
Object.assign(rig, window.DECK_SCENE.stage(renderer, canvas.clientWidth / Math.max(canvas.clientHeight, 16)), { renderer: renderer });
const size = function () {
const w = Math.max(canvas.clientWidth, 16), h = Math.max(canvas.clientHeight, 16);
if (rig.w === w && rig.h === h) return;
rig.w = w; rig.h = h;
renderer.setSize(w, h, false);
rig.camera.aspect = w / h;
rig.camera.updateProjectionMatrix();
};
size();
if (still) {
window.DECK_DRESS.step(rig, 0);
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
window.DECK_DRESS.step(rig, dt);
renderer.render(rig.scene, rig.camera);
};
requestAnimationFrame(loop);
}
function mount(canvas) {
if (canvas.dataset.deckDone) return;
canvas.dataset.deckDone = '1';
const rig = { canvas: canvas, vis: false, t: 0, last: 0, w: 0, h: 0, gone: false };
rigs.push(rig);
if (!THREE_ || !window.DECK_SCENE || !window.DECK_FORM || !window.DECK_TEXT) {
if (window.DECK_FALLBACK) window.DECK_FALLBACK.paint(canvas);
return;
}
if (!window.IntersectionObserver) { rig.vis = true; start(rig); return; }
new IntersectionObserver(function (es) {
rig.vis = es[0].isIntersecting;
if (rig.vis && !rig.renderer) start(rig);
}, { rootMargin: '160px' }).observe(canvas);
}
const api = { rigs: rigs, still: still };
api.station = function (name) {
const s = window.DECK_SCENE.STATIONS[name];
if (!s) return;
rigs.forEach(function (r) { r.mode = 'hold'; r.target.el = s.el; r.target.p = s.p; });
};
api.setMode = function (m) { rigs.forEach(function (r) { r.mode = m; }); };
api.control = function (el, p) { rigs.forEach(function (r) { r.mode = 'hold'; r.target.el = el; r.target.p = p; }); };
api.gap = function (k) { rigs.forEach(function (r) { window.DECK_SCENE.lay(r, k); }); };
api.words = function (e, w) { rigs.forEach(function (r) { r.text.paint(e, w); r.text.tex.needsUpdate = true; }); };
const added = function (n) {
if (n.nodeType === 1) (n.matches('canvas[data-deck]') ? [n] : Array.prototype.slice.call(n.querySelectorAll('canvas[data-deck]'))).forEach(mount);
};
const boot = function () { document.querySelectorAll('canvas[data-deck]').forEach(mount); };
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
document.addEventListener('ds:doc', boot);
if (window.MutationObserver) new MutationObserver(function (list) {
list.forEach(function (m) { Array.prototype.forEach.call(m.addedNodes, added); });
}).observe(document.body, { childList: true, subtree: true });
window.DECK3D = api;
})();
