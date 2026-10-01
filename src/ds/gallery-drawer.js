/* ADAM/DS — src/ds/gallery-drawer.js · mobile drawer [plan:2026-09-29_132702-ds-docs-experience.md#phase-3] */
// Exports: gClose, gOpen (globals) — drawer toggles .is-open + scrim + body lock
const gtop = document.querySelector('.gtop__menu');
const scrim = document.querySelector('.gscrim');
const dnavEl = document.getElementById('dnav');
const gClose = () => {
  if (gtop) gtop.setAttribute('aria-expanded', 'false');
  if (scrim) scrim.hidden = true;
  if (dnavEl) dnavEl.classList.remove('is-open');
  document.body.classList.remove('is-locked');
};
const gOpen = () => {
  if (gtop) gtop.setAttribute('aria-expanded', 'true');
  if (scrim) scrim.hidden = false;
  if (dnavEl) dnavEl.classList.add('is-open');
  document.body.classList.add('is-locked');
};
if (gtop) gtop.addEventListener('click', () => {
  const o = gtop.getAttribute('aria-expanded') === 'true';
  if (o) gClose(); else gOpen();
});
if (scrim) scrim.addEventListener('click', gClose);
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') gClose(); });
// auto-close on nav click at ≤700px (enhancement, shell also handles dsTab)
document.querySelectorAll('.dnav__item,.dnav__subitem').forEach((b) => {
  b.addEventListener('click', () => {
    if (window.matchMedia('(max-width:700px)').matches) gClose();
  });
});
