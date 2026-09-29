/* ADAM/DS — src/ds/gallery-hero.js · hero + pager [plan:2026-09-29_132702-ds-docs-experience.md#phase-2] */
// Exports: dsHero, dsPager (globals, consumed by gallery-shell.js)
const dsHero = (name) => {
  const f = document.querySelector('[data-panel="' + name + '"]');
  const h = document.getElementById('dhero');
  if (!f || !h) return;
  const k = h.querySelector('[data-hero-kicker]');
  const t = h.querySelector('[data-hero-title]');
  const c = h.querySelector('[data-hero-copy]');
  const title = f.querySelector('.ch-hero,h1,h3')?.textContent?.trim() || name;
  const lede = f.querySelector('.ch-lede,.meta,p')?.textContent?.trim() || '';
  if (k) k.textContent = name;
  if (t) t.textContent = title;
  if (c) c.textContent = lede.slice(0, 160);
  h.hidden = false;
  const ph = f.querySelector('[data-panel-hero] h1');
  if (ph) ph.textContent = title;
  const kf = f.querySelector('[data-panel-hero]');
  if (kf) kf.hidden = false;
};
const dsPager = (name) => {
  const p = document.getElementById('dpager');
  if (!p) return;
  const i = DS_ORDER.indexOf(name);
  const pr = p.querySelector('[data-prev]');
  const nx = p.querySelector('[data-next]');
  if (pr) {
    if (i > 0) {
      pr.href = '#' + DS_ORDER[i - 1];
      pr.textContent = '← ' + DS_ORDER[i - 1];
      pr.hidden = false;
      pr.onclick = (e) => { e.preventDefault(); dsTab(DS_ORDER[i - 1]); };
    } else pr.hidden = true;
  }
  if (nx) {
    if (i >= 0 && i < DS_ORDER.length - 1) {
      nx.href = '#' + DS_ORDER[i + 1];
      nx.textContent = DS_ORDER[i + 1] + ' →';
      nx.hidden = false;
      nx.onclick = (e) => { e.preventDefault(); dsTab(DS_ORDER[i + 1]); };
    } else nx.hidden = true;
  }
};
