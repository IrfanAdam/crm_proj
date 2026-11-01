/* lanes/value/probe.mjs — uniform-only attribution probes (no src edits).
 * usage: node lanes/value/probe.mjs <cat> <probe[,probe...]> [--out DIR]
 * Each probe = fresh page + frozen pose, live uniform/visibility override on the
 * gem rigs, then the round-6 stage clip. Writes <out>/<cat>/<probe>.png + meta.json
 */
import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync, copyFileSync, existsSync, rmSync } from 'node:fs';
import path from 'node:path';

const ROOT = '/Users/irfan/Documents/Portfolio Redo/crm_proj';
const URL = 'http://127.0.0.1:5176/gallery.html?gem=high#gems';
const SHOT = path.join(ROOT, 'prototype/gems/gem-shot.mjs');
const CLIP = '.frame[data-panel="gems"] .gem-stage';
const argv = process.argv.slice(2);
const cat = argv[0] || 'sapphire';
const names = (argv[1] || 'ctrl').split(',').map((s) => s.trim()).filter(Boolean);
const OUT = argv.includes('--out') ? path.join(ROOT, argv[argv.indexOf('--out') + 1]) : path.join(ROOT, 'lanes/value/probes');

const ARM = {
  ctrl: '',
  verify: '',
  pxy0: `meta.steps.push('proxy-gain-0'); rigs().forEach(r=>{r.mats[1].uniforms.gain.value=0;});`,
  ramp0: `meta.steps.push('ramp-black'); rigs().forEach(r=>{['rampDeep','rampMid','rampLite','rampPink'].forEach(k=>r.mats[1].uniforms[k].value.setRGB(0,0,0));});`,
  rampR: `meta.steps.push('ramp-red'); rigs().forEach(r=>{['rampDeep','rampMid','rampLite','rampPink'].forEach(k=>r.mats[1].uniforms[k].value.setRGB(3,0,0));});`,
  rampHalf: `meta.steps.push('ramp-halfmix'); rigs().forEach(r=>{r.mats[1].uniforms.rampDeep.value.setRGB(0.031,0.09,0.345);r.mats[1].uniforms.rampMid.value.setRGB(0.031,0.09,0.345);r.mats[1].uniforms.rampLite.value.setRGB(0.031,0.09,0.345);});`,
  pxyhalf: `meta.steps.push('proxy-gain-half'); rigs().forEach(r=>{r.mats[1].uniforms.gain.value*=0.5;});`,
  env0: `meta.steps.push('env-null'); rigs().forEach(r=>{r.mats[1].uniforms.envMap.value=null;r.mats[1].needsUpdate=true;});`,
  deepR: `meta.steps.push('rampDeep-red'); rigs().forEach(r=>{const u=r.mats[1].uniforms;u.rampDeep.value.setRGB(3,0,0);u.rampMid.value.setRGB(0,0,0);u.rampLite.value.setRGB(0,0,0);u.rampPink.value.setRGB(0,0,0);});`,
  midR: `meta.steps.push('rampMid-red'); rigs().forEach(r=>{const u=r.mats[1].uniforms;u.rampDeep.value.setRGB(0,0,0);u.rampMid.value.setRGB(3,0,0);u.rampLite.value.setRGB(0,0,0);u.rampPink.value.setRGB(0,0,0);});`,
  liteR: `meta.steps.push('rampLite-red'); rigs().forEach(r=>{const u=r.mats[1].uniforms;u.rampDeep.value.setRGB(0,0,0);u.rampMid.value.setRGB(0,0,0);u.rampLite.value.setRGB(3,0,0);u.rampPink.value.setRGB(0,0,0);});`,
  tx50: `meta.steps.push('body-transmission-0.5'); rigs().forEach(r=>{r.mats[0].transmission=0.5;r.mats[0].needsUpdate=true;});`,
};

function evalFor(p) {
  const arm = ARM[p];
  if (arm === undefined) throw new Error('unknown probe ' + p);
  return `(async()=>{
  const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  const meta={variant:${JSON.stringify(p)},cat:${JSON.stringify(cat)},steps:[]};
  try{
    const rigs=()=>((window.GEM3D&&window.GEM3D.rigs)||[]).filter(r=>r&&r.group&&r.canvas&&r.canvas.isConnected);
    if(!window.T&&window.THREE)window.T=window.THREE;
    const pill=document.querySelector('[data-gemspec-cat="${cat}"]');
    if(pill)pill.click();
    const snap=()=>{let n=0;rigs().forEach(r=>{if(r.tint&&window.GEM_TINT&&window.GEM_TINT.step){try{window.GEM_TINT.step(r,5);n++;}catch(e){}}});return n;};
    for(let i=0;i<40;i++){const a=snap();if(!rigs().some(r=>r.tint))break;if(!a)await sleep(50);}
    let c=document.querySelector('.frame[data-panel="gems"] canvas[data-gem="${cat}"]')||document.querySelector('.frame[data-panel="gems"] canvas[data-gem]');
    if(c){c.style.flex='0 0 auto';c.style.height='223px';}
    await sleep(300);
    ${arm}
    const rs=rigs();
    rs.forEach(r=>{try{r.cat.spin=0;r.t=0;r.tilt=0;r.tiltT=0;}catch(e){}});
    await sleep(600);
    rs.forEach(r=>{try{r.cat.spin=0;r.t=0;r.tilt=0;r.tiltT=0;}catch(e){}});
    meta.rigs=rs.length;
    meta.tintLeft=rs.map(r=>!!r.tint);
    meta.bodyColor=rs.map(r=>(r.mats&&r.mats[0]&&r.mats[0].color&&r.mats[0].color.getHexString)?('#'+r.mats[0].color.getHexString()):null);
    meta.uniforms=rs.map(r=>{const u={};const m=r.mats&&r.mats[1];if(m&&m.uniforms)Object.keys(m.uniforms).forEach(k=>{const v=m.uniforms[k].value;
      if(v&&v.isColor)u[k]=v.getHexString();else if(typeof v==='number')u[k]=+v.toFixed(3);});return u;});
    document.body.dataset.probeDone='1';
    return JSON.stringify(meta);
  }catch(e){return JSON.stringify({variant:${JSON.stringify(p)},error:String(e&&e.stack||e)});}
})()`;
}

const run = (args, timeout = 180000) => new Promise((resolve) => {
  const p = spawn(process.execPath, [SHOT, ...args], { cwd: ROOT, stdio: ['ignore', 'pipe', 'pipe'] });
  let out = '', err = '';
  p.stdout.on('data', (d) => (out += d));
  p.stderr.on('data', (d) => (err += d));
  const t = setTimeout(() => { try { p.kill('SIGKILL'); } catch {} }, timeout);
  p.on('close', (code) => { clearTimeout(t); resolve({ code, out, err }); });
});
const parse = (s) => { const i = s.indexOf('{'); if (i < 0) return null; try { return JSON.parse(s.slice(i)); } catch { return null; } };

const meta = [];
for (const p of names) {
  const dest = path.join(OUT, cat, p + '.png');
  if (existsSync(dest)) { console.log('[probe] skip', cat, p); continue; }
  const dir = path.join(OUT, '.work', cat, p);
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir, { recursive: true });
  const args = [URL, dir, '--scale', '1', '--wait', '6000', '--clip', CLIP, '--eval', evalFor(p)];
  const t0 = Date.now();
  const res = await run(args);
  const j = parse(res.out);
  const clip = path.join(dir, 'clip-0.png');
  const ok = existsSync(clip);
  if (ok) { mkdirSync(path.join(OUT, cat), { recursive: true }); copyFileSync(clip, dest); }
  let em = null;
  if (j && typeof j.fps === 'string') { try { em = JSON.parse(j.fps); } catch { em = { parseError: j.fps }; } }
  console.log('[probe]', cat, p, ok ? 'ok' : 'NO-CLIP', (((Date.now() - t0) / 1000).toFixed(1)) + 's',
    'errs=' + (j ? (j.consoleErrors || []).length : '?'));
  meta.push({ cat, probe: p, file: dest, secs: +((Date.now() - t0) / 1000).toFixed(1), evalMeta: em,
    consoleErrors: j ? j.consoleErrors : [String(res.err || '').slice(0, 300)] });
}
writeFileSync(path.join(OUT, 'meta_' + cat + '.json'), JSON.stringify(meta, null, 2));
