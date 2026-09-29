/* ADAM/GEMS — prototype/gems/illusion-probe.mjs · timed parity + interaction probe */
// [plan:2026-09-28_221212-illusion-cube-recreation.md#{#phase-6}] · proof harness (Tasks 33,36,39,40).
// — Run: node prototype/gems/illusion-probe.mjs <url> <out> [--at 0..15] [--click ms] [--sample "expr"] [--still] [--clip sel] [--size WxH] [--scale 1] [--wait ms]
// — Out: <out>/fNN.png + JSON {frames, series, gaps, consoleErrors, elapsedMs} on stdout.
// — Map: flag · wsUrl · send (retries once on nav-kill/timeout except Input.*) · readJSON · jump/raf/shot · click · gaps · main · cleanup kills chrome on crash.
import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync, rmSync } from 'node:fs';
import WebSocket from 'ws';
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const args = process.argv.slice(2);
const flag = (n, d) => { const i = args.indexOf('--' + n); return i < 0 ? d : (args[i + 1] ?? ''); };
const has = (n) => args.includes('--' + n);
const url = args[0], out = args[1];
const atRaw = flag('at', '0..15');
const ats = atRaw.includes('..') ? (() => { const [a, b] = atRaw.split('..').map(Number); return Array.from({ length: b - a + 1 }, (_, i) => a + i); })() : atRaw.split(',').map(Number);
const size = flag('size', '880x660').split('x').map(Number);
const scale = Number(flag('scale', 1)), wait = Number(flag('wait', 6000));
const clickMs = has('click') ? Number(flag('click', 0)) : -1;
const sampleExpr = flag('sample', ''), clipSel = flag('clip', '.cube-stage__frame');
mkdirSync(out, { recursive: true });
const t0 = Date.now();
const port = 9200 + Math.floor(Math.random() * 600), profile = `/tmp/illusion-probe-${port}`;
const chrome = spawn(CHROME, ['--headless=new', '--disable-gpu', '--enable-unsafe-swiftshader', '--hide-scrollbars', '--no-first-run', '--no-default-browser-check', '--mute-audio', `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, 'about:blank'], { stdio: 'ignore' });
const cleanup = () => { try { chrome.kill('SIGKILL'); } catch {} try { rmSync(profile, { recursive: true, force: true }); } catch {} process.exit(1); };
process.on('uncaughtException', cleanup); process.on('unhandledRejection', cleanup);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function wsUrl() { for (let i = 0; i < 60; i++) { try { const r = await fetch(`http://127.0.0.1:${port}/json/version`); return (await r.json()).webSocketDebuggerUrl; } catch { await sleep(250); } } throw new Error('chrome did not boot'); }
const ws = new WebSocket(await wsUrl(), { perMessageDeflate: false });
await new Promise((r) => ws.on('open', r));
let seq = 0; const pending = new Map(); const consoleErrors = [];
ws.on('message', (raw) => { const m = JSON.parse(raw.toString()); if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); return; } if (m.method === 'Log.entryAdded' && m.params.entry.level === 'error') consoleErrors.push(m.params.entry.text.slice(0, 200)); if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') consoleErrors.push((m.params.args || []).map((a) => String(a.value ?? a.description ?? '')).join(' ').slice(0, 300)); if (m.method === 'Runtime.exceptionThrown') consoleErrors.push(String(m.params.exceptionDetails.text).slice(0, 200)); });
let session = null;
const send = (method, params = {}, timeout = 20000) => new Promise((resolve, reject) => {
const again = (n) => n > 0 && !method.startsWith('Input.');
const attempt = (n) => { const id = ++seq; const t = setTimeout(() => { pending.delete(id); if (again(n)) setTimeout(() => attempt(n - 1), 400); else reject(new Error(method + ' timeout')); }, timeout); pending.set(id, (m) => { clearTimeout(t); if (!m.error) { resolve(m.result); } else if (again(n)) { setTimeout(() => attempt(n - 1), 400); } else { reject(new Error(method + ': ' + m.error.message)); } }); ws.send(JSON.stringify(session ? { id, sessionId: session, method, params } : { id, method, params })); };
attempt(1);
});
const readJSON = async (expr, timeout) => { const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true }, timeout); return r.result && r.result.value; };
await send('Target.createTarget', { url: 'about:blank' }).then(async (t) => { session = (await send('Target.attachToTarget', { targetId: t.targetId, flatten: true })).sessionId; });
await send('Page.enable'); await send('Runtime.enable'); await send('Log.enable');
if (has('still')) await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
await send('Emulation.setDeviceMetricsOverride', { width: size[0], height: size[1], deviceScaleFactor: scale, mobile: false });
await send('Page.navigate', { url }); await sleep(wait);
const rect = JSON.parse(await readJSON(`JSON.stringify((()=>{const el=document.querySelector(${JSON.stringify(clipSel)});if(!el)return null;const b=el.getBoundingClientRect();return{x:Math.round(b.x),y:Math.round(b.y),width:Math.round(b.width),height:Math.round(b.height)};})())`) || 'null');
const clip = rect ? { x: rect.x, y: rect.y, width: rect.width, height: rect.height, scale: 1 } : undefined;
const shot = async (f) => { const r = await send('Page.captureScreenshot', clip ? { format: 'png', clip, captureBeyondViewport: true } : { format: 'png', captureBeyondViewport: true }); writeFileSync(`${out}/${f}`, Buffer.from(r.data, 'base64')); };
const jump = async (t) => readJSON(`(()=>{const r=window.ILLUSION3D&&window.ILLUSION3D.rigs[0];if(!r)return'gap:no-rig';r.clock=${t};r.t=${t};r.last=performance.now();return'ok';})()`);
const raf = () => readJSON(`new Promise((res)=>requestAnimationFrame((t)=>res(t)))`);
const series = []; let clicked = false;
const pad = (n) => String(n).padStart(2, '0');
for (const t of ats) {
  const j = await jump(t); await raf();
  if (clickMs >= 0 && !clicked) {
    await shot(`f${pad(t)}.png`); series.push({ t, jump: j, click: 'pre', sample: sampleExpr ? await readJSON(sampleExpr) : null }); await sleep(clickMs);
    const c = await readJSON(`(()=>{const c=document.querySelector('canvas[data-illusion]');if(!c)return null;const b=c.getBoundingClientRect();return JSON.stringify({x:b.x+b.width/2,y:b.y+b.height/2});})()`);
    if (c) { const p = JSON.parse(c); await send('Input.dispatchMouseEvent', { type: 'mousePressed', x: p.x, y: p.y, button: 'left', clickCount: 1 }); await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: p.x, y: p.y, button: 'left', clickCount: 1 }); }
    clicked = true; series.push({ t, click: c ? 'sent' : 'gap:no-canvas', sample: sampleExpr ? await readJSON(sampleExpr) : null }); continue;
  }
  series.push({ t, jump: j, sample: sampleExpr ? await readJSON(sampleExpr) : null }); await shot(`f${pad(t)}.png`);
}
const gaps = JSON.parse(await readJSON(`new Promise((res)=>{const ts=[],g={};const step=(t)=>{ts.push(t);if(ts.length<61)return requestAnimationFrame(step);const d=ts.slice(1).map((v,i)=>v-ts[i]).sort((a,b)=>a-b);g.rafP50=+d[30].toFixed(2);g.rafP95=+d[Math.floor(d.length*0.95)].toFixed(2);try{g.longtasks=performance.getEntriesByType('longtask').length;}catch{g.longtasks='gap:unsupported';}const r=window.ILLUSION3D&&window.ILLUSION3D.rigs[0];g.frames=r?(r.frames??'gap:no-frames-counter'):'gap:no-rig';g.nan=/NaN/.test(JSON.stringify(r?{t:r.t,clock:r.clock}:null))?'FOUND':'none';g.notFound=performance.getEntriesByType('resource').filter((x)=>x.responseStatus===404).map((x)=>x.name).slice(0,5);g.revision=window.THREE&&window.THREE.REVISION;g.rigs=window.ILLUSION3D?window.ILLUSION3D.rigs.length:-1;g.still=!!(window.ILLUSION3D&&window.ILLUSION3D.still);res(JSON.stringify(g));};requestAnimationFrame(step)})`, 120000) || '{}');
console.log(JSON.stringify({ frames: series.map((s) => s.t), series, gaps, consoleErrors: consoleErrors.slice(0, 8), elapsedMs: Date.now() - t0 }, null, 2));
ws.close(); chrome.kill(); try { rmSync(profile, { recursive: true, force: true }); } catch {} process.exit(0);
