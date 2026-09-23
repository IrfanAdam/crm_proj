/* ADAM/DS — src/ds/pair-map.js · pairings in situ — one card per shipped pair */
// [plan:2026-09-23_002500-design-system-consolidation.md#phase-4] · data in
// pair-map-data.js; pxRatio/pxVerdict/pxCls/pxGuide/pxResolve from gallery.js;
// a card click pins its pair in the playground (contrast-controls.js).
const pmTok = (k) => (k.indexOf('--') === 0 ? k : (FG_BY[k] || BG_BY[k] || '--primitive-' + k));
const pmLive = (t) => getComputedStyle(document.documentElement).getPropertyValue(t).trim().length > 0;
const pmPrev = (markup, ft, bt) => {
  if (markup) return markup;
  return '<span class="pm-ink" style="color:var(' + ft + ');background:var(' + bt + ')">Aa</span>';
};
const pmCard = (row) => {
  const [name, markup, f, b] = row;
  const ft = pmTok(f);
  const bt = pmTok(b);
  const ok = pmLive(ft) && pmLive(bt);
  const r = ok ? pxRatio(pxResolve(ft), pxResolve(bt)) : 0;
  const attrs = ' type="button" class="pm-card" data-pm-f="' + f + '" data-pm-b="' + b + '"';
  const tip = name + ' — ' + f + ' on ' + b + ' · ' + r.toFixed(2) + ' ' + pxVerdict(r);
  const badge = ok ? '<span class="pg-badge ' + pxCls(r) + '">' + pxVerdict(r) + '</span>' : '<span class="pg-badge mx-bad">unresolved</span>';
  const read = ok ? '<b class="pm-ratio">' + r.toFixed(2) + '</b><span class="pm-guide">' + pxGuide(r) + '</span>'
    : '<span class="pm-guide">no such token — fix the key</span>';
  return '<button' + attrs + ' title="' + tip + '">'
    + '<span class="pm-prev">' + pmPrev(markup, ft, bt) + '</span>'
    + '<span class="pm-name">' + name + '</span>'
    + '<span class="pm-pair">' + f + ' on ' + b + '</span>'
    + '<span class="pm-meta">' + badge + read + '</span>'
    + '</button>';
};
const pmGroup = (fam) => {
  const cards = fam.rows.map(pmCard).join('');
  return '<h4 class="pm-title">' + fam.label + '</h4><div class="pm-grid">' + cards + '</div>';
};
const pmRender = () => {
  const host = document.querySelector('[data-pairmap]');
  if (!host || host.dataset.done) return;
  host.dataset.done = '1';
  host.innerHTML = PM_FAMILIES.map(pmGroup).join('');
};
document.addEventListener('ds:doc', pmRender);
pmRender();
