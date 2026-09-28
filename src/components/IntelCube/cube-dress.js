/* ADAM/SHARED — src/components/IntelCube/cube-dress.js · the core clock */
// [plan:2026-09-28_000000-lump-sum-builds.md#phase-5] · animation step (Task 20).
// — step(rig, dt): one clock drives the whole interior — blob noise time and breathing scale, —
// —   mote wrap and halo pulse — dt arrives clamped and nothing allocates per frame —
// Export map: CUBE_DRESS.step(rig, dt)
(function () {
const api = {};
api.step = function (rig, dt) {
rig.clock = (rig.clock || 0) + dt;
const c = rig.clock;
for (let i = 0; i < rig.cores.length; i++) {
const core = rig.cores[i];
core.mat.uniforms.uTime.value = c * 0.5 + core.phase;
core.mesh.scale.setScalar(1 + 0.045 * Math.sin(c * 0.31 + core.phase));
}
if (rig.motes) rig.motes.material.uniforms.uTime.value = c;
for (let i = 0; i < rig.halos.length; i++) {
const h = rig.halos[i];
h.sprite.material.opacity = h.op * (0.8 + 0.26 * Math.sin(c * 0.37 + h.phase));
}
};
window.CUBE_DRESS = api;
})();
