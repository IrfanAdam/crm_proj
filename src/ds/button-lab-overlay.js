/* ADAM/DS — src/ds/button-lab-overlay.js · dev-mode highlights */
// [plan:2026-09-23_002500-design-system-consolidation.md#phase-4] · layer + zones.
// — Section —
function blabOverlayFor(stage) {
  let ov = stage.querySelector(':scope > .blab-overlay');
  if (ov) return ov;
  ov = document.createElement('div');
  ov.className = 'blab-overlay';
  ['outer', 'inner', 'dot', 'chip'].forEach((k) => {
    const d = document.createElement('div');
    d.className = 'blab-' + (k === 'dot' || k === 'chip' ? k : 'hl');
    if (d.className === 'blab-hl') d.dataset.hl = k;
    d.hidden = true;
    ov.appendChild(d);
  });
  stage.appendChild(ov);
  return ov;
}
function blabPlace(el, stage, rect) {
  const s = stage.getBoundingClientRect();
  el.style.left = (rect.left - s.left - stage.clientLeft) + 'px';
  el.style.top = (rect.top - s.top - stage.clientTop) + 'px';
  el.style.width = rect.width + 'px';
  el.style.height = rect.height + 'px';
}
function blabChip(ov, stage, x, y, text) {
  const chip = ov.querySelector('.blab-chip');
  chip.textContent = text;
  chip.hidden = false;
  const s = stage.getBoundingClientRect();
  let cx = x - s.left + 12;
  let cy = y - s.top - 32;
  if (cx < 4) cx = 4;
  if (cy < 4) cy = y - s.top + 18;
  chip.style.left = cx + 'px';
  chip.style.top = cy + 'px';
}
function blabHideOverlay(stage) {
  const ov = stage.querySelector(':scope > .blab-overlay');
  if (!ov) return;
  Array.from(ov.children).forEach((c) => { c.hidden = true; });
}
function blabZone(e, btn, box) {
  const r = btn.getBoundingClientRect();
  const x = e.clientX - r.left;
  const y = e.clientY - r.top;
  const edge = 14;
  if (x < edge && y < edge) return 'corner-tl';
  if (x > r.width - edge && y < edge) return 'corner-tr';
  if (x < edge && y > r.height - edge) return 'corner-bl';
  if (x > r.width - edge && y > r.height - edge) return 'corner-br';
  const t = e.target;
  if (t.closest('.btn__spinner')) return 'spinner';
  if (t.closest('.badge')) return 'badge';
  if (t.closest('i')) return 'icon';
  if (box && t.closest('.blab-box') && !t.closest('.btn')) return 'box';
  const cs = getComputedStyle(btn);
  if (x < parseFloat(cs.paddingLeft)) return 'pad-l';
  if (x > r.width - parseFloat(cs.paddingRight)) return 'pad-r';
  return 'label';
}
document.addEventListener('mousemove', (e) => {
  const lab = e.target.closest ? e.target.closest('[data-blab]') : null;
  if (!lab) return;
  const on = lab.querySelector('[data-blab-inspect]');
  const pressed = on && on.getAttribute('aria-pressed') === 'true';
  const stage = lab.querySelector('[data-blab-stage]');
  const prev = lab.querySelector('[data-blab-preview]');
  const btn = prev ? prev.querySelector('.btn') : null;
  if (!pressed || !btn || !prev.contains(e.target)) {
    if (stage) blabHideOverlay(stage);
    return;
  }
  blabOverlayUpdate(lab, e);
});
