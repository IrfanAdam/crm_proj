/* ADAM/TOOL — tests/temporal.test.mjs · temporal/transient/time-scale [plan:2026-09-22_122850-museum-refactor.md#phase-7] */
// — DOM stubs first (time-scale wires WAAPI/MutationObserver at import) —
globalThis.window = { addEventListener() {} };
globalThis.document = { documentElement: {}, getAnimations: () => [] };
globalThis.Element = function () {};
globalThis.Element.prototype = { animate() {} };
globalThis.MutationObserver = class {
  constructor() {}
  observe() {}
};
globalThis.requestAnimationFrame = () => 0;
const { temporal, isTemporal, sliceTemporal } = await import('../src/logic/temporal.js');
const { transient, isTransient, filterTransient } = await import('../src/logic/transient.js');
const ts = await import('../src/logic/time-scale.js');
let fails = 0;
const ok = (name, cond) => {
  console.log(`${cond ? '✓' : '✗'} ${name}`);
  if (!cond) fails++;
};
const series = [{ time: 1, value: 10 }, { time: 2, value: 14 }, { time: 3, value: 21 }];
const t = temporal(series);
ok('temporal tags kind', t.kind === 'temporal' && isTemporal(t));
ok('temporal trend is last-minus-first', t.trend === 11);
ok('temporal reshape maps values', temporal(series).reshape((v) => v * 2)[1].value === 28);
ok('isTemporal rejects plain', !isTemporal({ kind: 'other' }) && !isTemporal(null));
const long = Array.from({ length: 100 }, (_, i) => ({ time: i, value: i }));
ok('sliceTemporal W keeps 7', sliceTemporal(long, 'W').length === 7);
ok('sliceTemporal D keeps 1', sliceTemporal(long, 'D').length === 1);
ok('sliceTemporal defaults to 30', sliceTemporal(long, '???').length === 30);
const items = [{ time: 1, v: 'a' }, { time: 5, v: 'b' }];
const tr = transient(items);
ok('transient tags kind', tr.kind === 'transient' && isTransient(tr));
ok('transient at() hits exact time', tr.at(5).v === 'b');
ok('transient at() falls back to last', tr.at(99).v === 'b');
ok('filterTransient keeps past only', filterTransient(items, 2).length === 1);
ok('isTransient rejects plain', !isTransient({}) && !isTransient(null));
ts.setScale(1);
ok('scaled is identity at 1x', ts.scaled(100) === 100);
ok('setScale halves delay math', ts.setScale(0.5) === 0.5 && ts.scaled(100) === 200);
ok('setScale clamps above 1', ts.setScale(5) === 1);
ok('setScale clamps below 0.05', ts.setScale(-2) === 0.05);
ok('setScale falls back on garbage', ts.setScale('abc') === 1 && ts.getScale() === 1);
const timer = ts.later(() => {}, 1000);
clearTimeout(timer);
ok('later returns a clearable timer', timer !== undefined);
if (fails) {
  console.error(`✗ temporal — ${fails} fail`);
  process.exit(1);
}
console.log('✓ temporal — windows, filters, scale math pass');
