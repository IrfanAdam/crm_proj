/* ADAM/DS — src/ds/button-lab-inspect.js · anatomy inspector */
// [plan:2026-09-23_002500-design-system-consolidation.md#phase-4] · hover maps parts to tokens.
// — Section —
function blabContext(root) {
  const hue = root.querySelector('[data-blab-hue-select]').value;
  const emph = root.querySelector('[data-blab-emphasis].is-on').dataset.blabEmphasis;
  const size = root.querySelector('[data-blab-size].is-on').dataset.blabSize;
  const capsule = root.querySelector('[data-blab-capsule]').checked;
  const tone = root.querySelector('[data-blab-tone]').value;
  return { hue: hue, emph: emph, size: size, capsule: capsule, tone: tone };
}
const blabTip = document.createElement('div');
blabTip.className = 'blab-tip';
blabTip.hidden = true;
document.body.appendChild(blabTip);
function blabRows(title, rows) {
  let html = '<b>' + title + '</b>';
  rows.forEach((r) => { html += '<div><code>' + r[0] + '</code><span>' + r[1] + '</span></div>'; });
  return html;
}
function blabInspectHtml(root, part) {
  const c = blabContext(root);
  let frame = '44px';
  if (c.size === 'btn--sm') frame = '32px';
  if (c.size === 'btn--lg') frame = '48px';
  let type = 'var(--font-size-sm)';
  if (c.size === 'btn--sm') type = 'var(--font-size-xs)';
  if (c.size === 'btn--lg') type = 'var(--font-size-md)';
  let pad = 'var(--spacing-0) var(--spacing-4)';
  if (c.size === 'btn--sm') pad = 'var(--spacing-0) var(--spacing-3)';
  if (c.size === 'btn--lg') pad = 'var(--spacing-0) var(--spacing-6)';
  const radius = c.capsule ? 'var(--radius-full)' : 'var(--radius-md)';
  const pmap = { accent: 'action', 'core-red': 'score', 'core-yellow': 'streak' };
  pmap.success = 'success';
  pmap.destructive = 'danger';
  pmap.warning = 'warning';
  let fill = 'var(--primitive-gray-900)';
  let strong = 'var(--primitive-gray-black)';
  let soft = 'var(--primitive-gray-100)';
  const key = pmap[c.hue];
  if (key) fill = 'var(--role-' + key + ')';
  if (key) strong = 'var(--role-' + key + '-strong)';
  if (key) soft = 'var(--role-' + key + '-soft)';
  let tint = 'var(--text-primary)';
  if (c.hue !== 'neutral' && c.hue !== 'accent') tint = strong;
  if (c.hue === 'success') tint = 'var(--primitive-green-700)';
  if (c.hue === 'warning') tint = 'var(--primitive-orange-700)';
  let chrome = [['radius ' + radius, 'corners'], ['padding ' + pad, 'inset']];
  if (c.emph === 'primary') chrome.unshift(['fill ' + fill, 'solid'], ['hover ' + strong, 'deepen']);
  if (c.emph === 'secondary') chrome.unshift(['wash ' + soft, 'mid'], ['ink gray-900', 'on wash']);
  if (c.emph === 'tertiary') chrome.unshift(['surface chrome', 'quiet'], ['text ' + tint, 'voice']);
  let partRows = [[type, 'label type'], ['w-semibold', 'never wraps']];
  if (part === 'icon') partRows = [['var(--icon-size-sm)', '16px lead'], ['ph-bold', 'stroke']];
  if (part === 'spinner') partRows = [['var(--icon-size-xs)', '12px'], ['currentColor', 'track']];
  if (part === 'badge') partRows = [['var(--radius-full)', 'capsule'], [c.tone || 'wash', 'tone']];
  if (part === 'box') partRows = [['var(--radius-full)', 'container'], ['var(--spacing-3)', 'nest gap']];
  let html = '<b>' + c.hue + ' ' + c.emph + '</b>' + blabRows('Anatomy ' + part, partRows);
  return html + blabRows('Frame ' + frame, chrome);
}
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
  const part = blabPartOf(e.target);
  if (!part) { tip.hidden = true; return; }
  tip.innerHTML = blabInspectHtml(lab, part);
  tip.hidden = false;
  const w = tip.offsetWidth;
  const hgt = tip.offsetHeight;
  let x = e.clientX + 14;
  let y = e.clientY + 16;
  if (x + w > window.innerWidth - 8) x = e.clientX - w - 12;
  if (y + hgt > window.innerHeight - 8) y = e.clientY - hgt - 12;
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
