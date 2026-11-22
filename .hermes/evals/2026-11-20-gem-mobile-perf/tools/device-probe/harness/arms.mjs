/* arms.mjs — E5 device-probe harness (kept next to the probe it tests).
 * Run from this directory: `node arms.mjs …`. Imports the in-repo rogue harness (../../rogue/harness.mjs).
 * ROGUE_ROOT defaults to <tmp>/e5-probe-runs so Chrome profiles and shots never land in the repo tree.
 */
import os from 'node:os';
import path from 'node:path';
process.env.ROGUE_ROOT = process.env.ROGUE_ROOT || path.join(os.tmpdir(), 'e5-probe-runs');   // Chrome profiles + shots stay out of the repo

/* arms.mjs — run the probe through the E5 arm set on THIS machine (headless M1 Max: plumbing evidence only,
 * never a device number). Prints the JSON fields the E5 sheet needs, one line per arm. */
const { launchChrome, openPage, mountCeremony } = await import('../../rogue/harness.mjs');
const BASE = process.env.E5BASE || 'http://127.0.0.1:5413';
const ARMS = [
  ['dpr3 taps3 bloom1', 'gemdpr=3'],
  ['dpr3 taps1 bloom1', 'gemdpr=3&gemtaps=1'],
  ['dpr3 taps3 bloom0', 'gemdpr=3&gembloom=0'],
  ['dpr1.5 taps3 bloom1', 'gemdpr=1.5'],
];
const out = [];
for (const [name, q] of ARMS) {
  const b = await launchChrome({ windowSize: [390, 844], label: 'arm-' + name.replace(/\W+/g, '') });
  const p = await openPage(b, { view: { w: 390, h: 844, dpr: 3, cpu: 0 } });
  try {
    await mountCeremony(p, { url: BASE + '/gallery.html', query: 'gemtimer=1&' + q });
    await p.waitFor(`!!(window.GEM_TIMER && GEM_TIMER.state().frames > 15)`, 40000, name);
    await p.ev('GEM_TIMER.reset()');
    await new Promise((r) => setTimeout(r, 6000));
    const j = await p.ev('GEM_TIMER.json()');
    out.push({ arm: name, query: q, canvas: j.canvas, dpr: j.dpr, taps: j.taps, bounce: j.bounce, bloom: j.bloom,
      mode: j.timer.mode, ext: j.gl.timerExt, disjoint: j.timer.disjoint, dropped: j.timer.dropped,
      passes: j.timer.passes, frame: j.frame, programs: j.programs, calls: j.calls, triangles: j.triangles });
  } catch (e) { let dbg = null; try { dbg = await p.ev('JSON.stringify({s:location.search,t:!!window.GEM_TIMER,st:window.GEM_TIMER?GEM_TIMER.state():null,rigs:(window.GEM3D?GEM3D.rigs.map(r=>({w:r.w,rend:!!r.renderer,timer:!!(r.renderer&&r.renderer.__gemTimer)})):null)})'); } catch (e2) { dbg = 'evfail ' + e2.message; } out.push({ arm: name, error: String(e.message || e).slice(0, 200), dbg: String(dbg).slice(0, 400) }); }
  finally { try { await p.close(); } catch (e) {} await b.close(); }
}
console.log(JSON.stringify(out, null, 1));
