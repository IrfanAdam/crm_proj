#!/usr/bin/env node
/* lh-map-guard.mjs — the map failure mode, reproduced and then survived.
 *
 * The app loads leaflet-rotate, so `setBearing` exists and the unguarded call never throws here.
 * This script removes the capability from the live Leaflet prototype to recreate the condition the
 * guard exists for, shows the OLD expression throwing the audit's exact error, and shows the SHIPPED
 * expression returning without throwing.
 */
import fs from 'node:fs';
import path from 'node:path';
import { launch, openTab, ev, sleep, waitFor } from './deterministic.mjs';

const OUT = path.resolve('lane-H-focus');
const ctx = await launch();
const t = await openTab(ctx.cdp, {});
const s = t.session;
await ctx.cdp.send('Emulation.setDeviceMetricsOverride', { width: 430, height: 932, deviceScaleFactor: 1, mobile: true }, s);
await ctx.cdp.send('Page.navigate', { url: 'http://127.0.0.1:5242/?app=fullscreen' }, s);
const ready = await waitFor(async () => (await ev(ctx.cdp, s, `document.querySelectorAll('.opps__leafpin').length > 0`)) === true, 240000, 250);
await sleep(800);

const res = await ev(ctx.cdp, s, `(() => {
  const L = window.L;
  const out = { ready: ${ready === true} };
  const div = document.createElement('div');
  div.style.cssText = 'position:fixed;left:-9999px;top:0;width:300px;height:200px';
  document.body.appendChild(div);
  const icon = L.divIcon({ className: 'x', html: '<i></i>', iconSize: [10, 10] });
  const m = L.map(div, { center: [19.0759, 72.8777], zoom: 12, rotate: true, bearing: 145, zoomControl: false, attributionControl: false });
  L.marker([19.06, 72.86], { icon }).addTo(m);
  out.bearing = m.getBearing();
  out.before = typeof m.setBearing;

  /* remove the plugin capability from the prototype the instance inherits from */
  const saved = L.Map.prototype.setBearing;
  delete L.Map.prototype.setBearing;
  out.after = typeof m.setBearing;

  /* the OLD line, verbatim from live-map.js@b97b1de */
  out.oldCall = null;
  try { const applyBearing = () => m.setBearing(145); applyBearing(); out.oldCall = 'no throw'; }
  catch (e) { out.oldCall = e.name + ': ' + e.message; }

  /* the SHIPPED line */
  const BEARING = 145;
  let tilesAfter = 0;
  out.newCall = null;
  try {
    const applyBearing = () => { if (typeof m.setBearing === 'function') m.setBearing(BEARING); };
    applyBearing();
    /* the rest of createLiveMap still runs: layers can be added after the call */
    L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}', { maxZoom: 19 }).addTo(m);
    out.newCall = 'no throw';
    tilesAfter = div.querySelectorAll('.leaflet-tile').length;
    out.markersAfter = div.querySelectorAll('.leaflet-marker-icon').length;
  } catch (e) { out.newCall = e.name + ': ' + e.message; }

  L.Map.prototype.setBearing = saved;
  out.restored = typeof m.setBearing;
  m.remove();
  div.remove();
  return out;
})()`);

const live = await ev(ctx.cdp, s, `(() => {
  const host = document.getElementById('nearby-tiles');
  const rp = host.querySelector('.leaflet-rotate-pane');
  return { tiles: host.querySelectorAll('.leaflet-tile').length, markers: host.querySelectorAll('.leaflet-marker-icon').length,
    hotspot: !!host.querySelector('.opps__hotspot'), rotatePaneTf: rp ? getComputedStyle(rp).transform : null,
    errs: (window.__errs || []).map((e) => e.kind + ': ' + e.msg) };
})()`);

const out = { guard: res, liveAfterRestore: live, capturedAt: new Date().toISOString() };
fs.writeFileSync(path.join(OUT, 'map-guard.json'), JSON.stringify(out, null, 2));
console.log(JSON.stringify(out, null, 2));
await ctx.close();
