/* ADAM/SHARED — src/components/GemReward/gem-occlusion.js · park rigs hidden under an opaque gem ceremony */
// [plan:2026-10-03_144222-gem-realism-round2.md#phase-18] · Task 63.
// — Contract: while an opaque gem surface covers the viewport (#gem-screen.overlay--open, or the reward sheet's open
// — layer), every rig whose canvas is NOT inside that surface gets rig.occl = 1 and its pending rAF cancelled. On
// — close the flag clears and GEM_RIG.arm() resumes the same pose. Scheduling only — no material, no pixel changes.
// Export map: none (side-effect module; reads GEM3D.rigs and GEM_RIG.arm at call time).
// — The fade is the only window where the covered card is still on screen, so PARK waits for it (opacity transitionend
// — on the surface, 300 ms fallback for reduced motion) while RESUME is immediate, so the close fade also shows a live
// — card. Inert at rest: one attribute observer, no timer, no rAF. Only while a surface is up does a 500 ms sweep plus a
// — childList watcher run — that is how a rig mounting under an already-faded surface gets parked inside one beat.
(function () {
const D = document, W = window, IDS = ['gem-screen', 'reward-sheet'];
let phase = 0, iv = 0, fb = 0, mo = 0, lis = 0;            // 0 inert · 1 fading · 2 covered
const arm = function (r) { if (W.GEM_RIG && W.GEM_RIG.arm) W.GEM_RIG.arm(r); };
const rigs = function () { return (W.GEM3D && W.GEM3D.rigs) || []; };
// — "open" is a surface's own settled state: the overlay needs its class AND a clear hidden attribute; the sheet's
// — is-gem-in lands ~140 ms after hidden clears, so a sheet still rising is not yet an opaque cover.
function surfs() {
const a = [];
for (let i = 0; i < 2; i++) {
const el = D.getElementById(IDS[i]);
if (el && !el.hidden && el.classList.contains(i ? 'is-gem-in' : 'overlay--open')) a.push(el);
}
return a;
}
function inside(r, els) {
for (let i = 0; i < els.length; i++) if (els[i].contains && els[i].contains(r.canvas)) return 1;
return 0;
}
function sweep(els) {
const rs = rigs();
for (let i = 0; i < rs.length; i++) {
const r = rs[i];
if (!r || !r.canvas || r.gone) continue;
if (inside(r, els)) { if (r.occl) { r.occl = 0; arm(r); } continue; }   // the open surface owns its own canvas
if (r.occl) continue;
if (r.raf && W.cancelAnimationFrame) W.cancelAnimationFrame(r.raf);
r.raf = 0; r.occl = 1;                                                   // cancelled id + flag: the loop stays parked
}
}
function resume() {
const rs = rigs();
for (let i = 0; i < rs.length; i++) if (rs[i] && rs[i].occl) { rs[i].occl = 0; arm(rs[i]); }
}
function unwatch() { if (iv) { clearInterval(iv); iv = 0; } if (mo) { mo.disconnect(); mo = 0; } }
function watch() {
if (iv) return;
iv = setInterval(scan, 500);
if (W.MutationObserver && D.body) {
mo = new W.MutationObserver(function (l) {
for (let i = 0; i < l.length; i++) if (l[i].addedNodes && l[i].addedNodes.length) { const e = surfs(); if (e.length) sweep(e); return; }
});
mo.observe(D.body, { childList: true, subtree: true });
}
}
function unfade() { if (fb) { clearTimeout(fb); fb = 0; } if (lis) { lis.removeEventListener('transitionend', onend); lis = 0; } }
function onend(e) { if (!e || e.propertyName !== 'opacity') return; if (e.target && lis && e.target !== lis) return; land(); }
function land() {
if (phase !== 1) return;
const els = surfs();
if (!els.length) { scan(); return; }                                      // closed mid-fade: close wins
phase = 2;
unfade();
sweep(els);
watch();
}
function scan() {
const els = surfs();
if (!els.length) { if (phase) { unfade(); unwatch(); phase = 0; resume(); } return; }
if (!phase) {                                                             // opening: hold the sweep for the fade
phase = 1;
unfade();
lis = els[0];
if (lis.addEventListener) lis.addEventListener('transitionend', onend);
fb = setTimeout(land, 300);                                               // no transition at all must still park
return;
}
if (phase === 2) sweep(els);
}
if (W.MutationObserver && D.documentElement) new W.MutationObserver(function (m) {
for (let i = 0; i < m.length; i++) { const t = m[i].target; if (t && (t.id === IDS[0] || t.id === IDS[1])) { scan(); return; } }
}).observe(D.documentElement, { attributes: true, attributeFilter: ['class', 'hidden', 'style'], subtree: true });
scan();                                                                   // a surface can already be open at load
})();
