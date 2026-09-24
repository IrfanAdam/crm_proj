/* ADAM/DS — src/ds/button-lab-overlay-render.js · zone painter */
/* Exports: blabOverlayUpdate — anchored markers per zone */
// [plan:2026-09-23_002500-design-system-consolidation.md#phase-4] · outlines + chips.
// — Section —
function blabOverlayUpdate(lab, e) {
  const stage = lab.querySelector('[data-blab-stage]');
  const prev = lab.querySelector('[data-blab-preview]');
  const btn = prev.querySelector('.btn');
  const box = prev.querySelector('.blab-box');
  const zone = blabZone(e, btn, box);
  const ov = blabOverlayFor(stage);
  const outer = ov.querySelector('[data-hl="outer"]');
  const inner = ov.querySelector('[data-hl="inner"]');
  const dot = ov.querySelector('.blab-dot');
  const r = btn.getBoundingClientRect();
  const cs = getComputedStyle(btn);
  const padL = parseFloat(cs.paddingLeft);
  const padR = parseFloat(cs.paddingRight);
  const rad = cs.borderTopLeftRadius;
  const c = blabContext(lab);
  let padTok = 'var(--spacing-4)';
  if (c.size === 'btn--sm') padTok = 'var(--spacing-3)';
  if (c.size === 'btn--lg') padTok = 'var(--spacing-6)';
  let typeTok = 'var(--font-size-sm)';
  if (c.size === 'btn--sm') typeTok = 'var(--font-size-xs)';
  if (c.size === 'btn--lg') typeTok = 'var(--font-size-md)';
  const radiusTok = c.capsule ? 'var(--radius-full)' : 'var(--radius-md)';
  const radiusPx = Math.round(parseFloat(rad));
  outer.hidden = false;
  inner.hidden = true;
  dot.hidden = true;
  outer.style.borderRadius = rad;
  inner.style.borderRadius = '4px';
  if (zone === 'pad-l' || zone === 'pad-r') {
    blabPlace(outer, stage, r);
    const inset = { left: r.left + padL, top: r.top, width: r.width - padL - padR, height: r.height };
    blabPlace(inner, stage, inset);
    inner.hidden = false;
    outer.style.borderRadius = rad;
    inner.style.borderRadius = '4px';
    blabChip(ov, stage, r, 'pad ' + padTok);
    return;
  }
  if (zone.indexOf('corner') === 0) {
    blabPlace(outer, stage, r);
    outer.style.borderRadius = rad;
    const s = stage.getBoundingClientRect();
    const left = zone === 'corner-tl' || zone === 'corner-bl';
    const top = zone === 'corner-tl' || zone === 'corner-tr';
    dot.style.left = ((left ? r.left : r.right) - s.left) + 'px';
    dot.style.top = ((top ? r.top : r.bottom) - s.top) + 'px';
    dot.hidden = false;
    const cornerRect = { left: (left ? r.left : r.right) - 1, top: (top ? r.top : r.bottom) - 1, width: 2, height: 2 };
    blabChip(ov, stage, cornerRect, radiusTok + ' ' + radiusPx + 'px');
    return;
  }
  if (zone === 'box' && box) {
    const br = box.getBoundingClientRect();
    blabPlace(outer, stage, br);
    outer.style.borderRadius = getComputedStyle(box).borderTopLeftRadius;
    blabChip(ov, stage, br, 'box pad ' + Math.round(parseFloat(getComputedStyle(box).paddingLeft)) + 'px');
    return;
  }
  let partEl = null;
  if (zone === 'icon') partEl = btn.querySelector('i');
  if (zone === 'spinner') partEl = btn.querySelector('.btn__spinner');
  if (zone === 'badge') partEl = btn.querySelector('.badge');
  if (partEl) {
    const pr = partEl.getBoundingClientRect();
    blabPlace(outer, stage, pr);
    outer.style.borderRadius = '4px';
    let text = 'icon 16 gap 8';
    if (zone === 'spinner') text = 'spin 12 motion-xl';
    if (zone === 'badge') text = 'badge ' + (c.tone || 'wash');
    blabChip(ov, stage, pr, text);
    return;
  }
  const content = { left: r.left + padL, top: r.top, width: r.width - padL - padR, height: r.height };
  blabPlace(outer, stage, content);
  outer.style.borderRadius = '4px';
  const label = typeTok + ' ' + Math.round(r.height) + 'px';
  blabChip(ov, stage, content, label);
}
