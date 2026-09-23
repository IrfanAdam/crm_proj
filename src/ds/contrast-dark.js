/* ADAM/DS — src/ds/contrast-dark.js · night ladder — how a pair inverts */
// [plan:2026-09-23_002500-design-system-consolidation.md#phase-2]
// Exports: pgNightPair · needs contrast-families.js (PG_RAMPS names).
// A hue fill keeps its identity in both themes: it deepens one step and keeps
// white ink. A neutral pairing has no hue to carry, so the whole pair mirrors —
// the block that was darkest by day becomes the lightest at night and the ink
// crosses with it, which keeps the prominence ramp strong > basic > neutral.
const PG_NIGHT_TOK = { white: 'neutral-dark-900', surface: 'neutral-dark-800' };
const pgParts = (t) => {
  const m = /^(.*)-(\d+)$/.exec(t);
  return m ? { ramp: m[1], step: +m[2] } : null;
};
const pgNeutral = (t) => t === 'white' || /^neutral-(light|dark)-\d+$/.test(t);
const pgMirror = (step) => {
  const s = 900 - step;
  return s < 200 ? 50 : s;
};
const pgCross = (p) => {
  const ramp = p.ramp === 'neutral-light' ? 'neutral-dark' : 'neutral-light';
  return ramp + '-' + pgMirror(p.step);
};
const pgNightInk = (t, flipWhite) => {
  if (t === 'ink') return 'white';
  if (t === 'white') return flipWhite ? 'ink' : 'white';
  if (PG_NIGHT_TOK[t]) return PG_NIGHT_TOK[t];
  const p = pgParts(t);
  if (!p) return t;
  if (p.ramp === 'neutral-light' || p.ramp === 'neutral-dark') return pgCross(p);
  return p.ramp + '-' + (p.step >= 600 ? 1000 - p.step : p.step);
};
const pgNightGround = (t, flipNeutral) => {
  if (PG_NIGHT_TOK[t]) return PG_NIGHT_TOK[t];
  const p = pgParts(t);
  if (!p) return t;
  if (p.ramp === 'neutral-light' || p.ramp === 'neutral-dark') {
    return flipNeutral ? pgCross(p) : t;
  }
  if (p.step <= 100) return p.ramp + '-900';
  if (p.step <= 300) return p.ramp + '-800';
  return p.ramp + '-' + Math.min(900, p.step + 100);
};
const pgNightPair = (p) => {
  const neutral = pgNeutral(p[1]);
  return [pgNightInk(p[0], neutral), pgNightGround(p[1], neutral)];
};
