/* ADAM/TOOL — tests/funnel-machine.test.mjs · funnel state machine [plan:2026-09-22_122850-museum-refactor.md#phase-7] */
// — pure assertions, no DOM: stage transitions, guards, cycle, callbacks —
import { createFunnelMachine, FUNNEL_STATES } from '../src/logic/funnel-machine.js';
let fails = 0;
const ok = (name, cond) => {
  console.log(`${cond ? '✓' : '✗'} ${name}`);
  if (!cond) fails++;
};
const m = createFunnelMachine();
ok('starts at initial', m.state === 'initial');
ok('starts unexpanded', m.expanded === null);
ok('transition top expands', m.transition('top') === 'top' && m.expanded === 'top');
ok('elastic does not expand', createFunnelMachine().transition('elastic') === 'elastic');
ok('elastic leaves expanded null', createFunnelMachine().expanded === null);
let threw = false;
try {
  m.transition('nope');
} catch (e) {
  threw = true;
}
ok('invalid transition throws', threw);
const c = createFunnelMachine();
const seen = [c.state];
for (let i = 0; i < 7; i++) seen.push(c.next());
ok('full cycle returns to initial', seen.join(',') === 'initial,elastic,top,middle,bottom,closed,retained,initial');
const s = createFunnelMachine();
s.selectSegment('middle');
ok('selectSegment sets state+expanded', s.state === 'middle' && s.expanded === 'middle');
s.reset();
ok('reset clears to initial', s.state === 'initial' && s.expanded === null);
const calls = [];
const n = createFunnelMachine((state, expanded) => calls.push([state, expanded]));
n.transition('bottom');
ok('onChange fires with state+expanded', calls.length === 1 && calls[0][0] === 'bottom' && calls[0][1] === 'bottom');
ok('FUNNEL_STATES covers 7 stages', Object.keys(FUNNEL_STATES).length === 7);
if (fails) {
  console.error(`✗ funnel-machine — ${fails} fail`);
  process.exit(1);
}
console.log('✓ funnel-machine — transitions, guards, cycle pass');
