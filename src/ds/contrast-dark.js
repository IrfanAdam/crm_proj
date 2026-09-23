/* ADAM/DS — src/ds/contrast-dark.js · night ladder — how a pair inverts */
// [plan:2026-09-23_002500-design-system-consolidation.md#phase-2]
// Exports: pgNightPair · needs contrast-families.js (PG_RAMPS names).
// Roles are theme-stable, so the hue never changes — the surface under it does:
// a fill deepens one step, a tint takes the ramp's dark end, a dark ink lightens
// to the ramp's light end, and paper swaps for the night surface.
const PG_NIGHT_TOK = { white: 'neutral-dark-900', surface: 'neutral-dark-800' };
const pgNightInk = (t) => {
  if (t === 'ink') return 'white';
  if (t === 'white') return 'white';
  const m = /^(.*)-(\d+)$/.exec(t);
  if (!m) return t;
  const ramp = m[1];
  const step = +m[2];
  if (ramp === 'neutral-dark') {
    const s = 900 - step;
    return 'neutral-light-' + (s < 200 ? 50 : s);
  }
  if (ramp === 'neutral-light') return 'neutral-light-' + Math.min(900, step + 100);
  return ramp + '-' + (step >= 600 ? 1000 - step : step);
};
const pgNightGround = (t) => {
  if (PG_NIGHT_TOK[t]) return PG_NIGHT_TOK[t];
  const m = /^(.*)-(\d+)$/.exec(t);
  if (!m) return t;
  const ramp = m[1];
  const step = +m[2];
  if (ramp === 'neutral-light') return 'neutral-dark-' + (900 - step);
  if (step <= 100) return ramp + '-900';
  if (step <= 300) return ramp + '-800';
  return ramp + '-' + Math.min(900, step + 100);
};
const pgNightPair = (p) => [pgNightInk(p[0]), pgNightGround(p[1])];
