/* ADAM/GEMS — prototype/gems/oracle-cdp.mjs · CDP plumbing: client, free-port pick, head SHA, vite static serve.
 * [plan:2026-10-03_144222-gem-realism-round2.md#phase-18] · split out of pixel-oracle.mjs, verbatim.
 */
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import net from 'node:net';
import { flag, sleep } from './oracle-args.mjs';

// ── CDP ─────────────────────────────────────────────────────────────────────────────────────────────────────────
export class CDP {
  constructor(ws) { this.ws = ws; this.id = 0; this.p = new Map(); this.log = [];
    ws.on('message', (raw) => { const m = JSON.parse(raw.toString());
      if (m.id && this.p.has(m.id)) { const { res, rej } = this.p.get(m.id); this.p.delete(m.id); m.error ? rej(new Error(m.error.message)) : res(m.result); return; }
      if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') this.log.push({ t: 'console', d: m.params.args.map((a) => a.value || a.description || '').join(' ').slice(0, 300) });
      if (m.method === 'Runtime.exceptionThrown') this.log.push({ t: 'exception', d: (m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text || '').slice(0, 300) });
      if (m.method === 'Log.entryAdded' && m.params.entry.level === 'error') this.log.push({ t: 'log', d: (m.params.entry.text || '').slice(0, 300), u: m.params.entry.url });
    });
  }
  send(method, params = {}, sessionId) { const id = ++this.id, msg = { id, method, params }; if (sessionId) msg.sessionId = sessionId;
    return new Promise((res, rej) => { const t = setTimeout(() => { this.p.delete(id); rej(new Error(method + ' timeout')); }, 240000);
      this.p.set(id, { res: (v) => { clearTimeout(t); res(v); }, rej: (e) => { clearTimeout(t); rej(e); } }); this.ws.send(JSON.stringify(msg)); }); }
}
export const freePort = (from) => new Promise((res, rej) => {
  const tryPort = (p) => { const s = net.createServer(); s.once('error', () => { s.close(); p > 5340 ? rej(new Error('no free port')) : tryPort(p + 1); });
    s.listen(p, '127.0.0.1', () => { s.close(() => res(p)); }); };
  tryPort(from);
});

export const headSha = (root) => {
  let d = path.resolve(root);
  for (let i = 0; i < 8; i++) { const g = path.join(d, '.git');
    if (fs.existsSync(g)) { try { let ref = fs.readFileSync(path.join(g, 'HEAD'), 'utf8').trim();
      if (ref.startsWith('ref: ')) ref = fs.readFileSync(path.join(g, ref.slice(5)), 'utf8').trim(); return ref; } catch { return 'unknown'; } }
    const up = path.dirname(d); if (up === d) break; d = up; }
  return flag('sha', process.env.GEM_SHA || 'unknown');
};

export async function serve(root) {
  const base = flag('base', '');
  if (base) return { base: base.replace(/\/$/, ''), child: null };
  const port = await freePort(Number(flag('port', 5320)));
  const vite = path.join(path.resolve(root), 'node_modules', 'vite', 'bin', 'vite.js');
  const bin = fs.existsSync(vite) ? vite : '/Users/irfan/Documents/Portfolio Redo/crm_proj/node_modules/vite/bin/vite.js';
  const child = spawn(process.execPath, [bin, '--port', String(port), '--strictPort'], { cwd: path.resolve(root), stdio: 'ignore' });
  for (let i = 0; i < 120; i++) { try { const r = await fetch(`http://127.0.0.1:${port}/gallery.html`); if (r.ok) return { base: `http://127.0.0.1:${port}`, child }; } catch {}
    await sleep(250); }
  child.kill('SIGKILL'); throw new Error('vite did not serve ' + root);
}
