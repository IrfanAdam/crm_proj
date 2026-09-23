/* ADAM/DS — src/ds/contrast-controls.js · playground controls + pair-map pin */
// [plan:2026-09-23_002500-design-system-consolidation.md#phase-2]
// Exports: none (delegated clicks) · needs contrast-playground.js + overlay.js.
// — Section — family, sub, theme, copy, pin
document.addEventListener('click', (e) => {
  const fam = e.target.closest('[data-pg-fam]');
  if (fam) {
    pgFam = fam.dataset.pgFam;
    pgSubKey = null;
    pgPinPair = null;
    pgRender();
    return;
  }
  const sub = e.target.closest('[data-pg-sub]');
  if (sub) {
    pgSubKey = sub.dataset.pgSub;
    pgPinPair = null;
    pgRender();
    return;
  }
  const card = e.target.closest('[data-pg-tier]');
  if (card) {
    pgSel = card.dataset.pgTier;
    pgRender();
    return;
  }
  if (e.target.closest('[data-pg-theme]')) {
    pgDark = !pgDark;
    pgRender();
    return;
  }
  if (e.target.closest('[data-pg-unpin]')) {
    pgPinPair = null;
    pgRender();
    return;
  }
  if (e.target.closest('[data-pg-copy]')) {
    const sn = document.querySelector('[data-pg-snippet]');
    if (sn && navigator.clipboard) navigator.clipboard.writeText(sn.textContent);
    return;
  }
  const pmCard = e.target.closest('[data-pm-f]');
  if (pmCard) {
    pgPinPair = { f: pmCard.dataset.pmF, b: pmCard.dataset.pmB };
    const modal = document.getElementById('pg-pairs-modal');
    if (modal) {
      const x = modal.querySelector('[data-overlay-close]');
      if (x) x.click();
    }
    pgRender();
    const host = document.querySelector('[data-pg]');
    if (host) host.scrollIntoView({ block: 'nearest' });
  }
});
