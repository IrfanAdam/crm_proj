/* ADAM/SHARED — src/components/GemReward/gem-perf-tune.js · quality tuning sheet for the fullscreen gem */
// [plan:2026-10-03_144222-gem-realism-round2.md#phase-18] · Task 62 — four cost knobs, every row carrying the live med/fps.
// — Phone-only: a coarse pointer or a viewport under 700 px shows the tune pill; ?gemquality=full hides it on a phone, ?gemquality=tuned on desktop.
// — Optics and bloom apply on every input; GEM_PERF.set + the gemTune write are debounced 120 ms and flushed on change, so a drag
// — reallocates the buffer once, not per event. Inert on any page without #gem-screen — no pill, no timer.
// — Export map: window.GEM_PERF_TUNE { open, close, value, json } · sheet markup/JSON in gem-perf-tune-ext.js (load that first).
(function () {
const W = window, D = document, LS = 'gemTune', QS = String((W.location && W.location.search) || '');
const num = function (v, d) { const n = parseFloat(v); return isFinite(n) ? n : d; }, cl = function (v, a, b) { return Math.max(a, Math.min(b, v)); };
const qv = function (k) { const m = QS.match(new RegExp('[?&]' + k + '=([^&]*)')); return m ? m[1] : ''; };
const QUAL = qv('gemquality'), URLDPR = num(qv('gemdpr'), 0);
const GATE = QUAL === 'tuned' || (QUAL !== 'full' && ((W.matchMedia && W.matchMedia('(pointer:coarse)').matches) || W.innerWidth < 700));
const S = { taps: 3, bounce: 5, bloomOn: true, bloomIntensity: 0.32, dpr: 0 }, K = { taps: [1, 3], bounce: [1, 5], amt: [0, 0.5], dpr: [1, 2] };
let btn = 0, sheet = 0, head = 0, iv = 0, pend = 0, rows = [], dirty = 0, lastDpr = -1;
const X = function () { return W.GEM_PERF_TUNE_EXT || 0; }, store = function () { try { W.localStorage.setItem(LS, JSON.stringify(S)); } catch (e) { } };
const stop = function (e) { if (e && e.stopPropagation) e.stopPropagation(); };
function load() {
let o = 0;
try { o = JSON.parse((W.localStorage && W.localStorage.getItem(LS)) || 'null'); } catch (e) { o = 0; }
if (!o) return 0;
S.taps = Math.round(cl(num(o.taps, 3), 1, 3)); S.bounce = Math.round(cl(num(o.bounce, 5), 1, 5)); S.bloomOn = o.bloomOn !== false;
S.bloomIntensity = cl(num(o.bloomIntensity, 0.32), 0, 0.5); S.dpr = cl(num(o.dpr, 0), 0, 2); return 1; }
function persist() {
if (pend) { W.clearTimeout(pend); pend = 0; }
// — a taps/bounce/bloom change must NOT touch the controller: gem-perf set() wipes every live window + 8 frames of skip,
// — so the med readout would blank for ~8 s on a slow phone. The ratio is written only when it actually moved.
try { const P = W.GEM_PERF; if (P && P.set && (dirty || S.dpr !== lastDpr)) P.set(S.dpr > 0 ? { min: S.dpr, max: S.dpr } : { min: 1, max: 0 }); store(); } catch (e) { }
lastDpr = S.dpr; dirty = 0; }
function push(live) { try {
const O = W.GEM_OPTICS, B = W.GEM_BLOOM;
if (O && O.set && O.apply) { const d = O.dump ? O.dump() : {}; Object.keys(d).forEach(function (n) { O.set(n, { fire: { taps: S.taps }, reflect: { bounce: S.bounce } }); }); O.apply(); }
if (B) { if (B.set) B.set(S.bloomOn); B.intensity = S.bloomIntensity; } } catch (e) { }
if (live) { if (pend) W.clearTimeout(pend); pend = W.setTimeout(persist, 120); } else persist();
tick(); }
function stats() {
const L = (W.GEM3D && W.GEM3D.rigs) || []; let r = 0, a = 0;
for (let i = 0; i < L.length; i++) { const q = L[i]; if (!q || !q.renderer) continue; if (!r && q.canvas && q.canvas.closest && q.canvas.closest('#gem-screen')) r = q; if (!a) a = q; }
r = r || a; const st = r && r.gp, m = st ? num(st.m, 0) : 0, pr = r && W.GEM_PERF && W.GEM_PERF.pr ? num(W.GEM_PERF.pr(r), 0) : 0;
return { med: m, fps: m > 0 ? Math.round(1000 / m) : 0, ratio: pr }; }
function tick() {
const s = stats(), m = s.med > 0 ? s.med.toFixed(1) + 'ms' : '—', f = s.fps ? s.fps + 'fps' : '—';
if (head) head.textContent = 'med ' + m + ' · ' + f + (s.ratio ? ' · ' + s.ratio.toFixed(2) + 'x' : '');
for (let i = 0; i < rows.length; i++) rows[i].ro.textContent = m + ' ' + f; }
function sync() {
for (let i = 0; i < rows.length; i++) {
const r = rows[i], k = r.k;
if (k === 'dpr' && URLDPR > 0) { r.inp.value = cl(URLDPR, 1, 2); r.val.textContent = 'url'; continue; }
if (k === 'dpr' && S.dpr <= 0) { r.inp.value = 1; r.val.textContent = 'auto'; continue; }
r.inp.value = k === 'taps' ? S.taps : k === 'bounce' ? S.bounce : k === 'bloom' ? (S.bloomOn ? 1 : 0) : k === 'amt' ? S.bloomIntensity : S.dpr;
r.val.textContent = k === 'bloom' ? (S.bloomOn ? 'on' : 'off') : k === 'amt' || k === 'dpr' ? (+r.inp.value).toFixed(2) : String(Math.round(+r.inp.value)); }
tick(); }
function set(k, v) {
if (k === 'bloom') S.bloomOn = !(v < 0.5); else if (k === 'auto') { S.dpr = 0; dirty = 1; }
else { const b = K[k], n = cl(v, b[0], b[1]); S[k === 'amt' ? 'bloomIntensity' : k] = k === 'taps' || k === 'bounce' ? Math.round(n) : n; if (k === 'dpr') dirty = 1; }
push(k === 'auto' ? 0 : 1); sync(); }
function value() { return { taps: S.taps, bounce: S.bounce, bloomOn: !!S.bloomOn, bloomIntensity: Math.round(S.bloomIntensity * 100) / 100, dpr: S.dpr }; }
function json() { const x = X(), v = value(); return x ? x.json(v, stats(), W.navigator && W.navigator.userAgent) : JSON.stringify(v); }
function build() {
const x = X(), ov = D.getElementById('gem-screen');
if (sheet || !ov || !x) return sheet;
const r = x.sheet({ note: URLDPR > 0 ? '?gemdpr=' + URLDPR + ' fixes the ratio — the dpr slider cannot move it.' : '', lockDpr: URLDPR > 0, onInput: set, text: json, onClose: close, onAuto: function () { set('auto', 0); } });
sheet = r.node; head = r.head; rows = r.rows;
rows.forEach(function (q) { q.inp.addEventListener('change', persist); });
return sheet; }
function open() {
if (!GATE || !build()) return;
const ov = D.getElementById('gem-screen'); if (!ov) return;
try { ov.appendChild(sheet); } catch (e) { return; }
const B = W.GEM_BLOOM; if (B && B.on) S.bloomOn = !!B.on();
if (B && typeof B.intensity === 'number') S.bloomIntensity = cl(B.intensity, 0, 0.5);
push(0); sync(); if (iv) W.clearInterval(iv); iv = W.setInterval(tick, 500); }
function close() {
if (iv) { W.clearInterval(iv); iv = 0; }
if (pend) persist();                                  // a flush still owed is written, not dropped
if (sheet && sheet.parentNode) { try { sheet.parentNode.removeChild(sheet); } catch (e) { } } }
function pill() {
if (!GATE) return;
const ov = D.getElementById('gem-screen');
if (!ov || !ov.classList.contains('overlay--open') || ov.querySelector('.gem-tune-btn')) return;
btn = D.createElement('button'); btn.type = 'button'; btn.className = 'gem-tune-btn'; btn.textContent = 'tune';
btn.style.cssText = 'position:absolute;top:10px;right:92px;z-index:2147483647;font:600 11px/1 ui-monospace,SFMono-Regular,Menlo,monospace;letter-spacing:.06em;padding:8px 11px;border-radius:99px;border:1px solid rgba(255,255,255,.42);background:rgba(0,0,0,.58);color:white;cursor:pointer;-webkit-tap-highlight-color:transparent';
btn.addEventListener('pointerdown', stop);
btn.addEventListener('click', function (e) { stop(e); open(); });
ov.appendChild(btn); }
function watch() {
const ov = D.getElementById('gem-screen');
if (!ov || !W.MutationObserver) return;
new W.MutationObserver(function () { if (ov.classList.contains('overlay--open')) pill(); else close(); }).observe(ov, { attributes: true, attributeFilter: ['class', 'hidden'] });
pill(); }
W.GEM_PERF_TUNE = { open: open, close: close, value: value, json: json };
D.addEventListener('click', function (e) { const t = e && e.target; if (t && t.closest && t.closest('[data-overlay-target="gem-screen"]')) W.setTimeout(pill, 60); }, true);
if (load() && GATE) W.setTimeout(push, 0);
// — lastDpr starts at the controller's own state, so opening the sheet with an unchanged ratio calls GEM_PERF.set zero times.
try { const g = W.GEM_PERF && W.GEM_PERF.config && W.GEM_PERF.config(); lastDpr = g && g.max > 0 ? g.max : 0; } catch (e) { lastDpr = 0; }
watch();
})();
