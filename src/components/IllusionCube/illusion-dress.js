/* ADAM/SHARED — src/components/IllusionCube/illusion-dress.js · the clock seam */
// [plan:2026-09-28_221212-illusion-cube-recreation.md#{#phase-1}] · clock step (Task 4).
// — Step: advance t/clock only; Phase 4 adds motion without restructuring —
// Export map: ILLUSION_DRESS.step(rig, dt)
(function () {
const api = {};
// — Step —
api.step = function (rig, dt) {
const c = Math.min(dt || 0, 0.05);
rig.t = (rig.t || 0) + c;
rig.clock = (rig.clock || 0) + c;
};
window.ILLUSION_DRESS = api;
})();
