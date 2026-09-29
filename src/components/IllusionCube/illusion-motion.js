/* ADAM/SHARED — src/components/IllusionCube/illusion-motion.js · Phase 4 steppers */
// [plan:2026-09-28_221212-illusion-cube-recreation.md#{#phase-4}] · Tasks 26-28 steps · [plan:2026-09-29_135509-illusion-cube-surface-revision.md#{#phase-2}]
// — Steps: rig.clock seconds in, transforms + uniforms out, zero per-frame alloc —
// Export map: ILLUSION_MOTION.cubesStep · .mainStep · .baseStep · .floorStep · .lightsStep
(function () {
const TL = window.ILLUSION_TIMELINE;
const api = {};
function cache(rig) {
if (rig._mot) return rig._mot;
const g = rig.bodies.cubes[0].parent.position;
rig._mot = { cw: [-1, -1, -1, -1], main: -1, base: -1, floor: -1, ox: g.x, oy: g.y, oz: g.z };
return rig._mot;
}
api.cubesStep = function (rig) {
const t = (rig.clock || 0) * 1000;
const cs = rig.bodies.cubes;
const m = cache(rig);
for (let i = 0; i < 4; i++) {
const rec = TL.CUBES[i];
const w = TL.osc(t, rec.delay, rec.ms);
if (w === m.cw[i]) continue;
m.cw[i] = w;
TL.pose(cs[i].position, rec.p0, rec.p1, w);
// [plan:2026-09-28_221212-illusion-cube-recreation.md#{#phase-6}] · table poses are
// world-span; the Cubes cue already lifts locals, so un-apply the parent ride —
cs[i].position.x -= m.ox; cs[i].position.y -= m.oy; cs[i].position.z -= m.oz;
TL.rotOf(cs[i].rotation, rec.r0, rec.r1, w);
TL.scaleOf(cs[i], rec.s0, rec.s1, w);
}
};
api.mainStep = function (rig) {
const t = (rig.clock || 0) * 1000;
const M = TL.MAIN;
const c = cache(rig);
const ph = t % 16000;
const w = ph < 8000 ? TL.leg(ph, 0, M.legMs) : 1 - TL.leg(ph - 8000, 0, M.legMs);
const shim = (TL.drift01(t, M.ditherMs * 2) - 0.5) * 2;
const env = w * (1 - w) * 0.04;
const u = rig.bodies.main.material.uniforms; if (!u) return;
u.uScaleA.value = TL.mix(M.a0.scale, M.a1.scale, w) + shim * env;
u.uMoveA.value = TL.mix(M.a0.move, M.a1.move, w);
u.uAlphaA.value = TL.mix(M.a0.alpha, M.a1.alpha, w);
u.uScaleB.value = TL.mix(M.b0.scale, M.b1.scale, w) + shim * env;
u.uMoveB.value = TL.mix(M.b0.move, M.b1.move, w);
u.uAlphaB.value = TL.mix(M.b0.alpha, M.b1.alpha, w);
u.uTime.value = rig.clock || 0;
c.main = w;
};
api.baseStep = function (rig) {
const t = (rig.clock || 0) * 1000;
const B = TL.BASE;
const c = cache(rig);
const w = TL.leg(t, 0, B.ms);
if (w === c.base) return;
c.base = w;
const um = rig.bodies.base.material.uniforms; if (um) um.uSheenRot.value = TL.rad(TL.mix(B.sheen0, B.sheen1, w));
};
api.floorStep = function (rig) {
const t = (rig.clock || 0) * 1000;
const P = TL.PRISM;
const c = cache(rig);
const w = TL.osc(t, 0, P.ms);
if (w === c.floor) return;
c.floor = w;
rig.floor.wash(w);
};
api.lightsStep = function (rig) {
const t = (rig.clock || 0) * 1000;
const pts = rig.lights.points;
for (let i = 0; i < pts.length; i++) {
const L = TL.LIGHTS[i];
pts[i].intensity = L.peak * TL.leg(t, 0, L.fade);
TL.pose(pts[i].position, L.from, L.to, TL.leg(t, L.delay, L.ms));
}
};
window.ILLUSION_MOTION = api;
})();
