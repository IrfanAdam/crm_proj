/* ADAM/DS — ds/changelog/task-evals · lift eval subsections out of task prose.
   `#### F53.1 …`, `#### Eval M2 …` and `#### Round 13 …` under a task are that
   task's eval record, not its description. `#### Rev …` rows, the REF GATE
   thread and every other heading stay where they are. */
const EVAL = /^####\s+((?:F\d+\.\d+|Eval\s+\S+|Round\s+\d+))\b/i;
const BULLET = /^- \[[ xX]\] \*\*(\d+)?[ \t]/;
export const splitEvals = (body) => {
  const out = [];
  const evals = {};
  let task = null;
  let cur = null;
  const close = () => {
    if (!cur) return;
    (evals[cur.task] = evals[cur.task] || []).push({ title: cur.title, body: cur.lines.join('\n').trim() });
    cur = null;
  };
  for (const ln of String(body).split('\n')) {
    const b = ln.match(BULLET);
    if (b) { close(); task = b[1] ? String(Number(b[1])) : null; out.push(ln); continue; }
    const m = task && ln.match(EVAL);
    if (m) { close(); const f = ln.match(/^####\s+F(\d+)\./i);
      cur = { task: f ? String(Number(f[1])) : task, title: ln.replace(/^####\s+/, '').trim(), lines: [] }; continue; }
    if (cur) { if (/^#{2,4}\s/.test(ln)) close(); else { cur.lines.push(ln); continue; } }
    out.push(ln);
  }
  close();
  return { body: out.join('\n'), evals };
};
