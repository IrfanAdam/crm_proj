/* ADAM/SHARED — src/components/GemReward/gem-bare.js · stageless hero dressing */
// [plan:2026-09-21_000000-lump-sum-builds.md#phase-7] · backdrop plane + close floors.
// Export map: GEM_BARE.dress(T, scene, geo, bb, h, rad, color, bare) → floors.
(function () {
function floor(T, tex, y, scale, order) {
  const m = new T.Mesh(new T.PlaneGeometry(1, 1), new T.MeshBasicMaterial({ map: tex, transparent: true, blending: order === -1 ? T.AdditiveBlending : T.NormalBlending, depthWrite: false }));
  m.rotation.x = -Math.PI / 2;
  m.position.y = y;
  m.scale.setScalar(scale);
  m.renderOrder = order;
  return m;
}
window.GEM_BARE = {
  dress: function (T, scene, geo, bb, h, rad, color, bare, gscale) {
    if (!window.GEM_TEXTURES || !window.GEM_TEXTURES.caustic) return null;
    const GX = window.GEM_TEXTURES;
    const s = gscale || 1;
    if (bare) {
      const bp = new T.Mesh(new T.PlaneGeometry(80, 80), new T.MeshBasicMaterial({ color: new T.Color(getComputedStyle(document.body).backgroundColor) }));
      bp.material.toneMapped = false;
      bp.position.z = -12;
      scene.add(bp);
    }
    const shadow = floor(T, GX.shadow(), (bb.min.y - h * 0.07) * s, rad * 1.7 * s, -2);
    const caustic = floor(T, GX.caustic(color), (bb.min.y - h * 0.05) * s, rad * 1.5 * s, -1);
    if (!bare) {
      shadow.position.y = bb.min.y - h * 0.26;
      shadow.scale.setScalar(rad * 2.6);
      caustic.position.y = bb.min.y - h * 0.2;
      caustic.scale.setScalar(rad * 2.4);
    }
    scene.add(shadow);
    scene.add(caustic);
    return { shadow: shadow, caustic: caustic };
  }
};
})();
