/* ADAM/GEMS — prototype/gems/oracle-diff.mjs · --diff mode: per-image differing px, max delta, mask counts, gate withholding.
 * [plan:2026-10-03_144222-gem-realism-round2.md#phase-18] · split out of pixel-oracle.mjs.
 * A capture that could not certify itself (two renders of one pose disagreed) is WITHHELD, never reported as a visual
 * difference: the diff prints the refusal and exits 3, so no caller can mistake instability for a regression.
 */
import fs from 'node:fs';
import path from 'node:path';
import { flag } from './oracle-args.mjs';
import { unpng } from './oracle-png.mjs';

// ── diff mode ──────────────────────────────────────────────────────────────────────────────────────────────────
export function diff(dirA, dirB) {
  const a = JSON.parse(fs.readFileSync(path.join(dirA, 'manifest.json'), 'utf8'));
  const b = JSON.parse(fs.readFileSync(path.join(dirB, 'manifest.json'), 'utf8'));
  const byB = new Map(b.captures.map((c) => [c.stone + '|' + c.surface + '|' + c.tilt, c]));
  const rows = [];
  let unstableN = 0;
  for (const ca of a.captures) {
    const cb = byB.get(ca.stone + '|' + ca.surface + '|' + ca.tilt);
    if (!cb) { rows.push({ id: ca.id, reported: false, note: 'missing in B' }); continue; }
    if (ca.unstable || cb.unstable) {                       // instability first: it is not a visual difference
      unstableN++;
      rows.push({ id: ca.id, reported: false, withheld: 'unstable', note: 'A34 gate failed — unstable capture withheld',
        unstable_a: !!ca.unstable, unstable_b: !!cb.unstable,
        render_md5_a: [ca.render_md5_a || null, ca.render_md5_b || null], render_md5_b: [cb.render_md5_a || null, cb.render_md5_b || null],
        render_diff_px_a: ca.render_diff_px === undefined ? null : ca.render_diff_px,
        render_diff_px_b: cb.render_diff_px === undefined ? null : cb.render_diff_px });
      continue;
    }
    const gate = ca.valid && cb.valid;
    if (!gate) { rows.push({ id: ca.id, reported: false, note: 'A34 gate failed — diff withheld', valid_a: ca.valid, valid_b: cb.valid, mask_px_a: ca.mask_px, mask_px_b: cb.mask_px }); continue; }
    const A = unpng(fs.readFileSync(path.join(dirA, ca.png))), B = unpng(fs.readFileSync(path.join(dirB, cb.png)));
    if (A.w !== B.w || A.h !== B.h) { rows.push({ id: ca.id, reported: false, note: `size ${A.w}x${A.h} != ${B.w}x${B.h}` }); continue; }
    let differing = 0, maxD = 0, maxAt = null;
    for (let i = 0; i < A.w * A.h; i++) { let d = 0;
      for (let c = 0; c < 4; c++) { const v = Math.abs(A.data[i * 4 + c] - B.data[i * 4 + c]); if (v > d) d = v; }
      if (d > 0) { differing++; if (d > maxD) { maxD = d; maxAt = [i % A.w, Math.floor(i / A.w)]; } } }
    rows.push({ id: ca.id, reported: true, differing_px: differing, of_px: A.w * A.h, max_delta: maxD, max_at: maxAt, mask_px_a: ca.mask_px, mask_px_b: cb.mask_px, md5_equal: ca.md5 === cb.md5 });
  }
  const rep = rows.filter((r) => r.reported);
  const out = { dir_a: dirA, dir_b: dirB, sha_a: a.sha, sha_b: b.sha, compared: rep.length, withheld: rows.length - rep.length,
    unstable_withheld: unstableN, differing_total: rep.reduce((s, r) => s + r.differing_px, 0), max_delta: rep.reduce((m, r) => Math.max(m, r.max_delta), 0), rows };
  if (unstableN) {                                          // refuse: withhold, never report, never exit 0
    const msg = `A34 gate failed — ${unstableN} unstable captures withheld`;
    out.refusal = msg; out.exit = 3;
    console.error(msg);
    console.log(JSON.stringify(out, null, 1));
    const o = flag('out', ''); if (o) fs.writeFileSync(o, JSON.stringify(out, null, 1));
    process.exit(3);
  }
  return out;
}
