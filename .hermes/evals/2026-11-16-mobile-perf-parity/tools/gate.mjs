#!/usr/bin/env node
/* gate.mjs — pixel-parity gate for the Alphas prototype.
 *
 * Captures the same 8 surfaces twice (once per label, from independent Chrome launches), freezes
 * every moving thing before each shot, proves each shot is stable (a second screenshot 300 ms later
 * must be byte-identical), then diffs the two labels per surface.
 *
 * usage:
 *   # determinism + parity of the current tree (head-a vs head-b, both captured now)
 *   node .hermes/tmp/perf-mobile/gate.mjs --baseline head-a --candidate head-b --strict
 *
 *   # one new capture against a stored oracle (won't re-capture the baseline)
 *   node .hermes/tmp/perf-mobile/gate.mjs --baseline base --candidate head-a --reuse-baseline \
 *     --accept 'mobile--sheet-reward*' --accept 'desktop--sheet-reward*'
 *
 * flags:
 *   --baseline <label>     oracle/<label> is the reference            (required)
 *   --candidate <label>    oracle/<label> is the build under test     (required)
 *   --reuse-baseline       diff against the stored oracle/<label> instead of re-capturing it
 *   --reuse-candidate      the same, for the candidate side
 *   --accept <glob>        repeatable. A surface whose name matches an accepted glob may differ
 *                          freely; it is reported as ACCEPT instead of FAIL (deliberate visual
 *                          changes ONLY — name the commit that caused it in the report)
 *   --noise <glob>         repeatable. A surface whose name matches may differ by at most
 *                          --noise-max channel steps on at most --noise-px pixels; reported as NOISE
 *   --noise-max <n>        default 1   (sub-perceptual raster noise only — never raise this to pass)
 *   --noise-px <n>         default 32
 *   --strict               a row passes only when differing === 0. Overrides the 0.05 % rule; this
 *                          is the mode the determinism proof uses.
 *   --url <origin>         default http://127.0.0.1:5240/
 *   --oracle-dir <dir>     default .hermes/tmp/perf-mobile/oracle
 *   --only <substr>        capture / diff only the surfaces whose name contains <substr>
 *   --capture-only         capture both sides, print the freeze assertions, skip the diff
 *   --swift                force software GL (diagnostic only — never for a stored oracle)
 *
 * Tolerance (the owner's, hard-coded): at most 0.05 % of pixels may differ, and a pixel only counts
 * as differing above 1/255 on any channel. Under --strict nothing may differ at all.
 *
 * The gate refuses to draw any conclusion from an incomplete or mismatched capture set:
 *   - a capture dir must hold exactly one index.json + 2 PNGs per surface, or exit 2
 *   - every file the index names must exist, and every PNG on disk must be in the index, or exit 2
 *   - baseline and candidate must have the same surface list, and for each surface the same
 *     viewport/dpr, or exit 2
 *   - the freeze assertions (viewport, dpr, reduced-motion, fonts, rAF stopped, animations stopped,
 *     sheet open, tile backlog, device transform) are printed for both sides and compared
 *
 * exit: 0 = PASS (accepted / noise differences allowed), 1 = FAIL, 2 = harness error
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  captureSet, decodePng, launch, pngDiff, accepted,
} from './deterministic.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));

function arg(name, def) {
  const i = process.argv.indexOf('--' + name);
  if (i === -1) return def;
  const v = process.argv[i + 1];
  return v === undefined || v.startsWith('--') ? true : v;
}
function argAll(name) {
  const out = [];
  process.argv.forEach((a, i) => { if (a === '--' + name) { const v = process.argv[i + 1]; if (v && !v.startsWith('--')) out.push(v); } });
  return out;
}

const BASELINE = String(arg('baseline', ''));
const CANDIDATE = String(arg('candidate', ''));
const URL_ = String(arg('url', 'http://127.0.0.1:5240/'));
// Default oracle dir: next to this script if it exists (scratch layout), else the repo's
// gitignored scratch path (durable-tools layout). The tools/ copy is the one that survives,
// so a bare `node tools/gate.mjs --baseline x --candidate y` must work from the repo root.
const ORACLE = path.resolve(String(arg('oracle-dir',
  fs.existsSync(path.join(HERE, 'oracle')) ? path.join(HERE, 'oracle')
    : path.join(process.cwd(), '.hermes', 'tmp', 'perf-mobile', 'oracle'))));
const ACCEPT = argAll('accept');
const NOISE = argAll('noise');
const NOISE_MAX = Number(arg('noise-max', 1));
const NOISE_PX = Number(arg('noise-px', 32));
const REUSE_B = arg('reuse-baseline', false) !== false;
const REUSE_C = arg('reuse-candidate', false) !== false;
const ONLY = String(arg('only', ''));
const CAPTURE_ONLY = arg('capture-only', false) !== false;
const STRICT = arg('strict', false) !== false;
/* --allow-legacy: the pre-fix oracle sets (base, head-a, head-b, gate-a, gate-b) were captured
 * before index rows carried freeze assertions. Their numbers are still usable as a pixel record, but
 * the gate says so out loud instead of pretending the conditions were proven. */
const ALLOW_LEGACY = arg('allow-legacy', false) !== false;
const SWIFT = arg('swift', false) !== false;
const TOL_PCT = 0.05;
const TOL_CH = 1;
const SURFACES = 8;              /* 4 desktop + 4 mobile, each with a vp and a full shot */
const EXPECTED_PNGS = SURFACES * 2;

if (!BASELINE || !CANDIDATE) {
  console.error('usage: gate.mjs --baseline <label> --candidate <label> [--accept <glob>]... [--reuse-baseline] [--strict]');
  process.exit(2);
}

const pad = (s, n) => String(s).padEnd(n);
const padL = (s, n) => String(s).padStart(n);
const die = (msg, extra) => {
  console.error(`\n  HARNESS ERROR — ${msg}`);
  if (extra) console.error('  ' + String(extra).split('\n').join('\n  '));
  console.error('  refusing to report a verdict from this capture set\n');
  process.exit(2);
};

async function capture(label) {
  const dir = path.join(ORACLE, label);
  fs.mkdirSync(dir, { recursive: true });
  /* a --only capture is a PARTIAL set; refuse to write it into an oracle label */
  if (ONLY) die(`--only cannot write an oracle label (${label}); capture the full set`);
  console.log(`\n=== capture ${label} — ${URL_} ===`);
  const { cdp, close } = await launch({ swift: SWIFT });
  try {
    const idx = await captureSet({ cdp, url: URL_ }, { label, dir, log: (s) => console.log(s) });
    return { idx, dir };
  } finally {
    await close();
  }
}

/* ---------- auditing a capture set: never trust an index that disagrees with the disk ---------- */
function load(label) {
  const dir = path.join(ORACLE, label);
  const f = path.join(dir, 'index.json');
  if (!fs.existsSync(f)) throw new Error(`no stored capture at ${f} — drop --reuse-* or capture it first`);
  const idx = JSON.parse(fs.readFileSync(f, 'utf8'));

  const problems = [];
  const legacy = [];
  const listed = new Map();          /* basename -> row */
  const rows = (idx.surfaces || []).filter((r) => !r.skipped);
  if (idx.surfaces.length !== SURFACES) problems.push(`index lists ${idx.surfaces.length} surfaces, expected ${SURFACES}`);
  if (rows.length !== SURFACES) problems.push(`${idx.surfaces.length - rows.length} surface(s) were skipped: ${(idx.surfaces || []).filter((r) => r.skipped).map((r) => r.surface + '/' + r.state + ' (' + r.reason + ')').join(', ')}`);

  for (const r of rows) {
    const files = r.files || [];
    if (files.length !== 2) { problems.push(`${r.surface}/${r.state} has ${files.length} files, expected 2 (vp + full)`); continue; }
    for (const kind of ['vp', 'full']) {
      if (!files.some((x) => x.file.endsWith(`${kind}.png`))) problems.push(`${r.surface}/${r.state} missing the .${kind}.png`);
    }
    for (const x of files) {
      const base = path.basename(x.file);
      listed.set(base, r);
      if (!fs.existsSync(path.join(dir, base))) problems.push(`index names ${base} but it is not on disk`);
      if (x.stable === false) problems.push(`${base} was NOT stable across two shots 300 ms apart (drift ${JSON.stringify(x.drift)})`);
    }
    if (r.settleOk === false) problems.push(`${r.surface}/${r.state} never settled (map/rig/tiles still moving when frozen)`);
    if (!r.geo) {
      if (ALLOW_LEGACY) legacy.push(`${r.surface}/${r.state}`);
      else problems.push(`${r.surface}/${r.state} has no freeze assertions (geo) — cannot prove the capture conditions (pass --allow-legacy to accept a pre-fix oracle, and say so in the report)`);
    }
  }
  const onDisk = fs.readdirSync(dir).filter((f) => f.endsWith('.png'));
  for (const f of onDisk) if (!listed.has(f)) problems.push(`${f} is on disk but not named by index.json (stale file from an older run?)`);
  if (onDisk.length !== EXPECTED_PNGS) problems.push(`${onDisk.length} PNG(s) on disk, expected ${EXPECTED_PNGS}`);
  const n = fs.readdirSync(dir).length;
  if (n !== EXPECTED_PNGS + 1) problems.push(`capture dir holds ${n} files, expected ${EXPECTED_PNGS} PNGs + index.json = ${EXPECTED_PNGS + 1}`);

  if (problems.length) {
    die(`capture set "${label}" in ${dir} is incomplete or self-contradictory`, problems.map((p) => '· ' + p).join('\n'));
  }
  if (legacy.length) console.log(`  NOTE: ${label} is a LEGACY oracle — ${legacy.length}/${rows.length} rows carry no freeze assertions (${legacy.join(', ')}); its pixel record is usable, its capture conditions were never proven`);
  return { idx, dir, legacy: legacy.length };
}

function surfaces(idx) {
  const out = new Map();
  for (const s of idx.surfaces) {
    if (s.skipped) continue;
    out.set(`${s.surface}--${s.state}`, s);
  }
  return out;
}

/* the rows whose img exists on this label side, keyed name+kind */
function fileFor(row, kind) {
  return row && (row.files || []).find((f) => f.file.endsWith(`${kind}.png`));
}

/* ---------- freeze assertions: the part that proves the numbers mean anything ---------- */
const ASSERT_KEYS = [
  ['vp', 'viewport'], ['dpr', 'dpr'], ['reducedMotion', 'reduced-motion forced'],
  ['fontsStatus', 'fonts'], ['rafQueued', 'rAF still queued'], ['timersQueued', 'timers still queued'],
  ['animsRunning', 'animations still running'], ['sheet', 'sheet'], ['tiles', 'tiles [total, pending]'],
  ['gem', 'gem canvases'],
];
function assertSummary(row) {
  /* row.geo = { vp: <geo at the vp shot>, full: <geo at the tall shot> } — the vp one is what the
     gate's numbers belong to */
  const g = (row && row.geo && row.geo.vp) || {};
  const o = {};
  for (const [k] of ASSERT_KEYS) o[k] = g[k];
  o.device = g.hi ? g.hi.device : null;
  o.deviceTransform = g.hi ? g.hi.deviceTransform : null;
  o.zoom = g.hi ? g.hi.zoom : null;
  return o;
}
const SAME_EXACT = ['vp', 'dpr', 'reducedMotion', 'fontsStatus', 'rafQueued', 'timersQueued', 'animsRunning', 'sheet', 'device', 'deviceTransform', 'zoom'];

/* how many pixels a freeze assertion difference can excuse is zero: a capture taken under different
 * conditions is not a comparison at all. */
function assertMismatches(a, b) {
  const out = [];
  for (const k of SAME_EXACT) {
    const x = JSON.stringify(a[k]), y = JSON.stringify(b[k]);
    if (x !== y) out.push(`${k}: ${x} vs ${y}`);
  }
  return out;
}

function verdictFor(res, name) {
  if (!res) return { ok: false, why: 'no such file' };
  if (!res.sameSize) return { ok: false, why: `size ${res.width}x${res.height} vs ${res.widthB}x${res.heightB}` };
  if (res.differing === 0) return { ok: true, why: '' };
  if (STRICT) {
    /* nothing may differ at all, except surfaces the caller has explicitly named as raster noise */
    if (accepted(name, NOISE) && res.maxChannelDelta <= NOISE_MAX && res.differing <= NOISE_PX) {
      return { ok: true, noise: true, why: `named raster noise ≤ maxΔ ${NOISE_MAX}` };
    }
    if (accepted(name, ACCEPT)) return { ok: true, accepted: true, why: 'accepted' };
    return { ok: false, why: 'strict: pixels differ' };
  }
  if (res.pct <= TOL_PCT) return { ok: true, why: '', note: res.maxChannelDelta > 8 ? 'maxΔ>8' : '' };
  if (accepted(name, ACCEPT)) return { ok: true, accepted: true, why: 'accepted' };
  return { ok: false, why: 'over tolerance' };
}

process.on('uncaughtException', (e) => die('uncaught', e && e.stack));
process.on('unhandledRejection', (e) => die('unhandled rejection', e && (e.stack || e)));

(async () => {
  const t0 = Date.now();
  /* capture(), then ALWAYS re-audit from disk: a freshly captured side is not exempt from the
     completeness check, and a broken index must never reach the verdict. */
  const side = async (label, reuse) => { if (!reuse) await capture(label); return load(label); };
  const b = await side(BASELINE, REUSE_B);
  const c = await side(CANDIDATE, REUSE_C);

  const sb = surfaces(b.idx);
  const sc = surfaces(c.idx);

  /* both sides must describe the same 8 surfaces */
  const missingB = [...sc.keys()].filter((k) => !sb.has(k));
  const missingC = [...sb.keys()].filter((k) => !sc.has(k));
  if (missingB.length || missingC.length) {
    die(`surface lists differ between ${BASELINE} and ${CANDIDATE}`,
      [...missingB.map((k) => `${k} missing in ${BASELINE}`), ...missingC.map((k) => `${k} missing in ${CANDIDATE}`)].map((p) => '· ' + p).join('\n'));
  }

  const names = [...sb.keys()].filter((n) => !ONLY || n.includes(ONLY)).sort();

  /* the freeze assertions, printed once per side */
  console.log(`\n=== freeze assertions — ${URL_} ===`);
  const W0 = Math.max(...names.map((n) => n.length), 20);
  console.log(`  ${pad('surface', W0)}  ${pad('viewport', 12)} ${pad('dpr', 4)} ${pad('reduced', 8)} ${pad('fonts', 8)} ${pad('rAF', 4)} ${pad('anims', 6)} ${pad('sheet', 22)} ${pad('zoom', 5)} device`);
  const noGeo = (row) => !row || !row.geo;
  for (const n of names) {
    if (noGeo(sb.get(n)) || noGeo(sc.get(n))) {
      console.log(`  ${pad(n, W0)}  ${'—'.repeat(12)} no freeze assertions recorded (legacy oracle) — conditions NOT proven for this row`);
      continue;
    }
    const A = assertSummary(sb.get(n)), B = assertSummary(sc.get(n));
    const dv = JSON.stringify(A.device);
    const flag = assertMismatches(A, B).length ? '  <<< ' + assertMismatches(A, B).join('; ') : '';
    console.log(`  ${pad(n, W0)}  ${pad((A.vp || []).join('x'), 12)} ${pad(A.dpr, 4)} ${pad(String(A.reducedMotion), 8)} ${pad(String(A.fontsStatus), 8)} ${pad(String(A.rafQueued), 4)} ${pad(String(A.animsRunning), 6)} ${pad(String(A.sheet).slice(0, 22), 22)} ${pad(A.zoom, 5)} ${dv}${flag}`);
  }
  /* and hard-fail if the two sides were not captured under the same conditions */
  const condProblems = [];
  for (const n of names) {
    if (noGeo(sb.get(n)) || noGeo(sc.get(n))) continue;
    const A = assertSummary(sb.get(n)), B = assertSummary(sc.get(n));
    for (const m of assertMismatches(A, B)) condProblems.push(`· ${n}: ${m}`);
    if (A.dpr !== B.dpr || (A.vp || []).join() !== (B.vp || []).join()) condProblems.push(`· ${n}: captured at different viewports/dpr`);
  }
  if (condProblems.length) die(`the two sides were not captured under identical conditions`, condProblems.join('\n'));
  if (CAPTURE_ONLY) {
    console.log(`\n  capture-only — ${BASELINE} and ${CANDIDATE} both audited clean, diff skipped`);
    process.exit(0);
  }

  const rows = [];
  for (const name of names) {
    const rb = sb.get(name), rc = sc.get(name);
    for (const kind of ['vp', 'full']) {
      const fb = fileFor(rb, kind), fc = fileFor(rc, kind);
      if (!fb || !fc) {
        rows.push({ name, kind, res: null, verdict: { ok: false, why: !fb ? 'missing in baseline' : 'missing in candidate' } });
        continue;
      }
      const A = decodePng(fs.readFileSync(path.join(b.dir, path.basename(fb.file))));
      const B = decodePng(fs.readFileSync(path.join(c.dir, path.basename(fc.file))));
      const res = pngDiff(A, B);
      rows.push({ name, kind, res, verdict: verdictFor(res, name) });
    }
  }

  const W = Math.max(...rows.map((r) => r.name.length), 8);
  console.log(`\n=== ${BASELINE} → ${CANDIDATE} — ${URL_} ===`);
  console.log(`  ${pad('surface', W)}  kind  ${padL('pixelDiff %', 11)}  ${padL('px', 6)}  ${padL('maxΔ', 4)}  bbox                     verdict`);
  console.log(`  ${'-'.repeat(W)}  ----  ${'-'.repeat(11)}  ${'-'.repeat(6)}  ${'-'.repeat(4)}  ${'-'.repeat(24)}  -------`);
  for (const r of rows) {
    const bbox = r.res && r.res.bbox ? `[${r.res.bbox.join(',')}]` : '—';
    const pct = r.res ? r.res.pct.toFixed(4) : '—';
    const px = r.res ? r.res.differing : '—';
    const md = r.res ? r.res.maxChannelDelta : '—';
    const v = r.verdict.ok ? (r.verdict.accepted ? 'ACCEPT' : r.verdict.noise ? 'NOISE' : 'PASS') : 'FAIL';
    const note = r.verdict.why ? `  (${r.verdict.why}${r.verdict.note ? ', ' + r.verdict.note : ''})` : (r.res && r.res.maxChannelDelta > 8 ? '  (maxΔ>8)' : '');
    console.log(`  ${pad(r.name, W)}  ${r.kind.padEnd(4)}  ${padL(pct, 11)}  ${padL(px, 6)}  ${padL(md, 4)}  ${pad(bbox, 24)}  ${v}${note}`);
  }

  const fails = rows.filter((r) => !r.verdict.ok);
  const accepts = rows.filter((r) => r.verdict.accepted);
  const noises = rows.filter((r) => r.verdict.noise);
  const surfaceNames = [...new Set(rows.map((r) => r.name))];
  const identical = rows.filter((r) => r.res && r.res.differing === 0).length;
  const worst = rows.filter((r) => r.res).sort((x, y) => y.res.maxChannelDelta - x.res.maxChannelDelta)[0];

  console.log(`\n  mode                 ${STRICT ? 'STRICT — 0 differing pixels required' : `tolerance ${TOL_PCT} % of pixels, per-pixel ≤ ${TOL_CH}/255`}`);
  console.log(`  surfaces             ${surfaceNames.length} (+ ${rows.length - surfaceNames.length} full-size twins) = ${rows.length} rows`);
  console.log(`  byte-identical rows  ${identical} / ${rows.length}`);
  console.log(`  worst row            ${worst ? `${worst.name}.${worst.kind} maxΔ ${worst.res.maxChannelDelta} on ${worst.res.differing} px` : '—'}`);
  console.log(`  named raster noise   ${noises.length ? noises.map((r) => `${r.name}.${r.kind}`).join(', ') : 'none'}`);
  console.log(`  accepted exceptions  ${accepts.length ? accepts.map((r) => `${r.name}.${r.kind}`).join(', ') : 'none'}`);
  console.log(`  unstable captures    none — every shot repeated byte-identical after 300 ms (audited above)`);
  console.log(`  elapsed              ${((Date.now() - t0) / 1000).toFixed(1)} s`);
  if (fails.length) {
    console.log(`\n  FAIL — ${fails.length} of ${rows.length} surfaces moved outside tolerance`);
    for (const f of fails) console.log(`    · ${f.name}.${f.kind}: ${f.verdict.why}${f.res ? ` (${f.res.differing} px, maxΔ ${f.res.maxChannelDelta}, bbox ${JSON.stringify(f.res.bbox)})` : ''}`);
    process.exit(1);
  }
  console.log(`\n  PASS — ${rows.length} / ${rows.length} surfaces within tolerance${accepts.length ? ` (${accepts.length} accepted)` : ''}${noises.length ? ` (${noises.length} named raster noise)` : ''}`);
  process.exit(0);
})();
