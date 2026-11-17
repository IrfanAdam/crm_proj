#!/usr/bin/env node
/* lh-look.mjs — one look at the gallery with the DS menu forced open: where does it paint? */
import fs from 'node:fs';
import path from 'node:path';
import { launch, openTab, ev, sleep, waitFor } from './deterministic.mjs';

const OUT = path.resolve('lane-H-focus');
const ctx = await launch();
const t = await openTab(ctx.cdp, {});
const s = t.session;
await ctx.cdp.send('Emulation.setDeviceMetricsOverride', { width: 430, height: 932, deviceScaleFactor: 2, mobile: true }, s);
await ctx.cdp.send('Page.navigate', { url: 'http://127.0.0.1:5242/gallery.html' }, s);
await waitFor(async () => (await ev(ctx.cdp, s, `document.querySelectorAll('.menu__item').length > 0`)) === true, 240000, 250);
await sleep(1500);
const info = await ev(ctx.cdp, s, `(() => {
  const unhide = (el) => { for (let n = el; n && n !== document.body; n = n.parentElement) if (n.hasAttribute && n.hasAttribute('hidden')) n.removeAttribute('hidden'); };
  const m = document.querySelector('.menu');
  unhide(m); m.hidden = false; m.classList.add('overlay--open');
  m.scrollIntoView({ block: 'center' });
  const cs = getComputedStyle(m), r = m.getBoundingClientRect();
  const chain = []; for (let n = m; n && n !== document.body; n = n.parentElement) { const c = getComputedStyle(n); chain.push({ tag: n.tagName + '.' + (n.className || ''), overflow: c.overflow, opacity: c.opacity, display: c.display, visibility: c.visibility, h: Math.round(n.getBoundingClientRect().height) }); }
  return { rect: { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) },
    opacity: cs.opacity, display: cs.display, visibility: cs.visibility, transform: cs.transform, zIndex: cs.zIndex,
    items: [...m.querySelectorAll('.menu__item')].map((i) => ({ text: i.textContent.trim(), h: Math.round(i.getBoundingClientRect().height), op: getComputedStyle(i).opacity })),
    chain: chain.slice(0, 8) };
})()`);
await sleep(400);
const buf = Buffer.from((await ctx.cdp.send('Page.captureScreenshot', { format: 'png' }, s)).data, 'base64');
fs.writeFileSync(path.join(OUT, 'gallery-viewport.png'), buf);
console.log(JSON.stringify(info, null, 1));
await ctx.close();
