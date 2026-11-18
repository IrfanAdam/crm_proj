/* ADAM/GEMS — prototype/gems/oracle-shot.mjs · shootStone: one stone on one surface, every tilt, gated per capture.
 * [plan:2026-10-03_144222-gem-realism-round2.md#phase-18] · split out of pixel-oracle.mjs, verbatim.
 */
import fs from 'node:fs';
import path from 'node:path';
import { SIZE, TILTS, MASK_MIN, sleep } from './oracle-args.mjs';
import { PAGE } from './oracle-page.mjs';
import { png, md5 } from './oracle-png.mjs';

export async function shootStone(B, surf, stone, out, caps) {
  const { cdp, S, ev } = B;
  await cdp.send('Page.navigate', { url: surf.url }, S);
  await sleep(1200);
  for (let i = 0; i < 160; i++) { if (await ev(`!!(window.GEM3D && window.GEM_FACETS)`)) break; await sleep(250); }
  await ev(surf.boot); await sleep(surf.id === 'ceremony' ? 3000 : 1500);
  await ev(PAGE);
  const mark = cdp.log.length;
  // Gate on the token + appearance record: gem3d.mount() reads the category's CSS token at mount time, so a stylesheet
  // that lands after the mount paints the stone from the sapphire fallback — a per-launch colour race, not a pose one.
  const gate = `(() => { const c = window.GEM_CUT && window.GEM_CUT.CATEGORIES[${JSON.stringify(stone)}];
    const tok = c && getComputedStyle(document.documentElement).getPropertyValue(c.token).trim();
    const ap = window.GEM_APPEARANCE && window.GEM_APPEARANCE.stones && window.GEM_APPEARANCE.stones[${JSON.stringify(stone)}];
    return document.readyState === 'complete' && !!tok && !!ap; })()`;
  for (let i = 0; i < 240; i++) { if (await ev(gate)) break; await sleep(250); }
  await ev(`window.__ORA.mount(${JSON.stringify(surf.sel)}, ${JSON.stringify(stone)}, ${SIZE[surf.id][0]}, ${SIZE[surf.id][1]})`);
  let ready = null, tries = 0;
  for (; tries < 240; tries++) { ready = await ev(`window.__ORA.state(${JSON.stringify(surf.sel)})`);
    if (ready && ready.ready) break;
    if (tries === 40) await ev(`window.__ORA.mount(${JSON.stringify(surf.sel)}, ${JSON.stringify(stone)}, ${SIZE[surf.id][0]}, ${SIZE[surf.id][1]})`);   // one re-dispatch
    await sleep(150); }
  if (!ready || !ready.ready) return tries;
  const prep = await ev(`window.__ORA.prep(${JSON.stringify(surf.sel)}, ${SIZE[surf.id][0]}, ${SIZE[surf.id][1]})`);
  const want = [SIZE[surf.id][0] * 2, SIZE[surf.id][1] * 2];   // drawing buffer must be the declared one, or the capture is not a reference
  // Primer: the first pose rendered after a mount lands in a one-shot state (seen as a subpixel/settle difference on
  // the first capture of a page only). Burn a full pose+render+read cycle at the first tilt and discard it, so every
  // quoted capture is drawn from the settled state.
  await ev(`window.__ORA.pose(${JSON.stringify(surf.sel)}, ${TILTS[0]})`);
  await ev(`window.__ORA.warm(${JSON.stringify(surf.sel)})`);
  await ev(`window.__ORA.shot(${JSON.stringify(surf.sel)})`);
  for (const tilt of TILTS) {
    const t0 = Date.now();
    await ev(`window.__ORA.pose(${JSON.stringify(surf.sel)}, ${tilt})`);
    await ev(`window.__ORA.warm(${JSON.stringify(surf.sel)})`);   // settle one-shot per-mount state before the read
    const shot = await ev(`window.__ORA.shot(${JSON.stringify(surf.sel)})`);
    const mk = await ev(`window.__ORA.mask(${JSON.stringify(surf.sel)})`);
    const name = `${surf.id}-${stone}-x${String(tilt.toFixed(2)).replace('-', 'n').replace('.', '')}`;
    const rgba = Buffer.from(shot.b64, 'base64');
    const rows = Buffer.alloc(rgba.length);                   // readPixels is bottom-up → PNG is top-down
    for (let y = 0; y < shot.h; y++) rgba.copy(rows, y * shot.w * 4, (shot.h - 1 - y) * shot.w * 4, (shot.h - y) * shot.w * 4);
    const pngBuf = png(rows, shot.w, shot.h);
    fs.writeFileSync(path.join(out, name + '.png'), pngBuf);
    const mbits = Buffer.from(mk.bits, 'base64'), mimg = Buffer.alloc(mk.w * mk.h * 4);
    for (let i = 0; i < mk.w * mk.h; i++) { const on = (mbits[i >> 3] >> (i & 7)) & 1; mimg[i * 4] = mimg[i * 4 + 1] = mimg[i * 4 + 2] = on ? 255 : 0; mimg[i * 4 + 3] = 255; }
    const mrows = Buffer.alloc(mimg.length);                  // same bottom-up → top-down flip as the head buffer
    for (let y = 0; y < mk.h; y++) mimg.copy(mrows, y * mk.w * 4, (mk.h - 1 - y) * mk.w * 4, (mk.h - y) * mk.w * 4);
    fs.writeFileSync(path.join(out, name + '-mask.png'), png(mrows, mk.w, mk.h));
    const win = cdp.log.slice(mark);
    const progErr = win.filter((e) => /WebGLProgram|shader error|program link/i.test(e.d || ''));
    const checks = {
      program_errors: progErr.length, link_fail: prep.linkFail, lost: !!shot.lost,
      mask_px: mk.maskPx, mask_min: MASK_MIN, mask_ok: mk.maskPx >= MASK_MIN,
      buffer_ok: shot.w === want[0] && shot.h === want[1], buffer_want: want, buffer_got: [shot.w, shot.h],
      console_total: win.length, console: win.slice(0, 4),
    };
    const valid = checks.program_errors === 0 && checks.link_fail === 0 && !checks.lost && checks.mask_ok && checks.buffer_ok;
    caps.push({ id: name, surface: surf.id, stone, tilt, spin: 0, t: 0, url: surf.url, buffer: [shot.w, shot.h],
      png: name + '.png', mask_png: name + '-mask.png', md5: md5(pngBuf), mask_md5: md5(fs.readFileSync(path.join(out, name + '-mask.png'))),
      mask_px: mk.maskPx, valid,
      invalid_reason: valid ? null : [checks.program_errors ? checks.program_errors + ' WebGLProgram error(s)' : '',
        checks.link_fail ? checks.link_fail + ' failed program link(s)' : '', checks.lost ? 'context lost' : '',
        checks.mask_ok ? '' : `mask ${mk.maskPx} < ${MASK_MIN} px`,
        checks.buffer_ok ? '' : `buffer ${shot.w}x${shot.h} != ${want[0]}x${want[1]}`].filter(Boolean).join('; '),
      checks, choice: prep.choice, planes: prep.planes, bloom: prep.bloom, mats: prep.mats, floors: prep.floors, ms: Date.now() - t0 });
  }
  return 0;
}
