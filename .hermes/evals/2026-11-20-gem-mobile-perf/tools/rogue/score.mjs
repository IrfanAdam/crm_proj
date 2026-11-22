/* score.mjs — turns perf.json + parity.json + stress.json into one graded JSON.
 *
 * ============================== THE FORMULA ==============================
 * Three components, 100 points, then one hard cap.
 *
 * PERF — 0..40   (measured, M1-proxy, projected to a phone as an ESTIMATE)
 *   p = projectedPhone.ms   (perf.json, = realBufferMs x MULT, MULT default 7)
 *   BUDGET = 16.67 ms (60 fps), FLOOR = 50 ms (3x over budget = worthless)
 *   perf_points = 40 * clamp((FLOOR - p) / (FLOOR - BUDGET), 0, 1)
 *     -> p <= 16.67 ms  : 40
 *     -> p = 33.3 ms    : 20
 *     -> p >= 50 ms     : 0
 *   Gates (any one zeroes the component, with a stated reason):
 *     roundsMeasured < 4 OR roundsKept < 3        (unpaired / pruned-to-nothing)
 *     projectedPhone.estimate !== true            (an unlabelled number is not a measurement)
 *   Penalty: stability.spreadPct > 15 -> perf_points *= 0.9 (noisy machine, discount it)
 *
 * PARITY — 0..30   (pixel gate, measured)
 *   change.pass === true                      -> 30
 *   change.pass === false, exactly 1 of the 3 criteria missed -> 10 (near miss)
 *   change.pass === false, 2+ criteria missed  -> 0
 *   change.pass === null (unreliable capture)  -> 0  (cannot certify => no credit)
 *   control.noisy -> parity_points = min(parity_points, 10)  (noise floor eats the budget)
 *
 * STRESS — 0..30   (10 adversarial cases)
 *   stress_points = 30 * (passed + 0.35 * skipped) / total
 *   A skipped case is a precondition the suite could not establish, so it is worth
 *   0.35 of a pass — it is never free.
 *
 * TOTAL = perf_points + parity_points + stress_points   (0..100, 1 decimal)
 *
 * HARD CAP: if stress.failed > 0 OR parity.pass !== true  ->  total = min(total, 40)
 *   The cap is deliberately brutal: a faster gem that fails a stress case or moves
 *   pixels is not a win, it is a regression with a good benchmark. A capped run can
 *   never grade above D.
 *
 * GRADE: A >= 90 · B >= 80 · C >= 70 · D >= 40 · F < 40
 * ========================================================================
 *
 * Run: node score.mjs [--perf perf.json] [--parity parity.json] [--stress stress.json] [--out score.json]
 */
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { OUT, writeJSON, readJSON } from './harness.mjs';

export const FORMULA = {
  budgetMs: 16.67,
  perfFloorMs: 50,
  perfMax: 40,
  parityMax: 30,
  stressMax: 30,
  skipWeight: 0.35,
  cap: 40,
  grades: { A: 90, B: 80, C: 70, D: 40 },
};

export const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
export const round1 = (v) => Math.round(v * 10) / 10;

export function gradeFor(total) {
  const g = FORMULA.grades;
  if (total >= g.A) return 'A';
  if (total >= g.B) return 'B';
  if (total >= g.C) return 'C';
  if (total >= g.D) return 'D';
  return 'F';
}

/** Pure scorer. No I/O, so it can be unit-tested with synthetic reports. */
export function scoreReports({ perf = null, parity = null, stress = null } = {}) {
  const notes = [];

  /* ---------------------------------------------------------------- perf */
  let perfPoints = 0;
  let perfDetail = {};
  if (!perf) {
    notes.push('perf: no report');
  } else {
    const measured = Number(perf.roundsMeasured || (perf.rounds ? perf.rounds.length : 0));
    const kept = Number(perf.roundsKept || 0);
    const proj = perf.projectedPhone && Number.isFinite(perf.projectedPhone.ms)
      ? perf.projectedPhone.ms
      : (Number.isFinite(perf.realBufferMs) ? perf.realBufferMs * 7 : NaN);

    if (!Number.isFinite(proj)) {
      notes.push('perf: no usable ms figure');
    } else if (measured < 4 || kept < 3) {
      notes.push(`perf: ${measured} rounds measured / ${kept} kept — need >=4 measured and >=3 kept`);
    } else if (perf.projectedPhone && perf.projectedPhone.estimate !== true) {
      notes.push('perf: projected phone figure is not labelled ESTIMATE — refusing to score it');
    } else {
      const { budgetMs, perfFloorMs, perfMax } = FORMULA;
      const frac = clamp((perfFloorMs - proj) / (perfFloorMs - budgetMs), 0, 1);
      perfPoints = perfMax * frac;
      const spread = perf.stability && Number.isFinite(perf.stability.spreadPct) ? perf.stability.spreadPct : 0;
      if (spread > 15) { perfPoints *= 0.9; notes.push(`perf: spread ${spread}% > 15% -> x0.9`); }
      perfDetail = {
        projectedPhoneMs: proj, budgetMs, floorMs: perfFloorMs,
        realBufferMs: perf.realBufferMs ?? null,
        multiplier: perf.projectedPhone ? perf.projectedPhone.multiplier : null,
        roundsKept: kept, roundsMeasured: measured, spreadPct: spread,
        fits60: proj <= budgetMs,
        build: perf.build ? perf.build.label : null,
        resolution: perf.resolution || null,
      };
    }
  }
  perfPoints = round1(clamp(perfPoints, 0, FORMULA.perfMax));

  /* -------------------------------------------------------------- parity */
  let parityPoints = 0;
  let parityDetail = {};
  const parityPass = parity ? parity.pass : null;
  if (!parity) {
    notes.push('parity: no report');
  } else {
    const ch = parity.change;
    if (!ch) {
      notes.push('parity: no change captured (control-only run) — cannot certify');
    } else if (ch.pass === true) {
      parityPoints = FORMULA.parityMax;
      if (ch.selfReferential === true) {
        parityPoints = Math.min(parityPoints, 10);
        notes.push('parity: PASS is against a baseline captured on the SAME build (self-referential) — capped at 10');
      }
    } else {
      const failed = (ch.failures || []).length;
      parityPoints = failed === 1 ? 10 : 0;
      if (ch.pass === null) { parityPoints = 0; notes.push('parity: capture unreliable -> 0'); }
      parityDetail.failedCriteria = failed;
    }
    if (parity.control && parity.control.noisy) {
      parityPoints = Math.min(parityPoints, 10);
      notes.push('parity: control run is noisy -> parity capped at 10');
    }
    const armPairs = parity.arms && Array.isArray(parity.arms.pairs) ? parity.arms.pairs : [];
    const armInvariant = parity.arms && parity.arms.requiredMatch ? parity.arms.requiredMatch : null;
    if (armInvariant && armInvariant.ok === false) {
      parityPoints = 0;
      notes.push(`parity: arm invariant FAILED — required match ${armInvariant.failed.join(', ')} differ (a render path that must be identical is not)`);
    }
    const differingArms = armPairs.filter((p) => p.pass === false);
    if (differingArms.length) {
      const required = new Set((armInvariant && armInvariant.specs) || []);
      const expected = differingArms.filter((p) => !required.has(`${p.a}=${p.b}`) && !required.has(`${p.b}=${p.a}`));
      notes.push(`parity: arm matrix has ${differingArms.length} DIFFERING pair(s) (${differingArms.map((p) => `${p.a} vs ${p.b}`).join('; ')})`
        + (expected.length ? ` — ${expected.length} of them are documented, non-required differences (mesh-entry crease)` : ''));
    }
    parityDetail = {
      ...parityDetail,
      pass: ch ? ch.pass : null,
      selfReferential: ch ? !!ch.selfReferential : false,
      identity: ch ? ch.identity || null : null,
      role: ch ? ch.role || null : null,
      certified: !!(ch && ch.pass === true && ch.reliable !== false && !ch.selfReferential
        && (!armInvariant || armInvariant.ok)),
      armsInvariant: armInvariant ? { ok: armInvariant.ok, failed: armInvariant.failed, specs: armInvariant.specs } : null,
      bboxPct8: ch && ch.bbox ? ch.bbox.pct8 : null,
      bboxMaxDelta: ch && ch.bbox ? ch.bbox.maxDelta : null,
      rimPct8: ch && ch.rim ? ch.rim.pct8 : null,
      maskSource: ch && ch.mask ? ch.mask.source : null,
      armPairs: parity.arms && parity.arms.pairs ? parity.arms.pairs.map((p) => ({
        a: p.a, b: p.b, pass: p.pass,
        bboxPct8: p.bbox ? p.bbox.pct8 : null,
        bboxMaxDelta: p.bbox ? p.bbox.maxDelta : null,
        rimPct8: p.rim ? p.rim.pct8 : null,
      })) : null,
      armsDiffering: parity.arms && parity.arms.pairs ? parity.arms.pairs.filter((p) => p.pass === false).length : 0,
      control: parity.control ? {
        bboxPct8: parity.control.bbox.pct8, bboxMaxDelta: parity.control.bbox.maxDelta,
        rimPct8: parity.control.rim.pct8, noisy: parity.control.noisy,
      } : null,
    };
  }
  parityPoints = round1(clamp(parityPoints, 0, FORMULA.parityMax));

  /* -------------------------------------------------------------- stress */
  const st = stress || { passed: 0, failed: 0, skipped: 0, failures: [], total: 0 };
  const totalCases = Number(st.total || (st.passed + st.failed + (st.skipped || 0))) || 0;
  let stressPoints = 0;
  if (!totalCases) notes.push('stress: no cases recorded');
  else stressPoints = FORMULA.stressMax * (st.passed + FORMULA.skipWeight * (st.skipped || 0)) / totalCases;
  stressPoints = round1(clamp(stressPoints, 0, FORMULA.stressMax));

  /* --------------------------------------------------------------- total */
  const raw = perfPoints + parityPoints + stressPoints;
  const armsFailed = !!(parity && parity.arms && parity.arms.requiredMatch && parity.arms.requiredMatch.ok === false);
  const hardFail = (st.failed || 0) > 0 || parityPass !== true || armsFailed;
  const capped = hardFail && raw > FORMULA.cap;
  const total = round1(capped ? FORMULA.cap : raw);
  if (capped) notes.push(`hard cap: total ${round1(raw)} -> ${FORMULA.cap} (${(st.failed || 0) > 0 ? 'stress failure' : armsFailed ? 'arm invariant failed' : 'parity not PASS'})`);

  const buildLabels = [perf && perf.build, parity && parity.build, stress && stress.build]
    .filter(Boolean).map((b) => b.label);
  const uniqueBuilds = [...new Set(buildLabels)];
  const buildConsistent = uniqueBuilds.length <= 1;
  if (!buildConsistent) notes.push(`build: reports span ${uniqueBuilds.join(' / ')} — these numbers are not one build`);
  for (const [k, r] of [['perf', perf], ['stress', stress], ['parity', parity]]) {
    if (r && r.buildStable === false) notes.push(`${k}: the repo changed DURING measurement (${r.build && r.build.label} -> ${r.buildEnd && r.buildEnd.label})`);
  }

  const grade = gradeFor(total);
  return {
    perf: { ...perfDetail, points: perfPoints, max: FORMULA.perfMax, report: perf ? 'perf.json' : null },
    parity: { ...parityDetail, points: parityPoints, max: FORMULA.parityMax, report: parity ? 'parity.json' : null },
    stress: {
      passed: st.passed || 0,
      failed: st.failed || 0,
      failures: st.failures || [],
      skipped: st.skipped || 0,
      total: totalCases,
      points: stressPoints,
      max: FORMULA.stressMax,
      passIds: st.passedIds || [],
      failIds: st.failedIds || [],
      skipIds: st.skippedIds || [],
      allowlistSize: st.allowlist && st.allowlist.signatures ? st.allowlist.signatures.length : null,
    },
    build: {
      perf: perf && perf.build ? perf.build.label : null,
      parity: parity && parity.build ? parity.build.label : null,
      stress: stress && stress.build ? stress.build.label : null,
      labels: uniqueBuilds, consistent: buildConsistent,
    },
    score: {
      perf_points: perfPoints,
      parity_points: parityPoints,
      stress_points: stressPoints,
      total_0_100: total,
      grade,
      capped,
      hardFail,
      raw_total: round1(raw),
      formula: `perf 40*clamp((50-p)/(50-16.67),0,1) + parity 30/10/0 + stress 30*(passed+0.35*skipped)/total; cap 40 on any stress failure or parity != PASS`,
    },
    notes,
    at: new Date().toISOString(),
  };
}

/* ------------------------------- runner -------------------------------- */

export function parseArgs(argv = process.argv.slice(2)) {
  const a = { perf: 'perf.json', parity: 'parity.json', stress: 'stress.json', out: 'score.json' };
  for (let i = 0; i < argv.length; i++) {
    const k = argv[i];
    if (k === '--perf') a.perf = argv[++i];
    else if (k === '--parity') a.parity = argv[++i];
    else if (k === '--stress') a.stress = argv[++i];
    else if (k === '--out') a.out = argv[++i];
  }
  return a;
}

const load = (p) => {
  const cands = path.isAbsolute(p) ? [p] : [path.resolve(process.cwd(), p), path.join(OUT, p)];
  for (const full of cands) {
    if (!fs.existsSync(full)) continue;
    try { return readJSON(full); } catch (e) { return null; }
  }
  return null;
};

export function scoreFromFiles(argv = process.argv.slice(2)) {
  const a = parseArgs(argv);
  const result = scoreReports({ perf: load(a.perf), parity: load(a.parity), stress: load(a.stress) });
  writeJSON(a.out, result);
  return result;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const a = parseArgs();
  const r = scoreFromFiles();
  console.log(`[score] perf ${r.score.perf_points}/40  parity ${r.score.parity_points}/30  stress ${r.score.stress_points}/30`);
  console.log(`[score] total ${r.score.total_0_100}/100  grade ${r.score.grade}${r.score.capped ? ' (CAPPED)' : ''}`);
  for (const n of r.notes) console.log('  note:', n);
  console.log('[score] ->', path.isAbsolute(a.out) ? a.out : path.join(OUT, a.out));
}
