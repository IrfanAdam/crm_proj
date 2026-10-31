/* darkcaps lane — drives gem-shot.mjs unmodified, one fresh Chrome per shot. Variants -> lanes/darkcaps/<cat>/, probes -> lanes/darkcaps/probes/. Usage: node lanes/darkcaps/capture.mjs [--cat sapphire|citrine] [--only front,win0] [--force] */
import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync, copyFileSync, existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
const ROOT = '/Users/irfan/Documents/Portfolio Redo/crm_proj', LANE = path.join(ROOT, 'lanes/darkcaps');
const URL = 'http://127.0.0.1:5176/gallery.html?gem=high#gems', SHOT = path.join(ROOT, 'prototype/gems/gem-shot.mjs');
const CLIP = '.frame[data-panel="gems"] .gem-stage', WORK = path.join(LANE, '.work');
const VARIANTS = ['front', 'repeat', 'txoff', 'dispoff', 'chart', 'dark', 'nogem'];
const PROBES = {
  win0: `rigs().forEach(function (r) { var u = r.mats[1].uniforms; if (u && u.winGain) u.winGain.value = 0; }); meta.probeState = rigs().map(function (r) { return r.mats[1].uniforms.winGain.value; });`,
  stageoff: `rigs().forEach(function (r) { var u = r.mats[1].uniforms; if (u && u.stageOn) u.stageOn.value = 0; }); meta.probeState = rigs().map(function (r) { return r.mats[1].uniforms.stageOn.value; });`,
  gain05: `rigs().forEach(function (r) { var u = r.mats[1].uniforms; if (u && u.gain) u.gain.value *= 0.5; }); meta.probeState = rigs().map(function (r) { return +r.mats[1].uniforms.gain.value.toFixed(3); });`,
  gain2: `rigs().forEach(function (r) { var u = r.mats[1].uniforms; if (u && u.gain) u.gain.value *= 2; }); meta.probeState = rigs().map(function (r) { return +r.mats[1].uniforms.gain.value.toFixed(3); });`,
  tx025: `rigs().forEach(function (r) { if (r.mats[0] && 'transmission' in r.mats[0]) r.mats[0].transmission = 0.25; }); meta.probeState = rigs().map(function (r) { return r.mats[0].transmission; });`,
  att05: `rigs().forEach(function (r) { if (r.mats[0]) r.mats[0].attenuationDistance *= 0.5; }); meta.probeState = rigs().map(function (r) { return +r.mats[0].attenuationDistance.toFixed(3); });`,
  att2: `rigs().forEach(function (r) { if (r.mats[0]) r.mats[0].attenuationDistance *= 2; }); meta.probeState = rigs().map(function (r) { return +r.mats[0].attenuationDistance.toFixed(3); });` };
const argv = process.argv.slice(2);
const argOf = (n, d) => { const i = argv.indexOf('--' + n); return i < 0 ? d : argv[i + 1]; };
const cats = (argOf('cat', '') || 'sapphire,citrine').split(',').map((s) => s.trim()).filter(Boolean);
const only = (argOf('only', '') || VARIANTS.join(',') + ',' + Object.keys(PROBES).join(',')).split(',').map((s) => s.trim()).filter(Boolean);
const force = argv.includes('--force');
const ARM = {
  txoff: `rigs().forEach(function (r) { (r.mats || []).forEach(function (m) { if (m && 'transmission' in m) { m.transmission = 0; m.needsUpdate = true; } }); });rigs().forEach(function (r) { var fl = r.floors; if (!fl) return; if (fl.shadow) fl.shadow.visible = false; if (fl.caustic) fl.caustic.visible = false; });`,
  dispoff: `var seen = [], n = 0; rigs().forEach(function (r) { r.group.traverse(function (o) { var ms = o.material ? (Array.isArray(o.material) ? [o.material] : [o.material]) : []; ms.forEach(function (m) { if (!m || seen.indexOf(m) >= 0) return; seen.push(m); m.onBeforeCompile = function () {}; m.needsUpdate = true; n++; }); }); });`,
  chart: `var pb = document.querySelector('.frame[data-panel="gems"] [data-gem-photo]'); if (pb) { pb.click(); pb.click(); } for (var ci = 0; ci < 80; ci++) { var bg = rigs()[0] && rigs()[0].scene && rigs()[0].scene.background; if (bg && bg.image && (bg.image.width || bg.image.naturalWidth)) break; await sleep(50); } await sleep(500);`,
  dark: `var db = document.querySelector('.frame[data-panel="gems"] [data-gem-scheme="dark"]'); if (db) db.click(); await sleep(600);`,
  nogem: `rigs().forEach(function (r) { r.group.visible = false; });` };
function evalFor(cat, kind, name) {
  const extra = kind === 'probe' ? `meta.steps.push('probe:${name}');` + PROBES[name] + `await sleep(400);` : (ARM[name] || '');
  return `(async()=>{const sleep=ms=>new Promise(r=>setTimeout(r,ms));const meta={kind:${JSON.stringify(kind)},name:${JSON.stringify(name)},cat:${JSON.stringify(cat)},steps:[]};try{const rigs=()=>((window.GEM3D&&window.GEM3D.rigs)||[]).filter(r=>r&&r.group&&r.canvas&&r.canvas.isConnected);const stage=document.querySelector('.frame[data-panel="gems"] [data-gem-stage]');if(!window.T&&window.THREE)window.T=window.THREE;const pill=document.querySelector('[data-gemspec-cat="${cat}"]');if(pill)pill.click();const snap=()=>{let n=0;rigs().forEach(r=>{if(r.tint&&window.GEM_TINT&&window.GEM_TINT.step){try{window.GEM_TINT.step(r,5);n++;}catch(e){}}});return n;};for(let i=0;i<40;i++){const a=snap();if(!rigs().some(r=>r.tint))break;if(!a)await sleep(50);}meta.tintLeft=rigs().some(r=>r.tint);let c=document.querySelector('.frame[data-panel="gems"] canvas[data-gem="${cat}"]')||document.querySelector('.frame[data-panel="gems"] canvas[data-gem]');if(c){c.style.flex='0 0 auto';c.style.height='223px';}await sleep(300);${extra}const rs=rigs();rs.forEach(r=>{try{r.cat.spin=0;r.t=0;r.tilt=0;r.tiltT=0;}catch(e){}});await sleep(600);rs.forEach(r=>{try{r.cat.spin=0;r.t=0;r.tilt=0;r.tiltT=0;}catch(e){}});const b=c?c.getBoundingClientRect():null;meta.canvas=c?{cw:c.clientWidth,ch:c.clientHeight,bw:Math.round(b.width),bh:Math.round(b.height),gem:c.dataset.gem}:null;meta.rigs=rs.length;meta.transmission=rs.map(r=>(r.mats&&r.mats[0]?r.mats[0].transmission:null));meta.rotationY=rs.map(r=>+r.group.rotation.y.toFixed(4));meta.theme=stage?stage.dataset.theme:null;return JSON.stringify(meta);}catch(e){return JSON.stringify({kind:${JSON.stringify(kind)},name:${JSON.stringify(name)},cat:${JSON.stringify(cat)},error:String(e&&e.stack||e)});}})()`;
}
const run = (args, timeout = 180000) => new Promise((resolve) => { const p = spawn(process.execPath, args, { cwd: ROOT, stdio: ['ignore', 'pipe', 'pipe'] }); let out = '', err = ''; p.stdout.on('data', (d) => (out += d)); p.stderr.on('data', (d) => (err += d)); const t = setTimeout(() => { try { p.kill('SIGKILL'); } catch {} }, timeout); p.on('close', (code) => { clearTimeout(t); resolve({ code, out, err }); }); });
const parseStdout = (s) => { const i = s.indexOf('{'); if (i < 0) return null; try { return JSON.parse(s.slice(i)); } catch { return null; } };
async function shot(cat, kind, name) {
  const dest = kind === 'probe' ? path.join(LANE, 'probes', cat + '_' + name + '.png') : path.join(LANE, cat, name + '.png');
  if (!force && existsSync(dest)) { console.log('[capture] skip ' + cat + '/' + name); return { skipped: true }; }
  const outdir = path.join(WORK, kind, cat, name);
  mkdirSync(outdir, { recursive: true }); mkdirSync(path.dirname(dest), { recursive: true });
  const t0 = Date.now();
  const res = await run([SHOT, URL, outdir, '--scale', '1', '--wait', '6000', '--clip', CLIP, '--eval', evalFor(cat, kind, name)]);
  const secs = ((Date.now() - t0) / 1000).toFixed(1), j = parseStdout(res.out), clip = path.join(outdir, 'clip-0.png'), ok = existsSync(clip);
  if (ok) copyFileSync(clip, dest);
  let evalMeta = null;
  if (j && typeof j.fps === 'string') { try { evalMeta = JSON.parse(j.fps); } catch { evalMeta = { parseError: j.fps }; } }
  console.log('[capture] ' + cat + '/' + name + ' ' + (ok ? 'ok' : 'NO-CLIP') + ' ' + secs + 's');
  return { name, dest, ok, seconds: Number(secs), probe: j ? j.probe : null, consoleErrors: j ? j.consoleErrors : [], eval: evalMeta };
}
for (const cat of cats) {
  mkdirSync(path.join(LANE, cat), { recursive: true });
  const mp = path.join(LANE, cat, 'meta.json');
  let prev = {};
  if (existsSync(mp)) { try { prev = JSON.parse(readFileSync(mp, 'utf8')); } catch { prev = {}; } }
  const shots = Object.assign({}, prev.shots || {});
  for (const v of VARIANTS) { if (!only.includes(v)) continue; const r = await shot(cat, 'variant', v); if (r && !r.skipped) shots[v] = { file: r.dest, seconds: r.seconds, consoleErrors: r.consoleErrors, eval: r.eval, probe: r.probe }; }
  const pp = path.join(LANE, 'probes', 'meta.json');
  let prevProbe = {};
  if (existsSync(pp)) { try { prevProbe = JSON.parse(readFileSync(pp, 'utf8')); } catch { prevProbe = {}; } }
  for (const p of Object.keys(PROBES)) { if (!only.includes(p)) continue; const r = await shot(cat, 'probe', p); if (r && !r.skipped) prevProbe[cat + '_' + p] = { file: r.dest, seconds: r.seconds, consoleErrors: r.consoleErrors, eval: r.eval }; }
  writeFileSync(path.join(LANE, 'probes', 'meta.json'), JSON.stringify(prevProbe, null, 2) + '\n');
  writeFileSync(mp, JSON.stringify({ url: URL, cat, updatedAt: new Date().toISOString(), shots }, null, 2) + '\n');
}
console.log('DONE');
