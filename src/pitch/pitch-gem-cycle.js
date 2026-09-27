/* ADAM/PAGE — src/pitch/pitch-gem-cycle.js · hero stone variant crossfade */
// [plan:2026-09-21_000000-lump-sum-builds.md#phase-7] · next variant dissolves over live one.
// Export map: VARIANTS order · overlap swap, never blank · reduced-motion/hidden skip.
(function () {
var VARIANTS = ['sapphire', 'amethyst', 'redberyl', 'citrine'];
var DWELL = 3000;
var DISSOLVE = 700;
var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
function schedule(canvas, i) {
  setTimeout(function () { next(canvas, i); }, DWELL);
}
function next(canvas, i) {
  if (reduce || document.hidden || !canvas.isConnected || !canvas.offsetParent) {
    schedule(canvas, i);
    return;
  }
  var fresh = document.createElement('canvas');
  Array.prototype.forEach.call(canvas.attributes, function (a) {
    if (a.name === 'data-gem' || a.name === 'data-gem-done') return;
    fresh.setAttribute(a.name, a.value);
  });
  fresh.dataset.gem = VARIANTS[(i + 1) % VARIANTS.length];
  fresh.classList.add('pitch-gem__canvas--next');
  fresh.style.opacity = '0';
  canvas.parentNode.appendChild(fresh);
  requestAnimationFrame(function () { fresh.style.opacity = '1'; });
  setTimeout(function () {
    if (!canvas.isConnected) return;
    canvas.parentNode.replaceChild(fresh, canvas);
    fresh.classList.remove('pitch-gem__canvas--next');
    fresh.style.opacity = '';
    schedule(fresh, i + 1);
  }, DISSOLVE);
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
