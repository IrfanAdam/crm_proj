/* ADAM/SHARED — src/components/IllusionCube/illusion-dress.js · the clock seam */
// [plan:2026-09-28_221212-illusion-cube-recreation.md#{#phase-4}] · clock + dispatch (Tasks 26-29).
// — Step: advance t/clock, run the Phase 4 steppers, allocate nothing —
// Export map: ILLUSION_DRESS.step(rig, dt)
(function () {
const api = {};
// — Step —
api.step = function (rig, dt) {
const c = Math.min(dt || 0, 0.05);
rig.t = (rig.t || 0) + c;
rig.clock = (rig.clock || 0) + c;
if (!window.ILLUSION_MOTION || !window.ILLUSION_TIMELINE) return;
const M = window.ILLUSION_MOTION;
M.cubesStep(rig);
M.mainStep(rig);
M.baseStep(rig);
M.prismStep(rig);
M.lightsStep(rig);
};
// — Still: converged pose for reduced motion —
api.still = function (rig) {
rig.clock = 8;
if (!window.ILLUSION_MOTION || !window.ILLUSION_TIMELINE) return;
const M = window.ILLUSION_MOTION;
M.cubesStep(rig);
M.mainStep(rig);
M.baseStep(rig);
M.prismStep(rig);
M.lightsStep(rig);
};
window.ILLUSION_DRESS = api;
})();
