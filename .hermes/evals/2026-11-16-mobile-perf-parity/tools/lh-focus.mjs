#!/usr/bin/env node
/* lh-focus.mjs — focused-state A/B for the three focus-ring defects, one page session each.
 *
 * The old declaration is replayed in-page (a later stylesheet with the pre-fix rule, matched for
 * specificity) instead of running a second tree, so "before" and "after" are the SAME document,
 * same scroll, same frame — the only difference is the declaration under test.
 *
 * Captures are full-viewport PNGs at dpr 1 (1 image px = 1 css px); the crops are cut and encoded
 * in node, because CDP `clip` wants page coordinates and two of these elements are position:fixed.
 */
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { launch, openTab, ev, sleep, waitFor, decodePng, pngDiff } from './deterministic.mjs';

const OUT = path.resolve('lane-H-focus');
fs.mkdirSync(OUT, { recursive: true });
const VP = { w: 430, h: 932 };

const OLD = `
.overlay :focus-visible:not(.btn){outline:var(--focus-ring);outline-offset:2px}
.menu__item:focus-visible{outline:var(--focus-ring);outline-offset:-2px}
.activity-strip__bar[role="button"]:focus-visible{outline:var(--focus-ring);outline-offset:2px;border-radius:var(--radius-full)}
`;

/* ---------- png encode (filter 0), then nearest-neighbour upscale ---------- */
let CRC = null;
function crc32(buf) {
  if (!CRC) {
    CRC = new Int32Array(256);
    for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; CRC[n] = c; }
  }
  let c = -1;
  for (let i = 0; i < buf.length; i++) c = CRC[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ -1) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}
function encodePng(img) {
  const { width, height, data } = img;
  const raw = Buffer.alloc((width * 4 + 1) * height);
  let p = 0;
  for (let y = 0; y < height; y++) {
    raw[p++] = 0;
    for (let x = 0; x < width * 4; x++) raw[p++] = data[y * width * 4 + x];
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0); ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  return Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))]);
}
function crop(img, x, y, w, h) {
  x = Math.max(0, Math.round(x)); y = Math.max(0, Math.round(y));
  w = Math.min(Math.round(w), img.width - x); h = Math.min(Math.round(h), img.height - y);
  const out = new Uint8Array(w * h * 4);
  for (let yy = 0; yy < h; yy++) {
    for (let xx = 0; xx < w; xx++) {
      const s = ((y + yy) * img.width + (x + xx)) * 4, d = (yy * w + xx) * 4;
      out[d] = img.data[s]; out[d + 1] = img.data[s + 1]; out[d + 2] = img.data[s + 2]; out[d + 3] = img.data[s + 3];
    }
  }
  return { width: w, height: h, data: out };
}
function upscale(img, k) {
  const w = img.width * k, h = img.height * k, out = new Uint8Array(w * h * 4);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const s = (Math.floor(y / k) * img.width + Math.floor(x / k)) * 4, d = (y * w + x) * 4;
    out[d] = img.data[s]; out[d + 1] = img.data[s + 1]; out[d + 2] = img.data[s + 2]; out[d + 3] = img.data[s + 3];
  }
  return { width: w, height: h, data: out };
}

const report = { capturedAt: new Date().toISOString(), viewport: VP, dpr: 1, surfaces: {} };
const ctx = await launch();

async function tab(url, ready) {
  const t = await openTab(ctx.cdp, {});
  const s = t.session;
  await ctx.cdp.send('Emulation.setDeviceMetricsOverride', { width: VP.w, height: VP.h, deviceScaleFactor: 1, mobile: true }, s);
  await ctx.cdp.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] }, s);
  await ctx.cdp.send('Page.navigate', { url }, s);
  const ok = await waitFor(async () => (await ev(ctx.cdp, s, ready)) === true, 240000, 250);
  await sleep(1200);
  return { s, ok, target: t.targetId };
}

const shot = async (s) => decodePng(Buffer.from((await ctx.cdp.send('Page.captureScreenshot', { format: 'png', fromSurface: true }, s)).data, 'base64'));

/* the DS menu closes itself on focusout (overlay-behavior.js), so a blur between shots hides it:
   re-assert the open class before every capture or the "focused" frame is a picture of nothing */
const KEEP_OPEN = `(() => {
  const m = document.querySelector('.menu');
  if (m && !m.classList.contains('overlay--open')) { m.hidden = false; m.classList.add('overlay--open'); }
  const o = document.querySelector('.overlay');
  if (o && !o.classList.contains('overlay--open')) o.classList.add('overlay--open');
  return true;
})()`;
const setOld = (s, on) => ev(ctx.cdp, s, `(() => {
  let el = document.getElementById('__lh_old');
  if (${on}) { if (!el) { el = document.createElement('style'); el.id = '__lh_old'; el.textContent = ${JSON.stringify(OLD)}; document.head.appendChild(el); } }
  else if (el) el.remove();
  return !!document.getElementById('__lh_old');
})()`);

/* one control: unfocused old/new, focused old/new, plus a crop and the ring's computed style */
async function probeControl(s, label, sel, padScale = 4) {
  const geo = await ev(ctx.cdp, s, `(() => {
    const el = document.querySelector(${JSON.stringify(sel)});
    if (!el) return null;
    el.scrollIntoView({ block: 'center', inline: 'center' });
    const r = el.getBoundingClientRect();
    return { x: r.x, y: r.y, w: r.width, h: r.height };
  })()`);
  if (!geo || geo.w < 1) return { label, sel, found: false };
  await sleep(250);

  const out = { label, sel, geo: { x: Math.round(geo.x), y: Math.round(geo.y), w: Math.round(geo.w), h: Math.round(geo.h) } };
  const files = {};
  const crops = {};
  for (const swing of ['old', 'new']) {
    for (const state of ['rest', 'focus']) {
      await setOld(s, swing === 'old');
      await ev(ctx.cdp, s, `(() => {
        const el = document.querySelector(${JSON.stringify(sel)});
        if (${state === 'focus' ? 'true' : 'false'}) el.focus({ preventScroll: true }); else el.blur();
        return document.activeElement === el;
      })()`);
      await ev(ctx.cdp, s, KEEP_OPEN);
      if (state === 'focus') await ev(ctx.cdp, s, `document.querySelector(${JSON.stringify(sel)}).focus({ preventScroll: true })`);
      await sleep(220);
      const img = await shot(s);
      const region = { x: geo.x - 12, y: geo.y - 12, w: geo.w + 24, h: geo.h + 24 };
      const cut = crop(img, region.x, region.y, region.w, region.h);
      const name = `${label}--${swing}-${state}.png`;
      fs.writeFileSync(path.join(OUT, name), encodePng(upscale(cut, padScale)));
      crops[`${swing}-${state}`] = cut;
      files[`${swing}-${state}`] = name;
    }
  }
  /* the ring as the browser computes it, for the record */
  out.computed = {};
  for (const swing of ['old', 'new']) {
    await setOld(s, swing === 'old');
    await ev(ctx.cdp, s, `document.querySelector(${JSON.stringify(sel)}).focus({ preventScroll: true })`);
    await sleep(120);
    out.computed[swing] = await ev(ctx.cdp, s, `(() => {
      const el = document.querySelector(${JSON.stringify(sel)}); const cs = getComputedStyle(el);
      return { focusVisible: el.matches(':focus-visible'), outline: cs.outlineStyle + ' ' + cs.outlineWidth + ' ' + cs.outlineColor,
        outlineOffset: cs.outlineOffset, boxShadow: cs.boxShadow };
    })()`);
  }
  await setOld(s, false);
  out.files = files;
  out.diff = {
    'rest old vs new': pngDiff(crops['old-rest'], crops['new-rest']),
    'focus old vs new': pngDiff(crops['old-focus'], crops['new-focus']),
  };
  out.diff = Object.fromEntries(Object.entries(out.diff).map(([k, d]) => [k, { differing: d.differing, pct: d.pct, maxDelta: d.maxChannelDelta }]));
  return out;
}

try {
  /* ---------- app: the peak bar (real keyboard control) ---------- */
  {
    const { s, ok, target } = await tab('http://127.0.0.1:5242/?app=fullscreen',
      `(() => !!document.getElementById('nearby-tiles') && document.querySelectorAll('.activity-strip__bar[role="button"]').length > 0)()`);
    report.surfaces.app = { hydrated: ok };
    report.surfaces.app.peakBar = await probeControl(s, 'app-peak-bar', '.activity-strip__bar[role="button"]', 6);
    await ctx.cdp.send('Target.closeTarget', { targetId: target }).catch(() => {});
  }

  /* ---------- gallery: .menu__item and .overlay__close ---------- */
  {
    const { s, ok, target } = await tab('http://127.0.0.1:5242/gallery.html',
      `(() => document.querySelectorAll('.menu__item').length > 0 && document.querySelectorAll('.overlay').length > 0)()`);
    report.surfaces.gallery = { hydrated: ok };
    /* the menu first, with NO overlay open — an open .overlay is z-index 1030 over the menu's 1000
       and its scrim would cover the crop */
    await ev(ctx.cdp, s, `(() => {
      const unhide = (el) => { for (let n = el; n && n !== document.body; n = n.parentElement) if (n.hasAttribute && n.hasAttribute('hidden')) n.removeAttribute('hidden'); };
      const menu = document.querySelector('.menu');
      if (menu) { unhide(menu); menu.hidden = false; menu.classList.add('overlay--open'); }
      return true;
    })()`);
    await sleep(400);
    report.surfaces.gallery.menuItem = await probeControl(s, 'gallery-menu-item', '.menu.overlay--open .menu__item', 5);

    /* then the overlay's own control */
    await ev(ctx.cdp, s, `(() => {
      const unhide = (el) => { for (let n = el; n && n !== document.body; n = n.parentElement) if (n.hasAttribute && n.hasAttribute('hidden')) n.removeAttribute('hidden'); };
      const ovs = [...document.querySelectorAll('.overlay')];
      const t = ovs.find((o) => o.classList.contains('overlay--open')) || ovs[0];
      if (t) { unhide(t); t.classList.add('overlay--open'); }
      return true;
    })()`);
    await sleep(400);
    report.surfaces.gallery.overlayClose = await probeControl(s, 'gallery-overlay-close', '.overlay.overlay--open .overlay__close', 6);
    await ctx.cdp.send('Target.closeTarget', { targetId: target }).catch(() => {});
  }
} finally {
  fs.writeFileSync(path.join(OUT, 'focus.json'), JSON.stringify(report, null, 2));
  await ctx.close();
}
console.log(JSON.stringify(report, null, 2));
