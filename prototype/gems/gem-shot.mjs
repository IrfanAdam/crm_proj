/* ADAM/GEMS — prototype/gems/gem-shot.mjs · headless shot + probe rig for gem rating */
// [plan:2026-09-21_000000-lump-sum-builds.md#phase-5] · rating instrument (Task 20).
// — Run: node prototype/gems/gem-shot.mjs <url> <outdir> [--scale 2] [--wait 3500]
// —        [--clip css-selector]... [--eval "expr"] [--size WxH]
// — Out: <outdir>/full.png + <outdir>/clip-N.png + JSON probe summary on stdout.
import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync, rmSync } from 'node:fs';
import WebSocket from 'ws';

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const args = process.argv.slice(2);
const flag = (n, d) => { const i = args.indexOf('--' + n); return i < 0 ? d : args[i + 1]; };
const clips = args.flatMap((a, i) => (a === '--clip' ? [args[i + 1]] : []));
const url = args[0];
const out = args[1];
const size = flag('size', '1500x1200').split('x').map(Number);
const scale = Number(flag('scale', 2));
const wait = Number(flag('wait', 3500));
const evalExpr = flag('eval', '');
mkdirSync(out, { recursive: true });
const port = 9200 + Math.floor(Math.random() * 600);
const profile = `/tmp/gem-shot-${port}`;
const chrome = spawn(CHROME, [
  '--headless=new', '--disable-gpu', '--enable-unsafe-swiftshader', '--hide-scrollbars',
  '--no-first-run', '--no-default-browser-check', '--mute-audio',
  `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, 'about:blank',
], { stdio: 'ignore' });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function wsUrl() {
  for (let i = 0; i < 60; i++) {
    try {
      const r = await fetch(`http://127.0.0.1:${port}/json/version`);
      return (await r.json()).webSocketDebuggerUrl;
    } catch { await sleep(250); }
  }
  throw new Error('chrome did not boot');
}

const ws = new WebSocket(await wsUrl(), { perMessageDeflate: false });
await new Promise((r) => ws.on('open', r));
let seq = 0;
const pending = new Map();
const consoleErrors = [];
ws.on('message', (raw) => {
  const m = JSON.parse(raw.toString());
  if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); return; }
  if (m.method === 'Log.entryAdded' && m.params.entry.level === 'error') consoleErrors.push(m.params.entry.text.slice(0, 200));
  if (m.method === 'Runtime.exceptionThrown') consoleErrors.push(String(m.params.exceptionDetails.text).slice(0, 200));
});
let session = null;
const send = (method, params = {}, timeout = 20000) => new Promise((resolve, reject) => {
  const id = ++seq;
  const t = setTimeout(() => { pending.delete(id); reject(new Error(method + ' timeout')); }, timeout);
  pending.set(id, (m) => { clearTimeout(t); m.error ? reject(new Error(method + ': ' + m.error.message)) : resolve(m.result); });
  ws.send(JSON.stringify(session ? { id, sessionId: session, method, params } : { id, method, params }));
});

await send('Target.createTarget', { url: 'about:blank' }).then(async (t) => {
  const a = await send('Target.attachToTarget', { targetId: t.targetId, flatten: true });
  session = a.sessionId;
});
await send('Page.enable');
await send('Runtime.enable');
await send('Log.enable');
await send('Emulation.setDeviceMetricsOverride', { width: size[0], height: size[1], deviceScaleFactor: scale, mobile: false });
await send('Page.navigate', { url });
await sleep(wait);

const readJSON = async (expr) => {
  const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true });
  return r.result && r.result.value;
};
const fps = evalExpr ? await readJSON(evalExpr) : null;
const rects = clips.length
  ? await readJSON(`JSON.stringify(${JSON.stringify(clips)}.map((s) => { const els = Array.from(document.querySelectorAll(s));
      const el = els.find((e) => e.getBoundingClientRect().width > 0); if (!el) return null;
      const b = el.getBoundingClientRect(); return { x: Math.round(b.x + window.scrollX), y: Math.round(b.y + window.scrollY), w: Math.round(b.width), h: Math.round(b.height) }; }))`)
  : '[]';
const shot = async (clip, file) => {
  const r = await send('Page.captureScreenshot', clip ? { format: 'png', clip, captureBeyondViewport: true } : { format: 'png', captureBeyondViewport: true });
  writeFileSync(file, Buffer.from(r.data, 'base64'));
};
await shot(null, `${out}/full.png`);
const list = JSON.parse(rects || '[]');
for (let i = 0; i < list.length; i++) {
  if (!list[i] || list[i].w < 2) continue;
  const clip = { x: Math.max(0, list[i].x), y: Math.max(0, list[i].y), width: list[i].w, height: list[i].h, scale: 1 };
  await shot(clip, `${out}/clip-${i}.png`);
}
const probe = await readJSON(`JSON.stringify((() => { const g = window.THREE; return { revision: g ? g.REVISION : null,
  gems: document.querySelectorAll('canvas[data-gem]').length, mounted: document.querySelectorAll('canvas[data-gem][data-gem-done]').length,
  notFound: performance.getEntriesByType('resource').filter((r) => r.responseStatus === 404).map((r) => r.name).slice(0, 5),
  title: document.title }; })())`);
console.log(JSON.stringify({ probe: JSON.parse(probe || '{}'), fps, consoleErrors: consoleErrors.slice(0, 8) }, null, 2));
ws.close();
chrome.kill();
try { rmSync(profile, { recursive: true, force: true }); } catch {}
process.exit(0);
