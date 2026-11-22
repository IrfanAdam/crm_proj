/* perf.mjs — the measured protocol for the ceremony gem rig.
 *
 * Fixed conditions (all enforced in code, not asked of the operator):
 *   viewport 390x844 CSS, dpr 3, mobile + touch emulation, CPU throttle 6x
 *   ceremony rig only  (#gem-screen), pinned pose (rig.t=0 AND group.position.y=0)
 *   A = the rig's own buffer · B = 1.5x CSS (2.25x area)
 *   one round = A,B,B,A · each block = 3 runs x 40 frames · gl.readPixels sync after each block
 *   >= 4 PAIRED randomized rounds (order flips per round from a seeded PRNG)
 *
 * Why the two sizes: per-frame cost is ~ linear in pixels for a fragment-bound
 * shader. Two areas give an intercept (fixed per-frame CPU/binding cost) and a
 * slope (ns/px). The intercept is what a real phone pays for driver overhead, and
 * the slope is what scales with resolution — reporting only one number hides which
 * half an optimisation actually improved.
 *
 * Round pruning: a round whose base (tA) deviates >20% from the round median is
 * discarded — a clock excursion or a stray GC in one round must not become the
 * headline. Kept rounds are reported, discarded ones are named.
 *
 * Output: median-of-medians ms (A and B), ms at the rig's REAL buffer, and a
 * projected phone budget = realBufferMs * MULT. MULT defaults to 7 and is an
 * ESTIMATE of M1-proxy -> low-end-Android, not a measurement. Never quote it
 * without the ESTIMATE label.
 *
 * Run: node perf.mjs [--rounds 4] [--mult 7] [--seed 12345] [--frames 40]
 */
import path from 'node:path';
import os from 'node:os';
import { pathToFileURL } from 'node:url';
import {
  OUT, VIEW, POSE, sleep, launchChrome, openPage, mountCeremony, pin, parkAndPin,
  seedTune, writeJSON, mulberry32, RIG_FIND, buildIdentity, sameBuild, isReloadError,
} from './harness.mjs';

export const FLOOR_MS = 50;
export const BUDGET_MS = 16.67;

/**
 * Can the 50 ms floor be resolved at this noise? The floor is resolvable when the whole
 * min..max band of kept rounds lands on ONE side of it — otherwise measurement noise alone
 * can flip "0 points" to "some points", and the floor is doing nothing.
 */
export function floorResolvability({ minA, maxA, multiplier, floorMs = FLOOR_MS, budgetMs = BUDGET_MS }) {
  const lo = minA * multiplier, hi = maxA * multiplier;
  const band = [+lo.toFixed(2), +hi.toFixed(2)];
  const straddlesFloor = lo < floorMs && hi >= floorMs;
  const straddlesBudget = lo < budgetMs && hi >= budgetMs;
  return {
    bandProjectedMs: band,
    floorMs, budgetMs,
    straddlesFloor, straddlesBudget,
    floorResolvable: !straddlesFloor,
    budgetResolvable: !straddlesBudget,
    why: straddlesFloor
      ? `projected band ${band[0]}–${band[1]} ms straddles the ${floorMs} ms floor: run-to-run noise flips 0 points vs >0`
      : `projected band ${band[0]}–${band[1]} ms is entirely ${hi < floorMs ? 'under' : 'over'} the ${floorMs} ms floor`,
  };
}

/* =============================== pure math =============================== */

export function median(xs) {
  if (!xs.length) return NaN;
  const s = [...xs].sort((a, b) => a - b);
  const n = s.length;
  return n % 2 ? s[n >> 1] : (s[n / 2 - 1] + s[n / 2]) / 2;
}

export function quantile(xs, q) {
  if (!xs.length) return NaN;
  const s = [...xs].sort((a, b) => a - b);
  const i = Math.min(s.length - 1, Math.max(0, Math.floor((s.length - 1) * q)));
  return s[i];
}

/** Median of per-round medians; prune rounds whose base deviates > maxDev from the round median. */
export function summarize(rounds, opts = {}) {
  const { maxDev = 0.20, bufferPx = 0, multiplier = 7 } = opts;
  if (!rounds.length) throw new Error('no rounds');
  const bases = rounds.map((r) => r.tA);
  const baseMedian = median(bases);
  const kept = [], discarded = [];
  for (const r of rounds) {
    const dev = baseMedian ? (r.tA - baseMedian) / baseMedian : 0;
    if (Math.abs(dev) > maxDev) discarded.push({ round: r.round, tA: r.tA, devPct: +(dev * 100).toFixed(2) });
    else kept.push({ ...r, devPct: +(dev * 100).toFixed(2) });
  }
  if (kept.length < 2) throw new Error(`only ${kept.length} round(s) survived pruning (of ${rounds.length}) — measurement unusable`);

  const a = median(kept.map((r) => r.tA));
  const b = median(kept.map((r) => r.tB));
  const areaA = kept[0].areaA, areaB = kept[0].areaB;
  const fixedMs = +(2 * a - b).toFixed(3);
  const marginalNsPx = +(((b - a) * 1e6) / (areaB - areaA)).toFixed(3);
  const proj = +(a * multiplier).toFixed(2);

  return {
    roundsMeasured: rounds.length,
    roundsKept: kept.length,
    discarded,
    baseMedian: +baseMedian.toFixed(3),
    medianOfMediansMs: { A: +a.toFixed(3), B: +b.toFixed(3) },
    realBufferMs: +a.toFixed(3),
    realBuffer: kept[0].bufA,
    bufferPx: bufferPx || areaA,
    fixedMs,
    marginalNsPx,
    stability: {
      spreadPct: +(((quantile(bases, 0.9) - quantile(bases, 0.1)) / baseMedian) * 100).toFixed(2),
      minA: +Math.min(...kept.map((r) => r.tA)).toFixed(3),
      maxA: +Math.max(...kept.map((r) => r.tA)).toFixed(3),
    },
    projectedPhone: {
      ms: proj,
      multiplier,
      estimate: true,
      fits60: proj <= 16.67,
      headroomMs: +(16.67 - proj).toFixed(2),
      usedPctOfFrame: +((proj / 16.67) * 100).toFixed(1),
    },
  };
}

/* =============================== runner ================================= */

export function parseArgs(argv) {
  const a = { rounds: 4, mult: 7, seed: null, frames: 40 };
  for (let i = 0; i < argv.length; i++) {
    const k = argv[i];
    if (k === '--rounds') a.rounds = Math.max(4, Number(argv[++i]));
    else if (k === '--mult') a.mult = Number(argv[++i]);
    else if (k === '--seed') a.seed = Number(argv[++i]);
    else if (k === '--frames') a.frames = Number(argv[++i]);
  }
  if (!Number.isFinite(a.mult) || a.mult <= 0) a.mult = 7;
  return a;
}

const roundExpr = (A, B, frames) => `(async()=>{
  const rig = ${RIG_FIND};
  if(!rig||!rig.renderer) throw new Error('no-ceremony-rig');
  const {renderer,scene,camera}=rig, gl=renderer.getContext(), px=new Uint8Array(4), el=renderer.domElement;
  const cssW=Math.round(rig.w), cssH=Math.round(rig.h);
  const origRatio=renderer.getPixelRatio();
  const time=(w,h)=>{
    renderer.setPixelRatio(3); renderer.setSize(w,h,false);
    for(let i=0;i<6;i++) renderer.render(scene,camera);
    gl.readPixels(0,0,1,1,gl.RGBA,gl.UNSIGNED_BYTE,px);
    const runs=[];
    for(let k=0;k<3;k++){
      const s=performance.now();
      for(let i=0;i<${frames};i++) renderer.render(scene,camera);
      gl.readPixels(0,0,1,1,gl.RGBA,gl.UNSIGNED_BYTE,px);
      runs.push(+((performance.now()-s)/${frames}).toFixed(4));
    }
    runs.sort((x,y)=>x-y);
    return { runs, t:runs[1], buf:[el.width,el.height] };
  };
  const mk = (w,h)=>({w,h});
  const sizes={ A:mk(cssW,cssH), B:mk(Math.round(cssW*1.5),Math.round(cssH*1.5)) };
  const out={};
  for(const k of ${JSON.stringify([A, B])}) out[k]=time(sizes[k].w,sizes[k].h);
  renderer.setPixelRatio(origRatio); renderer.setSize(cssW,cssH,false);
  return { css:[cssW,cssH], ratio:+origRatio.toFixed(3),
    areaA:sizes.A.w*sizes.A.h, areaB:sizes.B.w*sizes.B.h, out };
})()`;

export async function main(argv = process.argv.slice(2)) {
  const args = parseArgs(argv);
  const seed = args.seed ?? (Date.now() % 2147483647);
  const rng = mulberry32(seed);
  const buildStart = buildIdentity();
  const loadStart = os.loadavg();

  const browser = await launchChrome({ label: 'perf' });
  let report;
  try {
    const page = await openPage(browser);
    await seedTune(page);
    await mountCeremony(page, { query: 'gemdpr=3&gemperf=1' });
    const info0 = await pin(page);
    await sleep(300);

    const rounds = [];
    let reloads = 0;
    for (let i = 0; i < args.rounds; i++) {
      const order = rng() < 0.5 ? ['A', 'B', 'B', 'A'] : ['B', 'A', 'A', 'B'];
      let pushed = false, tries = 0;
      while (!pushed) {
        tries++;
        try {
          await parkAndPin(page);            // re-park: a stray arm would interleave frames
          // A/B/B/A: two blocks, each running one letter then the other. Randomised order
          // flips the pair sequence; the PAIRED structure (one A and one B per block) holds.
          const r = await page.ev(roundExpr(order[0], order[1], args.frames));
          const r2 = await page.ev(roundExpr(order[2], order[3], args.frames));
          const tA = median([r.out.A.t, r2.out.A.t]);
          const tB = median([r.out.B.t, r2.out.B.t]);
          rounds.push({
            round: i + 1,
            order: order.join(''),
            tA, tB,
            runsA: [...r.out.A.runs, ...r2.out.A.runs],
            runsB: [...r.out.B.runs, ...r2.out.B.runs],
            areaA: r.areaA, areaB: r.areaB,
            bufA: r.out.A.buf,
            css: r.css, ratio: r.ratio,
          });
          pushed = true;
        } catch (e) {
          if (!isReloadError(e) || tries >= 3) throw e;
          reloads++;
          console.log(`[perf] page went away mid-round (sibling HMR reload) — remounting, round ${i + 1} retry ${tries}`);
          await mountCeremony(page, { query: 'gemdpr=3&gemperf=1' });
          await sleep(700);
        }
      }
      console.log(`[perf] round ${i + 1}/${args.rounds} ${order.join('')}  A ${rounds[rounds.length - 1].tA.toFixed(2)}ms  B ${rounds[rounds.length - 1].tB.toFixed(2)}ms`);
    }

    await parkAndPin(page);
    const summary = summarize(rounds, { bufferPx: rounds[0].areaA, multiplier: args.mult });
    const resolution = floorResolvability({
      minA: summary.stability.minA, maxA: summary.stability.maxA, multiplier: args.mult,
    });
    const buildEnd = buildIdentity();
    const loadEnd = os.loadavg();
    const keptA = summary.roundsKept ? rounds.filter((r) => !summary.discarded.some((d) => d.round === r.round)) : rounds;
    const bestA = Math.min(...keptA.map((r) => r.tA));
    const best = {
      ms: +bestA.toFixed(3),
      projectedMs: +(bestA * args.mult).toFixed(2),
      note: 'fastest kept round — the least-contaminated sample on a shared machine (median is the headline)',
    };

    report = {
      suite: 'perf',
      provisional: false,
      build: buildStart,
      buildEnd,
      buildStable: sameBuild(buildStart, buildEnd),
      protocol: {
        viewport: VIEW, pose: POSE, bufferMode: 'own buffer (A) vs 1.5x CSS (B)',
        order: 'A/B/B/A per round, order randomised per round', seed,
        roundBlocks: `${args.frames} frames x 3 runs per size`, roundsRequested: args.rounds,
        sync: 'gl.readPixels(1px) in the SAME task as the render block (gl.finish() is a no-op under ANGLE/Metal)',
        prune: 'discard round if |tA - roundMedian| / roundMedian > 20%',
        dpr: 'the rig boots at gemdpr=3, so A is the real phone buffer',
      },
      rig: { css: info0.css, buffer: info0.buf, ratio: info0.ratio, bloom: info0.bloom, tune: info0.tune },
      reloads,
      rounds,
      ...summary,
      resolution,
      bestRound: best,
      host: { cpus: os.cpus().length, loadStart, loadEnd, contended: loadEnd[0] > os.cpus().length * 0.5 },
      estimateNotice: `projectedPhone.ms = realBufferMs x ${args.mult} — ESTIMATE (M1 proxy), not a phone measurement`,
      at: new Date().toISOString(),
    };
    writeJSON('perf.json', report);
  } finally {
    await browser.close();
  }

  const s = report;
  console.log(`[perf] kept ${s.roundsKept}/${s.roundsMeasured} rounds (${s.discarded.length} discarded)`);
  console.log(`[perf] median-of-medians A ${s.medianOfMediansMs.A}ms  B ${s.medianOfMediansMs.B}ms  (buffer ${s.realBuffer.join('x')})`);
  console.log(`[perf] fixed ${s.fixedMs}ms  marginal ${s.marginalNsPx}ns/px  spread ${s.stability.spreadPct}%`);
  console.log(`[perf] projected phone ${s.projectedPhone.ms}ms  ESTIMATE x${s.projectedPhone.multiplier}  fits60=${s.projectedPhone.fits60}`);
  console.log(`[perf] 50ms floor ${s.resolution.floorResolvable ? 'resolvable' : 'NOT resolvable'} — ${s.resolution.why}`);
  console.log(`[perf] best kept round ${s.bestRound.ms}ms -> ${s.bestRound.projectedMs}ms projected  (load ${s.host.loadEnd.map((v) => v.toFixed(1)).join('/')} on ${s.host.cpus} cpus${s.host.contended ? ', CONTENDED' : ''})`);
  console.log('[perf] ->', path.join(OUT, 'perf.json'));
  return report;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((e) => { console.error('[perf] FATAL', e); process.exit(1); });
}
