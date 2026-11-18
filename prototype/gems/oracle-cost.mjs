/* ADAM/GEMS — prototype/gems/oracle-cost.mjs · --cost mode: mobile-cost.mjs on the real GPU plus a same-page read-back.
 * [plan:2026-10-03_144222-gem-realism-round2.md#phase-18] · split out of pixel-oracle.mjs, verbatim.
 */
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import WebSocket from 'ws';
import { CHROME, flag, sleep } from './oracle-args.mjs';
import { CDP, freePort, headSha, serve } from './oracle-cdp.mjs';

// ── cost re-baseline mode: mobile-cost.mjs on the real GPU + the uniform/texture read-back in one invocation ────
const COST_READ = `(() => {
  const rig = (window.GEM3D && window.GEM3D.rigs.find((r) => r.renderer)); if (!rig) return { rig: false };
  const m = rig.mats[0], gl = rig.renderer.getContext();
  return { gem: rig.canvas.dataset.gem, choice: window.GEM_FACETS ? window.GEM_FACETS.choice : '', uCount: m.uniforms.uCount.value,
    planeCount: window.GEM_FACETS ? window.GEM_FACETS.planes.count : 0, PLTEX: !!(m.defines && m.defines.PLTEX),
    maxFragUniformVectors: gl.getParameter(gl.MAX_FRAGMENT_UNIFORM_VECTORS), glRenderer: gl.getParameter(gl.RENDERER),
    uBounce: m.uniforms.uBounce.value, uTaps: m.uniforms.uTaps.value, bloom: !!(window.GEM_BLOOM && window.GEM_BLOOM.on()),
    programs: (rig.renderer.info.programs || []).length, canvas: [rig.canvas.width, rig.canvas.height] };
})()`;
async function readback(base) {
  const port = await freePort(9200);
  const profile = path.join(os.tmpdir(), 'gem-read-' + process.pid + '-' + port);
  fs.mkdirSync(profile, { recursive: true });
  const chrome = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`,
    '--no-first-run', '--no-default-browser-check', '--hide-scrollbars', '--mute-audio', '--no-sandbox',
    '--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist', '--window-size=800,900', 'about:blank'], { stdio: 'ignore' });
  let ver; for (let i = 0; i < 120; i++) { try { ver = await (await fetch(`http://127.0.0.1:${port}/json/version`)).json(); break; } catch { await sleep(200); } }
  const ws = new WebSocket(ver.webSocketDebuggerUrl, { perMessageDeflate: false, maxPayload: 64 * 1024 * 1024 });
  await new Promise((res, rej) => { ws.once('open', res); ws.once('error', rej); });
  const cdp = new CDP(ws);
  const { targetId } = await cdp.send('Target.createTarget', { url: 'about:blank' });
  const { sessionId: S } = await cdp.send('Target.attachToTarget', { targetId, flatten: true });
  await cdp.send('Page.enable', {}, S); await cdp.send('Runtime.enable', {}, S);
  await cdp.send('Emulation.setDeviceMetricsOverride', { width: 393, height: 852, deviceScaleFactor: 3, mobile: true }, S);
  const ev = async (e) => { const r = await cdp.send('Runtime.evaluate', { expression: e, returnByValue: true, awaitPromise: true }, S);
    return r.exceptionDetails ? { err: (r.exceptionDetails.exception?.description || r.exceptionDetails.text || '').slice(0, 200) } : r.result.value; };
  const at = async (url, boot) => {
    await cdp.send('Page.navigate', { url }, S); await sleep(2000);
    for (let i = 0; i < 80; i++) { if (await ev(`!!(window.GEM3D && window.GEM_FACETS)`)) break; await sleep(250); }
    await ev(boot); await sleep(2500);
    for (let i = 0; i < 40; i++) { const r = await ev(COST_READ); if (r && r.rig !== false) return r; await sleep(250); }
    return await ev(COST_READ);
  };
  const out = { card: await at(base + '/gallery.html', `(() => { const b = document.querySelector('button[data-tab="gems"]'); if (b) b.click();
      document.querySelectorAll('[data-panel]').forEach((p) => { p.hidden = false; });
      const c = document.querySelector('[data-gemspec-card]'); if (c) c.scrollIntoView({ block: 'center' }); return 1; })()`),
    ceremony: await at(base + '/index.html?app=fullscreen', `(() => { const b = document.querySelector('[aria-label="Open goal reward"]'); if (b) b.click(); return 1; })()`) };
  ws.close(); chrome.kill('SIGKILL'); try { fs.rmSync(profile, { recursive: true, force: true }); } catch {}
  return out;
}
export async function cost(root, baseIn, out) {
  const { base, child } = await serve(root);
  const b = (baseIn || base).replace(/\/$/, '');
  fs.mkdirSync(out, { recursive: true });
  const mc = path.join(path.resolve(root), 'prototype', 'gems', 'mobile-cost.mjs');
  const child2 = spawn(process.execPath, [mc, '--url', b + '/gallery.html', '--cpu', String(flag('cpu', 4)), '--out', out], { stdio: ['ignore', 'pipe', 'inherit'] });
  let stdout = '';
  child2.stdout.on('data', (d) => { stdout += d.toString(); });
  await new Promise((res, rej) => child2.on('close', (c) => (c === 0 ? res() : rej(new Error('mobile-cost exit ' + c)))));
  let measured = null; try { measured = JSON.parse(stdout); } catch { measured = { raw: stdout }; }
  const read = await readback(b);
  const report = { tool: 'prototype/gems/pixel-oracle.mjs --cost', sha: headSha(root), url: b + '/gallery.html',
    method: 'mobile-cost.mjs (ANGLE/Metal, 4x CPU throttle, 40-frame batches between two readPixels syncs) then the same-page read-back of GEM_FACETS.choice / uCount',
    measured, readback: read };
  fs.writeFileSync(path.join(out, 'cost-baseline.json'), JSON.stringify(report, null, 1));
  if (child) child.kill('SIGKILL');
  console.log(JSON.stringify({ out, measured, readback: read }, null, 1));
}
