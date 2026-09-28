/* ADAM/PAGE — src/pitch/pitch-gem-cycle.js · hero stone: variant retint + shadow line */
// [plan:2026-09-21_000000-lump-sum-builds.md#phase-7] · one mounted stone, recoloured in place.
// — Cycle: every DWELL the live stone is retinted through gem-tint.js — same cut, same rig, same — 
// —        spin, no remount, so the change is a property change and a drag in flight survives it — 
// — Line: align() re-aims the rig (GEM_SCENE.frame) so the contact shadow lands on the headline's — 
// —        bottom edge; it re-runs on resize and on the font swap, and rests when the hero stacks. — 
// Export map: VARIANTS order · boot() schedule + align · align(tries) shadow line.
(function () {
var VARIANTS = ['sapphire', 'amethyst', 'redberyl', 'citrine'];
var DWELL = 3000;
var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
function canvas() { return document.querySelector('.pitch-gem__canvas[data-gem]'); }
function rigOf(cv) {
  var list = (window.GEM3D && window.GEM3D.rigs) || [];
  for (var i = 0; i < list.length; i++) if (list[i].canvas === cv) return list[i];
  return null;
}
// — Section: shadow line — 
function align(tries) {
  var cv = canvas();
  var head = document.querySelector('.brand-headline');
  if (!cv || !head || !window.GEM_SCENE || !window.GEM_SCENE.frame) return;
  var rig = rigOf(cv);
  if (!rig || !rig.group || !rig.camera || !rig.floors) {
    if (tries < 12) setTimeout(function () { align(tries + 1); }, 220);
    return;
  }
  rig.dropY = 0;
  window.GEM_SCENE.frame(rig);
  if (!window.matchMedia('(min-width: 761px)').matches) return;   // stacked hero: rest framing
  var box = cv.getBoundingClientRect();
  var want = head.getBoundingClientRect().bottom - box.top;       // target line, canvas px
  var perPx = 2 * Math.tan(rig.camera.fov * Math.PI / 360) * rig.camera.position.z / box.height;
  for (var pass = 0; pass < 2; pass++) {
    rig.camera.updateMatrixWorld();
    var v = rig.floors.shadow.position.clone().project(rig.camera);
    rig.dropY += (want - (1 - (v.y * 0.5 + 0.5)) * box.height) * perPx;
    window.GEM_SCENE.frame(rig);
  }
}
// — Section: variant cycle — 
function schedule(cv, i) {
  setTimeout(function () { next(cv, i); }, DWELL);
}
function next(cv, i) {
  if (reduce || document.hidden || !cv.isConnected || !cv.offsetParent) {
    schedule(cv, i);
    return;
  }
  if (window.GEM_TINT) window.GEM_TINT.apply(cv, VARIANTS[(i + 1) % VARIANTS.length]);
  schedule(cv, i + 1);
}
// — Section: wire — 
function boot() {
  var cv = canvas();
  if (!cv) return;
  align(0);
  if (cv.dataset.cycling || reduce) return;
  cv.dataset.cycling = '1';
  schedule(cv, VARIANTS.indexOf(cv.dataset.gem));
}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
else boot();
document.addEventListener('ds:doc', boot);
window.addEventListener('resize', function () { setTimeout(function () { align(0); }, 140); });
if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { align(0); });
})();
