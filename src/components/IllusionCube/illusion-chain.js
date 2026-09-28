/* ADAM/SHARED — src/components/IllusionCube/illusion-chain.js · arrival chain + blurb */
// [plan:2026-09-28_221212-illusion-cube-recreation.md#{#phase-5}] · Task 31: timer bag, whoosh/bed2 cues, blurb drive.
// — Literals duplicate the timeline lane (illusion-timeline.js owns CHAIN; never drifted here) —
// Export map: ILLUSION_CHAIN.mesh/alpha/clear/fire/reset/stepBlurb/full/kick
(function () {
var api = {};
var BZ0 = 98.6648;
var BZ1 = 101.1018;
api.mesh = function (rig) {
var g = rig.overlay || rig.overlays || rig.text;
if (g && g.userData && g.userData.blurb) return g.userData.blurb;
return null;
};
api.alpha = function (m) {
var u = m.material && m.material.uniforms && m.material.uniforms.uAlpha;
return u ? u.value : 0;
};
var cue = function (n) {
var Au = window.ILLUSION_AUDIO;
if (Au && Au.cue) Au.cue(n);
};
api.clear = function (R) {
R.timers.forEach(function (id) {
clearTimeout(id);
});
R.timers = [];
};
var arm = function (R, m, a1, z1, dur) {
R.bm = m;
R.ba = m ? api.alpha(m) : 0;
R.bz = m ? m.position.z : BZ0;
R.fa = [a1, z1];
R.ft = [performance.now(), dur];
R.fon = !!m;
R.idle = false;
};
api.kick = function (rig) {
var R = rig.reveal;
if (R.raf) return;
var tick = function () {
R.raf = 0;
window.ILLUSION_CTL.step(rig);
if (!R.idle) R.raf = requestAnimationFrame(tick);
};
R.raf = requestAnimationFrame(tick);
};
api.fire = function (rig) {
var R = rig.reveal;
arm(R, api.mesh(rig), 0, BZ0, 1000);
R.timers.push(setTimeout(function () {
cue('whoosh');
}, 4000));
R.timers.push(setTimeout(function () {
cue('bed2');
}, 8000));
R.timers.push(setTimeout(function () {
arm(R, api.mesh(rig), 1, BZ1, 3000);
api.kick(rig);
}, 3000));
api.kick(rig);
};
api.reset = function (rig, R) {
arm(R, api.mesh(rig), 0, BZ0, 1000);
};
api.stepBlurb = function (rig, R, now) {
if (!R.fon) return true;
var T = window.ILLUSION_TWEEN;
var bw = T.ez4(T.cl((now - R.ft[0]) / R.ft[1]));
if (R.bm) {
if (R.bm.material.uniforms.uAlpha) R.bm.material.uniforms.uAlpha.value = T.lp(R.ba, R.fa[0], bw);
R.bm.position.z = T.lp(R.bz, R.fa[1], bw);
}
if (bw >= 1) R.fon = false;
return !R.fon;
};
api.full = function (rig) {
var m = api.mesh(rig);
if (!m) return;
if (m.material.uniforms.uAlpha) m.material.uniforms.uAlpha.value = 1;
m.position.z = BZ1;
};
window.ILLUSION_CHAIN = api;
})();
