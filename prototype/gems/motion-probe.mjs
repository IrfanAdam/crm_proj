/* ADAM/GEMS — prototype/gems/motion-probe.mjs · spin smoothness (rubric #10)
 * node prototype/gems/motion-probe.mjs <url> <out.json> — 180 rAF samples, spin ON.
 * Headless SwiftShader paces frames itself: CoV is host-bound, not rig-bound. */
import { spawn } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import WebSocket from 'ws';
const [url, outPath] = process.argv.slice(2);
if (!url || !outPath) { console.error('usage: <url> <out.json>'); process.exit(2); }
const port = 9200 + Math.floor(Math.random() * 600), sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const chrome = spawn('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  ['--headless=new', '--disable-gpu', '--enable-unsafe-swiftshader', '--hide-scrollbars', '--no-first-run',
    '--no-default-browser-check', '--mute-audio', `--remote-debugging-port=${port}`,
    `--user-data-dir=/tmp/gem-motion-${port}`, 'about:blank'], { stdio: 'ignore' });
const die = (c) => { try { chrome.kill('SIGKILL'); } catch { /* gone */ } process.exit(c); };
process.on('uncaughtException', (e) => { console.error(String(e)); die(1); });
process.on('unhandledRejection', (e) => { console.error(String(e)); die(1); });
const wsUrl = async () => {
  for (let i = 0; i < 80; i++) {
    try { return (await (await fetch(`http://127.0.0.1:${port}/json/version`)).json()).webSocketDebuggerUrl; }
    catch { await sleep(250); }
  }
  throw new Error('chrome did not boot');
};
const ws = new WebSocket(await wsUrl(), { perMessageDeflate: false });
await new Promise((r) => ws.on('open', r));
let seq = 0, session = null;
const pending = new Map();
ws.on('message', (raw) => {
  const m = JSON.parse(raw.toString());
  if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); }
});
const send = (method, params = {}) => new Promise((resolve, reject) => {
  const id = ++seq, t = setTimeout(() => { pending.delete(id); reject(new Error(`${method} timeout`)); }, 40000);
  pending.set(id, (m) => { clearTimeout(t); m.error ? reject(new Error(m.error.message)) : resolve(m.result); });
  ws.send(JSON.stringify(session ? { id, sessionId: session, method, params } : { id, method, params }));
});
const tgt = await send('Target.createTarget', { url: 'about:blank' });
session = (await send('Target.attachToTarget', { targetId: tgt.targetId, flatten: true })).sessionId;
await send('Page.enable'); await send('Runtime.enable');
await send('Emulation.setDeviceMetricsOverride', { width: 1500, height: 1200, deviceScaleFactor: 1, mobile: false });
await send('Page.navigate', { url }); await sleep(6000);
const EXPR = `(async()=>{const rs=((window.GEM3D&&window.GEM3D.rigs)||[]).filter(r=>r.group);
if(!rs.length)return JSON.stringify({error:'no mounted gem rig'});const rig=rs[0],samples=[];
await new Promise(res=>{let n=0;const step=t=>{samples.push([Math.round(t*10)/10,rig.group.rotation.y]);
if(++n>=180)return res();requestAnimationFrame(step)};requestAnimationFrame(step)});
return JSON.stringify({rig_cat:(rig.canvas&&rig.canvas.dataset.gem)||null,samples,
diagnostics:{rigCount:((window.GEM3D&&window.GEM3D.rigs)||[]).length,rigsWithGroup:rs.length,docHidden:document.hidden}})})()`;
const ev = await send('Runtime.evaluate', { expression: EXPR, awaitPromise: true, returnByValue: true });
const raw = ev && ev.result && ev.result.value;
if (!raw) throw new Error('no eval result');
const p = JSON.parse(raw);
if (p.error) throw new Error(p.error);
const s = p.samples, ts = s.map((q) => q[0]), ys = s.map((q) => q[1]), dt = [], dr = [];
for (let i = 1; i < s.length; i++) { dt.push(ts[i] - ts[i - 1]); dr.push(ys[i] - ys[i - 1]); }
const om = dt.map((d, i) => (d > 0 ? dr[i] / d : null)).filter((v) => v !== null);
const mean = (a) => a.reduce((x, y) => x + y, 0) / a.length;
const pct = (a, pc) => [...a].sort((x, y) => x - y)[Math.min(a.length - 1, Math.floor((pc / 100) * a.length))];
const m = mean(om) * 1000, sd = Math.sqrt(mean(om.map((v) => (v - mean(om)) ** 2))) * 1000;
const sgn = Math.sign([...dr].sort((x, y) => x - y)[Math.floor(dr.length / 2)]);
const out = { rig_cat: p.rig_cat, frames: s.length, omega_mean_rad_per_s: +m.toFixed(5),
  omega_cov: +(sd / Math.abs(m || 1e-9)).toFixed(5), dt_p50_ms: +pct(dt, 50).toFixed(2),
  dt_p95_ms: +pct(dt, 95).toFixed(2), dt_max_ms: +Math.max(...dt).toFixed(2),
  intervals_over_100ms: dt.filter((d) => d > 100).length,
  rotation_span_rad: +Math.abs(ys[ys.length - 1] - ys[0]).toFixed(5),
  monotonic: dr.every((d) => d * (sgn || 1) >= -1e-6), samples: s, diagnostics: p.diagnostics };
writeFileSync(outPath, JSON.stringify(out, null, 1));
console.log(JSON.stringify({ ...out, samples: `<${s.length} pairs in ${outPath}>` }, null, 1));
ws.close(); die(0);
