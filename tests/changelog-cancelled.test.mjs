/* ADAM/TOOL — tests/changelog-cancelled.test.mjs · cancelled-aware phase status
   [plan:2026-11-16_225300-mobile-perf-parity.md#phase-11]
   Real gem plan bodies (Phase 2 all-cancelled, Phase 10 mixed, Phase 11 mixed) plus
   synthetic rows: cancelled tasks leave the fraction, whole-phase cancel still wins. */
import fs from 'node:fs';
import { split, state, isDone, buildState, secStatus, planStatus, statusLabel } from '../src/pitch/changelog-parse.js';
import { cancelled, liveState, phaseCancelled, cxTag } from '../src/pitch/changelog/cancelled.js';
let fails = 0;
const ok = (name, cond, got = '') => { console.log(`${cond ? '✓' : '✗'} ${name}${cond ? '' : ` — got ${JSON.stringify(got)}`}`); if (!cond) fails++; };
const eq = (name, got, want) => ok(`${name} = ${JSON.stringify(want)}`, got === want, got);

const GEM = '.hermes/plans/2026-10-03_144222-gem-realism-round2.md';
const gem = split(fs.readFileSync(GEM, 'utf8'));
const phase = (n) => gem.find((s) => new RegExp(`^Phase ${n}\\b`).test(s.head));

// — Phase 2: every task withdrawn, whole phase cancelled in the head
const p2 = phase(2);
eq('Phase 2 cancelled rows', cancelled(p2.body), 9);
eq('Phase 2 live fraction', liveState(p2.body), '');
eq('Phase 2 state() unchanged (cancelled stays complete)', state(p2.body), '0/9');
ok('Phase 2 whole-phase cancelled (head ✗ wins)', phaseCancelled(p2.head, p2.body) === true);
eq('Phase 2 secStatus', secStatus(p2.head, p2.body), 'cancelled');

// — Phase 10: closed with five cancelled rows; live fraction still equals state()
const p10 = phase(10);
eq('Phase 10 cancelled rows', cancelled(p10.body), 5);
eq('Phase 10 live fraction drops withdrawals', liveState(p10.body), '12/12');
eq('Phase 10 reported fraction still counts them', state(p10.body), '12/17');
ok('Phase 10 closes done', secStatus(p10.head, p10.body) === 'done');

// — norm() flags a withdrawal as `- [ ] … <span class="ds-cancelled">`, so state() counts it
//   pending. That is exactly the bug: one withdrawn task held Phase 3 below 4/4.
const p3 = phase(3);
eq('Phase 3 cancelled rows', cancelled(p3.body), 1);
eq('Phase 3 reported fraction', state(p3.body), '3/4');
eq('Phase 3 live fraction (withdrawal leaves the denominator)', liveState(p3.body), '3/3');
ok('Phase 3 live fraction is isDone()', isDone(liveState(p3.body)) === true);
eq('Phase 3 secStatus — was open, now done', secStatus(p3.head, p3.body), 'done');
eq('Phase 3 tag', cxTag(cancelled(p3.body)), '1 cancelled');

// — Phase 11: closed with three cancelled rows (58, 61, adaptive DPR)
const p11 = phase(11);
eq('Phase 11 cancelled rows', cancelled(p11.body), 3);
eq('Phase 11 reported fraction', state(p11.body), '5/8');
eq('Phase 11 live fraction', liveState(p11.body), '5/5');
ok('Phase 11 is not whole-phase cancelled', phaseCancelled(p11.head, p11.body) === false);
eq('Phase 11 secStatus', secStatus(p11.head, p11.body), 'done');
eq('Phase 11 tag', cxTag(cancelled(p11.body)), '3 cancelled');

// — Plan level: one withdrawn task never flips the plan to cancelled
ok('gem plan is not cancelled', planStatus(gem) !== 'cancelled', planStatus(gem));
eq('gem plan label', statusLabel(gem), 'Done');

// — Live-done phase with a withdrawal reads DONE, not ✗ CANCELLED (both row shapes)
const doneWithX = [
  '- [x] **57 Mobile cost harness** ✓ done',
  '- [ ] **58 Fold the plane set** <span class="ds-cancelled">✗ cancelled</span> — withdrawn',
  '- [x] **59 Caustic budget** ✓ done',
].join('\n');
const doneWithXx = doneWithX.replace('- [ ] **58', '- [x] **58');
eq('live-done fraction', liveState(doneWithX), '2/2');
eq('live-done fraction ([x] flag form)', liveState(doneWithXx), '2/2');
eq('live-done cancelled count', cancelled(doneWithX), 1);
ok('live-done is isDone()', isDone(liveState(doneWithX)) === true);
eq('live-done secStatus', secStatus('Phase 12 — all live tasks done', doneWithX), 'done');
eq('live-done planStatus', planStatus([{ head: 'Phase 12 — all live tasks done', body: doneWithX }]), 'done');
eq('live-done plan label', statusLabel([{ head: 'Phase 12 — all live tasks done', body: doneWithX }]), 'Done');
eq('live-done buildState', buildState([{ head: 'Phase 12', body: doneWithX }]), '2/2');

// — All-cancelled body without a head ✗ still cancels (zero live tasks)
const allX = '- [x] **2 Split spectrum** <span class="ds-cancelled">✗ cancelled</span>\n- [x] **3 Segment fire** <span class="ds-cancelled">✗ cancelled</span>';
eq('headless all-cancelled secStatus', secStatus('Phase 2 — superseded', allX), 'cancelled');
eq('headless all-cancelled planStatus', planStatus([{ head: 'Phase 2 — superseded', body: allX }]), 'cancelled');

// — A ✗ in prose/detail never counts as a task; raw ### Task heads still do
const proseX = '- [x] **45 Colour record** ✓ done\n- [ ] **46 Radiance** open\n\n> L50 +26.7 ✗ | hp 11.94 ✗';
eq('prose ✗ ignored', cancelled(proseX), 0);
eq('prose ✗ live fraction', liveState(proseX), '1/2');
eq('raw heading cancel counted', cancelled('### Task 58: Fold the plane set ✗ withdrawn\n\nbody'), 1);
eq('fenced rows ignored', cancelled('```\n- [x] **1 x** ✗ cancelled\n```'), 0);

// — Division: mixed Open/Done keeps the fraction honest on the gem plan
ok('gem buildState excludes withdrawals', buildState(gem) === '33/33', buildState(gem));
if (fails) { console.error(`✗ changelog-cancelled — ${fails} fail`); process.exit(1); }
console.log('✓ changelog-cancelled — cancelled tasks leave the live fraction; whole-phase cancel wins');
