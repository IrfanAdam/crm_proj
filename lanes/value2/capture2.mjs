/* value2 lane — angle-aware capture. Drives gem-shot.mjs unmodified; the shared lanes/darkcaps/capture.mjs is NOT edited.
   Usage: node lanes/value2/capture2.mjs --cat sapphire --roles front,dark --angle 35 [--force]
   Angle lever: gem3d.js L51 `rig.group.rotation.y = rig.cat.spin * rig.t * 0.9`; freeze yaw by making
   `rig.t` a fixed getter (so `t += dt` no-ops) and `rig.cat.spin` a getter = A/(0.9*t). */
import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync, copyFileSync, existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
const ROOT = '/Users/irfan/Documents/Portfolio Redo/crm_proj', LANE = path.join(ROOT, 'lanes/value2');
const URL = 'http://127.0.0.1:5176/gallery.html?gem=high#gems', SHOT = path.join(ROOT, 'prototype/gems/gem-shot.mjs');
const CLIP = '.frame[data-panel="gems"] .gem-stage', WORK = path.join(LANE, '.work');
const ARM = {
  repeat: '',
  txoff: `rigs().forEach(function (r) { (r.mats || []).forEach(function (m) { if (m && 'transmission' in m) { m.transmission = 0; m.needsUpdate = true; } }); });rigs().forEach(function (r) { var fl = r.floors; if (!fl) return; if (fl.shadow) fl.shadow.visible = false; if (fl.caustic) fl.caustic.visible = false; });`,
  dispoff: `var seen = [], n = 0; rigs().forEach(function (r) { r.group.traverse(function (o) { var ms = o.material ? (Array.isArray(o.material) ? [o.material] : [o.material]) : []; ms.forEach(function (m) { if (!m || seen.indexOf(m) >= 0) return; seen.push(m); m.onBeforeCompile = function () {}; m.needsUpdate = true; n++; }); }); });`,
  chart: `var pb = document.querySelector('.frame[data-panel="gems"] [data-gem-photo]'); if (pb) { pb.click(); pb.click(); } for (var ci = 0; ci < 80; ci++) { var bg = rigs()[0] && rigs()[0].scene && rigs()[0].scene.background; if (bg && bg.image && (bg.image.width || bg.image.naturalWidth)) break; await sleep(50); } await sleep(500);`,
  dark: `var db = document.querySelector('.frame[data-panel="gems"] [data-gem-scheme="dark"]'); if (db) db.click(); await sleep(600);`,
  nogem: `rigs().forEach(function (r) { r.group.visible = false; });`,
  tirmask: `rigs().forEach(function (r) { r.group.children.forEach(function (o) { if (o.material === r.mats[0]) o.visible = false; }); var u = r.mats[1] && r.mats[1].uniforms; if (u && u.dbg) u.dbg.value = 1; });`,
};
const argv = process.argv.slice(2);
const argOf = (n, d) => { const i = argv.indexOf('--' + n); return i < 0 ? d : argv[i + 1]; };
const cats = (argOf('cat', '') || 'sapphire,citrine').split(',').map((s) => s.trim()).filter(Boolean);
const roles = (argOf('roles', '') || 'front').split(',').map((s) => s.trim()).filter(Boolean);
const angles = (argOf('angle', '0') || '0').split(',').map((s) => Number(s.trim()));
const tilts = (argOf('tilt', '0') || '0').split(',').map((s) => Number(s.trim()));
const force = argv.includes('--force');
const sub = argOf('dir', '') || '';
const ev = (cat, role, ang, tilt) => `(async()=>{const sleep=ms=>new Promise(r=>setTimeout(r,ms));const meta={role:${JSON.stringify(role)},cat:${JSON.stringify(cat)},angle:${ang},tilt:${tilt},steps:[]};try{const rigs=()=>((window.GEM3D&&window.GEM3D.rigs)||[]).filter(r=>r&&r.group&&r.canvas&&r.canvas.isConnected);const stage=document.querySelector('.frame[data-panel="gems"] [data-gem-stage]');if(!window.T&&window.THREE)window.T=window.THREE;const pill=document.querySelector('[data-gemspec-cat="${cat}"]');if(pill)pill.click();const snap=()=>{let n=0;rigs().forEach(r=>{if(r.tint&&window.GEM_TINT&&window.GEM_TINT.step){try{window.GEM_TINT.step(r,5);n++;}catch(e){}}});return n;};for(let i=0;i<40;i++){const a=snap();if(!rigs().some(r=>r.tint))break;if(!a)await sleep(50);}meta.tintLeft=rigs().some(r=>r.tint);let c=document.querySelector('.frame[data-panel="gems"] canvas[data-gem="${cat}"]')||document.querySelector('.frame[data-panel="gems"] canvas[data-gem]');if(c){c.style.flex='0 0 auto';c.style.height='223px';}await sleep(300);${ARM[role] || ''}const rs=rigs();const A=${ang}*Math.PI/180;rs.forEach(r=>{try{r.t=1;r.tilt=${tilt};r.tiltT=${tilt};r.cat=Object.assign({},r.cat);Object.defineProperty(r,'t',{configurable:true,get:function(){return 1;},set:function(){}});Object.defineProperty(r.cat,'spin',{configurable:true,get:function(){return A/0.9;},set:function(){}});}catch(e){}});await sleep(700);await sleep(100);const b=c?c.getBoundingClientRect():null;meta.canvas=c?{cw:c.clientWidth,ch:c.clientHeight,bw:Math.round(b.width),bh:Math.round(b.height),gem:c.dataset.gem}:null;meta.rigs=rs.length;meta.transmission=rs.map(r=>(r.mats&&r.mats[0]?r.mats[0].transmission:null));meta.rotationY=rs.map(r=>+r.group.rotation.y.toFixed(4));meta.rotationX=rs.map(r=>+r.group.rotation.x.toFixed(4));meta.posY=rs.map(r=>+r.group.position.y.toFixed(4));meta.dbg=rs.map(r=>(r.mats[1]&&r.mats[1].uniforms&&r.mats[1].uniforms.dbg)?r.mats[1].uniforms.dbg.value:null);meta.theme=stage?stage.dataset.theme:null;return JSON.stringify(meta);}catch(e){return JSON.stringify({role:${JSON.stringify(role)},cat:${JSON.stringify(cat)},error:String(e&&e.stack||e)});}})()`;
const run = (args, timeout = 180000) => new Promise((resolve) => { const p = spawn(process.execPath, args, { cwd: ROOT, stdio: ['ignore', 'pipe', 'pipe'] }); let out = '', err = ''; p.stdout.on('data', (d) => (out += d)); p.stderr.on('data', (d) => (err += d)); const t = setTimeout(() => { try { p.kill('SIGKILL'); } catch {} }, timeout); p.on('close', (code) => { clearTimeout(t); resolve({ code, out, err }); }); });
const parseStdout = (s) => { const i = s.indexOf('{', s.search(/\{\s*"fps"/)); if (i < 0) return null; try { return JSON.parse(s.slice(i)); } catch { return null; } };
async function shot(cat, role, ang, tilt) {
  const suff = (ang ? '_a' + ang : '') + (tilt ? '_t' + tilt : '');
  const dest = path.join(LANE, sub, cat, role + suff + '.png');
  if (!force && existsSync(dest)) { console.log('[capture] skip ' + cat + '/' + role + suff); return { skipped: true }; }
  const outdir = path.join(WORK, sub, cat, role + suff);
  mkdirSync(outdir, { recursive: true }); mkdirSync(path.dirname(dest), { recursive: true });
  const t0 = Date.now();
  const res = await run([SHOT, URL, outdir, '--scale', '1', '--wait', '6000', '--clip', CLIP, '--eval', ev(cat, role, ang, tilt)]);
  const secs = ((Date.now() - t0) / 1000).toFixed(1), j = parseStdout(res.out), clip = path.join(outdir, 'clip-0.png'), ok = existsSync(clip);
  if (ok) copyFileSync(clip, dest);
  let meta = null;
  if (j && typeof j.fps === 'string') { try { meta = JSON.parse(j.fps); } catch { meta = { parseError: j.fps }; } }
  console.log('[capture] ' + cat + '/' + role + suff + ' ' + (ok ? 'ok' : 'NO-CLIP') + ' ' + secs + 's ry=' + (meta && meta.rotationY ? meta.rotationY.join(',') : '?'));
  return { role, ang, tilt, dest, ok, seconds: Number(secs), consoleErrors: j ? j.consoleErrors : [], eval: meta };
}
for (const cat of cats) {
  mkdirSync(path.join(LANE, sub, cat), { recursive: true });
  const mp = path.join(LANE, sub, cat, 'meta.json');
  let prev = {};
  if (existsSync(mp)) { try { prev = JSON.parse(readFileSync(mp, 'utf8')); } catch { prev = {}; } }
  const shots = Object.assign({}, prev.shots || {});
  for (const ang of angles) for (const tilt of tilts) for (const role of roles) {
    const r = await shot(cat, role, ang, tilt);
    if (r && !r.skipped) shots[role + (ang ? '_a' + ang : '') + (tilt ? '_t' + tilt : '')] = { file: r.dest, angleDeg: ang, tiltRad: tilt, seconds: r.seconds, consoleErrors: r.consoleErrors, eval: r.eval };
  }
  writeFileSync(mp, JSON.stringify({ url: URL, cat, angleLever: 'gem3d.js L51 rotation.y = cat.spin * t * 0.9 (frozen via accessors)', updatedAt: new Date().toISOString(), shots }, null, 2) + '\n');
}
console.log('DONE');
