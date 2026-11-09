/* ADAM/SHARED — src/components/GemReward/gem-bare.js · stageless hero dressing */
// [plan:2026-09-21_000000-lump-sum-builds.md#phase-7] · backdrop plane + light-cast floors.
// — Light: both floors derive from the scene's key (3,5,4); gem3d re-aims them per frame from the stone's height, yaw
// —        and pitch, so the light reads as the thing deciding where they land.
// — Shadow (Task 41): a wide umbra wash plus a contact core pinned to the culet's own pixel — cast along the eye ray
// —        through that pixel, because the floor under the stone is cropped (straight down lands off-frame) and a fixed
// —        z-offset detaches as the tilt lifts the culet. Both sit under the additive caustic (−2 < −1.4 < −1), so E2's lift is untouched.
// Export map: GEM_BARE.dress(T, scene, geo, bb, h, rad, color, bare, gscale, cy, cut) → { shadow, contact, caustic, ground, rest, k, so, base }.
(function () {
const KEY = { x: 3, y: 5, z: 4 };              // gem-scene's key directional — the floors are derived from it
const GROUND = { x: -KEY.x / KEY.y, z: -KEY.z / KEY.y };   // ground shift the key throws per unit of height
const PULL = 0.5;                              // how far the caustic travels for a lift of the stone's own height
const UMBRA = 0.28;                            // the dark wash barely leaves the contact point — see aim()
const HERO_SOFT = 0.48, CARD_SOFT = 0.48;      // pool weight per stage: bare hero vs staged card (Task 5)
const HERO_SPREAD = 1.55, CARD_SPREAD = 1.48;  // wash quad spread: bare hero vs card, against the caustic ring's softness
const CORE = { w: 1.6, d: 0.8, op: 0.2 };      // contact core: world size · weight (aim re-pins it to the culet's pixel)
const CARD_AZ = Math.atan2(KEY.z, KEY.x);      // long-axis aligns with key ground azimuth (3,4) → 53.13° (±5° probe)
const { floor, coreTex } = window.GEM_BARE_EXT;
// — aim(): the per-frame half — the pools are re-placed from the stone's live height, yaw and pitch, so the light reads
// — as the thing deciding where they land. Staged rigs keep the neutral pose at rest (h0): only yaw, pitch, float move them.
const aim = function (rig) {
  const fl = rig.floors; if (!fl || !fl.base) return;   // no floors dressed yet
  const g = rig.group, hgt = fl.rest + g.position.y;   // stone-centre height above the contact plane
  const k = hgt / fl.rest, h0 = rig.stageBg ? fl.rest : 0;   // k: 1 at rest, >1 lifted, <1 dipped; staged h0 = neutral
  const gx = fl.ground.x * (hgt - h0) * fl.k, gz = fl.ground.z * (hgt - h0) * fl.k;   // no 0.6 damping: collinear with key
  // — the cast pool is NOT an ornament hung under the stone: gem-caustic publishes the quad's own screen motion
  // — (off.x/off.z) pinned to the ray through the stone's centroid, so it slides as far as the stone does (Task 26's 1:1).
  const mp = fl.caustic.material.map, traced = !!(mp && mp.userData && mp.userData.gemCaustic);
  const off = traced && window.GEM_CAUSTIC ? window.GEM_CAUSTIC.off : null;   // the pool's published 1:1 motion
  const ox = off ? off.x : 0, oz = off ? off.z : 0, fs = off && off.s > 0 ? Math.max(0.88, Math.min(1.12, off.s)) : 1;   // ±12 %
  fl.shadow.position.set(gx * UMBRA, fl.shadow.position.y, gz * UMBRA);   // the stone is a lens: almost no umbra, so
  fl.shadow.scale.set(fl.base.sx * (0.94 + 0.1 * k), fl.base.sy * (0.94 + 0.1 * k), 1);   // the wash stays on the contact
  fl.shadow.material.opacity = (fl.so * 0.62) / (0.45 + 0.55 * k);                        // point, light lands off-axis
  fl.contact.visible = fl.shadow.visible;               // the panel's Floor toggle owns the core too
  const cam = rig.camera, vp = fl.vp || (fl.vp = new window.THREE.Vector3());
  vp.set(0, fl.cu, 0).applyMatrix4(g.matrixWorld).project(cam); vp.set(vp.x, vp.y, 0.5).unproject(cam).sub(cam.position).normalize();  // culet pixel → eye ray
  const tp = (fl.contact.position.y - cam.position.y) / (vp.y || -1e-6);  // cast onto the floor plane by that ray
  fl.contact.position.set(cam.position.x + vp.x * tp, fl.contact.position.y, cam.position.z + vp.z * tp);
  fl.contact.scale.set(fl.base.qx * (0.9 + 0.22 * k), fl.base.qy * (0.9 + 0.22 * k), 1); fl.contact.material.opacity = CORE.op / (0.55 + 0.45 * k);
  fl.caustic.position.x = gx + ox; fl.caustic.position.z = fl.base.cz + gz + oz;
  fl.caustic.scale.setScalar(fl.base.cs * (1 + 0.3 * (k - 1)) * fs); fl.caustic.material.opacity = 0.72 - g.position.y * 2.2;
};
window.GEM_BARE = {
  aim: aim,
  dress: function (T, scene, geo, bb, h, rad, color, bare, gscale, cy, cut) {
    if (!window.GEM_TEXTURES || !window.GEM_TEXTURES.caustic) return null;
    const GX = window.GEM_TEXTURES, stx = GX.shadow(), s = gscale || 1;
    const rest = cy - (bb.min.y - h * 0.12) * s;   // stone-centre height above the contact plane at rest
    if (bare) {   // the bare stage sits on the page itself: an 80-unit backdrop plane in the body's own colour
      const bp = new T.Mesh(new T.PlaneGeometry(80, 80), new T.MeshBasicMaterial({ color: new T.Color(getComputedStyle(document.body).backgroundColor) }));
      bp.material.toneMapped = false; bp.position.z = -12; scene.add(bp);
    }
    // the card's pool is the cut's own silhouette (gem-caustic.js) at the plane's existing scale (1:1 on the footprint)
    const pool = !bare && cut && window.GEM_CAUSTIC ? (function () { try { return window.GEM_CAUSTIC.pool(color, cut); } catch (e) { return null; } })() : null;
    const shadow = floor(T, stx, (bb.min.y - h * 0.12) * s, rad * 1.45 * s, -2);
    const contact = floor(T, coreTex(T), (bb.min.y - h * 0.12) * s + 0.004, 1, bare ? 0 : -1.4);   // over the wash, under the pool
    const caustic = floor(T, pool || GX.caustic(color), (bb.min.y - h * 0.1) * s, rad * 1.5 * s, -1);
    const card = !bare;
    if (card) { shadow.position.y = bb.min.y - h * 0.26; caustic.position.y = bb.min.y - h * 0.2; caustic.scale.setScalar(rad * 2.4); }   // card floor sits lower
    shadow.rotation.z = -CARD_AZ;    // plane is rotated -90° about X first: +CARD_AZ would mirror the axis
    shadow.scale.set(card ? rad * 2.6 * CARD_SPREAD * 1.16 : shadow.scale.x * 1.16 * HERO_SPREAD,
      card ? rad * 2.6 * CARD_SPREAD * 0.88 : shadow.scale.y * 0.88 * HERO_SPREAD, 1);
    contact.rotation.z = -CARD_AZ;   // the core's long axis rides the same azimuth as the wash
    contact.position.set(0, shadow.position.y + 0.004, 0);   // aim() re-pins x/z to the culet's pixel
    contact.scale.set(CORE.w * rad * s * 1.16, CORE.d * rad * s * 0.88, 1); scene.add(shadow, contact, caustic);
    return { shadow: shadow, contact: contact, caustic: caustic, ground: GROUND, rest: rest, k: PULL, so: bare ? HERO_SOFT : CARD_SOFT, gs: s, cu: bb.min.y, poolArgs: { color: color, cut: cut },
      base: { sx: shadow.scale.x, sy: shadow.scale.y, cs: caustic.scale.x, cz: caustic.position.z, cy: caustic.position.y, qx: contact.scale.x, qy: contact.scale.y } };
  }
};
})();
