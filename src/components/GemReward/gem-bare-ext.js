/* ADAM/SHARED — src/components/GemReward/gem-bare-ext.js · floor + core map primitives */
// [plan:2026-10-03_144222-gem-realism-round2.md#round-19] · moved verbatim out of gem-bare.js (line-budget split).
// Export map: GEM_BARE_EXT.floor(T, tex, y, scale, order) · GEM_BARE_EXT.coreTex(T)
(function () {
function floor(T, tex, y, scale, order) {
  const m = new T.Mesh(new T.PlaneGeometry(1, 1), new T.MeshBasicMaterial({ map: tex, transparent: true, blending: order === -1 ? T.AdditiveBlending : T.NormalBlending, depthWrite: false }));
  m.rotation.x = -Math.PI / 2;
  m.position.y = y; m.renderOrder = order;
  m.scale.setScalar(scale);
  return m;
}
// — coreTex(): the core's own map — a dense umbra (α .62 at the contact, half its weight inside ~5 css px) falling
// — monotonically to zero at the quad edge. The shared wash map's 0.22r shoulder is too broad: sized for a 60-90 px
// — tail it also gives a 20 px dark plateau, which reads as a blob.
let coreMap;
function coreTex(T) {
  if (coreMap) return coreMap;
  const cv = document.createElement('canvas'); cv.width = cv.height = 128;
  const c = cv.getContext('2d'), g = c.createRadialGradient(64, 64, 0, 64, 64, 63);
  [[0, .62], [.06, .50], [.14, .34], [.28, .21], [.45, .13], [.65, .07], [.84, .03], [1, 0]].forEach(function (p) {
    g.addColorStop(p[0], 'rgba(' + (p[0] < .3 ? '48,34,22' : '84,97,120') + ',' + p[1] + ')');   // warm umbra → cool tail
  });
  c.fillStyle = g; c.fillRect(0, 0, 128, 128);
  // — both in-plane axes project to screen-right (the floor is nearly edge-on), so tapering the +u and +v ends
  // — shortens the key-facing side and leaves the penumbra to run down-left, away from the light.
  c.globalCompositeOperation = 'destination-in';
  [[0, 0, 128, 0, [1, 1, .32]], [0, 0, 0, 128, [.36, 1, 1]]].forEach(function (q) {
    const m = c.createLinearGradient(q[0], q[1], q[2], q[3]);
    q[4].forEach(function (a, i) { m.addColorStop([0, .55, 1][i], 'rgba(0,0,0,' + a + ')'); });
    c.fillStyle = m; c.fillRect(0, 0, 128, 128);
  });
  coreMap = new T.CanvasTexture(cv); coreMap.colorSpace = T.SRGBColorSpace;
  return coreMap;
}
window.GEM_BARE_EXT = { floor: floor, coreTex: coreTex };
})();
