#!/usr/bin/env node
/* rogue.mjs — adversarial mobile-perf suite for the gem renderer. One entry point.
 *
 *   node rogue.mjs --selftest   pure-JS checks only. NO browser, NO GPU, NO page loads.
 *   node rogue.mjs --smoke      one page load: prove the harness reaches the rig.
 *                               Output is PROVISIONAL — it is not a measurement.
 *   node rogue.mjs --all        perf -> parity -> stress -> score (real run; GPU-heavy)
 *   node rogue.mjs --score      re-score whatever reports already exist
 *
 * Never restarts the dev server. Chrome is launched per run into a throwaway profile.
 */
import { spawn, execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { OUT, ensureDir, writeJSON, errorSignature, makeAllowlist, consoleVerdict, sameBuild, waitForStableBuild, buildIdentity } from './harness.mjs';
import * as scoreMod from './score.mjs';
import * as parityMod from './parity.mjs';
import * as perfMod from './perf.mjs';
import * as stressMod from './stress.mjs';

const argv = process.argv.slice(2);
const has = (f) => argv.includes(f);
const fail = (m) => { console.error(m); process.exitCode = 1; };

/* ============================== selftest =============================== */

function img(w, h, rgba) {
  const a = new Uint8Array(w * h * 4);
  for (let i = 0; i < w * h; i++) { a[i * 4] = rgba[0]; a[i * 4 + 1] = rgba[1]; a[i * 4 + 2] = rgba[2]; a[i * 4 + 3] = rgba[3]; }
  return a;
}
const put = (a, w, x, y, rgba) => { const p = (y * w + x) * 4; for (let k = 0; k < 4; k++) a[p + k] = rgba[k]; };
function silhouette(w, h, box) {
  const a = new Uint8Array(w * h * 4);
  for (let y = box.y; y < box.y + box.h; y++) for (let x = box.x; x < box.x + box.w; x++) put(a, w, x, y, [40, 80, 120, 255]);
  return a;
}

function selftest() {
  const checks = [];
  const check = (name, cond, got) => { checks.push({ name, ok: !!cond, got }); if (!cond) fail(`  FAIL ${name}: ${JSON.stringify(got)}`); };

  /* --- parity: identical buffers */
  const W = 64, H = 64, base = silhouette(W, H, { x: 20, y: 20, w: 20, h: 20 });
  let r = parityMod.compareCaptures({ data: base, w: W, h: H }, { data: base, w: W, h: H });
  check('identical capture passes', r.pass === true, r.pass);
  check('identical capture is clean', r.whole.maxDelta === 0 && r.whole.pct2 === 0, r.whole);
  check('silhouette found by alpha', r.mask.source === 'alpha', r.mask.source);
  check('bbox tight on 20x20 + pad2', r.mask.bbox.w === 24 && r.mask.bbox.h === 24, r.mask.bbox);

  /* --- parity: uniform +3/255 must PASS (sub-threshold global shift) */
  const shifted = Uint8Array.from(base);
  for (let i = 0; i < W * H; i++) { shifted[i * 4] += 3; shifted[i * 4 + 1] += 3; shifted[i * 4 + 2] += 3; }
  r = parityMod.compareCaptures({ data: base, w: W, h: H }, { data: shifted, w: W, h: H });
  check('uniform +3 passes', r.pass === true, { pass: r.pass, f: r.failures });
  check('uniform +3 pct2 = 100, pct8 = 0', r.bbox.pct2 === 100 && r.bbox.pct8 === 0, r.bbox);

  /* --- parity: one edge pixel +9 must FAIL on bbox maxDelta */
  const one = Uint8Array.from(base);
  put(one, W, 20, 20, [49, 80, 120, 255]);          // +9 red, on the silhouette edge (inside the rim band)
  r = parityMod.compareCaptures({ data: base, w: W, h: H }, { data: one, w: W, h: H });
  check('single +9 edge pixel fails', r.pass === false, r.pass);
  check('single +9 reported as maxDelta 9', r.bbox.maxDelta === 9, r.bbox.maxDelta);
  check('single +9 caught by bbox pct8', r.bbox.pct8 > parityMod.THRESH.bboxPct8, r.bbox.pct8);
  check('single pixel stays under the rim budget', r.rim.pct8 <= parityMod.THRESH.rimPct8, r.rim.pct8);

  /* --- parity: a band along one silhouette edge must trip the rim gate (rim is 320px here) */
  const band = Uint8Array.from(base);
  for (let x = 20; x < 40; x++) put(band, W, x, 20, [60, 80, 120, 255]);   // +20 red across the top edge
  const rb = parityMod.compareCaptures({ data: base, w: W, h: H }, { data: band, w: W, h: H });
  check('edge band trips the rim gate', rb.rim.pct8 > parityMod.THRESH.rimPct8, rb.rim.pct8);

  /* --- mask geometry: rim = dilate2 \ erode2 on a 20x20 block */
  const mk = new Uint8Array(60 * 60);
  for (let y = 20; y < 40; y++) for (let x = 20; x < 40; x++) mk[y * 60 + x] = 1;
  const dM = parityMod.dilate(mk, 60, 60, 2), eM = parityMod.erode(mk, 60, 60, 2);
  const rim = parityMod.rimMask(mk, 60, 60, 2);
  const count = (m) => m.reduce((s, v) => s + v, 0);
  check('dilate2 area 24x24', count(dM) === 576, count(dM));
  check('erode2 area 16x16', count(eM) === 256, count(eM));
  check('rim = dilate - erode', rim.px === 576 - 256, rim.px);
  check('erode2 keeps the hollow centre out', eM[30 * 60 + 30] === 1 && rim.mask[30 * 60 + 30] === 0, rim.mask[30 * 60 + 30]);

  /* --- luma fallback when alpha is flat */
  const flat = img(W, H, [10, 10, 10, 255]);
  for (let y = 20; y < 40; y++) for (let x = 20; x < 40; x++) put(flat, W, x, y, [200, 200, 200, 255]);
  const pm = parityMod.pickMask(flat, W, H);
  check('luma fallback engages on flat alpha', pm.source === 'luma-fallback', pm.source);
  check('luma fallback coverage ~ bbox area', Math.abs(pm.coverage * 100 - (400 / (W * H)) * 100) < 0.5, pm.coverage);

  /* --- bgdiff silhouette: the mask is asserted, not guessed */
  const bgFrame = img(W, H, [12, 14, 18, 255]);
  const fgFrame = Uint8Array.from(bgFrame);
  for (let y = 20; y < 40; y++) for (let x = 20; x < 40; x++) put(fgFrame, W, x, y, [180, 60, 90, 255]);
  const sil = parityMod.silhouetteFromPair(fgFrame, bgFrame, W, H, 8);
  check('bgdiff silhouette finds the gem', sil.source === 'bgdiff' && sil.coverage === 400 / (W * H), { src: sil.source, cov: sil.coverage });
  const bgPass = parityMod.compareCaptures({ data: fgFrame, w: W, h: H }, { data: fgFrame, w: W, h: H },
    { silA: sil, silB: sil, requireMask: 'bgdiff' });
  check('bgdiff-masked identical capture PASSES', bgPass.pass === true && bgPass.mask.source === 'bgdiff', { pass: bgPass.pass, m: bgPass.mask });
  check('bgdiff mask coverage is the gem, not the frame', bgPass.mask.coverage < 20 && bgPass.mask.bbox.w === 24, bgPass.mask);
  const facet = Uint8Array.from(fgFrame);
  put(facet, W, 30, 30, [220, 60, 90, 255]);
  const bgFail = parityMod.compareCaptures({ data: fgFrame, w: W, h: H }, { data: facet, w: W, h: H },
    { silA: sil, silB: sil, requireMask: 'bgdiff' });
  check('bgdiff-masked facet change FAILS', bgFail.pass === false, bgFail.failures);
  const degrade = parityMod.compareCaptures({ data: fgFrame, w: W, h: H }, { data: fgFrame, w: W, h: H },
    { silA: { mask: pm.mask, coverage: pm.coverage, source: 'luma-fallback' }, requireMask: 'bgdiff' });
  check('mask-source assertion FAILS a degraded mask', degrade.pass === false && degrade.maskAssert.ok === false && degrade.reliable === false,
    { pass: degrade.pass, assert: degrade.maskAssert });
  const huge = new Uint8Array(W * H).fill(1);
  const bulk = parityMod.compareCaptures({ data: fgFrame, w: W, h: H }, { data: fgFrame, w: W, h: H },
    { silA: { mask: huge, coverage: 0.999, source: 'bgdiff' }, requireMask: 'bgdiff' });
  check('a whole-frame mask is not reliable', bulk.reliable === false && bulk.pass === null, bulk.unreliable);

  /* --- error allowlist: only signatures ABSENT from the control fail */
  const deckErr = { kind: 'exception', text: "TypeError: Cannot read properties of undefined (reading 'el')\n    at readout (http://127.0.0.1:5173/src/ds/deck-lab.js:16:32)\n    at http://127.0.0.1:5173/src/ds/deck-lab.js:72:1" };
  const deckErr2 = { kind: 'exception', text: "TypeError: Cannot read properties of undefined (reading 'el')\n    at readout (http://127.0.0.1:5173/src/ds/deck-lab.js:16:28)\n    at http://127.0.0.1:5173/src/ds/deck-lab.js:72:1" };
  const otherErr = { kind: 'exception', text: "TypeError: Cannot read properties of undefined (reading 'cand')\n    at build (http://127.0.0.1:5173/src/components/GemReward/gem-shader.js:46:9)" };
  check('same error, different column -> same signature', errorSignature(deckErr) === errorSignature(deckErr2), [errorSignature(deckErr), errorSignature(deckErr2)]);
  check('different source line -> different signature', errorSignature(deckErr) !== errorSignature(otherErr), [errorSignature(deckErr), errorSignature(otherErr)]);
  check('signature carries file:line, not a port', /deck-lab\.js:16$/.test(errorSignature(deckErr)), errorSignature(deckErr));
  const allow = makeAllowlist([deckErr, deckErr2]);
  const cleanPage = { errors: [deckErr, deckErr, deckErr] };
  const dirtyPage = { errors: [deckErr, otherErr] };
  const vClean = consoleVerdict(cleanPage, allow);
  const vDirty = consoleVerdict(dirtyPage, allow);
  check('allowlisted-only console is clean', vClean.ok === true && vClean.allowlisted.length === 1, vClean);
  check('one new signature fails the console gate', vDirty.ok === false && vDirty.offending.length === 1, vDirty);

  /* --- build identity */
  check('same head+digest is the same build', sameBuild({ head: 'abc', digest: 'd1' }, { head: 'abc', digest: 'd1' }) === true, null);
  check('different head is a different build', sameBuild({ head: 'abc', digest: 'd1' }, { head: 'def', digest: 'd1' }) === false, null);
  check('dirty digest splits the same head', sameBuild({ head: 'abc', digest: 'd1' }, { head: 'abc', digest: 'd2' }) === false, null);


  /* --- perf: prune one 50% outlier out of 5 rounds */
  const mkRound = (i, tA, tB) => ({ round: i, tA, tB, areaA: 1000, areaB: 2250, bufA: [100, 10], runsA: [], runsB: [] });
  const rounds = [mkRound(1, 10, 15), mkRound(2, 10.4, 15.4), mkRound(3, 9.8, 14.8), mkRound(4, 15.0, 20.0), mkRound(5, 10.1, 15.1)];
  const s = perfMod.summarize(rounds, { multiplier: 7 });
  check('outlier round discarded', s.discarded.length === 1 && s.discarded[0].round === 4, s.discarded);
  check('4 rounds kept', s.roundsKept === 4, s.roundsKept);
  check('median-of-medians ~10ms', Math.abs(s.medianOfMediansMs.A - 10.1) < 0.15, s.medianOfMediansMs);
  check('projected = ms x 7 and marked estimate', s.projectedPhone.ms === +(s.medianOfMediansMs.A * 7).toFixed(2) && s.projectedPhone.estimate === true, s.projectedPhone);
  check('fixed ms = 2A - B', Math.abs(s.fixedMs - (2 * s.medianOfMediansMs.A - s.medianOfMediansMs.B)) < 0.01, s.fixedMs);
  let threw = false;
  try { perfMod.summarize([mkRound(1, 10, 15), mkRound(2, 40, 45)], {}); } catch (e) { threw = true; }
  check('pruning to <2 rounds throws', threw, threw);

  /* --- perf: median helper */
  check('median even count', perfMod.median([3, 1, 2, 4]) === 2.5, perfMod.median([3, 1, 2, 4]));
  check('median odd count', perfMod.median([5, 1, 3]) === 3, perfMod.median([5, 1, 3]));

  /* --- stress: memory verdict */
  const leak = Array.from({ length: 21 }, (_, i) => ({ i: i * 10, textures: 10 + i, geometries: 5 + i }));
  const steady = Array.from({ length: 21 }, (_, i) => ({ i: i * 10, textures: 12, geometries: 6 }));
  check('monotonic growth fails', stressMod.memoryVerdict(leak).ok === false, stressMod.memoryVerdict(leak).growthTextures);
  check('flat memory passes', stressMod.memoryVerdict(steady).ok === true, stressMod.memoryVerdict(steady));
  const bump = steady.map((x, i) => ({ ...x, textures: i < 5 ? 10 : 12 }));
  check('one-time warm bump passes', stressMod.memoryVerdict(bump).ok === true, stressMod.memoryVerdict(bump).growthTextures);

  /* --- stress: resize schedule covers both extremes, 20 entries */
  const sched = stressMod.resizeSchedule(() => 0.5, 20);
  check('resize schedule has 20 entries', sched.length === 20, sched.length);
  check('resize schedule hits both extremes', sched.some((x) => x.w === 320) && sched.some((x) => x.w === 430), [...new Set(sched.map((x) => x.w))]);
  check('resize waits are bounded', sched.every((x) => x.wait >= 40 && x.wait <= 200), Math.max(...sched.map((x) => x.wait)));

  /* --- stress: merging a partial re-run keeps prior cases only on the same build */
  const prevRep = { build: { label: 'abc' }, cases: [{ id: 'a', ok: true, kind: 'pass' }, { id: 'b', ok: false, kind: 'fail' }] };
  const mergedSame = stressMod.mergeResults(prevRep, [{ id: 'b', ok: true, kind: 'pass' }], { label: 'abc' }, ['a', 'b']);
  check('merge keeps unrun cases on the same build', mergedSame.length === 2 && mergedSame[1].kind === 'pass', mergedSame);
  const mergedDiff = stressMod.mergeResults(prevRep, [{ id: 'b', ok: true, kind: 'pass' }], { label: 'xyz' }, ['a', 'b']);
  check('merge refuses a different build', mergedDiff.length === 1 && mergedDiff[0].id === 'b', mergedDiff);

  /* --- score: perfect run */
  const perfectPerf = { ...s, projectedPhone: { ...s.projectedPhone, ms: 12, estimate: true }, stability: { spreadPct: 3 }, roundsMeasured: 4, roundsKept: 4 };
  const perfectParity = { pass: true, change: { pass: true, failures: [], bbox: { pct8: 0, maxDelta: 0 }, rim: { pct8: 0 } }, control: { noise: [], bbox: { pct8: 0, maxDelta: 0 }, rim: { pct8: 0 }, noisy: false } };
  const perfectStress = { total: 10, passed: 10, failed: 0, skipped: 0, failures: [], passedIds: ['a'] };
  let sc = scoreMod.scoreReports({ perf: perfectPerf, parity: perfectParity, stress: perfectStress });
  check('perfect run = 100 / A', sc.score.total_0_100 === 100 && sc.score.grade === 'A', sc.score);
  check('score shape has required keys', ['perf_points', 'parity_points', 'stress_points', 'total_0_100', 'grade'].every((k) => k in sc.score), Object.keys(sc.score));
  check('stress block has passed/failed/failures', ['passed', 'failed', 'failures'].every((k) => k in sc.stress), Object.keys(sc.stress));

  /* --- score: hard cap on a stress failure */
  const oneFail = { ...perfectStress, passed: 9, failed: 1, failures: [{ case: 'i', kind: 'fail', detail: 'x' }] };
  sc = scoreMod.scoreReports({ perf: perfectPerf, parity: perfectParity, stress: oneFail });
  check('stress failure caps total at 40', sc.score.total_0_100 <= 40 && sc.score.capped === true, sc.score);
  check('capped run cannot grade above D', ['D', 'F'].includes(sc.score.grade), sc.score.grade);

  /* --- score: parity fail caps even with a perfect perf */
  const badParity = { pass: false, change: { pass: false, failures: ['bbox max delta 9 > 8', 'rim >8/255 3% > 2%'], bbox: { pct8: 1, maxDelta: 9 }, rim: { pct8: 3 } }, control: { noisy: false, bbox: { pct8: 0, maxDelta: 0 }, rim: { pct8: 0 } } };
  sc = scoreMod.scoreReports({ perf: perfectPerf, parity: badParity, stress: perfectStress });
  check('parity FAIL caps total at 40', sc.score.total_0_100 <= 40, sc.score.total_0_100);
  check('two failed parity criteria = 0 parity points', sc.score.parity_points === 0, sc.score.parity_points);

  /* --- score: single near-miss criterion gives 10, still capped */
  const nearParity = { pass: false, change: { pass: false, failures: ['rim >8/255 3% > 2%'], bbox: { pct8: 0, maxDelta: 2 }, rim: { pct8: 3 } }, control: { noisy: false, bbox: { pct8: 0, maxDelta: 0 }, rim: { pct8: 0 } } };
  sc = scoreMod.scoreReports({ perf: perfectPerf, parity: nearParity, stress: perfectStress });
  check('near miss = 10 parity points', sc.score.parity_points === 10, sc.score.parity_points);
  check('near miss still capped at 40', sc.score.total_0_100 === 40, sc.score.total_0_100);

  /* --- score: unlabelled phone number is refused */
  const unlabelled = { ...perfectPerf, projectedPhone: { ms: 12, estimate: false } };
  sc = scoreMod.scoreReports({ perf: unlabelled, parity: perfectParity, stress: perfectStress });
  check('unlabelled phone projection = 0 perf points', sc.score.perf_points === 0, sc.score.perf_points);

  /* --- score: skipped cases are worth 0.35 */
  const withSkips = { total: 10, passed: 9, failed: 0, skipped: 1, failures: [] };
  sc = scoreMod.scoreReports({ perf: perfectPerf, parity: perfectParity, stress: withSkips });
  check('one skip = 28.1 stress points', sc.score.stress_points === 28.1, sc.score.stress_points);

  /* --- score: a same-build (self-referential) baseline cannot certify a PASS */
  const selfRef = {
    pass: true,
    change: { pass: true, failures: [], selfReferential: true, identity: 'same', bbox: { pct8: 0, maxDelta: 0 }, rim: { pct8: 0 } },
    control: { noisy: false, bbox: { pct8: 0, maxDelta: 0 }, rim: { pct8: 0 } },
  };
  sc = scoreMod.scoreReports({ perf: perfectPerf, parity: selfRef, stress: perfectStress });
  check('self-referential parity PASS = 10 points', sc.score.parity_points === 10, sc.score.parity_points);
  check('self-referential parity is not certified', sc.parity.certified === false, sc.parity.certified);

  /* --- arms: an expectation spec must survive an arm id that contains '=' --- */
  const expOk = parityMod.expectationFor('default=?gemmesh=0', [
    { a: 'default', b: '?gemmesh=0', pass: true, bbox: { pct8: 0, maxDelta: 0 }, rim: { pct8: 0 } },
    { a: 'default', b: '?gemmesh=1', pass: false, bbox: { pct8: 2.3, maxDelta: 243 }, rim: { pct8: 5.1 } },
  ]);
  check('arm-expect splits on the first = only', expOk.b === '?gemmesh=0' && expOk.ok === true, expOk);
  const expBad = parityMod.expectationFor('default=?gemmesh=0', [
    { a: 'default', b: '?gemmesh=0', pass: false, bbox: { pct8: 1, maxDelta: 9 }, rim: { pct8: 3 } },
  ]);
  check('arm-expect reports a differing required pair as a failure', expBad.ok === false, expBad);
  const expMissing = parityMod.expectationFor('default=?gemmesh=9', []);
  check('arm-expect on an uncaptured pair is not a pass', expMissing.ok === null, expMissing);

  /* --- score: an arms invariant failure is a parity failure, not a footnote --- */
  const armBad = {
    ...perfectParity,
    arms: {
      requiredMatch: { ok: false, failed: ['default=?gemmesh=0'], specs: ['default=?gemmesh=0'], notEvaluated: [] },
      pairs: [{ a: 'default', b: '?gemmesh=0', pass: false, bbox: { pct8: 1, maxDelta: 9 }, rim: { pct8: 3 } }],
    },
  };
  sc = scoreMod.scoreReports({ perf: perfectPerf, parity: armBad, stress: perfectStress });
  check('arm invariant failure = 0 parity points', sc.score.parity_points === 0, sc.score.parity_points);
  check('arm invariant failure caps the run', sc.score.capped === true && sc.score.total_0_100 <= 40, sc.score);

  /* --- perf: can the 50 ms floor be resolved at this spread? */
  const overFloor = perfMod.floorResolvability({ minA: 8.5, maxA: 9.2, multiplier: 7 });
  const straddle = perfMod.floorResolvability({ minA: 6.9, maxA: 7.6, multiplier: 7 });
  check('band entirely over the floor is resolvable', overFloor.floorResolvable === true && overFloor.bandProjectedMs[0] > 50, overFloor);
  check('band straddling the floor is NOT resolvable', straddle.floorResolvable === false && straddle.straddlesFloor === true, straddle);

  /* --- score: missing reports do not throw */
  sc = scoreMod.scoreReports({});
  check('empty reports -> 0 / F, no throw', sc.score.total_0_100 === 0 && sc.score.grade === 'F', sc.score);

  /* --- grade ladder */
  check('grade ladder', scoreMod.gradeFor(90) === 'A' && scoreMod.gradeFor(80) === 'B' && scoreMod.gradeFor(70) === 'C' && scoreMod.gradeFor(40) === 'D' && scoreMod.gradeFor(39.9) === 'F',
    [90, 80, 70, 40, 39.9].map(scoreMod.gradeFor));

  const passed = checks.filter((c) => c.ok).length;
  const report = { suite: 'selftest', provisional: false, checks, passed, failed: checks.length - passed, at: new Date().toISOString() };
  ensureDir(OUT);
  writeJSON('selftest.json', report);
  console.log(`[selftest] ${passed}/${checks.length} checks passed${passed === checks.length ? '' : ' — FAILURES ABOVE'}`);
  console.log('[selftest] ->', path.join(OUT, 'selftest.json'));
  if (passed !== checks.length) process.exitCode = 1;
  return report;
}

/* =============================== smoke ================================= */

async function smoke() {
  // One page load, one rig reach, one small capture. NOT the measured protocol.
  const H = await import('./harness.mjs');
  const t0 = Date.now();
  const browser = await H.launchChrome({ label: 'smoke' });
  const facts = { suite: 'smoke', provisional: true, note: 'PROVISIONAL — single light page load, not a measurement', steps: [] };
  try {
    const page = await H.openPage(browser);
    facts.steps.push({ step: 'browser', ok: true, ms: Date.now() - t0 });
    await H.seedTune(page);
    const url = await H.mountCeremony(page, { query: 'gemdpr=3&gemperf=1' });
    facts.steps.push({ step: 'mountCeremony', ok: true, url, ms: Date.now() - t0 });
    const info = await H.pin(page);
    facts.steps.push({ step: 'pin', ok: true, info, ms: Date.now() - t0 });
    const cap = await H.captureRaw(page, { stride: 4 });   // small: smoke only
    const pm = parityMod.pickMask(Buffer.from(cap.data), cap.w, cap.h);
    facts.capture = { w: cap.w, h: cap.h, stride: cap.stride, bytes: cap.data.length, glErr: cap.glErr, mask: pm.source, coverage: +(pm.coverage * 100).toFixed(2) };
    const cov = await page.ev(`(()=>{const rig=${H.RIG_FIND}; const gl=rig.renderer.getContext();
      return { ratio:+rig.renderer.getPixelRatio().toFixed(2), lost:gl.isContextLost(),
        rigs:GEM3D.rigs.length, withRenderer:GEM3D.rigs.filter(r=>r.renderer).length };})()`);
    facts.rig = { ...info, ...cov };
    facts.errors = page.errors.slice(0, 5);
    facts.reached = true;
    facts.elapsedMs = Date.now() - t0;
    await page.close();
  } catch (e) {
    facts.reached = false;
    facts.error = String(e.message).slice(0, 400);
    facts.elapsedMs = Date.now() - t0;
    fail('[smoke] ' + facts.error);
  } finally {
    await browser.close();
  }
  ensureDir(OUT);
  writeJSON('smoke.json', facts);
  if (facts.reached) {
    console.log(`[smoke] PROVISIONAL — reached the rig in ${(facts.elapsedMs / 1000).toFixed(1)}s: ${facts.rig.rigs} rigs (${facts.rig.withRenderer} drawing), buffer from capture ${facts.capture.w}x${facts.capture.h} @stride ${facts.capture.stride}`);
    console.log(`[smoke] mask ${facts.capture.mask} coverage ${facts.capture.coverage}%  errors ${facts.errors.length}`);
  }
  console.log('[smoke] ->', path.join(OUT, 'smoke.json'));
  return facts;
}

/* ================================ all ================================== */

function run(cmd, args) {
  return new Promise((res) => {
    const p = spawn(cmd, args, { cwd: path.dirname(fileURLToPath(import.meta.url)), stdio: 'inherit' });
    p.on('exit', (code) => res(code));
    p.on('error', (e) => { console.error('[rogue] spawn failed:', e.message); res(127); });
  });
}

/**
 * `process.execPath` can point at a wrapper that no longer exists (a managed node install), and
 * `new URL(import.meta.url).pathname` is percent-encoded — both broke `--all` on this machine.
 * Resolve a real binary and a real directory.
 */
function nodeBin() {
  const cands = [
    process.env.ROGUE_NODE, process.execPath,
    '/usr/local/bin/node', '/opt/homebrew/bin/node', '/usr/bin/node',
  ];
  for (const c of cands) { if (c && fs.existsSync(c)) return c; }
  try { return execFileSync('which', ['node'], { encoding: 'utf8' }).trim() || 'node'; } catch (e) { return 'node'; }
}

async function all() {
  ensureDir(OUT);
  const node = nodeBin();
  const here = path.dirname(fileURLToPath(import.meta.url));
  const ARMS = process.env.ROGUE_ARMS || 'default,?gemmesh=0,?gemmesh=1';
  const ARM_EXPECT = process.env.ROGUE_ARM_EXPECT || 'default=?gemmesh=0';
  console.log('[rogue] waiting for a stable working tree (sibling lanes edit this repo)...');
  const settle = await waitForStableBuild({ windowMs: 45000, timeoutMs: 240000 });
  console.log(`[rogue] build ${settle.identity.label} — ${settle.stable ? 'stable' : 'STILL MOVING'} (waited ${(settle.waitedMs / 1000).toFixed(0)}s)`);
  console.log('[rogue] perf...');
  if (await run(node, [path.join(here, 'perf.mjs')]) !== 0) console.log('[rogue] perf exited non-zero (partial report may still exist)');
  console.log('[rogue] stress...');
  await run(node, [path.join(here, 'stress.mjs')]);
  console.log('[rogue] parity (+ arms:' + ARMS + ')...');
  const hasBaseline = fs.existsSync(path.join(OUT, 'parity-baseline', 'baseline.raw'));
  await run(node, [path.join(here, 'parity.mjs'), ...(hasBaseline ? ['--compare'] : []), '--arms', ARMS, '--arm-expect', ARM_EXPECT]);
  if (!hasBaseline) console.log('[rogue] WARNING no baseline armed — parity will be control-only and score 0/30. Run `node parity.mjs --save --ref-root <reference worktree>` first (the repo copy ships without the 11 MB raw baseline on purpose).');
  console.log('[rogue] score...');
  await run(node, [path.join(here, 'score.mjs')]);
  const sc = fs.existsSync(path.join(OUT, 'score.json')) ? JSON.parse(fs.readFileSync(path.join(OUT, 'score.json'), 'utf8')) : null;
  if (sc) {
    console.log(`[rogue] TOTAL ${sc.score.total_0_100}/100 grade ${sc.score.grade}${sc.score.capped ? ' (capped)' : ''}`);
    console.log(`[rogue]   perf ${sc.score.perf_points}/40 · parity ${sc.score.parity_points}/30 · stress ${sc.score.stress_points}/30`);
    for (const n of sc.notes || []) console.log('  note:', n);
    const st = fs.existsSync(path.join(OUT, 'stress.json')) ? JSON.parse(fs.readFileSync(path.join(OUT, 'stress.json'), 'utf8')) : null;
    if (st && st.allowlist) {
      console.log(`[rogue] allowlist (${st.allowlist.signatures.length} signature(s) from the control load):`);
      for (const s of st.allowlist.signatures) console.log(`   allow ${s.count}x ${s.sig}`);
    }
    const arms = fs.existsSync(path.join(OUT, 'arms.json')) ? JSON.parse(fs.readFileSync(path.join(OUT, 'arms.json'), 'utf8')) : null;
    if (arms) {
      console.log('[rogue] arm matrix:');
      for (const p of arms.pairs) {
        console.log(`   ${String(p.a).padEnd(12)} vs ${String(p.b).padEnd(12)} bbox>8 ${p.bbox ? p.bbox.pct8 : '-'}%  max ${p.bbox ? p.bbox.maxDelta : '-'}  rim>8 ${p.rim ? p.rim.pct8 : '-'}%  ${p.pass === null ? 'UNRELIABLE' : p.pass ? 'MATCH' : 'DIFFER'}`);
      }
    }
  }
}

/* ================================ main ================================= */

if (has('--selftest')) selftest();
else if (has('--smoke')) smoke().catch((e) => { console.error('[smoke] FATAL', e); process.exit(1); });
else if (has('--all')) all().catch((e) => { console.error('[rogue] FATAL', e); process.exit(1); });
else if (has('--score')) {
  const r = scoreMod.scoreFromFiles(argv);
  console.log(`[score] total ${r.score.total_0_100}/100 grade ${r.score.grade}${r.score.capped ? ' (CAPPED)' : ''}`);
} else {
  console.log(`rogue — adversarial gem-perf suite
  node rogue.mjs --selftest   pure JS checks, no browser
  node rogue.mjs --smoke      one light page load, PROVISIONAL
  node rogue.mjs --all        perf + parity + stress + score (GPU-heavy)
  node rogue.mjs --score      re-score existing reports`);
}
