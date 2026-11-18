/* ADAM/GEMS — prototype/gems/oracle-page.mjs · the in-page capture API (window.__ORA), injected once per document.
 * [plan:2026-10-03_144222-gem-realism-round2.md#phase-18] · split out of pixel-oracle.mjs, verbatim.
 */
import { MASK_EPS } from './oracle-args.mjs';

// ── page-side capture API (injected once per document) ──────────────────────────────────────────────────────────
export const PAGE = `(() => {
const L = (r, g, b) => 0.2126 * r + 0.7152 * g + 0.0722 * b;
const b64 = (u) => { let s = '', C = 0x8000; for (let i = 0; i < u.length; i += C) s += String.fromCharCode.apply(null, u.subarray(i, i + C)); return btoa(s); };
const cvOf = (sel) => document.querySelector(sel + ' canvas[data-gem]');
const rigOf = (cv) => (window.GEM3D && window.GEM3D.rigs.find((r) => r.canvas === cv)) || null;
const live = (sel) => { const cv = cvOf(sel), rig = cv && rigOf(cv); return (rig && rig.renderer) ? rig : null; };
const api = {};
api.drop = (sel) => {
  const host = document.querySelector(sel); if (!host) return -1;
  host.querySelectorAll('canvas[data-gem]').forEach((cv) => {
    const r = rigOf(cv);
    if (r) { if (r.raf) cancelAnimationFrame(r.raf); r.raf = 0; r.vis = false; r.gone = true; r.dead = true;
      try { r.renderer.dispose(); r.renderer.forceContextLoss(); } catch (e) {}
      const i = window.GEM3D.rigs.indexOf(r); if (i >= 0) window.GEM3D.rigs.splice(i, 1); }
    cv.remove(); });
  return host.querySelectorAll('canvas[data-gem]').length;
};
api.mount = (sel, cat, w, h) => {
  api.drop(sel);
  const cv = document.createElement('canvas');
  cv.className = 'gem-reward__spline'; cv.dataset.gem = cat;
  if (w && h) { cv.style.width = w + 'px'; cv.style.height = h + 'px'; }   // the box gem3d.dress()/caustic pool bake from
  cv.setAttribute('role', 'img'); cv.setAttribute('aria-label', cat + ' gem');
  document.querySelector(sel).appendChild(cv);
  return 1;
};
api.state = (sel) => { const r = live(sel); return r ? { gem: cvOf(sel).dataset.gem, ready: true } : { ready: false }; };
api.prep = (sel, w, h) => {
  const rig = live(sel), cv = cvOf(sel); if (!rig) return { err: 'no rig' };
  if (rig.raf) cancelAnimationFrame(rig.raf);
  rig.raf = 0; rig.vis = false; rig.dead = false; rig.gone = false;
  if (rig.ro) rig.ro.disconnect();                          // freeze the box: no ResizeObserver may re-size mid-capture
  cv.style.width = w + 'px'; cv.style.height = h + 'px';
  const r = rig.renderer, pr = Math.min(window.devicePixelRatio || 1, 2);
  r.setPixelRatio(pr); r.setSize(w, h, false);
  rig.w = w; rig.h = h; rig.camera.aspect = w / h; rig.camera.updateProjectionMatrix();
  // Re-fit for the forced box with GEM_SCENE.stage()'s own formula: the mount-time fit used the CSS box's aspect,
  // which is layout-timing dependent — leaving it would shift the stone by a subpixel between launches.
  const T = window.THREE, mesh = rig.group.children[0], geo = mesh && mesh.geometry;
  if (geo) { if (!geo.boundingBox) geo.computeBoundingBox();
    const bb = geo.boundingBox;
    const hh = Math.max(bb.max.y - bb.min.y, 0.001), cy = (bb.max.y + bb.min.y) / 2;
    const rad = Math.max(Math.abs(bb.max.x), Math.abs(bb.min.x), Math.abs(bb.max.z), Math.abs(bb.min.z));
    const tn = Math.tan((32 * Math.PI) / 360), asp = w / h;
    const dist = Math.max(hh / 0.75 / (2 * tn), rad / (0.9 * tn * Math.max(asp, 0.4)));
    const drop = rig.dropY || 0;
    rig.baseCamY = cy + hh * 0.16; rig.baseLookY = cy - hh * 0.02;
    rig.camera.position.set(0, rig.baseCamY + drop, dist);
    rig.camera.lookAt(0, rig.baseLookY + drop, 0);
    rig.camera.updateProjectionMatrix(); }
  rig.cat.spin = 0; rig.tilt = 0; rig.tiltT = 0; rig.t = 0;
  const gl = r.getContext(); let linkFail = 0;
  (r.info.programs || []).forEach((p) => { if (p.program && !gl.getProgramParameter(p.program, gl.LINK_STATUS)) linkFail++; if (p.diagnostics) linkFail++; });
  return { w: r.domElement.width, h: r.domElement.height, lost: gl.isContextLost(), linkFail, programs: (r.info.programs || []).length,
    choice: window.GEM_FACETS ? window.GEM_FACETS.choice : '', planes: window.GEM_FACETS ? window.GEM_FACETS.planes.count : 0,
    bloom: !!(window.GEM_BLOOM && window.GEM_BLOOM.on()), mats: rig.mats.length, floors: !!(rig.floors && rig.floors.caustic) };
};
api.pose = (sel, tilt) => {
  const rig = live(sel); if (!rig) return 0;
  const g = rig.group; g.rotation.set(tilt, 0, 0); g.position.set(0, 0, 0);
  rig.t = 0; rig.tilt = tilt; rig.tiltT = tilt; rig.cat.spin = 0; rig.last = performance.now();
  if (window.GEM_RIG) window.GEM_RIG.tick(rig);            // backdrop + pool law, exactly as the loop does at this pose
  if (window.GEM_BARE && window.GEM_BARE.aim) window.GEM_BARE.aim(rig);
  g.updateMatrixWorld(true);
  return 1;
};
api.shot = (sel) => {
  const rig = live(sel); if (!rig) return { err: 'no rig' };
  const r = rig.renderer, gl = r.getContext(), w = r.domElement.width, h = r.domElement.height;
  r.render(rig.scene, rig.camera);
  const px = new Uint8Array(w * h * 4); gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, px);
  api.head = px; return { w, h, lost: gl.isContextLost(), b64: b64(px) };
};
api.warm = (sel) => {                                       // same pose, discarded: RT allocation / texture upload
  const rig = live(sel); if (!rig) return 0;                // and the first-frame uniforms all land on this frame
  rig.renderer.render(rig.scene, rig.camera); return 1;
};
api.mask = (sel) => {
  const rig = live(sel); if (!rig || !api.head) return { err: 'no head' };
  const r = rig.renderer, gl = r.getContext(), w = r.domElement.width, h = r.domElement.height, g = rig.group;
  const was = g.visible; g.visible = false;
  r.render(rig.scene, rig.camera);
  const ng = new Uint8Array(w * h * 4); gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, ng);
  g.visible = was;
  const head = api.head, bits = new Uint8Array((w * h + 7) >> 3); let n = 0;
  for (let i = 0; i < w * h; i++) { const o = i * 4;
    const d = Math.abs(L(head[o], head[o + 1], head[o + 2]) - L(ng[o], ng[o + 1], ng[o + 2]));
    if (d > ${MASK_EPS}) { n++; bits[i >> 3] |= 1 << (i & 7); } }
  return { w, h, maskPx: n, bits: b64(bits) };   // canvas stays on the no-gem frame; the next shot() re-renders the head
};
window.__ORA = api; return 1;
})()`;
