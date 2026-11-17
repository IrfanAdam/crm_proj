#!/usr/bin/env node
/* laneH.mjs — lane-H probe: the two defects, before vs after.
 *
 * usage: node .hermes/evals/2026-11-16-mobile-perf-parity/tools/laneH.mjs \
 *          --phase before|after --out <dir> [--url http://127.0.0.1:5242]
 *
 * Writes <out>/laneH.json and the PNGs beside it. Nothing in the repo is touched.
 */
import fs from 'node:fs';
import path from 'node:path';
import { launch, openTab, ev, sleep, waitFor, freePort,
  forceLayout, waitSettled, freezePage, thawPage, decodePng, pngDiff, MOBILE } from '../tools/deterministic.mjs';

const argv = process.argv.slice(2);
const arg = (n, d) => { const i = argv.indexOf('--' + n); return i === -1 ? d : argv[i + 1]; };
const PHASE = arg('phase', 'before');
const ONLY = arg('only', 'all');
const OUT = path.resolve(arg('out', '.hermes/evals/2026-11-16-mobile-perf-parity/lane-H-' + PHASE));
const URL = arg('url', 'http://127.0.0.1:5242');
fs.mkdirSync(OUT, { recursive: true });

const ERRCOL = `
window.__errs = [];
(function () {
  const push = (kind, msg, stack) => window.__errs.push({ kind, msg, stack: stack || null, at: Math.round(performance.now()) });
  window.addEventListener('error', (e) => push('error', e.message, e.error && String(e.error.stack || '').slice(0, 900)));
  window.addEventListener('unhandledrejection', (e) => push('rejection', String((e.reason && e.reason.message) || e.reason), e.reason && String(e.reason.stack || '').slice(0, 900)));
})();
`;

/* everything the map defect needs to be described, plus the focus probes */
const CENSUS = `(() => {
  const out = {};
  const L = window.L;
  out.leaflet = !!L;
  out.pluginMethod = !!(L && L.Map && L.Map.prototype && typeof L.Map.prototype.setBearing === 'function');
  out.rotatePane = !!document.querySelector('.leaflet-rotate-pane');
  out.mapInited = !!(L && L.Map.prototype.__lhInitPatched);
  const host = document.getElementById('nearby-tiles');
  out.hostFound = !!host;
  if (host) {
    const t = [...host.querySelectorAll('.leaflet-tile')];
    const pane = host.querySelector('.leaflet--pane-any') || host.querySelector('.leaflet-map-pane');
    const rp = host.querySelector('.leaflet-rotate-pane');
    out.tiles = t.length;
    out.tilesLoaded = t.filter((x) => x.classList.contains('leaflet-tile-loaded')).length;
    out.markers = host.querySelectorAll('.leaflet-marker-icon').length;
    out.pins = host.querySelectorAll('.opps__leafpin').length;
    out.me = host.querySelectorAll('.opps__me-wrap').length;
    out.hotspot = !!host.querySelector('.opps__hotspot');
    out.mapPaneTf = pane ? getComputedStyle(pane).transform : null;
    out.rotatePaneTf = rp ? getComputedStyle(rp).transform : null;
    out.rotatePaneStyle = rp ? rp.getAttribute('style') : null;
    out.containerClass = host.className;
    const r = host.getBoundingClientRect();
    out.box = { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) };
  }
  out.errs = (window.__errs || []).slice(0, 40);
  return out;
})()`;

/* focus a node by keyboard modality, then report its computed ring */
const focusProbe = (sel) => `(async () => {
  const el = document.querySelector(${JSON.stringify(sel)});
  if (!el) return { sel: ${JSON.stringify(sel)}, found: false };
  const snap = () => {
    const cs = getComputedStyle(el);
    return { outlineStyle: cs.outlineStyle, outlineWidth: cs.outlineWidth, outlineColor: cs.outlineColor,
      outlineOffset: cs.outlineOffset, boxShadow: cs.boxShadow };
  };
  const blur = () => { el.blur(); if (document.activeElement && document.activeElement.blur) document.activeElement.blur(); };
  blur();
  await new Promise((r) => setTimeout(r, 60));
  const rest = snap();
  /* keyboard modality first (Chrome only gives :focus-visible to script focus after a key) */
  el.focus({ preventScroll: true });
  await new Promise((r) => setTimeout(r, 80));
  const focused = snap();
  /* bring it into the viewport, then report a DOCUMENT-coordinate box for the screenshot clip */
  el.scrollIntoView({ block: 'center', inline: 'center' });
  await new Promise((r) => setTimeout(r, 120));
  const r = el.getBoundingClientRect();
  return { sel: ${JSON.stringify(sel)}, found: true, active: document.activeElement === el,
    focusVisible: el.matches(':focus-visible'), focus: el.matches(':focus'),
    rest, focused,
    box: { x: Math.round(r.x + window.scrollX), y: Math.round(r.y + window.scrollY), w: Math.round(r.width), h: Math.round(r.height) },
    text: (el.textContent || '').trim().slice(0, 40) };
})()`;

async function cdpKeyTab(cdp, s) {
  for (const type of ['rawKeyDown', 'keyUp']) {
    await cdp.send('Input.dispatchKeyEvent', { type, key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9, nativeVirtualKeyCode: 9 }, s);
  }
  await sleep(80);
}

async function shootClip(cdp, s, name, b0, scale = 2) {
  const cb = { x: Math.round(b0.x), y: Math.round(b0.y),
    width: Math.max(1, Math.round(b0.width ?? b0.w)), height: Math.max(1, Math.round(b0.height ?? b0.h)) };
  const params = { format: 'png', clip: { ...cb, scale }, fromSurface: true };
  const cap = async () => Buffer.from((await cdp.send('Page.captureScreenshot', params, s)).data, 'base64');
  await cap(); await sleep(250);
  const a = await cap(); await sleep(300); const b = await cap();
  const stable = a.equals(b);
  let drift = null;
  if (!stable) drift = pngDiff(decodePng(a), decodePng(b));
  fs.writeFileSync(path.join(OUT, name), a);
  return { name, bytes: a.length, stable, drift };
}

async function boot(cdp, url, readySrc) {
  const tab = await openTab(cdp, { prelude: ERRCOL });
  const s = tab.session;
  await cdp.send('Emulation.setDeviceMetricsOverride', { width: MOBILE.w, height: MOBILE.h, deviceScaleFactor: MOBILE.dpr, mobile: true }, s);
  await cdp.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 }, s);
  await cdp.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] }, s);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 }, s);
  await cdp.send('Page.navigate', { url }, s);
  const ok = await waitFor(async () => (await ev(cdp, s, readySrc)) === true, 240000, 250);
  return { tab, s, ok };
}

const report = { phase: PHASE, url: URL, startedAt: new Date().toISOString(), surfaces: {} };
const ctx = await launch();
try {
  /* ---------- 1. the app: map + reward sheet ---------- */
  if (ONLY !== 'gallery') {
    const { tab, s, ok } = await boot(ctx.cdp, URL + '/?app=fullscreen',
      `(() => !!document.getElementById('nearby-tiles') && document.querySelectorAll('.leaflet-tile').length > 0 && document.querySelectorAll('.opps__leafpin').length > 0)()`);
    report.surfaces.app = { hydrated: ok };
    await sleep(1500);
    await forceLayout(ctx.cdp, s);
    const settle = await waitSettled(ctx.cdp, s);
    report.surfaces.app.settle = settle.ok ? 'settled' : 'TIMEOUT';
    report.surfaces.app.census = await ev(ctx.cdp, s, CENSUS);
    /* the collector must be provably live, or "console clean" means nothing */
    report.surfaces.app.collectorSelfTest = await ev(ctx.cdp, s, `(async () => {
      let fired = false;
      const h = () => { fired = true; };
      window.addEventListener('unhandledrejection', h, { once: true });
      Promise.reject(new Error('__laneH_selftest__'));
      await new Promise((r) => setTimeout(r, 120));
      window.removeEventListener('unhandledrejection', h);
      const seen = (window.__errs || []).some((e) => /__laneH_selftest__/.test(e.msg));
      return { fired, recorded: seen };
    })()`);

    /* focus probes on the real app controls */
    report.surfaces.app.strip = await ev(ctx.cdp, s, focusProbe('.activity-strip__bar'));
    report.surfaces.app.stripRoleBtn = await ev(ctx.cdp, s,
      `(() => ({ selectorMatches: document.querySelectorAll('.activity-strip__bar[role="button"]').length,
                 stripRole: document.querySelector('.activity-strip') ? document.querySelector('.activity-strip').getAttribute('role') : null,
                 bars: document.querySelectorAll('.activity-strip__bar').length,
                 focusable: [...document.querySelectorAll('.activity-strip__bar')].filter((b) => b.tabIndex >= 0).length }))()`);

    /* resting pixels of the map widget + the activity strip — captured BEFORE any focus probe can
       scroll the feed, so the crop is the same frame in both phases */
    await freezePage(ctx.cdp, s);
    const box = report.surfaces.app.census.box;
    report.surfaces.app.mapShot = await shootClip(ctx.cdp, s, 'app-map-rest.png', { x: box.x, y: box.y + 1, width: box.w - 2, height: box.h - 2 }, 2);
    const sb = report.surfaces.app.strip.box;
    report.surfaces.app.stripShot = await shootClip(ctx.cdp, s, 'app-strip-rest.png',
      { x: Math.max(0, sb.x - 10), y: Math.max(0, sb.y - 10), width: sb.w + 20, height: sb.h + 20 }, 3);
    await thawPage(ctx.cdp, s);

    /* the peak bar is a real keyboard control (reward-sheet.js:54 gives it role=button + tabindex) */
    report.surfaces.app.peakBar = await ev(ctx.cdp, s, focusProbe('.activity-strip__bar[role="button"]'));
    report.surfaces.app.peakBarFocus = await ev(ctx.cdp, s, focusProbe('.activity-strip__bar[role="button"]'));
    const pb = report.surfaces.app.peakBarFocus;
    if (pb && pb.found && pb.box) {
      await sleep(140);
      const f = { x: Math.max(0, pb.box.x - 10), y: Math.max(0, pb.box.y - 10), width: pb.box.w + 20, height: pb.box.h + 20 };
      const buf = Buffer.from((await ctx.cdp.send('Page.captureScreenshot',
        { format: 'png', clip: { ...f, scale: 3 }, fromSurface: true }, s)).data, 'base64');
      fs.writeFileSync(path.join(OUT, 'app-strip-focused.png'), buf);
      report.surfaces.app.peakBar.focusedShot = 'app-strip-focused.png';
    }
    await ctx.cdp.send('Target.closeTarget', { targetId: tab.targetId }).catch(() => {});
  }

  /* ---------- 2. the DS gallery: the two overlay focus-ring sites ---------- */
  if (ONLY !== 'app') {
    const { tab, s, ok } = await boot(ctx.cdp, URL + '/gallery.html',
      `(() => document.querySelectorAll('.menu__item').length > 0 && !!document.querySelector('.overlay .overlay__close, .overlay [class*="btn"]'))()`);
    report.surfaces.gallery = { hydrated: ok };
    const inv = `(() => ({ menuItems: document.querySelectorAll('.menu__item').length,
      openMenus: document.querySelectorAll('.menu.overlay--open').length,
      menus: document.querySelectorAll('.menu').length,
      menusHidden: [...document.querySelectorAll('.menu')].filter((m) => m.hasAttribute('hidden')).length,
      overlays: document.querySelectorAll('.overlay').length,
      openOverlays: document.querySelectorAll('.overlay.overlay--open').length,
      triggers: document.querySelectorAll('[data-overlay-target]').length,
      stages: document.querySelectorAll('.ov-stage').length }))()`;
    report.surfaces.gallery.inventory = await ev(ctx.cdp, s, inv);

    /* put the DS components into the open state their own JS produces (overlay.js adds the same
       class), and make sure an ancestor is not hiding them — the lab panels are fetched HTML */
    const opened = await ev(ctx.cdp, s, `(() => {
      const out = {};
      const unhide = (el) => { for (let n = el; n && n !== document.body; n = n.parentElement) { if (n.hasAttribute && n.hasAttribute('hidden')) n.removeAttribute('hidden'); } };
      const menu = document.querySelector('.menu');
      if (menu) { unhide(menu); menu.hidden = false; menu.classList.add('overlay--open'); menu.scrollIntoView({ block: 'center' }); }
      out.menuOpen = !!(menu && menu.classList.contains('overlay--open'));
      const ovs = [...document.querySelectorAll('.overlay')];
      let target = ovs.find((o) => o.classList.contains('overlay--open')) || ovs[0];
      if (target) { unhide(target); target.classList.add('overlay--open'); target.scrollIntoView({ block: 'center' }); }
      out.overlayOpen = !!(target && target.classList.contains('overlay--open'));
      out.overlayCount = ovs.length;
      const c = document.querySelector('.overlay.overlay--open .overlay__close, .overlay.overlay--open button');
      out.closeBox = c ? (() => { const r = c.getBoundingClientRect(); return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) }; })() : null;
      const mi = document.querySelector('.menu.overlay--open .menu__item');
      out.itemBox = mi ? (() => { const r = mi.getBoundingClientRect(); return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) }; })() : null;
      return out;
    })()`);
    await sleep(400);
    report.surfaces.gallery.openAttempt = { after: await ev(ctx.cdp, s, inv), result: opened };

    /* real keyboard modality: CDP Tab, not a synthetic KeyboardEvent */
    await cdpKeyTab(ctx.cdp, s);
    report.surfaces.gallery.menuItem = await ev(ctx.cdp, s, focusProbe('.menu.overlay--open .menu__item'));
    report.surfaces.gallery.overlayControl = await ev(ctx.cdp, s,
      focusProbe('.overlay.overlay--open button, .overlay.overlay--open .overlay__close'));

    await freezePage(ctx.cdp, s);
    const menuBox = report.surfaces.gallery.menuItem.box;
    if (menuBox && menuBox.w > 1) {
      report.surfaces.gallery.menuShot = await shootClip(ctx.cdp, s, 'gallery-menu-rest.png', menuBox, 2);
    }
    const ctl = report.surfaces.gallery.overlayControl;
    if (ctl && ctl.found && ctl.box.w > 1) {
      report.surfaces.gallery.overlayShot = await shootClip(ctx.cdp, s, 'gallery-overlay-rest.png',
        { x: Math.max(0, ctl.box.x - 6), y: Math.max(0, ctl.box.y - 6), width: ctl.box.w + 12, height: ctl.box.h + 12 }, 2);
    }
    await thawPage(ctx.cdp, s);

    /* focused shots (ring state) — static style, no freeze needed */
    for (const [key, name] of [['menuItem', 'gallery-menu-focused.png'], ['overlayControl', 'gallery-overlay-focused.png']]) {
      const p = report.surfaces.gallery[key];
      if (!p || !p.found) continue;
      const fresh = await ev(ctx.cdp, s, focusProbe(p.sel));
      report.surfaces.gallery[key + 'Focused'] = fresh;
      if (!fresh || !fresh.box || fresh.box.w < 2) continue;
      await sleep(140);
      const b = { x: Math.max(0, fresh.box.x - 10), y: Math.max(0, fresh.box.y - 10), width: fresh.box.w + 20, height: fresh.box.h + 20 };
      const params = { format: 'png', clip: { ...b, scale: 3 }, fromSurface: true };
      const buf = Buffer.from((await ctx.cdp.send('Page.captureScreenshot', params, s)).data, 'base64');
      fs.writeFileSync(path.join(OUT, name), buf);
      report.surfaces.gallery[key].focusedShot = name;
    }
    await ctx.cdp.send('Target.closeTarget', { targetId: tab.targetId }).catch(() => {});
  }
} finally {
  report.toolchain = { chromeFlags: ctx.flags.filter((f) => /gpu|angle|headless/.test(f)) };
  fs.writeFileSync(path.join(OUT, 'laneH.json'), JSON.stringify(report, null, 2));
  await ctx.close();
}
console.log(JSON.stringify(report, null, 2));
