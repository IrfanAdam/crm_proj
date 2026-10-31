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
// — Plan status (cancelled > done > incomplete). View-layer only: never feeds
// state()/isDone()/hash, so section hashes are untouched by this helper.
export const secStatus = (head, body) => {
  if (/✗/.test(head)) return 'cancelled';
  const m = String(state(body)).match(/(\d+)\/(\d+)/);
  if (!m) return /✓/.test(head) ? 'done' : 'open';
  return isDone(state(body)) ? 'done' : 'open';
};
export const planStatus = (sprints) => {
  if (!sprints.length) return 'incomplete';
  const ss = sprints.map((s) => secStatus(s.head, s.body));
  if (ss.every((x) => x === 'cancelled')) return 'cancelled';
  let i = ss.length;
  while (i > 0 && ss[i - 1] === 'cancelled') i--;
  if (i < ss.length && ss.slice(0, i).every((x) => x === 'done')) return 'cancelled';
  if (ss.some((x) => x === 'open')) return 'incomplete';
  return 'done';
};
// — Gate verdicts (REF GATE ownership by heading number, never positional index).
// Pure additive exports: never feed state()/isDone()/hash, so section hashes are untouched.
const GATE_N = (n) => new RegExp(`REF GATE\\s+0*${n}\\b`);
const REV_LINE = /·\s*rev\s+\d{4}-\d{2}-\d{2}/;
const firstDate = (s) => (s.match(/(20\d{2}-\d{2}-\d{2})/) || [])[1] || '';
export const parseGates = (head, body) => {
  const m = String(head).match(/(?:Task|Phase)\s+0*(\d+)/);
  if (!m) return null;
  const lines = String(body).split('\n').filter((l) => GATE_N(m[1]).test(l));
  if (!lines.length) return null;
  const revs = lines.filter((l) => REV_LINE.test(l));
  const bases = lines.filter((l) => !REV_LINE.test(l));
  const src = bases.length ? bases[bases.length - 1] : lines[lines.length - 1];
  const verdict = /\bPASSED\b|\bWAIVER\b/.test(src) ? 'passed' : /\bFAILED\b/.test(src) ? 'failed' : 'open';
  return { n: m[1], verdict, revCount: revs.length,
    ship: /\(ship\)/.test(lines.join('\n')),
    bases, revLines: revs,
    baseDate: firstDate(src) };
};
export const gateTag = (head, body, frac) => {
  const g = parseGates(head, body);
  if (!g) return '';
  const v = g.verdict === 'passed' ? 'GATE PASSED' : g.verdict === 'failed' ? 'GATE FAILED' : 'GATE OPEN';
  const rev = g.revCount ? ` · ${g.revCount} rev${g.revCount > 1 ? 's' : ''}` : '';
  return frac ? `${frac} · ${v}${rev}` : `${v}${rev}`;
};
export const planGateTag = (sprints) => {
  const gs = sprints.map((s) => parseGates(s.head, s.body)).filter(Boolean);
  if (!gs.length) return '';
  if (gs.some((g) => g.verdict === 'failed')) return 'GATE FAILED';
  if (gs.some((g) => g.verdict === 'open')) return 'GATE OPEN';
  return 'GATE PASSED';
};
