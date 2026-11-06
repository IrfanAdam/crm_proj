/* audit-shot-eval.mjs — page-side expressions for audit-shot.mjs (round-10 audit).
 * Ported verbatim from .hermes/tmp/r10/rubric/runs/<stone>/meta.json (evalSrc) and
 * .hermes/tmp/r10/photo/lane-shot.mjs. The spin freeze is the build's own drag-pose
 * path (rig.drag), because gem3d.js writes rotation.y = cat.spin * t * 0.9 every
 * frame — cat.spin is an angular RATE, so a yaw can only be held through rig.drag.
 */
export const ROLES = ['front', 'repeat', 'txoff', 'dispoff', 'chart', 'dark', 'nogem', 'proxy', 'noproxy'];

export const CELLS = [
  { tilt: -0.55, spin: 0 }, { tilt: 0, spin: 0 }, { tilt: 0.55, spin: 0 },
  { tilt: -0.55, spin: 35 }, { tilt: 0, spin: 35 }, { tilt: 0.55, spin: 35 },
];

const MUT = {
  front: '',
  repeat: '',
  txoff: `rigs().forEach(function (r) { (r.mats || []).forEach(function (m) {
      if (m && 'transmission' in m) { m.transmission = 0; m.needsUpdate = true; } }); });
    rigs().forEach(function (r) { var fl = r.floors; if (!fl) return;
      if (fl.shadow) fl.shadow.visible = false;
      if (fl.caustic) fl.caustic.visible = false; });`,
  dispoff: `var seen = [];
    rigs().forEach(function (r) { r.group.traverse(function (o) {
      var ms = o.material ? (Array.isArray(o.material) ? o.material : [o.material]) : [];
      ms.forEach(function (m) { if (!m || seen.indexOf(m) >= 0) return; seen.push(m);
        m.onBeforeCompile = function () {}; m.needsUpdate = true; }); }); });`,
  chart: `var pb = document.querySelector('.frame[data-panel="gems"] [data-gem-photo]') || document.querySelector('[data-gem-photo]');
    if (pb) { pb.click(); pb.click(); }
    meta.photoMode = pb ? pb.dataset.gemPhoto : null;
    for (var ci = 0; ci < 80; ci++) {
      var bg = rigs()[0] && rigs()[0].scene && rigs()[0].scene.background;
      if (bg && bg.image && (bg.image.width || bg.image.naturalWidth)) break;
      await sleep(50); }
    await sleep(500);`,
  dark: `var db = document.querySelector('.frame[data-panel="gems"] [data-gem-scheme="dark"]') || document.querySelector('[data-gem-scheme="dark"]');
    if (db) db.click();
    await sleep(600);`,
  nogem: `rigs().forEach(function (r) { r.group.visible = false; });`,
  proxy: `rigs().forEach(function (r) { var b = r.group.children[0]; if (b) b.visible = false; });`,
  noproxy: `rigs().forEach(function (r) { var p = r.group.children[1]; if (p) p.visible = false; });`,
};

export function evalFor({ stone, role, tilt, spin }) {
  const S = JSON.stringify(stone);
  return `(async()=>{
  const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  const meta={stone:${S},role:${JSON.stringify(role)},tilt:${tilt},spin:${spin},steps:[]};
  try{
    if(!window.T&&window.THREE)window.T=window.THREE;
    const rigs=()=>((window.GEM3D&&window.GEM3D.rigs)||[]).filter(r=>r&&r.group&&r.canvas&&r.canvas.isConnected);
    const stone=${S};
    const pill=document.querySelector('[data-gemspec-cat="'+stone+'"]');
    if(pill)pill.click();
    const snap=()=>{let n=0;rigs().forEach(r=>{if(r.tint&&window.GEM_TINT&&window.GEM_TINT.step){try{window.GEM_TINT.step(r,5);n++;}catch(e){}}});return n;};
    for(let i=0;i<40;i++){const a=snap();if(!rigs().some(r=>r.tint))break;if(!a)await sleep(50);}
    meta.tintLeft=rigs().some(r=>r.tint);
    let c=document.querySelector('.frame[data-panel="gems"] canvas[data-gem="'+stone+'"]')||document.querySelector('.frame[data-panel="gems"] canvas[data-gem]');
    if(c){c.style.flex='0 0 auto';c.style.height='223px';}
    await sleep(300);
    ${MUT[role] || ''}
    const T=${tilt}, Y=${spin}*Math.PI/180;
    const pose=()=>rigs().forEach(r=>{try{
      r.cat.spin=0; r.t=0; r.tilt=T; r.tiltT=T; r.group.rotation.y=0;
      if(${spin}!==0){ r.drag={y0:Y,x0:T,dx:0,dy:0,px:0,py:0,moved:0,held:true,released:0,settle:false}; }
      else { r.drag=null; r.group.rotation.y=0; }
    }catch(e){}});
    pose(); await sleep(900); pose(); await sleep(450);
    meta.rigs=rigs().length;
    meta.rot=rigs().map(r=>({x:+r.group.rotation.x.toFixed(3),y:+r.group.rotation.y.toFixed(3)}));
    meta.tilt=rigs().map(r=>+r.tilt.toFixed(3));
    meta.tiltT=rigs().map(r=>+r.tiltT.toFixed(3));
    meta.spin=rigs().map(r=>+r.cat.spin.toFixed(3));
    meta.bodyColor=rigs().map(r=>r.mats&&r.mats[0]&&r.mats[0].color?('#'+r.mats[0].color.getHexString()):null);
    meta.canvas=c?{w:c.clientWidth,h:c.clientHeight,cw:c.clientWidth,ch:c.clientHeight,aw:c.width,ah:c.height,gem:c.dataset.gem,pinned:c.style.flex+'/'+c.style.height}:null;
    return JSON.stringify(meta);
  }catch(e){return JSON.stringify({stone:${S},role:${JSON.stringify(role)},error:String(e&&e.stack||e)});}
})()`;
}

/* Pose read-back gate: rotation.x/y, r.tilt, r.tiltT, r.cat.spin and the 510x223 pin. */
export function poseCheck(meta, tilt, spin, thr) {
  const p = thr.capture, tol = p.pose.tolerance, cw = p.canvas;
  if (!meta) return { ok: false, why: 'no meta' };
  if (meta.error) return { ok: false, why: 'eval error: ' + String(meta.error).slice(0, 160) };
  const bad = [], rot = (meta.rot || [])[0] || {}, wantY = spin * Math.PI / 180;
  const g = (a, i) => (a || [])[i];
  if (Math.abs((rot.x ?? 9) - tilt) > tol.rotation_x) bad.push(`rotation.x ${rot.x} != ${tilt}`);
  if (Math.abs((rot.y ?? 9) - wantY) > tol.rotation_y) bad.push(`rotation.y ${rot.y} != ${wantY.toFixed(3)}`);
  if (Math.abs((g(meta.tilt, 0) ?? 9) - tilt) > tol.tilt) bad.push(`r.tilt ${g(meta.tilt, 0)}`);
  if (Math.abs((g(meta.tiltT, 0) ?? 9) - tilt) > tol.tiltT) bad.push(`r.tiltT ${g(meta.tiltT, 0)}`);
  if (Math.abs(g(meta.spin, 0) ?? 9) > tol.spin_rate) bad.push(`r.cat.spin ${g(meta.spin, 0)}`);
  const cv = meta.canvas || {};
  if (Math.abs((cv.w ?? 0) - cw.w) > cw.tolerance_px || Math.abs((cv.h ?? 0) - cw.h) > cw.tolerance_px)
    bad.push(`canvas ${cv.w}x${cv.h} != ${cw.w}x${cw.h}`);
  return { ok: bad.length === 0, why: bad.join('; '), rotation_x: rot.x, rotation_y: rot.y,
    tilt: g(meta.tilt, 0), tiltT: g(meta.tiltT, 0), spin: g(meta.spin, 0), canvas: cv };
}
