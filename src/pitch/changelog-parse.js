/* ADAM/DS — changelog-parse · parse helpers · [plan:2026-09-13_193000-refactor-manageability.md#phase-2] */
// Exports: chunks, goal, norm, split, state, isDone, buildState, parseMeta
// Re-exports MONTHS, fmtDate, fmtTime, pDay, isoDay via changelog-format.js

export const chunks = (md) => {
  const out = [''];
  let at = 0;
  let fence = false;
  for (const ln of md.split('\n')) {
    if (!fence && /^## /.test(ln)) out[++at] = ln.slice(3);
    else out[at] += (out[at] ? '\n' : '') + ln;
    if (/^\s*```/.test(ln)) fence = !fence;
  }
  return out;
};

export const goal = (md) => (md.match(/\*\*Goal:\*\*\s*([\s\S]+?)(?:\n\s*\n|$)/) || [])[1]?.trim() || '';

export const norm = (body) => {
  if (/^- \[[ xX]\]/m.test(body)) return body;
  const parts = body.split(/^### /m);
  const head = parts.shift();
  const items = parts.map((p) => {
    const lines = p.split('\n');
    const title = lines.shift().trim();
    const m = title.match(/^Task\s+([\d-]+):\s*(.+)$/);
    const num = m ? m[1] : '';
    let name = m ? m[2] : title;
    const cancelled = /✗/i.test(title);
    const done = /✓/i.test(title);
    name = name.replace(/✓\s*done\s*—?/i,
      '').replace(/✗\s*cancelled\s*—?/i,
      '').replace(/[✓✗]/g,
      '').trim().replace(/\.*$/,
      '.');
    const detail = lines.join(' ').replace(/\s+/g, ' ').trim();
    let flag = '';
    if (cancelled) flag = '<span class="ds-cancelled">✗ cancelled</span> — ';
    else if (done) flag = '✓ done — ';
    return `- [${done || cancelled ? 'x' : ' '}] **${num} ${name}** ${flag}${detail}`;
  });
  return head + items.join('\n');
};

export const split = (md) => chunks(md).slice(1).map((s) => {
  const nl = s.indexOf('\n');
  return { head: s.slice(0, nl).trim(), body: norm('## ' + s) };
}).filter((s) => /^Phase /.test(s.head));

export const state = (body) => {
  const d = (body.match(/- \[x\]/gi) || []).length;
  const t = (body.match(/- \[ \]/g) || []).length;
  return d + t ? `${d}/${d + t}` : '';
};

export const isDone = (frac) => {
  const m = String(frac || '').match(/(\d+)\/(\d+)/);
  return !!m && Number(m[2]) > 0 && Number(m[1]) === Number(m[2]);
};

export const buildState = (ss) => {
  let d = 0, t = 0;
  ss.forEach((s) => {
    const m = state(s.body).match(/(\d+)\/(\d+)/);
    if (m) { d += Number(m[1]); t += Number(m[2]); }
  });
  return t ? `${d}/${t}` : '';
};

export const parseMeta = (file) => {
  let m = file.match(/^(\d{4}-\d{2}-\d{2})[_-](\d{5,6})[_-](.+)\.md$/);
  if (m) return { date: m[1], id: m[2], slug: m[3] };
  m = file.match(/^(\d{4}-\d{2}-\d{2})[_-](.+)\.md$/);
  if (m) return { date: m[1], id: '', slug: m[2] };
  return { date: '', id: '', slug: file.replace(/\.md$/, '') };
};

export { MONTHS, fmtDate, fmtTime, pDay, isoDay } from './changelog-format.js';
