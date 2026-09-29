/* ADAM/DS — src/ds/gallery-behavior.js · tables, accordion, tooltip, signal */
 // [plan:2026-09-29_132702-ds-docs-experience.md#phase-2]
// Sortable tables + accordion
const dsSort = (th) => {
  const asc = th.getAttribute('aria-sort') === 'ascending';
  document.querySelectorAll('.table th').forEach((x) => x.removeAttribute('aria-sort'));
  th.setAttribute('aria-sort', asc ? 'descending' : 'ascending');
};
document.addEventListener('click', (e) => {
  const th = e.target.closest('.table th');
  if (th) dsSort(th);
  const acc = e.target.closest('.accordion__trigger');
  if (acc) {
    const it = acc.closest('.accordion__item');
    const open = it.classList.toggle('accordion__item--open');
    acc.setAttribute('aria-expanded', String(open));
    it.querySelector('.accordion__panel').hidden = !open;
  }
});
document.addEventListener('keydown', (e) => {
  if (e.key !== 'Enter' && e.key !== ' ') return;
  const th = e.target.closest('.table th');
  if (th) { e.preventDefault(); dsSort(th); }
});
// Tooltip demo
const tip = document.getElementById('tip-1');
const tipBtn = document.getElementById('tip-btn');
if (tipBtn) {
  tipBtn.addEventListener('mouseenter', () => {
    tip.hidden = false;
    tip.classList.add('tooltip--visible');
  });
  tipBtn.addEventListener('mouseleave', () => {
    tip.hidden = true;
    tip.classList.remove('tooltip--visible');
  });
}
// Signal swap
document.querySelectorAll('[data-signal]').forEach((b) => {
  b.addEventListener('click', () => {
    const v = b.dataset.signal;
    const vars = {
      default: 'var(--primitive-sapphire-ui-500)',
      amber: 'var(--primitive-citrine-500)',
      teal: 'var(--primitive-green-500)',
    };
    document.documentElement.style.setProperty('--signal', vars[v]);
    const live = getComputedStyle(document.documentElement).getPropertyValue('--signal').trim();
    document.documentElement.style.setProperty('--signal-live-hex', live);
    document.querySelectorAll('[data-signal]').forEach((x) => x.classList.toggle('chip--active', x === b));
    const sw = document.getElementById('signal-swatch');
    const hx = document.getElementById('signal-hex');
    const a = getComputedStyle(document.documentElement).getPropertyValue('--accent-brand').trim();
    if (hx) hx.textContent = vars[v] + ' → ' + live + ' · computed ' + a;
    if (sw) sw.style.background = vars[v];
  });
});
