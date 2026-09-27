/* ADAM/PAGE — src/pitch/pitch-gem-cycle.js · hero stone variant rotator */
// [plan:2026-09-21_000000-lump-sum-builds.md#phase-7] · cycles data-gem per dwell.
// Export map: VARIANTS order · fade swap · reduced-motion/hidden skip.
(function () {
var VARIANTS = ['sapphire', 'amethyst', 'redberyl', 'citrine'];
var DWELL = 3000;
var FADE = 480;
var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
function schedule(canvas, i) {
  setTimeout(function () { next(canvas, i); }, DWELL);
}
function next(canvas, i) {
  if (reduce || document.hidden || !canvas.isConnected || !canvas.offsetParent) {
    schedule(canvas, i);
    return;
  }
  canvas.style.opacity = '0';
  setTimeout(function () {
    if (!canvas.isConnected) return;
    var fresh = document.createElement('canvas');
    Array.prototype.forEach.call(canvas.attributes, function (a) {
      if (a.name === 'data-gem' || a.name === 'data-gem-done') return;
      fresh.setAttribute(a.name, a.value);
    });
    fresh.dataset.gem = VARIANTS[(i + 1) % VARIANTS.length];
    fresh.style.opacity = '0';
    canvas.parentNode.replaceChild(fresh, canvas);
    setTimeout(function () { fresh.style.opacity = '1'; }, 60);
    schedule(fresh, i + 1);
  }, FADE);
}
function boot() {
  var canvas = document.querySelector('.pitch-gem__canvas[data-gem]');
  if (!canvas || canvas.dataset.cycling || reduce) return;
  canvas.dataset.cycling = '1';
  schedule(canvas, VARIANTS.indexOf(canvas.dataset.gem));
}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
else boot();
document.addEventListener('ds:doc', boot);
})();
