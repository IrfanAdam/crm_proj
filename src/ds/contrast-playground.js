/* ADAM/DS — src/ds/contrast-playground.js · contrast + pairing playground */
// [plan:2026-09-23_002500-design-system-consolidation.md#phase-2]
// Exports: pgRender (auto on ds:doc) · gem/ramp/chrome/pin in contrast-render.js,
// the night ladder in contrast-dark.js, controls in contrast-controls.js.
let pgFam = 'neutral';
let pgSubKey = null;
let pgDark = false;
let pgSel = 'strong';
let pgPinPair = null;
let pgProbe = null;
// — Section — token + theme resolve
const pgScope = () => document.querySelector('[data-pg-scope]');
const pgTok = (name) => {
  const ramp = PG_RAMPS.find((r) => name.indexOf(r + '-') === 0);
  if (ramp) return '--primitive-' + name;
  return FG_BY[name] || BG_BY[name];
};
const pgResolve = (t) => {
  const v = t.startsWith('var(') ? t.slice(4, -1) : t;
  pgProbe.style.color = 'var(' + v + ')';
  return getComputedStyle(pgProbe).color;
};
const pgRate = (a, b) => pxRatio(pgResolve(pgTok(a)), pgResolve(pgTok(b)));
// — Section — pick keeps the authored intent: first candidate, upgraded only
// when a later one reaches AA (then AA-large) that the current lacks.
const pgPick = (pairs) => {
  let best = null;
  pairs.forEach((p) => {
    const r = pgRate(p[0], p[1]);
    const win = { f: p[0], b: p[1], r };
    if (!best) best = win;
    else if (best.r < 4.5 && r >= 4.5) best = win;
    else if (best.r < 3 && r >= 3) best = win;
  });
  return best;
};
const pgSubs = () => PG_FAM[pgFam].subs;
const pgSub = () => pgSubs().find((s) => s.key === pgSubKey) || pgSubs()[0];
const pgPair = (tier) => {
  const list = pgSub().tiers[tier];
  return pgPick(pgDark ? list.map(pgNightPair) : list);
};
const pgWin = () => (pgPinPair ? pgPinPair : pgPair(pgSel));
// — Section — tier card
const pgCard = (tier, label, hint) => {
  const w = pgPair(tier);
  const ink = 'color:var(' + pgTok(w.f) + ');background:var(' + pgTok(w.b) + ')';
  const tile = '<span class="pg-tile" style="' + ink + '">' + pgGem(w.f, w.b) + '<b>Ag</b></span>';
  const badge = '<span class="pg-badge ' + pxCls(w.r) + '">' + pxVerdict(w.r) + '</span>';
  const meta = '<span class="pg-meta">' + badge + ' ' + w.r.toFixed(2) + ' · ' + hint + '</span>';
  const name = '<span class="pg-name">' + label + ' · ' + w.f + ' on ' + w.b + '</span>';
  const cls = pgSel === tier ? 'pg-card pg-card--sel' : 'pg-card';
  const open = '<button type="button" class="' + cls + '" data-pg-tier="' + tier + '"';
  return open + ' aria-pressed="' + (pgSel === tier) + '">' + tile + name + meta + '</button>';
};
// — Section — render (modal is lifted to body so it centres on the viewport)
const pgRender = () => {
  const host = document.querySelector('[data-pg]');
  const sc = pgScope();
  if (!host || !sc) return;
  const modal = document.getElementById('pg-matrix-modal');
  if (modal && modal.parentElement !== document.body) document.body.appendChild(modal);
  if (!pgProbe) {
    pgProbe = document.createElement('span');
    pgProbe.style.cssText = 'position:absolute;visibility:hidden';
    sc.appendChild(pgProbe);
  }
  sc.dataset.theme = pgDark ? 'dark' : 'light';
  pgChrome();
  const ramp = document.querySelector('[data-pg-ramp]');
  if (ramp) ramp.innerHTML = pgRamp();
  let h = '';
  PG_TIERS.forEach(([key, label, hint]) => {
    h += pgCard(key, label, hint);
  });
  host.innerHTML = h;
  const w = pgWin();
  const sn = document.querySelector('[data-pg-snippet]');
  if (sn) sn.textContent = 'color:var(' + pgTok(w.f) + ');background:var(' + pgTok(w.b) + ');';
  pgPin();
};
document.addEventListener('ds:doc', pgRender);
pgRender();
