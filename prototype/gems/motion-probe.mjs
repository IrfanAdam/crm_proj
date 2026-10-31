/* ADAM/GEMS — prototype/gems/motion-probe.mjs · spin-smoothness instrument (rubric criterion 10)
 * — Run: node prototype/gems/motion-probe.mjs <url> <out.json>
 * — Collects 180 rAF samples of the first mounted gem rig's rotation.y, with spin ON,
 * — then reports omega CoV / dt percentiles / stalls / monotonicity. Headless SwiftShader
 * — paces frames itself, so the numbers are host-bound, not rig-bound — say so in any read.
 */
import { spawn } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import WebSocket from 'ws';

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const [url, outPath] = process.argv.slice(2);
if (!url || !outPath) {
  console.error('usage: node prototype/gems/motion-probe.mjs <url> <out.json>');
  process.exit(2);
}

const port = 9200 + Math.floor(Math.random() * 600);
const profile = `/tmp/gem-motion-${port}`;
const chrome = spawn(CHROME, [
  '--headless=new', '--disable-gpu', '--enable-unsafe-swiftshader', '--hide-scrollbars',
  '--no-first-run', '--no-default-browser-check', '--mute-audio',
  `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, 'about:blank',
], { stdio: 'ignore' });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const cleanup = (code) => { try { chrome.kill('SIGKILL'); } catch { /* gone */ } process.exit(code); };
process.on('uncaughtException', (e) => { console.error(String(e)); cleanup(1); });
process.on('unhandledRejection', (e) => { console.error(String(e)); cleanup(1); });

async function wsUrl() {
  for (let i = 0; i < 80; i++) {
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
ws.on('message', (raw) => {
  const m = JSON.parse(raw.toString());
  if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); }
});
let session = null;
const send = (method, params = {}, timeout = 40000) => new Promise((resolve, reject) => {
  const id = ++seq;
  const t = setTimeout(() => { pending.delete(id); reject(new Error(`${method} timeout`)); }, timeout);
  pending.set(id, (m) => {
    clearTimeout(t);
    if (m.error) reject(new Error(`${method}: ${m.error.message}`));
    else resolve(m.result);
  });
  ws.send(JSON.stringify(session ? { id, sessionId: session, method, params } : { id, method, params }));
});

const target = await send('Target.createTarget', { url: 'about:blank' });
const attached = await send('Target.attachToTarget', { targetId: target.targetId, flatten: true });
session = attached.sessionId;
await send('Page.enable');
await send('Runtime.enable');
await send('Emulation.setDeviceMetricsOverride', {
  width: 1500, height: 1200, deviceScaleFactor: 1, mobile: false,
});
await send('Page.navigate', { url });
await sleep(6000);

const EXPR = `(async () => {
  const rs = ((window.GEM3D && window.GEM3D.rigs) || []).filter((r) => r.group);
  if (!rs.length) return JSON.stringify({ error: 'no mounted gem rig' });
  const rig = rs[0];
  const samples = [];
  await new Promise((res) => {
    let n = 0;
    const step = (t) => {
      samples.push([Math.round(t * 10) / 10, rig.group.rotation.y]);
      if (++n >= 180) return res();
      requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  });
  return JSON.stringify({
    rig_cat: (rig.canvas && rig.canvas.dataset.gem) || null,
    samples,
    diagnostics: {
      rigCount: ((window.GEM3D && window.GEM3D.rigs) || []).length,
      rigsWithGroup: rs.length,
      docHidden: document.hidden,
    },
  });
})()`;

const res = await send('Runtime.evaluate', { expression: EXPR, awaitPromise: true, returnByValue: true });
const raw = res && res.result && res.result.value;
if (!raw) throw new Error('no eval result');
const payload = JSON.parse(raw);
if (payload.error) throw new Error(payload.error);

const s = payload.samples;
const ts = s.map((p) => p[0]);
const ys = s.map((p) => p[1]);
const dt = [];
const dr = [];
for (let i = 1; i < s.length; i++) { dt.push(ts[i] - ts[i - 1]); dr.push(ys[i] - ys[i - 1]); }
const omega = dt.map((d, i) => (d > 0 ? dr[i] / d : 0)).filter((v, i) => dt[i] > 0);
const mean = (a) => a.reduce((x, y) => x + y, 0) / a.length;
const pct = (a, p) => { const b = [...a].sort((x, y) => x - y); return b[Math.min(b.length - 1, Math.floor((p / 100) * b.length))]; };
const om = mean(omega) * 1000;
const sd = Math.sqrt(mean(omega.map((v) => (v - mean(omega)) ** 2))) * 1000;
const sign = Math.sign(median(dr));
const mono = dr.every((d) => d * (sign || 1) >= -1e-6);
const out = {
  rig_cat: payload.rig_cat,
  frames: s.length,
  omega_mean_rad_per_s: round(om, 5),
  omega_cov: round(sd / Math.abs(om || 1e-9), 5),
  dt_p50_ms: round(pct(dt, 50), 2),
  dt_p95_ms: round(pct(dt, 95), 2),
  dt_max_ms: round(Math.max(...dt), 2),
  intervals_over_100ms: dt.filter((d) => d > 100).length,
  rotation_span_rad: round(Math.abs(ys[ys.length - 1] - ys[0]), 5),
  monotonic: mono,
  samples: s,
  diagnostics: payload.diagnostics,
};
writeFileSync(outPath, JSON.stringify(out, null, 1));
console.log(JSON.stringify({ ...out, samples: `<${s.length} pairs in ${outPath}>` }, null, 1));
ws.close();
cleanup(0);

function median(a) { const b = [...a].sort((x, y) => x - y); return b[Math.floor(b.length / 2)]; }
function round(v, n) { const f = 10 ** n; return Math.round(v * f) / f; }
