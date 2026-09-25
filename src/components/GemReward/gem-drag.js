/* ADAM/SHARED — src/components/GemReward/gem-drag.js · drag-to-inspect + settle back */
// [plan:2026-09-21_000000-lump-sum-builds.md#phase-5] · pointer input for the gem rigs (Task 22).
// — Drag: hold a rig and rotate it by the pointer delta (y free, x clamped ±0.9 rad); the spin clock — 
// — pauses so the stone freezes for inspection. Release: hold the pose HOLD ms, then ease back to — 
// — the grab pose and resume the spin from the same angle (never a jump). —
// — Pointer tracking also feeds the resting tilt (GEM_DRAG.at). Reduced motion has no loop, so no drag. —
// — Click guard: a release after >6px of travel swallows the click (capture phase) so a drag-to-inspect —
// — never triggers the card's fullscreen overlay; a clean tap still opens it. —
// Export map: GEM_DRAG.at · GEM_DRAG.apply(rig, now, dt) → true when it posed the rig this frame
(function () {
const api = { at: null, hold: 1200, k: 0.011 };
const rigs = function () { return (window.GEM3D && window.GEM3D.rigs) || null; };
const rigOf = function (canvas) {
const list = rigs();
if (!list) return null;
for (let i = 0; i < list.length; i++) if (list[i].canvas === canvas) return list[i];
return null;
};
const startDrag = function (e) {
const cv = e.target && e.target.closest ? e.target.closest('canvas[data-gem]') : null;
if (!cv) return;
const rig = rigOf(cv);
if (!rig || !rig.group) return;
rig.drag = { y0: rig.group.rotation.y, x0: rig.group.rotation.x, dx: 0, dy: 0, px: e.clientX, py: e.clientY, moved: 0, held: true, released: 0, settle: false };
try { cv.setPointerCapture(e.pointerId); } catch (err) { /* synthetic or lost pointer — drag still tracks */ }
};
const moveDrag = function (e) {
api.at = e;
const list = rigs();
if (!list) return;
list.forEach(function (r) {
const d = r.drag;
if (!d || !d.held) return;
d.moved += Math.abs(e.clientX - d.px) + Math.abs(e.clientY - d.py);
d.dx += (e.clientX - d.px) * api.k;
d.dy += (e.clientY - d.py) * api.k;
d.px = e.clientX;
d.py = e.clientY;
});
};
const endDrag = function () {
const list = rigs();
if (!list) return;
list.forEach(function (r) {
if (r.drag && r.drag.held) { r.drag.held = false; r.drag.released = performance.now(); if (r.drag.moved > 6) api.suppressAt = performance.now(); }
});
};
api.apply = function (rig, now, dt) {
const d = rig.drag;
if (!d) return false;
if (!d.held && !d.settle && now - d.released > api.hold) d.settle = true;
if (d.settle) {
const k = Math.pow(0.02, dt);
d.dx *= k;
d.dy *= k;
if (Math.abs(d.dx) < 0.002 && Math.abs(d.dy) < 0.002) { rig.drag = null; return false; }
}
rig.group.rotation.y = d.y0 + d.dx;
rig.group.rotation.x = Math.max(-0.9, Math.min(0.9, d.x0 + d.dy));
return true;
};
window.addEventListener('pointerdown', startDrag, { passive: true });
window.addEventListener('pointermove', moveDrag, { passive: true });
window.addEventListener('pointerup', endDrag, { passive: true });
window.addEventListener('pointercancel', endDrag, { passive: true });
window.addEventListener('click', function (e) {
if (api.suppressAt && performance.now() - api.suppressAt < 500) {
api.suppressAt = 0;
e.stopPropagation();
e.preventDefault();
}
}, true);
window.GEM_DRAG = api;
})();
