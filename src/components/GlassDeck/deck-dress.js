/* ADAM/SHARED — src/components/GlassDeck/deck-dress.js · the clock: float + stations */
// [plan:2026-10-05_000000-lump-sum-builds.md#phase-1] · (Task 46).
// — step(rig, dt): idle float (bob + micro sway), station easing in hold mode, or the 6s push —
// —   loop (contact → read → macro); then the camera solve — azimuth 45°, elevation + dolly only —
// Export map: DECK_DRESS.step(rig, dt) · DECK_DRESS.LOOP (cycle seconds)
(function () {
const api = {};
api.LOOP = 6;
const ease = function (u) { return u < 0.5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2; };
const lerp = function (a, b, u) { return a + (b - a) * u; };
const solve = function (rig) {
const az = window.DECK_SCENE.AZ;
const el = (rig.cam.el * Math.PI) / 180;
const d = rig.dist * rig.cam.p;
rig.camera.position.set(d * Math.cos(el) * Math.sin(az), d * Math.sin(el), d * Math.cos(el) * Math.cos(az));
rig.camera.lookAt(0, window.DECK_SCENE.LOOK || 0, 0);
};
api.step = function (rig, dt) {
rig.clock += dt;
const t = rig.clock;
if (rig.group) {
rig.group.position.y = Math.sin(t * 0.45) * 0.012;
rig.group.rotation.y = Math.sin(t * 0.23) * 0.006;
}
if (rig.mode === 'loop') {
const u = (t % api.LOOP) / api.LOOP;
const A = window.DECK_SCENE.STATIONS;
if (u < 0.62) {
const k = ease(u / 0.62);
rig.cam.el = lerp(A.contact.el, A.read.el, k);
rig.cam.p = lerp(A.contact.p, A.read.p, k);
} else {
const k = ease((u - 0.62) / 0.38);
rig.cam.el = lerp(A.read.el, A.macro.el, k);
rig.cam.p = lerp(A.read.p, A.macro.p, k);
}
} else {
const s = 1 - Math.pow(0.002, dt);
rig.cam.el += (rig.target.el - rig.cam.el) * s;
rig.cam.p += (rig.target.p - rig.cam.p) * s;
}
solve(rig);
};
window.DECK_DRESS = api;
})();
