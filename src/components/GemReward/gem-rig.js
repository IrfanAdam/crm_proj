/* ADAM/SHARED — src/components/GemReward/gem-rig.js · per-frame rig plumbing */
// [plan:2026-09-21_000000-lump-sum-builds.md#phase-7] · canvas sizing + backdrop law + floor-pool driver.
// — Backdrop: scene.background AND the far-side proxy's window sampler (stageTex) always point at the SAME —
// — texture — the studio stage by default, the demo image after bg() — so the gem's see-through shows the —
// — actual backdrop; winGain keeps the window's lens-lift (1.8 on the stage) from blowing out a photographic —
// — demo image (1.0 = faithful). The body's bg uniforms (bgTex/bgOn) ride the same law, demo-only, so the —
// — stage look stays untouched. —
// — Pool: when the floor carries the traced pool (GEM_CAUSTIC), re-trace it from the stone's live yaw/pitch —
// — once the pose moves past a threshold; the traced pattern is world-oriented, so the quad never rigid-spins. —
// Export map: GEM_RIG.size(rig) · GEM_RIG.backdrop(rig) · GEM_RIG.pool(rig) · GEM_RIG.tick(rig) · GEM_RIG.bg(url, rigs) · GEM_RIG.restage(rigs).
(function () {
const api = {};
let demoBg = null;
api.size = function (rig) {
const canvas = rig.canvas, renderer = rig.renderer;
if (!canvas || !renderer) return;
const w = Math.max(canvas.clientWidth, 16), h = Math.max(canvas.clientHeight, 16);
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
const lp = fl.livePose || (fl.livePose = { yaw: 1e9, pitch: 1e9 });
if (Math.abs(g.rotation.y - lp.yaw) > 0.1 || Math.abs(g.rotation.x - lp.pitch) > 0.1) {
const ok = window.GEM_CAUSTIC.live(mp, fl.poolArgs.color, fl.poolArgs.cut, { yaw: g.rotation.y, pitch: g.rotation.x, lift: g.position.y });
if (ok) { lp.yaw = g.rotation.y; lp.pitch = g.rotation.x; }
}
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
