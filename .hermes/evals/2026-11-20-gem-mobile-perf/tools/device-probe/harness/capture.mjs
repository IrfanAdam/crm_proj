/* capture.mjs — E5 device-probe harness (kept next to the probe it tests).
 * Run from this directory: `node capture.mjs …`. Imports the in-repo rogue harness (../../rogue/harness.mjs).
 * ROGUE_ROOT defaults to <tmp>/e5-probe-runs so Chrome profiles and shots never land in the repo tree.
 */
import os from 'node:os';
process.env.ROGUE_ROOT = process.env.ROGUE_ROOT || path.join(os.tmpdir(), 'e5-probe-runs');   // Chrome profiles + shots stay out of the repo

/* capture2.mjs — E5 lane, generic page capture: pinned pose, floors hidden, raw buffer,
 * same CDP task render+read, A-vs-A control. Works on gallery (#gem-screen ceremony),
 * pitch (.pitch-gem__canvas) and index (reward sheet).
 * usage: node capture2.mjs <page> <dpr> <tag>
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
const { launchChrome, openPage, mountCeremony, ensureDir } = await import('../../rogue/harness.mjs');

const BASE = process.env.E5BASE || 'http://127.0.0.1:5413';
const OUT = ensureDir(path.join(process.env.ROGUE_ROOT, 'shots'));
const which = process.argv[2] || 'gallery', dpr = parseFloat(process.argv[3] || '3'), tag = process.argv[4] || 'pre';
const force = process.env.E5W ? [+process.env.E5W, +process.env.E5H, +process.env.E5R] : null;
const SEL = which === 'gallery'
  ? `GEM3D.rigs.find(r=>r.renderer&&r.canvas&&r.canvas.closest('#gem-screen'))`
  : `GEM3D.rigs.find(r=>r.renderer)`;

const CAP = (withBg) => `(()=>{
  const rig=${SEL}; if(!rig) throw new Error('no-rig');
  if(${JSON.stringify(which)}==='pitch'){ try{ if(window.GEM_TINT&&GEM_TINT.apply) GEM_TINT.apply(rig.canvas,'sapphire'); rig.dropY=0; window.GEM_SCENE.frame(rig); rig.renderer.render(rig.scene,rig.camera);}catch(e){} }   // dropY=0: the shadow-line align() derives it from a layout rect, so it is load-timing noise
  if(rig.raf) cancelAnimationFrame(rig.raf); rig.raf=0; rig.vis=false;
  rig.t=0; rig.tilt=0; rig.tiltT=0;
  rig.group.rotation.set(-0.15,0,0); rig.group.position.y=0; rig.group.updateMatrixWorld(true);
  const renderer=rig.renderer, gl=renderer.getContext(), el=renderer.domElement;
  const F=${JSON.stringify(force)}; if (F) { renderer.setDrawingBufferSize(F[0], F[1], F[2]); rig.camera.aspect = F[0] / F[1]; rig.camera.updateProjectionMatrix(); }
  const W=el.width, H=el.height;
  if(!W||!H) throw new Error('zero-buffer');
  const fl=rig.floors||{}, saved={}, hidden=[];
  for(const k of ['shadow','contact','caustic','ground','base']){ const o=fl[k]; if(o&&'visible' in o){ saved[k]=o.visible; if(o.visible){o.visible=false; hidden.push(k);} } }
  const read=()=>{ const raw=new Uint8Array(W*H*4); gl.readPixels(0,0,W,H,gl.RGBA,gl.UNSIGNED_BYTE,raw);
    let s=''; const CH=0x8000; for(let i=0;i<raw.length;i+=CH) s+=String.fromCharCode.apply(null,raw.subarray(i,Math.min(i+CH,raw.length)));
    return s; };
  try{
    renderer.render(rig.scene,rig.camera);
    const fg=read(); let bg=null;
    ${withBg ? `if(rig.group){rig.group.visible=false;renderer.render(rig.scene,rig.camera);bg=read();rig.group.visible=true;}` : ''}
    const pr=renderer.info.programs.length;
    const u=rig.mats.find(m=>m.uniforms&&m.uniforms.uTaps)||null;
    const gl2=renderer.getContext(), x=gl2.getExtension('WEBGL_debug_renderer_info');
    const info={ renderer:String((x&&gl2.getParameter(x.UNMASKED_RENDERER_WEBGL))||gl2.getParameter(gl2.RENDERER)||'?'),
      vendor:String((x&&gl2.getParameter(x.UNMASKED_VENDOR_WEBGL))||gl2.getParameter(gl2.VENDOR)||'?'),
      timerQuery:!!gl2.getExtension('EXT_disjoint_timer_query_webgl2'), gl:gl2.getError() };
    renderer.render(rig.scene,rig.camera);
    return { W,H,buf:[W,H],css:[Math.round(rig.w),Math.round(rig.h)],ratio:+renderer.getPixelRatio().toFixed(3),
      fg,bg, hiddenFloors:hidden, programs:pr,
      taps:u?u.uniforms.uTaps.value:null, bounce:u?u.uniforms.uBounce.value:null,
      bloom:!!(window.GEM_BLOOM&&GEM_BLOOM.on&&GEM_BLOOM.on()), stone:rig.canvas.dataset.gem, info };
  } finally { for(const k in saved){ try{fl[k].visible=saved[k];}catch(e){} } }
})()`;

function diff(a, b) {
  if (a.length !== b.length) return { mismatch: [a.length, b.length] };
  let n = 0, mx = 0;
  for (let i = 0; i < a.length; i += 4) {
    const d = Math.max(Math.abs(a[i] - b[i]), Math.abs(a[i + 1] - b[i + 1]), Math.abs(a[i + 2] - b[i + 2]));
    if (d > 2) n++; if (d > mx) mx = d;
  }
  return { px: a.length / 4, over2: n, pct: +(100 * n / (a.length / 4)).toFixed(6), max: mx };
}

const browser = await launchChrome({ windowSize: [390, 844], label: 'e5-' + which + '-' + dpr });
const page = await openPage(browser, { view: { w: 390, h: 844, dpr, cpu: 0 } });
const rec = { page: which, dpr, tag, at: new Date().toISOString() };
try {
  if (which === 'gallery') await mountCeremony(page, { url: BASE + '/gallery.html', query: 'gemdpr=' + dpr });
  else if (which === 'pitch') {
    await page.nav(BASE + '/pitch.html?gemdpr=' + dpr, 1500);
    await page.waitFor(`!!(window.GEM3D&&GEM3D.rigs.some(r=>r.renderer))`, 45000, 'pitch rig');
  } else {
    await page.nav(BASE + '/index.html?gemdpr=' + dpr, 2000);
    for (let i = 0; i < 40; i++) {
      const ok = await page.ev(`(()=>{const s=document.getElementById('reward-sheet'); if(s&&!s.hidden) return true;
        const bars=[...document.querySelectorAll('.activity-strip [data-reward-wired]')];
        for(const b of bars){ try{ b.click(); }catch(e){} if(s&&!s.hidden) return true; }
        return !!(s&&!s.hidden);})()`);
      if (ok && await page.ev(`!!(window.GEM3D&&GEM3D.rigs.some(r=>r.renderer))`)) break;
      await new Promise((r) => setTimeout(r, 500));
    }
    await page.waitFor(`!!(window.GEM3D&&GEM3D.rigs.some(r=>r.renderer))`, 30000, 'index rig');
  }
  await new Promise((r) => setTimeout(r, 2500));
  const r1 = await page.ev(CAP(false));
  const fg = Buffer.from(r1.fg, 'binary'), fg2 = Buffer.from(r1.fg, 'binary');
  const r2 = await page.ev(CAP(false));
  const ctl = diff(Buffer.from(r1.fg, 'binary'), Buffer.from(r2.fg, 'binary'));
  const file = path.join(OUT, `${tag}-${which}-dpr${dpr}.raw`);
  fs.writeFileSync(file, Buffer.from(r1.fg, 'binary'));
  Object.assign(rec, {
    ok: true, buf: r1.buf, css: r1.css, ratio: r1.ratio, stone: r1.stone, bloom: r1.bloom,
    taps: r1.taps, bounce: r1.bounce, programs: r1.programs, hiddenFloors: r1.hiddenFloors,
    gl: r1.info, file, bytes: Buffer.from(r1.fg, 'binary').length,
    sha256: crypto.createHash('sha256').update(Buffer.from(r1.fg, 'binary')).digest('hex'),
    control: ctl,
  });
} catch (e) { rec.ok = false; rec.error = String(e.message || e).slice(0, 400); }
finally { try { await page.close(); } catch (e) {} await browser.close(); }
fs.writeFileSync(path.join(OUT, `${tag}-${which}-dpr${dpr}.json`), JSON.stringify(rec, null, 2) + '\n');
console.log(JSON.stringify(rec, null, 2));
