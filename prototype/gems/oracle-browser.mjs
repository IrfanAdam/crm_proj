/* ADAM/GEMS — prototype/gems/oracle-browser.mjs · headless Chrome boot for --capture (software raster, swiftshader).
 * [plan:2026-10-03_144222-gem-realism-round2.md#phase-18] · split out of pixel-oracle.mjs, verbatim.
 */
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import WebSocket from 'ws';
import { CHROME, sleep } from './oracle-args.mjs';
import { CDP, freePort } from './oracle-cdp.mjs';

// ── capture mode ────────────────────────────────────────────────────────────────────────────────────────────────
export async function bootBrowser() {
  const port = await freePort(9200);
  const profile = path.join(os.tmpdir(), 'gem-oracle-' + process.pid + '-' + port);
  fs.mkdirSync(profile, { recursive: true });
  const chrome = spawn(CHROME, ['--headless=new', '--disable-gpu', '--enable-unsafe-swiftshader', '--hide-scrollbars',
    '--disable-accelerated-2d-canvas', '--no-first-run', '--no-default-browser-check', '--mute-audio', '--no-sandbox',
    `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, 'about:blank'], { stdio: 'ignore' });
  let ver; for (let i = 0; i < 120; i++) { try { ver = await (await fetch(`http://127.0.0.1:${port}/json/version`)).json(); break; } catch { await sleep(200); } }
  if (!ver) { chrome.kill('SIGKILL'); throw new Error('chrome did not boot'); }
  const ws = new WebSocket(ver.webSocketDebuggerUrl, { perMessageDeflate: false, maxPayload: 512 * 1024 * 1024 });
  await new Promise((res, rej) => { ws.once('open', res); ws.once('error', rej); });
  const cdp = new CDP(ws);
  const { targetId } = await cdp.send('Target.createTarget', { url: 'about:blank' });
  const { sessionId: S } = await cdp.send('Target.attachToTarget', { targetId, flatten: true });
  await cdp.send('Page.enable', {}, S); await cdp.send('Runtime.enable', {}, S); await cdp.send('Log.enable', {}, S);
  await cdp.send('Emulation.setDeviceMetricsOverride', { width: 393, height: 852, deviceScaleFactor: 2, mobile: true }, S);
  const ev = async (expr) => { const r = await cdp.send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true }, S);
    if (r.exceptionDetails) throw new Error((r.exceptionDetails.exception?.description || r.exceptionDetails.text || '').slice(0, 300));
    return r.result.value; };
  const kill = () => { try { ws.close(); } catch {} chrome.kill('SIGKILL'); try { fs.rmSync(profile, { recursive: true, force: true }); } catch {} };
  return { cdp, S, ev, kill };
}
