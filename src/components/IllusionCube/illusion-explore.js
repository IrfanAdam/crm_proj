/* ADAM/SHARED — src/components/IllusionCube/illusion-explore.js · preset toggle + pan/zoom */
// [plan:2026-09-28_221212-illusion-cube-recreation.md#{#phase-7}] · explore mode (Task D).
// — Preset on = loop plays · off = clock frozen + drag-pan/wheel-zoom live —
// Export map: ILLUSION_EXPLORE.attach(rig, canvas) · .setPreset(on)
// — Section: preset —
(function () {
var api = {};
api.setPreset = function (on) {
var v = !!on;
if (!window.ILLUSION3D) return v;
window.ILLUSION3D.rigs.forEach(function (rig) {
rig.preset = v;
if (!v || !rig.camera) return;
if (rig.home) rig.camera.position.copy(rig.home);
rig.exZoom = 0;
if (rig.w && rig.resize) rig.resize(rig.w, rig.h);
});
return v;
};
// — Section: explore: 1-finger orbit · 2-finger pan · wheel/pinch zoom —
api.attach = function (rig, canvas) {
rig.preset = true;
rig.exZoom = 0;
if (rig.camera) rig.home = rig.camera.position.clone();
rig.target = new window.THREE.Vector3(0, 100, 0);
var rawResize = rig.resize;
if (rawResize) rig.resize = function (w, h) {
rawResize(w, h);
if (!rig.preset && rig.exZoom) rig.camera.zoom = rig.exZoom;
if (!rig.preset && rig.exZoom) rig.camera.updateProjectionMatrix();
};
var pts = {}, moved = 0, pinch = 0;
var orbit = function (dx, dy) {
var c = rig.camera, t = rig.target;
var off = c.position.clone().sub(t);
var sph = new window.THREE.Spherical().setFromVector3(off);
sph.theta -= dx * 0.005;
sph.phi = Math.min(Math.PI - 0.05, Math.max(0.05, sph.phi - dy * 0.005));
c.position.copy(t).add(new window.THREE.Vector3().setFromSpherical(sph));
c.lookAt(t);
c.updateMatrixWorld(true);
};
canvas.addEventListener('pointerdown', function (e) {
if (rig.preset || !rig.camera) return;
pts[e.pointerId] = [e.clientX, e.clientY];
if (Object.keys(pts).length === 2) pinch = 0;
moved = 0;
});
window.addEventListener('pointermove', function (e) {
if (!pts[e.pointerId] || rig.preset || !rig.camera) return;
var dx = e.clientX - pts[e.pointerId][0], dy = e.clientY - pts[e.pointerId][1];
pts[e.pointerId] = [e.clientX, e.clientY];
moved += Math.abs(dx) + Math.abs(dy);
if (moved <= 4) return;
var ids = Object.keys(pts);
if (ids.length >= 2) {
var a = pts[ids[0]], b = pts[ids[1]];
var d = Math.hypot(a[0] - b[0], a[1] - b[1]);
if (pinch) { var c2 = rig.camera; c2.zoom = Math.min(4, Math.max(0.2, c2.zoom * d / pinch)); rig.exZoom = c2.zoom; c2.updateProjectionMatrix(); }
pinch = d;
var c3 = rig.camera;
c3.position.x -= dx / c3.zoom;
c3.position.y += dy / c3.zoom;
rig.target.x -= dx / c3.zoom;
rig.target.y += dy / c3.zoom;
c3.updateMatrixWorld(true);
} else orbit(dx, dy);
});
var drop = function (e) {
if (moved > 4) e.stopPropagation();
delete pts[e.pointerId];
};
window.addEventListener('pointerup', drop, true);
window.addEventListener('pointercancel', function (e) { delete pts[e.pointerId]; });
canvas.addEventListener('wheel', function (e) {
if (rig.preset || !rig.camera) return;
e.preventDefault();
var c = rig.camera;
c.zoom = Math.min(4, Math.max(0.2, c.zoom * (e.deltaY < 0 ? 1.12 : 1 / 1.12)));
rig.exZoom = c.zoom;
c.updateProjectionMatrix();
}, { passive: false });
};
window.ILLUSION_EXPLORE = api;
})();
