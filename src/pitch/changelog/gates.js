/* ADAM/DS — ds/changelog/gates · REF GATE verdicts (ownership by heading number).
   Pure additive exports: never feed state()/isDone()/hash, so section hashes
   are untouched by this module. Extracted from changelog-parse.js (budget). */
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
