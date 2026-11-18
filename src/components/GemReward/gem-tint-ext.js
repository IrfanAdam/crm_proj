/* ADAM/SHARED — src/components/GemReward/gem-tint-ext.js · rig lookup + caustic re-texture */
// [plan:2026-10-03_144222-gem-realism-round2.md#round-19] · moved verbatim out of gem-tint.js (line-budget split).
// Export map: GEM_TINT_EXT.rigOf(canvas) · GEM_TINT_EXT.pool(rig, color)
(function () {
function rigOf(canvas) {
  const list = (window.GEM3D && window.GEM3D.rigs) || [];
  for (let i = 0; i < list.length; i++) if (list[i].canvas === canvas) return list[i];
  return null;
}
let CUTR = null, CUTV = null;   // gemCut(CUT) is pure over a constant object — build it once, not once per tint frame
function cutOf() {
  const G = window.GEM_CUT;
  if (!G || !G.gemCut || !G.CUT) return null;
  if (CUTR !== G.CUT) { CUTR = G.CUT; CUTV = G.gemCut(G.CUT); }
  return CUTV;
}
const TP = { yaw: 0, pitch: 0, lift: 0 };   // one pose record for the module — pool() is the only writer, live() reads it at once
function pool(rig, color) {
  const fl = rig.floors;
  if (!fl || !fl.caustic || !window.THREE) return;
  const cut = cutOf();
  const g = rig.group;
  if (g) { TP.yaw = g.rotation.y; TP.pitch = g.rotation.x; TP.lift = g.position.y; }
  const pose = g ? TP : null;
  const cur = fl.caustic.material.map;
  let tex = null;
  // — Repaint the traced pool IN PLACE when one is already mounted: the field build and the blit are the
  // — same code path as pool(), so the bytes are identical — but no canvas/CanvasTexture is allocated and
  // — no GPU texture is created and disposed on every other frame of a 1 s tint tween.
  if (cut && pose && cur && cur.userData && cur.userData.gemCaustic && window.GEM_CAUSTIC && window.GEM_CAUSTIC.live && window.GEM_CAUSTIC.live(cur, color, cut, pose, rig)) tex = cur;
  if (!tex) { try { tex = (window.GEM_CAUSTIC && window.GEM_CAUSTIC.pool && cut) ? window.GEM_CAUSTIC.pool(color, cut, pose) : null; } catch (e) { tex = null; } }
  const next = tex || (window.GEM_TEXTURES && window.GEM_TEXTURES.caustic ? window.GEM_TEXTURES.caustic(color) : null);
  if (!next) return;
  if (fl.caustic.material.map && fl.caustic.material.map !== next) fl.caustic.material.map.dispose();
  fl.caustic.material.map = next;
  next.needsUpdate = true;
  if (pose && fl.livePose) { fl.livePose.yaw = pose.yaw; fl.livePose.pitch = pose.pitch; }   // driver picks up from here
}
window.GEM_TINT_EXT = { rigOf: rigOf, pool: pool };
})();
