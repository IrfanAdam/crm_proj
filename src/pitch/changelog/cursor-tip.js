/* ADAM/DS — ds/changelog/cursor-tip · cursor tooltip + timeline pop handoff */
import { hoverTlPop, hideTlPop } from './tl-pop.js';
export function cursorTip(root) {
  const tipEl = () => root.querySelector('.ds-cursor-tip');
  const move = (e) => {
    const el = e.target.closest('[data-tip]'), tip = tipEl();
    if (!tip) return;
    if (el && hoverTlPop(root, el, e.clientX, e.clientY)) { tip.hidden = true; return; }
    hideTlPop(root);
    if (!el) { tip.hidden = true; return; }
    tip.textContent = el.dataset.tip; tip.hidden = false;
    const pad = 14; let x = e.clientX + pad, y = e.clientY + pad;
    const r = tip.getBoundingClientRect();
    if (x + r.width > innerWidth - 8) x = e.clientX - r.width - pad;
    if (y + r.height > innerHeight - 8) y = e.clientY - r.height - pad;
    tip.style.left = x + 'px'; tip.style.top = y + 'px';
  };
  const hideTip = () => { const t = tipEl(); if (t) t.hidden = true; };
  return { move, hideTip };
}
