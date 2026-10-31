/* ADAM/DS — ds/changelog/tl-edges · floating edge carets + month badge + row scroll (safepipe-adapted) */
let PAD = null;
const px = (v) => { try { return parseFloat(getComputedStyle(document.documentElement).getPropertyValue(v)) || 0; } catch { return 0; } };
const pads = () => PAD || (PAD = { l: px('--cl-32') || 32, r: px('--cl-60') || 60 });
// Per row, reveal « when tracks sit left of the visible window, » when right.
// Sticky month badge names the leftmost visible month once its tick scrolled out.
export function syncTlEdges(host) {
  if (!host) return;
  const sc = host.querySelector('.ds-tl-scroll');
  if (!sc) return;
  const vr = sc.getBoundingClientRect(), slop = px('--cl-22') || 22;
  const badge = host.querySelector('[data-tl-curmonth]');
  if (badge) {
    const months = [...host.querySelectorAll('.ds-tl-tick.is-month')];
    let cur = '', curLeft = Infinity;
    for (const m of months) { const l = m.getBoundingClientRect().left; if (l <= vr.left + slop) { cur = m.textContent; curLeft = l; } }
    if (!cur && months.length) { cur = months[0].textContent; curLeft = months[0].getBoundingClientRect().left; }
    if (badge.textContent !== cur) badge.textContent = cur;
    badge.hidden = !(cur && curLeft < vr.left);
    const ticks = host.querySelector('.ds-tl-ticks');
    if (ticks) { const want = badge.hidden ? '' : `${-badge.offsetWidth}px`; if (ticks.style.marginLeft !== want) ticks.style.marginLeft = want; }
  }
  host.querySelectorAll('[data-tl-row]').forEach((row) => {
    const tracks = [...row.querySelectorAll('[data-tl-open]')];
    const L = row.querySelector('[data-tl-edge="l"]'), R = row.querySelector('[data-tl-edge="r"]');
    if (!tracks.length) { if (L) L.hidden = true; if (R) R.hidden = true; return; }
    const f = tracks[0].getBoundingClientRect(), l = tracks[tracks.length - 1].getBoundingClientRect();
    if (L) L.hidden = !(l.right < vr.left + slop);
    if (R) R.hidden = !(f.left > vr.right - slop);
  });
}
const nudge = (el, dx) => { try {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  el.classList.remove('is-nudge-fwd', 'is-nudge-back');
  void el.offsetWidth;
  el.classList.add(dx >= 0 ? 'is-nudge-fwd' : 'is-nudge-back');
  setTimeout(() => el.classList.remove('is-nudge-fwd', 'is-nudge-back'), 220);
} catch {} };
// Caret/lane click: jump the row's tracks to the visible edge — instant, never smooth.
export function scrollRowIntoView(root, row, dir) {
  const sc = root.querySelector('.ds-tl-scroll');
  if (!sc) return;
  const tracks = [...row.querySelectorAll('[data-tl-open]')];
  if (!tracks.length) return;
  const { l: PAD_L, r: PAD_R } = pads();
  const vr = sc.getBoundingClientRect();
  const f = tracks[0].getBoundingClientRect(), l = tracks[tracks.length - 1].getBoundingClientRect();
  const fDoc = f.left - vr.left + sc.scrollLeft, lDoc = l.right - vr.left + sc.scrollLeft;
  const viewL = sc.scrollLeft, viewR = viewL + sc.clientWidth;
  let x = null;
  if (dir === 'l') x = lDoc - sc.clientWidth + PAD_R;
  else if (dir === 'r') x = fDoc - PAD_L;
  else if (fDoc < viewL + PAD_L) x = fDoc - PAD_L;
  else if (lDoc > viewR - PAD_R) x = (lDoc - fDoc <= sc.clientWidth) ? lDoc - sc.clientWidth + PAD_R : fDoc - PAD_L;
  if (x !== null && Math.abs(x - sc.scrollLeft) > 1) {
    const dx = x - sc.scrollLeft;
    sc.scrollTo({ left: Math.max(0, x), behavior: 'auto' });
    nudge(row, dx);
    syncTlEdges(root.querySelector('[data-col="timeline"]'));
  }
}
