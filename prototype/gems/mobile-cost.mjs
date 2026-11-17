/* ADAM/GEMS — prototype/gems/mobile-cost.mjs · per-frame cost of a gem rig at phone canvas sizes
 * [plan:2026-10-03_144222-gem-round2.md#phase-18] · Task 57 harness.
 * Run: node prototype/gems/mobile-cost.mjs [--url <page>] [--cpu 4] [--out dir]
 * Method: park the rig (rAF cancelled, vis=false, spin=0), pose it, then time 40 renderer.render() calls between two
 * gl.readPixels syncs — one sync per batch measures throughput (a frame budget), not latency. Bloom and the folded
 * plane set toggle, so the trace's share is isolated from the bloom chain's. headless=new on ANGLE/Metal.
 */
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import WebSocket from 'ws';

const CHROME = process.env.CHROME_BIN || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const args = process.argv.slice(2);
const flag = (n, d) => { const i = args.indexOf('--' + n); return i < 0 ? d : args[i + 1]; };
const URL_ = flag('url', 'http://127.0.0.1:5240/gallery.html');
const CPU = Number(flag('cpu', 4));
const OUT = flag('out', '');
const SIZES = [[812, 356], [786, 1000], [1179, 1500]];
const FRAMES = 40;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const freePort = async () => { const net = await import('node:net'); return new Promise((res) => { const s = net.createServer(); s.listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => res(p)); }); }); };
class CDP {
  constructor(ws) { this.ws = ws; this.id = 0; this.p = new Map();
    ws.on('message', (raw) => { const m = JSON.parse(raw.toString()); if (m.id && this.p.has(m.id)) { const { res, rej } = this.p.get(m.id); this.p.delete(m.id); m.error ? rej(new Error(m.error.message)) : res(m.result); } }); }
  send(method, params = {}, sessionId) { const id = ++this.id; const msg = { id, method, params }; if (sessionId) msg.sessionId = sessionId;
    return new Promise((res, rej) => { this.p.set(id, { res, rej }); this.ws.send(JSON.stringify(msg)); }); }
}

const port = await freePort();
const profile = path.join(os.tmpdir(), 'gem-cost-' + process.pid + '-' + port);
fs.mkdirSync(profile, { recursive: true });
const chrome = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`,
  '--no-first-run', '--no-default-browser-check', '--hide-scrollbars', '--mute-audio', '--no-sandbox',
  '--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist', '--window-size=800,900', 'about:blank'], { stdio: 'ignore' });
let version;
for (let i = 0; i < 100; i++) { try { version = await (await fetch(`http://127.0.0.1:${port}/json/version`)).json(); break; } catch { await sleep(200); } }
if (!version) { chrome.kill('SIGKILL'); throw new Error('chrome never came up'); }
const ws = new WebSocket(version.webSocketDebuggerUrl, { perMessageDeflate: false, maxPayload: 128 * 1024 * 1024 });
await new Promise((res, rej) => { ws.once('open', res); ws.once('error', rej); });
const cdp = new CDP(ws);
const { targetId } = await cdp.send('Target.createTarget', { url: 'about:blank' });
const { sessionId: S } = await cdp.send('Target.attachToTarget', { targetId, flatten: true });
await cdp.send('Page.enable', {}, S);
await cdp.send('Runtime.enable', {}, S);
await cdp.send('Emulation.setDeviceMetricsOverride', { width: 393, height: 852, deviceScaleFactor: 3, mobile: true }, S);
if (CPU > 1) await cdp.send('Emulation.setCPUThrottlingRate', { rate: CPU }, S);
const ev = async (expr, awaitPromise = true) => {
  const r = await cdp.send('Runtime.evaluate', { expression: expr, awaitPromise, returnByValue: true }, S);
  if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text);
  return r.result.value;
};

async function measure(url, bloom) {
  await cdp.send('Page.navigate', { url }, S);
  await sleep(1400);
  for (let i = 0; i < 80; i++) { if (await ev(`!!(window.GEM3D && GEM3D.rigs.length && GEM3D.rigs[0].renderer)`)) break; await sleep(250); }
  await ev(`(() => { const b = document.querySelector('button[data-tab="gems"]'); if (b) b.click(); return 1; })()`);
  await sleep(1400);
  return ev(`(() => {
    if (window.GEM_BLOOM && GEM_BLOOM.on() !== ${bloom}) document.querySelectorAll('[data-gem-bloom]').forEach((el) => el.click());
    const rig = window.GEM3D.rigs.find((r) => r.renderer), { renderer, scene, camera } = rig;
    const gl = renderer.getContext(), px = new Uint8Array(4);
    if (rig.raf) cancelAnimationFrame(rig.raf); rig.raf = 0; rig.vis = false; rig.cat.spin = 0;
    rig.group.rotation.set(-0.15, 0, 0); renderer.setPixelRatio(1);
    const sizes = ${JSON.stringify(SIZES)}, out = [];
    for (const [w, h] of sizes) {
      renderer.setSize(w, h, false);
      for (let i = 0; i < 6; i++) renderer.render(scene, camera);
      gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px);
      const runs = [];
      for (let r = 0; r < 3; r++) {
        const t0 = performance.now();
        for (let i = 0; i < ${FRAMES}; i++) renderer.render(scene, camera);
        gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px);
        runs.push(+((performance.now() - t0) / ${FRAMES}).toFixed(3));
      }
      runs.sort((a, b) => a - b);
      out.push({ size: w + 'x' + h, ms: runs[1], runs });
    }
    const m = rig.mats[0];
    return { bloom: GEM_BLOOM.on(), fold: !!(m.defines && m.defines.FOLD), planes: m.uniforms.uCount.value, out };
  })()`);
}

const rows = {};
rows['full'] = await measure(URL_, true);
rows['no-bloom'] = await measure(URL_, false);
rows['no-fold'] = await measure(URL_ + (URL_.includes('?') ? '&' : '?') + 'gemfold=0', false);
const report = { url: URL_, cpu: CPU, frames: FRAMES, rows };
console.log(JSON.stringify(report, null, 1));
if (OUT) { fs.mkdirSync(OUT, { recursive: true }); fs.writeFileSync(path.join(OUT, 'mobile-cost.json'), JSON.stringify(report, null, 1)); }
cdp.send('Browser.close').catch(() => {});
chrome.kill('SIGKILL');
ws.close();
await sleep(200);
try { fs.rmSync(profile, { recursive: true, force: true, maxRetries: 5 }); } catch (e) {}
