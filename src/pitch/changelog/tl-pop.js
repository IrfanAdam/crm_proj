/* ADAM/DS — ds/changelog/tl-pop · structured lane popover (safepipe-adapted) */
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export function hideTlPop(root) {
  const p = root && root.querySelector('[data-tl-pop]');
  if (p && !p.hidden) { p.hidden = true; return true; }
  return false;
}
// Per-lane popover: title + goal + phases/tasks scope + status + stats + range.
// Due is text (crm has no due-jump filter; bar click opens the plan).
export function hoverTlPop(root, el, x, y) {
  const p = root && root.querySelector('[data-tl-pop]');
  if (!p || !el || !el.dataset.pop) return false;
  const title = String(el.dataset.pop).split('\n').filter(Boolean)[0] || '';
  const desc = (el.dataset.desc || '').trim();
  const ph = (el.dataset.ph || '').trim();
  const tk = String(el.dataset.tk || '').trim();
  const stTxt = (el.dataset.st || '').trim();
  const cm = (el.dataset.cm || '').trim();
  const rv = (el.dataset.rv || '').trim();
  const span = (el.dataset.span || '').trim();
  const due = (el.dataset.due || '').trim();
  const scope = (ph || tk)
    ? `<span class="ds-tl-pop__tasks">` +
      (ph ? `<b>${esc(ph)}</b> phases` : '') +
      (ph && tk ? ' · ' : '') +
      (tk ? `<b>${esc(tk)}</b> tasks` : '') + `</span>`
    : '';
  const stats = [cm ? `${esc(cm)} commits` : '', rv ? `${esc(rv)} revs` : ''].filter(Boolean).join(' · ');
  p.innerHTML = `<b class="ds-tl-pop__title">${esc(title)}</b>` +
    (desc ? `<span class="ds-tl-pop__desc">${esc(desc)}</span>` : '') +
    scope +
    (stTxt ? `<span class="ds-tl-pop__status">${esc(stTxt)}</span>` : '') +
    (stats ? `<span class="ds-tl-pop__stats">${stats}</span>` : '') +
    (due ? `<span class="ds-tl-pop__due-txt">Due ${esc(due)}</span>` : '') +
    (span ? `<span class="ds-tl-pop__date">${esc(span)}</span>` : '');
  p.hidden = false;
  // Measure at a neutral origin so shrink-to-fit width never depends on the last position.
  p.style.left = '-9999px'; p.style.top = '0px';
  const pad = 10, r = p.getBoundingClientRect();
  let px = x + pad, py = y + pad;
  if (px + r.width > innerWidth - 8) px = x - r.width - pad;
  if (py + r.height > innerHeight - 8) py = y - r.height - pad;
  // Final clamp: a lane scrolled off-screen can push the flip past the opposite edge.
  px = Math.min(px, innerWidth - r.width - 8);
  py = Math.min(py, innerHeight - r.height - 8);
  p.style.left = `${Math.max(8, px)}px`; p.style.top = `${Math.max(8, py)}px`;
  return true;
}
