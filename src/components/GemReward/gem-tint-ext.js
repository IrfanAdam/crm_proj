/* ADAM/SHARED — src/components/GemReward/gem-tint-ext.js · rig lookup + caustic re-texture */
// [plan:2026-10-03_144222-gem-realism-round2.md#round-19] · moved verbatim out of gem-tint.js (line-budget split).
// Export map: GEM_TINT_EXT.rigOf(canvas) · GEM_TINT_EXT.pool(rig, color)
(function () {
function rigOf(canvas) {
  const list = (window.GEM3D && window.GEM3D.rigs) || [];
  for (let i = 0; i < list.length; i++) if (list[i].canvas === canvas) return list[i];
  return null;
}
function cutOf() {
  const G = window.GEM_CUT;
  return G && G.gemCut && G.CUT ? G.gemCut(G.CUT) : null;
}
function pool(rig, color) {
  const fl = rig.floors;
  if (!fl || !fl.caustic || !window.THREE) return;
  const cut = cutOf();
  const g = rig.group;
  const pose = g ? { yaw: g.rotation.y, pitch: g.rotation.x, lift: g.position.y } : null;
  let tex = null;
  try { tex = (window.GEM_CAUSTIC && window.GEM_CAUSTIC.pool && cut) ? window.GEM_CAUSTIC.pool(color, cut, pose) : null; } catch (e) { tex = null; }
  const next = tex || (window.GEM_TEXTURES && window.GEM_TEXTURES.caustic ? window.GEM_TEXTURES.caustic(color) : null);
  if (!next) return;
  if (fl.caustic.material.map) fl.caustic.material.map.dispose();
  fl.caustic.material.map = next;
  fl.caustic.material.needsUpdate = true;
  if (pose && fl.livePose) { fl.livePose.yaw = pose.yaw; fl.livePose.pitch = pose.pitch; }   // driver picks up from here
}
window.GEM_TINT_EXT = { rigOf: rigOf, pool: pool };
})();
