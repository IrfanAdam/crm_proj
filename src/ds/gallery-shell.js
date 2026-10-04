/* ADAM/DS — src/ds/gallery-shell.js · gallery frames + docs chrome */
/* [plan:2026-09-29_132702-ds-docs-experience.md#phase-2] */
// Exports: dsTab, DS_ORDER — hero in gallery-hero.js, filter in gallery-filter.js, drawer in gallery-drawer.js, tables in gallery-behavior.js
const DS_ORDER = [
  'language','color','typography','spacing','radius','shadow','motion',
  'iconography','actions','identity','text','choice','nav','overlays',
  'data','cards','operate','monitor','reports','gems','cube','dock',
];

// — Language frame —
fetch('language-panel.html?v=' + Date.now())
  .then((r) => r.text())
  .then((h) => {
    document.getElementById('stage').insertAdjacentHTML('afterbegin', h);
    const lh = location.hash.slice(1).replace(/^\//, '').split('/')[0].split('-')[0];
    if (lh && document.querySelector('[data-panel="' + lh + '"]')) dsTab(lh);
    dsHero(lh || 'language');
    dsPager(lh || 'language');
  });

// — Foundation articles —
document.querySelectorAll('[data-doc]').forEach((el) => {
  fetch(el.dataset.doc + '?v=' + Date.now())
    .then((r) => r.text())
    .then((h) => {
      el.innerHTML = h;
      document.dispatchEvent(new Event('ds:doc'));
      const cur = document.querySelector('.dnav__item--active');
      if (cur) dsHero(cur.dataset.tab);
    });
});

// — Deep-linked overlay (?open=) —
const dsOpenParam = () => {
  const id = new URLSearchParams(location.search).get('open');
  if (!id) return;
  const t = document.querySelector('[data-overlay-target="' + id + '"]');
  const el = document.getElementById(id);
  if (t && el && el.hidden) t.click();
};
document.addEventListener('ds:doc', () => {
  document.querySelectorAll('input[indeterminate]').forEach((el) => { el.indeterminate = true; });
  document.querySelectorAll('.table th').forEach((th) => { th.tabIndex = 0; });
  document.querySelectorAll('.tp-code:not([data-lang]),pre code:not([data-lang])')
    .forEach((el) => { el.dataset.lang = 'css'; });
  dsOpenParam();
});
document.addEventListener('DOMContentLoaded', () => {
  [0, 250, 700].forEach((ms) => setTimeout(dsOpenParam, ms));
});

// — Section tabs —
// filter → gallery-filter.js (dnav__item) ; drawer aria-expanded + Escape → gallery-drawer.js
const dsTab = (name) => {
  document.querySelectorAll('.dnav__item').forEach((x) => {
    x.classList.toggle('dnav__item--active', x.dataset.tab === name);
  });
  document.querySelectorAll('[data-panel]').forEach((p) => { p.hidden = p.dataset.panel !== name; });
  document.querySelectorAll('.dnav__sub').forEach((s) => { s.hidden = s.dataset.subnav !== name; });
  document.querySelectorAll('.dnav__subitem').forEach((x) => x.classList.remove('dnav__subitem--active'));
  document.querySelectorAll('.dnav__branch.is-open').forEach((br)=>{if(br.dataset.branch!==name){br.classList.remove('is-open');const bb=br.querySelector('.dnav__item--has-sub');if(bb) bb.setAttribute('aria-expanded','false');}});
  const ht = document.getElementById('dheader-title');
  if (ht) ht.textContent = name;
  history.replaceState(null, '', '#' + name);
  dsHero(name);
  dsPager(name);
  const det = document.querySelector('.dnav__group [data-tab="' + name + '"]')?.closest('details');
  document.querySelectorAll('.dnav__group').forEach((g) => { if (g !== det) g.open = false; });
  if (det) det.open = true;
};
document.querySelectorAll('.dnav__item').forEach((b) => {
  b.addEventListener('click', () => dsTab(b.dataset.tab));
});
const dsHash = location.hash.slice(1).replace(/^\//, '').split('/')[0].split('-')[0];
if (dsHash && document.querySelector('[data-panel="' + dsHash + '"]')) dsTab(dsHash);
else dsPager(DS_ORDER[0]);