/* ADAM/SHARED — src/components/GemReward/gem-perf.js · adaptive gem pixel ratio (option A) */
// — Why: the phone surfaces (card 680x640, ceremony 786x640) run 1.6-2x over a 60 fps budget on a phone GPU and no exact
// — lever closes that, so the phone steps its own canvas resolution down until 60 fps holds. Desktop holds target AT the
// — ceiling and therefore never steps — same ratio, same pixels, byte-identical frames. That is the hard law here, not a nicety.
// — Contract (classic script, loaded before gem3d.js): GEM_PERF.tick(rig, dtSeconds) · config() · set(partial) · pr(rig).
// — Settings: min 1 · max 0 = AUTO min(dpr,2) · target 15.5 ms · downStep .25 · upStep .15 · window 30 frames · cooldownMs 1200.
// — Priority: ?gemdpr=N (fixed, adaptation off) > localStorage gemDpr (N = fixed, {json} = settings) > GEM_PERF_CONFIG > defaults.
// — ?gemperf=1 paints a read-only HUD (ratio · median ms · fps · steps); absent it costs one string test at boot.
(function () {
const D = { min: 1, max: 0, target: 15.5, downStep: 0.25, upStep: 0.15, window: 30, cooldownMs: 1200 };
const LS = 'gemDpr', live = [], qs = String((window.location && window.location.search) || '');
const param = function (k) { const m = qs.match(new RegExp('[?&]' + k + '=([^&]*)')); return m ? m[1] : ''; };
const HUDON = param('gemperf') === '1';
let cfg = {}, fixed = 0, QF = 0, hudEl = 0, hudAt = 0;
function number(v) { const n = parseFloat(v); return isFinite(n) && n > 0 ? n : 0; }
function merge(o) { for (const k in D) if (o && typeof o[k] === 'number' && isFinite(o[k])) cfg[k] = o[k]; return cfg; }
function boot() {
for (const k in D) cfg[k] = D[k];
if (window.GEM_PERF_CONFIG && typeof window.GEM_PERF_CONFIG === 'object') merge(window.GEM_PERF_CONFIG);
let raw = '';
try { raw = window.localStorage.getItem(LS) || ''; if (raw.charAt(0) === '{') merge(JSON.parse(raw)); else fixed = number(raw); } catch (e) { }
QF = number(param('gemdpr'));
if (QF) fixed = QF;                                  // a URL ratio is the owner overriding everything, permanently
}
const ceiling = function () { return cfg.max > 0 ? cfg.max : Math.min(window.devicePixelRatio || 1, 2); };
const clamp = function (v) { return Math.max(cfg.min, Math.min(ceiling(), v)); };
const pr = function (rig) { return fixed > 0 ? fixed : (rig && rig.gp ? rig.gp.ratio : ceiling()); };
const config = function () { const o = {}; for (const k in D) o[k] = cfg[k]; return o; };
// — apply: ONE realloc — setPixelRatio re-enters setSize (a double reset) and gem-rig's size early-returns on an unchanged box.
function apply(st, ratio, step) {
const r = st.r;
if (!r.renderer || r.dead || !r.w || !r.h) return 0;
ratio = Math.round(ratio * 100) / 100;
const el = r.renderer.domElement, W = Math.floor(r.w * ratio), H = Math.floor(r.h * ratio);
if (el.width === W && el.height === H) { st.ratio = ratio; return 0; }   // already that size — no step, no hitch
r.renderer.setDrawingBufferSize(r.w, r.h, ratio);
st.ratio = ratio;
if (step) { st.steps++; st.n = 0; st.i = 0; st.skip = st.f + 8; st.t0 = performance.now(); }
return 1;
}
// — median of the ring: Float32Array.sort is numeric, and the sort only permutes slots that all hold samples of this
// — window, so the ring stays a ring. The buffer is the one allocation per rig (first tick) — never a per-frame one.
function median(st) {
const b = st.buf;
b.sort();
const h = b.length >> 1;
return b.length % 2 ? b[h] : (b[h - 1] + b[h]) / 2;
}
function decide(st, m) {
const t = cfg.target, c = ceiling();
if (m > t * 1.15 && st.ratio > cfg.min + 0.001) return apply(st, Math.max(cfg.min, st.ratio - cfg.downStep), 1);
if (m < t * 0.75 && st.ratio < c - 0.001) return apply(st, Math.min(c, st.ratio + cfg.upStep), 1);
return 0;
}
function hud(st, m) {
if (!hudEl) {
hudEl = document.createElement('div');
hudEl.style.cssText = 'position:fixed;left:8px;top:8px;z-index:2147483000;pointer-events:none;font:11px/1.4 ui-monospace,SFMono-Regular,Menlo,monospace;white-space:pre;background:rgba(0,0,0,.55);color:rgba(255,255,255,.95);padding:6px 8px;border-radius:6px';
document.body.appendChild(hudEl);
}
hudEl.textContent = 'GEM PERF\nratio ' + st.ratio.toFixed(2) + '\nmedian ' + m.toFixed(1) + ' ms\nfps ~' + (m > 0 ? Math.round(1000 / m) : 0) + '\nsteps ' + st.steps + (fixed > 0 ? ' (fixed)' : '');
}
function tick(rig, dt) {
if (!rig || !rig.renderer || rig.dead) return;
let st = rig.gp;
if (!st) {
st = rig.gp = { r: rig, buf: 0, n: 0, i: 0, f: 0, skip: 12, t0: -1e9, at: 0, ratio: 0, steps: 0 };
live.push(st);
st.ratio = fixed > 0 ? fixed : ceiling();
if (fixed > 0 || cfg.max > 0) apply(st, st.ratio, 0);   // explicit config lands once; the AUTO path calls nothing at all
}
st.f++;
if (st.f <= st.skip || !rig.w || !rig.h) return;    // 12 frames at start, 8 after a step: the realloc is not a signal
if (!st.buf) st.buf = new Float32Array(cfg.window > 1 ? Math.round(cfg.window) : 30);
st.buf[st.i] = Math.min(Math.max(dt || 0, 0) * 1000, 50);
st.i = (st.i + 1) % st.buf.length;
if (st.n < st.buf.length) st.n++;
if (fixed > 0 || st.n < st.buf.length || st.f - st.at < 6) return;   // one median, or a retry, ~10x a second at most
st.at = st.f;
const now = performance.now();
const m = median(st);
if (HUDON && now - hudAt >= 250) { hudAt = now; hud(st, m); }
if (now - st.t0 < cfg.cooldownMs) return;
decide(st, m);
}
function set(p) {
merge(p);
fixed = QF;                                          // a persisted object replaces a bare-number gemDpr; the URL still wins
try { window.localStorage.setItem(LS, JSON.stringify(cfg)); } catch (e) { }
for (let i = 0; i < live.length; i++) {
const st = live[i], t = fixed > 0 ? fixed : clamp(st.ratio);
st.buf = 0, st.n = 0, st.i = 0, st.skip = st.f + 8;
if (fixed > 0 || t !== st.ratio) apply(st, t, 0);
}
return config();
}
window.GEM_PERF = { tick: tick, config: config, set: set, pr: pr };
boot();
})();
