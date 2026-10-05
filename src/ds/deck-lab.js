/* ADAM/DS — src/ds/deck-lab.js · Deck playground — controls write the live rig */
// [plan:2026-10-05_000000-lump-sum-builds.md#phase-1] · the #deck pattern section's controls (Task 46).
// — Ranges: push ● elevation ● gap → rig.target (hold mode); stations: contact/read/settle pills; —
// — Loop: the 6s auto arc · words: eyebrow + word repaint the canvas sheet on every rig —
(function () {
const PUSH = function (v) { return 1.05 - 0.31 * (Number(v) / 100); };
const PUSHV = function (p) { return Math.round(((1.05 - p) / 0.31) * 100); };
const rigs = function () { return (window.DECK3D && window.DECK3D.rigs) || []; };
const one = function (s) { return document.querySelector(s); };
const slider = function (k) { return one('[data-deck-range="' + k + '"]'); };
const setOut = function (k, v) { const o = one('[data-deck-out="' + k + '"]'); if (o) o.textContent = v; };
const loopPill = function () { return one('[data-deck-loop]'); };
const readout = function () {
const r = rigs()[0], el = one('[data-deck-read]');
if (!r || !el) return;
el.textContent = 'el ' + r.cam.el.toFixed(1) + '° · dolly ×' + r.cam.p.toFixed(2) + (r.mode === 'loop' ? ' · loop' : '');
};
const syncLoop = function (on) {
const p = loopPill();
if (p) p.classList.toggle('is-on', on);
document.querySelectorAll('[data-deck-station]').forEach(function (b) { b.classList.remove('is-on'); });
};
document.addEventListener('input', function (e) {
if (!e.target.closest || !window.DECK3D) return;
const range = e.target.closest('[data-deck-range]');
if (range) {
const r = rigs()[0];
const k = range.dataset.deckRange;
if (r) {
if (k === 'push') window.DECK3D.control(r.cam.el, PUSH(range.value));
if (k === 'elevation') window.DECK3D.control(Number(range.value), r.cam.p);
if (k === 'gap') window.DECK3D.gap(Number(range.value));
}
setOut(k, k === 'gap' ? Number(range.value).toFixed(2) + '×' : range.value);
syncLoop(false);
return;
}
if (e.target.closest('[data-deck-eyebrow]') || e.target.closest('[data-deck-word]')) {
window.DECK3D.words(one('[data-deck-eyebrow]').value, one('[data-deck-word]').value);
}
});
document.addEventListener('click', function (e) {
if (!e.target.closest) return;
const st = e.target.closest('[data-deck-station]');
if (st && window.DECK3D) {
const name = st.dataset.deckStation;
window.DECK3D.station(name);
document.querySelectorAll('[data-deck-station]').forEach(function (b) { b.classList.toggle('is-on', b === st); });
const lp = loopPill();
if (lp) lp.classList.remove('is-on');
const s = window.DECK_SCENE.STATIONS[name];
if (slider('push')) { slider('push').value = PUSHV(s.p); setOut('push', PUSHV(s.p)); }
if (slider('elevation')) { slider('elevation').value = s.el; setOut('elevation', s.el); }
return;
}
const lp = e.target.closest('[data-deck-loop]');
if (lp && window.DECK3D) {
const on = !lp.classList.contains('is-on');
window.DECK3D.setMode(on ? 'loop' : 'hold');
if (on) syncLoop(true);
else lp.classList.toggle('is-on', false);
return;
}
if (e.target.closest('[data-deck-copy]')) {
const pre = one('[data-deck-code]');
if (pre && navigator.clipboard) navigator.clipboard.writeText(pre.textContent);
}
});
setInterval(function () {
const r = rigs()[0];
if (!r) return;
readout();
if (r.mode === 'loop') {
if (slider('push')) { slider('push').value = PUSHV(r.cam.p); setOut('push', PUSHV(r.cam.p)); }
if (slider('elevation')) { slider('elevation').value = r.cam.el.toFixed(1); setOut('elevation', r.cam.el.toFixed(1)); }
}
}, 250);
})();
