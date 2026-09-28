/* ADAM/SHARED — src/components/GemReward/gem-bare.js · stageless hero dressing */
// [plan:2026-09-21_000000-lump-sum-builds.md#phase-7] · backdrop plane + light-cast floors.
// — Light: the floors are defined by the scene's key directional (3,5,4), not pinned under the — 
// —        culet — the contact shadow lies opposite the light, stretched on its ground azimuth, — 
// —        and gem3d re-aims both pools per frame from the stone's height, yaw and pitch. — 
// — Hero: the bare stone's pool is spread wider and carries less weight than the staged card's — 
// —        (HERO_SPREAD/HERO_SOFT) — softer and blurrier, so it never competes with the facets. — 
// Export map: GEM_BARE.dress(T, scene, geo, bb, h, rad, color, bare, gscale, cy) → { shadow, caustic, ground, rest, k, so, base }.
(function () {
const KEY = { x: 3, y: 5, z: 4 };              // gem-scene's key directional — the floors are derived from it
const GROUND = { x: -KEY.x / KEY.y, z: -KEY.z / KEY.y };   // ground shift the key throws per unit of height
const PULL = 0.5;                              // how far the caustic travels for a lift of the stone's own height
const UMBRA = 0.28;                            // the dark pool barely leaves the contact point — see aim()
const HERO_SOFT = 0.6;                         // bare hero: the pool carries 0.6 of the card's weight
const HERO_SPREAD = 1.35;                      // bare hero: same gradient over a wider quad → soft, blurred edge
function floor(T, tex, y, scale, order) {
  const m = new T.Mesh(new T.PlaneGeometry(1, 1), new T.MeshBasicMaterial({ map: tex, transparent: true, blending: order === -1 ? T.AdditiveBlending : T.NormalBlending, depthWrite: false }));
  m.rotation.x = -Math.PI / 2;
  m.position.y = y;
  m.scale.setScalar(scale);
  m.renderOrder = order;
  return m;
}
// — aim(): the per-frame half — the pools are re-placed from the stone's live height, yaw and pitch, —
// — so the light reads as the thing deciding where they land (and they keep up while it is dragged) —
const aim = function (rig) {
  const fl = rig.floors;
  if (!fl || !fl.base || rig.stageBg) return;
  const g = rig.group;
  const hgt = fl.rest + g.position.y;                  // stone-centre height above the contact plane
  const k = hgt / fl.rest;                             // 1 at rest, >1 lifted, <1 dipped
  const gx = fl.ground.x * hgt * fl.k;
  const gz = fl.ground.z * hgt * fl.k * 0.6;           // depth throw damped: on screen it only reads as the pool rising
  const pitch = Math.sin(Math.max(-0.35, Math.min(0.35, g.rotation.x))) * 0.3;
  fl.shadow.position.x = gx * UMBRA;                   // the stone is a lens: almost no umbra, so the dark pool stays
  fl.shadow.position.z = gz * UMBRA;                   // on the contact point while the cast light lands off-axis below
  fl.shadow.scale.set(fl.base.sx * (0.94 + 0.1 * k), fl.base.sy * (0.94 + 0.1 * k), 1);
  fl.shadow.material.opacity = (fl.so * 0.62) / (0.45 + 0.55 * k);
  fl.caustic.rotation.z = g.rotation.y;                // the pool turns with the facets casting it
  fl.caustic.position.x = gx;
  fl.caustic.position.z = fl.base.cz + gz + pitch;
  fl.caustic.scale.setScalar(fl.base.cs * (1 + 0.3 * (k - 1)));
  fl.caustic.material.opacity = 0.72 - g.position.y * 2.2;
};
window.GEM_BARE = {
  aim: aim,
  dress: function (T, scene, geo, bb, h, rad, color, bare, gscale, cy) {
    if (!window.GEM_TEXTURES || !window.GEM_TEXTURES.caustic) return null;
    const GX = window.GEM_TEXTURES;
    const s = gscale || 1;
    const rest = cy - (bb.min.y - h * 0.12) * s;   // stone-centre height above the contact plane at rest
    if (bare) {
      const bp = new T.Mesh(new T.PlaneGeometry(80, 80), new T.MeshBasicMaterial({ color: new T.Color(getComputedStyle(document.body).backgroundColor) }));
      bp.material.toneMapped = false;
      bp.position.z = -12;
      scene.add(bp);
    }
    const shadow = floor(T, GX.shadow(), (bb.min.y - h * 0.12) * s, rad * 1.45 * s, -2);
    const caustic = floor(T, GX.caustic(color), (bb.min.y - h * 0.1) * s, rad * 1.5 * s, -1);
    if (!bare) {
      shadow.position.y = bb.min.y - h * 0.26;
      shadow.scale.setScalar(rad * 2.6);
      caustic.position.y = bb.min.y - h * 0.2;
      caustic.scale.setScalar(rad * 2.4);
    } else {
      // — the umbra leans away from the key and stretches on its azimuth, but only a little: the stone —
      shadow.rotation.z = Math.atan2(-GROUND.z, GROUND.x);
      shadow.scale.set(shadow.scale.x * 1.16 * HERO_SPREAD, shadow.scale.y * 0.88 * HERO_SPREAD, 1);
    }
    scene.add(shadow);
    scene.add(caustic);
    return { shadow: shadow, caustic: caustic, ground: GROUND, rest: rest, k: PULL, so: bare ? HERO_SOFT : 1,
      base: { sx: shadow.scale.x, sy: shadow.scale.y, cs: caustic.scale.x, cz: caustic.position.z, cy: caustic.position.y } };
  }
};
})();
