/* ADAM/TOOL — tests/illusion-timeline.test.mjs · timeline maths + decoded tables */
// [plan:2026-09-28_221212-illusion-cube-recreation.md#{#phase-4}] · Task 25 verify.
// — Loads the classic script via the stub-first trick temporal.test.mjs uses —
import { readFileSync } from 'node:fs';
globalThis.window = {};
const file = new URL('../src/components/IllusionCube/illusion-timeline.js', import.meta.url);
const src = readFileSync(file, 'utf8');
new Function(src)();
const TL = globalThis.window.ILLUSION_TIMELINE;
let fails = 0;
const ok = (name, cond) => {
console.log(`${cond ? '✓' : '✗'} ${name}`);
if (!cond) fails++;
};
const near = (a, b, e = 1e-9) => Math.abs(a - b) <= e;
const J = (v) => JSON.stringify(v);
const FNS = ['inOutCubic', 'bezier', 'leg', 'osc', 'pose', 'drift01'];
ok('namespace + fns', !!TL && FNS.every((k) => typeof TL[k] === 'function'));
ok('inOutCubic ends', TL.inOutCubic(0) === 0 && TL.inOutCubic(1) === 1);
ok('inOutCubic mid', TL.inOutCubic(0.5) === 0.5);
ok('inOutCubic symmetric', near(TL.inOutCubic(0.25) + TL.inOutCubic(0.75), 1));
ok('leg clamps', TL.leg(-5, 0, 8000) === 0 && TL.leg(0, 0, 8000) === 0);
ok('leg eases', TL.leg(9000, 0, 8000) === 1 && TL.leg(4000, 0, 8000) === 0.5);
const O = (t, d) => TL.osc(t, d, 8000);
ok('osc 0/1/0', O(0, 0) === 0 && O(8000, 0) === 1 && O(16000, 0) === 0);
ok('osc pre-peak below 1', O(7999, 0) < 1);
ok('C2 holds while C1 moves', O(4000, TL.CUBES[1].delay) === 0 && O(4000, TL.CUBES[0].delay) > 0);
const bz = TL.bezier(0.6690234375, 0.2228515625, 0.3199739583333333, 1);
ok('bezier ends exact', bz(0) === 0 && bz(1) === 1);
let mono = true;
let prev = -1;
for (let i = 0; i <= 20; i++) {
const v = bz(i / 20);
if (v < 0 || v > 1 || v < prev) mono = false;
prev = v;
}
ok('bezier in range + monotone', mono);
ok('bezier asymmetric', bz(0.5) !== 0.5);
const C = TL.CUBES;
ok('CUBES legs', C.length === 4 && C.every((c) => c.ms === 8000));
ok('C1 spread', J(C[0].p0) === J([-7.9, 73.5, 15.2]) && J(C[0].r0) === J([75.7, 59, 164.2]));
ok('C1 converged', J(C[0].p1) === J([28.2, 84.1, 21.1]) && C[0].s0 === 1 && C[0].s1 === 0.7);
ok('C1 converged rot', J(C[0].r1) === J([31, -14.7, -11.9]) && C[0].delay === 0);
ok('C2 spread', J(C[1].p0) === J([54, 150.7, 9.8]) && J(C[1].r0) === J([0, 0, 0]));
ok('C2 converged', J(C[1].p1) === J([-36.4, 65.4, -45.4]) && C[1].delay === 8000);
ok('C2 converged rot', J(C[1].r1) === J([-98.3, 25.7, -87.2]) && C[1].s0 === 0.3 && C[1].s1 === 0.7);
ok('C3 spread', J(C[2].p0) === J([-53.4, 40.9, -69.1]) && J(C[2].r0) === J([-180, -4.8, -106.6]));
ok('C3 converged', J(C[2].p1) === J([-11.4, 140, 44.3]) && C[2].s0 === 0.3 && C[2].s1 === 0.7);
ok('C3 converged rot', J(C[2].r1) === J([-98.4, 25.7, -152.2]) && C[2].delay === 0);
ok('Small spread', J(C[3].p0) === J([52.7, 20.4, -74]) && J(C[3].r0) === J([0, 0, -17.1]));
ok('Small converged', J(C[3].p1) === J([-27.7, 21.1, 62.6]) && C[3].s0 === 0.3 && C[3].s1 === 0.4);
ok('Small converged rot', J(C[3].r1) === J([10, 20, -10]) && C[3].delay === 0);
const M = TL.MAIN;
ok('MAIN leg', M.legMs === 8000 && M.ditherMs === 1000);
ok('MAIN A', M.a0.scale === 1.37 && M.a0.move === 4.1 && M.a0.alpha === 0.32);
ok('MAIN B', M.b0.scale === 1.78 && M.b0.move === -0.04 && M.b0.alpha === 0.32);
ok('MAIN A1', M.a1.scale === 1.44 && M.a1.move === 6.39 && M.a1.alpha === 0.54);
ok('MAIN B1', M.b1.scale === 2.58 && M.b1.move === 0.03 && M.b1.alpha === 0.46);
ok('BASE once', TL.BASE.sheen0 === 181 && TL.BASE.sheen1 === 87);
ok('BASE timing', TL.BASE.ms === 4000 && TL.BASE.once === true);
const L = TL.LIGHTS;
ok('LIGHTS peaks', L.length === 3 && L[0].peak === 0.8 && L[1].peak === 1 && L[2].peak === 1.705);
ok('LIGHTS timing', L.every((r) => r.fade === 1000 && r.delay === 8000 && r.ms === 4000 && r.drift === 0));
ok('PRISM', TL.PRISM.rot0 === -227 && TL.PRISM.rot1 === -169 && TL.PRISM.ms === 8000);
ok('CAMERA pose', J(TL.CAMERA.p0) === J([530.466, 489.436, 592.347]));
ok('CAMERA zoom', TL.CAMERA.ms === 6000 && TL.CAMERA.z0 === 0.97535 && TL.CAMERA.z1 === 2.45548);
ok('REVEAL', TL.REVEAL.outMs === 6000 && TL.REVEAL.backMs === 1000);
ok('CHAIN audio', TL.CHAIN.whooshAt === 4000 && TL.CHAIN.whooshVol === 0.3 && TL.CHAIN.bedAt === 8000);
ok('CHAIN blurb', TL.CHAIN.blurbDelay === 3000 && TL.CHAIN.blurbMs === 3000);
ok('CHAIN blurb Z', TL.CHAIN.blurbZ0 === 98.6648 && TL.CHAIN.blurbZ1 === 101.1018);
const seen = [];
const fake = { set(a, b, c) { seen.push(a, b, c); } };
TL.pose(fake, [0, 0, 0], [10, 20, 30], 0.5);
ok('pose lerps', seen[0] === 5 && seen[1] === 10 && seen[2] === 15);
seen.length = 0;
TL.rotOf(fake, [0, 0, 0], [180, 0, 0], 0.5);
ok('rotOf converts deg', near(seen[0], Math.PI / 2) && seen[1] === 0 && seen[2] === 0);
let sv = -1;
TL.scaleOf({ scale: { setScalar(v) { sv = v; } } }, 1, 0.7, 0.5);
ok('scaleOf lerps scalar', sv === 0.85);
ok('drift01 wraps', TL.drift01(0, 2000) === 0 && TL.drift01(1000, 2000) === 0.5);
ok('drift01 period', TL.drift01(2000, 2000) === 0);
if (fails) {
console.error(`✗ illusion-timeline — ${fails} fail`);
process.exit(1);
}
console.log('✓ illusion-timeline — maths, tables, writers pass');
