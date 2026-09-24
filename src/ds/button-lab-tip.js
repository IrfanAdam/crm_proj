/* ADAM/DS — src/ds/button-lab-tip.js · zone-filtered popover content */
/* Exports: blabContext, blabRows, blabInspectHtml */
// [plan:2026-09-23_002500-design-system-consolidation.md#phase-4] · tip per zone.
// — Section —
function blabContext(root) {
  const hue = root.querySelector('[data-blab-hue-select]').value;
  const emph = root.querySelector('[data-blab-emphasis].is-on').dataset.blabEmphasis;
  const size = root.querySelector('[data-blab-size].is-on').dataset.blabSize;
  const capsule = root.querySelector('[data-blab-capsule]').checked;
  const tone = root.querySelector('[data-blab-tone]').value;
  return { hue, emph, size, capsule, tone };
}
function blabRows(title, rows) {
  let h = '<b>' + title + '</b>';
  rows.forEach((r) => { h += '<div><code>' + r[0] + '</code><span>' + r[1] + '</span></div>'; });
  return h;
}
function blabInspectHtml(root, zone) {
  const c = blabContext(root);
  const btn = root.querySelector('[data-blab-preview] .btn');
  const box = root.querySelector('[data-blab-preview] .blab-box');
  const cs = btn ? getComputedStyle(btn) : null;
  const bcs = box ? getComputedStyle(box) : null;
  let frame = '44px';
  if (c.size === 'btn--sm') frame = '32px';
  if (c.size === 'btn--lg') frame = '48px';
  let type = 'var(--font-size-sm)';
  if (c.size === 'btn--sm') type = 'var(--font-size-xs)';
  if (c.size === 'btn--lg') type = 'var(--font-size-md)';
  let pad = 'var(--spacing-0) var(--spacing-4)';
  if (c.size === 'btn--sm') pad = 'var(--spacing-0) var(--spacing-3)';
  if (c.size === 'btn--lg') pad = 'var(--spacing-0) var(--spacing-6)';
  let radius = c.capsule ? 'var(--radius-full)' : 'var(--radius-md)';
  let outer = bcs ? Math.round(parseFloat(bcs.borderTopLeftRadius)) + 'px' : '';
  let inner = cs ? Math.round(parseFloat(cs.borderTopLeftRadius)) + 'px' : '';
  let fs = cs ? Math.round(parseFloat(cs.fontSize)) + 'px' : '';
  if (zone && zone.indexOf('corner') === 0) {
    let rows = [[radius + ' ' + inner, 'button']];
    if (c.capsule) rows = [['outer ' + outer, 'box 8→48'], ['inner ' + inner, 'btn ≥8 outer-pad'], [radius, 'concentric']];
    return '<b>' + c.hue + ' ' + c.emph + '</b>' + blabRows('Corner', rows);
  }
  if (zone === 'pad-l' || zone === 'pad-r') {
    let rows = [['py var(--spacing-0) 0px', 'vertical'], ['px ' + pad.split(' ')[1] + ' 16px', 'horizontal'], ['gap var(--spacing-2) 8px', 'icon-text'], ['h ' + frame, 'height']];
    if (c.capsule) rows.unshift(['box pad ' + Math.round(parseFloat(bcs.paddingLeft)) + 'px', 'nest 8→48']);
    return '<b>' + c.hue + ' ' + c.emph + '</b>' + blabRows('Spacing', rows);
  }
  if (zone === 'label') {
    let rows = [[type + ' ' + fs, 'size'], ['var(--font-weight-semibold) 600', 'weight'], ['var(--font-leading-tight) 1.15', 'line-height'], ['gap var(--spacing-2) 8px', 'gap'], ['h ' + frame, 'height'], ['py var(--spacing-0) 0px', 'vertical'], ['px ' + pad.split(' ')[1], 'horizontal']];
    return '<b>' + c.hue + ' ' + c.emph + '</b>' + blabRows('Type', rows);
  }
  if (zone === 'icon') return '<b>' + c.hue + ' ' + c.emph + '</b>' + blabRows('Icon', [['var(--icon-size-sm) 16px', 'lead'], ['ph-bold', 'stroke'], ['gap var(--spacing-2)', '8px']]);
  if (zone === 'badge') return '<b>' + c.hue + ' ' + c.emph + '</b>' + blabRows('Badge', [['var(--radius-full)', 'capsule'], [c.tone || 'wash', 'tone'], ['var(--font-size-xs) 12px', 'label']]);
  if (zone === 'box') {
    let rows = [['outer ' + outer, 'container'], ['pad ' + Math.round(parseFloat(bcs.paddingLeft)) + 'px', 'nest 8→48'], ['inner ' + inner, 'btn ≥8']];
    return '<b>' + c.hue + ' ' + c.emph + '</b>' + blabRows('Container', rows);
  }
  if (zone === 'spinner') return '<b>' + c.hue + ' ' + c.emph + '</b>' + blabRows('Loading', [['var(--icon-size-xs) 12px', 'track'], ['currentColor', 'stroke'], ['var(--motion-duration-xl)', 'spin']]);
  let html = '<b>' + c.hue + ' ' + c.emph + '</b>';
  html += blabRows('Anatomy ' + (zone || 'label'), [[type, 'label type'], ['w-semibold', 'never wraps']]);
  return html + blabRows('Frame ' + frame, [['radius ' + radius, 'corners'], ['pad ' + pad, 'inset']]);
}
