/* ADAM/GEMS — prototype/gems/oracle-shot.mjs · shootStone: one stone on one surface, every tilt, gated per capture.
 * [plan:2026-10-03_144222-gem-realism-round2.md#phase-18] · Self-certifying: pose → read → re-apply pose → read; both streams must md5-match. Mismatch retried 3× with an extra settle, then written marked `unstable` (both md5s, pair diff px).
 */
import fs from 'node:fs'; import path from 'node:path';
import { SIZE, TILTS, MASK_MIN, sleep } from './oracle-args.mjs';
import { PAGE } from './oracle-page.mjs';
import { png, md5 } from './oracle-png.mjs';

// The intermittent flake (384,016 px at delta 46 on card-citrine; 61,261 px at 42 on card-citrine-xn030 — each 0 px on recapture) was a one-shot settle artefact in exactly ONE read: two reads per pose catch it before it masquerades as a diff.
const PAIRS = 4;                          // 1 pair + 3 retries, each with an extra settle
const INJ = Number(process.env.ORA_INJECT_UNSTABLE || 0);   // TEMP proof hook: shifts render 2 by one pose step
const settle = (n) => `new Promise((res) => { let i = 0, done = false;
  const fin = () => { if (!done) { done = true; res(1); } }, t = setTimeout(fin, 3000), step = () => { if (++i >= ${n}) { clearTimeout(t); fin(); } else requestAnimationFrame(step); }; requestAnimationFrame(step); })`;
const pxDiff = (a, b, n) => { let c = 0;                     // differing PIXELS between two reads, any channel
  for (let i = 0; i < n; i++) { const o = i * 4; if (a[o] !== b[o] || a[o + 1] !== b[o + 1] || a[o + 2] !== b[o + 2] || a[o + 3] !== b[o + 3]) c++; } return c; };

// One rendered read at a pose: apply, let rAFs pass (the re-settle: two, +2 per retry), burn the warm frame, read.
async function grab(B, sel, tilt, extra) {
  if (extra) await sleep(80 * extra);
  await B.ev(`window.__ORA.pose(${JSON.stringify(sel)}, ${JSON.stringify(tilt)})`); await B.ev(settle(2 + extra * 2));
  await B.ev(`window.__ORA.warm(${JSON.stringify(sel)})`);
  const shot = await B.ev(`window.__ORA.shot(${JSON.stringify(sel)})`), buf = Buffer.from(shot.b64, 'base64');
  return { shot, buf, md5: md5(buf) };
}

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
  // Primer: the first pose after a mount lands in a one-shot state (first capture of a page only). Burn TWO full pose+render+read cycles at the first tilt and discard them.
  await ev(`window.__ORA.pose(${JSON.stringify(surf.sel)}, ${TILTS[0]})`);
  await ev(`window.__ORA.warm(${JSON.stringify(surf.sel)})`);
  await ev(`window.__ORA.shot(${JSON.stringify(surf.sel)})`);
  await ev(`window.__ORA.pose(${JSON.stringify(surf.sel)}, ${TILTS[0]})`); await ev(settle(4));
  await ev(`window.__ORA.warm(${JSON.stringify(surf.sel)})`);
  await ev(`window.__ORA.shot(${JSON.stringify(surf.sel)})`);
  let unstableN = 0, pairWorst = 0, retried = 0;
  for (const tilt of TILTS) {
    const t0 = Date.now();
    let a = null, b = null, dpx = 0, pair = 0;
    for (; pair < PAIRS; pair++) {
      a = await grab(B, surf.sel, tilt, pair);
      b = await grab(B, surf.sel, tilt + INJ, pair);          // same pose, second render — must be byte-identical
      if (a.md5 === b.md5) break;
      dpx = pxDiff(a.buf, b.buf, a.shot.w * a.shot.h);
    }
    const stable = a.md5 === b.md5, shot = a.shot, rgba = a.buf;
    if (!stable) unstableN++; else if (dpx) retried++; pairWorst = Math.max(pairWorst, dpx);
    const mk = await ev(`window.__ORA.mask(${JSON.stringify(surf.sel)})`);
    const name = `${surf.id}-${stone}-x${String(tilt.toFixed(2)).replace('-', 'n').replace('.', '')}`;
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
    const checks = { program_errors: progErr.length, link_fail: prep.linkFail, lost: !!shot.lost,
      mask_px: mk.maskPx, mask_min: MASK_MIN, mask_ok: mk.maskPx >= MASK_MIN,
      buffer_ok: shot.w === want[0] && shot.h === want[1], buffer_want: want, buffer_got: [shot.w, shot.h],
      stable, render_pairs: pair + 1, render_diff_px: dpx, console_total: win.length, console: win.slice(0, 4) };
    const valid = checks.program_errors === 0 && checks.link_fail === 0 && !checks.lost && checks.mask_ok && checks.buffer_ok && stable;
    caps.push({ id: name, surface: surf.id, stone, tilt, spin: 0, t: 0, url: surf.url, buffer: [shot.w, shot.h],
      png: name + '.png', mask_png: name + '-mask.png', md5: md5(pngBuf), mask_md5: md5(fs.readFileSync(path.join(out, name + '-mask.png'))),
      mask_px: mk.maskPx, valid, stable, unstable: !stable, render_md5_a: a.md5, render_md5_b: b.md5, render_diff_px: dpx, render_pairs: pair + 1,
      invalid_reason: valid ? null : [checks.program_errors ? checks.program_errors + ' WebGLProgram error(s)' : '',
        checks.link_fail ? checks.link_fail + ' failed program link(s)' : '', checks.lost ? 'context lost' : '',
        checks.mask_ok ? '' : `mask ${mk.maskPx} < ${MASK_MIN} px`,
        checks.buffer_ok ? '' : `buffer ${shot.w}x${shot.h} != ${want[0]}x${want[1]}`,
        stable ? '' : `unstable render pair after ${pair + 1} attempt(s): ${a.md5} != ${b.md5}, ${dpx} px`].filter(Boolean).join('; '),
      checks, choice: prep.choice, planes: prep.planes, bloom: prep.bloom, mats: prep.mats, floors: prep.floors, ms: Date.now() - t0 });
  }
  console.error(`[stable] ${surf.id}/${stone} — ${TILTS.length - unstableN}/${TILTS.length} certified, ${unstableN} unstable, ${retried} retried, max pair diff ${pairWorst} px`);
  return 0;
}
