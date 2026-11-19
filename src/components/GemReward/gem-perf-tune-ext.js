/* ADAM/SHARED — src/components/GemReward/gem-perf-tune-ext.js · sheet markup + JSON/clipboard for the gem tune panel */
// [plan:2026-10-03_144222-gem-realism-round2.md#phase-18] · Task 62 · the DOM half of gem-perf-tune.js.
// — Pure builders: no state, no rig access, no listeners outside the nodes it returns. Inline styles only, rgba only.
// — LOAD ORDER: this file BEFORE gem-perf-tune.js (the controller resolves the global lazily, but ext first is the contract).
// Export map: window.GEM_PERF_TUNE_EXT { sheet(opts), json(v, stats, ua), copy(text, btn) } — frozen.
(function () {
const W = window, D = document;
const FONT = 'font:600 11px/1 ui-monospace,SFMono-Regular,Menlo,monospace;';
const SHEET = 'position:absolute;left:0;right:0;bottom:0;z-index:2147483647;pointer-events:auto;box-sizing:border-box;max-height:60vh;overflow:auto;-webkit-overflow-scrolling:touch;background:rgba(8,10,16,.97);-webkit-backdrop-filter:blur(14px) saturate(120%);backdrop-filter:blur(14px) saturate(120%);color:white;padding:10px 12px 14px;border-radius:14px 14px 0 0;border-top:1px solid rgba(255,255,255,.18);';
const ROW = 'display:flex;align-items:center;gap:8px;padding:5px 0', LAB = 'width:62px;flex:none;opacity:.8';
const INP = 'flex:1;min-width:0;height:16px;margin:0;background:rgba(255,255,255,.22);border-radius:2px;accent-color:rgba(255,255,255,.92)';
const VAL = 'width:34px;flex:none;text-align:right', RO = 'width:92px;flex:none;text-align:right;font-size:10px;opacity:.55';
const BTN = 'flex:1;padding:9px 5px;border-radius:9px;border:1px solid rgba(255,255,255,.35);background:rgba(255,255,255,.08);color:white;' + FONT + 'letter-spacing:.06em;cursor:pointer;-webkit-tap-highlight-color:transparent';
const SPEC = [['taps', 'taps', 1, 3, 1], ['bounce', 'bounce', 1, 5, 1], ['bloom', 'bloom', 0, 1, 1], ['amt', 'bloom amt', 0, 0.5, 0.02], ['dpr', 'dpr', 1, 2, 0.1]];
const mk = function (t, css, txt) { const e = D.createElement(t); if (css) e.style.cssText = css; if (txt != null) e.textContent = txt; return e; };
const stop = function (e) { if (e && e.stopPropagation) e.stopPropagation(); };
function sheet(o) {
o = o || {};
const node = mk('div', SHEET + FONT + 'letter-spacing:.04em');
node.className = 'gem-tune-sheet';
const bar = mk('div', 'display:flex;align-items:center;gap:8px;margin:0 0 6px');
bar.appendChild(mk('span', 'font-weight:700;letter-spacing:.14em;opacity:.9', 'TUNE'));
const head = mk('span', 'flex:1;text-align:right;opacity:.7;white-space:nowrap;overflow:hidden;text-overflow:ellipsis', 'med —');
bar.appendChild(head); node.appendChild(bar);
if (o.note) node.appendChild(mk('div', 'margin:0 0 6px;font-size:10px;line-height:1.4;opacity:.6', String(o.note)));
const rows = SPEC.map(function (s) {
const row = mk('div', ROW), inp = mk('input', INP), val = mk('span', VAL), ro = mk('span', RO);
row.appendChild(mk('span', LAB, s[1])); row.appendChild(inp); row.appendChild(val); row.appendChild(ro);
inp.type = 'range'; inp.min = s[2]; inp.max = s[3]; inp.step = s[4]; inp.dataset.tune = s[0];
if (s[0] === 'dpr' && o.lockDpr) inp.disabled = true;
inp.addEventListener('input', function () { if (o.onInput) o.onInput(s[0], parseFloat(inp.value) || 0); });
node.appendChild(row);
return { k: s[0], inp: inp, val: val, ro: ro };
});
const foot = mk('div', 'display:flex;gap:6px;margin-top:8px');
[['dpr auto', function () { if (o.onAuto) o.onAuto(); }], ['copy json', function (el) { copy(o.text ? o.text() : '', el); }], ['close', function () { if (o.onClose) o.onClose(); }]].forEach(function (b) {
const el = mk('button', BTN, b[0]);
el.type = 'button';
el.addEventListener('pointerdown', stop);
el.addEventListener('click', function (e) { stop(e); b[1](el); });
foot.appendChild(el);
});
node.appendChild(foot);
return { node: node, head: head, rows: rows };
}
function json(v, s, ua) {
s = s || {};
const o = { taps: v.taps, bounce: v.bounce, bloomOn: !!v.bloomOn, bloomIntensity: v.bloomIntensity, dpr: v.dpr };
o.med = Math.round((parseFloat(s.med) || 0) * 10) / 10; o.fps = s.fps || 0; o.ratio = Math.round((parseFloat(s.ratio) || 0) * 100) / 100;
o.ua = String(ua || '');
return JSON.stringify(o);
}
function copy(text, btn) {
const ok = function () { if (!btn) return; btn.textContent = 'copied ✓'; W.setTimeout(function () { btn.textContent = 'copy json'; }, 1200); };
const back = function () { try { const ta = mk('textarea', 'position:fixed;left:-9999px;top:0;opacity:0', text); D.body.appendChild(ta); ta.select(); if (D.execCommand) D.execCommand('copy'); D.body.removeChild(ta); } catch (e) { } ok(); };
let p = 0;
try { p = W.navigator.clipboard && W.navigator.clipboard.writeText ? W.navigator.clipboard.writeText(text) : 0; } catch (e) { p = 0; }
if (p && p.then) p.then(ok, back); else if (p) ok(); else back();
}
W.GEM_PERF_TUNE_EXT = Object.freeze({ sheet: sheet, json: json, copy: copy });
})();
