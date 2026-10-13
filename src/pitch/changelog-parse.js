/* ADAM/DS — changelog-parse · parse helpers · [plan:2026-09-13_193000-refactor-manageability.md#phase-2] */
// Exports: chunks, goal, norm, split, state, isDone, buildState, parseMeta, hash
// Re-exports MONTHS, fmtDate, fmtTime, pDay, isoDay via changelog-format.js
export const chunks = (md) => {
  const out = ['']; let at = 0, fence = false;
  for (const ln of md.split('\n')) {
    if (!fence && /^## /.test(ln)) out[++at] = ln.slice(3);
    else out[at] += (out[at] ? '\n' : '') + ln;
    if (/^\s*```/.test(ln)) fence = !fence;
  } return out;
};
export const goal = (md) => (md.match(/\*\*Goal:\*\*\s*([\s\S]+?)(?:\n\s*\n|$)/) || [])[1]?.trim() || '';
export const norm = (body) => {
  if (/^- \[[ xX]\]/m.test(body)) return body;
  const lines = body.split('\n'); let fence = false; const headLines = [], blocks = []; let cur = null;
  for (const ln of lines) {
    const isFence = /^\s*```/.test(ln);
    if (!fence && /^### /.test(ln)) { if (cur) blocks.push(cur); cur = [ln]; }
    else { if (cur) cur.push(ln); else headLines.push(ln); }
    if (isFence) fence = !fence;
  } if (cur) blocks.push(cur); if (!blocks.length) return body;
  const head = headLines.join('\n');
  const items = blocks.map((blk) => {
    const title = blk[0].slice(4).trim(); const m = title.match(/^Task\s+([\d-]+):\s*(.+)$/);
    const num = m ? m[1] : ''; let name = m ? m[2] : title;
    const cancelled = /✗/i.test(title); const done = /✓/i.test(title) && !cancelled;
    name = name.replace(/✓\s*done\s*—?/i,'').replace(/✗\s*cancelled\s*—?/i,'').replace(/[✓✗]/g,'').trim().replace(/\.*$/,'.');
    const detail = blk.slice(1).join('\n').trim();
    const flag = cancelled ? '<span class="ds-cancelled">✗ cancelled</span> — ' : done ? '✓ done — ' : '';
    return `- [${done ? 'x' : ' '}] **${num} ${name}** ${flag}${detail ? (detail.includes('\n') ? '\n'+detail : ' '+detail) : ''}`.trimEnd();
  }); return (head ? head + '\n' : '') + items.join('\n');
};
export const split = (md) => chunks(md).slice(1).map((s) => {
  const nl = s.indexOf('\n'); return { head: s.slice(0, nl).trim(), body: norm('## ' + s) };
}).filter((s) => /^Phase \d/.test(s.head));
export const state = (body) => {
  let fence = false; const kept = [];
  for (const ln of body.split('\n')) { if (/^\s*```/.test(ln)) { fence = !fence; continue; } if (!fence) kept.push(ln); }
  const stripped = kept.join('\n'); const d = (stripped.match(/- \[x\]/gi) || []).length;
  const t = (stripped.match(/- \[ \]/g) || []).length; return d + t ? `${d}/${d + t}` : '';
};
export const isDone = (frac) => {
  const m = String(frac || '').match(/(\d+)\/(\d+)/); return !!m && Number(m[2]) > 0 && Number(m[1]) === Number(m[2]);
};
export const buildState = (ss) => {
  let d = 0, t = 0; ss.forEach((s) => { const m = state(s.body).match(/(\d+)\/(\d+)/); if (m) { d += Number(m[1]); t += Number(m[2]); } });
  return t ? `${d}/${t}` : '';
};
export const hash = (str) => {
  const s = String(str).replace(/\s+/g, ' ').trim(); let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return (h >>> 0).toString(16).padStart(8, '0');
};
export const parseMeta = (file) => {
  let m = file.match(/^(\d{4}-\d{2}-\d{2})[_-](\d{5,6})[_-](.+)\.md$/);
  if (m) return { date: m[1], id: m[2], slug: m[3] };
  m = file.match(/^(\d{4}-\d{2}-\d{2})[_-](.+)\.md$/);
  if (m) return { date: m[1], id: '', slug: m[2] };
  return { date: '', id: '', slug: file.replace(/\.md$/, '') };
};
export { MONTHS, fmtDate, fmtTime, pDay, isoDay } from './changelog-format.js';
