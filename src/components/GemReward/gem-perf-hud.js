/* ADAM/SHARED — src/components/GemReward/gem-perf-hud.js · ?gemperf=1 diagnostic panel (GPU vs CPU split) */
// — Why: a phone screenshot must say WHERE a frame goes — device/GPU/DPR, per-rig buffer@ratio+band, frame med/p95/hitch, main-thread js ms (tIn→rendered, measured)
// — against gpu~ = med − js (INFERRED — never measured), the shader path that actually compiled, and the controller's own state. Fixed bottom-left: the gem is centred, so it never covers its subject.
// — Contract: window.GEM_PERF_HUD = { frame(rig, st, m), rendered(rig) } · gem-perf.js calls frame() on entry to every tick, gem3d.js calls rendered() right after render().
// — The panel draws from its OWN rAF loop started at boot, sampling the page's real cadence — a rig that never ticks (nothing above the fold) must not starve it.
// — Inert (no global, no DOM, no rAF) unless ?gemperf=1 or #perf · tap → clipboard JSON · one reused ring, ≤4 DOM writes/s.
(function () {
const W = window, D = document, LO = W.location || {}, NA = W.navigator || {};
const ON = /[?&]gemperf=1/.test(String(LO.search || '')) || /#perf/.test(String(LO.hash || ''));
if (!ON) return;                                     // off: one property test per tick, nothing else exists
const N = 120, FR = new Float32Array(N), JS = new Float32Array(N), SR = new Float32Array(N), RS = [];
let iF = 0, nF = 0, iJ = 0, nJ = 0, at = 0, box = 0, tapAt = -1e9, cur = 0, txt = '', ml = 0, rg = 0, lt = 0;
let gpu = '', maxv = 0, ver = '', lgN = 0, lgT = 0, sm = 0, sp = 0, sw = 0, sk = 0, sj = 0, sg = 0, cmin = 1, cmax = 2;
const perf = function () { return performance.now(); }, num = function (v, d) { return typeof v === 'number' && isFinite(v) ? v : d; };
const f1 = function (v) { return (num(v, 0) > 0 ? v : 0).toFixed(1); };
const ua = String(NA.userAgent || ''), dm = ua.match(/iPhone|iPad|iPod|Android|Macintosh/);
const dv = ua.match(/OS (\d+)[_.](\d+)/) || ua.match(/Android (\d+)/) || [];
const dev = (dm ? dm[0].replace('Macintosh', 'Mac') : 'device') + (dm && dm[0] !== 'Macintosh' && dv[1] ? ' ' + dv[1] + (dv[2] ? '.' + dv[2] : '') : '');
const dpr = Math.round((W.devicePixelRatio || 1) * 100) / 100, sw0 = (W.screen && W.screen.width) || 0, sh0 = (W.screen && W.screen.height) || 0;
let ltOk = 0; try { if (W.PerformanceObserver && W.PerformanceObserver.supports && W.PerformanceObserver.supports('longtask')) { new W.PerformanceObserver(function (l) { const e = l.getEntries(); lgN += e.length; for (let i = 0; i < e.length; i++) lgT += e[i].duration || 0; }).observe({ entryTypes: ['longtask'] }); ltOk = 1; } } catch (e) { }
const rigs = function () { const r = W.GEM3D && W.GEM3D.rigs; return (r && r.length) ? r : (rg ? [rg] : 0); }, cfgo = function () { return (W.GEM_PERF && W.GEM_PERF.config) ? W.GEM_PERF.config() : 0; };
const q = function (src, n) { SR.set(src); if (!n) return SR.subarray(0, 0); const v = SR.subarray(0, n); v.sort(); return v; };
const pq = function (v, f) { return v.length ? v[Math.min(v.length - 1, Math.floor(v.length * f))] : 0; }, hit = function (a, n) { let c = 0; for (let i = 0; i < n; i++) if (a[i] > 50) c++; return c; };
const bl = function () { try { return W.GEM_BLOOM && W.GEM_BLOOM.on ? (W.GEM_BLOOM.on() ? 'on' : 'off') : '-'; } catch (e) { return '-'; } };
const pg = function () { const r = rigs(); for (let i = 0; r && i < r.length; i++) { const p = r[i] && r[i].renderer && r[i].renderer.info && r[i].renderer.info.programs; if (p && p.length !== undefined) return p.length; } return '-'; };
const md = function () { const F = W.GEM_FACETS; return F ? (F.choice === 'texture' ? 'pltex' : (F.choice || F.bake || '-')) : '-'; }, npl = function () { const F = W.GEM_FACETS; return F && F.planes ? F.planes.count : '-'; };
const sid = function (r) {
const c = r.canvas || {}, d = (c.dataset && c.dataset.gem) || 'gem'; let h = '';
try { const o = c.closest && (c.closest('[data-panel]') || c.closest('[data-gem-surface]')); h = o ? (o.dataset.panel || o.dataset.gemSurface || '') : ''; } catch (e) { }
if (!h && c.parentElement) h = String(c.parentElement.className || '').split(' ')[0].slice(0, 12);
return d + (h ? ':' + h : ''); };
// — probe: read the GPU off the LIVE context — a second context costs a device context and can evict the rig's own.
function probe() {
if (gpu) return 1; const r = rigs(); let g = 0;
if (r) for (let i = 0; i < r.length && !g; i++) try { if (r[i].renderer && r[i].renderer.getContext) g = r[i].renderer.getContext(); } catch (e) { }
if (!g) return 0;
try {
const x = g.getExtension('WEBGL_debug_renderer_info');
gpu = String((x && g.getParameter(x.UNMASKED_RENDERER_WEBGL)) || g.getParameter(g.RENDERER) || '?').replace(/\s+/g, ' ').slice(0, 44);
maxv = g.getParameter(g.MAX_FRAGMENT_UNIFORM_VECTORS) || 0, ver = (W.WebGL2RenderingContext && g instanceof W.WebGL2RenderingContext) ? 'webgl2' : 'webgl1';
} catch (e) { gpu = 'n/a'; }
return 1; }
function mk() {
if (box || !D || !D.body || !D.createElement) return box;
box = D.createElement('div');
box.style.cssText = 'position:fixed;left:8px;bottom:8px;z-index:2147483000;pointer-events:auto;font:11px/1.35 ui-monospace,SFMono-Regular,Menlo,monospace;white-space:pre-wrap;max-width:calc(100vw - 16px);box-sizing:border-box;background:rgba(0,0,0,.62);color:rgba(255,255,255,.96);padding:6px 8px;border-radius:6px;user-select:text;-webkit-user-select:text';
box.addEventListener('click', tap), D.body.appendChild(box);
return box; }
// — copy: promise-or-throw, both land on the same path; a refused clipboard selects the panel text instead of dying silently.
function done() { tapAt = perf(); draw(); }
function sel() { try { const g = D.createRange(); g.selectNodeContents(box); const s = W.getSelection && W.getSelection(); if (s) { s.removeAllRanges(); s.addRange(g); } } catch (e) { } done(); }
function tap() {
let p = 0;
try { p = NA.clipboard && NA.clipboard.writeText ? NA.clipboard.writeText(jsn()) : 0; } catch (e) { p = 0; }
if (p && typeof p.then === 'function') p.then(done, sel); else if (p) done(); else sel(); }
function jsn() {
const r = RS, out = [];
for (let i = 0; i < r.length; i++) out.push({ stone: r[i].stone, css: r[i].css, buf: r[i].buf, ratio: r[i].ratio, band: r[i].band });
return JSON.stringify({ at: new Date().toISOString(), ua: ua, url: String(LO.href || ''), vw: num(W.innerWidth, 0), vh: num(W.innerHeight, 0), dpr: dpr, screen: [sw0, sh0], cores: num(NA.hardwareConcurrency, 0), mem: num(NA.deviceMemory, 0), gpu: gpu, vec4: maxv, gl: ver, frame: { med: sm, p95: sp, worst: sw, fps: sm > 0 ? Math.round(1000 / sm) : 0, hitch: sk, n: nF }, js: sj, gpuInferred: sg, longtask: { n: lgN, s: lgT / 1000 }, bloom: bl(), planes: npl(), shader: md(), prog: pg(), min: cmin, ceil: cmax, steps: cur ? cur.steps | 0 : 0, est: cur ? num(cur.est, 0) : 0, fail: cur && cur.failAt < 1e8 ? cur.failAt : null, rigs: out }); }
function draw() {
try {
if (!box && !mk()) return;
const c = cfgo(), qf = q(FR, nF), r = rigs(), cf = c || {}; cmin = num(cf.min, 1); cmax = cf.max > 0 ? cf.max : Math.min(dpr, 2);
sm = nF ? pq(qf, 0.5) : num(ml, 0), sp = pq(qf, 0.95), sw = pq(qf, 1), sk = hit(FR, nF);
const qj = q(JS, nJ); sj = pq(qj, 0.5), sg = sm > sj ? sm - sj : 0;   // frame stats land BEFORE the js sort reuses SR
let s = 'GEM PERF ' + dev + ' dpr' + dpr + ' ' + sw0 + 'x' + sh0 + '\n' + (gpu || 'gpu ?') + ' vec4 ' + (maxv || '-') + ' ' + (ver || '-') + '\n', k = 0;
for (let i = 0; r && i < r.length && k < 2; i++) {
const g = r[i] || {};
if (!g.renderer || g.dead || !(g.vis || g.raf)) continue;
const el = g.renderer.domElement || {}, w = Math.round(g.w || 0), h = Math.round(g.h || 0);
const rt = num(W.GEM_PERF && W.GEM_PERF.pr ? W.GEM_PERF.pr(g) : 0, 0) || (w ? el.width / w : 0);   // pr() is the law; the buffer is the witness
s += sid(g) + ' ' + w + 'x' + h + ' -> ' + (el.width | 0) + 'x' + (el.height | 0) + ' @' + rt.toFixed(2) + ' [' + cmin.toFixed(1) + '-' + cmax.toFixed(1) + ']\n';
RS[k] = { stone: sid(g), css: [w, h], buf: [el.width | 0, el.height | 0], ratio: Math.round(rt * 100) / 100, band: [cmin, cmax] }, k++; }
RS.length = k; if (!k) s += 'no live rig\n';
s += 'med ' + f1(sm) + ' p95 ' + f1(sp) + ' fps ' + (sm > 0 ? Math.round(1000 / sm) : 0) + ' worst ' + f1(sw) + ' hitch ' + sk + '\n';
s += 'js ' + f1(sj) + ' long ' + (ltOk ? lgN + '/' + f1(lgT / 1000) + 's' : 'n/a') + ' gpu~ ' + f1(sg) + ' inferred\n';   // longtask: no entry type on iOS → n/a, never a fake 0
s += 'bloom ' + bl() + ' planes ' + npl() + ' ' + md() + ' prog ' + pg() + '\n';
s += 'steps ' + (cur ? cur.steps | 0 : 0) + ' est ' + f1(cur ? cur.est : 0) + ' fail ' + (cur && cur.failAt < 1e8 ? f1(cur.failAt) : 'none') + ' ceil ' + f1(cmax) + ' min ' + f1(cmin) + '\n';
s += (perf() - tapAt < 1500 ? 'copied' : 'tap to copy');
if (s !== txt) { txt = s; box.textContent = s; }   // one DOM write, only when the text moved
} catch (e) { } }
function frame(rig, st, m) { try { if (!rig) return; cur = st || rig.gp || 0, ml = num(m, 0), rg = rig; } catch (e) { } }   // record only — the clock is below; sampling here double-counts
// — clock: the HUD's OWN rAF, sampling the page's real cadence into FR and enforcing the 250 ms draw cadence — no rig has to tick for it to draw (rAF pauses when hidden).
function loop() {
const t = perf(), gap = t - (lt || t); lt = t; if (gap > 0 && gap < 600) { FR[iF] = gap; iF = (iF + 1) % N; if (nF < N) nF++; }
if (t - at >= 250) { at = t; probe(); draw(); }
W.requestAnimationFrame(loop); }
function rendered(rig) {
try {
const st = rig && rig.gp, t = st && st.tIn;
if (!(t > 0)) return;                                // no tick stamped this frame — nothing to measure
st.tIn = 0;                                          // consumed: one sample per render, never a doubled frame
const d = perf() - t;
JS[iJ] = d > 0 ? d : 0, iJ = (iJ + 1) % N, nJ = nJ < N ? nJ + 1 : nJ;
} catch (e) { } }
W.GEM_PERF_HUD = { frame: frame, rendered: rendered };
mk(); draw();                                        // panel exists at BOOT — zero rigs still get device, gpu ?, frame stats, config
W.requestAnimationFrame(loop);                       // ...and from here the HUD owns its own clock, rig or no rig
})();
