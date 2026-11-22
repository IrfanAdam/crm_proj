/* index-gate.mjs — the index.html pixel gate for the ?gemtimer probe (plan rev 8).
 *
 * Two arms, same script, same browser build:
 *   HEAD   = a `git archive HEAD` snapshot of the commit under test, Vite on :5415
 *   TREE   = the working tree, Vite on :5416
 * Serve both with `vite --port 5415|5416 --strictPort --host 127.0.0.1` (never :5173 — that one
 * is the owner's live Safari server).
 *
 * Page: `index.html?app=fullscreen&gemdpr=<dpr>` — the app's own chromeless phone mode. The gem
 * lives behind the reward sheet, so the script clicks the wired peak bar (`.activity-strip
 * [data-reward-wired]`) and waits for the rig. Without `?app=fullscreen` the `.device` box is 0×0
 * and there is no phone rendering of this surface at all.
 *
 * Capture law (each of these was a bug in an earlier lane):
 *   - same-task render + readPixels: the context has preserveDrawingBuffer:false, so a read in a
 *     later Runtime.evaluate task returns a blank buffer;
 *   - pose pinned (rig.t = 0, tilt = 0, group.position.y = 0, rotation(-0.15,0,0)) AND the rig's
 *     clock variable zeroed: the idle bob moves geometry between arms;
 *   - floor pools hidden (shadow/contact/caustic/ground/base): they repaint at timing-dependent
 *     moments and fake ~4.6 % deltas;
 *   - drawing buffer forced to 340x320 CSS × pixelRatio, because the stage box jitters between
 *     loads and a 339-vs-340 capture compares two different grids;
 *   - rAF cancelled before the still;
 *   - A-vs-A control inside each arm, and a subject-presence check (silhouette = |fg-bg| > 8) so a
 *     zero diff of nothing cannot pass.
 *
 * PASS requires, per viewport: 0.000 % of px >2/255, maxΔ 0, control 0, identical
 * renderer.info.programs, identical buffer size, identical taps/bounce.
 *
 * usage: node index-gate.mjs            # HEAD :5415 vs TREE :5416, both viewports
 *        HEAD=http://… TREE=http://… node index-gate.mjs
 * Env: ROGUE_ROOT (scratch dir for Chrome profiles + raw buffers; default <tmp>/index-gate).
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';

process.env.ROGUE_ROOT = process.env.ROGUE_ROOT || path.join(os.tmpdir(), 'index-gate');
const H = await import('../../2026-11-20-gem-mobile-perf/tools/rogue/harness.mjs');

const HEAD = process.env.HEAD || 'http://127.0.0.1:5415';
const TREE = process.env.TREE || 'http://127.0.0.1:5416';
const OUT = H.ensureDir(path.join(process.env.ROGUE_ROOT, 'shots'));
const CSS = [340, 320];   // the reward-stage box; measured identical at both viewports
const RIG = `GEM3D.rigs.find(r=>r.renderer&&r.canvas&&r.canvas.closest('#reward-sheet'))`;

const CAP = `(()=>{
  const rig=${RIG}; if(!rig) throw new Error('no-index-rig');
  if(rig.raf) cancelAnimationFrame(rig.raf); rig.raf=0; rig.vis=false;
  rig.t=0; rig.tilt=0; rig.tiltT=0;
  rig.group.rotation.set(-0.15,0,0); rig.group.position.set(0,0,0); rig.group.scale.set(1,1,1);
  rig.group.updateMatrixWorld(true);
  const renderer=rig.renderer, gl=renderer.getContext(), el=renderer.domElement;
  renderer.setDrawingBufferSize(${CSS[0]}, ${CSS[1]}, renderer.getPixelRatio());
  rig.camera.aspect = ${CSS[0]}/${CSS[1]}; rig.camera.updateProjectionMatrix(); rig.group.updateMatrixWorld(true);
  const W=el.width, H=el.height; if(!W||!H) throw new Error('zero-buffer');
  const fl=rig.floors||{}, saved={}, hidden=[];
  for(const k of ['shadow','contact','caustic','ground','base','rest']){ const o=fl[k];
    if(o&&typeof o==='object'&&'visible' in o){ saved[k]=o.visible; if(o.visible){o.visible=false; hidden.push(k);} } }
  const read=()=>{ const raw=new Uint8Array(W*H*4); gl.readPixels(0,0,W,H,gl.RGBA,gl.UNSIGNED_BYTE,raw);
    let s=''; const CH=0x8000; for(let i=0;i<raw.length;i+=CH) s+=String.fromCharCode.apply(null,raw.subarray(i,Math.min(i+CH,raw.length)));
    return s; };
  try{
    renderer.render(rig.scene, rig.camera);
    const fg=read();
    if(rig.group){ rig.group.visible=false; renderer.render(rig.scene,rig.camera); }
    const bg=read(); rig.group.visible=true;
    const u=rig.mats.find(m=>m.uniforms&&m.uniforms.uTaps)||null;
    const pr=renderer.info.programs.length;
    renderer.render(rig.scene, rig.camera);
    return { W,H,ratio:+renderer.getPixelRatio().toFixed(3), fg, bg, hiddenFloors:hidden, programs:pr,
      taps:u?u.uniforms.uTaps.value:null, bounce:u?u.uniforms.uBounce.value:null,
      bloom:!!(window.GEM_BLOOM&&GEM_BLOOM.on&&GEM_BLOOM.on()), cap: window.GEM_PERF? GEM_PERF.cap():null,
      stone: rig.canvas.dataset.gem, glErr: gl.getError() };
  } finally { for(const k in saved){ try{fl[k].visible=saved[k];}catch(e){} } }
})()`;

function diff(a, b) {
  if (a.length !== b.length) return { mismatch: [a.length, b.length] };
  let n = 0, mx = 0, sum = 0;
  for (let i = 0; i < a.length; i += 4) {
    const d = Math.max(Math.abs(a[i] - b[i]), Math.abs(a[i + 1] - b[i + 1]), Math.abs(a[i + 2] - b[i + 2]));
    if (d > 2) n++; if (d > mx) mx = d; sum += d;
  }
  const px = a.length / 4;
  return { px, over2: n, pct: +(100 * n / px).toFixed(6), max: mx, mean: +(sum / px).toFixed(4) };
}
function subject(fg, bg) {
  let n = 0, lum = 0;
  for (let i = 0; i < fg.length; i += 4) {
    if (Math.max(Math.abs(fg[i] - bg[i]), Math.abs(fg[i + 1] - bg[i + 1]), Math.abs(fg[i + 2] - bg[i + 2])) > 8) n++;
    lum += 0.2126 * fg[i] + 0.7152 * fg[i + 1] + 0.0722 * fg[i + 2];
  }
  const px = fg.length / 4;
  return { subjectPx: n, subjectPct: +(100 * n / px).toFixed(3), meanRGB: +(lum / px).toFixed(2) };
}

async function arm(base, w, h, dpr, tag) {
  const browser = await H.launchChrome({ windowSize: [w, h], label: `idxgate-${tag}-${w}` });
  const page = await H.openPage(browser, { view: { w, h, dpr, cpu: 0 } });
  const rec = { base, w, h, dpr, tag, at: new Date().toISOString() };
  try {
    await page.nav(`${base}/index.html?app=fullscreen&gemdpr=${dpr}`, 2500);
    await page.waitFor(`!!(window.GEM3D&&GEM3D.rigs.length)`, 40000, 'GEM3D');
    await new Promise((r) => setTimeout(r, 2000));
    await page.ev(`(()=>{const b=document.querySelector('.activity-strip [data-reward-wired]'); if(!b) throw new Error('no-peak-bar'); b.click(); return 1;})()`);
    await page.waitFor(`!!(${RIG})`, 40000, 'index reward rig');
    await new Promise((r) => setTimeout(r, 2500));
    const a1 = await page.ev(CAP);
    const a2 = await page.ev(CAP);
    const fg = Buffer.from(a1.fg, 'binary'), bg = Buffer.from(a1.bg, 'binary');
    const f = path.join(OUT, `${tag}-index-${w}x${h}-dpr${dpr}.raw`);
    fs.writeFileSync(f, fg);
    Object.assign(rec, {
      ok: true, buf: [a1.W, a1.H], ratio: a1.ratio, programs: a1.programs, taps: a1.taps, bounce: a1.bounce,
      bloom: a1.bloom, cap: a1.cap, stone: a1.stone, glErr: a1.glErr, hiddenFloors: a1.hiddenFloors,
      sha: crypto.createHash('sha256').update(fg).digest('hex'), bytes: fg.length,
      bgSha: crypto.createHash('sha256').update(bg).digest('hex'),
      control: diff(fg, Buffer.from(a2.fg, 'binary')), image: subject(fg, bg), file: f,
    });
  } catch (e) { rec.ok = false; rec.error = String(e.message || e).slice(0, 400); }
  finally { try { await page.close(); } catch (e) {} await browser.close(); }
  return rec;
}

const VIEWS = [[393, 852, 3], [1440, 900, 2]];
const results = [];
for (const [w, h, dpr] of VIEWS) {
  const head = await arm(HEAD, w, h, dpr, 'head');
  const tree = await arm(TREE, w, h, dpr, 'tree');
  let cmp = null;
  if (head.ok && tree.ok) {
    cmp = diff(fs.readFileSync(head.file), fs.readFileSync(tree.file));
    Object.assign(cmp, {
      shaEqual: head.sha === tree.sha, programsMatch: head.programs === tree.programs,
      bufMatch: String(head.buf) === String(tree.buf),
      tapsMatch: head.taps === tree.taps && head.bounce === tree.bounce,
      pass: cmp.over2 === 0 && cmp.max === 0 && head.control.over2 === 0 && tree.control.over2 === 0
        && head.programs === tree.programs && head.image.subjectPct > 5,
    });
  }
  results.push({ view: `${w}x${h}@${dpr}`, head, tree, cmp });
}
fs.writeFileSync(path.join(OUT, 'index-gate.json'), JSON.stringify(results, null, 2) + '\n');
for (const r of results) {
  console.log('==', r.view, r.cmp ? (r.cmp.pass ? 'PASS' : 'FAIL') : 'NO-RESULT');
  for (const k of ['head', 'tree']) {
    const a = r[k];
    console.log(` ${k.padEnd(4)}`, JSON.stringify({ ok: a.ok, err: a.error, buf: a.buf, programs: a.programs,
      taps: a.taps, bounce: a.bounce, sha: a.sha && a.sha.slice(0, 16), control: a.control, image: a.image }));
  }
  if (r.cmp) console.log(' cmp ', JSON.stringify(r.cmp));
}
console.log('json:', path.join(OUT, 'index-gate.json'));
if (results.some((r) => !r.cmp || !r.cmp.pass)) process.exit(1);
