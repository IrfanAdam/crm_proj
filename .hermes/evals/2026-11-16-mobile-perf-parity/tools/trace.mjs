#!/usr/bin/env node
/* mobile performance trace + pixel oracle for the Alphas prototype — harness only, never part of the app.
 *
 * usage:
 *   node .hermes/tmp/perf-mobile/trace.mjs --port 5210 --label base
 *   node .hermes/tmp/perf-mobile/trace.mjs --port 5210 --label base --mode oracle
 *   node .hermes/tmp/perf-mobile/trace.mjs --port 5210 --label base --mode both
 *   node .hermes/tmp/perf-mobile/trace.mjs --port 5210 --label no-gem --block 'gem-,three.min.js'
 *
 * flags:  --url <base url>        measure a different origin (e.g. a static dist server)
 *         --block a,b,c           Network.setBlockedURLs substrings (diagnostic A/B; not a baseline)
 *         --runs N                measured navigations (default 1); a warm-up pass always runs first
 *         --no-warm               skip the warm-up navigation
 *         --no-throttle           CPU 1x instead of 4x
 *         --trace-swift           force swiftshader (software GL); default is the Metal GPU path
 *
 * trace  -> .hermes/tmp/perf-mobile/out/<label>.json + compact table on stdout
 * oracle -> .hermes/tmp/perf-mobile/oracle/<label>/*.png + index.json
 *
 * Always point it at a FROZEN copy, never the live source tree:
 *   rm -rf $TMPDIR/perf-base && mkdir -p $TMPDIR/perf-base
 *   git archive HEAD | tar -x -C $TMPDIR/perf-base
 *   ln -s "$PWD/node_modules" $TMPDIR/perf-base/node_modules
 *   (cd $TMPDIR/perf-base && npx vite --port 5210 --host 127.0.0.1 --strictPort)
 */
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import http from 'node:http';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import WebSocket from 'ws';
/* the oracle half of this file is delegated: one freeze implementation, one surface list */
import { FREEZE_PRELUDE, captureSet as captureSetDet } from './deterministic.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const CHROME = process.env.CHROME_BIN || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

/* ---------- args ---------- */
function arg(name, def) {
  const i = process.argv.indexOf('--' + name);
  if (i === -1) return def;
  const v = process.argv[i + 1];
  return v === undefined || v.startsWith('--') ? true : v;
}
const PORT = Number(arg('port', 5210));
const LABEL = String(arg('label', 'base'));
const MODE = String(arg('mode', 'trace'));
const BASE = String(arg('url', `http://127.0.0.1:${PORT}/`));
const OUT_JSON = path.resolve(arg('out', path.join(HERE, 'out')));
const ORACLE_DIR = path.resolve(arg('oracle-dir', path.join(HERE, 'oracle')));
const THROTTLE = arg('no-throttle', false) === false ? 4 : 1;
const SWIFT = arg('trace-swift', false) !== false;
const RUNS = Math.max(1, Number(arg('runs', 1)) || 1);
const WARM = arg('no-warm', false) === false;
const BLOCK = String(arg('block', '')).split(',').map((s) => s.trim()).filter(Boolean);
const READY_MODE = String(arg('ready', 'dock'));            // dock | cards
const MOBILE = { w: 393, h: 852, dpr: 3 };
const DESKTOP = { w: 1440, h: 900, dpr: 1 };
const BOOT_TIMEOUT = Number(arg('boot-timeout', 240000));
const COLD = arg('warm-cache', false) === false;   // measured pass runs with the HTTP cache off = first-visit numbers
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/* ---------- tiny CDP client (same shape as .hermes/tmp/perf/capture.mjs) ---------- */
class CDP {
  constructor(ws) {
    this.ws = ws; this.id = 0; this.pending = new Map(); this.listeners = [];
    ws.on('message', (buf) => {
      const msg = JSON.parse(buf.toString());
      if (msg.id && this.pending.has(msg.id)) {
        const { res, rej } = this.pending.get(msg.id);
        this.pending.delete(msg.id);
        if (msg.error) rej(new Error(msg.error.message + ' ' + JSON.stringify(msg.error.data || '')));
        else res(msg.result);
      } else if (msg.method) {
        for (const l of this.listeners) l(msg);
      }
    });
  }
  send(method, params = {}, sessionId) {
    const id = ++this.id;
    const payload = { id, method, params };
    if (sessionId) payload.sessionId = sessionId;
    return new Promise((res, rej) => {
      this.pending.set(id, { res, rej });
      this.ws.send(JSON.stringify(payload));
      setTimeout(() => { if (this.pending.has(id)) { this.pending.delete(id); rej(new Error('timeout: ' + method)); } }, 120000);
    });
  }
}
function httpJson(url) {
  return new Promise((res, rej) => {
    http.get(url, (r) => { let d = ''; r.on('data', (c) => (d += c)); r.on('end', () => { try { res(JSON.parse(d)); } catch (e) { rej(e); } }); }).on('error', rej);
  });
}
function freePort() {
  return new Promise((res, rej) => {
    const s = net.createServer(); s.listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => res(p)); }); s.on('error', rej);
  });
}
async function waitFor(fn, ms, every = 120) {
  const t0 = Date.now();
  for (;;) {
    try { const v = await fn(); if (v) return v; } catch (e) { /* keep polling */ }
    if (Date.now() - t0 > ms) return null;
    await sleep(every);
  }
}
async function ev(cdp, session, expression, timeout = 120000) {
  const r = await cdp.send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true, timeout }, session);
  if (r.exceptionDetails) throw new Error('eval failed: ' + (r.exceptionDetails.exception?.description || r.exceptionDetails.text));
  return r.result.value;
}
async function metrics(cdp, session) {
  const { metrics: list } = await cdp.send('Performance.getMetrics', {}, session);
  const o = {};
  for (const m of list) o[m.name] = m.value;
  return o;
}
const PICK = ['TaskDuration', 'ScriptDuration', 'LayoutCount', 'RecalcStyleCount', 'LayoutDuration', 'RecalcStyleDuration', 'JSHeapUsedSize', 'Nodes', 'Documents'];
const pickM = (m) => { const o = {}; for (const k of PICK) o[k] = m[k] ?? null; return o; };
const deltaM = (a, b) => { const o = {}; for (const k of PICK) o[k] = +(Number(b[k] ?? 0) - Number(a[k] ?? 0)).toFixed(4); return o; };

/* ---------- instrumentation installed before any app script runs ---------- */
const PRELUDE = `
(() => {
  window.__lt = []; window.__ltMark = 0;
  try {
    new PerformanceObserver((l) => {
      for (const e of l.getEntries()) {
        const a = e.attribution && e.attribution[0];
        window.__lt.push({ start: Math.round(e.startTime), dur: Math.round(e.duration), name: e.name,
                           attr: a ? (a.containerType || '') + '/' + (a.containerName || '') : '' });
      }
    }).observe({ type: 'longtask', buffered: true });
  } catch (e) { window.__ltErr = String(e && e.message); }
  window.__paints = []; window.__lcp = 0;
  try { new PerformanceObserver((l) => { for (const e of l.getEntries()) window.__paints.push([e.name, Math.round(e.startTime)]); }).observe({ type: 'paint', buffered: true }); } catch (e) {}
  try { new PerformanceObserver((l) => { const es = l.getEntries(); const e = es[es.length - 1]; if (e) window.__lcp = Math.round(e.startTime); }).observe({ type: 'largest-contentful-paint', buffered: true }); } catch (e) {}

  /* frame cadence over a scripted scroll: one scroll step per rAF, record deltas.
     In fullscreen the app feed (#app-content) is the scroller — window does not scroll. */
  window.__rafSample = function (steps) {
    var el = document.getElementById('app-content');
    var useWin = !el || el.scrollHeight <= el.clientHeight + 8;
    if (useWin) el = document.scrollingElement || document.documentElement;
    var max = el.scrollHeight - el.clientHeight;
    var step = Math.max(1, Math.round(max / steps));
    var out = []; var last = 0; var i = 0;
    return new Promise(function (resolve) {
      function tick(t) {
        if (last) out.push(+(t - last).toFixed(2));
        last = t;
        if (i >= steps) {
          resolve({ deltas: out.slice(1), scroller: useWin ? 'window' : '#app-content',
                    step: step, max: max, scrolled: Math.round(el.scrollTop) });
          return;
        }
        i++;
        el.scrollTop = el.scrollTop + step;
        requestAnimationFrame(tick);
      }
      requestAnimationFrame(tick);
    });
  };
})();
`;

/* static inventory: render-blocking tags, blur surfaces, layer-ish hints */
const INVENTORY = `(() => {
  const head = document.head;
  const hScripts = [...head.querySelectorAll('script[src]')];
  const all = [...document.querySelectorAll('script[src]')];
  const sheets = [...document.querySelectorAll('link[rel="stylesheet"]')];
  const blur = []; const willChange = []; let fixed = 0;
  for (const el of document.querySelectorAll('*')) {
    const cs = getComputedStyle(el);
    if (cs.backdropFilter && cs.backdropFilter !== 'none') {
      const r = el.getBoundingClientRect();
      const cls = typeof el.className === 'string' ? el.className.trim().split(/\\s+/).slice(0, 2).join('.') : '';
      blur.push({ sel: el.tagName.toLowerCase() + (el.id ? '#' + el.id : '') + (cls ? '.' + cls : ''),
                  w: Math.round(r.width), h: Math.round(r.height), filter: cs.backdropFilter.slice(0, 44) });
    }
    if (cs.willChange && cs.willChange !== 'auto') willChange.push(cs.willChange);
    if (cs.position === 'fixed') fixed++;
  }
  const count = (s) => { try { return document.querySelectorAll(s).length; } catch (e) { return -1; } };
  return {
    domNodes: document.querySelectorAll('*').length,
    headScripts: hScripts.length,
    headClassicBlocking: hScripts.filter((s) => !s.defer && !s.async && s.type !== 'module').length,
    classicBlockingAnywhere: all.filter((s) => !s.defer && !s.async && s.type !== 'module').length,
    stylesheets: sheets.length,
    moduleScripts: document.querySelectorAll('script[type="module"]').length,
    scriptTags: all.length,
    cssLinksExternal: sheets.filter((s) => /^https?:/.test(s.href)).length,
    blurCount: blur.length,
    blurTop: blur.sort((a, b) => b.w * b.h - a.w * a.h).slice(0, 12),
    willChangeCount: willChange.length,
    fixedCount: fixed,
    dockLensNodes: count('.docklens, .docklens *'),
    dockLensCopies: count('.docklens__copy, .docklens__band-copy'),
    dockLensCards: count('.docklens .opp-card'),
    oppCards: count('.opp-card'),
    tabbars: count('.tabbar'),
    fabGems: count('.fab-gem'),
  };
})()`;

/* ---------- browser ---------- */
async function launch() {
  const debugPort = await freePort();
  const profile = path.join(os.tmpdir(), 'perf-mobile-' + process.pid + '-' + debugPort);
  fs.mkdirSync(profile, { recursive: true });
  const flags = [
    '--headless=new', `--remote-debugging-port=${debugPort}`, `--user-data-dir=${profile}`,
    '--no-first-run', '--no-default-browser-check', '--disable-extensions',
    '--disable-background-timer-throttling', '--disable-renderer-backgrounding',
    '--disable-backgrounding-occluded-windows', '--disable-ipc-flooding-protection',
    '--hide-scrollbars', '--mute-audio', '--no-sandbox',
    ...(SWIFT ? ['--enable-unsafe-swiftshader', '--use-angle=swiftshader'] : ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist']),
    '--window-size=1440,900', 'about:blank',
  ];
  const chrome = spawn(CHROME, flags, { stdio: ['ignore', 'pipe', 'pipe'] });
  let log = '';
  chrome.stderr.on('data', (d) => { log += d.toString(); if (log.length > 20000) log = log.slice(-20000); });
  const version = await waitFor(() => httpJson(`http://127.0.0.1:${debugPort}/json/version`), 25000, 200);
  if (!version) { chrome.kill('SIGKILL'); throw new Error('chrome never came up:\n' + log); }
  const ws = new WebSocket(version.webSocketDebuggerUrl, { perMessageDeflate: false, maxPayload: 256 * 1024 * 1024 });
  await new Promise((res, rej) => { ws.once('open', res); ws.once('error', rej); });
  const cdp = new CDP(ws);
  const close = async () => {
    cdp.send('Browser.close').catch(() => {});
    try { ws.close(); } catch (e) {}
    chrome.kill('SIGKILL');
    await sleep(600);
    try { fs.rmSync(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 300 }); } catch (e) {}
  };
  return { cdp, version, flags, close };
}

async function openTab(cdp) {
  const { targetId } = await cdp.send('Target.createTarget', { url: 'about:blank' });
  const { sessionId } = await cdp.send('Target.attachToTarget', { targetId, flatten: true });
  await cdp.send('Page.enable', {}, sessionId);
  await cdp.send('Runtime.enable', {}, sessionId);
  await cdp.send('Network.enable', {}, sessionId);
  await cdp.send('Performance.enable', {}, sessionId);
  await cdp.send('Target.activateTarget', { targetId });
  await cdp.send('Page.setWebLifecycleState', { state: 'active' }, sessionId);
  await cdp.send('Page.addScriptToEvaluateOnNewDocument', { source: FREEZE_PRELUDE + PRELUDE }, sessionId);
  if (BLOCK.length) await cdp.send('Network.setBlockedURLs', { urls: BLOCK }, sessionId).catch(() => {});
  return { targetId, session: sessionId };
}

function collectNetwork(cdp) {
  const reqs = new Map();
  cdp.listeners.push((m) => {
    if (m.method === 'Network.requestWillBeSent') {
      reqs.set(m.params.requestId, { url: m.params.request.url, type: m.params.type, bytes: 0, status: 0, failed: false, at: m.params.timestamp });
    } else if (m.method === 'Network.responseReceived') {
      const r = reqs.get(m.params.requestId); if (r) { r.status = m.params.response.status; r.type = m.params.type || r.type; r.mime = m.params.response.mimeType; }
    } else if (m.method === 'Network.loadingFinished') {
      const r = reqs.get(m.params.requestId); if (r) r.bytes = m.params.encodedDataLength || 0;
    } else if (m.method === 'Network.loadingFailed') {
      const r = reqs.get(m.params.requestId); if (r) { r.failed = true; r.error = m.params.errorText; }
    }
  });
  return { dump: () => [...reqs.values()] };
}

/* ---------- mobile fullscreen boot ---------- */
const READY_DOCK = `(() => {
  return !!document.getElementById('open-fullscreen')
    && document.querySelectorAll('.opp-card').length > 0
    && !!document.querySelector('.tabbar')
    && !!document.querySelector('.fab-gem');
})()`;
const READY_CARDS = `(() => {
  return !!document.getElementById('open-fullscreen')
    && document.querySelectorAll('.opp-card').length > 0
    && !!window.THREE;
})()`;
/* --ready dock = feed + React dock island (default); cards = feed only (A/B runs that block the island) */
const READY = READY_MODE === 'cards' ? READY_CARDS : READY_DOCK;

async function bootMobile(cdp, session, { reduced = false, bootTimeout = 180000 } = {}) {
  await cdp.send('Emulation.setDeviceMetricsOverride', { width: MOBILE.w, height: MOBILE.h, deviceScaleFactor: MOBILE.dpr, mobile: true }, session);
  await cdp.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 }, session);
  await cdp.send('Emulation.setEmulatedMedia', { features: reduced ? [{ name: 'prefers-reduced-motion', value: 'reduce' }] : [] }, session);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: THROTTLE }, session);
  const t0 = Date.now();
  await cdp.send('Page.navigate', { url: BASE }, session);
  const ready = await waitFor(async () => (await ev(cdp, session, READY)) === true, bootTimeout, 150);
  if (!ready) throw new Error('app never hydrated (feed / .tabbar / .fab-gem missing) — ' + BASE);
  const tHydrated = Date.now();
  await ev(cdp, session, `(document.getElementById('open-fullscreen').click(), 1)`);
  const inFs = await waitFor(async () => (await ev(cdp, session, `document.body.classList.contains('app-fullscreen')`)) === true, 20000, 100);
  if (!inFs) throw new Error('#open-fullscreen did not set body.app-fullscreen');
  await ev(cdp, session, `new Promise(r => requestAnimationFrame(() => requestAnimationFrame(() => r(1))))`);
  await sleep(500);
  return { hydratedMs: tHydrated - t0, fullscreenMs: Date.now() - t0, t0 };
}

/* ---------- (a)-(e) trace ---------- */
async function runTrace(cdp) {
  const { session } = await openTab(cdp);
  const net = collectNetwork(cdp);
  let layers = []; let layerEvents = 0; let maxLayers = [];
  const keepLayers = () => { layerEvents++; if (layers.length > maxLayers.length) maxLayers = layers; };
  cdp.listeners.push((m) => {
    if (m.method === 'LayerTree.layerTreeDidChange') {
      if (m.params.layers) { layers = m.params.layers; keepLayers(); } else layerEvents++;
    }
  });
  await cdp.send('LayerTree.enable', {}, session);

  if (WARM) {                                     // warm-up pass: absorbs vite dep-optimize + module transform cache
    await bootMobile(cdp, session, { bootTimeout: BOOT_TIMEOUT });
    await cdp.send('Page.navigate', { url: 'about:blank' }, session);
    await sleep(500);
  }
  // measured pass must be a first visit: the warm-up already primed the HTTP cache, so disable it
  if (COLD && WARM) await cdp.send('Network.setCacheDisabled', { cacheDisabled: true }, session);
  // reset network/layer evidence for the measured pass
  const baseCount = net.dump().length;
  const boot = await bootMobile(cdp, session, { bootTimeout: BOOT_TIMEOUT });
  const mBoot = await metrics(cdp, session);

  const perfRes = await ev(cdp, session, `(() => performance.getEntriesByType('resource').map(r => ({ n: r.name, t: r.initiatorType, d: Math.round(r.duration), e: Math.round(r.encodedBodySize || 0) })))()`);
  const inv = await ev(cdp, session, INVENTORY);
  const reqs = net.dump().slice(baseCount);       // measured-pass requests only
  const ltBoot = await ev(cdp, session, `(() => { const a = window.__lt.slice(); window.__lt.length = 0; return a; })()`);

  // (a) metrics over a scripted interaction: 60 rAF-driven scroll steps
  await ev(cdp, session, `(document.getElementById('app-content').scrollTop = 0, 1)`);
  await ev(cdp, session, `new Promise(r => requestAnimationFrame(() => setTimeout(r, 120)))`);
  const mBefore = await metrics(cdp, session);
  const frames = await ev(cdp, session, `window.__rafSample(60)`);
  await sleep(350);
  const mAfter = await metrics(cdp, session);
  const ltScroll = await ev(cdp, session, `window.__lt.slice()`);

  const d = frames.deltas.filter((n) => n > 0).sort((a, b) => a - b);
  const q = (p) => (d.length ? +d[Math.min(d.length - 1, Math.floor(p * d.length))].toFixed(2) : null);
  const sum = (a) => +a.reduce((x, y) => x + y, 0).toFixed(1);
  const frameStats = {
    samples: d.length, p50: q(0.5), p95: q(0.95), worst: d.length ? d[d.length - 1] : null,
    mean: d.length ? +(sum(d) / d.length).toFixed(2) : null,
    over16_7: d.filter((n) => n > 16.7).length, over33: d.filter((n) => n > 33).length,
    pctOver16_7: d.length ? +((100 * d.filter((n) => n > 16.7).length) / d.length).toFixed(1) : null,
    pctOver33: d.length ? +((100 * d.filter((n) => n > 33).length) / d.length).toFixed(1) : null,
    scroller: frames.scroller, step: frames.step, max: frames.max, scrolled: frames.scrolled,
  };
  const ltStats = (arr) => ({
    count: arr.length, totalMs: sum(arr.map((x) => x.dur)),
    worstMs: arr.length ? Math.max(...arr.map((x) => x.dur)) : 0,
    worstAt: arr.length ? arr.reduce((a, b) => (b.dur > a.dur ? b : a)).start : null,
    top: arr.slice().sort((a, b) => b.dur - a.dur).slice(0, 6),
  });

  // (d) compositing: nudge the compositor if it never reported, then read reasons per layer
  if (!maxLayers.length) {
    await cdp.send('LayerTree.enable', {}, session).catch(() => {});
    await ev(cdp, session, `(document.getElementById('app-content').scrollTop = 40, 1)`);
    await sleep(700);
    await ev(cdp, session, `(document.getElementById('app-content').scrollTop = 0, 1)`);
    await sleep(500);
  }
  const layerRows = [];
  for (const l of (maxLayers.length ? maxLayers : layers)) {
    let reasons = []; let ids = [];
    try {
      const r = await cdp.send('LayerTree.compositingReasons', { layerId: l.layerId }, session);
      reasons = r.compositingReasons || []; ids = r.compositingReasonIds || [];
    } catch (e) { /* layer went away */ }
    layerRows.push({ id: l.layerId, w: l.width, h: l.height, draws: !!l.drawsContent, paintCount: l.paintCount ?? null,
                     cssArea: (l.width || 0) * (l.height || 0), reasons, ids });
  }
  const area = layerRows.reduce((a, r) => a + r.cssArea, 0);
  const compositing = {
    source: layerRows.length ? 'LayerTree.layerTreeDidChange + LayerTree.compositingReasons' : 'none',
    layerCount: layerRows.length,
    drawsContent: layerRows.filter((r) => r.draws).length,
    backdropFilterLayers: layerRows.filter((r) => r.reasons.some((s) => /backdrop/i.test(s))).length,
    backdropDetails: layerRows.filter((r) => r.reasons.some((s) => /backdrop/i.test(s)))
      .map((r) => ({ id: r.id, w: r.w, h: r.h, cssPx: r.cssArea, bitmapMiB: +(r.cssArea * MOBILE.dpr ** 2 * 4 / 1048576).toFixed(2) })),
    totalLayerCssPx: area,
    totalBitmapMiBAtDpr: +(area * MOBILE.dpr ** 2 * 4 / 1048576).toFixed(1),
    largestLayer: layerRows.slice().sort((a, b) => b.cssArea - a.cssArea)[0] || null,
    reasonTally: layerRows.reduce((acc, r) => { for (const s of r.reasons) acc[s] = (acc[s] || 0) + 1; return acc; }, {}),
    layerEvents: maxLayers.length || layerRows.length,
    top: layerRows.slice().sort((a, b) => b.cssArea - a.cssArea).slice(0, 10)
      .map((r) => ({ id: r.id, w: r.w, h: r.h, bitmapMiB: +(r.cssArea * MOBILE.dpr ** 2 * 4 / 1048576).toFixed(2), reasons: r.ids.length ? r.ids : r.reasons })),
  };

  const navT = await ev(cdp, session, `(() => {
    const n = performance.getEntriesByType('navigation')[0] || {};
    return { dcl: Math.round(n.domContentLoadedEventEnd || 0), load: Math.round(n.loadEventEnd || 0),
             interactive: Math.round(n.domInteractive || 0), ttfb: Math.round(n.responseStart || 0),
             transfer: Math.round(n.transferSize || 0), paints: window.__paints, lcp: window.__lcp };
  })()`);

  const bytes = reqs.reduce((a, r) => a + (r.bytes || 0), 0);
  const byType = {};
  for (const r of reqs) { const t = r.type || 'Other'; byType[t] = byType[t] || { n: 0, bytes: 0 }; byType[t].n++; byType[t].bytes += r.bytes || 0; }
  const external = reqs.filter((r) => !r.url.startsWith(BASE));
  const hosts = [...new Set(external.map((r) => { try { return new URL(r.url).host || '(data)'; } catch (e) { return r.url; } }))];

  return {
    label: LABEL, mode: 'trace', capturedAt: new Date().toISOString(), url: BASE, port: PORT,
    host: os.hostname(), platform: `${process.platform} ${os.release()}`,
    hostLoadAvg: os.loadavg().map((n) => +n.toFixed(1)),
    viewport: { ...MOBILE, cpuThrottle: THROTTLE, headless: true, gl: SWIFT ? 'swiftshader' : 'metal', warmup: WARM, cacheDisabled: COLD, blocked: BLOCK },
    bootMs: { hydrated: boot.hydratedMs, fullscreen: boot.fullscreenMs },
    nav: {
      requests: reqs.length, resourceEntries: perfRes.length, totalBytes: bytes, byType,
      externalRequests: external.length, externalHosts: hosts,
      renderBlocking: {
        headScripts: inv.headScripts, headClassicBlocking: inv.headClassicBlocking,
        classicBlockingAnywhere: inv.classicBlockingAnywhere, stylesheets: inv.stylesheets,
        cssLinksExternal: inv.cssLinksExternal, moduleScripts: inv.moduleScripts, scriptTags: inv.scriptTags,
      },
      timing: navT,
      slowest: reqs.slice().sort((a, b) => (b.bytes || 0) - (a.bytes || 0)).slice(0, 10)
        .map((r) => ({ url: r.url.replace(BASE, '/'), bytes: r.bytes, type: r.type, failed: r.failed, status: r.status })),
    },
    metrics: { atLoad: pickM(mBoot), before: pickM(mBefore), after: pickM(mAfter), delta: deltaM(mBefore, mAfter) },
    longtasks: { boot: ltStats(ltBoot), scroll: ltStats(ltScroll) },
    frames: frameStats, compositing, inventory: inv,
  };
}

/* ---------- pixel oracle ----------
 * Delegated to deterministic.mjs so there is ONE freeze implementation and ONE surface list:
 * it stops every rAF chain and timer, pauses/seek every animation, holds the gem pose through the
 * Euler AND the quaternion AND position, writes a fixed clock, parks the live map, draws one frame,
 * and refuses to save a file unless a second screenshot 300 ms later is byte-identical.
 *
 * Before 2026-11-17 this file took its own stills with nothing frozen, so two captures of the same
 * tree differed on 12.3 % / 11.9 % of pixels and only `mobile--sheet-reward` was reproducible.
 */
async function oracle(cdp) {
  const dir = path.join(ORACLE_DIR, LABEL);
  const idx = await captureSetDet(
    { cdp, url: BASE, openTab: (c) => openTab(c) },
    { label: LABEL, dir },
  );
  return idx;
}

/* ---------- table ---------- */
function table(t) {
  const ms = (s) => `${(Number(s) * 1000).toFixed(0)} ms`;
  const rows = [
    ['boot hydrated (dock mounted)', `${t.bootMs.hydrated} ms`],
    ['boot fullscreen', `${t.bootMs.fullscreen} ms`],
    ['requests / transfer', `${t.nav.requests} / ${(t.nav.totalBytes / 1024).toFixed(0)} KiB`],
    ['render-blocking: head js / css', `${t.nav.renderBlocking.headClassicBlocking} / ${t.nav.renderBlocking.stylesheets}`],
    ['parser-blocking classic js anywhere', String(t.nav.renderBlocking.classicBlockingAnywhere)],
    ['boot TaskDuration', ms(t.metrics.atLoad.TaskDuration)],
    ['boot ScriptDuration', ms(t.metrics.atLoad.ScriptDuration)],
    ['boot Layout / RecalcStyle', `${ms(t.metrics.atLoad.LayoutDuration)} / ${ms(t.metrics.atLoad.RecalcStyleDuration)}`],
    ['scroll ΔTask / ΔScript', `${ms(t.metrics.delta.TaskDuration)} / ${ms(t.metrics.delta.ScriptDuration)}`],
    ['scroll ΔLayout / ΔRecalcStyle (count)', `${t.metrics.delta.LayoutCount} / ${t.metrics.delta.RecalcStyleCount}`],
    ['longtasks boot (n / total / worst)', `${t.longtasks.boot.count} / ${t.longtasks.boot.totalMs} / ${t.longtasks.boot.worstMs} ms`],
    ['longtasks scroll (n / total / worst)', `${t.longtasks.scroll.count} / ${t.longtasks.scroll.totalMs} / ${t.longtasks.scroll.worstMs} ms`],
    ['frame p50 / p95 / worst', `${t.frames.p50} / ${t.frames.p95} / ${t.frames.worst} ms`],
    ['frames >16.7 / >33 ms', `${t.frames.over16_7} (${t.frames.pctOver16_7}%) / ${t.frames.over33} (${t.frames.pctOver33}%)`],
    ['composited layers (backdrop ones)', `${t.compositing.layerCount} (${t.compositing.backdropFilterLayers})`],
    ['layer bitmap @dpr3', `${t.compositing.totalBitmapMiBAtDpr} MiB`],
    ['blur surfaces / DOM nodes', `${t.inventory.blurCount} / ${t.inventory.domNodes}`],
    ['dock lens nodes', String(t.inventory.dockLensNodes)],
    ['FCP / LCP', `${t.nav.timing.paints.find((p) => p[0] === 'first-contentful-paint')?.[1] ?? '?'} / ${t.nav.timing.lcp} ms`],
  ];
  const w = Math.max(...rows.map((r) => r[0].length));
  console.log('\n' + rows.map(([k, v]) => `  ${k.padEnd(w)}  ${v}`).join('\n') + '\n');
}

/* ---------- main ---------- */
(async () => {
  if (!['trace', 'oracle', 'both'].includes(MODE)) throw new Error('--mode trace|oracle|both');
  fs.mkdirSync(OUT_JSON, { recursive: true });
  const { cdp, version, close } = await launch();
  try {
    if (MODE === 'trace' || MODE === 'both') {
      const runs = [];
      for (let i = 0; i < RUNS; i++) {
        const t = await runTrace(cdp);
        t.chrome = version.Browser; t.run = i + 1; t.of = RUNS;
        runs.push(t);
        console.log(`\n=== ${LABEL}${RUNS > 1 ? ` run ${i + 1}/${RUNS}` : ''} — ${MOBILE.w}x${MOBILE.h} dpr${MOBILE.dpr} @ ${THROTTLE}x CPU${BLOCK.length ? ' — BLOCKED ' + BLOCK.join(',') : ''} ===`);
        table(t);
        await cdp.send('Target.createTarget', { url: 'about:blank' }).catch(() => {});
      }
      const out = { ...runs[runs.length - 1], runs: runs.map((r) => ({ run: r.run, bootMs: r.bootMs, metrics: r.metrics, frames: r.frames, longtasks: r.longtasks, compositing: { layerCount: r.compositing.layerCount, backdropFilterLayers: r.compositing.backdropFilterLayers }, nav: { requests: r.nav.requests, totalBytes: r.nav.totalBytes } })) };
      const file = path.join(OUT_JSON, `${LABEL}.json`);
      fs.writeFileSync(file, JSON.stringify(out, null, 2));
      console.log(`  json: ${file}`);
    }
    if (MODE === 'oracle' || MODE === 'both') {
      console.log(`\n=== oracle ${LABEL} ===`);
      const idx = await oracle(cdp);
      console.log(`  index: ${path.join(ORACLE_DIR, LABEL, 'index.json')} (${idx.surfaces.filter((s) => !s.skipped).length} captured / ${idx.surfaces.length} surfaces)`);
    }
  } finally {
    await close();
  }
})().catch((e) => { console.error('FAIL', (e && e.stack) || e); process.exit(1); });
