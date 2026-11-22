/* parity.mjs — pixel gate for the gem renderer.
 *
 * Captures the SAME pinned pose from a fresh page load and compares RGBA drawing
 * buffers. Measures, for whole frame / gem bbox / rim band:
 *   %px with any-channel delta > 2/255, %px > 8/255, mean abs delta, max delta.
 *
 * PASS RULE (all three must hold):
 *   bbox >8/255 <= 0.05%   AND   bbox max delta <= 8   AND   rim >8/255 <= 2%
 *
 * WHAT CHANGED AND WHY
 *  1. Same-task capture (harness.capturePinned): the context is preserveDrawingBuffer:false,
 *     so a readPixels in a later CDP task reads nothing.
 *  2. The mask is no longer guessed from alpha or luma. The stage paints an OPAQUE
 *     backdrop, so alpha is 100 % and the old `alphaMask` always fell through to a
 *     luma heuristic whose bbox was the whole frame. Each capture now also renders the
 *     scene with the gem hidden; the silhouette is |frame - background| > 8. That is an
 *     assertion, not a heuristic: if the difference mask is implausible the run FAILS.
 *  3. Floor pools (shadow/contact/caustic) are hidden for both captures. They repaint at
 *     timing-dependent moments and jitter ~4.6 % of the frame, which is enough to fake a
 *     parity delta on an unchanged build.
 *  4. Baseline provenance. `--save` records BOTH git identity (HEAD + status digest, from
 *     `--ref-root` when the baseline comes from a reference worktree) AND a render build hash:
 *     sha256 of the Vite-served body of every file on the render path, fetched from the origin
 *     the page is actually on. `--compare` REFUSES a baseline with no render hash, a baseline
 *     captured for a different arm, a baseline whose silhouette was not `bgdiff`, or a baseline
 *     whose floor pools were not hidden. A baseline whose render hash equals the current one is
 *     reported as selfReferential and scores at most 10 parity points — a baseline cannot
 *     certify the build that produced it.
 *  5. `--arms` captures every render path in ONE browser at ONE pinned pose and cross-diffs
 *     all pairs. `--arm-expect 'default=?gemmesh=0'` declares the pairs that MUST match; a
 *     required pair that differs is an arms-invariant FAILURE, not a footnote.
 *
 * Run:
 *   node parity.mjs --save --url http://127.0.0.1:5411/gallery.html --ref-root ../ref-wt
 *   node parity.mjs --compare --url http://127.0.0.1:5410/gallery.html
 *   node parity.mjs                                     control only (no baseline write)
 *   node parity.mjs --arms 'default,?gemmesh=0,?gemmesh=1'
 *   node parity.mjs --compare --force                   compare an ad-hoc baseline anyway
 *   node parity.mjs --stride 2                          subsample (report-only; can never PASS)
 */
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import {
  ROOT, OUT, BASE_URL, VIEW, POSE, ensureDir, sleep, launchChrome, openPage,
  mountCeremony, pin, seedTune, capturePinned, writeJSON, readJSON, buildIdentity, sameBuild, isReloadError,
  renderBuildHash,
} from './harness.mjs';

/* =============================== pure math =============================== */

/** Per-selection diff stats over RGBA buffers. `sel` = Uint8Array mask (1 = count). */
export function diffStats(a, b, w, h, sel = null) {
  const n = w * h;
  if (a.length < n * 4 || b.length < n * 4) throw new Error('buffer too short for w*h*4');
  let cnt = 0, c2 = 0, c8 = 0, sum = 0, mx = 0;
  const hist = new Array(9).fill(0);
  for (let i = 0, p = 0; i < n; i++, p += 4) {
    if (sel && !sel[i]) continue;
    const d0 = Math.abs(a[p] - b[p]);
    const d1 = Math.abs(a[p + 1] - b[p + 1]);
    const d2 = Math.abs(a[p + 2] - b[p + 2]);
    let m = d0 > d1 ? d0 : d1; if (d2 > m) m = d2;
    if (m > mx) mx = m;
    if (m > 2) c2++;
    if (m > 8) c8++;
    hist[m > 8 ? 8 : m]++;
    sum += d0 + d1 + d2;
    cnt++;
  }
  if (!cnt) return { px: 0, pct2: 0, pct8: 0, meanAbs: 0, maxDelta: 0, hist };
  return {
    px: cnt,
    pct2: +(100 * c2 / cnt).toFixed(6),
    pct8: +(100 * c8 / cnt).toFixed(6),
    meanAbs: +(sum / (cnt * 3)).toFixed(4),
    maxDelta: mx,
    hist,
  };
}

export function alphaMask(px, w, h, thr = 8) {
  const n = w * h, m = new Uint8Array(n);
  let c = 0;
  for (let i = 0, p = 3; i < n; i++, p += 4) { if (px[p] > thr) { m[i] = 1; c++; } }
  return { mask: m, coverage: c / n };
}

/** Fallback silhouette when the buffer carries no usable alpha (kept for selftest / legacy). */
export function lumaMask(px, w, h) {
  const n = w * h;
  let bs = 0, bn = 0;
  const ring = 6;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (x >= ring && x < w - ring && y >= ring && y < h - ring) continue;
      const p = (y * w + x) * 4;
      bs += 0.2126 * px[p] + 0.7152 * px[p + 1] + 0.0722 * px[p + 2]; bn++;
    }
  }
  const bg = bn ? bs / bn : 0;
  const m = new Uint8Array(n);
  let c = 0;
  for (let i = 0, p = 0; i < n; i++, p += 4) {
    const l = 0.2126 * px[p] + 0.7152 * px[p + 1] + 0.0722 * px[p + 2];
    if (Math.abs(l - bg) > 12) { m[i] = 1; c++; }
  }
  return { mask: m, coverage: c / n, bg: +bg.toFixed(2) };
}

/** Legacy chooser. Reported, but parity never certifies on anything except 'bgdiff'. */
export function pickMask(px, w, h) {
  const a = alphaMask(px, w, h, 8);
  if (a.coverage >= 0.002 && a.coverage <= 0.995) return { mask: a.mask, source: 'alpha', coverage: a.coverage };
  const l = lumaMask(px, w, h);
  if (l.coverage >= 0.002 && l.coverage <= 0.995) {
    return { mask: l.mask, source: 'luma-fallback', coverage: l.coverage, bgLuma: l.bg };
  }
  return { mask: l.mask, source: 'none', coverage: l.coverage, bgLuma: l.bg };
}

/**
 * Silhouette by differencing the pinned frame against a gem-less render of the SAME
 * scene at the SAME pose. Works with an opaque backdrop, no alpha required.
 */
export function silhouetteFromPair(fg, bg, w, h, thr = 8) {
  const n = w * h, m = new Uint8Array(n);
  let c = 0;
  for (let i = 0, p = 0; i < n; i++, p += 4) {
    const d0 = Math.abs(fg[p] - bg[p]);
    const d1 = Math.abs(fg[p + 1] - bg[p + 1]);
    const d2 = Math.abs(fg[p + 2] - bg[p + 2]);
    if (d0 > thr || d1 > thr || d2 > thr) { m[i] = 1; c++; }
  }
  return { mask: m, coverage: c / n, source: 'bgdiff' };
}

export function unionMask(a, b) {
  if (!a) return b; if (!b) return a;
  const m = new Uint8Array(a.length);
  let c = 0;
  for (let i = 0; i < m.length; i++) { const v = a[i] | b[i]; m[i] = v; if (v) c++; }
  return m;
}

export function dilate(m, w, h, r) {
  if (r <= 0) return Uint8Array.from(m);
  const tmp = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) {
    const row = y * w;
    for (let x = 0; x < w; x++) {
      let v = 0;
      const lo = Math.max(0, x - r), hi = Math.min(w - 1, x + r);
      for (let xx = lo; xx <= hi; xx++) if (m[row + xx]) { v = 1; break; }
      tmp[row + x] = v;
    }
  }
  const out = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) {
    const lo = Math.max(0, y - r), hi = Math.min(h - 1, y + r);
    for (let x = 0; x < w; x++) {
      let v = 0;
      for (let yy = lo; yy <= hi; yy++) if (tmp[yy * w + x]) { v = 1; break; }
      out[y * w + x] = v;
    }
  }
  return out;
}

export function erode(m, w, h, r) {
  if (r <= 0) return Uint8Array.from(m);
  const tmp = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) {
    const row = y * w;
    for (let x = 0; x < w; x++) {
      let v = 1;
      for (let xx = x - r; xx <= x + r; xx++) {
        if (xx < 0 || xx >= w || !m[row + xx]) { v = 0; break; }
      }
      tmp[row + x] = v;
    }
  }
  const out = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let v = 1;
      for (let yy = y - r; yy <= y + r; yy++) {
        if (yy < 0 || yy >= h || !tmp[yy * w + x]) { v = 0; break; }
      }
      out[y * w + x] = v;
    }
  }
  return out;
}

/** rim = dilate(silhouette, r) AND NOT erode(silhouette, r) */
export function rimMask(sil, w, h, r = 2) {
  const d = dilate(sil, w, h, r), e = erode(sil, w, h, r);
  const out = new Uint8Array(w * h);
  let c = 0;
  for (let i = 0; i < out.length; i++) { if (d[i] && !e[i]) { out[i] = 1; c++; } }
  return { mask: out, px: c };
}

export function bboxOf(m, w, h, pad = 0) {
  let x0 = w, y0 = h, x1 = -1, y1 = -1;
  for (let y = 0; y < h; y++) {
    const row = y * w;
    for (let x = 0; x < w; x++) {
      if (m[row + x]) {
        if (x < x0) x0 = x; if (x > x1) x1 = x;
        if (y < y0) y0 = y; if (y > y1) y1 = y;
      }
    }
  }
  if (x1 < 0) return null;
  x0 = Math.max(0, x0 - pad); y0 = Math.max(0, y0 - pad);
  x1 = Math.min(w - 1, x1 + pad); y1 = Math.min(h - 1, y1 + pad);
  return { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 };
}

export function maskOfBox(box, w, h) {
  const m = new Uint8Array(w * h);
  for (let y = box.y; y < box.y + box.h; y++) {
    for (let x = box.x; x < box.x + box.w; x++) m[y * w + x] = 1;
  }
  return m;
}

export const THRESH = {
  bboxPct8: 0.05,     // % of bbox pixels with any channel delta > 8/255
  bboxMaxDelta: 8,    // absolute channel delta
  rimPct8: 2.0,       // % of rim-band pixels with any channel delta > 8/255
  maskMinCov: 0.002,  // 0.2 % of the frame
  maskMaxCov: 0.60,   // a silhouette covering most of the frame is not a silhouette
};

/**
 * Compare two captures. Returns measured stats + verdict + reliability.
 * Pass `silA` / `silB` ({mask, coverage, source}) to use the background-difference
 * silhouette; otherwise the legacy alpha/luma chooser is used (and cannot certify).
 */
export function compareCaptures(a, b, opts = {}) {
  const {
    stride = 1, thresholds = THRESH, control = null, metaMatch = true,
    requireMask = null, silA = null, silB = null,
  } = opts;
  if (a.w !== b.w || a.h !== b.h) {
    throw new Error(`size mismatch ${a.w}x${a.h} vs ${b.w}x${b.h}`);
  }
  const w = a.w, h = a.h;
  const A = a.data, B = b.data;

  const whole = diffStats(A, B, w, h, null);

  let picked;
  if (silA || silB) {
    const mask = unionMask(silA && silA.mask, silB && silB.mask);
    let c = 0;
    for (let i = 0; i < mask.length; i++) if (mask[i]) c++;
    picked = { mask, source: (silA && silA.source) || (silB && silB.source) || 'bgdiff', coverage: c / (w * h) };
  } else {
    picked = pickMask(A, w, h);
  }
  const sil = picked.mask;

  const rim = rimMask(sil, w, h, 2);
  const box = bboxOf(sil, w, h, 2);
  const bboxSel = box ? maskOfBox(box, w, h) : null;

  const bbox = bboxSel ? diffStats(A, B, w, h, bboxSel) : { px: 0, pct2: 0, pct8: 0, meanAbs: 0, maxDelta: 0 };
  const rimStats = rim.px ? diffStats(A, B, w, h, rim.mask) : { px: 0, pct2: 0, pct8: 0, meanAbs: 0, maxDelta: 0 };

  const failures = [];
  if (box && bbox.pct8 > thresholds.bboxPct8) failures.push(`bbox >8/255 ${bbox.pct8}% > ${thresholds.bboxPct8}%`);
  if (box && bbox.maxDelta > thresholds.bboxMaxDelta) failures.push(`bbox max delta ${bbox.maxDelta} > ${thresholds.bboxMaxDelta}`);
  if (rim.px && rimStats.pct8 > thresholds.rimPct8) failures.push(`rim >8/255 ${rimStats.pct8}% > ${thresholds.rimPct8}%`);

  const reliable = [];
  if (stride !== 1) reliable.push('strided capture (subsampled) — cannot certify a pass');
  if (!box) reliable.push('no silhouette found');
  if (picked.source === 'none') reliable.push('no usable silhouette source');
  if (picked.coverage < thresholds.maskMinCov) reliable.push(`mask coverage ${(picked.coverage * 100).toFixed(3)}% < ${thresholds.maskMinCov * 100}%`);
  if (picked.coverage > thresholds.maskMaxCov) reliable.push(`mask coverage ${(picked.coverage * 100).toFixed(3)}% > ${thresholds.maskMaxCov * 100}% — mask is not a silhouette`);
  if (!metaMatch) reliable.push('baseline meta does not match this run');
  if (control && control.noisy) reliable.push('control run is above half the gate — noise floor too high to certify');

  // MASK-SOURCE ASSERTION: fail loudly rather than silently degrade to a luma guess.
  const maskAssert = { required: requireMask, got: picked.source, ok: requireMask ? picked.source === requireMask : true };
  if (!maskAssert.ok) {
    failures.push(`mask source ${picked.source} != required ${requireMask} (degraded mask cannot certify a pass)`);
    reliable.push(`mask-source assertion failed: ${picked.source} != ${requireMask}`);
  }

  const isReliable = reliable.length === 0;
  return {
    dims: { w, h },
    stride,
    mask: { source: picked.source, coverage: +(picked.coverage * 100).toFixed(3), rimPx: rim.px, bbox: box },
    maskAssert,
    whole, bbox, rim: rimStats,
    thresholds,
    failures,
    unreliable: reliable,
    pass: failures.length === 0 ? (isReliable ? true : null) : false,
    reliable: isReliable,
    control,
  };
}

/** A control pair is "noisy" if it uses more than half of any budget. */
export function controlVerdict(ctrl) {
  const noise = [];
  if (ctrl.bbox.pct8 > THRESH.bboxPct8 / 2) noise.push(`control bbox pct8 ${ctrl.bbox.pct8}% > half of ${THRESH.bboxPct8}%`);
  if (ctrl.bbox.maxDelta > THRESH.bboxMaxDelta / 2) noise.push(`control bbox max ${ctrl.bbox.maxDelta} > half of ${THRESH.bboxMaxDelta}`);
  if (ctrl.rim.pct8 > THRESH.rimPct8 / 2) noise.push(`control rim pct8 ${ctrl.rim.pct8}% > half of ${THRESH.rimPct8}%`);
  return { noisy: noise.length > 0, noise };
}

/* =============================== runner ================================= */

const BASELINE = path.join(OUT, 'parity-baseline');
export const DEFAULT_QUERY = process.env.ROGUE_QUERY || 'gemdpr=3&gemperf=1';
export const DEFAULT_ARMS = 'default,?gemmesh=0,?gemmesh=1';
export const DEFAULT_ARM_EXPECT = 'default=?gemmesh=0';

export function parseArgs(argv) {
  const a = {
    save: false, compare: false, stride: 1, force: false,
    arms: null, armExpect: DEFAULT_ARM_EXPECT, url: BASE_URL, refRoot: null,
  };
  for (let i = 0; i < argv.length; i++) {
    const k = argv[i];
    if (k === '--save') a.save = true;
    else if (k === '--compare') a.compare = true;
    else if (k === '--stride') a.stride = Number(argv[++i]);
    else if (k === '--force') a.force = true;
    else if (k === '--arms') a.arms = String(argv[++i] || '');
    else if (k === '--arm-expect') a.armExpect = String(argv[++i] || '');
    else if (k === '--url') a.url = String(argv[++i] || BASE_URL);
    else if (k === '--ref-root') a.refRoot = String(argv[++i] || '');
  }
  return a;
}

export function parseArms(s) {
  return String(s || '').split(',').map((x) => x.trim()).filter(Boolean).map((raw) => {
    const q = raw.replace(/^\?/, '');
    return { id: raw, query: q === 'default' ? '' : q };
  });
}

/**
 * One `--arm-expect 'a=b'` spec against the captured pairs. Split on the FIRST '=' only:
 * arm ids themselves contain one ("?gemmesh=0"), and splitting on every '=' silently
 * produced b="?gemmesh", which matched no pair and read as a failure.
 */
export function expectationFor(spec, pairs) {
  const i = String(spec).indexOf('=');
  const a = i < 0 ? String(spec).trim() : String(spec).slice(0, i).trim();
  const b = i < 0 ? '' : String(spec).slice(i + 1).trim();
  const pair = (pairs || []).find((p) => (p.a === a && p.b === b) || (p.a === b && p.b === a));
  if (!pair) return { a, b, ok: null, why: 'pair not captured' };
  return {
    a, b, ok: pair.pass === true,
    bboxPct8: pair.bbox ? pair.bbox.pct8 : null,
    bboxMaxDelta: pair.bbox ? pair.bbox.maxDelta : null,
    rimPct8: pair.rim ? pair.rim.pct8 : null,
    failures: pair.failures || [],
  };
}

async function captureArm(browser, arm, { stride = 1, url = BASE_URL } = {}) {
  const page = await openPage(browser);
  try {
    await seedTune(page);
    const q = [DEFAULT_QUERY, arm.query].filter(Boolean).join('&');
    let cap = null, info = null, tries = 0;
    while (!cap) {
      tries++;
      try {
        await mountCeremony(page, { url, query: q });
        info = await pin(page);
        await sleep(250);
        cap = await capturePinned(page, { hideFloors: true, withBg: true, stride });
      } catch (e) {
        // A failed mount is not a renderer verdict: under GPU contention (sibling lanes)
        // the rig occasionally never gets a renderer. Retry the mount, never the verdict.
        if (tries >= 4) throw e;
        console.log(`[parity] mount/capture failed (try ${tries}, ${String(e.message).slice(0, 90)}) — remounting ${arm.id}`);
        await sleep(2500);
      }
    }
    const render = await renderBuildHash(page);
    return { arm, cap, info, render, ua: await page.ev('navigator.userAgent') };
  } finally { await page.close(); }
}

function silOf(cap) {
  if (!cap || !cap.bg) return null;
  return silhouetteFromPair(cap.fg.data, cap.bg.data, cap.fg.w, cap.fg.h, 8);
}

export async function main(argv = process.argv.slice(2)) {
  const args = parseArgs(argv);
  ensureDir(OUT);
  const build = buildIdentity();
  // Identity of the tree the BASELINE is served from. `--ref-root` points at a reference
  // worktree; without it the baseline is captured from the run's own tree and is self-only.
  const refBuild = args.refRoot ? buildIdentity({ repo: args.refRoot }) : build;
  const browser = await launchChrome({ label: 'parity' });

  let report;
  try {
    /* ---- control: two fresh loads of the same build, identical pinned state ---- */
    let c1 = null, c2 = null, cTries = 0;
    for (;;) {
      c1 = await captureArm(browser, { id: 'default', query: '' }, { stride: args.stride, url: args.url });
      await sleep(300);
      c2 = await captureArm(browser, { id: 'default', query: '' }, { stride: args.stride, url: args.url });
      if (c1.cap.srcW === c2.cap.srcW && c1.cap.srcH === c2.cap.srcH) break;
      cTries++;
      console.log(`[parity] control loads disagree on buffer size (${c1.cap.srcW}x${c1.cap.srcH} vs ${c2.cap.srcW}x${c2.cap.srcH}) — recapturing`);
      if (cTries >= 3) throw new Error(`control captures never agreed on buffer size (${c1.cap.srcW}x${c1.cap.srcH} vs ${c2.cap.srcW}x${c2.cap.srcH}) — canonical box did not take`);
    }
    const s1 = silOf(c1.cap), s2 = silOf(c2.cap);
    const ctrlRaw = compareCaptures(c1.cap.fg, c2.cap.fg, {
      stride: args.stride, silA: s1, silB: s2, requireMask: 'bgdiff',
    });
    const cv = controlVerdict(ctrlRaw);
    const control = {
      bbox: ctrlRaw.bbox, rim: ctrlRaw.rim, whole: ctrlRaw.whole,
      mask: ctrlRaw.mask, maskAssert: ctrlRaw.maskAssert,
      noisy: cv.noisy, noise: cv.noise,
      buffer: [c1.cap.srcW, c1.cap.srcH], hiddenFloors: c1.cap.hiddenFloors,
      arm: { mesh: c1.cap.mesh, bloom: c1.cap.bloom },
      render: c1.render,
    };

    const metaNow = {
      role: args.refRoot ? 'reference' : 'self',
      url: args.url, armQuery: DEFAULT_QUERY, view: VIEW, pose: POSE, stride: args.stride,
      buffer: [c1.cap.srcW, c1.cap.srcH], ratio: c1.cap.ratio, ua: c1.ua,
      hideFloors: true, hiddenFloors: c1.cap.hiddenFloors, floorsPresent: c1.cap.floorsPresent,
      canonicalBox: c1.cap.canonicalBox,
      maskSource: 'bgdiff', captureTask: 'pin + render + gl.readPixels in ONE CDP task',
      render: c1.render,
      build: refBuild, buildOfRun: build,
      createdAt: new Date().toISOString(),
    };

    /* ---- baseline ---- */
    let change = null, baseline = null;
    const mp = path.join(BASELINE, 'meta.json'), rp = path.join(BASELINE, 'baseline.raw');

    if (args.save) {
      ensureDir(BASELINE);
      fs.writeFileSync(path.join(BASELINE, 'baseline.raw'), c1.cap.fg.data);
      if (c1.cap.bg) fs.writeFileSync(path.join(BASELINE, 'baseline.bg.raw'), c1.cap.bg.data);
      writeJSON('parity-baseline/meta.json', metaNow);
      baseline = {
        saved: true, role: metaNow.role, buffer: metaNow.buffer, dir: BASELINE,
        build: refBuild, renderHash: c1.render.hash, hiddenFloors: c1.cap.hiddenFloors,
        hasBg: !!c1.cap.bg,
      };
    } else if (args.compare) {
      if (!fs.existsSync(mp) || !fs.existsSync(rp)) throw new Error('no baseline; run `node parity.mjs --save` first');
      const meta = readJSON(mp);
      const data = fs.readFileSync(rp);
      const bgPath = path.join(BASELINE, 'baseline.bg.raw');
      const bgData = fs.existsSync(bgPath) ? fs.readFileSync(bgPath) : null;

      const baseRender = meta.render || null;
      const hashSame = !!(baseRender && c1.render && baseRender.hash === c1.render.hash);
      const identity = baseRender ? (hashSame ? 'same' : 'different') : 'unknown';
      const selfReferential = hashSame;
      const role = meta.role || 'self';
      const armMatch = meta.armQuery === DEFAULT_QUERY;
      const maskOk = meta.maskSource === 'bgdiff' && !!bgData && bgData.length === data.length;
      const poolsHidden = Array.isArray(meta.hiddenFloors) && meta.hiddenFloors.length > 0
        && meta.hiddenFloors.includes('caustic');
      const dimsMatch = meta.buffer[0] === c1.cap.srcW && meta.buffer[1] === c1.cap.srcH;
      const boxMatch = !!(meta.canonicalBox && c1.cap.canonicalBox
        && meta.canonicalBox.w === c1.cap.canonicalBox.w && meta.canonicalBox.h === c1.cap.canonicalBox.h);
      const protoMatch = meta.stride === args.stride && dimsMatch;

      baseline = {
        meta, identity, selfReferential, role, armMatch, maskOk, poolsHidden, dimsMatch, boxMatch, protoMatch,
        build: meta.build || null, buildNow: build, renderHash: baseRender ? baseRender.hash : null,
        renderNow: c1.render.hash, metaMatch: protoMatch && armMatch && maskOk && poolsHidden && boxMatch,
      };

      const why = [];
      if (!baseRender) why.push('baseline has no render build hash (pre-repair baseline cannot be attributed to a build)');
      if (!armMatch) why.push(`baseline was captured for arm "${meta.armQuery}" but this run compares "${DEFAULT_QUERY}"`);
      if (!maskOk) why.push(`baseline silhouette is not a bgdiff pair of the right size (maskSource=${meta.maskSource}, bg=${bgData ? bgData.length : 'missing'})`);
      if (!poolsHidden) why.push(`baseline did not hide the floor pools (hiddenFloors=${JSON.stringify(meta.hiddenFloors)})`);
      if (!boxMatch) why.push(`baseline canonical capture box ${JSON.stringify(meta.canonicalBox || null)} != ${JSON.stringify(c1.cap.canonicalBox)}`);
      if (!protoMatch) why.push(`baseline protocol mismatch (baseline ${meta.buffer.join('x')} stride ${meta.stride} vs now ${c1.cap.srcW}x${c1.cap.srcH} stride ${args.stride})`);
      if (identity === 'different' && role !== 'reference' && !args.force) {
        why.push(`baseline render hash ${baseRender ? baseRender.hash : '?'} != current ${c1.render.hash} and it was not declared a reference (--ref-root) — refusing without --force`);
      }

      if (why.length) {
        change = {
          pass: null, reliable: false, failures: [],
          unreliable: why, refused: true, identity, selfReferential, role,
          dims: { w: c1.cap.srcW, h: c1.cap.srcH },
          mask: ctrlRaw.mask, whole: ctrlRaw.whole, bbox: ctrlRaw.bbox, rim: ctrlRaw.rim,
          thresholds: THRESH,
        };
      } else {
        const before = { data, w: meta.buffer[0], h: meta.buffer[1], stride: meta.stride };
        const silBase = silhouetteFromPair(before.data, bgData, before.w, before.h, 8);
        change = compareCaptures(before, c1.cap.fg, {
          stride: args.stride, control, metaMatch: true,
          silA: silBase, silB: s1, requireMask: 'bgdiff',
        });
        change.selfReferential = selfReferential;
        change.identity = identity;
        change.role = role;
        // The mask is built from the REFERENCE capture's own frame+background pair, and asserted
        // to be bgdiff — never from the run under test, and never from alpha/luma.
        change.maskProvenance = {
          a: { source: 'baseline.bgdiff', build: meta.build ? meta.build.label : null, renderHash: baseRender.hash },
          b: { source: 'current.bgdiff', build: build.label, renderHash: c1.render.hash },
          asserted: 'bgdiff',
          sameTaskCapture: true,
        };
        if (meta.build && build && meta.build.head !== build.head && hashSame) {
          change.unreliable = change.unreliable || [];
          change.note = `git heads differ (${meta.build.short} vs ${build.short}) but the render-path hash is identical — counted as self-referential`;
        }
      }
    }

    /* ---- arms: every render path, one session, one pinned pose ---- */
    let armsOut = null;
    if (args.arms) {
      const defs = parseArms(args.arms);
      const capByArm = [];
      for (const d of defs) {
        try {
          const r = await captureArm(browser, d, { stride: args.stride, url: args.url });
          capByArm.push({ id: d.id, query: d.query, cap: r.cap, sil: silOf(r.cap), info: r.info, render: r.render, ok: true });
        } catch (e) {
          capByArm.push({ id: d.id, query: d.query, ok: false, error: String(e.message).slice(0, 240) });
        }
        await sleep(200);
      }
      // repeat of the FIRST arm: the self-noise floor of this protocol, same session
      let selfNoise = null;
      if (capByArm[0] && capByArm[0].ok) {
        try {
          const r2 = await captureArm(browser, defs[0], { stride: args.stride, url: args.url });
          const cmp = compareCaptures(capByArm[0].cap.fg, r2.cap.fg, {
            stride: args.stride, silA: capByArm[0].sil, silB: silOf(r2.cap), requireMask: 'bgdiff',
          });
          selfNoise = {
            bbox: cmp.bbox, rim: cmp.rim, whole: cmp.whole, mask: cmp.mask,
            pass: cmp.pass, failures: cmp.failures,
          };
        } catch (e) { selfNoise = { error: String(e.message).slice(0, 240) }; }
      }
      const pairs = [];
      for (let i = 0; i < capByArm.length; i++) {
        for (let j = i + 1; j < capByArm.length; j++) {
          const A = capByArm[i], B = capByArm[j];
          if (!A.ok || !B.ok) { pairs.push({ a: A.id, b: B.id, pass: null, failures: ['arm failed to capture'] }); continue; }
          if (A.cap.srcW !== B.cap.srcW || A.cap.srcH !== B.cap.srcH) {
            pairs.push({ a: A.id, b: B.id, pass: null, failures: [`size mismatch ${A.cap.srcW}x${A.cap.srcH} vs ${B.cap.srcW}x${B.cap.srcH}`] });
            continue;
          }
          const cmp = compareCaptures(A.cap.fg, B.cap.fg, {
            stride: args.stride, silA: A.sil, silB: B.sil, requireMask: 'bgdiff',
          });
          pairs.push({
            a: A.id, b: B.id,
            mask: cmp.mask, bbox: cmp.bbox, rim: cmp.rim, whole: cmp.whole,
            pass: cmp.pass, failures: cmp.failures, unreliable: cmp.unreliable,
          });
        }
      }

      // Required-match invariants: `default=?gemmesh=0` must be byte-identical (E2 flip gate).
      // `default vs ?gemmesh=1` is EXPECTED to differ (documented crease artefact) and is not
      // required to match — it is reported so a change in the mesh path is visible.
      const specs = String(args.armExpect || '').split(',').map((s) => s.trim()).filter(Boolean);
      const expectations = specs.map((spec) => expectationFor(spec, pairs));
      const requiredMatch = {
        specs, ok: expectations.every((e) => e.ok === true),
        failed: expectations.filter((e) => e.ok === false).map((e) => `${e.a}=${e.b}`),
        notEvaluated: expectations.filter((e) => e.ok === null).map((e) => `${e.a}=${e.b}`),
      };

      armsOut = {
        requested: defs.map((d) => d.id),
        captured: capByArm.map((a) => ({
          id: a.id, query: a.query, ok: a.ok, error: a.error || null,
          buffer: a.cap ? [a.cap.srcW, a.cap.srcH] : null,
          hiddenFloors: a.cap ? a.cap.hiddenFloors : null,
          mesh: a.cap ? a.cap.mesh : null,
          bloom: a.cap ? a.cap.bloom : null,
          renderHash: a.render ? a.render.hash : null,
          mask: a.sil ? { source: a.sil.source, coverage: +(a.sil.coverage * 100).toFixed(3) } : null,
        })),
        selfNoise,
        pairs,
        expectations,
        requiredMatch,
      };
      writeJSON('arms.json', armsOut);
    }

    report = {
      suite: 'parity',
      provisional: false,
      build,
      buildEnd: buildIdentity(),
      buildStable: sameBuild(build, buildIdentity()),
      protocol: {
        viewport: VIEW, pose: POSE, query: DEFAULT_QUERY, url: args.url,
        rule: 'bbox pct8 <= 0.05% AND bbox maxDelta <= 8 AND rim pct8 <= 2%',
        thresholds: THRESH,
        mask: 'bgdiff silhouette = |pinned frame - gem-hidden frame| > 8; rim = dilate(S,2) \\ erode(S,2); S = union(A,B)',
        capture: 'pin + render + gl.readPixels in ONE CDP task (preserveDrawingBuffer:false)',
        captureBox: 'canonical 340x480 CSS box forced on the rig canvas before every capture (the layout box rounds 339/340 px between loads)',
        floors: 'shadow/contact/caustic hidden for every parity + arm capture',
        control: 'two fresh page loads, identical state, same build',
        baselineIdentity: 'git HEAD + status digest of the served tree (--ref-root) AND a render-path hash of the Vite-served bodies; a baseline whose hash equals the run is selfReferential',
        arms: armsOut ? { requested: armsOut.requested, requiredMatch: armsOut.requiredMatch } : null,
      },
      control,
      baseline,
      change,
      arms: armsOut,
      armsInvariant: armsOut ? armsOut.requiredMatch : null,
      pass: change ? change.pass : null,
      reliable: change ? change.reliable : !control.noisy,
      certified: !!(change && change.pass === true && change.reliable && !change.selfReferential
        && (!armsOut || armsOut.requiredMatch.ok)),
      at: new Date().toISOString(),
    };
    writeJSON('parity.json', report);
  } finally {
    await browser.close();
  }

  const c = report.control;
  console.log(`[parity] build ${report.build.label}  buffer ${c.buffer.join('x')}  floors hidden [${c.hiddenFloors.join(',')}]  render ${c.render.hash}`);
  console.log(`[parity] control  mask ${c.mask.source} cov ${c.mask.coverage}%  bbox>8 ${c.bbox.pct8}%  max ${c.bbox.maxDelta}  rim>8 ${c.rim.pct8}%  ${c.noisy ? 'NOISY' : 'clean'}`);
  if (report.change) {
    const ch = report.change;
    console.log(`[parity] change   identity ${ch.identity || '?'}${ch.selfReferential ? ' (SELF-REFERENTIAL)' : ''}${ch.role ? ` role ${ch.role}` : ''}  bbox>8 ${ch.bbox && ch.bbox.pct8}%  max ${ch.bbox && ch.bbox.maxDelta}  rim>8 ${ch.rim && ch.rim.pct8}%  -> ${ch.pass === null ? 'UNRELIABLE' : ch.pass ? 'PASS' : 'FAIL'}`);
    for (const f of ch.failures) console.log('         FAIL:', f);
    for (const u of ch.unreliable) console.log('         NOTE:', u);
  } else console.log('[parity] change   none (control-only run)');
  if (report.arms) {
    console.log('[parity] arms:');
    for (const p of report.arms.pairs) {
      console.log(`   ${String(p.a).padEnd(12)} vs ${String(p.b).padEnd(12)} bbox>8 ${p.bbox ? p.bbox.pct8 : '-'}%  max ${p.bbox ? p.bbox.maxDelta : '-'}  rim>8 ${p.rim ? p.rim.pct8 : '-'}%  ${p.pass === null ? 'UNRELIABLE' : p.pass ? 'MATCH' : 'DIFFER'}`);
    }
    const rm = report.arms.requiredMatch;
    console.log(`[parity] arms invariant ${rm.ok ? 'PASS' : 'FAIL'} — required match: ${rm.specs.join(', ')}${rm.failed.length ? ` (failed: ${rm.failed.join(', ')})` : ''}`);
  }
  console.log('[parity] ->', path.join(OUT, 'parity.json'));
  return report;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((e) => { console.error('[parity] FATAL', e); process.exit(1); });
}
