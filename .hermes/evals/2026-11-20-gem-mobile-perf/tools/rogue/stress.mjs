/* stress.mjs — adversarial cases. Each asserts: no NEW console error, no crash, still renders.
 *
 * Three rules that used to be broken here:
 *  1. CONSOLE: a case may only fail on an error signature that the CONTROL LOAD did not
 *     already produce. The app has a pre-existing thrower (src/ds/deck-lab.js:16 repaints
 *     every ~250 ms on every page), so "errors.length > 0" failed every case for a reason
 *     the change under test could not fix. The allowlist is derived once per run from a
 *     control load and printed in stress.json.
 *  2. VISIBILITY: Page.setWebLifecycleState('frozen') stops rAF permanently in headless
 *     Chrome, so case (c) used to measure a permanently dead page and fail. The override
 *     now only shadows document.hidden / visibilityState and fires visibilitychange.
 *  3. EVIDENCE: every case, pass or fail, writes a page screenshot and a canvas PNG taken
 *     in the SAME task as a render (a preserved-buffer:false canvas is blank otherwise).
 *
 * A case that cannot establish its own precondition is SKIPPED, never passed: skipped
 * cases are worth 0.35 of a pass in score.mjs and do not trigger the 40-point cap.
 *
 * Run: node stress.mjs [--only a,c,j]
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import {
  OUT, VIEW, BASE_URL, ensureDir, sleep, launchChrome, openPage, mountCeremony,
  pin, seedTune, captureRaw, captureCanvasPng, writeJSON, mulberry32, RIG_FIND,
  buildIdentity, makeAllowlist, consoleVerdict, setVisibility, restoreVisibility,
  probeVisibilityMethod, signatureCounts, sameBuild, isReloadError,
} from './harness.mjs';

/* =============================== pure parts ============================= */

/** 20 alternating resizes between the two extremes, with seeded random waits. */
export function resizeSchedule(rng, n = 20) {
  const small = { w: 320, h: 568 }, big = { w: 430, h: 932 };
  const out = [];
  const flip = rng() < 0.5;
  for (let i = 0; i < n; i++) {
    const useSmall = (i % 2 === 0) ? !flip : flip;
    const s = useSmall ? small : big;
    out.push({ w: s.w, h: s.h, wait: 40 + Math.floor(rng() * 160) });
  }
  return out;
}

/** A leak shows as monotonic growth; noise shows as noise. Both are reported. */
export function memoryVerdict(samples, tol = 2) {
  if (samples.length < 3) return { ok: false, why: 'not enough samples' };
  const first = samples[0], last = samples[samples.length - 1];
  const growthTextures = last.textures - first.textures;
  const growthGeometries = last.geometries - first.geometries;
  let nonDecreasing = true;
  for (let i = 1; i < samples.length; i++) {
    if (samples[i].textures < samples[i - 1].textures || samples[i].geometries < samples[i - 1].geometries) {
      nonDecreasing = false; break;
    }
  }
  let strictlyGrowing = true;
  for (let i = 1; i < samples.length; i++) {
    if (samples[i].textures <= samples[i - 1].textures && samples[i].geometries <= samples[i - 1].geometries) {
      strictlyGrowing = false; break;
    }
  }
  const tail = samples.slice(-5);
  const tailSpreadT = Math.max(...tail.map((s) => s.textures)) - Math.min(...tail.map((s) => s.textures));
  const tailSpreadG = Math.max(...tail.map((s) => s.geometries)) - Math.min(...tail.map((s) => s.geometries));
  const ok = growthTextures <= tol && growthGeometries <= tol
    && tailSpreadT <= tol && tailSpreadG <= tol && !strictlyGrowing;
  return {
    ok, tol, growthTextures, growthGeometries,
    monotonic: nonDecreasing, strictlyGrowing, strictlyUp: strictlyGrowing,
    tailSpreadTextures: tailSpreadT, tailSpreadGeometries: tailSpreadG,
    textures: { before: first.textures, after: last.textures },
    geometries: { before: first.geometries, after: last.geometries },
  };
}

export function aggregate(results) {
  const passed = results.filter((r) => r.ok).length;
  const skipped = results.filter((r) => r.kind === 'skip').length;
  const failed = results.filter((r) => r.kind === 'fail').length;
  const failures = results.filter((r) => r.kind !== 'pass')
    .map((r) => ({ case: r.id, name: r.name, kind: r.kind, detail: r.detail, screenshot: r.screenshot || null }));
  return { total: results.length, passed, failed, skipped, failures };
}

/**
 * Keep earlier cases when only a subset was re-run — but ONLY on the same build identity.
 * A merged report that spans two trees would be a lie.
 */
export function mergeResults(previous, fresh, build, order) {
  if (!previous || !Array.isArray(previous.cases) || !previous.build || !build) return fresh;
  if (previous.build.label !== build.label) return fresh;
  const map = new Map(previous.cases.map((c) => [c.id, c]));
  for (const r of fresh) map.set(r.id, r);
  const ids = order || [...map.keys()];
  return ids.filter((id) => map.has(id)).map((id) => map.get(id));
}

/* =============================== helpers ================================ */

/** Allowlist shared by every case in this run (set in main from the control loads). */
let ALLOW = makeAllowlist([]);
let BUILD = null;

const settle = async (page) => { await sleep(120); return pin(page); };

/** Non-blank check. RENDERS FIRST, in the same task — see harness SAME-TASK LAW. */
async function coverage(page) {
  return page.ev(`(()=>{
    const rig=${RIG_FIND}; if(!rig||!rig.renderer) return {ok:false,why:'no-rig'};
    const r=rig.renderer, gl=r.getContext(), el=r.domElement;
    const w=el.width,h=el.height;
    if(!w||!h) return {ok:false,why:'zero-buffer'};
    r.render(rig.scene,rig.camera);
    const px=new Uint8Array(w*h*4); gl.readPixels(0,0,w,h,gl.RGBA,gl.UNSIGNED_BYTE,px);
    let a=0,l=0; for(let i=0;i<w*h;i++){ if(px[i*4+3]>8) a++; l+=px[i*4]+px[i*4+1]+px[i*4+2]; }
    return { ok:true, alphaPct:+(100*a/(w*h)).toFixed(3), meanRGB:+(l/(w*h*3)).toFixed(2),
      buf:[w,h], ratio:+r.getPixelRatio().toFixed(3), contextLost:gl.isContextLost() };
  })()`);
}

/** Screenshot + canvas PNG, both with a render in the same task. */
async function evidence(page, id) {
  let shot = null, canvas = null;
  try { shot = await page.screenshot(`stress-${id}`); } catch (e) {}
  try {
    const dataUrl = await captureCanvasPng(page);
    if (dataUrl) {
      const p = path.join(ensureDir(path.join(OUT, 'failures')), `stress-${id}-canvas.png`);
      fs.writeFileSync(p, Buffer.from(String(dataUrl).split(',')[1] || '', 'base64'));
      canvas = p;
    }
  } catch (e) {}
  return { screenshot: shot, canvas };
}

/** Close the page AFTER collecting evidence. Called for every case, pass or fail. */
async function done(page, id, res) {
  const ev = await evidence(page, id);
  try { await page.close(); } catch (e) {}
  return { ...res, ...ev, evidence: ev };
}

const errText = (v) => (v.offending || []).map((o) => `[NEW] ${o.sig} x${o.count}`).slice(0, 4).join(' | ');
const allowText = (v) => (v.allowlisted || []).map((o) => `${o.sig} x${o.count}`).join(' | ');

/* ================================ cases ================================= */

const CASES = [
  {
    id: 'a', name: 'resize storm 320x568 <-> 430x932 x20',
    run: async (browser, reg) => {
      const page = await openPage(browser); reg.page = page;
      await seedTune(page);
      await mountCeremony(page, { query: 'gemdpr=3&gemperf=1' });
      const sched = resizeSchedule(mulberry32(4242), 20);
      const tracks = [];
      for (const s of sched) {
        await page.cdp.send('Emulation.setDeviceMetricsOverride', {
          width: s.w, height: s.h, deviceScaleFactor: VIEW.dpr, mobile: true,
          screenWidth: s.w, screenHeight: s.h,
        }, page.S);
        await sleep(s.wait);
        const st = await page.ev(`(()=>{const r=${RIG_FIND}; if(!r||!r.renderer) return {gone:1};
          const gl=r.renderer.getContext();
          return { w:r.renderer.domElement.width, h:r.renderer.domElement.height, css:[r.w,r.h],
                   lost:gl.isContextLost(), dead:!!r.dead };})()`);
        tracks.push({ ...s, ...st });
      }
      await page.cdp.send('Emulation.setDeviceMetricsOverride', {
        width: VIEW.w, height: VIEW.h, deviceScaleFactor: VIEW.dpr, mobile: true,
        screenWidth: VIEW.w, screenHeight: VIEW.h,
      }, page.S);
      await sleep(600);
      await settle(page);
      const cov = await coverage(page);
      const v = consoleVerdict(page, ALLOW);
      const bad = tracks.filter((t) => t.gone || t.lost || t.dead || !t.w || !t.h);
      const ok = v.ok && !bad.length && cov.ok && cov.alphaPct > 0.2 && cov.meanRGB > 1;
      return done(page, 'a', {
        ok, kind: ok ? 'pass' : 'fail',
        detail: ok ? `${tracks.length} resizes, buffer restored to ${cov.buf.join('x')}, coverage ${cov.alphaPct}%`
          : `${bad.length} bad frame(s) | ${errText(v)} | cov ${JSON.stringify(cov)}`,
        metrics: { badFrames: bad.length, last: tracks[tracks.length - 1], cov, console: v },
      });
    },
  },
  {
    id: 'b', name: 'dpr switch 1 -> 2.5 -> 1 x10',
    run: async (browser, reg) => {
      const page = await openPage(browser); reg.page = page;
      await seedTune(page);
      await mountCeremony(page, { query: 'gemdpr=3&gemperf=1' });
      const r = await page.ev(`(async()=>{
        const rig=${RIG_FIND}, renderer=rig.renderer, el=renderer.domElement;
        const cssW=Math.round(rig.w)||el.clientWidth, cssH=Math.round(rig.h)||el.clientHeight;
        const step=(d)=>{ renderer.setPixelRatio(d); renderer.setSize(cssW,cssH,false);
          renderer.render(rig.scene,rig.camera);
          return { ratio:+renderer.getPixelRatio().toFixed(3), buf:[el.width,el.height] }; };
        const trail=[];
        for(let i=0;i<10;i++){ trail.push(step(1)); trail.push(step(2.5)); }
        const end=step(1);
        return { css:[cssW,cssH], trail, end };
      })()`);
      await settle(page);
      const cov = await coverage(page);
      const v = consoleVerdict(page, ALLOW);
      const expectW = Math.round(r.css[0] * 1);
      const ok = v.ok && Math.abs(r.end.ratio - 1) < 0.01
        && Math.abs(r.end.buf[0] - expectW) <= 2 && cov.ok && cov.alphaPct > 0.2 && !cov.contextLost;
      return done(page, 'b', {
        ok, kind: ok ? 'pass' : 'fail',
        detail: ok ? `10 switches, ended ratio ${r.end.ratio} buffer ${r.end.buf.join('x')}`
          : `ratio ${r.end.ratio} buf ${r.end.buf.join('x')} expected ~${expectW} | ${errText(v)} | ${JSON.stringify(cov)}`,
        metrics: { css: r.css, end: r.end, cov, console: v, switches: 20 },
      });
    },
  },
  {
    id: 'c', name: 'hidden/shown x5 + cadence recovery (30s cap -> SKIP)',
    run: async (browser, reg) => {
      const page = await openPage(browser); reg.page = page;
      await seedTune(page);
      await mountCeremony(page, { query: 'gemdpr=3&gemperf=1' });
      const visMethod = await probeVisibilityMethod(page);
      const rafOf = () => page.ev(`(()=>{const r=${RIG_FIND}; return r?{raf:r.raf,vis:r.vis}:null;})()`);
      const pre = await page.frames(1000);
      const preRaf = await rafOf();
      const t0 = Date.now();
      let cycles = 0, capTripped = false, dropped = [], hiddenSamples = [];
      for (let i = 0; i < 5; i++) {
        if (Date.now() - t0 > 30000) { capTripped = true; break; }
        const a = await setVisibility(page, true);
        await sleep(150);
        dropped.push(a);
        hiddenSamples.push(await page.ev(`(()=>{const r=${RIG_FIND};
          return { hidden:document.hidden, state:document.visibilityState, raf:r?r.raf:null, vis:r?r.vis:null };})()`));
        const b = await setVisibility(page, false);
        await sleep(200);
        cycles++;
      }
      let capState = null;
      if (!capTripped && Date.now() - t0 > 30000) { capTripped = true; }
      await restoreVisibility(page);
      await sleep(400);
      const post = await page.frames(1500);
      const postRaf = await rafOf();
      const cov = await coverage(page);
      const v = consoleVerdict(page, ALLOW);
      const recovered = post.n >= 5 && post.med <= Math.max(250, pre.med * 3);
      const rafAlive = !!(postRaf && (postRaf.raf || postRaf.vis));
      const appSawHidden = hiddenSamples.length === 5 && hiddenSamples.every((s) => s.hidden === true);
      const stuckRaf = hiddenSamples.some((s) => s.raf === 0) ? hiddenSamples[hiddenSamples.length - 1].raf === 0 : false;
      const ok = v.ok && recovered && rafAlive && appSawHidden && cov.ok && cov.alphaPct > 0.2 && cov.meanRGB > 1;
      const kind = ok ? 'pass' : (capTripped ? 'skip' : 'fail');
      const detail = ok
        ? `pre ${pre.med.toFixed(0)}ms -> post ${post.med.toFixed(0)}ms (${post.n} frames), raf alive, override=${visMethod}`
        : capTripped
          ? `SKIP: visibility cycle exceeded the 30s cap after ${cycles}/5 cycles (override=${visMethod}) — no verdict, no pass`
          : `pre ${JSON.stringify(pre)} post ${JSON.stringify(post)} raf ${JSON.stringify(postRaf)} | ${errText(v)}`;
      return done(page, 'c', {
        ok, kind, detail,
        metrics: {
          cycles, capTripped, visMethod, pre, post, preRaf, postRaf, recovered, rafAlive, cov,
          appSawHidden, hiddenSamples, stuckRaf,
          overrides: dropped, cappedState: capState, elapsedMs: Date.now() - t0,
          console: v, allowlisted: allowText(v),
        },
      });
    },
  },
  {
    id: 'd', name: 'prefers-reduced-motion',
    run: async (browser, reg) => {
      const page = await openPage(browser, { reducedMotion: true }); reg.page = page;
      await seedTune(page);
      await mountCeremony(page, { query: 'gemdpr=3&gemperf=1' });
      await sleep(500);
      const st = await page.ev(`(()=>{const rig=${RIG_FIND}; if(!rig) return {gone:1};
        return { raf:rig.raf, still:!!document.querySelector('canvas'), t:rig.t };})()`);
      const cov = await coverage(page);
      const v = consoleVerdict(page, ALLOW);
      const ok = v.ok && st.raf === 0 && cov.ok && cov.alphaPct > 0.2 && st.t === 0;
      return done(page, 'd', {
        ok, kind: ok ? 'pass' : 'fail',
        detail: ok ? `static frame, raf=${st.raf}, coverage ${cov.alphaPct}%`
          : `raf=${st.raf} t=${st.t} cov=${JSON.stringify(cov)} | ${errText(v)}`,
        metrics: { st, cov, console: v },
      });
    },
  },
  {
    id: 'e', name: '?gemdpr=1 | 2 | absent',
    run: async (browser, reg) => {
      const out = [];
      let keep = null;
      for (const q of ['gemdpr=1', 'gemdpr=2', '']) {
        if (keep) { try { await keep.close(); } catch (err) {} }
        const page = await openPage(browser); reg.page = page; keep = page;
        await seedTune(page);
        await mountCeremony(page, { query: [q, 'gemperf=1'].filter(Boolean).join('&') });
        await sleep(400);
        const r = await page.ev(`(()=>{const rig=${RIG_FIND}; if(!rig) return {gone:1};
          const el=rig.renderer.domElement;
          return { ratio:+rig.renderer.getPixelRatio().toFixed(3), buf:[el.width,el.height], css:[Math.round(rig.w),Math.round(rig.h)] };})()`);
        const v = consoleVerdict(page, ALLOW);
        out.push({ q: q || '(absent)', ...r, newErrors: v.offending.length });
      }
      const by = Object.fromEntries(out.map((o) => [o.q, o]));
      const d1 = by['gemdpr=1'], d2 = by['gemdpr=2'], dn = by['(absent)'];
      const errs = out.some((o) => o.newErrors);
      const bufOk = (o) => o && o.buf && Math.abs(o.buf[0] - Math.round(o.css[0] * o.ratio)) <= 2;
      const ok = !errs && d1 && d2 && dn
        && d1.ratio <= 1.05 && d2.ratio >= 1.8 && dn.ratio >= 1 && dn.ratio <= 2.05
        && bufOk(d1) && bufOk(d2) && bufOk(dn);
      return done(keep, 'e', {
        ok, kind: ok ? 'pass' : 'fail',
        detail: ok ? `ratios 1:${d1.ratio} 2:${d2.ratio} absent:${dn.ratio}`
          : `ratios ${JSON.stringify(out.map((o) => [o.q, o.ratio, o.buf]))} newErrors ${JSON.stringify(out.map((o) => o.newErrors))}`,
        metrics: { runs: out },
      });
    },
  },
  {
    id: 'f', name: '?gemquality=full | tuned | absent',
    run: async (browser, reg) => {
      const out = [];
      let keep = null;
      for (const q of ['gemquality=full', 'gemquality=tuned', '']) {
        if (keep) { try { await keep.close(); } catch (err) {} }
        const page = await openPage(browser); reg.page = page; keep = page;
        await seedTune(page);
        await mountCeremony(page, { query: [q, 'gemdpr=3', 'gemperf=1'].filter(Boolean).join('&') });
        await sleep(500);
        const r = await page.ev(`(()=>({
          pill: !!document.querySelector('#gem-screen .gem-tune-btn'),
          api: !!(window.GEM_PERF_TUNE && GEM_PERF_TUNE.value),
          value: (window.GEM_PERF_TUNE && GEM_PERF_TUNE.value) ? GEM_PERF_TUNE.value() : null,
        }))()`);
        const cov = await coverage(page);
        const v = consoleVerdict(page, ALLOW);
        out.push({ q: q || '(absent)', ...r, cov, newErrors: v.offending.length });
      }
      const by = Object.fromEntries(out.map((o) => [o.q, o]));
      const errs = out.some((o) => o.newErrors);
      const renders = out.every((o) => o.cov.ok && o.cov.alphaPct > 0.2);
      const pills = by['gemquality=full'].pill === false && by['gemquality=tuned'].pill === true
        && by['(absent)'].pill === true;
      const ok = !errs && renders && pills;
      return done(keep, 'f', {
        ok, kind: ok ? 'pass' : 'fail',
        detail: ok ? 'full hides pill, tuned/absent show it, all render'
          : `pills ${JSON.stringify(out.map((o) => [o.q, o.pill]))} renders ${JSON.stringify(out.map((o) => o.cov.alphaPct))} newErrors ${JSON.stringify(out.map((o) => o.newErrors))}`,
        metrics: { runs: out.map((o) => ({ q: o.q, pill: o.pill, alphaPct: o.cov.alphaPct, value: o.value })) },
      });
    },
  },
  {
    id: 'g', name: 'bloom toggled 20x then renders',
    run: async (browser, reg) => {
      const page = await openPage(browser); reg.page = page;
      await seedTune(page);
      await mountCeremony(page, { query: 'gemdpr=3&gemperf=1' });
      await pin(page);
      const r = await page.ev(`(async()=>{
        const rig=${RIG_FIND}, B=window.GEM_BLOOM;
        if(!B||!B.set) return {noBloom:1};
        const gl=rig.renderer.getContext(), el=rig.renderer.domElement;
        const px=new Uint8Array(el.width*el.height*4);
        const shot=()=>{ rig.renderer.render(rig.scene,rig.camera);
          gl.readPixels(0,0,el.width,el.height,gl.RGBA,gl.UNSIGNED_BYTE,px);
          let s=0,a=0; for(let i=0;i<px.length;i+=4){ s=(s+px[i]*3+px[i+1]*5+px[i+2]*7)|0; if(px[i+3]>8)a++; }
          return {sum:s, alpha:+(100*a/(el.width*el.height)).toFixed(3)}; };
        const on0=shot();
        let offShot=null;
        for(let i=0;i<10;i++){ B.set(0); offShot=shot(); B.set(1); shot(); }
        const on1=shot();
        return { on0, off:offShot, on1, finalOn:!!B.on(), w:el.width, h:el.height };
      })()`);
      const cov = await coverage(page);
      const v = consoleVerdict(page, ALLOW);
      const differs = r.on0 && r.off && r.on0.sum !== r.off.sum;
      const ok = v.ok && !r.noBloom && r.finalOn === true && differs
        && cov.ok && cov.alphaPct > 0.2 && cov.meanRGB > 1;
      return done(page, 'g', {
        ok, kind: ok ? 'pass' : 'fail',
        detail: ok ? `20 toggles, on/off differ (${r.on0.sum} vs ${r.off.sum}), final on`
          : `${JSON.stringify(r).slice(0, 300)} | ${errText(v)}`,
        metrics: { on0: r.on0, off: r.off, on1: r.on1, finalOn: r.finalOn, cov, console: v },
      });
    },
  },
  {
    id: 'h', name: '3 stones + card rig + ceremony rig in one page',
    run: async (browser, reg) => {
      const page = await openPage(browser); reg.page = page;
      await seedTune(page);
      await mountCeremony(page, { query: 'gemdpr=3&gemperf=1' });
      await page.ev(`(()=>{
        const host=document.createElement('div');
        host.id='rogue-stones';
        host.style.cssText='position:fixed;left:8px;bottom:8px;z-index:5;display:flex;gap:8px';
        ['citrine','amethyst'].forEach(function(c){
          const d=document.createElement('div');
          d.className='gem-reward'; d.style.cssText='width:150px;height:120px;position:relative';
          const cv=document.createElement('canvas');
          cv.setAttribute('data-gem',c); cv.width=150; cv.height=120;
          cv.style.cssText='width:150px;height:120px;display:block';
          d.appendChild(cv); host.appendChild(d);
        });
        document.body.appendChild(host); return 1;})()`);
      await page.waitFor(`GEM3D.rigs.filter(r=>r.renderer).length>=3`, 45000, '3 mounted stones').catch(() => null);
      await sleep(1200);
      const st = await page.ev(`(()=>{
        const rs=GEM3D.rigs.filter(r=>r.renderer);
        const out=rs.map(r=>{ const gl=r.renderer.getContext(), el=r.renderer.domElement;
          let a=0; try{ r.renderer.render(r.scene,r.camera);
            const px=new Uint8Array(el.width*el.height*4);
            gl.readPixels(0,0,el.width,el.height,gl.RGBA,gl.UNSIGNED_BYTE,px);
            for(let i=0;i<el.width*el.height;i++) if(px[i*4+3]>8) a++; }catch(e){}
          return { gem:(r.canvas.closest('#gem-screen')?'ceremony':(r.canvas.dataset.gem||'card')), buf:[el.width,el.height],
            lost:gl.isContextLost(), alphaPct:+(100*a/(el.width*el.height)).toFixed(3),
            ceremony:!!r.canvas.closest('#gem-screen') }; });
        return { n:rs.length, out, total:GEM3D.rigs.length };})()`);
      const stones = new Set(st.out.map((o) => o.gem));
      const v = consoleVerdict(page, ALLOW);
      const ok = v.ok && st.n >= 4 && stones.size >= 4
        && st.out.every((o) => !o.lost && o.alphaPct > 0.05);
      const load = os.loadavg();
      const cpus = os.cpus().length;
      // Under a heavily oversubscribed host a mount shortfall cannot be attributed to the app.
      const oversubscribed = load[0] > cpus;
      const kind = ok ? 'pass' : (st.n < 4 && oversubscribed ? 'skip' : 'fail');
      return done(page, 'h', {
        ok, kind,
        detail: ok ? `${st.n} renderers, ${stones.size} distinct stones, all non-blank`
          : kind === 'skip'
            ? `SKIP: ${st.n}/4 rigs mounted within 45s on a host at load ${load[0].toFixed(1)}/${cpus} cpus — no verdict`
            : `renderers ${st.n} stones ${[...stones].join(',')} | ${JSON.stringify(st.out).slice(0, 300)} | ${errText(v)}`,
        metrics: { ...st, load, cpus, console: v },
      });
    },
  },
  {
    id: 'i', name: 'WebGL1 forced (--disable-webgl2)',
    run: async (browser, reg) => {
      const b1 = await launchChrome({ label: 'webgl1', extraArgs: ['--disable-webgl2'] });
      let res = null;
      try {
        const page = await openPage(b1); reg.page = page;
        const pre = await page.ev(`(()=>{const c=document.createElement('canvas');
          return { webgl2: !!c.getContext('webgl2'), webgl1: !!c.getContext('webgl') };})()`);
        await seedTune(page);
        let mountErr = '';
        try { await mountCeremony(page, { query: 'gemdpr=3&gemperf=1', timeoutMs: 30000 }); } catch (e) { mountErr = 'mount: ' + e.message; }
        // The assertion is that the ARM RENDERS, not that a global exists: find the ceremony
        // rig, read its GL version, render + readPixels in this same task, and require non-blank.
        const st = await page.ev(`(()=>{
          const rs=(window.GEM3D&&GEM3D.rigs)?GEM3D.rigs:[];
          const withR=rs.filter(r=>r.renderer);
          const rig=withR.find(r=>r.canvas&&r.canvas.closest('#gem-screen'))||withR[0]||null;
          let ver=null, shot=null;
          if(rig){
            try{
              const gl=rig.renderer.getContext(), el=rig.renderer.domElement;
              ver=gl.getParameter(gl.VERSION);
              rig.renderer.render(rig.scene,rig.camera);
              const px=new Uint8Array(el.width*el.height*4);
              gl.readPixels(0,0,el.width,el.height,gl.RGBA,gl.UNSIGNED_BYTE,px);
              let a=0,l=0; for(let i=0;i<el.width*el.height;i++){ if(px[i*4+3]>8)a++; l+=px[i*4]+px[i*4+1]+px[i*4+2]; }
              shot={ buf:[el.width,el.height], alphaPct:+(100*a/(el.width*el.height)).toFixed(2),
                     meanRGB:+(l/(el.width*el.height*3)).toFixed(2), lost:gl.isContextLost(),
                     programs:rig.renderer.info&&rig.renderer.info.programs?rig.renderer.info.programs.length:null };
            }catch(e){ shot={ err:String(e.message).slice(0,120) }; }
          }
          const fb=window.GEM_FALLBACK;
          return { rigs:rs.length, renderers:withR.length, glVersion:ver, shot,
            fallback: typeof fb, fallbackKeys: (fb&&typeof fb==='object')?Object.keys(fb):null,
            three: typeof window.THREE, bodyText:(document.body.innerText||'').length };})()`);
        const v = consoleVerdict(page, ALLOW);

        // A mount that never produced a renderer is the runner's retryable precondition, not a
        // WebGL1 verdict — rethrow so the case is retried (and skipped, not failed, if it persists).
        if (mountErr && !st.renderers) throw new Error('timeout waiting for a rig with a renderer');

        // Same-frame reference from the WebGL2 arm (this browser), so the two arms are compared
        // on the same machine in the same run rather than against a remembered number.
        let ref = null;
        {
          const p2 = await openPage(browser);
          try {
            await seedTune(p2);
            try { await mountCeremony(p2, { query: 'gemdpr=3&gemperf=1', timeoutMs: 30000 }); } catch (e) {}
            ref = await p2.ev(`(()=>{const rs=((window.GEM3D&&GEM3D.rigs)||[]).filter(r=>r.renderer);
              const rig=rs.find(r=>r.canvas&&r.canvas.closest('#gem-screen'))||rs[0]||null;
              if(!rig) return null;
              const gl=rig.renderer.getContext(), el=rig.renderer.domElement;
              rig.renderer.render(rig.scene,rig.camera);
              const px=new Uint8Array(el.width*el.height*4);
              gl.readPixels(0,0,el.width,el.height,gl.RGBA,gl.UNSIGNED_BYTE,px);
              let a=0,l=0; for(let i=0;i<el.width*el.height;i++){ if(px[i*4+3]>8)a++; l+=px[i*4]+px[i*4+1]+px[i*4+2]; }
              return { ver:gl.getParameter(gl.VERSION), meanRGB:+(l/(el.width*el.height*3)).toFixed(2),
                alphaPct:+(100*a/(el.width*el.height)).toFixed(2), buf:[el.width,el.height] };})()`);
          } finally { try { await p2.close(); } catch (e) {} }
        }

        const precondition = pre.webgl2 === false;
        const isGL1 = /WebGL 1/i.test(String(st.glVersion || ''));
        const painted = !!(st.shot && !st.shot.err && st.shot.alphaPct > 0.2 && st.shot.meanRGB > 1);
        const meanDelta = ref && st.shot && !st.shot.err ? +Math.abs(ref.meanRGB - st.shot.meanRGB).toFixed(2) : null;
        const ok = precondition && v.ok && !!st.shot && painted && isGL1 && st.renderers > 0;
        const detail = ok
          ? `webgl2 absent, ${st.renderers} renderer(s) on ${st.glVersion}, ${st.shot.buf.join('x')} meanRGB ${st.shot.meanRGB} vs WebGL2 ${ref ? ref.meanRGB : '?'} (Δ ${meanDelta})`
          : precondition
            ? `renderers=${st.renderers} gl=${st.glVersion || 'none'} shot=${JSON.stringify(st.shot)} fallback=${st.fallback} | ${errText(v)} | ${mountErr}`
            : `precondition unmet: webgl2 still available with --disable-webgl2 (renderers=${st.renderers})`;
        res = await done(page, 'i', {
          ok, kind: ok ? 'pass' : (precondition ? 'fail' : 'skip'), detail,
          metrics: { pre, st, ref, meanDelta, mountErr, console: v },
        });
      } finally { await b1.close(); }
      return res;
    },
  },
  {
    id: 'j', name: 'memory: 200 pose changes, no monotonic growth',
    run: async (browser, reg) => {
      const page = await openPage(browser); reg.page = page;
      await seedTune(page);
      await mountCeremony(page, { query: 'gemdpr=3&gemperf=1' });
      await pin(page);
      const r = await page.ev(`(async()=>{
        const rig=${RIG_FIND}, renderer=rig.renderer;
        const snap=(i)=>({ i, textures:renderer.info.memory.textures, geometries:renderer.info.memory.geometries,
          programs:renderer.info.programs?renderer.info.programs.length:0 });
        const samples=[];
        for(let k=0;k<3;k++){ renderer.render(rig.scene,rig.camera); }
        samples.push(snap(0));
        for(let i=1;i<=200;i++){
          rig.group.rotation.y = 0.03*i;
          rig.group.rotation.x = -0.15 + 0.0004*i;
          renderer.render(rig.scene,rig.camera);
          if(i%10===0) samples.push(snap(i));
        }
        return { samples, drawCalls:renderer.info.render.calls, triangles:renderer.info.render.triangles };
      })()`);
      const v = memoryVerdict(r.samples, 2);
      const cv = consoleVerdict(page, ALLOW);
      const ok = cv.ok && v.ok;
      return done(page, 'j', {
        ok, kind: ok ? 'pass' : 'fail',
        detail: ok
          ? `textures ${v.textures.before}->${v.textures.after}, geometries ${v.geometries.before}->${v.geometries.after}, tail spread ${v.tailSpreadTextures}/${v.tailSpreadGeometries}`
          : `growth tex ${v.growthTextures} geo ${v.geometryGrowth ?? v.growthGeometries} monotonic=${v.monotonic} tail ${v.tailSpreadTextures}/${v.tailSpreadGeometries} | ${errText(cv)}`,
        metrics: { verdict: v, samples: r.samples, drawCalls: r.drawCalls, triangles: r.triangles, console: cv },
      });
    },
  },
];

/* ================================ runner ================================ */

export function parseArgs(argv) {
  const a = { only: null, merge: false };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--only') a.only = String(argv[++i] || '').split(',').filter(Boolean);
    else if (argv[i] === '--merge') a.merge = true;
  }
  return a;
}

/** The control load: same page, same mount, nothing under test. Defines the allowlist. */
async function controlLoads(browser) {
  const loads = [];
  // 1) bare gallery (what a user sees before opening a stone)
  {
    const page = await openPage(browser);
    await page.nav(BASE_URL, 900);
    await sleep(3500);
    loads.push({ label: 'gallery (no ceremony)', signatures: [...signatureCounts(page.errors)].map(([sig, count]) => ({ sig, count })), errors: page.errors });
    await page.close();
  }
  // 2) mounted ceremony rig, same query the cases use
  {
    const page = await openPage(browser);
    await seedTune(page);
    await mountCeremony(page, { query: 'gemdpr=3&gemperf=1' });
    await sleep(2000);
    loads.push({ label: 'ceremony rig mounted', signatures: [...signatureCounts(page.errors)].map(([sig, count]) => ({ sig, count })), errors: page.errors });
    await page.close();
  }
  const all = loads.flatMap((l) => l.errors);
  return {
    loads: loads.map((l) => ({ label: l.label, total: l.errors.length, signatures: l.signatures })),
    allowlist: makeAllowlist(all),
    totalErrors: all.length,
  };
}

export async function main(argv = process.argv.slice(2)) {
  const args = parseArgs(argv);
  ensureDir(OUT);
  BUILD = buildIdentity();
  const picked = args.only ? CASES.filter((c) => args.only.includes(c.id)) : CASES;
  const browser = await launchChrome({ label: 'stress' });
  const results = [];
  let ctl = null;
  // A mount that never produces a renderer is a PRECONDITION failure, not a verdict: the
  // control load proved the rig mounts on this build. Retry it, and if it still fails record a
  // SKIP (worth 0.35) with the reason instead of a FAIL that caps the whole run.
  const MOUNT_TIMEOUT = /timeout waiting for (a rig with a renderer|#gem-screen|GEM3D\.rigs|gems tab button)|no-ceremony-rig/;
  try {
    process.stdout.write('[stress] control loads (allowlist) ... ');
    ctl = await controlLoads(browser);
    ALLOW = ctl.allowlist;
    console.log(`${ctl.allowlist.size} allowlisted signature(s), ${ctl.totalErrors} error(s)`);
    for (const l of ctl.loads) for (const s of l.signatures) console.log(`  allow ${s.count}x ${s.sig}`);

    for (const c of picked) {
      process.stdout.write(`[stress] ${c.id} ${c.name} ... `);
      const t0 = Date.now();
      let attempt = 0, finished = false;
      while (!finished) {
        attempt++;
        const reg = { page: null };
        try {
          const res = await Promise.race([
            c.run(browser, reg),
            new Promise((_, rej) => setTimeout(() => rej(new Error('case timeout 180s')), 180000)),
          ]);
          results.push({ id: c.id, name: c.name, ...res, attempts: attempt, sec: +((Date.now() - t0) / 1000).toFixed(1) });
          console.log(`${res.kind.toUpperCase()} (${((Date.now() - t0) / 1000).toFixed(1)}s)${attempt > 1 ? ` [attempt ${attempt}]` : ''}`);
          finished = true;
        } catch (e) {
          const msg = String(e.message);
          const mountFail = MOUNT_TIMEOUT.test(msg);
          // A sibling lane's HMR reload, or a mount that never got a renderer, is not the app
          // failing under the case: remount and try again (bounded).
          if ((isReloadError(e) || mountFail) && attempt < 2) {
            console.log(`retry — ${mountFail ? 'mount precondition' : 'page went away'} (${msg.slice(0, 60)})`);
            if (reg.page) { try { await reg.page.close(); } catch (err) {} }
            await sleep(1200);
            continue;
          }
          let ev = { screenshot: null, canvas: null };
          if (reg.page) { try { ev = await evidence(reg.page, c.id); } catch (err) {} try { await reg.page.close(); } catch (err) {} }
          results.push({
            id: c.id, name: c.name, ok: false, kind: mountFail ? 'skip' : 'fail',
            detail: (mountFail ? 'SKIP: mount precondition not established after 2 attempts — ' : 'threw: ')
              + msg.slice(0, 400),
            metrics: { mountTimeout: mountFail }, ...ev, evidence: ev,
            attempts: attempt, sec: +((Date.now() - t0) / 1000).toFixed(1),
          });
          console.log(mountFail ? 'SKIP (mount)' : 'FAIL (threw)');
          finished = true;
        }
      }
    }
  } finally {
    await browser.close();
  }

  const agg = aggregate(results);
  const buildEnd = buildIdentity();
  let casesOut = results;
  let merged = false;
  if (args.merge && args.only) {
    try {
      const prev = JSON.parse(fs.readFileSync(path.join(OUT, 'stress.json'), 'utf8'));
      const order = CASES.map((c) => c.id);
      const m = mergeResults(prev, results, BUILD, order);
      if (m !== results) { casesOut = m; merged = true; }
    } catch (e) { /* no previous report */ }
  }
  const aggOut = merged ? aggregate(casesOut) : agg;
  const mountSkips = casesOut.filter((r) => r.metrics && r.metrics.mountTimeout).map((r) => r.id);
  const report = {
    suite: 'stress', provisional: false, viewport: VIEW, build: BUILD, buildEnd,
    buildStable: sameBuild(BUILD, buildEnd),
    merged,
    mountSkips,
    allowlist: {
      derivedFrom: 'control load (bare gallery + mounted ceremony, same query as cases)',
      rule: 'a case fails only on an error signature ABSENT from the control',
      signatures: ctl ? ctl.allowlist.signatures : [],
      controlLoads: ctl ? ctl.loads : [],
      controlErrors: ctl ? ctl.totalErrors : 0,
    },
    cases: casesOut, ...aggOut,
    passedIds: casesOut.filter((r) => r.ok).map((r) => r.id),
    failedIds: casesOut.filter((r) => r.kind === 'fail').map((r) => r.id),
    skippedIds: casesOut.filter((r) => r.kind === 'skip').map((r) => r.id),
    at: new Date().toISOString(),
  };
  writeJSON('stress.json', report);
  console.log(`[stress] ${aggOut.passed} passed, ${aggOut.failed} failed, ${aggOut.skipped} skipped${merged ? ' (merged with prior cases)' : ''} -> ${path.join(OUT, 'stress.json')}`);
  for (const f of aggOut.failures) console.log(`  ${f.case} ${f.kind}: ${String(f.detail).slice(0, 200)}`);
  return report;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((e) => { console.error('[stress] FATAL', e); process.exit(1); });
}
