/* ADAM/SHARED — src/components/GemReward/gem-rig.js · per-frame rig plumbing */
// [plan:2026-09-21_000000-lump-sum-builds.md#phase-7] · canvas sizing + backdrop law + floor-pool driver.
// — Backdrop: scene.background AND the far-side proxy's window sampler (stageTex) always point at the SAME —
// — texture — the studio stage by default, the demo image after bg() — so the gem's see-through shows the —
// — actual backdrop; winGain keeps the window's lens-lift (1.8 on the stage) from blowing out a photographic —
// — demo image (1.0 = faithful). The body's bg uniforms (bgTex/bgOn) ride the same law, demo-only, so the —
// — stage look stays untouched. —
// — Size: read on a ResizeObserver/resize epoch, never polled — the box only changes when layout says so; the —
// — reads and setSize/camera maths below are exactly the ones the per-frame poll used. —
// — Pool: when the floor carries the traced pool (GEM_CAUSTIC), re-trace it from the stone's live yaw/pitch —
// — once the pose moves past a threshold; the traced pattern is world-oriented, so the quad never rigid-spins. —
// — Re-arm: a box that regains area arms the loop itself, the contract deck3d/cube3d/illusion3d keep in their own
// — ResizeObserver (`size(); arm(rig)`) — intersection is never the only way back from a dead box. —
// Export map: GEM_RIG.arm(rig) · GEM_RIG.size(rig) · GEM_RIG.backdrop(rig) · GEM_RIG.pool(rig) · GEM_RIG.tick(rig) · GEM_RIG.bg(url, rigs) · GEM_RIG.restage(rigs).
(function () {
const api = {};
let demoBg = null, epoch = 0;
if (window.addEventListener) window.addEventListener('resize', function () { epoch++; }, { passive: true });
api.arm = function (rig) { if (rig.raf || rig.gone || !rig.vis || document.hidden || rig.dead || !rig.frame) return; rig.last = performance.now(); rig.raf = requestAnimationFrame(rig.frame); };
api.size = function (rig) {
const canvas = rig.canvas, renderer = rig.renderer;
if (!canvas || !renderer) return;
if (!rig.ro && window.ResizeObserver) {              // the box changes only on a layout/zoom/reflow event:
rig.ro = new window.ResizeObserver(function () { rig.epoch = -1; api.size(rig); api.arm(rig); });   // measure here, never inside a frame
rig.ro.observe(canvas);
}
if (rig.ro && rig.epoch === epoch) return;
rig.epoch = epoch;
const cw = canvas.clientWidth, ch = canvas.clientHeight;
rig.dead = !cw || !ch;                               // same gate offsetParent gave the loop: a display:none/0-box canvas has nothing to draw
const w = Math.max(cw, 16), h = Math.max(ch, 16);
if (rig.w === w && rig.h === h) return;
rig.w = w, rig.h = h;
renderer.setSize(w, h, false);
rig.camera.aspect = w / h;
rig.camera.updateProjectionMatrix();
};
api.backdrop = function (r) {
if (!r.scene) return;
const tex = demoBg || (r.canvas.dataset.gemStage === 'off' ? null : r.stageBg);
r.scene.background = tex || null;
const pm = r.mats && r.mats.find(function (m) { return m.uniforms && m.uniforms.stageTex; });
if (pm) {
pm.uniforms.stageTex.value = tex || null;
pm.uniforms.stageOn.value = tex ? 1 : 0;
if (pm.uniforms.winGain) pm.uniforms.winGain.value = demoBg ? 1.0 : 1.8;
}
if (r.mats) r.mats.forEach(function (m) {
if (!m.userData) return;
if (m.userData.bgU && tex && m.userData.bgU.value !== tex) m.userData.bgU.value = tex;
if (m.userData.bgOnU) { const want = demoBg ? 1 : 0; if (m.userData.bgOnU.value !== want) m.userData.bgOnU.value = want; }
});
};
api.pool = function (rig) {
const fl = rig.floors, g = rig.group;
if (!fl || !fl.caustic || !g) return;
const mp = fl.caustic.material.map;
const live = mp && mp.userData && mp.userData.gemCaustic && window.GEM_CAUSTIC && window.GEM_CAUSTIC.live && fl.poolArgs && fl.poolArgs.cut;
if (live) {
// — 1:1: rebuild the field from THIS frame's pose — no pose gate, no hold-last-texture, no trace on
// — the render path, so the pool can never lag behind, jump, or read as a rigid sticker.
window.GEM_CAUSTIC.live(mp, fl.poolArgs.color, fl.poolArgs.cut, { yaw: g.rotation.y, pitch: g.rotation.x, lift: g.position.y }, rig);
fl.caustic.rotation.z = 0;                             // traced pattern is already world-oriented — never rigid-spin it
} else {
fl.caustic.rotation.z = g.rotation.y;                  // fallback pool: rigid turn is all we have
}
};
api.tick = function (rig) { api.backdrop(rig); api.pool(rig); };
api.bg = function (url, rigs) { demoBg = (url && window.THREE) ? new window.THREE.TextureLoader().load(url) : null; rigs.forEach(api.backdrop); };
api.restage = function (rigs) { rigs.forEach(function (r) { if (!r.stageBg || !window.GEM_TEXTURES || !window.GEM_TEXTURES.stage) return; r.stageBg.dispose(); r.stageBg = window.GEM_TEXTURES.stage(r.canvas); api.backdrop(r); }); };
window.GEM_RIG = api;
})();
