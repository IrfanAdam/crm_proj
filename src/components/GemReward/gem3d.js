/* ADAM/SHARED — src/components/GemReward/gem3d.js · THREE gem mounts */
// [plan:2026-09-21_000000-lump-sum-builds.md#phase-7] · canvas mount + motion (Task 22) + bare-stage guards. Color: category token → getComputedStyle.
// — Motion: dt spin + float + pointer tilt, no per-frame allocation; the loop parks offscreen/hidden and IO + visibilitychange re-arm it
// — from the same clock; no frame reads a layout rect · Drag: gem-drag.js owns the pointer · no THREE → GEM_FALLBACK — Export map: mounts canvas[data-gem] · ds:doc · DOM insert · frees removed canvases · GEM3D.bg(url) · GEM3D.restage().
(function () {
const THREE_ = window.THREE, GEM = window.GEM_CUT;
const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const rigs = [];
const css = function (name) { return getComputedStyle(document.documentElement).getPropertyValue(name).trim(); };
const huePaint = function (hex, h) { const c = new THREE_.Color(hex), o = {}; c.getHSL(o); c.setHSL(h / 360, o.s, o.l); return '#' + c.getHexString(); };
const scale = function () { const s = window.__slowmo && window.__slowmo.getScale; return s ? s() : 1; };   // one clock: the slow-mo contract
const park = function (rig) { if (rig.raf) cancelAnimationFrame(rig.raf); rig.raf = 0; };
const arm = function (rig) { if (rig.raf || rig.gone || !rig.vis || document.hidden) return; rig.last = performance.now(); rig.raf = requestAnimationFrame(rig.frame); };
function start(rig) {
const canvas = rig.canvas;
const renderer = new THREE_.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.toneMapping = THREE_.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.95;
Object.assign(rig, window.GEM_SCENE.stage(renderer, new THREE_.Color(rig.paint), GEM.gemCut(GEM.CUT), canvas.clientWidth / Math.max(canvas.clientHeight, 16), rig.cat.ior), { renderer: renderer });
window.GEM_RIG.backdrop(rig);
window.GEM_RIG.size(rig);                          // first measure; the ResizeObserver in gem-rig keeps it fresh — never the frame
if (still) {
rig.group.rotation.y = 0.6;
renderer.render(rig.scene, rig.camera);
return;
}
const loop = function () {
rig.raf = 0;
if (rig.gone || !canvas.isConnected) {
rig.gone = true;
rigs.splice(rigs.indexOf(rig), 1);
park(rig);
if (rig.renderer) rig.renderer.dispose(), rig.renderer.forceContextLoss();
return;
}
const now = performance.now();
const dt = Math.min((now - rig.last) / 1000 || 0, 0.05) * scale();
rig.last = now;
if (!rig.vis || document.hidden || rig.dead) return;   // parked — no reschedule; the observers re-arm
window.GEM_RIG.tick(rig);   // backdrop + pool law — idempotent, cheap, true even across first compile
if (window.GEM_TINT) window.GEM_TINT.step(rig, dt);
if (!(window.GEM_DRAG && window.GEM_DRAG.apply(rig, now, dt))) {
const at = window.GEM_DRAG && window.GEM_DRAG.at;      // box cached by gem-drag on input/scroll — never read a rect in here
if (at && rig.box && rig.box.width > 1) rig.tiltT = Math.max(-1, Math.min(1, ((at.clientX - rig.box.left) / rig.box.width - 0.5) * 2)) * 0.14;
rig.t += dt;
rig.tilt += (rig.tiltT - rig.tilt) * (1 - Math.pow(0.0005, dt));
rig.group.rotation.y = rig.cat.spin * rig.t * 0.9;
rig.group.rotation.x = rig.tilt;
rig.group.position.y = Math.sin(rig.t * 0.8) * 0.03;
}
if (window.GEM_BARE && window.GEM_BARE.aim) window.GEM_BARE.aim(rig);
renderer.render(rig.scene, rig.camera);
rig.raf = requestAnimationFrame(loop);
};
rig.frame = loop;
arm(rig);
}
const added = function (n) {
if (n.nodeType === 1) (n.matches('canvas[data-gem]') ? [n] : Array.prototype.slice.call(n.querySelectorAll('canvas[data-gem]'))).forEach(mount);
};
function mount(canvas) {
if (canvas.dataset.gemDone) return;
const cat = GEM && GEM.CATEGORIES[canvas.dataset.gem];
if (!cat) return;
canvas.dataset.gemDone = '1';
const raw = css(cat.token) || css('--primitive-sapphire-ui-500');
const ap = window.GEM_APPEARANCE && window.GEM_APPEARANCE.stones && window.GEM_APPEARANCE.stones[canvas.dataset.gem];
const paint = (ap && THREE_) ? huePaint(raw, ap.hue) : raw;   // the measured record owns the hue, the UI token owns lightness/sat
const rig = { canvas: canvas, cat: cat, paint: paint, renderer: null, vis: false, t: 0, last: 0, tilt: 0, tiltT: 0, w: 0, h: 0, boxT: 0, box: null, raf: 0, frame: null, gone: false };
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
// — two margins: 160 px pre-warms the mount (compile, first frame), 0 px is the only thing that renders — a rig
// — 160 px outside the viewport used to keep drawing on every scroll. near/vis are separate flags for that reason.
const near = new IntersectionObserver(function (es) { if (!es[0].isIntersecting) return; rig.near = true; if (!rig.renderer) start(rig); else if (rig.vis) arm(rig); }, { rootMargin: '160px' });
const seen = new IntersectionObserver(function (es) { rig.vis = es[0].isIntersecting; if (!rig.vis) return park(rig); if (rig.renderer) arm(rig); else if (rig.near) start(rig); }, { rootMargin: '0px' });
near.observe(canvas); seen.observe(canvas);
}
const boot = function () { document.querySelectorAll('canvas[data-gem]').forEach(mount); };
const rearm = function () { for (let i = 0; i < rigs.length; i++) { if (rigs[i].vis && !document.hidden) arm(rigs[i]); else park(rigs[i]); } };
const retrack = function (force) { if (window.GEM_DRAG && window.GEM_DRAG.track) window.GEM_DRAG.track(null, force); };
document.addEventListener('visibilitychange', rearm);
window.addEventListener('scroll', function () { retrack(true); }, { passive: true, capture: true });   // rect moved under a still pointer
window.addEventListener('resize', function () { for (let i = 0; i < rigs.length; i++) window.GEM_RIG.size(rigs[i]); retrack(true); }, { passive: true });
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
document.addEventListener('ds:doc', boot);
if (window.MutationObserver) new MutationObserver(function (list) {
list.forEach(function (m) { Array.prototype.forEach.call(m.addedNodes, added); });
}).observe(document.body, { childList: true, subtree: true });
window.GEM3D = { rigs: rigs, bg: function (url) { if (window.GEM_RIG) window.GEM_RIG.bg(url, rigs); }, restage: function () { if (window.GEM_RIG) window.GEM_RIG.restage(rigs); } };
})();
