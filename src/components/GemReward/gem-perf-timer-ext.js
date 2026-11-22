/* ADAM/SHARED — src/components/GemReward/gem-perf-timer-ext.js · ?gemtimer=1 GPU pass timer (E5 device falsification probe) */
// — Why: E5 needs per-pass GPU ms off a phone with no devtools. Headless rAF is quantised (16.7/33.3/66.7 ms), so the only honest frame number
// — is EXT_disjoint_timer_query_webgl2, inserted at the render-target boundaries the bloom wrapper already crosses: `gem` (scene → full-res
// — target), `bloom` (gaussian → half/quarter target), `comp` (composite → canvas). The stone is ONE shader pass, so entry-vs-trace is
// — NOT separable — the whole gem pass is reported, never a split that does not exist.
// — gem-perf.js arms this ONLY on ?gemtimer=1 and only if the object exists: absent the param nothing here runs (no DOM, no rAF, no context
// — call). Probe-only knobs ?gemtaps=1..3 ?gembounce=1..5 ?gembloom=0|1 change the frame on purpose, nothing else.
// — Fallback: no timer extension → mode 'raf', passes n/a, HUD says rAF in words (never relabelled as timer data). Export: GEM_PERF_TIMER_EXT.arm(P) ·
// — GEM_TIMER {json,state,reset} · #gem-timer-hud · #gem-timer-copy · 240-sample rings per pass.
(function () {const W = window, D = document, NA = W.navigator || {}, QS = String((W.location && W.location.search) || '');
const param = function (k) { const m = QS.match(new RegExp('[?&]' + k + '=([^&]*)')); return m ? m[1] : ''; };
const num = function (v, d) { const n = parseFloat(v); return isFinite(n) ? n : d; }, f2 = function (v) { return num(v, 0).toFixed(2); };
const TAPS = Math.round(num(param('gemtaps'), 0)), BNC = Math.round(num(param('gembounce'), 0)), BLM = param('gembloom'), N = 240, CUT = 500;   // ring size · a frame gap above CUT is a hidden tab, not a frame
let armed = 0, P = 0, rig = 0, R = 0, RACT = 0, gl = 0, ext = 0, extN = '', is2 = 0, gpu = '', ven = '', mode = 'raf', why = '', pn = 0;
let box = 0, pre = 0, cb = 0, txt = '', open = 0, segN = 0, cur = 0, PENDT = 0, frames = 0, disjN = 0, at = 0, lt = 0, t0 = 0;
const pend = [], pool = [], S = {}, G = [];
const slot = function (n) { let s = S[n]; if (!s) { s = S[n] = { b: new Float32Array(N), i: 0, n: 0 }; G.push(n); } return s; };
const push = function (n, v) { const s = slot(n); s.b[s.i] = v; s.i = (s.i + 1) % N; if (s.n < N) s.n++; };
const pct = function (s, f) { if (!s || !s.n) return 0; const a = Array.prototype.slice.call(s.b, 0, s.n).sort(function (x, y) { return x - y; }); return a[Math.min(a.length - 1, Math.floor(a.length * f))]; };
const qget = function () { return pn ? pool[--pn] : (is2 ? gl.createQuery() : ext.createQueryEXT()); }, qput = function (q) { if (pn < 64) pool[pn++] = q; };
const dead = function (e) { ext = 0; cur = 0; pend.length = 0; mode = 'raf'; extN = ''; why = 'timer query threw (' + String((e && e.message) || e) + ') → rAF only'; };
const qend = function () { if (!cur) return; const c = cur; cur = 0; try { if (is2) gl.endQuery(ext.TIME_ELAPSED_EXT); else ext.endQueryEXT(ext.TIME_ELAPSED_EXT); pend.push(c); } catch (e) { dead(e); } };
const qbeg = function (n) { if (!ext) return; if (cur) qend(); if (!ext) return; try { const q = qget(); if (is2) gl.beginQuery(ext.TIME_ELAPSED_EXT, q); else ext.beginQueryEXT(ext.TIME_ELAPSED_EXT, q); cur = { q: q, n: n }; } catch (e) { dead(e); } };
// — resolve: read the disjoint flag FIRST (the read is what clears it); a disjoint sweep drops its results, it never averages them.
function resolve() { if (!ext || !gl) return;
if (gl.getParameter(ext.GPU_DISJOINT_EXT)) { disjN += pend.length; for (let i = 0; i < pend.length; i++) qput(pend[i].q); pend.length = 0; return; }
let k = 0; while (k < pend.length) {
const it = pend[k], av = is2 ? gl.getQueryParameter(it.q, gl.QUERY_RESULT_AVAILABLE) : ext.getQueryParameterEXT(it.q, ext.QUERY_RESULT_AVAILABLE);
if (!av) { k++; continue; }
const v = is2 ? gl.getQueryParameter(it.q, gl.QUERY_RESULT) : ext.getQueryParameterEXT(it.q, ext.QUERY_RESULT);
pend.splice(k, 1); qput(it.q); push(it.n, v / 1e6);
}
if (pend.length > 96) { for (let i = 0; i < pend.length; i++) qput(pend[i].q); pend.length = 0; if (frames > 24 && !(S.gem && S.gem.n)) dead({ message: 'results never became available' }); }   // stalled driver: drop, then degrade to rAF honestly
}
const atScreen = function (q) { return !!(q && q.canvas && q.canvas.closest && q.canvas.closest('#gem-screen')); }, tagOf = function (t) { if (!t) return 'comp'; const w = t.width | 0, h = t.height | 0, cw = R.domElement.width, ch = R.domElement.height; return w === cw && h === ch ? 'gem' : (w < cw || h < ch ? 'bloom' : 'pass' + (++segN)); };
// — wrap: OUTERMOST render (bloom's wrapper must already be in place, else its three passes collapse into one). No DOM work here.
function wrap() { if (!R) return 0;
if (R.__gemTimer) { R.__gemTimerOff = 0; RACT = R; return 1; }   // re-targeted back to a renderer we already wrapped: re-arm it
R.__gemTimer = 1; R.__gemTimerOff = 0; RACT = R; const orig = R.render, ort = R.setRenderTarget, orb = R.renderBufferDirect;
R.setRenderTarget = function (t) { if (open && R === RACT) { qend(); PENDT = tagOf(t); } return ort.apply(R, arguments); };
R.renderBufferDirect = function () { if (open && R === RACT && !cur && PENDT) { qbeg(PENDT); PENDT = 0; } return orb.apply(R, arguments); };   // the query opens at the FIRST draw: pre-draw JS is not GPU time
R.render = function (sc, cm) {
if (R !== RACT || open || !ext || R.__gemTimerOff) return orig.call(R, sc, cm);   // not the active rig, nested call, or dead timer: straight through
open = 1; segN = 0; frames++;
try { try { resolve(); } catch (e) { dead(e); } PENDT = 'gem'; return orig.call(R, sc, cm); } finally { try { qend(); } catch (e) { } cur = 0; PENDT = 0; open = 0; }   // no RT switch → the whole render IS the gem pass
}; return 1;
}
const knob = function () { try {
const O = W.GEM_OPTICS;
if ((TAPS || BNC) && O && O.set && O.dump) { const d = O.dump(); Object.keys(d).forEach(function (n) { O.set(n, { fire: { taps: TAPS ? Math.max(1, Math.min(3, TAPS)) : 3 }, reflect: { bounce: BNC ? Math.max(1, Math.min(5, BNC)) : 5 } }); }); if (O.apply) O.apply(); }
if (BLM !== '') { const B = W.GEM_BLOOM; if (B && B.set) B.set(!(BLM === '0' || BLM === 'false')); }
} catch (e) { } };
function attach() { const L = (W.GEM3D && W.GEM3D.rigs) || []; let best = 0;
for (let i = 0; i < L.length; i++) { const q = L[i]; if (!q || !q.renderer || q.dead || q.gone) continue;
if (q.canvas.closest && q.canvas.closest('#gem-screen')) { best = q; break; }
if (!best && q.w > 1) best = q; }
if (best && best === rig && R && RACT === R && !best.gone) return 1;   // same rig, already live
if (rig && R && !rig.gone && atScreen(rig) && !atScreen(best)) return 1;   // never trade the ceremony rig for a card
if (!best) return 0; if (R) R.__gemTimerOff = 1; RACT = 0;                                 // a retired rig must stop feeding the rings (card → ceremony)
rig = best; R = 0; gl = 0; ext = 0; gpu = ''; ven = ''; extN = ''; mode = 'raf'; why = '';
R = best.renderer; gl = R.getContext(); if (!gl) return 0;
is2 = !!(W.WebGL2RenderingContext && gl instanceof W.WebGL2RenderingContext);
ext = gl.getExtension('EXT_disjoint_timer_query_webgl2') || gl.getExtension('EXT_disjoint_timer_query') || 0;
extN = ext ? (is2 ? 'EXT_disjoint_timer_query_webgl2' : 'EXT_disjoint_timer_query') : ''; mode = ext ? 'gpu' : 'raf'; why = ext ? '' : 'no timer-query extension → rAF frame ms only; per-pass GPU ms unavailable';
try { const x = gl.getExtension('WEBGL_debug_renderer_info'); gpu = String((x && gl.getParameter(x.UNMASKED_RENDERER_WEBGL)) || gl.getParameter(gl.RENDERER) || '?').replace(/\s+/g, ' '); ven = String((x && gl.getParameter(x.UNMASKED_VENDOR_WEBGL)) || gl.getParameter(gl.VENDOR) || '?').replace(/\s+/g, ' '); } catch (e) { gpu = gpu || 'n/a'; }
if (W.GEM_BLOOM && !R.__gemBloom && performance.now() - t0 < 3000) return 0;   // wait for the bloom wrapper: we must stay outermost
knob(); return wrap();
}
const live = function (k) { if (!rig || !rig.mats) return null; for (let i = 0; i < rig.mats.length; i++) { const u = rig.mats[i] && rig.mats[i].uniforms; if (u && u[k]) return u[k].value; } return null; }, bl = function () { try { return W.GEM_BLOOM && W.GEM_BLOOM.on ? (W.GEM_BLOOM.on() ? 'on' : 'off') : '-'; } catch (e) { return '-'; } }, ps = function (n) { const s = S[n]; return { p50: +f2(pct(s, 0.5)), p95: +f2(pct(s, 0.95)), n: s ? s.n : 0 }; }, row = function (n) { const s = S[n]; return s && s.n ? f2(pct(s, 0.5)) + ' / ' + f2(pct(s, 0.95)) + ' ms n' + s.n : 'n/a'; };
function json() { const f = S.frame, el = R ? R.domElement : 0;
return { probe: 'gemtimer/1', at: new Date().toISOString(), url: String(W.location.href || ''), ua: String(NA.userAgent || ''), gl: { renderer: gpu, vendor: ven, api: is2 ? 'webgl2' : 'webgl1', timerExt: extN || null },
canvas: { w: el ? el.width | 0 : 0, h: el ? el.height | 0 : 0, css: rig ? [Math.round(rig.w || 0), Math.round(rig.h || 0)] : null, ratio: R ? Math.round(R.getPixelRatio() * 100) / 100 : 0 },
dpr: Math.round((W.devicePixelRatio || 1) * 100) / 100, taps: live('uTaps'), bounce: live('uBounce'), bloom: bl(),
programs: R && R.info && R.info.programs ? R.info.programs.length : -1, calls: R && R.info ? R.info.render.calls : -1, triangles: R && R.info ? R.info.render.triangles : -1,
timer: { mode: mode, note: why, disjoint: disjN > 0, dropped: disjN, frames: frames, passes: { gem: ps('gem'), bloom: ps('bloom'), comp: ps('comp') } },
frame: { p50: +f2(pct(f, 0.5)), p95: +f2(pct(f, 0.95)), n: f ? f.n : 0, src: 'raf' } }; }
function draw() { try { if (!box && !mk()) return; const j = json(), el = j.canvas, L = [];
L.push('GEM TIMER · ' + (ext ? 'gpu timer' : 'rAF FALLBACK — NOT gpu timer') + ' · disjoint ' + (disjN ? 'YES ' + disjN : '0'));
L.push(gpu || 'gpu ?'); L.push((ven || '-') + ' · ' + (is2 ? 'webgl2' : 'webgl1'));
L.push(el.w + 'x' + el.h + ' @' + f2(el.ratio) + ' · css ' + (el.css ? el.css[0] + 'x' + el.css[1] : '-') + ' · dpr ' + j.dpr + ' · taps ' + j.taps + ' bounce ' + j.bounce + ' bloom ' + j.bloom + ' prog ' + j.programs);
if (ext) { L.push('gem   ' + row('gem')); L.push('bloom ' + row('bloom')); L.push('comp  ' + row('comp')); } else L.push('passes n/a (no timer query)');
L.push('frame ' + row('frame') + ' rAF'); L.push('copy JSON' + (ext ? ' · ' + frames + ' timed frames' : ''));
const s = L.join('\n'); if (s !== txt) { txt = s; pre.textContent = s; } } catch (e) { } }
function mk() { if (box || !D.body) return box; box = D.createElement('div'); box.id = 'gem-timer-hud';
box.style.cssText = 'position:fixed;right:8px;bottom:8px;z-index:2147483647;font:11px/1.35 ui-monospace,SFMono-Regular,Menlo,monospace;white-space:pre-wrap;max-width:92vw;box-sizing:border-box;background:rgba(0,0,0,.66);color:rgba(255,255,255,.96);padding:6px 8px 8px;border-radius:6px;user-select:text;-webkit-user-select:text';
pre = D.createElement('div'); cb = D.createElement('button'); cb.type = 'button'; cb.id = 'gem-timer-copy'; cb.textContent = 'copy JSON';
cb.style.cssText = 'margin-top:6px;font:600 11px/1 ui-monospace,SFMono-Regular,Menlo,monospace;padding:8px 11px;border-radius:99px;border:1px solid rgba(255,255,255,.42);background:rgba(255,255,255,.14);color:rgba(255,255,255,.96);cursor:pointer;-webkit-tap-highlight-color:transparent';
cb.addEventListener('click', function (e) { if (e && e.stopPropagation) e.stopPropagation(); copy(); });
box.appendChild(pre); box.appendChild(cb); D.body.appendChild(box); return box; }
function sel() { try { const g = D.createRange(); g.selectNodeContents(pre); const s = W.getSelection && W.getSelection(); if (s) { s.removeAllRanges(); s.addRange(g); } } catch (e) { } }
function copy() { let p = 0; try { p = NA.clipboard && NA.clipboard.writeText ? NA.clipboard.writeText(JSON.stringify(json())) : 0; } catch (e) { p = 0; }
const ok = function () { cb.textContent = 'copied'; setTimeout(function () { cb.textContent = 'copy JSON'; }, 1200); }; if (p && typeof p.then === 'function') p.then(ok, sel); else if (p) ok(); else sel(); }
function loop() { if (!armed) return;
const t = performance.now(), g = t - (lt || t); lt = t; if (g > 0.5 && g < CUT) push('frame', g);
if (t - at >= 250) { at = t; attach(); draw(); } W.requestAnimationFrame(loop); }
function arm(perf) { if (armed || param('gemtimer') !== '1') return 0; armed = 1; P = perf || W.GEM_PERF; t0 = performance.now(); knob(); mk(); W.GEM_TIMER = { json: json, state: function () { return { mode: mode, ext: extN || null, gpu: gpu, vendor: ven, frames: frames, disjoint: disjN > 0, dropped: disjN, attached: !!R, hud: !!box }; },
reset: function () { for (let i = 0; i < G.length; i++) { const s = S[G[i]]; s.i = 0; s.n = 0; } pend.length = 0; disjN = 0; } };   // rings only — frames is a liveness counter
W.requestAnimationFrame(loop); return 1; }
W.GEM_PERF_TIMER_EXT = { arm: arm }; })();
