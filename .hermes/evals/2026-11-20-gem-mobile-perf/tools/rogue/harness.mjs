/* harness.mjs — shared CDP + gem-rig plumbing for the rogue suite.
 *
 * Import-only: nothing launches until launchChrome() is called, so the pure-JS
 * modules (score math, parity masks) can be imported by --selftest with no GPU.
 *
 * Everything that touches the rig goes through the SAME helpers the graders share,
 * so perf and parity cannot drift apart:
 *   openPage()        -> emulation (390x844 dpr3 mobile touch, CPU 6) + console capture
 *   mountCeremony()   -> gallery.html -> gems tab -> card canvas -> #gem-screen open
 *   pin()             -> park the rAF loop, force the pose, render exactly once
 *   capturePinned()   -> PIN + render + gl.readPixels IN ONE TASK (see below)
 *
 * Pin law (why both fields): the loop writes
 *   group.rotation.y = cat.spin * rig.t * 0.9
 *   group.rotation.x = rig.tilt
 *   group.position.y = sin(rig.t * 0.8) * 0.03
 * so rig.t = 0 alone still leaves position.y from the last idle frame, and the
 * idle bob MOVES GEOMETRY. Both must be zeroed or two captures differ by a
 * sub-pixel translation that shows up as edge delta in the rim mask.
 *
 * SAME-TASK LAW (this used to be the suite's worst bug): the rig's context is
 * created with preserveDrawingBuffer:false, so the drawing buffer is discarded
 * once the frame is composited. A gl.readPixels issued in a LATER Runtime.evaluate
 * task therefore reads a blank/undefined buffer. Every capture here renders and
 * reads inside one evaluate, exactly like the known-good harness2.mjs / gem-cost.mjs.
 */
import { spawn, execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { pathToFileURL, fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
export const ROOT = process.env.ROGUE_ROOT || HERE;
export const REPO = process.env.ROGUE_REPO || '/Users/irfan/Documents/Portfolio Redo/crm_proj';
const WSROOT = process.env.WS_ROOT || path.join(REPO, 'node_modules/ws/index.js');
const { default: WebSocket } = await import(pathToFileURL(WSROOT).href);
export const CHROME = process.env.CHROME_BIN || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

// This suite NEVER uses the owner's live server on :5173. Start your own:
//   npx vite --port 5410 --strictPort --host 127.0.0.1
export const BASE_URL = process.env.ROGUE_BASE_URL || 'http://127.0.0.1:5410/gallery.html';
export const VIEW = { w: 390, h: 844, dpr: 3, cpu: 6 };
export const POSE = { rotX: -0.15, rotY: 0, posY: 0 };
export const OUT = path.join(ROOT, 'out');

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
export const ensureDir = (d) => { fs.mkdirSync(d, { recursive: true }); return d; };

export class CDP {
  constructor(ws) {
    this.ws = ws; this.id = 0; this.p = new Map(); this.l = new Map();
    ws.on('message', (raw) => {
      const m = JSON.parse(raw.toString());
      if (m.id && this.p.has(m.id)) {
        const { res, rej } = this.p.get(m.id); this.p.delete(m.id);
        m.error ? rej(new Error(m.error.message)) : res(m.result);
        return;
      }
      if (m.method) {
        const ls = this.l.get(m.method);
        if (ls) for (const cb of ls) { try { cb(m.params, m.sessionId); } catch (e) {} }
      }
    });
  }
  on(method, cb) { if (!this.l.has(method)) this.l.set(method, []); this.l.get(method).push(cb); }
  send(method, params = {}, sessionId) {
    const id = ++this.id; const msg = { id, method, params };
    if (sessionId) msg.sessionId = sessionId;
    return new Promise((res, rej) => { this.p.set(id, { res, rej }); this.ws.send(JSON.stringify(msg)); });
  }
}

export async function freePort() {
  const net = await import('node:net');
  return new Promise((res) => {
    const s = net.createServer();
    s.listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => res(p)); });
  });
}

export async function launchChrome(opts = {}) {
  const { extraArgs = [], windowSize = [VIEW.w, VIEW.h], label = 'main' } = opts;
  const port = await freePort();
  // The Chrome profile must NOT live inside the served tree: Vite watches the project root, and
  // Chrome rewriting its profile (extensions, history, service workers) fires full page reloads
  // that destroy the execution context under a running measurement. It goes to the OS temp dir
  // (which points at the scratch dir here) instead.
  const profileRoot = process.env.ROGUE_CHROME_DIR || path.join(os.tmpdir(), 'rogue-chrome');
  const profile = ensureDir(path.join(profileRoot, `${label}-${process.pid}-${port}`));
  const args = [
    '--headless=new', `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`,
    '--no-first-run', '--no-default-browser-check', '--hide-scrollbars', '--mute-audio', '--no-sandbox',
    '--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist',
    `--window-size=${windowSize[0]},${windowSize[1]}`, ...extraArgs, 'about:blank',
  ];
  const chrome = spawn(CHROME, args, { stdio: 'ignore' });
  let version;
  for (let i = 0; i < 150; i++) {
    try { version = await (await fetch(`http://127.0.0.1:${port}/json/version`)).json(); break; }
    catch { await sleep(200); }
  }
  if (!version) { try { chrome.kill('SIGKILL'); } catch (e) {} throw new Error('chrome never came up on port ' + port); }
  const ws = new WebSocket(version.webSocketDebuggerUrl, { perMessageDeflate: false, maxPayload: 128 * 1024 * 1024 });
  await new Promise((res, rej) => { ws.once('open', res); ws.once('error', rej); });
  const cdp = new CDP(ws);
  const close = async () => {
    try { await cdp.send('Browser.close'); } catch (e) {}
    try { chrome.kill('SIGKILL'); } catch (e) {}
    try { ws.close(); } catch (e) {}
    await sleep(150);
    try { fs.rmSync(profile, { recursive: true, force: true, maxRetries: 3 }); } catch (e) {}
  };
  return { cdp, ws, chrome, port, profile, close };
}

/* ------------------------------------------------------- build identity ---- */

/**
 * HEAD + a digest of `git status --short` — a baseline is only comparable on the same identity.
 *
 * Paths under `.hermes/` are excluded from the digest: that tree holds eval records and this
 * very tool, so counting it would mean the identity changed every time a note was written.
 * Tracked source changes and any other untracked path still split the digest.
 */
export function buildIdentity({ repo = REPO } = {}) {
  const git = (args) => execFileSync('git', ['-C', repo, ...args], { encoding: 'utf8' }).trim();
  let head = 'unknown', status = '', err = null;
  try { head = git(['rev-parse', 'HEAD']); } catch (e) { err = String(e.message).slice(0, 120); }
  try { status = git(['status', '--short']); } catch (e) { err = err || String(e.message).slice(0, 120); }
  const all = status ? status.split('\n').map((s) => s.trim()).filter(Boolean) : [];
  const excluded = all.filter((s) => /(^|\s)\.hermes\//.test(s));
  const lines = all.filter((s) => !excluded.includes(s)).sort();
  const digest = crypto.createHash('sha256').update(lines.join('\n')).digest('hex').slice(0, 16);
  return {
    head, short: head.slice(0, 7), dirtyFiles: lines.length, digest,
    label: `${head.slice(0, 7)}${lines.length ? `+dirty:${digest}` : '-clean'}`,
    files: lines.slice(0, 12), excludedFromDigest: excluded.length, error: err,
  };
}

/**
 * Hash of the render path AS THE BROWSER LOADED IT (Vite-transformed bodies, fetched from the
 * same origin the page is on). This is the "build hash" a baseline records: git identity alone
 * cannot tell a baseline captured from a worktree apart from one captured from the main tree,
 * and this one is port-independent because only paths and bodies are hashed.
 */
export const RENDER_FILES = [
  'gallery.html',
  'src/components/GemReward/gem-shader.js',
  'src/components/GemReward/gem-shader-ext.js',
  'src/components/GemReward/gem-mesh.js',
  'src/components/GemReward/gem-mesh-entry.js',
  'src/components/GemReward/gem-bloom.js',
  'src/components/GemReward/gem-perf.js',
];

export async function renderBuildHash(page, files = RENDER_FILES) {
  let origin = null;
  try { origin = new URL(page.url || BASE_URL).origin; } catch (e) { origin = new URL(BASE_URL).origin; }
  const parts = [];
  for (const f of files) {
    const u = `${origin}/${f}`;
    try {
      const r = await fetch(u, { cache: 'no-store' });
      const body = Buffer.from(await r.arrayBuffer());
      const h = crypto.createHash('sha256').update(body).digest('hex').slice(0, 16);
      parts.push(`${f}:${r.status}:${h}`);
    } catch (e) {
      parts.push(`${f}:ERR:${String(e.message).slice(0, 40)}`);
    }
  }
  return {
    hash: crypto.createHash('sha256').update(parts.join('\n')).digest('hex').slice(0, 16),
    origin, files: parts,
  };
}

export const sameBuild = (a, b) => !!(a && b && a.head && b.head && a.head === b.head && a.digest === b.digest);

/**
 * A sibling lane editing the repo makes Vite do a full page reload, which destroys the
 * execution context under a running measurement. These errors mean "the page went away",
 * not "the renderer is broken", so they are retryable — but a retry must re-mount.
 */
export const isReloadError = (e) =>
  /GEM3D is not defined|navigated or closed|no-ceremony-rig|not defined|zero-buffer|Execution context was destroyed|Cannot find context/i
    .test(String((e && e.message) || e));

/**
 * Block until the working tree has been unchanged for `windowMs`, so perf/stress/parity
 * are not measuring three different trees. Returns the identity it settled on.
 */
export async function waitForStableBuild({ windowMs = 45000, timeoutMs = 300000, pollMs = 5000 } = {}) {
  const t0 = Date.now();
  let last = buildIdentity(), lastChange = Date.now(), samples = 0;
  while (Date.now() - t0 < timeoutMs) {
    await sleep(pollMs);
    samples++;
    const now = buildIdentity();
    if (!sameBuild(last, now)) { last = now; lastChange = Date.now(); continue; }
    if (Date.now() - lastChange >= windowMs) {
      return { identity: now, samples, waitedMs: Date.now() - t0, stable: true };
    }
  }
  return { identity: buildIdentity(), samples, waitedMs: Date.now() - t0, stable: false };
}

/* ---------------------------------------------------------- error allow --- */

/** Strip volatile bits (digits, ids, timing) from an error so the same source line matches. */
export function errorSignature(err) {
  const kind = String(err.kind || 'err').split('.')[0];
  const text = String(err.text || '');
  const first = (text.split('\n')[0] || 'exception').trim();
  const msg = first.replace(/\d+(\.\d+)?/g, '#').replace(/\s+/g, ' ').slice(0, 160);
  // first frame that names a .js file, with the origin stripped so localhost ports don't matter
  const m = text.match(/([^\s()]+?\.js):(\d+):(\d+)/);
  let where = '?:?';
  if (m) where = `${m[1].replace(/^https?:\/\/[^/]+/, '').replace(/\?.*$/, '')}:${m[2]}`;
  return `${kind}|${msg}|${where}`;
}

export function signatureCounts(errors) {
  const m = new Map();
  for (const e of errors) {
    const s = errorSignature(e);
    m.set(s, (m.get(s) || 0) + 1);
  }
  return m;
}

/**
 * Build an allowlist from a CONTROL LOAD of the same page.
 * A case may only fail on a signature that the control did NOT produce.
 */
export function makeAllowlist(controlErrors) {
  const m = signatureCounts(controlErrors);
  return {
    signatures: [...m.entries()].map(([sig, count]) => ({ sig, count })),
    has: (sig) => m.has(sig),
    size: m.size,
  };
}

export function consoleVerdict(page, allowlist) {
  const counts = signatureCounts(page.errors);
  const offending = [], allowlisted = [];
  for (const [sig, count] of counts) {
    if (allowlist && allowlist.has(sig)) allowlisted.push({ sig, count });
    else offending.push({ sig, count });
  }
  return {
    ok: offending.length === 0,
    offending,
    allowlisted,
    totalErrors: page.errors.length,
  };
}

/* ------------------------------------------------------------- visibility -- */

/**
 * Make the page *look* hidden without freezing the renderer.
 *
 * Page.setWebLifecycleState('frozen') permanently stops rAF in headless Chrome —
 * the old case (c) used it and then measured a permanently dead page. We try the
 * Emulation visibility override first (if this Chrome has one) and otherwise
 * shadow document.hidden / document.visibilityState with own properties and fire
 * visibilitychange ourselves. Neither touches the compositor's frame clock.
 */
const VIS_CANDIDATES = ['Emulation.setPageVisibilityOverride', 'Emulation.setPageVisibilityState'];

/** Which visibility command this Chrome actually accepts (probed once, reported). */
export async function probeVisibilityMethod(page) {
  for (const m of VIS_CANDIDATES) {
    try {
      await page.cdp.send(m, m === 'Emulation.setPageVisibilityOverride' ? { visibility: 'visible' } : { visibilityState: 'visible' }, page.S);
      return m;
    } catch (e) {}
  }
  return 'own-property';
}

export async function setVisibility(page, hidden, method = null) {
  const want = hidden ? 'hidden' : 'visible';
  const cands = method ? [method] : VIS_CANDIDATES;
  for (const m of cands) {
    try {
      await page.cdp.send(m, m === 'Emulation.setPageVisibilityOverride' ? { visibility: want } : { visibilityState: want }, page.S);
      return { method: m, hidden };
    } catch (e) { /* fall through */ }
  }
  const r = await page.ev(`(()=>{const D=document;
    if(!window.__rogueVis){window.__rogueVis={h:Object.getOwnPropertyDescriptor(D,'hidden'),v:Object.getOwnPropertyDescriptor(D,'visibilityState')};}
    Object.defineProperty(D,'hidden',{configurable:true,get:()=>${hidden}});
    Object.defineProperty(D,'visibilityState',{configurable:true,get:()=>'${want}'});
    D.dispatchEvent(new Event('visibilitychange'));
    return [document.hidden,document.visibilityState];})()`);
  return { method: 'own-property', hidden: r[0], state: r[1] };
}

export async function restoreVisibility(page) {
  for (const m of VIS_CANDIDATES) { try { await page.cdp.send(m, m === 'Emulation.setPageVisibilityOverride' ? { visibility: 'visible' } : { visibilityState: 'visible' }, page.S); } catch (e) {} }
  await page.ev(`(()=>{const D=document;
    try{delete D.hidden;delete D.visibilityState;}catch(e){}
    D.dispatchEvent(new Event('visibilitychange'));
    return [document.hidden,document.visibilityState];})()`);
}

/* ---------------------------------------------------------------- page ---- */

export async function openPage(browser, opts = {}) {
  const { view = VIEW, reducedMotion = false, touch = true, enableLog = true } = opts;
  const { cdp } = browser;
  const { targetId } = await cdp.send('Target.createTarget', { url: 'about:blank' });
  const { sessionId: S } = await cdp.send('Target.attachToTarget', { targetId, flatten: true });
  await cdp.send('Page.enable', {}, S);
  await cdp.send('Runtime.enable', {}, S);
  if (enableLog) await cdp.send('Log.enable', {}, S);
  await cdp.send('Network.enable', {}, S);
  await cdp.send('Emulation.setDeviceMetricsOverride', {
    width: view.w, height: view.h, deviceScaleFactor: view.dpr, mobile: true,
    screenWidth: view.w, screenHeight: view.h,
  }, S);
  if (touch) await cdp.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 }, S);
  if (view.cpu) await cdp.send('Emulation.setCPUThrottlingRate', { rate: view.cpu }, S);
  if (reducedMotion) {
    await cdp.send('Emulation.setEmulatedMedia', {
      features: [{ name: 'prefers-reduced-motion', value: 'reduce' }],
    }, S);
  }
  return makePage(cdp, S, targetId);
}

function makePage(cdp, S, targetId) {
  const page = {
    cdp, S, targetId,
    errors: [],       // javascript errors only (console.error / exception / log level=error)
    consoleAll: [],   // everything, for context in failure reports
    url: '',
  };

  cdp.on('Runtime.consoleAPICalled', (p, sid) => {
    if (sid !== S) return;
    const text = (p.args || []).map((a) => (a.value !== undefined ? String(a.value) : a.description || a.type)).join(' ');
    page.consoleAll.push({ kind: 'console.' + p.type, text });
    if (p.type === 'error') page.errors.push({ kind: 'console.error', text });
  });
  cdp.on('Runtime.exceptionThrown', (p, sid) => {
    if (sid !== S) return;
    const d = p.exceptionDetails || {};
    const text = (d.exception && (d.exception.description || d.exception.value)) || d.text || 'exception';
    page.errors.push({ kind: 'exception', text: String(text).slice(0, 600) });
    page.consoleAll.push({ kind: 'exception', text: String(text).slice(0, 600) });
  });
  cdp.on('Log.entryAdded', (p, sid) => {
    if (sid !== S) return;
    const e = p.entry || {};
    page.consoleAll.push({ kind: 'log.' + e.level, text: `${e.source}: ${e.text}`.slice(0, 600) });
    if (e.level === 'error' && e.source === 'javascript') page.errors.push({ kind: 'log.error', text: String(e.text).slice(0, 600) });
  });
  // Network failures (the favicon 404 in particular) are NOT javascript errors, but they are
  // real page-level errors. They are recorded so the control load can allowlist them by name,
  // and so their counts are visible instead of silently invisible.
  cdp.on('Network.responseReceived', (p, sid) => {
    if (sid !== S) return;
    const r = p.response || {};
    if (r.status >= 400) page.errors.push({ kind: 'http.' + r.status, text: `${r.status} ${String(r.url || '').replace(/^https?:\/\/[^/]+/, '')}` });
  });
  cdp.on('Inspector.targetCrashed', (p, sid) => {
    if (sid !== S) return;
    page.errors.push({ kind: 'crash', text: 'target crashed' });
  });

  page.ev = async (expr) => {
    const r = await cdp.send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true }, S);
    if (r.exceptionDetails) {
      throw new Error('EVAL: ' + ((r.exceptionDetails.exception && r.exceptionDetails.exception.description) || r.exceptionDetails.text));
    }
    return r.result.value;
  };

  page.seed = async (source) => cdp.send('Page.addScriptToEvaluateOnNewDocument', { source }, S);

  page.nav = async (url, settleMs = 1200) => {
    page.url = url;
    await cdp.send('Page.navigate', { url }, S);
    await sleep(settleMs);
  };

  page.waitFor = async (expr, timeoutMs = 20000, label = expr) => {
    const t0 = Date.now();
    while (Date.now() - t0 < timeoutMs) {
      try { if (await page.ev(expr)) return true; } catch (e) {}
      await sleep(200);
    }
    throw new Error('timeout waiting for ' + label);
  };

  page.screenshot = async (name) => {
    try {
      const { data } = await cdp.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false }, S);
      const dir = ensureDir(path.join(OUT, 'failures'));
      const p = path.join(dir, `${name}.png`);
      fs.writeFileSync(p, Buffer.from(data, 'base64'));
      return p;
    } catch (e) { return null; }
  };

  page.frames = async (ms = 1200) => page.ev(`(async()=>{
    const t0=performance.now(); const gaps=[]; let last=t0;
    await new Promise(res=>{ const tick=(t)=>{ if(last>t0) gaps.push(t-last); last=t;
      if(t-t0<${ms}) requestAnimationFrame(tick); else res(1); }; requestAnimationFrame(tick); });
    gaps.sort((a,b)=>a-b);
    const n=gaps.length;
    return { n, med:n?gaps[n>>1]:0, p95:n?gaps[Math.min(n-1,Math.floor(n*0.95))]:0, worst:n?gaps[n-1]:0 };
  })()`);

  page.close = async () => { try { await cdp.send('Target.closeTarget', { targetId }); } catch (e) {} };
  return page;
}

/* ----------------------------------------------------------- rig mount ---- */

export const RIG_FIND = `GEM3D.rigs.find(r=>r.renderer&&r.canvas&&r.canvas.closest('#gem-screen'))`;
export const FLOOR_KEYS = ['shadow', 'contact', 'caustic', 'ground', 'base'];

/** Load the gallery, open the gems tab, click the card canvas, wait for the overlay rig. */
export async function mountCeremony(page, { url = BASE_URL, query = '', timeoutMs = 60000 } = {}) {
  const full = url + (query ? (query.startsWith('?') ? query : '?' + query) : '');
  await page.nav(full, 900);
  await page.waitFor(`!!(window.GEM3D && GEM3D.rigs.length)`, timeoutMs, 'GEM3D.rigs');
  // the nav handlers bind after the module graph settles; clicking before that is a no-op
  // and used to time out 60 s later at "a rig with a renderer".
  await page.waitFor(`!!document.querySelector('button[data-tab="gems"]')`, timeoutMs, 'gems tab button');
  // click, then confirm the gems panel actually opened; a click that races the nav handler is
  // a silent no-op and used to burn the full 60 s waiting for a renderer that never appears.
  const tClick = Date.now();
  let opened = false;
  while (Date.now() - tClick < 15000) {
    await page.ev(`(()=>{const b=document.querySelector('button[data-tab="gems"]');if(b)b.click();return 1})()`);
    await sleep(600);
    try {
      opened = await page.ev(`(()=>{const f=document.querySelector('.frame[data-panel="gems"]');
        return !!(f && !f.hidden);})()`);
    } catch (e) { opened = false; }
    if (opened) break;
  }
  await sleep(400);
  // The card rigs build their renderer when their canvas is near the viewport, so a panel that
  // is scrolled away from the first canvas never produces "a rig with a renderer". Scroll it in
  // and re-click, bounded, instead of burning the full timeout once.
  let haveRenderer = false;
  const tRend = Date.now();
  while (Date.now() - tRend < 25000) {
    try {
      await page.ev(`(()=>{const f=document.querySelector('.frame[data-panel="gems"]');
        if(f&&f.hidden){const b=document.querySelector('button[data-tab="gems"]');if(b)b.click();}
        const cv=document.querySelector('canvas[data-gem]');
        if(cv&&cv.scrollIntoView)cv.scrollIntoView({block:'center'});
        return 1})()`);
    } catch (e) {}
    await sleep(800);
    try { haveRenderer = await page.ev(`GEM3D.rigs.some(r=>r.renderer)`); } catch (e) { haveRenderer = false; }
    if (haveRenderer) break;
  }
  if (!haveRenderer) throw new Error('timeout waiting for a rig with a renderer');
  await page.ev(`(()=>{const cv=document.querySelector('canvas[data-gem][data-overlay-target="gem-screen"]');if(cv)cv.click();return 1})()`);
  await page.waitFor(`(()=>{const g=document.getElementById('gem-screen');
    return !!(g&&!g.hidden&&g.classList.contains('overlay--open')&&${RIG_FIND});})()`, timeoutMs, '#gem-screen ceremony rig');
  await sleep(500);
  return full;
}

const PIN_BODY = `
  const rig = ${RIG_FIND};
  if(!rig) throw new Error('no-ceremony-rig');
  if(rig.raf) cancelAnimationFrame(rig.raf);
  rig.raf=0; rig.vis=false;
  rig.t=0; rig.tilt=0; rig.tiltT=0;
  rig.group.rotation.set(${POSE.rotX},${POSE.rotY},0);
  rig.group.position.y=${POSE.posY};
  rig.group.updateMatrixWorld(true);`;

/** Park the loop, force the pinned pose, render once. Returns the rig's real buffer. */
export const PIN_EXPR = `(()=>{${PIN_BODY}
  rig.renderer.render(rig.scene, rig.camera);
  return { buf:[rig.renderer.domElement.width, rig.renderer.domElement.height],
    css:[Math.round(rig.w),Math.round(rig.h)], ratio:rig.renderer.getPixelRatio(),
    bloom:!!(window.GEM_BLOOM&&GEM_BLOOM.on&&GEM_BLOOM.on()),
    tune:(window.GEM_PERF_TUNE&&GEM_PERF_TUNE.value)?GEM_PERF_TUNE.value():null };
})()`;

export async function pin(page) { return page.ev(PIN_EXPR); }

/** Re-park after any resize/pixelRatio change: GEM_RIG.size() re-arms the loop. */
export async function parkAndPin(page) { return page.ev(PIN_EXPR); }

/** Seed the fixed tune so perf and parity measure the SAME build. */
export const TUNE = { taps: 3, bounce: 5, bloomOn: true, bloomIntensity: 0.32, dpr: 1 };
export async function seedTune(page, tune = TUNE) {
  const src = `try{localStorage.setItem('gemTune','${JSON.stringify(tune)}');localStorage.setItem('gemperf','1');}catch(e){}`;
  await page.seed(src);
  return src;
}

/* -------------------------------------------------------------- capture --- */

/**
 * Canonical capture geometry. The rig's canvas box is laid out at a fractional CSS size, so it
 * rounds to 339 or 340 px between loads and the drawing buffer comes out 1017 or 1020 px wide.
 * Two captures of the same build then cannot be differenced at all (size mismatch), and the
 * old suite read that as a crash. Every capture therefore forces the same 340x480 CSS box and
 * runs the app's OWN size path (GEM_RIG.size) before rendering, so the buffer is 1020x1440 at
 * dpr 3 in every arm. Recorded in the report; a baseline captured with a different box is refused.
 */
export const CAPTURE_BOX = { w: 340, h: 480 };

const CANON_BODY = `
  const _cv = rig.canvas;
  if (_cv) {
    _cv.style.width = '${CAPTURE_BOX.w}px';
    _cv.style.height = '${CAPTURE_BOX.h}px';
    if (window.GEM_RIG && GEM_RIG.size) { rig.epoch = -1000000; GEM_RIG.size(rig); }
  }`;

/**
 * One evaluate: force the canonical box, pin the pose, hide the floor pools (optional), render,
 * readPixels, and (optionally) render a floor-less, gem-less BACKGROUND so the silhouette can
 * be recovered by differencing instead of guessing from luma.
 *
 * hideFloors exists because shadow/contact/caustic repaint at timing-dependent
 * moments and jitter ~4.6 % of the frame between two identical loads — that noise
 * alone is enough to fake a parity delta.
 */
export function captureExpr({ hideFloors = true, withBg = true, stride = 1, canonical = true } = {}) {
  return `(()=>{${PIN_BODY}
  ${canonical ? CANON_BODY : ''}
  const renderer=rig.renderer, gl=renderer.getContext(), el=renderer.domElement;
  const W=el.width, H=el.height;
  if(!W||!H) throw new Error('zero-buffer');
  const S=${stride};
  const w=Math.max(1,Math.floor(W/S)), h=Math.max(1,Math.floor(H/S));
  const buf=(b64)=>{
    const raw=new Uint8Array(W*H*4);
    gl.readPixels(0,0,W,H,gl.RGBA,gl.UNSIGNED_BYTE,raw);
    const glErr=gl.getError();
    let out=raw;
    if(S!==1){ out=new Uint8Array(w*h*4);
      for(let y=0;y<h;y++){ const sy=Math.min(H-1,y*S);
        for(let x=0;x<w;x++){ const sx=Math.min(W-1,x*S);
          const di=(y*w+x)*4, si=(sy*W+sx)*4;
          out[di]=raw[si];out[di+1]=raw[si+1];out[di+2]=raw[si+2];out[di+3]=raw[si+3]; } } }
    let s=''; const CH=0x8000;
    for(let i=0;i<out.length;i+=CH) s+=String.fromCharCode.apply(null,out.subarray(i,Math.min(i+CH,out.length)));
    return { b64:btoa(s), glErr };
  };
  const fl=rig.floors||{}, saved={}, hidden=[];
  ${hideFloors ? `for(const k of ${JSON.stringify(FLOOR_KEYS)}){ const o=fl[k];
    if(o&&'visible' in o){ saved[k]=o.visible; if(o.visible){o.visible=false; hidden.push(k);} } }` : ''}
  try {
    renderer.render(rig.scene, rig.camera);
    const fg=buf();
    let bg=null;
    ${withBg ? `if(rig.group){ rig.group.visible=false; renderer.render(rig.scene,rig.camera);
      bg=buf(); rig.group.visible=true; }` : ''}
    renderer.render(rig.scene, rig.camera);   // leave the live canvas showing the pinned still
    return { W,H,w,h,stride:S, glErr:fg.glErr, fg:fg.b64, bg:bg?bg.b64:null,
      hiddenFloors:hidden, floorsPresent:Object.keys(fl),
      mesh:(window.GEM_MESH&&GEM_MESH.stats)?GEM_MESH.stats().mode:null,
      cand:window.GEM_CAND&&GEM_CAND.stats?GEM_CAND.stats():null,
      bloom:!!(window.GEM_BLOOM&&GEM_BLOOM.on&&GEM_BLOOM.on()),
      ratio:+renderer.getPixelRatio().toFixed(3),
      css:[Math.round(rig.w),Math.round(rig.h)] };
  } finally {
    for(const k in saved){ try{ fl[k].visible=saved[k]; }catch(e){} }
  }
})()`;
}

export function unpack(b64, w, h) {
  const data = Buffer.from(b64, 'base64');
  if (data.length !== w * h * 4) throw new Error(`pixel length mismatch ${data.length} != ${w * h * 4}`);
  return data;
}

/** Same-task render+read of the raw drawing buffer, at the canonical capture box. */
export async function capturePinned(page, opts = {}) {
  const r = await page.ev(captureExpr(opts));
  return {
    fg: { data: unpack(r.fg, r.w, r.h), w: r.w, h: r.h },
    bg: r.bg ? { data: unpack(r.bg, r.w, r.h), w: r.w, h: r.h } : null,
    srcW: r.W, srcH: r.H, stride: r.stride, glErr: r.glErr,
    hiddenFloors: r.hiddenFloors, floorsPresent: r.floorsPresent,
    mesh: r.mesh, cand: r.cand, bloom: r.bloom, ratio: r.ratio, css: r.css,
    canonicalBox: opts.canonical === false ? null : CAPTURE_BOX,
  };
}

/** Back-compat shim: what the smoke test wants (buffer + size), always same-task. */
export async function captureRaw(page, opts = {}) {
  const c = await capturePinned(page, { hideFloors: false, withBg: false, stride: opts.stride || 1 });
  return { data: c.fg.data, w: c.fg.w, h: c.fg.h, srcW: c.srcW, srcH: c.srcH, stride: c.stride, glErr: c.glErr };
}

/** Canvas PNG for evidence — rendered in the SAME task so the buffer is not blank. */
export async function captureCanvasPng(page) {
  return page.ev(`(()=>{const rig=${RIG_FIND}; if(!rig) return null;
    try { rig.renderer.render(rig.scene,rig.camera); return rig.renderer.domElement.toDataURL('image/png'); } catch(e){ return null; }})()`);
}

export function writeJSON(name, obj) {
  ensureDir(OUT);
  const p = path.join(OUT, name);
  fs.writeFileSync(p, JSON.stringify(obj, null, 2) + '\n');
  return p;
}
export function readJSON(name) {
  const p = path.isAbsolute(name) ? name : path.join(OUT, name);
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

/** seeded PRNG so a "randomized" run can be replayed from its seed */
export function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
