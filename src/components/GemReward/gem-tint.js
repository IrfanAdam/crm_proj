/* ADAM/SHARED — src/components/GemReward/gem-tint.js · live variant retint */
// [plan:2026-09-21_000000-lump-sum-builds.md#phase-7] · one stone, recoloured in place.
// — Same canvas, same cut, same rig: apply() retargets the mounted materials and step() eases —
// — colour, ior and spin across together, so a variant change never remounts anything, never —
// — blanks a frame and never drops a drag in flight. Body colour, attenuation and the far-side —
// — proxy uniforms (tint/ior) all travel; the caustic re-textures from the physics pool —
// — (GEM_CAUSTIC.pool, falling back to GEM_TEXTURES.caustic) as the tint moves. —
// Export map: GEM_TINT.apply(canvas, name) retarget · GEM_TINT.step(rig, dt) eased commit.
(function () {
const api = {};
const DUR = 1;                          // seconds: a slow cross-fade, long enough to read as a morph, not a cut
let W = null;
const one = function (T) { return W || (W = new T.Color(1, 1, 1)); };
const warmth = function (c) { return Math.max(0, c.r - c.b); };   // warm paints read washed in the cool studio env — absorb harder
function token(name) {
  const cat = window.GEM_CUT && window.GEM_CUT.CATEGORIES[name];
  if (!cat) return null;
  const root = getComputedStyle(document.documentElement);
  const paint = root.getPropertyValue(cat.token).trim() || root.getPropertyValue('--primitive-sapphire-ui-500').trim();
  return { cat: cat, paint: paint };
}
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
api.apply = function (canvas, name) {
  const pick = token(name);
  if (!pick) return false;
  canvas.dataset.gem = name;
  const rig = rigOf(canvas);
  if (!rig || !rig.mats || !window.THREE) {
    if (window.GEM_FALLBACK && canvas.dataset.gemDone) window.GEM_FALLBACK.paint(canvas, pick.paint);
    return false;
  }
  const T = window.THREE;
  const from = rig.paintCur ? rig.paintCur.clone() : new T.Color(rig.paint);
  const to = new T.Color(pick.paint);
  rig.paintCur = to.clone();
  rig.paint = pick.paint;
  rig.cat = { token: rig.cat.token, hue: rig.cat.hue, spin: rig.cat.spin, ior: rig.cat.ior };  // detach from the shared table
  rig.tint = { from: from, to: to, t: 0, cat: pick.cat, spin0: rig.cat.spin, spin1: pick.cat.spin, ior0: rig.cat.ior, ior1: pick.cat.ior };
  return true;
};
api.step = function (rig, dt) {
  const t = rig.tint;
  if (!t) return;
  t.t = Math.min(1, t.t + dt / DUR);
  t.n = (t.n || 0) + 1;
  const k = t.t * t.t * t.t * (t.t * (t.t * 6 - 15) + 10);   // smootherstep: no step at either end
  rig.cat.spin = t.spin0 + (t.spin1 - t.spin0) * k;
  rig.cat.ior = t.ior0 + (t.ior1 - t.ior0) * k;
  const cur = t.from.clone().lerp(t.to, k);
  rig.mats.forEach(function (m) {
    if (m.color) m.color.copy(cur).lerp(one(window.THREE), 0.45);
    if (m.attenuationColor) m.attenuationColor.copy(cur).lerp(one(window.THREE), 0.1);
    if (m.attenuationDistance !== undefined) m.attenuationDistance = 1.45 - 0.95 * warmth(cur);
    if (m.ior) m.ior = rig.cat.ior;
    if (m.uniforms && m.uniforms.tint) m.uniforms.tint.value.copy(t.from).lerp(t.to, k);
    if (m.uniforms && m.uniforms.rampMid && cur) {
      const rl = cur.clone().lerp(new T.Color(1, 1, 1), 0.62), rd = cur.clone().multiply(new T.Color(0.3, 0.35, 0.7));
      m.uniforms.rampMid.value.copy(cur);
      m.uniforms.rampLite.value.copy(rl);
      m.uniforms.rampDeep.value.copy(rd);
      m.uniforms.rampPink.value.copy(rl.clone().lerp(new T.Color(1, 0.62, 0.85), 0.75));
    }
    if (m.uniforms && m.uniforms.ior) m.uniforms.ior.value = rig.cat.ior;
  });
  if (t.t < 1 && t.n % 2 === 0) pool(rig, cur);
  if (t.t === 1) {
    rig.cat = t.cat;
    pool(rig, t.to);
    rig.tint = null;
  }
};
window.GEM_TINT = api;
})();
