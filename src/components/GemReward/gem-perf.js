/* ADAM/SHARED — src/components/GemReward/gem-perf.js · adaptive gem pixel ratio (option A) */
// — Why: the phone surfaces (card 680x640, ceremony 786x640) run 1.6-2x over a 60 fps budget and no exact lever closes that,
// — so the phone steps its own canvas resolution down until 60 fps holds. Desktop holds target AT the ceiling — same ratio,
// — same pixels, byte-identical frames, zero calls: that is the hard law here, not a nicety.
// — Contract (classic script, loaded before gem3d.js): GEM_PERF.tick(rig, dtSeconds) · config() · set(partial) · pr(rig).
// — Settings: min 1 · max 0 = AUTO min(dpr,2) · target 15.5 ms · downStep .2 · upStep .2 · window 30 frames · cooldownMs 1200.
// — Steps are SYMMETRIC by design: a 60 Hz display hands the loop 16.7 ms per rAF whatever headroom is left, so an up band under
// — that floor is unreachable and downStep > upStep walks a rig down for the life of the page. Both default to .2 and must stay equal.
// — Law: decide on the LAST window samples only, when the window is FULL, dropping the 3 largest so one 40-50 ms stall cannot drag
// — the median. Down above target*1.15; up when the trimmed median is within 3% of est (the smallest sample over 4 ms — what this
// — display delivers) AND est <= target*1.10: a device whose best frame is over budget never climbs back. Clamp [min, ceiling].
// — MEMORY: a down-step from r records failAt=r, failT=now, failEst=est. Up must aim elsewhere than failAt, or show stepping down
// — BOUGHT NOTHING (est*1.03 >= failEst, fresh under 20 s), or show LARGE HEADROOM: m <= target*.6 (9.3 ms) — a frame at 60% of
// — budget means the MACHINE changed (compile over, tab closed), not the ratio, so climbing is safe again; without it one hitch
// — ratchets a rig down for the life of the page. Climb needs 2 agreeing windows: no pulse. Every step is cooldown-spaced.
// — Priority: ?gemdpr=N (fixed, adaptation off) > localStorage gemDpr (N = fixed, {json} = settings) > GEM_PERF_CONFIG > defaults.
// — ?gemperf=1 is read by gem-perf-hud.js (loaded right after this file); absent it costs one property test per tick.
(function () {
const D = { min: 1, max: 0, target: 15.5, downStep: 0.2, upStep: 0.2, window: 30, cooldownMs: 1200 };
const LS = 'gemDpr', live = [], qs = String((window.location && window.location.search) || '');
const param = function (k) { const m = qs.match(new RegExp('[?&]' + k + '=([^&]*)')); return m ? m[1] : ''; };
let cfg = {}, fixed = 0, QF = 0;
function number(v) { const n = parseFloat(v); return isFinite(n) && n > 0 ? n : 0; }
function merge(o) { for (const k in D) if (o && typeof o[k] === 'number' && isFinite(o[k])) cfg[k] = o[k]; return cfg; }
function boot() {
for (const k in D) cfg[k] = D[k]; if (window.GEM_PERF_CONFIG && typeof window.GEM_PERF_CONFIG === 'object') merge(window.GEM_PERF_CONFIG);
let raw = ''; try { raw = window.localStorage.getItem(LS) || ''; if (raw.charAt(0) === '{') merge(JSON.parse(raw)); else fixed = number(raw); } catch (e) { }
QF = number(param('gemdpr'));
if (QF) fixed = QF;                                  // a URL ratio is the owner overriding everything, permanently
}
const ceiling = function () { return cfg.max > 0 ? cfg.max : Math.min(window.devicePixelRatio || 1, 2); }, clamp = function (v) { return Math.max(cfg.min, Math.min(ceiling(), v)); };
const pr = function (rig) { return fixed > 0 ? fixed : (rig && rig.gp ? rig.gp.ratio : ceiling()); }, config = function () { const o = {}; for (const k in D) o[k] = cfg[k]; return o; };
// — apply: ONE realloc — setPixelRatio re-enters setSize (a double reset) and gem-rig's size early-returns on an unchanged box.
function apply(st, ratio, step) {
const r = st.r;
if (!r.renderer || r.dead || !r.w || !r.h) return 0;
ratio = Math.round(ratio * 100) / 100;
const el = r.renderer.domElement, W = Math.floor(r.w * ratio), H = Math.floor(r.h * ratio);
if (el.width === W && el.height === H) { st.ratio = ratio; return 0; }   // already that size — no step, no hitch
r.renderer.setDrawingBufferSize(r.w, r.h, ratio);
st.ratio = ratio;
if (step) { st.steps++; st.n = 0; st.i = 0; st.ok = 0; st.skip = st.f + 8; st.t0 = performance.now(); }
return 1;
}
// — stats: sort a COPY of the full ring, drop the `cut` largest, median the rest, est = smallest sample over 4 ms. buf + srt
// — are the two per-rig buffers, allocated once at the first window — nothing is allocated per frame or per decision.
function stats(st, cut) {
const b = st.buf, s = st.srt, n = b.length;
s.set(b); s.sort();
let est = 0;
for (let i = 0; i < n; i++) if (b[i] > 4 && (!est || b[i] < est)) est = b[i];
const k = n - cut, h = k >> 1;
st.m = k % 2 ? s[h] : (s[h - 1] + s[h]) / 2;
st.est = est;
}
function decide(st) {
const t = cfg.target, c = ceiling(), m = st.m, est = st.est, now = performance.now(), up = st.ratio + cfg.upStep;
if (m > t * 1.15 && st.ratio > cfg.min + 0.001) { st.failAt = st.ratio; st.failT = now; st.failEst = est; return apply(st, Math.max(cfg.min, st.ratio - cfg.downStep), 1); }
const fresh = now - st.failT < 20000, head = m <= t * 0.6;   // stale evidence is a different machine; 40% under budget is a faster one
const proven = up <= st.failAt - 0.001 || (fresh && est * 1.03 >= st.failEst);   // memory: aim elsewhere, or show the ratio bought nothing
const yes = m <= est * 1.03 && est <= t * 1.10 && st.ratio < c - 0.001 && (head || proven);
st.ok = yes ? st.ok + 1 : 0;                         // 2 windows must agree: one lucky window cannot climb
return yes && st.ok > 1 ? apply(st, Math.min(c, up), 1) : 0;
}
function tick(rig, dt) {
if (!rig || !rig.renderer || rig.dead) return;
let st = rig.gp;
if (!st) {
st = rig.gp = { r: rig, buf: 0, srt: 0, n: 0, i: 0, f: 0, skip: 12, t0: -1e9, at: 0, ratio: 0, steps: 0, m: 0, est: 0, ok: 0, failAt: 1e9, failT: -1e9, failEst: 0 };
live.push(st); st.ratio = fixed > 0 ? fixed : ceiling();
if (fixed > 0 || cfg.max > 0) apply(st, st.ratio, 0);   // explicit config lands once; the AUTO path calls nothing at all
}
st.tIn = performance.now(); if (window.GEM_PERF_HUD) window.GEM_PERF_HUD.frame(rig, st, st.m);   // HUD start clock; the panel self-throttles
st.f++; if (st.f <= st.skip || !rig.w || !rig.h) return;   // 12 frames at start, 8 after a step: the realloc is not a signal
if (!st.buf) { const n = cfg.window > 1 ? Math.round(cfg.window) : 30; st.buf = new Float32Array(n); st.srt = new Float32Array(n); }
st.buf[st.i] = Math.min(Math.max(dt || 0, 0) * 1000, 50);
st.i = (st.i + 1) % st.buf.length;
if (st.n < st.buf.length) st.n++;
if (fixed > 0 || st.n < st.buf.length || st.f - st.at < 6) return;   // a FULL window only: no partial-window decision
st.at = st.f;
const now = performance.now();
stats(st, st.buf.length > 7 ? 3 : 0);
if (now - st.t0 < cfg.cooldownMs) return;
decide(st);
}
function set(p) {
merge(p); fixed = QF;                                // a persisted object replaces a bare-number gemDpr; the URL still wins
try { window.localStorage.setItem(LS, JSON.stringify(cfg)); } catch (e) { }
for (let i = 0; i < live.length; i++) { const st = live[i], t = fixed > 0 ? fixed : clamp(st.ratio);
st.buf = 0, st.srt = 0, st.n = 0, st.i = 0, st.ok = 0, st.failAt = 1e9, st.failT = -1e9, st.skip = st.f + 8; if (fixed > 0 || t !== st.ratio) apply(st, t, 0); }
return config();
}
window.GEM_PERF = { tick: tick, config: config, set: set, pr: pr };
boot();
})();
