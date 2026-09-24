/* ADAM/DS — src/ds/button-lab-inspect.js · inspector wiring */
/* Exports: blabTip — mounts tip and drives zone filtering */
// [plan:2026-09-23_002500-design-system-consolidation.md#phase-4] · hover maps parts.
// — Section —
const blabTip = document.createElement('div');
blabTip.className = 'blab-tip';
blabTip.hidden = true;
document.body.appendChild(blabTip);
function blabPartOf(el) {
  if (el.closest('.btn__spinner')) return 'spinner';
  if (el.closest('.badge')) return 'badge';
  if (el.closest('i')) return 'icon';
  if (el.closest('.blab-box') && !el.closest('.btn')) return 'box';
  if (el.closest('.btn')) return 'label';
  return null;
}
document.addEventListener('mousemove', (e) => {
  const lab = e.target.closest ? e.target.closest('[data-blab]') : null;
  const tip = blabTip;
  if (!lab) { tip.hidden = true; return; }
  const on = lab.querySelector('[data-blab-inspect]');
  const prev = lab.querySelector('[data-blab-preview]');
  if (!prev) { tip.hidden = true; return; }
  const pressed = on && on.getAttribute('aria-pressed') === 'true';
  const active = pressed && prev.contains(e.target);
  prev.dataset.inspect = active ? '1' : '';
  if (!active) { tip.hidden = true; return; }
  const btn = prev.querySelector('.btn');
  const box = prev.querySelector('.blab-box');
  let zone = null;
  if (btn && typeof blabZone === 'function') zone = blabZone(e, btn, box);
  if (!zone) zone = blabPartOf(e.target);
  if (!zone) { tip.hidden = true; return; }
  tip.innerHTML = blabInspectHtml(lab, zone);
  tip.hidden = false;
  const w = tip.offsetWidth;
  const h = tip.offsetHeight;
  let x = e.clientX + 14;
  let y = e.clientY + 16;
  if (x + w > window.innerWidth - 8) x = e.clientX - w - 12;
  if (y + h > window.innerHeight - 8) y = e.clientY - h - 12;
  tip.style.left = x + 'px';
  tip.style.top = y + 'px';
});
document.addEventListener('click', (e) => {
  const t = e.target.closest ? e.target.closest('[data-blab-inspect]') : null;
  if (!t) return;
  const pressed = t.getAttribute('aria-pressed') === 'true';
  t.setAttribute('aria-pressed', pressed ? 'false' : 'true');
  t.classList.toggle('is-on', !pressed);
  if (pressed) blabTip.hidden = true;
});
