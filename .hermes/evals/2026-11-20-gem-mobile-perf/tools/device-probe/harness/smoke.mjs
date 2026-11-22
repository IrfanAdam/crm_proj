/* smoke.mjs — E5 device-probe harness (kept next to the probe it tests).
 * Run from this directory: `node smoke.mjs …`. Imports the in-repo rogue harness (../../rogue/harness.mjs).
 * ROGUE_ROOT defaults to <tmp>/e5-probe-runs so Chrome profiles and shots never land in the repo tree.
 */
import os from 'node:os';
import path from 'node:path';
process.env.ROGUE_ROOT = process.env.ROGUE_ROOT || path.join(os.tmpdir(), 'e5-probe-runs');   // Chrome profiles + shots stay out of the repo

/* smoke.mjs — E5 probe smoke: HUD appears, JSON populated, timer-mode honest, inert without the param. */
const { launchChrome, openPage, mountCeremony } = await import('../../rogue/harness.mjs');
const BASE = 'http://127.0.0.1:5413';
const out = {};

// 1) probe ON (real timer extension if the browser has one)
{
  const b = await launchChrome({ windowSize: [390, 844], label: 'e5-on' });
  const p = await openPage(b, { view: { w: 390, h: 844, dpr: 3, cpu: 0 } });
  try {
    await mountCeremony(p, { url: BASE + '/gallery.html', query: 'gemtimer=1&gemdpr=3' });
    await p.waitFor(`!!(window.GEM_TIMER && GEM_TIMER.state().frames > 15)`, 40000, 'probe frames');
    await new Promise((r) => setTimeout(r, 2500));
    out.on = await p.ev(`(()=>{
      const hud=document.getElementById('gem-timer-hud'), btn=document.getElementById('gem-timer-copy');
      const j=GEM_TIMER.json(), st=GEM_TIMER.state();
      let clickErr=0; try{ if(btn) btn.click(); }catch(e){ clickErr=String(e.message||e); }
      return { hud:!!hud, btn:!!(btn&&/copy/i.test(btn.textContent)||/copied/i.test(btn.textContent)), btnText:btn?btn.textContent:null,
        text:hud?hud.innerText:null, json:j, state:st, clickErr:clickErr, rowsText:hud?hud.innerText.split('\\n').length:0,
        perfTimerExt:!!(window.GEM_PERF_TIMER_EXT&&GEM_PERF_TIMER_EXT.arm) }; })()`);
    // pixels unchanged? just prove the stone still renders (non-blank) with the probe on
    out.on.canvasMean = await p.ev(`(()=>{const r=GEM3D.rigs.find(x=>x.renderer&&x.canvas.closest('#gem-screen'));const g=r.renderer.getContext();
      const w=r.renderer.domElement.width,h=r.renderer.domElement.height,b=new Uint8Array(w*h*4);
      r.renderer.render(r.scene,r.camera); g.readPixels(0,0,w,h,g.RGBA,g.UNSIGNED_BYTE,b);
      let s=0; for(let i=0;i<b.length;i+=4) s+=b[i]+b[i+1]+b[i+2]; return +(s/(w*h*3)).toFixed(2); })()`);
    out.on.errors = p.errors.slice(0, 6);
  } catch (e) { out.on = { error: String(e.message || e).slice(0, 300) }; }
  finally { try { await p.close(); } catch (e) {} await b.close(); }
}

// 2) probe ON with the timer extension hidden → must say rAF, never claim gpu timer data
{
  const b = await launchChrome({ windowSize: [390, 844], label: 'e5-raf' });
  const p = await openPage(b, { view: { w: 390, h: 844, dpr: 3, cpu: 0 } });
  await p.seed(`(()=>{const P=window.WebGL2RenderingContext&&WebGL2RenderingContext.prototype; if(!P) return;
    const g=P.getExtension; P.getExtension=function(n){ if(/disjoint_timer_query/i.test(String(n))) return null; return g.apply(this,arguments); };})()`);
  try {
    await mountCeremony(p, { url: BASE + '/gallery.html', query: 'gemtimer=1&gemdpr=3' });
    await p.waitFor(`!!(window.GEM_TIMER && GEM_TIMER.state().attached)`, 40000, 'raf attach');
    await new Promise((r) => setTimeout(r, 2000));
    out.raf = await p.ev(`(()=>{const hud=document.getElementById('gem-timer-hud'), j=GEM_TIMER.json();
      return { text:hud?hud.innerText:null, mode:j.timer.mode, note:j.timer.note, passes:j.timer.passes, frame:j.frame, ext:j.gl.timerExt, state:GEM_TIMER.state() }; })()`);
  } catch (e) { out.raf = { error: String(e.message || e).slice(0, 300) }; }
  finally { try { await p.close(); } catch (e) {} await b.close(); }
}

// 3) knobs: taps 1, bloom off — the frame must follow the URL, and the JSON must report it
{
  const b = await launchChrome({ windowSize: [390, 844], label: 'e5-knob' });
  const p = await openPage(b, { view: { w: 390, h: 844, dpr: 3, cpu: 0 } });
  try {
    await mountCeremony(p, { url: BASE + '/gallery.html', query: 'gemtimer=1&gemdpr=3&gemtaps=1&gembloom=0' });
    await p.waitFor(`!!(window.GEM_TIMER && GEM_TIMER.state().frames > 15)`, 40000, 'knob frames');
    await new Promise((r) => setTimeout(r, 1800));
    out.knob = await p.ev(`(()=>{const j=GEM_TIMER.json(); return { taps:j.taps, bounce:j.bounce, bloom:j.bloom, text:document.getElementById('gem-timer-hud').innerText.split('\\n').slice(0,5) }; })()`);
  } catch (e) { out.knob = { error: String(e.message || e).slice(0, 300) }; }
  finally { try { await p.close(); } catch (e) {} await b.close(); }
}

// 4) probe OFF: no HUD, no global, nothing on the page
{
  const b = await launchChrome({ windowSize: [390, 844], label: 'e5-off' });
  const p = await openPage(b, { view: { w: 390, h: 844, dpr: 3, cpu: 0 } });
  try {
    await mountCeremony(p, { url: BASE + '/gallery.html', query: 'gemdpr=3' });
    await new Promise((r) => setTimeout(r, 2000));
    out.off = await p.ev(`(()=>({ hud:!!document.getElementById('gem-timer-hud'), timerGlobal:!!window.GEM_TIMER,
      ext:!!window.GEM_PERF_TIMER_EXT, perfTimerExtArm:!!(window.GEM_PERF_TIMER_EXT&&GEM_PERF_TIMER_EXT.arm),
      bodyKids:document.body.children.length }))()`);
  } catch (e) { out.off = { error: String(e.message || e).slice(0, 300) }; }
  finally { try { await p.close(); } catch (e) {} await b.close(); }
}
console.log(JSON.stringify(out, null, 2));
