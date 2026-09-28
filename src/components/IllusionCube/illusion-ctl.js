/* ADAM/SHARED — src/components/IllusionCube/illusion-ctl.js · click reveal state machine */
// [plan:2026-09-28_221212-illusion-cube-recreation.md#{#phase-5}] · Tasks 30-31: A/B machine + arrival chain.
// — Drives ILLUSION_TWEEN (poses) + ILLUSION_CHAIN (arrival chain); timeline lane owns the literals —
// Export map: ILLUSION_CTL.attach(rig, canvas) · .detach(rig) · .toggle(rig) · .step(rig, now) · .reveal(rig)
(function () {
var api = {};
var bag = function (rig) {
if (!rig.reveal) rig.reveal = { to: 'A', t0: 0, timers: [], idle: true, chained: false, raf: 0 };
return rig.reveal;
};
api.step = function (rig, now) {
var R = rig.reveal;
if (!R || R.idle) return;
var T = window.ILLUSION_TWEEN;
var C = window.ILLUSION_CHAIN;
if (!T || !C) return;
var t = now || performance.now();
var out = R.to === 'B';
var cw = out ? T.bez(T.cl((t - R.t0) / T.OUT_MS)) : T.ez4(T.cl((t - R.t0) / T.BACK_MS));
var lw = out ? T.bez(T.cl((t - R.t0) / T.LIGHT_MS)) : T.ez4(T.cl((t - R.t0) / T.BACK_MS));
T.apply(rig, R, out, cw, lw);
var settled = C.stepBlurb(rig, R, t);
var justFired = false;
if (out && cw >= 1 && !R.chained) {
R.chained = true;
C.fire(rig);
justFired = true;
}
if (!justFired && cw >= 1 && lw >= 1 && settled) R.idle = true;
};
api.toggle = function (rig) {
var T = window.ILLUSION_TWEEN;
var C = window.ILLUSION_CHAIN;
var rm = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
if (rm) return rig.reveal ? rig.reveal.to : 'A';
var R = bag(rig);
C.clear(R);
api.step(rig, performance.now());
T.snap(rig, R);
R.to = R.to === 'B' ? 'A' : 'B';
R.t0 = performance.now();
R.chained = false;
R.idle = false;
if (R.to === 'A') C.reset(rig, R);
C.kick(rig);
return R.to;
};
api.attach = function (rig, canvas) {
var R = bag(rig);
var el = canvas || rig.canvas || document.querySelector('canvas[data-illusion]');
R.el = el || null;
R.on = function () { api.toggle(rig); };
if (el && el.addEventListener) el.addEventListener('pointerup', R.on);
return R;
};
api.detach = function (rig) {
var C = window.ILLUSION_CHAIN;
var R = rig.reveal;
if (!R) return;
if (C) C.clear(R);
if (R.raf) cancelAnimationFrame(R.raf);
R.raf = 0;
if (R.el && R.on) R.el.removeEventListener('pointerup', R.on);
R.idle = true;
};
api.reveal = function (rig) {
var T = window.ILLUSION_TWEEN;
var C = window.ILLUSION_CHAIN;
var R = bag(rig);
C.clear(R);
T.snap(rig, R);
T.apply(rig, R, true, 1, 1);
C.full(rig);
R.to = 'B';
R.idle = true;
};
window.ILLUSION_CTL = api;
})();
