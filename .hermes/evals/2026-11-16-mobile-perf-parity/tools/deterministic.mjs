#!/usr/bin/env node
/* deterministic.mjs — the freeze + pixel plumbing behind gate.mjs and trace.mjs --mode oracle.
 *
 * The app animates on a wall clock: gem spin/float (gem3d.js), the coverage-radius breath
 * (live-map-breath.js), the status-bar clock (status-bar.js), CSS keyframes and Leaflet's tile
 * fade. A still taken without freezing all of that photographs a different frame every launch,
 * which is why the old harness could never gate (12.3 % / 11.9 % pixel drift on the same tree).
 *
 * freezePage() therefore, in this order:
 *   1. stops every requestAnimationFrame chain (rAF is wrapped at document start, so every id the
 *      app ever asked for is on record) and every timer queue;
 *   2. kills transitions and seeks every running CSS animation to a fixed phase;
 *   3. holds the gem pose through the Euler accessors AND the quaternion AND position — matrixWorld
 *      composes position+quaternion and three's Matrix4.compose reads quaternion._x.._w directly,
 *      so shadowing the Euler alone leaves the last live yaw in the matrix;
 *   4. writes a fixed status-bar clock and battery, and pauses the live map (tile fade off,
 *      ring phase 0) ;
 *   5. draws exactly one frame from the held pose.
 * shoot() then proves the freeze: it screenshots, waits 300 ms, screenshots again, and requires the
 * two to be byte-identical before the first one is accepted.
 */
import { spawn, execFile } from 'node:child_process';
import fs from 'node:fs';
import http from 'node:http';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import zlib from 'node:zlib';
import WebSocket from 'ws';

export const CHROME = process.env.CHROME_BIN || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export const DESKTOP = { w: 1440, h: 900, dpr: 1, mobile: false };
export const MOBILE = { w: 393, h: 852, dpr: 3, mobile: true };

/* ---------- CDP ---------- */
export class CDP {
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
      setTimeout(() => { if (this.pending.has(id)) { this.pending.delete(id); rej(new Error('timeout: ' + method)); } }, 180000);
    });
  }
}
function httpJson(url) {
  return new Promise((res, rej) => {
    http.get(url, (r) => { let d = ''; r.on('data', (c) => (d += c)); r.on('end', () => { try { res(JSON.parse(d)); } catch (e) { rej(e); } }); }).on('error', rej);
  });
}
export function freePort() {
  return new Promise((res, rej) => {
    const s = net.createServer(); s.listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => res(p)); }); s.on('error', rej);
  });
}
export async function waitFor(fn, ms, every = 120) {
  const t0 = Date.now();
  for (;;) {
    try { const v = await fn(); if (v) return v; } catch (e) { /* keep polling */ }
    if (Date.now() - t0 > ms) return null;
    await sleep(every);
  }
}
export async function ev(cdp, session, expression, timeout = 180000) {
  const r = await cdp.send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true, timeout }, session);
  if (r.exceptionDetails) throw new Error('eval failed: ' + (r.exceptionDetails.exception?.description || r.exceptionDetails.text));
  return r.result.value;
}

/* ---------- browser: ONE launch, used serially ---------- */
export async function launch({ swift = false, extraFlags = [] } = {}) {
  const debugPort = await freePort();
  /* CHROME_EXTRA_FLAGS lets a diagnostic run add flags without editing this file (see the report:
     it is how --num-raster-threads / --disable-gpu-compositing were A/B'd). */
  extraFlags = extraFlags.concat((process.env.CHROME_EXTRA_FLAGS || '').split(/\s+/).filter(Boolean));
  const profile = path.join(os.tmpdir(), 'perf-mobile-' + process.pid + '-' + debugPort);
  fs.mkdirSync(profile, { recursive: true });
  const flags = [
    '--headless=new', `--remote-debugging-port=${debugPort}`, `--user-data-dir=${profile}`,
    '--no-first-run', '--no-default-browser-check', '--disable-extensions',
    '--disable-background-timer-throttling', '--disable-renderer-backgrounding',
    '--disable-backgrounding-occluded-windows', '--disable-ipc-flooding-protection',
    '--hide-scrollbars', '--mute-audio', '--no-sandbox', '--force-color-profile=srgb',
    /* Determinism, measured: with GPU raster on, the compositor re-rasters its tiles between two
       screenshots of the SAME frozen frame and the dithered gradients under the dock's blurred
       composite move by exactly 1/255 on ~17 000 pixels (two of them by 2/255). Software raster
       plus GPU compositing removes it — 6/6 consecutive shots byte-identical at dpr 3 — while
       leaving the WebGL path and every composited effect (backdrop-filter, blur) on the GPU. */
    '--disable-gpu-rasterization',
    ...(swift ? ['--enable-unsafe-swiftshader', '--use-angle=swiftshader'] : ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist']),
    ...extraFlags, '--window-size=1440,900', 'about:blank',
  ];
  const chrome = spawn(CHROME, flags, { stdio: ['ignore', 'pipe', 'pipe'] });
  let log = '';
  chrome.stderr.on('data', (d) => { log += d.toString(); if (log.length > 20000) log = log.slice(-20000); });
  const version = await waitFor(() => httpJson(`http://127.0.0.1:${debugPort}/json/version`), 30000, 200);
  if (!version) { chrome.kill('SIGKILL'); throw new Error('chrome never came up:\n' + log); }
  const ws = new WebSocket(version.webSocketDebuggerUrl, { perMessageDeflate: false, maxPayload: 256 * 1024 * 1024 });
  await new Promise((res, rej) => { ws.once('open', res); ws.once('error', rej); });
  const cdp = new CDP(ws);
  const close = async () => {
    cdp.send('Browser.close').catch(() => {});
    try { ws.close(); } catch (e) {}
    chrome.kill('SIGKILL');
    await sleep(600);
    /* SIGKILL on the browser process can leave renderer/GPU helpers holding the profile, and a
       survivor then keeps the profile dir undeletable — measured: 16 leaked helpers after a batch of
       probe runs, which also made teardown hang and skewed later timings. Reap by profile path. */
    try { execFile('pkill', ['-9', '-f', 'user-data-dir=' + profile], () => {}); } catch (e) {}
    await sleep(150);
    try { fs.rmSync(profile, { recursive: true, force: true, maxRetries: 2, retryDelay: 100 }); } catch (e) {}
  };
  return { cdp, version, flags, close };
}

export async function openTab(cdp, { prelude = '' } = {}) {
  const { targetId } = await cdp.send('Target.createTarget', { url: 'about:blank' });
  const { sessionId } = await cdp.send('Target.attachToTarget', { targetId, flatten: true });
  await cdp.send('Page.enable', {}, sessionId);
  await cdp.send('Runtime.enable', {}, sessionId);
  await cdp.send('Network.enable', {}, sessionId);
  /* the app registers a service worker for installability; on a fresh profile it can activate and
     reload the tab mid-capture ("Inspected target navigated or closed"). It paints nothing, so it is
     blocked for every oracle tab. */
  await cdp.send('Network.setBlockedURLs', { urls: ['*/sw.js*', '*/sw.js'] }, sessionId).catch(() => {});
  await cdp.send('Target.activateTarget', { targetId });
  await cdp.send('Page.setWebLifecycleState', { state: 'active' }, sessionId);
  /* the clock registry is not optional: without it the freeze cannot cancel a single rAF */
  await cdp.send('Page.addScriptToEvaluateOnNewDocument', { source: FREEZE_PRELUDE + (prelude || '') }, sessionId);
  return { targetId, session: sessionId };
}

/* ---------- step 0: the clock registry, installed before any app script runs ---------- */
export const FREEZE_PRELUDE = `
(() => {
  const N = {
    raf: window.requestAnimationFrame.bind(window), caf: window.cancelAnimationFrame.bind(window),
    st: window.setTimeout.bind(window), ct: window.clearTimeout.bind(window),
    si: window.setInterval.bind(window), ci: window.clearInterval.bind(window),
  };
  const S = { raf: new Set(), to: new Set(), iv: new Set(), killed: false, timersKilled: false, count: 0 };
  window.__nf = { S: S, realRaf: (cb) => N.raf(cb), nativeCancel: (id) => N.caf(id) };
  window.requestAnimationFrame = function (cb) {
    if (S.killed) return 0;
    const id = N.raf(function (t) { S.raf.delete(id); cb(t); });
    S.raf.add(id); S.count++; return id;
  };
  window.cancelAnimationFrame = function (id) { S.raf.delete(id); return N.caf(id); };
  window.setTimeout = function (fn, ms) {
    if (S.timersKilled) return 0;
    const extra = Array.prototype.slice.call(arguments, 2);
    const id = N.st(function () { S.to.delete(id); if (typeof fn === 'function') fn.apply(null, extra); }, ms);
    S.to.add(id); S.count++; return id;
  };
  window.clearTimeout = function (id) { S.to.delete(id); return N.ct(id); };
  window.setInterval = function (fn, ms) {
    if (S.timersKilled) return 0;
    const extra = Array.prototype.slice.call(arguments, 2);
    const id = N.si(function () { if (typeof fn === 'function') fn.apply(null, extra); }, ms);
    S.iv.add(id); S.count++; return id;
  };
  window.clearInterval = function (id) { S.iv.delete(id); return N.ci(id); };
  window.__stopClocks = function () {
    S.killed = true; S.timersKilled = true;
    S.raf.forEach((id) => N.caf(id)); S.raf.clear();
    S.iv.forEach((id) => N.ci(id)); S.iv.clear();
    S.to.forEach((id) => N.ct(id)); S.to.clear();
  };
  window.__restartClocks = function () { S.killed = false; S.timersKilled = false; };
})();
`;

/* ---------- readiness: only the network-bound stuff has to settle before the freeze ---------- */
export const WAIT_SRC = `(() => {
  const imgs = Array.prototype.slice.call(document.images);
  const pend = imgs.filter((i) => !i.complete || !i.naturalWidth);
  const tiles = Array.prototype.slice.call(document.querySelectorAll('.leaflet-tile'));
  const tilesPend = tiles.filter((t) => !(t.complete && t.naturalWidth));
  /* Leaflet positions its panes with rAF/timers. Freezing mid-flight leaves the tiles parked
     outside the viewport — that is exactly how one capture came back with a blank map and no
     markers. So readiness includes "the map has finished its initial travel". */
  const map = document.getElementById('nearby-tiles');
  const mapTiles = map ? Array.prototype.slice.call(map.querySelectorAll('.leaflet-tile')) : [];
  const mapLoaded = mapTiles.filter((t) => t.classList.contains('leaflet-tile-loaded')).length;
  const mapBusy = document.querySelectorAll('.leaflet-zoom-anim, .leaflet-pan-anim').length;
  const mapMarkers = map ? map.querySelectorAll('.leaflet-marker-icon').length : 0;
  const mapHot = !!(map && map.querySelector('.opps__hotspot'));
  const rigs = ['GEM3D', 'DECK3D', 'ILLUSION3D', 'CUBE3D'].reduce((n, k) => n + (((window[k] && window[k].rigs) || []).length), 0);
  const gems = Array.prototype.slice.call(document.querySelectorAll('canvas[data-gem]')).map((c) => ({
    gem: c.dataset.gem, done: c.dataset.gemDone === '1', w: c.width, h: c.height,
  }));
  const sheet = document.getElementById('reward-sheet');
  const maps = document.querySelectorAll('.leaflet-container').length;
  return {
    readyState: document.readyState,
    fonts: document.fonts ? document.fonts.status : 'n/a',
    imgs: imgs.length, imgPending: pend.length, imgPendingSrc: pend.slice(0, 4).map((i) => i.src),
    tiles: tiles.length, tilesPending: tilesPend.length,
    map: { tiles: mapTiles.length, loaded: mapLoaded, busy: mapBusy, markers: mapMarkers, hotspot: mapHot },
    rigs, gems, maps,
    sheet: sheet ? (sheet.hidden ? 'hidden' : 'open') : 'none',
    frames: window.__nf ? window.__nf.S.count : -1,
  };
})()`;

export async function waitSettled(cdp, session, { timeout = 45000, needSheet = false } = {}) {
  const t0 = Date.now();
  let last = null;
  for (;;) {
    last = await ev(cdp, session, WAIT_SRC);
    const gemsOk = last.gems.length === 0 || last.gems.every((g) => g.done && g.w > 1 && g.h > 1);
    const m = last.map;
    const mapOk = !m || m.tiles === 0
      ? last.maps === 0 || (last.tiles > 0 && last.tilesPending === 0)
      : (m.tiles > 0 && m.loaded === m.tiles && m.busy === 0 && m.markers >= 4 && m.hotspot);
    const sheetOk = !needSheet || last.sheet === 'open';
    const ok = last.readyState === 'complete' && last.fonts === 'loaded' && last.imgPending === 0
      && last.tilesPending === 0 && gemsOk && mapOk && sheetOk;
    if (ok) return { ok: true, waitedMs: Date.now() - t0, ...last };
    if (Date.now() - t0 > timeout) return { ok: false, waitedMs: Date.now() - t0, ...last };
    await sleep(120);
  }
}

/* ---------- force a fresh layout read (run BEFORE readiness, so its tiles are awaited) ----------
 * The workspace re-fits its zoom on a resize, and Leaflet re-measures its container only on a window
 * resize — the app's own ResizeObserver on the map re-applies the bearing, not the size. A map
 * created before the final layout keeps a stale internal size and draws a different tile set in
 * every launch (measured: 17 % pixel drift across the map widget). */
export const LAYOUT_SRC = `(async () => {
  const wait = function (ms) { return new Promise(function (r) { try { window.setTimeout(r, ms); } catch (e) { r(); } }); };
  const frames = function () {
    return new Promise(function (res) {
      try { window.__nf.realRaf(function () { window.__nf.realRaf(function () { res(); }); }); } catch (e) { res(); }
    });
  };
  /* one signature for everything that moves while Leaflet re-measures: tile count, how many have
     painted, the pane translation and the first tile's translation */
  const sig = function () {
    const m = document.getElementById('nearby-tiles');
    if (!m) return 'none';
    const pane = m.querySelector('.leaflet-map-pane');
    const t = Array.prototype.slice.call(m.querySelectorAll('.leaflet-tile'));
    return [t.length, t.filter(function (x) { return x.classList.contains('leaflet-tile-loaded'); }).length,
      pane ? getComputedStyle(pane).transform : '', t[0] ? getComputedStyle(t[0]).transform : '',
      m.querySelectorAll('.leaflet-marker-icon').length,
      document.querySelectorAll('.leaflet-zoom-anim, .leaflet-pan-anim').length].join('|');
  };
  const converge = async function (max) {
    let prev = null, same = 0, out = 'none';
    for (let i = 0; i < max; i++) {
      out = sig();
      same = out === prev ? same + 1 : 0;
      prev = out;
      if (same >= 3) return { sig: out, stable: true, polls: i };
      await wait(120);
    }
    return { sig: out, stable: false, polls: max };
  };
  /* A — the map must be FINISHED initialising before we ask it to re-measure. A resize that lands
     mid-init leaves a mixed state (pane 0,0 with a half-set tile origin) that is itself stable, so
     polling cannot tell it apart from the good one. */
  const boot = await converge(30);
  /* B — force the re-measure: the workspace re-fits its zoom and Leaflet re-reads its container. */
  window.dispatchEvent(new Event('resize'));
  await frames();
  await wait(260);
  await frames();
  /* C — the post-resize state is a fixed point, so waiting for it is what makes two launches agree */
  const after = await converge(40);
  const m = document.getElementById('nearby-tiles');
  const res = { boot: boot.sig, bootStable: boot.stable, sig: after.sig, stable: after.stable && boot.stable, map: null, tiles: 0, loaded: 0, paneTf: null };
  if (m) {
    const r = m.getBoundingClientRect();
    const pane = m.querySelector('.leaflet-map-pane');
    const t = Array.prototype.slice.call(m.querySelectorAll('.leaflet-tile'));
    res.map = [Math.round(r.width), Math.round(r.height)];
    res.tiles = t.length;
    res.loaded = t.filter(function (x) { return x.classList.contains('leaflet-tile-loaded'); }).length;
    res.paneTf = pane ? getComputedStyle(pane).transform : null;
  }
  return res;
})()`;

export async function forceLayout(cdp, session) {
  return ev(cdp, session, LAYOUT_SRC);
}

/* ---------- the freeze ---------- */
export const FREEZE_SRC = `(async () => {
  const R = {
    rafQueued: 0, timersSeen: 0, anims: 0, transitions: 0, rigs: 0, poses: 0, renders: 0,
    tiles: 0, tilesPending: 0, maps: 0, clock: '', battery: '', setSizeNeutered: 0, canvasCleared: 0,
  };
  const YAW = 0.6, CLOCK = '9:41';
  const lock = function (o, k, v) {
    Object.defineProperty(o, k, { configurable: true, enumerable: true, get: function () { return v; }, set: function () {} });
  };
  const rigs = [];
  ['GEM3D', 'DECK3D', 'ILLUSION3D', 'CUBE3D'].forEach(function (k) {
    const g = window[k];
    if (g && g.rigs && g.rigs.length) {
      for (let i = 0; i < g.rigs.length; i++) if (rigs.indexOf(g.rigs[i]) < 0) rigs.push(g.rigs[i]);
    }
  });
  R.rigs = rigs.length;

  /* 0 — let the pending frame work finish before the clocks stop (the workspace re-fits its zoom
     through a rAF; freezing first races it and two launches capture two different scales). */
  await new Promise(function (res) {
    try { window.__nf.realRaf(function () { window.__nf.realRaf(function () { res(); }); }); } catch (e) { res(); }
  });

  /* 1 — every rAF chain and timer queue stops here */
  R.rafQueued = window.__nf.S.raf.size;
  R.timersSeen = window.__nf.S.count;
  window.__stopClocks();
  for (let i = 0; i < rigs.length; i++) {
    const r = rigs[i];
    if (r.raf) { try { window.__nf.nativeCancel(r.raf); } catch (e) {} r.raf = 0; }
    r.last = 0; r.t = 0; r.tilt = 0; r.tiltT = 0;
    if (r.cat) r.cat.spin = 1;
    /* a captureBeyondViewport shot grows the layout viewport by a few px; the resize observer then
       calls renderer.setSize(), which CLEARS the drawing buffer. Freeze the size so the one frame we
       drew survives every shot. */
    if (r.renderer && r.renderer.setSize) { r.renderer.__frozenSetSize = r.renderer.setSize; r.renderer.setSize = function () { return this; }; R.setSizeNeutered++; }
  }

  /* 2 — no transition may start; every running animation is paused */
  const css = document.createElement('style');
  css.id = '__freeze_css';
  css.textContent = '*,*::before,*::after{transition-property:none!important;transition-duration:0s!important;transition-delay:0s!important;animation-play-state:paused!important;caret-color:transparent!important}';
  document.head.appendChild(css);

  /* 3 — seek each animation to a fixed phase: paused alone freezes a launch-dependent phase */
  const anims = document.getAnimations ? document.getAnimations() : [];
  for (let i = 0; i < anims.length; i++) {
    const a = anims[i];
    try {
      const timing = a.effect && a.effect.getTiming ? a.effect.getTiming() : {};
      const name = (a.constructor && a.constructor.name) || '';
      const delay = typeof timing.delay === 'number' ? timing.delay : 0;
      const dur = typeof timing.duration === 'number' ? timing.duration : 0;
      if (/Transition/.test(name)) { a.finish(); R.transitions++; }
      else {
        a.pause();
        a.currentTime = delay + (dur > 0 ? Math.min(500, dur * 0.999) : 500);
        R.anims++;
      }
    } catch (e) { try { a.cancel(); } catch (e2) {} }
  }

  /* 4 — hold the gem pose: Euler AND quaternion AND position, then flush the compose */
  for (let i = 0; i < rigs.length; i++) {
    const r = rigs[i];
    const g = r.group || r.stage || null;
    if (!g || !g.rotation) continue;
    const THREE = window.THREE;
    const px = g.position ? g.position.x : 0;
    const pz = g.position ? g.position.z : 0;
    g.rotation._x = 0; g.rotation._y = YAW; g.rotation._z = 0;
    g.rotation.x = 0; g.rotation.y = YAW; g.rotation.z = 0;
    if (g.position) { g.position.x = px; g.position.y = 0; g.position.z = pz; }
    /* the composed orientation is what matrixWorld actually uses — refresh it from the held pose */
    if (g.quaternion && THREE && THREE.Euler) g.quaternion.setFromEuler(new THREE.Euler(0, YAW, 0, g.rotation.order || 'XYZ'));
    const q = g.quaternion;
    const qx = q ? q._x : 0, qy = q ? q._y : 0, qz = q ? q._z : 0, qw = q ? q._w : 1;
    lock(g.rotation, '_x', 0); lock(g.rotation, 'x', 0);
    lock(g.rotation, '_y', YAW); lock(g.rotation, 'y', YAW);
    lock(g.rotation, '_z', 0); lock(g.rotation, 'z', 0);
    if (q) {
      /* Matrix4.compose() reads quaternion._x.._w directly, so shadow BOTH the private fields and
         the public accessors — a shadowed Euler alone leaves the stale yaw in the matrix. */
      lock(q, '_x', qx); lock(q, '_y', qy); lock(q, '_z', qz); lock(q, '_w', qw);
      lock(q, 'x', qx); lock(q, 'y', qy); lock(q, 'z', qz); lock(q, 'w', qw);
    }
    if (g.position) { lock(g.position, 'x', px); lock(g.position, 'y', 0); lock(g.position, 'z', pz); }
    if (g.updateMatrix) { g.matrixAutoUpdate = true; g.updateMatrix(); }
    g.matrixWorldNeedsUpdate = true;
    R.poses++;
  }

  /* 5 — status bar: fixed clock + battery; live map: ring phase 0, tile fade off */
  const clocks = document.querySelectorAll('.status__time');
  for (let i = 0; i < clocks.length; i++) clocks[i].textContent = CLOCK;
  if (clocks.length) R.clock = CLOCK + ' x' + clocks.length;
  const bf = document.querySelector('.status__battery-fill');
  if (bf) { bf.style.width = '68%'; R.battery = '68%'; }
  const tiles = document.querySelectorAll('.leaflet-tile');
  R.tiles = tiles.length;
  for (let i = 0; i < tiles.length; i++) {
    const im = tiles[i];
    if (!im.complete || !im.naturalWidth) R.tilesPending++;
    im.style.opacity = '1'; im.style.transition = 'none';
  }
  const maps = document.querySelectorAll('.leaflet-container');
  for (let i = 0; i < maps.length; i++) {
    const c = maps[i];
    c.classList.remove('leaflet-fade-anim', 'leaflet-zoom-anim');
    c.style.setProperty('--me-delay', '0ms');
    const pane = c.querySelector('.leaflet-map-pane');
    if (pane) pane.classList.remove('leaflet-zoom-anim');
    R.maps++;
  }

  /* 6 — exactly ONE frame, drawn from the held pose (tick re-traces the floor pool from the yaw) */
  const draw = function () {
    for (let i = 0; i < rigs.length; i++) {
      const r = rigs[i];
      if (!r.renderer || !r.scene || !r.camera) continue;
      try { if (window.GEM_RIG && window.GEM_RIG.tick) window.GEM_RIG.tick(r); } catch (e) { R.tickErr = String(e && e.message); }
      try { r.renderer.render(r.scene, r.camera); R.renders++; } catch (e) { R.renderErr = String(e && e.message); }
    }
  };
  draw();
  await new Promise(function (res) {
    let done = false;
    const fin = function () { if (!done) { done = true; res(); } };
    try { window.__nf.realRaf(function () { draw(); fin(); }); } catch (e) { fin(); }
  });
  void document.body.offsetHeight;
  return R;
})()`;

export async function freezePage(cdp, session) {
  const r = await ev(cdp, session, FREEZE_SRC);
  return r;
}

/* thaw: give the clocks + the renderer back so the next surface can be driven normally */
export const THAW_SRC = `(() => {
  const css = document.getElementById('__freeze_css');
  if (css) css.remove();
  const rigs = window.__frozenRigs || [];
  for (let i = 0; i < rigs.length; i++) {
    const r = rigs[i];
    if (r.renderer && r.renderer.__frozenSetSize) { r.renderer.setSize = r.renderer.__frozenSetSize; delete r.renderer.__frozenSetSize; }
  }
  if (window.__nf) window.__restartClocks();
  return { thawed: true };
})()`;

export async function thawPage(cdp, session) {
  try { return await ev(cdp, session, THAW_SRC); } catch (e) { return { thawed: false, error: String(e.message) }; }
}

/* ---------- capture with a self-proof ----------
 * The first screenshot after a freeze can differ from the next one by a couple of channel steps in a
 * blurred layer: Chrome re-rasters a backdrop-filter layer on the first capture of a new surface. So
 * the proof is: prime (capture, throw away), then capture A, wait 300 ms, capture B — A must be
 * byte-identical to B before A is written as the oracle file. */
export async function shoot(cdp, session, dir, name, params, { fromSurface = true } = {}) {
  const cap = async () => Buffer.from((await cdp.send('Page.captureScreenshot', { ...params, fromSurface }, session)).data, 'base64');
  await cap();
  await sleep(250);
  const b1 = await cap();
  await sleep(300);
  const b2 = await cap();
  const stableBytes = b1.equals(b2);
  let drift = null;
  if (!stableBytes) {
    const p1 = decodePng(b1), p2 = decodePng(b2);
    drift = pngDiff(p1, p2);
  }
  fs.writeFileSync(path.join(dir, name), b1);
  return { file: name, bytes: b1.length, stableBytes, drift, bytes2: b2.length };
}

/* ---------- the 8 surfaces ---------- */
const READY_DOCK = `(() => !!document.getElementById('open-fullscreen')
  && document.querySelectorAll('.opp-card').length > 0
  && !!document.querySelector('.tabbar')
  && !!document.querySelector('.fab-gem'))()`;

const READY_DESKTOP = `(() => !!document.getElementById('open-fullscreen')
  && document.querySelectorAll('.opp-card').length > 0
  && !!window.THREE)()`;

export async function openSheet(cdp, session) {
  const opened = await ev(cdp, session, `(() => {
    const strip = document.querySelector('.activity-strip');
    if (!strip || !strip.children.length) return 'no-strip';
    const peak = Array.prototype.slice.call(strip.children).find((b) => b.getAttribute('role') === 'button' || b.hasAttribute('tabindex'));
    if (!peak) return 'peak-not-wired';
    peak.click();
    return 'clicked ' + (peak.getAttribute('aria-label') || 'peak activity bar');
  })()`);
  const up = await waitFor(async () => (await ev(cdp, session, `(() => { const s = document.getElementById('reward-sheet'); return !!s && !s.hidden; })()`)) === true, 10000, 100);
  return { opened, up: !!up };
}

export async function setScroll(cdp, session, how) {
  return ev(cdp, session, `(() => {
    const el = document.getElementById('app-content');
    if (!el) return null;
    const how = ${JSON.stringify(how)};
    const max = el.scrollHeight - el.clientHeight;
    el.scrollTop = how === 'end' ? el.scrollHeight : how === 'top' ? 0 : Math.round(max * how);
    return { max, top: Math.round(el.scrollTop) };
  })()`);
}
/* back-compat shim: 0.55 -> a fraction, null -> end */
export async function setScrollFraction(cdp, session, frac) {
  return setScroll(cdp, session, frac === null ? 'end' : frac);
}

async function applyMetrics(cdp, session, vp) {
  await cdp.send('Emulation.setDeviceMetricsOverride',
    { width: vp.w, height: vp.h, deviceScaleFactor: vp.dpr, mobile: !!vp.mobile }, session);
}

/* ---------- the zoom transition: the one thing the freeze could not fix ----------
 * Measured, not guessed. The desktop workspace fits the phone frame to its canvas with
 * `--zoom`, and `#canvas-scaler .device{transition:transform .18s}` + `will-change:transform`
 * animate it. The capture protocol changes the emulated viewport HEIGHT for the tall "full" shot,
 * which changes the fit: at 1440x900 the device sits at scale 0.92, at 1440x908 it sits at 0.93
 * (index geo.full.hi.deviceTransform == matrix(0.93,...), geo.vp == matrix(0.92,...)). So every
 * desktop surface animates the frame 0.92 -> 0.93 -> 0.92.
 *
 * A transformed composited layer is rastered at a scale Chromium picks while that animation is in
 * flight, and the return to 0.92 can be composited from the animation-time raster instead of a
 * fresh one. Which of the two you get is a per-launch coin flip — measured: 2 captures of
 * desktop--home-rest agreeing byte-for-byte, a third differing on 125 px (maxΔ 37, all of them the
 * antialiased avatar circles of one filter chip), with layout identical to 6 dp in all three
 * (device/chip/text-range rects byte-identical). That is the "desktop--sheet-reward maxΔ 38"
 * outlier: not the sheet, not the backdrop-filter, not the gem — the phone frame's zoom transition.
 *
 * So: suppress the transition for the return to the surface viewport, deliver the transitionend the
 * app itself listens for (rect-zoom.js bumps its dock measure cache from it), and force one fresh
 * raster of the layer at the settled scale.
 */
export const ZOOM_LOCK_SRC = `(() => {
  let css = document.getElementById('__harness_zoom');
  if (!css) {
    css = document.createElement('style');
    css.id = '__harness_zoom';
    css.textContent = '#canvas-scaler .device{transition:none!important}';
    document.head.appendChild(css);
  }
  return { locked: true };
})()`;

export const ZOOM_SETTLE_SRC = `(() => {
  const dev = document.getElementById('device');
  if (!dev) return { skip: 'no-device' };
  /* the app invalidates its dock measure cache from the device's own transitionend (rect-zoom.js);
     suppress the transition and that event never arrives, so deliver it by hand before the shot or
     the glass dock keeps the other zoom's geometry. */
  let ev = null;
  try {
    ev = new TransitionEvent('transitionend', { propertyName: 'transform', elapsedTime: 0.18, bubbles: true });
  } catch (e) { ev = new Event('transitionend', { bubbles: true }); }
  dev.dispatchEvent(ev);
  return { transitionend: true };
})()`;

/* The device frame paints every app pixel of the desktop surfaces through `transform: scale(.92)`
 * at a fractional offset, with `will-change: transform` — i.e. as its own composited layer, rastered
 * at a scale Chromium re-picks on every zoom change and every metrics change. That layer raster is
 * the thing that is not bit-stable across launches. Taking `will-change` away lets the frame paint
 * directly into the workspace layer, so there is no per-launch layer raster to disagree about.
 * HARNESS_DEVICE_LAYER=flat turns this on; the default is off so it can be A/B'd. */
export const DEVICE_LAYER_FLAT_SRC = `(() => {
  let st = document.getElementById('__harness_device');
  if (!st) {
    st = document.createElement('style');
    st.id = '__harness_device';
    st.textContent = '#canvas-scaler .device{will-change:auto!important;transition:none!important}';
    document.head.appendChild(st);
  }
  return { flat: true };
})()`;

async function contentHeight(cdp, session, vp) {
  const lm = await cdp.send('Page.getLayoutMetrics', {}, session);
  const cs = lm.cssContentSize || lm.contentSize;
  return Math.max(vp.h, Math.min(Math.ceil(cs.height), vp.h * 4));
}

/* One surface = two files, each proven stable before it is accepted.
 *
 * The taller "full" file is captured by GROWING THE EMULATED VIEWPORT first, not with
 * captureBeyondViewport: the latter re-lays out `position:fixed` chrome and the SVG-filtered
 * backdrop-filter of the glass tab bar *during* the capture, and that glass then rasters
 * differently in every launch (measured: 0.24 % of pixels, maxChannelDelta 3, bbox exactly the
 * 300x48 pill). An explicit metrics change lets the freeze draw at the final layout, so both
 * launches see the same raster. */
export async function captureSurface(cdp, session, dir, name, { vp, scroll = 'top', needSheet = false, geo = '', zoomSettle = true, vpFirst = false }) {
  const fullH = await contentHeight(cdp, session, vp);
  const passes = vpFirst ? ['vp', 'full'] : ['full', 'vp'];
  const out = { name, fullH, scroll: {}, layout: {}, zoom: null };

  const scrollNow = () => ev(cdp, session, `(() => { const el = document.getElementById('app-content'); return el ? { max: el.scrollHeight - el.clientHeight, top: Math.round(el.scrollTop) } : null; })()`);

  for (const kind of passes) {
    const target = kind === 'full' ? { ...vp, h: fullH } : vp;
    /* the return from the tall pass to the surface viewport must not ANIMATE the phone frame's
       scale — an animated transform makes Chromium pick a raster scale mid-flight and the settled
       raster becomes a per-launch coin flip. See ZOOM_LOCK_SRC. */
    if (kind === 'vp' && zoomSettle) await ev(cdp, session, ZOOM_LOCK_SRC);
    await applyMetrics(cdp, session, target);
    await sleep(kind === 'full' ? 200 : 240);
    await setScroll(cdp, session, scroll);
    await sleep(120);
    out.layout[kind] = await forceLayout(cdp, session);
    const settle = await waitSettled(cdp, session, { needSheet });
    if (kind === 'vp') {
      out.settle = settle;
      if (zoomSettle) out.zoom = await ev(cdp, session, ZOOM_SETTLE_SRC);
    } else {
      out.settleFull = settle;
    }
    out.frozen = await freezePage(cdp, session);
    out.geo = out.geo || {};
    if (geo) out.geo[kind] = await ev(cdp, session, geo);
    out[kind] = await shoot(cdp, session, dir, `${name}.${kind}.png`, { format: 'png' });
    out.scroll[kind] = await scrollNow();
    await thawPage(cdp, session);
    if (kind === 'vp' && zoomSettle) await ev(cdp, session, `(() => { const c = document.getElementById('__harness_zoom'); if (c) c.remove(); return true; })()`);
  }

  /* `settle` in the index always means "the pass that produced the vp file", whatever the order */
  out.settle = out.settle || out.settleFull;
  if (!out.geo) delete out.geo;
  return out;
}

/* ---------- the freeze assertion record ----------
 * Evaluated AFTER freezePage() and stored on every index row. It is what makes a stored number
 * mean something: it proves the shot was taken at the expected viewport/dpr, with reduced motion
 * forced, fonts settled, rAF stopped, the sheet open and the map paused. gate.mjs prints it and
 * fails if the two sides of a comparison disagree. */
export const GEO_SRC = `(() => {
  const r = (sel) => { const e = document.querySelector(sel); if (!e) return null;
    const b = e.getBoundingClientRect();
    return { x: +b.x.toFixed(3), y: +b.y.toFixed(3), w: +b.width.toFixed(3), h: +b.height.toFixed(3) }; };
  const sc = document.getElementById('app-content');
  const sheet = document.getElementById('reward-sheet');
  const anims = document.getAnimations();
  const fonts = [];
  if (document.fonts && document.fonts.forEach) document.fonts.forEach((f) => fonts.push(f.family + ':' + f.status));
  const tiles = document.querySelectorAll('.leaflet-tile');
  return {
    vp: [innerWidth, innerHeight], dpr: window.devicePixelRatio,
    visual: window.visualViewport ? [Math.round(window.visualViewport.width), Math.round(window.visualViewport.scale * 1000) / 1000] : null,
    reducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    fontsStatus: document.fonts ? document.fonts.status : 'n/a', fontsLoaded: fonts.length,
    fontsPending: fonts.filter((f) => f.indexOf(':loaded') < 0).length,
    rafQueued: window.__nf ? window.__nf.S.raf.size : -1,
    timersQueued: window.__nf ? window.__nf.S.to.size + window.__nf.S.iv.size : -1,
    scroll: sc ? [sc.scrollTop, sc.scrollHeight, sc.clientHeight] : null,
    docH: document.documentElement.scrollHeight,
    anims: anims.length,
    animsRunning: anims.filter((a) => a.playState === 'running').length,
    sheet: sheet ? (sheet.hidden ? 'hidden' : 'open:' + sheet.className) : 'none',
    tiles: [tiles.length, Array.prototype.filter.call(tiles, (t) => !(t.complete && t.naturalWidth)).length],
    pill: r('.pill-tab'),
    strip: r('.ws-tabs .shell-tabs'),
    /* high precision: the device frame is painted through transform:scale(--zoom) at a fractional
       offset, so its sub-pixel phase is what decides the antialiasing of every rounded thing inside
       it. Recorded at 6 dp so a 1e-4 drift is visible in the index. */
    hi: (function () {
      const q = (el) => { if (!el) return null; const b = el.getBoundingClientRect();
        return [+b.x.toFixed(6), +b.y.toFixed(6), +b.width.toFixed(6), +b.height.toFixed(6)]; };
      const dev = document.getElementById('device');
      const scaler = document.getElementById('canvas-scaler');
      const chip = document.querySelector('.chip--faces');
      let range = null;
      if (chip) {
        const tn = Array.prototype.find.call(chip.childNodes, (n) => n.nodeType === 3 && n.textContent.trim());
        if (tn) { const rg = document.createRange(); rg.selectNodeContents(tn); const b = rg.getBoundingClientRect();
          range = [+b.x.toFixed(6), +b.y.toFixed(6), +b.width.toFixed(6)]; }
      }
      return {
        device: q(dev), deviceTransform: dev ? getComputedStyle(dev).transform : null,
        scaler: q(scaler), chip: q(chip), chipTextRange: range,
        zoom: scaler ? getComputedStyle(scaler).getPropertyValue('--zoom').trim() : null,
        viewportBox: q(document.querySelector('.ws-canvas__viewport')),
      };
    })(),
    gem: Array.prototype.map.call(document.querySelectorAll('canvas[data-gem]'), (c) => c.dataset.gem + ':' + (c.dataset.gemDone === '1' ? 'done' : 'pending') + ':' + c.width + 'x' + c.height),
  };
})()`;

/* ---------- the walk: desktop 1440x900, mobile 393x852 ----------
 * options:
 *   label / dir / log   as before
 *   only:   array of name fragments — capture ONLY the surfaces whose `surface--state` matches
 *   resume: keep the shots already in <dir>/index.json, capture only what is missing, merge, rewrite
 *   geo:    an expression evaluated AFTER the freeze (see GEO_SRC) and stored on each row; it is the
 *           freeze assertion record — geometry, dpr, inner size, scroll and font state at the freeze
 */
export async function captureSet(ctx, { label, dir, log = console.log, only = null, resume = false, geo = GEO_SRC, deviceLayer = null } = {}) {
  /* HARNESS_DEVICE_LAYER=flat: paint the phone frame directly instead of through its own composited
     layer (see DEVICE_LAYER_FLAT_SRC). Diagnostic switch, A/B'd with and without. */
  const FLAT = (deviceLayer || process.env.HARNESS_DEVICE_LAYER || '') === 'flat';
  /* HARNESS_VP_FIRST=1: take the viewport shot BEFORE the tall one on the desktop tab. The tall pass
     changes the fitted frame scale (0.92 -> 0.93), so whichever pass runs second is the one whose
     layer gets re-rastered after a scale round-trip; taking the vp shot first means it is taken at a
     metrics state the page has held since load. */
  const VP_FIRST = (process.env.HARNESS_VP_FIRST || '') === '1';
  const { cdp, url } = ctx;
  /* a caller may bring its own tab factory (trace.mjs installs its perf prelude that way) */
  const mkTab = ctx.openTab || ((c) => openTab(c, { prelude: ctx.prelude || '' }));
  fs.mkdirSync(dir, { recursive: true });
  const index = {
    label, capturedAt: new Date().toISOString(), url,
    harness: 'deterministic.mjs — rAF/timer kill + animation seek + Euler/quaternion pose hold + fixed clock + paused map',
    note: 'prefers-reduced-motion is forced, CPU 1x, every animation frozen before the shot, and each file is accepted only if a second screenshot 300 ms later is byte-identical.',
    surfaces: [],
  };
  const have = new Set();
  if (resume) {
    const p = path.join(dir, 'index.json');
    if (!fs.existsSync(p)) throw new Error(`--resume: no index at ${p}`);
    const prev = JSON.parse(fs.readFileSync(p, 'utf8'));
    /* keep only rows that actually have both files on disk */
    index.surfaces = (prev.surfaces || []).filter((r) => (r.files || []).length === 2
      && r.files.every((f) => fs.existsSync(path.join(dir, path.basename(f.file)))));
    for (const r of index.surfaces) have.add(`${r.surface}--${r.state}`);
    index.resumedFrom = prev.capturedAt;
    index.resumeNote = `first ${index.surfaces.length} surfaces carried over from ${prev.capturedAt}; the rest captured by this run`;
    log(`  resume: ${index.surfaces.length} surface(s) already on disk — keeping them`);
  }
  const want = (name) => (!only || only.some((o) => name.includes(o))) && !have.has(name);

  const record = (surface, state, meta, shots) => {
    const st = shots.settle || {};
    const fz = shots.frozen || {};
    const row = {
      surface, state, ...meta,
      settleOk: st.ok !== false,
      settle: { waitedMs: st.waitedMs, imgs: st.imgs, tiles: st.tiles, tilesPending: st.tilesPending, map: st.map, frames: st.frames } || null,
      frozen: { poses: fz.poses, renders: fz.renders, anims: fz.anims, transitions: fz.transitions, rafQueued: fz.rafQueued, tiles: fz.tiles, tilesPending: fz.tilesPending },
      capture: { fullHeight: shots.fullH, scroll: shots.scroll, layout: shots.layout, zoomSettle: shots.zoom || null }, files: [],
    };
    if (shots.geo) row.geo = shots.geo;
    for (const s of [shots.full, shots.vp]) {
      row.files.push({ file: path.relative(path.dirname(dir), path.join(dir, s.file)), bytes: s.bytes, stable: s.stableBytes, drift: s.drift });
    }
    row.stable = !!(shots.full.stableBytes && shots.vp.stableBytes);
    index.surfaces.push(row);
    fs.writeFileSync(path.join(dir, 'index.json'), JSON.stringify(index, null, 2));
    log(`  ${surface}/${state}: full ${shots.full.bytes}B ${shots.full.stableBytes ? 'stable' : 'DRIFT'} · vp ${shots.vp.bytes}B ${shots.vp.stableBytes ? 'stable' : 'DRIFT'}`);
    return row;
  };

  /* desktop workspace 1440x900 dpr1 */
  {
    const todo = ['home-rest', 'feed-mid', 'dock-fab', 'sheet-reward'].filter((st) => want('desktop--' + st));
    log(`\n  desktop tab: ${todo.length ? todo.join(', ') : 'nothing to capture'}`);
    const tab = await mkTab(cdp);
    const s = tab.session;
    await applyMetrics(cdp, s, DESKTOP);
    await cdp.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] }, s);
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 }, s);
    await cdp.send('Page.navigate', { url }, s);
    const ok = await waitFor(async () => (await ev(cdp, s, READY_DESKTOP)) === true, 240000, 200);
    if (!ok) throw new Error('desktop never hydrated');
    await sleep(1200);
    if (FLAT) await ev(cdp, s, DEVICE_LAYER_FLAT_SRC);

    if (want('desktop--home-rest')) {
      const sh = await captureSurface(cdp, s, dir, 'desktop--home-rest', { vp: DESKTOP, scroll: 'top', geo, zoomSettle: !FLAT, vpFirst: VP_FIRST });
      record('desktop', 'home-rest', { reachedBy: 'GET / at 1440x900 dpr1, untouched (workspace + device frame, feed at top)', viewport: DESKTOP }, sh);
      await thawPage(cdp, s);
    }

    if (want('desktop--feed-mid')) {
      const sc = await setScroll(cdp, s, 0.55);
      await sleep(400);
      const sh = await captureSurface(cdp, s, dir, 'desktop--feed-mid', { vp: DESKTOP, scroll: 0.55, geo, zoomSettle: !FLAT, vpFirst: VP_FIRST });
      record('desktop', 'feed-mid', { reachedBy: '#app-content.scrollTop = 55% of max', scroll: sc, viewport: DESKTOP }, sh);
      await thawPage(cdp, s);
    }

    if (want('desktop--dock-fab')) {
      await setScroll(cdp, s, 'end');
      await sleep(500);
      const sh = await captureSurface(cdp, s, dir, 'desktop--dock-fab', { vp: DESKTOP, scroll: 'end', geo, zoomSettle: !FLAT, vpFirst: VP_FIRST });
      record('desktop', 'dock-fab', { reachedBy: '#app-content scrolled to end — .tabbar + .fab-gem float over feed content', viewport: DESKTOP }, sh);
      await thawPage(cdp, s);
    }

    if (want('desktop--sheet-reward')) {
      /* self-sufficient: never inherit the scroll of whatever ran before (a --resume run may have
         skipped dock-fab, and the sheet sits over the feed's end on desktop) */
      await setScroll(cdp, s, 'end');
      await sleep(400);
      const { opened, up } = await openSheet(cdp, s);
      if (up) {
        await sleep(1400);
        const sh = await captureSurface(cdp, s, dir, 'desktop--sheet-reward', { vp: DESKTOP, scroll: 'end', needSheet: true, geo, zoomSettle: !FLAT, vpFirst: VP_FIRST });
        record('desktop', 'sheet-reward', { reachedBy: `${opened} -> #reward-sheet unhidden`, sheetOpen: true, viewport: DESKTOP }, sh);
      } else {
        index.surfaces.push({ surface: 'desktop', state: 'sheet-reward', skipped: true, reason: opened, viewport: DESKTOP });
        log(`  desktop/sheet-reward SKIPPED (${opened})`);
      }
    }
    await cdp.send('Target.closeTarget', { targetId: tab.targetId }).catch(() => {});
  }

  /* mobile fullscreen 393x852 dpr3 */
  {
    const todo = ['home-rest', 'feed-mid', 'dock-fab', 'sheet-reward'].filter((st) => want('mobile--' + st));
    log(`\n  mobile tab: ${todo.length ? todo.join(', ') : 'nothing to capture'}`);
    const tab = await mkTab(cdp);
    const s = tab.session;
    await applyMetrics(cdp, s, MOBILE);
    await cdp.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 }, s);
    await cdp.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] }, s);
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 }, s);
    /* Boot STRAIGHT INTO fullscreen (?app=fullscreen, the same entry point the launcher button
       writes). Clicking #open-fullscreen after hydration instead makes the map initialise at the
       launcher's box and then get re-measured by the transition — and Leaflet lands in one of two
       stable-but-different states depending on which side of the transition its first
       invalidateSize falls (measured: 6.1 % of the widget). Booting in fullscreen removes the
       transition, so the map measures its final box once. */
    await cdp.send('Page.navigate', { url: url + (url.indexOf('?') < 0 ? '?app=fullscreen' : '&app=fullscreen') }, s);
    const ok = await waitFor(async () => (await ev(cdp, s, READY_DOCK)) === true, 240000, 150);
    if (!ok) throw new Error('mobile never hydrated');
    const inFs = await waitFor(async () => (await ev(cdp, s, `document.body.classList.contains('app-fullscreen')`)) === true, 20000, 100);
    if (!inFs) throw new Error('?app=fullscreen did not set body.app-fullscreen');
    await sleep(900);

    if (want('mobile--home-rest')) {
      const sh = await captureSurface(cdp, s, dir, 'mobile--home-rest', { vp: MOBILE, scroll: 'top', geo });
      record('mobile', 'home-rest', { reachedBy: 'GET /?app=fullscreen at 393x852 dpr3 mobile -> body.app-fullscreen, feed at scrollTop 0', viewport: MOBILE }, sh);
      await thawPage(cdp, s);
    }

    if (want('mobile--feed-mid')) {
      const sc = await setScroll(cdp, s, 0.5);
      await sleep(500);
      const sh = await captureSurface(cdp, s, dir, 'mobile--feed-mid', { vp: MOBILE, scroll: 0.5, geo });
      record('mobile', 'feed-mid', { reachedBy: '#app-content.scrollTop = 50% of max', scroll: sc, viewport: MOBILE }, sh);
      await thawPage(cdp, s);
    }

    if (want('mobile--dock-fab')) {
      await setScroll(cdp, s, 'end');
      await sleep(700);
      const sh = await captureSurface(cdp, s, dir, 'mobile--dock-fab', { vp: MOBILE, scroll: 'end', geo });
      record('mobile', 'dock-fab', { reachedBy: '#app-content scrolled to end — .tabbar + .fab-gem over feed', viewport: MOBILE }, sh);
      await thawPage(cdp, s);
    }

    if (want('mobile--sheet-reward')) {
      await setScroll(cdp, s, 'top');
      await sleep(500);
      const { opened, up } = await openSheet(cdp, s);
      if (up) {
        await sleep(1600);
        const sh = await captureSurface(cdp, s, dir, 'mobile--sheet-reward', { vp: MOBILE, scroll: 'top', needSheet: true, geo });
        record('mobile', 'sheet-reward', { reachedBy: `${opened} -> #reward-sheet unhidden`, sheetOpen: true, viewport: MOBILE }, sh);
      } else {
        index.surfaces.push({ surface: 'mobile', state: 'sheet-reward', skipped: true, reason: opened, viewport: MOBILE });
        log(`  mobile/sheet-reward SKIPPED (${opened})`);
      }
    }
    await cdp.send('Target.closeTarget', { targetId: tab.targetId }).catch(() => {});
  }
  /* stable order regardless of --resume / --only */
  const order = [];
  for (const sfc of ['desktop', 'mobile']) for (const st of ['home-rest', 'feed-mid', 'dock-fab', 'sheet-reward']) order.push(`${sfc}--${st}`);
  index.surfaces.sort((a, b) => order.indexOf(`${a.surface}--${a.state}`) - order.indexOf(`${b.surface}--${b.state}`));
  index.capturedAtEnd = new Date().toISOString();
  fs.writeFileSync(path.join(dir, 'index.json'), JSON.stringify(index, null, 2));
  return index;
}

/* ---------- PNG decode + diff (no deps: zlib is built in) ---------- */
export function decodePng(buf) {
  if (buf.readUInt32BE(0) !== 0x89504e47) throw new Error('not a png');
  let pos = 8, w = 0, h = 0, depth = 0, ctype = 0, interlace = 0;
  const idat = [];
  const plte = [];
  while (pos < buf.length) {
    const len = buf.readUInt32BE(pos);
    const type = buf.toString('ascii', pos + 4, pos + 8);
    const data = buf.subarray(pos + 8, pos + 8 + len);
    pos += 12 + len;
    if (type === 'IHDR') { w = data.readUInt32BE(0); h = data.readUInt32BE(4); depth = data[8]; ctype = data[9]; interlace = data[12]; }
    else if (type === 'IDAT') idat.push(data);
    else if (type === 'PLTE') plte.push(data);
    else if (type === 'IEND') break;
  }
  if (depth !== 8) throw new Error('unsupported png bit depth ' + depth);
  if (interlace) throw new Error('interlaced png unsupported');
  const ch = ctype === 6 ? 4 : ctype === 2 ? 3 : ctype === 0 ? 1 : ctype === 4 ? 2 : -1;
  if (ch < 0) throw new Error('unsupported png colour type ' + ctype);
  const raw = zlib.inflateSync(Buffer.concat(idat));
  const stride = w * ch;
  const out = new Uint8Array(w * h * 4);
  let prev = new Uint8Array(stride);
  let cur = new Uint8Array(stride);
  let p = 0;
  for (let y = 0; y < h; y++) {
    const f = raw[p++];
    for (let x = 0; x < stride; x++) {
      const rb = raw[p++];
      const a = x >= ch ? cur[x - ch] : 0;
      const b = prev[x];
      const c = x >= ch ? prev[x - ch] : 0;
      let v;
      if (f === 0) v = rb;
      else if (f === 1) v = rb + a;
      else if (f === 2) v = rb + b;
      else if (f === 3) v = rb + ((a + b) >> 1);
      else if (f === 4) {
        const pa = Math.abs(b - c), pb = Math.abs(a - c), pc = Math.abs(a + b - 2 * c);
        v = rb + (pa <= pb && pa <= pc ? a : pb <= pc ? b : c);
      } else throw new Error('png filter ' + f);
      cur[x] = v & 255;
    }
    for (let x = 0; x < w; x++) {
      const o = (y * w + x) * 4;
      if (ch === 4) { out[o] = cur[x * 4]; out[o + 1] = cur[x * 4 + 1]; out[o + 2] = cur[x * 4 + 2]; out[o + 3] = cur[x * 4 + 3]; }
      else if (ch === 3) { out[o] = cur[x * 3]; out[o + 1] = cur[x * 3 + 1]; out[o + 2] = cur[x * 3 + 2]; out[o + 3] = 255; }
      else if (ch === 1) { const g = cur[x]; out[o] = g; out[o + 1] = g; out[o + 2] = g; out[o + 3] = 255; }
      else { const g = cur[x * 2]; out[o] = g; out[o + 1] = g; out[o + 2] = g; out[o + 3] = cur[x * 2 + 1]; }
    }
    const t = prev; prev = cur; cur = t;
  }
  return { width: w, height: h, data: out };
}

/* a pixel DIFFERS when any channel moves by more than 1/255 (the owner's per-channel tolerance) */
export function pngDiff(A, B) {
  const sameSize = A.width === B.width && A.height === B.height;
  const w = Math.min(A.width, B.width), h = Math.min(A.height, B.height);
  let differing = 0, maxDelta = 0, sumDelta = 0;
  let x0 = Infinity, y0 = Infinity, x1 = -1, y1 = -1;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const oa = (y * A.width + x) * 4;
      const ob = (y * B.width + x) * 4;
      let d = 0;
      for (let k = 0; k < 4; k++) {
        const dv = Math.abs(A.data[oa + k] - B.data[ob + k]);
        if (dv > d) d = dv;
      }
      if (d > maxDelta) maxDelta = d;
      if (d > 1) {
        differing++; sumDelta += d;
        if (x < x0) x0 = x; if (y < y0) y0 = y;
        if (x > x1) x1 = x; if (y > y1) y1 = y;
      }
    }
  }
  const total = A.width * A.height;
  const overlapTotal = w * h;
  const sizePixels = total - overlapTotal;
  return {
    width: A.width, height: A.height, widthB: B.width, heightB: B.height, sameSize,
    total, differing, pct: total ? +((100 * differing) / total).toFixed(4) : 0,
    maxChannelDelta: maxDelta, meanDelta: differing ? +(sumDelta / differing).toFixed(2) : 0,
    bbox: x1 >= 0 ? [x0, y0, x1, y1] : null,
    sizePixels,
  };
}

/* ---------- --accept globs, matched against the surface name ---------- */
export function globToRe(glob) {
  const esc = glob.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*').replace(/\?/g, '.');
  return new RegExp('^' + esc + '$');
}
export function accepted(name, globs) {
  return globs.some((g) => {
    const re = globToRe(g);
    return re.test(name) || re.test(name.replace(/\/(full|vp)\.png$/, ''));
  });
}
