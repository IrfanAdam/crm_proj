/* ADAM/DS — src/ds/gem-resize.js · draggable edges for a resize host (the gem card) */
// [plan:2026-09-28_000000-lump-sum-builds.md#phase-4] · drag the east / south / corner grips of any
// — [data-gem-resize] host; the rig re-sizes itself every frame, so the render follows the drag live. —
// Export map: [data-gem-resize] host · [data-gem-grip="e|s|se"] handles · .is-resizing while dragging
(function () {
const MIN_W = 280, MIN_H = 220;
const clamp = function (v, lo, hi) { return Math.max(lo, Math.min(hi, v)); };
document.querySelectorAll('[data-gem-resize]').forEach(function (host) {
host.addEventListener('pointerdown', function (e) {
const grip = e.target.closest('[data-gem-grip]');
if (!grip) return;
e.preventDefault();
const dir = grip.dataset.gemGrip;
const box = host.getBoundingClientRect();
const x0 = e.clientX, y0 = e.clientY, w0 = box.width, h0 = box.height;
const maxW = window.innerWidth * 0.94, maxH = window.innerHeight * 0.9;
const move = function (ev) {
if (dir.indexOf('e') > -1) {
host.style.flex = '0 0 auto';
host.style.maxWidth = clamp(w0 + ev.clientX - x0, MIN_W, maxW) + 'px';
host.style.width = host.style.maxWidth;
}
if (dir.indexOf('s') > -1) host.style.height = clamp(h0 + ev.clientY - y0, MIN_H, maxH) + 'px';
};
const up = function () {
host.classList.remove('is-resizing');
window.removeEventListener('pointermove', move);
window.removeEventListener('pointerup', up);
window.removeEventListener('pointercancel', up);
};
host.classList.add('is-resizing');
window.addEventListener('pointermove', move);
window.addEventListener('pointerup', up);
window.addEventListener('pointercancel', up);
});
});
})();
