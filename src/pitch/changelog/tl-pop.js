/* ADAM/DS — ds/changelog/tl-pop · structured lane popover (safepipe-adapted) */
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export function hideTlPop(root) {
  const p = root && root.querySelector('[data-tl-pop]');
  if (p && !p.hidden) { p.hidden = true; return true; }
  return false;
}
// Per-lane popover: title + desc + accented d/t scope + Due text + stats.
// Due is text (crm has no due-jump filter; bar click opens the plan).
export function hoverTlPop(root, el, x, y) {
  const p = root && root.querySelector('[data-tl-pop]');
  if (!p || !el || !el.dataset.pop) return false;
  const lines = String(el.dataset.pop).split('\n').filter(Boolean);
  const title = lines[0] || '', sub = lines.slice(1).join('\n');
  let desc = (el.dataset.tip || '').trim();
  if (title && desc.startsWith(title)) desc = desc.slice(title.length).replace(/^[·\s]+/, '');
  const tk = String(el.dataset.tk || '').split('/');
  const tkOk = tk.length === 2 && tk[0] !== '' && tk[1] !== '';
  const scope = tkOk ? `<span class="ds-tl-pop__tasks"><b>${esc(tk[0])}</b>/${esc(tk[1])} tasks</span>` : '';
  const due = (el.dataset.due || '').trim();
  const dueRow = due ? `<span class="ds-tl-pop__due-txt">Due ${esc(due)}</span>` : '';
  p.innerHTML = `<b class="ds-tl-pop__title">${esc(title)}</b>` +
    (desc && desc !== title ? `<span class="ds-tl-pop__desc">${esc(desc)}</span>` : '') +
    scope + dueRow +
    (sub ? `<span class="ds-tl-pop__sub">${esc(sub)}</span>` : '');
  p.hidden = false;
  const pad = 10, r = p.getBoundingClientRect();
  let px = x + pad, py = y + pad;
  if (px + r.width > innerWidth - 8) px = x - r.width - pad;
  if (py + r.height > innerHeight - 8) py = y - r.height - pad;
  p.style.left = `${Math.max(8, px)}px`; p.style.top = `${Math.max(8, py)}px`;
  return true;
}
