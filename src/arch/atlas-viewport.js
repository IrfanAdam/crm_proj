/* ADAM/SHARED — src/arch/atlas-viewport.js · pan + zoom + keys [plan:2026-09-22_082844-arch-atlas.md#phase-2] */
// — Exports: attachViewport(canvas, opts) —
const MIN = 0.3;
const MAX = 2.5;
// — Section — transform state —
export function attachViewport(canvas, opts) {
  let scale = 1;
  let tx = 0;
  let ty = 0;
  let drag = null;
  const svg = () => canvas.querySelector('svg');
  const world = () => canvas.querySelector('.atlas-world');
  const unit = () => {
    const el = svg();
    return el && el.clientWidth ? el.viewBox.baseVal.width / el.clientWidth : 1;
  };
  const apply = () => {
    const w = world();
    if (w) w.setAttribute('transform', `translate(${tx} ${ty}) scale(${scale})`);
  };
  const moved = () => drag && drag.moved;
  // — Section — cursor-anchored wheel zoom —
  canvas.addEventListener('wheel', (e) => {
    if (!svg()) return;
    e.preventDefault();
    const k = unit();
    const r = canvas.getBoundingClientRect();
    const cx = (e.clientX - r.left) * k;
    const cy = (e.clientY - r.top) * k;
    const ns = Math.max(MIN, Math.min(MAX, scale * (e.deltaY > 0 ? 0.9 : 1.1)));
    tx = cx - ((cx - tx) * ns) / scale;
    ty = cy - ((cy - ty) * ns) / scale;
    scale = ns;
    apply();
  }, { passive: false });
  // — Section — drag pan + tap select —
  canvas.addEventListener('pointerdown', (e) => {
    drag = { x: e.clientX, y: e.clientY, tx, ty, moved: false };
    canvas.setPointerCapture(e.pointerId);
  });
  canvas.addEventListener('pointermove', (e) => {
    if (!drag) return;
    const k = unit();
    const dx = (e.clientX - drag.x) * k;
    const dy = (e.clientY - drag.y) * k;
    if (Math.hypot(e.clientX - drag.x, e.clientY - drag.y) > 4) drag.moved = true;
    tx = drag.tx + dx;
    ty = drag.ty + dy;
    apply();
  });
  canvas.addEventListener('pointerup', () => {
    drag = null;
  });
  canvas.addEventListener('click', (e) => {
    if (moved()) return;
    const hit = e.target.closest('.atlas-node');
    if (hit) opts.onTap(hit.dataset.id);
    else opts.onEmpty();
  });
  // — Section — keyboard travel —
  canvas.tabIndex = 0;
  canvas.addEventListener('keydown', (e) => {
    const ids = opts.getIds();
    if (e.key === 'Escape') opts.onEscape();
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
    e.preventDefault();
    const i = ids.indexOf(opts.getSelected());
    const next = e.key === 'ArrowDown' ? (i + 1) % ids.length : (i - 1 + ids.length) % ids.length;
    if (ids[next]) opts.onTap(ids[next]);
  });
  return {
    reset() {
      scale = 1;
      tx = 0;
      ty = 0;
      apply();
    },
    resync() {
      apply();
    },
  };
}
