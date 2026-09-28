/* ADAM/SHARED — src/components/GemReward/gem-tint.js · live variant retint */
// [plan:2026-09-21_000000-lump-sum-builds.md#phase-7] · one stone, recoloured in place.
// — Same canvas, same cut, same rig: apply() retargets the mounted materials and step() eases — 
// — colour, ior, and the spin rate across together, so a variant change never remounts anything, — 
// — never blanks a frame, never restarts the spin and never drops a drag in flight. The caustic — 
// — map is swapped once the colour has arrived, so the pool never disagrees with the stone. — 
// Export map: GEM_TINT.apply(canvas, name) retarget · GEM_TINT.step(rig, dt) eased commit.
(function () {
const api = {};
const EM = [0.12, 0.18, 0.18];          // emissive factor per rig.mats slot — mirrors gem-scene's surface/inner/ghost
const DUR = 1;                          // seconds: a slow cross-fade, long enough to read as a morph, not a cut
const one = function (T) { return new T.Color(1, 1, 1); };
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
function pool(rig, color) {
  const fl = rig.floors;
  if (!fl || !fl.caustic || !window.GEM_TEXTURES) return;
  if (fl.caustic.material.map) fl.caustic.material.map.dispose();
  fl.caustic.material.map = window.GEM_TEXTURES.caustic(color);
  fl.caustic.material.needsUpdate = true;
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
  rig.paint = pick.paint;
  rig.cat = { token: rig.cat.token, hue: rig.cat.hue, spin: rig.cat.spin, ior: rig.cat.ior };  // detach from the shared table
  rig.tint = { from: rig.mats[0].color.clone(), to: new T.Color(pick.paint), t: 0, cat: pick.cat,
    spin0: rig.cat.spin, spin1: pick.cat.spin, ior0: rig.cat.ior, ior1: pick.cat.ior };
  return true;
};
api.step = function (rig, dt) {
  const t = rig.tint;
  if (!t) return;
  t.t = Math.min(1, t.t + dt / DUR);
  const k = t.t * t.t * t.t * (t.t * (t.t * 6 - 15) + 10);   // smootherstep: no step at either end
  rig.cat.spin = t.spin0 + (t.spin1 - t.spin0) * k;
  rig.cat.ior = t.ior0 + (t.ior1 - t.ior0) * k;
  rig.mats.forEach(function (m, i) {
    m.color.copy(t.from).lerp(t.to, k);
    if (m.emissive) m.emissive.copy(m.color).multiplyScalar(EM[i] || 0.12);
    if (m.attenuationColor) m.attenuationColor.copy(m.color).lerp(one(window.THREE), 0.15);
    if (m.ior) m.ior = rig.cat.ior;
  });
  if (t.t === 1) {
    rig.cat = t.cat;
    pool(rig, t.to);
    rig.tint = null;
  }
};
window.GEM_TINT = api;
})();
