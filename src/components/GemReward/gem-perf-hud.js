/* ADAM/SHARED — src/components/GemReward/gem-perf-hud.js · diagnostic panel behind ?gemperf=1 · fullscreen gem only · #perf · a stored key · the METRICS button in the fullscreen gem */
// — Why: a phone screenshot must say WHERE a frame goes — device/GPU/DPR, per-rig buffer@ratio+band, frame med/p95/hitch, main-thread js ms (tIn→rendered, measured) against gpu~ = med − js (INFERRED, never measured), the shader path that compiled, and the controller's state. Fixed bottom-left: the gem is centred, so it never covers its subject.
// — Contract: window.GEM_PERF_HUD = { frame(rig, st, m), rendered(rig) } · gem-perf.js calls frame() on entry to every tick, gem3d.js calls rendered() right after render().
// — Sources: ?gemperf=1 (persisted to localStorage 'gemperf'), #perf, a stored key, or the metrics button inside #gem-screen. ?gemperf=0 clears the key. Inert when off: one key read and one capture click listener — no DOM, no rAF, no arrays, no global.
(function () {
const W = window, D = document, LO = W.location || {}, NA = W.navigator || {}, KEY = 'gemperf';
const SEARCH = String(LO.search || ''), HASH = String(LO.hash || ''), ua = String(NA.userAgent || ''), perf = function () { return performance.now(); };
const num = function (v, d) { return typeof v === 'number' && isFinite(v) ? v : d; }, f1 = function (v) { return (num(v, 0) > 0 ? v : 0).toFixed(1); };
const store = function (v) { try { if (v) W.localStorage.setItem(KEY, '1'); else W.localStorage.removeItem(KEY); } catch (e) { } }, getk = function () { try { return W.localStorage.getItem(KEY) === '1'; } catch (e) { return false; } };
const Q_ON = /[?&]gemperf=1(&|$)/.test(SEARCH), Q_OFF = /[?&]gemperf=0(&|$)/.test(SEARCH); if (Q_ON) store(1); else if (Q_OFF) store(0);   // the URL can carry it once; ?gemperf=0 is an explicit off, not merely an absent one
let ON = !Q_OFF && (Q_ON || /#perf/.test(HASH) || getk()), box = 0, loopId = 0, fsk = 0, lob = 0;
let N = 120, FR = 0, JS = 0, SR = 0, RS = [], iF = 0, nF = 0, iJ = 0, nJ = 0, at = 0, tapAt = -1e9, cur = 0, txt = '', ml = 0, rg = 0, lt = 0;
let gpu = '', maxv = 0, ver = '', lgN = 0, lgT = 0, ltOk = 0, sm = 0, sp = 0, sw = 0, sk = 0, sj = 0, sg = 0, cmin = 1, cmax = 2;
const dm = ua.match(/iPhone|iPad|iPod|Android|Macintosh/), dv = ua.match(/OS (\d+)[_.](\d+)/) || ua.match(/Android (\d+)/) || [];
const dev = (dm ? dm[0].replace('Macintosh', 'Mac') : 'device') + (dm && dm[0] !== 'Macintosh' && dv[1] ? ' ' + dv[1] + (dv[2] ? '.' + dv[2] : '') : '');
const dpr = Math.round((W.devicePixelRatio || 1) * 100) / 100, sw0 = (W.screen && W.screen.width) || 0, sh0 = (W.screen && W.screen.height) || 0;
const rigs = function () { const r = W.GEM3D && W.GEM3D.rigs; return (r && r.length) ? r : (rg ? [rg] : 0); }, cfgo = function () { return (W.GEM_PERF && W.GEM_PERF.config) ? W.GEM_PERF.config() : 0; };
const q = function (src, n) { SR.set(src); if (!n) return SR.subarray(0, 0); const v = SR.subarray(0, n); v.sort(); return v; };
const pq = function (v, f) { return v.length ? v[Math.min(v.length - 1, Math.floor(v.length * f))] : 0; }, hit = function (a, n) { let c = 0; for (let i = 0; i < n; i++) if (a[i] > 50) c++; return c; };
const bl = function () { try { return W.GEM_BLOOM && W.GEM_BLOOM.on ? (W.GEM_BLOOM.on() ? 'on' : 'off') : '-'; } catch (e) { return '-'; } };
const pg = function () { const r = rigs(); for (let i = 0; r && i < r.length; i++) { const p = r[i] && r[i].renderer && r[i].renderer.info && r[i].renderer.info.programs; if (p && p.length !== undefined) return p.length; } return '-'; };
const md = function () { const F = W.GEM_FACETS; return F ? (F.choice === 'texture' ? 'pltex' : (F.choice || F.bake || '-')) : '-'; }, npl = function () { const F = W.GEM_FACETS; return F && F.planes ? F.planes.count : '-'; };
const sid = function (r) { const c = r.canvas || {}, d = (c.dataset && c.dataset.gem) || 'gem'; let h = '';
try { const o = c.closest && (c.closest('[data-panel]') || c.closest('[data-gem-surface]')); h = o ? (o.dataset.panel || o.dataset.gemSurface || '') : ''; } catch (e) { }
if (!h && c.parentElement) h = String(c.parentElement.className || '').split(' ')[0].slice(0, 12); return d + (h ? ':' + h : ''); };
// — probe: read the GPU off the LIVE context — a second context costs a device context and can evict the rig's own.
function probe() { if (gpu) return 1; const r = rigs(); let g = 0;
if (r) for (let i = 0; i < r.length && !g; i++) try { if (r[i].renderer && r[i].renderer.getContext) g = r[i].renderer.getContext(); } catch (e) { } if (!g) return 0;
try { const x = g.getExtension('WEBGL_debug_renderer_info'); gpu = String((x && g.getParameter(x.UNMASKED_RENDERER_WEBGL)) || g.getParameter(g.RENDERER) || '?').replace(/\s+/g, ' ').slice(0, 44);
maxv = g.getParameter(g.MAX_FRAGMENT_UNIFORM_VECTORS) || 0, ver = (W.WebGL2RenderingContext && g instanceof W.WebGL2RenderingContext) ? 'webgl2' : 'webgl1'; } catch (e) { gpu = 'n/a'; }
return 1; }
// — mount: panel lives only while a fullscreen gem covers the viewport (#gem-screen.overlay--open, #reward-sheet.is-gem-in); no surface = no gate.
function sf() { try { const g = D.getElementById('gem-screen'), r = D.getElementById('reward-sheet'); if (!g && !r) return 1; if (g && !g.hidden && g.classList.contains('overlay--open')) return g; if (r && !r.hidden && r.classList.contains('is-gem-in')) return r; return 0; } catch (e) { return 0; } }
function fsc() { try { const p = D.fullscreenElement || D.body; if (box && p && box.parentNode !== p) p.appendChild(box); } catch (e) { } }
function mk() { if (box || !D || !D.body || !D.createElement) return box; const p = D.fullscreenElement || D.body;
box = D.createElement('div');
box.style.cssText = 'position:fixed;left:8px;bottom:8px;z-index:2147483647;pointer-events:auto;font:11px/1.35 ui-monospace,SFMono-Regular,Menlo,monospace;white-space:pre-wrap;max-width:calc(100vw - 16px);box-sizing:border-box;background:rgba(0,0,0,.62);color:rgba(255,255,255,.96);padding:6px 8px;border-radius:6px;user-select:text;-webkit-user-select:text';
box.addEventListener('click', tap); p.appendChild(box); return box; }
// — copy: promise-or-throw, both land on the same path; a refused clipboard selects the panel text instead of dying silently.
function done() { tapAt = perf(); draw(); }
function sel() { try { const g = D.createRange(); g.selectNodeContents(box); const s = W.getSelection && W.getSelection(); if (s) { s.removeAllRanges(); s.addRange(g); } } catch (e) { } done(); }
function tap() { let p = 0;
try { p = NA.clipboard && NA.clipboard.writeText ? NA.clipboard.writeText(jsn()) : 0; } catch (e) { p = 0; }
if (p && typeof p.then === 'function') p.then(done, sel); else if (p) done(); else sel(); }
function jsn() { const r = RS, out = [];
for (let i = 0; i < r.length; i++) out.push({ stone: r[i].stone, css: r[i].css, buf: r[i].buf, ratio: r[i].ratio, band: r[i].band });
return JSON.stringify({ at: new Date().toISOString(), ua: ua, url: String(LO.href || ''), vw: num(W.innerWidth, 0), vh: num(W.innerHeight, 0), dpr: dpr, screen: [sw0, sh0], cores: num(NA.hardwareConcurrency, 0), mem: num(NA.deviceMemory, 0), gpu: gpu, vec4: maxv, gl: ver, frame: { med: sm, p95: sp, worst: sw, fps: sm > 0 ? Math.round(1000 / sm) : 0, hitch: sk, n: nF }, js: sj, gpuInferred: sg, longtask: { n: lgN, s: lgT / 1000 }, bloom: bl(), planes: npl(), shader: md(), prog: pg(), min: cmin, ceil: cmax, steps: cur ? cur.steps | 0 : 0, est: cur ? num(cur.est, 0) : 0, fail: cur && cur.failAt < 1e8 ? cur.failAt : null, rigs: out }); }
function draw() { try {
if (!box && !mk()) return; const sfx = sf(); if (!sfx) { box.style.display = 'none'; return; } box.style.display = ''; if (sfx !== 1 && box.parentNode !== sfx) sfx.appendChild(box); else fsc();
const c = cfgo(), qf = q(FR, nF), r = rigs(), cf = c || {}; cmin = num(cf.min, 1); cmax = cf.max > 0 ? cf.max : Math.min(dpr, 2);
sm = nF ? pq(qf, 0.5) : num(ml, 0), sp = pq(qf, 0.95), sw = pq(qf, 1), sk = hit(FR, nF); const qj = q(JS, nJ); sj = pq(qj, 0.5), sg = sm > sj ? sm - sj : 0;   // frame stats land BEFORE the js sort reuses SR
let s = 'GEM PERF ' + dev + ' dpr' + dpr + ' ' + sw0 + 'x' + sh0 + '\n' + (gpu || 'gpu ?') + ' vec4 ' + (maxv || '-') + ' ' + (ver || '-') + '\n', k = 0;
for (let i = 0; r && i < r.length && k < 2; i++) { const g = r[i] || {};
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
function loop() { if (!ON) return;                     // belt and braces: a cancelled id must never leave a second loop alive
const t = perf(), gap = t - (lt || t); lt = t; if (gap > 0 && gap < 600) { FR[iF] = gap; iF = (iF + 1) % N; if (nF < N) nF++; }
if (t - at >= 250) { at = t; probe(); draw(); }
loopId = W.requestAnimationFrame(loop); }
function rendered(rig) { try {
const st = rig && rig.gp, t = st && st.tIn;
if (!(t > 0)) return;                                // no tick stamped this frame — nothing to measure
st.tIn = 0; const d = perf() - t;                    // consumed: one sample per render, never a doubled frame
JS[iJ] = d > 0 ? d : 0, iJ = (iJ + 1) % N, nJ = nJ < N ? nJ + 1 : nJ;
} catch (e) { } }
// — start/stop: every allocation the panel needs is built here, so "off" is genuinely inert and "on again" needs no reload.
function start() { FR = new Float32Array(N), JS = new Float32Array(N), SR = new Float32Array(N), RS = [], iF = 0, nF = 0, iJ = 0, nJ = 0, at = 0, tapAt = -1e9, txt = '', lt = 0, gpu = '', maxv = 0, ver = '', sm = 0, sp = 0, sw = 0, sk = 0, sj = 0, sg = 0; ON = 1;
if (!lob) { try { if (W.PerformanceObserver && W.PerformanceObserver.supports && W.PerformanceObserver.supports('longtask')) { new W.PerformanceObserver(function (l) { const e = l.getEntries(); lgN += e.length; for (let i = 0; i < e.length; i++) lgT += e[i].duration || 0; }).observe({ entryTypes: ['longtask'] }); ltOk = 1; } } catch (e) { } lob = 1; }
W.GEM_PERF_HUD = { frame: frame, rendered: rendered }; D.addEventListener('fullscreenchange', fsc); fsk = 1;
mk(); draw(); loopId = W.requestAnimationFrame(loop); }   // panel exists at START, and the HUD owns its own clock from here — rig or no rig
function stop() { ON = 0; store(0);                   // the key goes too, or the next navigation resurrects the panel
if (loopId) { try { W.cancelAnimationFrame(loopId); } catch (e) { } loopId = 0; }
if (fsk) { try { D.removeEventListener('fullscreenchange', fsc); } catch (e) { } fsk = 0; }
try { if (box && box.parentNode) box.parentNode.removeChild(box); } catch (e) { } box = 0; txt = ''; FR = 0, JS = 0, SR = 0, RS = []; W.GEM_PERF_HUD = null; }
// — button: the fullscreen gem is where the number actually matters, so it carries its own toggle — no query string to type, no hidden gesture to learn.
function btn() { try { const ov = D.getElementById('gem-screen');
if (!ov || !ov.classList.contains('overlay--open') || ov.querySelector('.gem-perf-btn')) return;
const b = D.createElement('button'); b.type = 'button', b.className = 'gem-perf-btn', b.textContent = 'metrics';
b.style.cssText = 'position:absolute;top:10px;right:10px;z-index:2147483647;font:600 11px/1 ui-monospace,SFMono-Regular,Menlo,monospace;letter-spacing:.06em;padding:8px 11px;border-radius:99px;border:1px solid rgba(255,255,255,.42);background:rgba(0,0,0,.58);color:white;cursor:pointer;-webkit-tap-highlight-color:transparent';
b.addEventListener('click', function (e) { if (e && e.stopPropagation) e.stopPropagation(); const off = !ON; if (ON) stop(); else { store(1); start(); } if (off) setTimeout(function () { const o = D.getElementById('gem-screen'); if (o) o.appendChild(b); }, 30); });
ov.appendChild(b);
} catch (e) { } }
D.addEventListener('click', function (e) { const t = e && e.target; if (t && t.closest && t.closest('[data-overlay-target="gem-screen"]')) setTimeout(btn, 60); }, true);
if (W.MutationObserver && D.documentElement) new W.MutationObserver(function (m) { for (let i = 0; i < m.length; i++) { const t = m[i].target; if (t && (t.id === 'gem-screen' || t.id === 'reward-sheet')) { if (ON) draw(); else btn(); return; } } }).observe(D.documentElement, { attributes: true, attributeFilter: ['class', 'hidden', 'style'], subtree: true });
if (ON) { start(); btn(); }                                     // URL, hash, or a stored key — the button covers the phone
})();
