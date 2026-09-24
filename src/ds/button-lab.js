/* ADAM/DS — src/ds/button-lab.js · button playground logic */
// [plan:2026-09-23_002500-design-system-consolidation.md#phase-4] · classic script, inits on ds:doc.
// — Section —
const BLAB_EMPHASIS = { primary: 'btn--primary', secondary: 'btn--tonal', tertiary: 'btn--secondary' };
function blabInit(root) {
  if (root.dataset.done) return;
  root.dataset.done = '1';
  const q = (s) => root.querySelector(s);
  const qa = (s) => Array.from(root.querySelectorAll(s));
  const st = { hue: 'accent', emphasis: 'primary', size: 'btn--md', state: 'default' };
  const stage = q('[data-blab-stage]');
  const preview = q('[data-blab-preview]');
  const code = q('[data-blab-code]');
  const note = q('[data-blab-note]');
  const labelEl = q('[data-blab-label]');
  const iconEl = q('[data-blab-icon]');
  const iconOnlyEl = q('[data-blab-icononly]');
  const fullEl = q('[data-blab-full]');
  const capsuleEl = q('[data-blab-capsule]');
  const badgeEl = q('[data-blab-badge]');
  const countEl = q('[data-blab-count]');
  const toneEl = q('[data-blab-tone]');
  blabTuneBind(root);
  const mark = (sel, attr, val) => qa(sel).forEach((b) => b.classList.toggle('is-on', b.dataset[attr] === val));
  function currentLabel() {
    if (iconOnlyEl.checked) return 'Add';
    return labelEl.value.trim() || 'Button';
  }
  function buildAttrs() {
    if (st.state === 'disabled') return ' disabled';
    if (st.state === 'aria-disabled') return ' aria-disabled="true"';
    if (st.state === 'loading') return ' data-loading="1" aria-busy="true"';
    return '';
  }
  function hueStyle() {
    return blabHueStyle(st, stage.dataset.theme);
  }
  function buildInner(forCode) {
    const icon = iconEl.value;
    let html = '';
    if (st.state === 'loading') html += '<span class="btn__spinner" aria-hidden="true"></span>';
    else if (icon !== 'none') html += '<i class="ph-bold ' + icon + '" aria-hidden="true"></i>';
    if (!iconOnlyEl.checked) html += forCode ? '{{LABEL}}' : currentLabel();
    if (badgeEl.checked && !iconOnlyEl.checked) html += '<span class="badge ' + toneEl.value + '">' + countEl.value.trim() + '</span>';
    return html;
  }
  function render(focusIt) {
    const cls = ['btn', BLAB_EMPHASIS[st.emphasis], st.size];
    if (iconOnlyEl.checked) cls.push('btn--icon-only');
    if (fullEl.checked) cls.push('btn--full-width');
    if (capsuleEl.checked) cls.push('btn--capsule');
    const aria = iconOnlyEl.checked ? ' aria-label="' + currentLabel() + '"' : '';
    const box = capsuleEl.checked ? ['<div class="blab-box">', '</div>'] : ['', ''];
    preview.dataset.blabHue = st.hue;
    const btnHtml = '<button class="' + cls.join(' ') + '"' + aria + hueStyle() + buildAttrs() + '>' + buildInner(false) + '</button>';
    preview.innerHTML = box[0] + btnHtml + box[1];
    preview.dataset.full = fullEl.checked ? '1' : '';
    const boxEl = preview.querySelector('.blab-box');
    if (boxEl) boxEl.dataset.full = fullEl.checked ? '1' : '';
    blabTuneApply(root);
    code.textContent = '<button class="' + cls.join(' ') + '"' + aria + hueStyle() + buildAttrs() + '>' + buildInner(true).replace('{{LABEL}}', currentLabel()) + '</button>';
    note.textContent = iconOnlyEl.checked && badgeEl.checked ? 'Badge off — icon-only has no room for a count.' : '';
    badgeEl.disabled = iconOnlyEl.checked;
    if (st.state === 'focus' || focusIt === true) preview.querySelector('.btn').focus();
  }
  root.addEventListener('click', (e) => {
    const m = e.target.closest('[data-blab-emphasis]');
    if (m) { st.emphasis = m.dataset.blabEmphasis; mark('[data-blab-emphasis]', 'blabEmphasis', st.emphasis); render(); return; }
    const s = e.target.closest('[data-blab-size]');
    if (s) { st.size = s.dataset.blabSize; mark('[data-blab-size]', 'blabSize', st.size); render(); return; }
    const sf = e.target.closest('[data-blab-surface]');
    if (sf) { stage.dataset.surface = sf.dataset.blabSurface; mark('[data-blab-surface]', 'blabSurface', stage.dataset.surface); return; }
    const sc = e.target.closest('[data-blab-scheme]');
    if (sc) { stage.dataset.theme = sc.dataset.blabScheme; mark('[data-blab-scheme]', 'blabScheme', stage.dataset.theme); render(); return; }
    if (e.target.closest('[data-blab-copy]')) navigator.clipboard.writeText(code.textContent);
  });
  root.addEventListener('change', (e) => {
    if (e.target.matches('[data-blab-state]')) { st.state = e.target.value; render(true); return; }
    if (e.target.matches('[data-blab-hue-select]')) { st.hue = e.target.value; render(); return; }
    render();
  });
  root.addEventListener('input', () => render());
  render();
}
// — Section —
function blabBoot() {
  document.querySelectorAll('[data-blab]').forEach(blabInit);
}
document.addEventListener('ds:doc', blabBoot);
blabBoot();
