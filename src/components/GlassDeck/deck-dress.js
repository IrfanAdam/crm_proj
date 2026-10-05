/* ADAM/SHARED — src/components/GlassDeck/deck-dress.js · the clock: float + stations */
// [plan:2026-10-05_000000-lump-sum-builds.md#phase-1] · (Task 46).
// — step(rig, dt): idle float (bob + micro sway), station easing in hold mode, or the 6s push —
// —   loop (contact → read → settle); then the camera solve — azimuth 45°, elevation + dolly only —
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
const seg = function (a, b, k) { rig.cam.el = lerp(a.el, b.el, k); rig.cam.p = lerp(a.p, b.p, k); };
if (u < 0.12) seg(A.contact, A.contact, 0);
else if (u < 0.5) seg(A.contact, A.read, ease((u - 0.12) / 0.38));
else if (u < 0.83) seg(A.read, A.settle, ease((u - 0.5) / 0.33));
else seg(A.settle, A.settle, 0);
} else {
const s = 1 - Math.pow(0.002, dt);
rig.cam.el += (rig.target.el - rig.cam.el) * s;
rig.cam.p += (rig.target.p - rig.cam.p) * s;
}
solve(rig);
};
window.DECK_DRESS = api;
})();
