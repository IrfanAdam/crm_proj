/* ADAM/SHARED — src/components/GlassDeck/deck3d.js · canvas[data-deck] mounts */
// [plan:2026-10-05_000000-lump-sum-builds.md#phase-1] · mount + loop + lab verbs (Task 46). The loop parks offscreen / hidden tab;
// — IO + visibilitychange re-arm it from the same clock · box read on a ResizeObserver, never in a frame · one static frame under
// — reduced motion · no THREE → DECK_FALLBACK paints · drop() reaps detached rigs — Export map: DECK3D.rigs · station(name) · setMode('hold'|'loop') · control(el, p) · gap(k) · words(e, w) · mounts on ds:doc + DOM insert
(function () {
const THREE_ = window.THREE;
const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const rigs = [];
const scale = function () { const s = window.__slowmo && window.__slowmo.getScale; return s ? s() : 1; };   // one clock: the slow-mo contract
const park = function (rig) { if (rig.raf) cancelAnimationFrame(rig.raf); rig.raf = 0; };
const arm = function (rig) { if (rig.raf || rig.gone || !rig.vis || document.hidden || rig.dead) return; rig.last = performance.now(); rig.raf = requestAnimationFrame(rig.frame); };
function drop(rig) {
if (rig.gone) return;
rig.gone = true;
const i = rigs.indexOf(rig); if (i > -1) rigs.splice(i, 1);
park(rig);
if (rig.io) rig.io.disconnect();
if (rig.ro) rig.ro.disconnect();
if (rig.renderer) { rig.renderer.dispose(); rig.renderer.forceContextLoss(); }
}
function start(rig) {
const canvas = rig.canvas;
const renderer = new THREE_.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.toneMapping = THREE_.NoToneMapping;
Object.assign(rig, window.DECK_SCENE.stage(renderer, canvas.clientWidth / Math.max(canvas.clientHeight, 16)), { renderer: renderer });
const size = function () {
const cw = canvas.clientWidth, ch = canvas.clientHeight;
rig.dead = !cw || !ch;                                 // a display:none/0-box canvas has nothing to draw
const w = Math.max(cw, 16), h = Math.max(ch, 16);
if (rig.w === w && rig.h === h) return;
rig.w = w; rig.h = h;
renderer.setSize(w, h, false);
rig.camera.aspect = w / h;
rig.camera.updateProjectionMatrix();
};
size();
if (window.ResizeObserver && !rig.ro) { rig.ro = new window.ResizeObserver(function () { size(); arm(rig); }); rig.ro.observe(canvas); }
if (still) { window.DECK_DRESS.step(rig, 0); renderer.render(rig.scene, rig.camera); return; }
const loop = function () {
rig.raf = 0;
if (rig.gone || !canvas.isConnected) { drop(rig); return; }
const now = performance.now();
const dt = Math.min((now - rig.last) / 1000 || 0, 0.05) * scale();
rig.last = now;
if (!rig.vis || document.hidden || rig.dead) return;   // parked — no reschedule; the observers re-arm
window.DECK_DRESS.step(rig, dt);
renderer.render(rig.scene, rig.camera);
rig.raf = requestAnimationFrame(loop);
};
rig.frame = loop;
arm(rig);
}
function mount(canvas) {
if (canvas.dataset.deckDone) return;
canvas.dataset.deckDone = '1';
const rig = { canvas: canvas, vis: false, t: 0, last: 0, w: 0, h: 0, raf: 0, frame: null, gone: false };
rigs.push(rig);
if (!THREE_ || !window.DECK_SCENE || !window.DECK_FORM || !window.DECK_TEXT) {
if (window.DECK_FALLBACK) window.DECK_FALLBACK.paint(canvas);
return;
}
if (!window.IntersectionObserver) { rig.vis = true; start(rig); return; }
rig.io = new IntersectionObserver(function (es) {
rig.vis = es[0].isIntersecting;
if (!rig.vis) return park(rig);
if (rig.renderer) arm(rig); else start(rig);
}, { rootMargin: '160px' });
rig.io.observe(canvas);
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
const decks = function (n) { return n.matches('canvas[data-deck]') ? [n] : Array.prototype.slice.call(n.querySelectorAll('canvas[data-deck]')); };
const added = function (n) { if (n.nodeType === 1) decks(n).forEach(mount); };
const reap = function (n) {
if (n.nodeType !== 1) return;
decks(n).forEach(function (c) { if (c.isConnected) return; var i = rigs.length; while (i--) if (rigs[i].canvas === c) drop(rigs[i]); });
};
const boot = function () { document.querySelectorAll('canvas[data-deck]').forEach(mount); };
const rearm = function () { for (let i = 0; i < rigs.length; i++) { if (rigs[i].vis && !document.hidden) arm(rigs[i]); else park(rigs[i]); } };
document.addEventListener('visibilitychange', rearm);
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
document.addEventListener('ds:doc', boot);
if (window.MutationObserver) new MutationObserver(function (list) {
list.forEach(function (m) {
Array.prototype.forEach.call(m.addedNodes, added);
Array.prototype.forEach.call(m.removedNodes, function (n) { setTimeout(function () { reap(n); }, 0); });
});
}).observe(document.body, { childList: true, subtree: true });
window.DECK3D = api;
})();
