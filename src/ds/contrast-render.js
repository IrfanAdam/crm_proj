/* ADAM/DS — src/ds/contrast-render.js · gem, ramp strip, chrome, pin */
// [plan:2026-09-23_002500-design-system-consolidation.md#phase-2]
// Exports: pgGem, pgRamp, pgChrome, pgPin · needs contrast-playground.js
// state (pgSub/pgPair/pgTok) and gallery.js (pxCls/pxVerdict).
// — Section — gem vector paints the pair itself
const pgGem = (a, b) => {
  const fg = 'var(' + pgTok(a) + ')';
  const bg = 'var(' + pgTok(b) + ')';
  const head = '<svg class="pg-gem" viewBox="0 0 32 32" aria-hidden="true">';
  const crown = '<path d="M6 12 11 5h10l5 7-10 15z" fill="' + fg + '"/>';
  const belly = '<path d="M6 12h20l-10 15z" fill="' + fg + '" opacity=".65"/>';
  const cuts = '<path d="M11 5l3 7 2-7 2 7 3-7M6 12l10 15 10-15" stroke="' + bg + '" fill="none" stroke-width="1.4"/>';
  return head + crown + belly + cuts + '</svg>';
};
// — Section — ramp strip marks which steps the picks consume
const pgRamp = () => {
  const sub = pgSub();
  const used = PG_TIERS.map(([tier]) => {
    const w = pgPair(tier);
    return [pgTok(w.f), pgTok(w.b)];
  });
  let h = '<span class="pg-ramp__label meta">' + sub.ramp + '</span>';
  PG_STEPS.forEach((step) => {
    const v = '--primitive-' + sub.ramp + '-' + step;
    const on = used.some((pair) => pair[0] === v || pair[1] === v) ? ' pg-step--on' : '';
    h += '<span class="pg-step' + on + '"><i style="background:var(' + v + ')"></i><b>' + step + '</b></span>';
  });
  return h;
};
// — Section — chrome: family segments, sub chips, tool labels
const pgChrome = () => {
  const fam = document.querySelector('[data-pg-fams]');
  if (fam) {
    [...fam.querySelectorAll('[data-pg-fam]')].forEach((b) => {
      const on = b.dataset.pgFam === pgFam;
      b.classList.toggle('pg-seg__btn--on', on);
      b.setAttribute('aria-selected', on);
    });
  }
  const sub = document.querySelector('[data-pg-subs]');
  if (sub) {
    sub.innerHTML = pgSubs().map((s) => {
      const on = s.key === pgSub().key;
      const cls = on ? 'chip chip--active' : 'chip';
      return '<button type="button" class="' + cls + '" data-pg-sub="' + s.key + '" aria-pressed="' + on + '">' + s.label + '</button>';
    }).join('');
  }
  const th = document.querySelector('[data-pg-theme]');
  if (th) th.textContent = pgDark ? 'Dark' : 'Light';
  const sw = document.querySelector('[data-pg-swap]');
  if (sw) {
    sw.textContent = 'Swap ink';
    sw.classList.toggle('chip--active', pgSwap);
  }
};
// — Section — pinned pair read-out
const pgPin = () => {
  const pin = document.querySelector('[data-pg-pin]');
  if (!pin) return;
  if (!pgPinPair) {
    pin.hidden = true;
    return;
  }
  pin.hidden = false;
  const r = pgRate(pgPinPair.f, pgPinPair.b);
  const label = 'Pinned: <b>' + pgPinPair.f + ' on ' + pgPinPair.b + '</b> — ' + r.toFixed(2);
  pin.innerHTML = label + ' ' + pxVerdict(r) + ' <button type="button" class="chip" data-pg-unpin>unpin</button>';
};
