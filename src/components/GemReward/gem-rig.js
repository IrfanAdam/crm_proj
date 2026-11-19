/* ADAM/SHARED — src/components/GemReward/gem-rig.js · per-frame rig plumbing */
// [plan:2026-09-21_000000-lump-sum-builds.md#phase-7] · canvas sizing + backdrop law + floor-pool driver.
// — Backdrop: scene.background AND the far-side proxy's window sampler (stageTex) always point at the SAME —
// — texture — the studio stage by default, the demo image after bg() — so the gem's see-through shows the —
// — actual backdrop; winGain keeps the window's lens-lift (1.8 on the stage) from blowing out a photographic —
// — demo image (1.0 = faithful). The body's bg uniforms (bgTex/bgOn) ride the same law, demo-only, so the —
// — stage look stays untouched. — Both scans are indexed for-loops: a steady-state frame allocates nothing. —
// — Size: read on a ResizeObserver/resize epoch, never polled — the box only changes when layout says so; the —
// — reads and setSize/camera maths below are exactly the ones the per-frame poll used. —
// — Pool: the traced field is re-traced from the stone's live yaw/pitch once the pose passes a threshold; the pattern —
// — is world-oriented, so the quad never rigid-spins. One pose and one poolPose record per rig are reused, and the —
// — gem+colour key is rebuilt only when that value actually changes — a steady-state frame allocates nothing. While —
// — a drag object exists (hold AND spring settle) the field repaints at most once per two frames, plus exactly one —
// — catch-up on the frame it clears. Scheduling only: mid-settle frames may differ, the resting image does not. —
// — Re-arm: a box that regains area arms the loop itself, the contract deck3d/cube3d/illusion3d keep in their own —
// — ResizeObserver (`size(); arm(rig)`) — intersection is never the only way back from a dead box. —
// Export map: GEM_RIG.arm(rig) · GEM_RIG.size(rig) · GEM_RIG.backdrop(rig) · GEM_RIG.pool(rig) · GEM_RIG.tick(rig) · GEM_RIG.bg(url, rigs) · GEM_RIG.restage(rigs).
(function () {
const api = {};
let demoBg = null, epoch = 0;
if (window.addEventListener) window.addEventListener('resize', function () { epoch++; }, { passive: true });
api.arm = function (rig) { if (rig.raf || rig.gone || !rig.vis || rig.occl || document.hidden || rig.dead || !rig.frame) return; rig.last = performance.now(); rig.raf = requestAnimationFrame(rig.frame); };
api.size = function (rig) {
const canvas = rig.canvas, renderer = rig.renderer;
if (!canvas || !renderer) return;
if (!rig.ro && window.ResizeObserver) {              // the box changes only on a layout/zoom/reflow event:
rig.ro = new window.ResizeObserver(function () { rig.epoch = -1; api.size(rig); api.arm(rig); });   // measure here, never inside a frame
rig.ro.observe(canvas);
}
if (rig.ro && rig.epoch === epoch) return;
rig.epoch = epoch;
const rc = canvas.getBoundingClientRect();           // the DISPLAYED box: the workspace canvas scales the phone frame with --zoom
const cw = rc.width || canvas.clientWidth, ch = rc.height || canvas.clientHeight;
rig.dead = !cw || !ch;                               // same gate offsetParent gave the loop: a display:none/0-box canvas has nothing to draw
const w = Math.max(Math.round(cw), 16), h = Math.max(Math.round(ch), 16);
if (rig.w === w && rig.h === h) return;
rig.w = w, rig.h = h;
renderer.setSize(w, h, false);
rig.camera.aspect = w / h;
rig.camera.updateProjectionMatrix();
};
const slot = function (rig, k) { let o = rig[k]; if (!o) { o = { yaw: 0, pitch: 0, lift: 0 }; rig[k] = o; } return o; };   // one record per rig, reused — never per frame
const keyOf = function (rig, gem, col) { rig.poolKey = gem + (col && col.getHexString ? col.getHexString() : ''); return rig.poolKey; };   // only called when the value changed
api.backdrop = function (r) {
if (!r.scene) return;
const tex = demoBg || (r.canvas.dataset.gemStage === 'off' ? null : r.stageBg);
r.scene.background = tex || null;
const mats = r.mats;
if (mats) {
let pm = null, i = 0;
for (; i < mats.length; i++) if (mats[i].uniforms && mats[i].uniforms.stageTex) { pm = mats[i]; break; }
if (pm) {
pm.uniforms.stageTex.value = tex || null;
pm.uniforms.stageOn.value = tex ? 1 : 0;
if (pm.uniforms.winGain) pm.uniforms.winGain.value = demoBg ? 1.0 : 1.8;
}
const want = demoBg ? 1 : 0;
for (i = 0; i < mats.length; i++) {
const m = mats[i];
if (!m.userData) continue;
if (m.userData.bgU && tex && m.userData.bgU.value !== tex) m.userData.bgU.value = tex;
if (m.userData.bgOnU) { if (m.userData.bgOnU.value !== want) m.userData.bgOnU.value = want; }
}
}
};
api.pool = function (rig) {
const fl = rig.floors, g = rig.group;
if (!fl || !fl.caustic || !g) return;
const pa = fl.poolArgs, mp = fl.caustic.material.map;
const live = mp && mp.userData && mp.userData.gemCaustic && window.GEM_CAUSTIC && window.GEM_CAUSTIC.live && pa && pa.cut;
if (!fl.caustic.visible) return;                        // an invisible floor buys no field and no upload
if (live) {
// — 1:1, pose-gated: the anchor (where the pool sits) is rewritten every frame, the traced field only when the stone
// — has actually turned. Measured at the shipped spin (0.315 rad/s) the field moves 0.27 % of peak per 33 ms and no
// — texel by more than 1 % — so 0.02 rad of yaw (<1.3 levels) is the threshold, and a tint still repaints at once.
const pose = slot(rig, 'pose'), col = pa.color, gem = rig.canvas.dataset.gem || '';
const cr = col ? col.r : -1, cg = col ? col.g : -1, cb = col ? col.b : -1;
const changed = rig.kGem !== gem || cr !== rig.kr || cg !== rig.kg || cb !== rig.kb;
if (changed) { rig.kGem = gem; rig.kr = cr; rig.kg = cg; rig.kb = cb; keyOf(rig, gem, col); }
pose.yaw = g.rotation.y; pose.pitch = g.rotation.x; pose.lift = g.position.y;
let pp = rig.poolPose, paint = !pp || changed || Math.abs(pose.yaw - pp.yaw) > 0.02 || Math.abs(pose.pitch - pp.pitch) > 0.01 || Math.abs(pose.lift - pp.lift) > 0.01;
const active = !!rig.drag;                              // hold + spring settle: the drag object is the whole gravity of it
if (active) { rig.poolN = (rig.poolN | 0) ^ 1; if (!rig.poolN) paint = false; }   // ≤ one traced repaint per two drag frames
if (rig.poolDrag && !active) paint = true;              // exactly one catch-up on the frame the drag object clears, at the settled pose
rig.poolDrag = active;
if (paint) { pp = rig.poolPose = pp || slot(rig, 'poolPose'); pp.yaw = pose.yaw; pp.pitch = pose.pitch; pp.lift = pose.lift; window.GEM_CAUSTIC.live(mp, col, pa.cut, pose, rig); }
else window.GEM_CAUSTIC.live(mp, col, pa.cut, pose, rig, 1);   // anchor only — the pool still tracks the stone 1:1
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
