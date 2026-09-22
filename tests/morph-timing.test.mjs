/* ADAM/TOOL — tests/morph-timing.test.mjs · sheet-morph curves [plan:2026-09-22_122850-museum-refactor.md#phase-7] */
// — end-state exactness, overshoot, CLOSE monotonicity, fade windows, clamp —
import { OPEN, CLOSE, FADE, walk, clamp01 } from '../src/patterns/OppsHome/morph-timing.js';
let fails = 0;
const ok = (name, cond) => {
  console.log(`${cond ? '✓' : '✗'} ${name}`);
  if (!cond) fails++;
};
const near = (a, b, eps = 1e-9) => Math.abs(a - b) <= eps;
ok('walk(OPEN,0)===0', walk(OPEN, 0) === 0);
ok('walk(OPEN,1)===1', walk(OPEN, 1) === 1);
ok('walk(CLOSE,0)===1', walk(CLOSE, 0) === 1);
ok('walk(CLOSE,1)===0', walk(CLOSE, 1) === 0);
ok('OPEN overshoots past 1 near .8', walk(OPEN, 0.8) > 1 && walk(OPEN, 0.8) < 1.05);
let mono = true;
let prev = walk(CLOSE, 0);
for (let i = 1; i <= 20; i++) {
  const v = walk(CLOSE, i / 20);
  if (v > prev + 1e-9) mono = false;
  prev = v;
}
ok('CLOSE decreases monotonically', mono);
let bounded = true;
for (let i = 0; i <= 40; i++) {
  const v = walk(OPEN, i / 40);
  if (v < -1e-9 || v > 1.05) bounded = false;
}
ok('OPEN stays in [0,1.05]', bounded);
ok('clamp01 clamps low', clamp01(-2) === 0);
ok('clamp01 clamps high', clamp01(2) === 1);
ok('clamp01 passes through', near(clamp01(0.4), 0.4));
const wins = [...Object.values(FADE.open), ...Object.values(FADE.close)];
ok('fade windows are [from,to] pairs in [0,1]', wins.every((w) => w.length === 2 && w.every((v) => v >= 0 && v <= 1)));
ok('open card fades late (ghost handoff)', FADE.open.card[0] >= 0.8);
ok('close card window reads reversed', FADE.close.card[0] > FADE.close.card[1]);
if (fails) {
  console.error(`✗ morph-timing — ${fails} fail`);
  process.exit(1);
}
console.log('✓ morph-timing — endpoints, overshoot, monotonicity pass');
