/* ADAM/SHARED — src/components/IntelCube/cube-dress.js · the core clock */
// [plan:2026-09-28_000000-lump-sum-builds.md#phase-5] · animation step (parity pass).
// — step(rig, dt): one clock drives everything — blob noise time, breathing scale, metaball drift —
// —   (blobs swim toward/apart on their base positions), mote wrap, halo pulse, group yaw/tilt/bob, —
// —   the slow dolly-in, and the hue migration: every stop and halo rotates its base hue on one —
// —   shared drift, so the interior travels magenta → cyan → orange → violet like the reference —
// —   instead of holding one palette · base HSL captured once — nothing allocates per frame —
// Export map: CUBE_DRESS.step(rig, dt) · CUBE_DRESS.drift (hue cycles per second)
(function () {
const api = {};
api.drift = 0.016;
const paint = function (color, store, c, off) {
if (!store.hsl) { const h = {}; color.getHSL(h); store.hsl = h; }
color.setHSL((store.hsl.h + c * api.drift + off) % 1, store.hsl.s * 0.96, store.hsl.l);
};
api.step = function (rig, dt) {
rig.clock = (rig.clock || 0) + dt;
const c = rig.clock;
rig.t += dt;
rig.aim += ((rig.aimT || 0) - rig.aim) * (1 - Math.pow(0.002, dt));
for (let i = 0; i < rig.cores.length; i++) {
const core = rig.cores[i];
const u = core.mat.uniforms;
paint(u.uCool.value, core, c, core.phase * 0.01);
paint(u.uCore.value, core, c, core.phase * 0.01);
paint(u.uWarm.value, core, c, core.phase * 0.01 + 0.03);
u.uTime.value = c * 0.5 + core.phase;
core.mesh.scale.setScalar(1 + 0.045 * Math.sin(c * 0.31 + core.phase));
core.mesh.position.x = core.bx + 0.05 * Math.sin(c * 0.21 + core.phase);
core.mesh.position.z = core.bz + 0.04 * Math.cos(c * 0.17 + core.phase);
}
if (rig.motes) rig.motes.material.uniforms.uTime.value = c;
for (let i = 0; i < rig.halos.length; i++) {
const h = rig.halos[i];
paint(h.sprite.material.color, h, c, h.phase * 0.02);
h.sprite.material.opacity = h.op * (0.8 + 0.26 * Math.sin(c * 0.37 + h.phase));
}
if (window.CUBE_FLOOR) window.CUBE_FLOOR.step(rig);
if (rig.group) {
rig.group.rotation.y = rig.yaw0 + rig.t * 0.016 + Math.sin(rig.t * 0.1) * 0.12 + rig.aim;
rig.group.rotation.x = Math.sin(rig.t * 0.13) * 0.028 + rig.aim * 0.22;
rig.group.position.y = Math.sin(rig.t * 0.4) * 0.01;
}
if (rig.camera && rig.dist) {
const push = 1 + 0.14 * Math.exp(-rig.t / 5.5) + 0.006 * Math.sin(rig.t * 0.2);
rig.camera.position.set(0, rig.dist * push * 0.44, rig.dist * push);
rig.camera.lookAt(0, 0.02, 0);
}
};
window.CUBE_DRESS = api;
})();
