/* ADAM/DS — changelog tag taxonomy + auto-tagger (pure; shared by renderer + suggester).
   Closed set of six keeps the archive scannable. Explicit `**Tags:**` (plan
   preamble) / `*Tags: …*` (phase body) beats keyword inference; unmatched
   phases fall back to Design System. */
export const TAGS = ['Design System', 'Component', 'Function', 'Motion', 'Layout', 'Tooling'];
const RULES = [
  ['Component', /component|primitive|button|card|playground|specimen|pattern|uniform template/i],
  ['Function', /function|grid-?reveal|shimmer|glimmer|viewer|expander|tether|fx-?lab|rise/i],
  ['Motion', /motion|easing|transition|animation|reveal|load sequence|parallax|spring|graduation/i],
  ['Layout', /layout|masonry|responsive|mobile|breakpoint|landing|shortest-column|progressive load/i],
  ['Tooling',
    /pipeline|tracker|manifest|changelog|trailer|continuation|miller|subagent|sop|suggest|checkpoint|freeze/i],
  ['Design System',
    new RegExp([
      'design.?system',
      'token',
      'foundation',
      'ramp',
      'semantic',
      'overview',
      'moodboard',
      'color',
      'type',
      'shape',
      'material',
      'swap.?slot',
      'evo',
      'parity',
      'narrative',
    ].join('|'), 'i')],
];
export const parseExplicit = (text) => {
  const m = String(text).match(/^>?\s*\*{1,2}Tags:\*{0,2}\s*(.+?)\s*\*{0,2}\s*$/m);
  if (!m) return [];
  return m[1]
    .split(/[,;|]/)
    .map((s) => TAGS.find((c) => c.toLowerCase() === s.trim().replace(/\.*$/, '').toLowerCase()) || null)
    .filter(Boolean)
    .filter((t,
      i,
      a) => a.indexOf(t) === i);
};
export const infer = (text) => {
  const found = RULES.filter(([, re]) => re.test(String(text))).map(([t]) => t);
  return (found.length ? found : ['Design System']).slice(0, 3);
};
/* Phase tags: explicit wins; thin auto (bare fallback) inherits the plan steer. */
export const tagsFor = (head, body, planSteer = []) => {
  const explicit = parseExplicit(body);
  if (explicit.length) return explicit.slice(0, 3);
  const auto = infer(`${head}\n${body}`);
  if (auto.length === 1 && auto[0] === 'Design System' && planSteer.length) return [...planSteer].slice(0, 3);
  return auto;
};
/* Plan tags: explicit preamble steer ∪ every phase's tags, order-stable. */
export const planTags = (md, phases) => {
  const steer = parseExplicit(String(md).split(/^## /m)[0]);
  const union = [...steer];
  phases.forEach((p) => tagsFor(p.head, p.body, steer).forEach((t) => { if (!union.includes(t)) union.push(t); }));
  return union.length ? union : ['Design System'];
};
