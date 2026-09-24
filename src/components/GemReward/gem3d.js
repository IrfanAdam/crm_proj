/* ADAM/SHARED — src/components/GemReward/gem3d.js · THREE gem mounts */
// [plan:2026-09-21_000000-lump-sum-builds.md#phase-5] · canvas mount + motion (Task 22).
// — Color: category token → getComputedStyle; no CSS filter recolors the canvas any more —
// — Motion: dt-based spin + float + pointer tilt, eased, no per-frame allocation; paused offscreen, —
// — hidden tab, reduced motion (one static frame) · Degrade: no THREE → GEM_FALLBACK.paint paints it —
// Export map: mounts canvas[data-gem] on boot · ds:doc · DOM insert · frees removed canvases.
(function () {
const THREE_ = window.THREE, GEM = window.GEM_CUT;
const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const rigs = [];
const ptr = { at: null };
const css = function (name) {
return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
};
function start(rig) {
const canvas = rig.canvas;
const renderer = new THREE_.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.toneMapping = THREE_.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.95;
Object.assign(rig, window.GEM_SCENE.stage(renderer, new THREE_.Color(rig.paint), GEM.gemCut(GEM.CUT), canvas.clientWidth / Math.max(canvas.clientHeight, 16)), { renderer: renderer });
const size = function () {
const w = Math.max(canvas.clientWidth, 16), h = Math.max(canvas.clientHeight, 16);
if (rig.w === w && rig.h === h) return;
rig.w = w, rig.h = h;
renderer.setSize(w, h, false);
rig.camera.aspect = w / h;
rig.camera.updateProjectionMatrix();
};
size();
if (still) {
rig.group.rotation.y = 0.6;
renderer.render(rig.scene, rig.camera);
return;
}
const loop = function () {
if (rig.gone || !canvas.isConnected) {
rig.gone = true;
rigs.splice(rigs.indexOf(rig), 1);
if (rig.renderer) rig.renderer.dispose(), rig.renderer.forceContextLoss();
return;
}
requestAnimationFrame(loop);
const now = performance.now();
const dt = Math.min((now - rig.last) / 1000 || 0, 0.05);
rig.last = now;
size();
if (!rig.vis || document.hidden || !canvas.offsetParent) return;
const box = canvas.getBoundingClientRect();
if (ptr.at && box.width > 1) rig.tiltT = Math.max(-1, Math.min(1, ((ptr.at.clientX - box.left) / box.width - 0.5) * 2)) * 0.14;
rig.t += dt;
rig.tilt += (rig.tiltT - rig.tilt) * (1 - Math.pow(0.0005, dt));
rig.group.rotation.y = rig.cat.spin * rig.t * 0.9;
rig.group.rotation.x = rig.tilt;
rig.group.position.y = Math.sin(rig.t * 0.8) * 0.045;
renderer.render(rig.scene, rig.camera);
};
requestAnimationFrame(loop);
}
const added = function (n) {
if (n.nodeType === 1) (n.matches('canvas[data-gem]') ? [n] : Array.prototype.slice.call(n.querySelectorAll('canvas[data-gem]'))).forEach(mount);
};
function mount(canvas) {
if (canvas.dataset.gemDone) return;
const cat = GEM && GEM.CATEGORIES[canvas.dataset.gem];
if (!cat) return;
canvas.dataset.gemDone = '1';
const paint = css(cat.token) || css('--primitive-sapphire-ui-500');
const rig = { canvas: canvas, cat: cat, paint: paint, renderer: null, vis: false, t: 0, last: 0, tilt: 0, tiltT: 0, w: 0, h: 0, gone: false };
rigs.push(rig);
if (!THREE_ || !window.GEM_SCENE || !window.GEM_SCENE.stage || !GEM.gemCut) {
if (window.GEM_FALLBACK) window.GEM_FALLBACK.paint(canvas, paint || css('--text-secondary'));
return;
}
if (!window.IntersectionObserver) {
rig.vis = true;
start(rig);
return;
}
new IntersectionObserver(function (es) {
rig.vis = es[0].isIntersecting;
if (rig.vis && !rig.renderer) start(rig);
}, { rootMargin: '160px' }).observe(canvas);
}
const boot = function () { document.querySelectorAll('canvas[data-gem]').forEach(mount); };
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
else boot();
document.addEventListener('ds:doc', boot);
window.addEventListener('pointermove', function (e) {
ptr.at = e;
}, { passive: true });
if (window.MutationObserver) new MutationObserver(function (list) {
list.forEach(function (m) { Array.prototype.forEach.call(m.addedNodes, added); });
}).observe(document.body, { childList: true, subtree: true });
})();
