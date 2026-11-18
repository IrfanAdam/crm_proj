/* ADAM/GEMS — prototype/gems/pixel-oracle.mjs · frozen-pose pixel oracle (validity-gated)
 * [plan:2026-10-03_144222-gem-realism-round2.md#phase-18] · eval M1 (A34 gate) instrument.
 * Run: node prototype/gems/pixel-oracle.mjs --capture --out <dir> [--base URL] [--root DIR] [--sha SHA]
 *      [--stones a,b] [--tilts -0.30,-0.15] [--buffers card,ceremony]
 *      node prototype/gems/pixel-oracle.mjs --diff <DIR_A> <DIR_B>
 * Method: software raster (--headless=new --disable-gpu --enable-unsafe-swiftshader) so the pose is bit-reproducible.
 * Per capture: park the rig's rAF, force a fixed drawing buffer, pose group.rotation.x = tilt (spin 0, t 0), render the
 * shipped path (bloom included), readPixels the canvas. A34 gate: (a) no THREE.WebGLProgram console error and no failed
 * program link, (b) `group.visible = false` re-render at the same pose yields a stone mask of >= 20000 px where
 * |L(head) - L(no-gem)| > 6. A capture failing either check is written and marked INVALID — never a pass.
 * This harness is verdict-free: raw pixels, masks, numbers. Adjudication belongs to the caller.
 *
 * Modules (siblings, same 100-line budget): oracle-args  CLI flags + constants; oracle-png  PNG encode/decode + md5;
 * oracle-page  the injected window.__ORA capture API; oracle-cdp  CDP client, freePort, headSha, vite serve;
 * oracle-browser  headless Chrome boot + ev(); oracle-shot  shootStone (the per stone/tilt capture loop);
 * oracle-cost  --cost mode (mobile-cost.mjs + uniform read-back); oracle-diff  --diff mode (unpixels both dirs).
 * This file keeps the dispatch, the capture() orchestration and the manifest.
 */
import fs from 'node:fs';
import path from 'node:path';
import { ARGS, flag, has, STONES, TILTS, BUFFERS, MASK_MIN } from './oracle-args.mjs';
import { serve, headSha } from './oracle-cdp.mjs';
import { bootBrowser } from './oracle-browser.mjs';
import { shootStone } from './oracle-shot.mjs';
import { cost } from './oracle-cost.mjs';
import { diff } from './oracle-diff.mjs';

async function capture(root, out) {
  const { base, child } = await serve(root);
  const sha = headSha(root);
  const caps = [];
  const surfaces = [
    { id: 'card', url: base + '/gallery.html', sel: '[data-gemspec-card]', boot: `(() => { const b = document.querySelector('button[data-tab="gems"]'); if (b) b.click();
        document.querySelectorAll('[data-panel]').forEach((p) => { p.hidden = false; });
        const c = document.querySelector('[data-gemspec-card]'); if (c) c.scrollIntoView({ block: 'center' }); return 1; })()` },
    { id: 'ceremony', url: base + '/index.html?app=fullscreen', sel: '#reward-win .gem-stage', boot: `(() => { const b = document.querySelector('[aria-label="Open goal reward"]'); if (b) b.click(); return 1; })()` },
  ].filter((s) => BUFFERS.includes(s.id));

  let B = await bootBrowser();
  for (const surf of surfaces) {
    for (const stone of STONES) {
      let tries = await shootStone(B, surf, stone, out, caps).catch((e) => { console.error(`[retry] ${surf.id}/${stone}: ${e.message}`); return -1; });
      if (tries !== 0) {                                     // dead page or dead GPU process → fresh browser, one retry
        B.kill(); B = await bootBrowser();
        tries = await shootStone(B, surf, stone, out, caps).catch((e) => { console.error(`[fail] ${surf.id}/${stone}: ${e.message}`); return -1; });
      }
      if (tries !== 0) for (const tilt of TILTS) caps.push({ id: `${surf.id}-${stone}-x`, surface: surf.id, stone, tilt, spin: 0, t: 0, url: surf.url,
        png: null, mask_px: 0, valid: false, invalid_reason: tries < 0 ? 'capture threw' : `rig not mounted after ${Math.round(tries * 0.15)} s (2 attempts)`,
        checks: { mask_px: 0, mask_min: MASK_MIN, mask_ok: false } });
    }
  }
  const manifest = { tool: 'prototype/gems/pixel-oracle.mjs', generated: new Date().toISOString(), sha, root: path.resolve(root),
    base, mode: 'capture', render: 'headless=new --disable-gpu --enable-unsafe-swiftshader --disable-accelerated-2d-canvas',
    mask: { rule: 'abs(L(head)-L(no-gem))>6', min_px: MASK_MIN },
    tilts: TILTS, stones: STONES, surfaces: surfaces.map((s) => s.id), captures: caps };
  fs.writeFileSync(path.join(out, 'manifest.json'), JSON.stringify(manifest, null, 1));
  const bad = caps.filter((c) => !c.valid).length;
  console.log(JSON.stringify({ out, sha, captures: caps.length, invalid: bad, mask_min_px: Math.min(...caps.map((c) => c.mask_px || 0)),
    choice: caps[0] && caps[0].choice, planes: caps[0] && caps[0].planes, bloom: caps[0] && caps[0].bloom }, null, 1));
  B.kill(); if (child) child.kill('SIGKILL');
  return caps;
}

// ── main ──────────────────────────────────────────────────────────────────────────────────────────────────────
const run = async () => {
  const root = flag('root', process.cwd());
  if (has('cost')) { const out = path.resolve(flag('out', path.join(root, '.hermes/evals/2026-11-17-gem-mobile-stutter/oracle/cost')));
    await cost(root, flag('base', ''), out); return; }
  if (has('diff')) { const i = ARGS.indexOf('--diff'); const [a, b] = [ARGS[i + 1], ARGS[i + 2]];
    if (!a || !b) throw new Error('--diff needs DIR_A DIR_B');
    const r = diff(a, b); console.log(JSON.stringify(r, null, 1));
    if (flag('out', '')) fs.writeFileSync(flag('out'), JSON.stringify(r, null, 1));
    return; }
  const out = path.resolve(flag('out', path.join(root, '.hermes/evals/2026-11-17-gem-mobile-stutter/oracle/capture')));
  fs.mkdirSync(out, { recursive: true });
  await capture(root, out);
};
run().then(() => process.exit(0), (e) => { console.error(e && e.stack || e); process.exit(1); });
