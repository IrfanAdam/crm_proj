/* ADAM/SHARED — src/logic/time-scale.js · global animation slow-mo (debug) */
// Export map: getScale · setScale · scaled · track · later · resync
let scale = 1;
const live = new Set();
const clamp = (v) => Math.min(Math.max(v, 0.05), 1);
const apply = (a) => {
  try {
    a.playbackRate = scale;
  } catch (e) {}
};
export const getScale = () => scale;
export function resync() {
  try {
    document.getAnimations({ subtree: true }).forEach(apply);
  } catch (e) {}
  live.forEach(apply);
}
export function setScale(v) {
  scale = clamp(Number(v) || 1);
  resync();
  return scale;
}
export const scaled = (ms) => ms / scale;
export function track(a) {
  if (!a) return a;
  apply(a);
  live.add(a);
  const drop = () => live.delete(a);
  if (a.finished) a.finished.then(drop, drop);
  return a;
}
export function later(fn, ms) {
  return setTimeout(fn, scaled(ms));
}
// — every WAAPI animation rides the scale: no call-site edits needed —
if (!Element.prototype.animate.__slowmo) {
  const orig = Element.prototype.animate;
  const hooked = function (kf, opts) {
    return track(orig.call(this, kf, opts));
  };
  hooked.__slowmo = true;
  Element.prototype.animate = hooked;
}
// — taps start CSS transitions after the sweep: re-apply on every press —
window.addEventListener("pointerdown", () => resync(), { capture: true, passive: true });
// — tiles/fades added mid-sequence start at 1× until swept: watch and re-apply —
let queued = false;
const watch = new MutationObserver(() => {
  if (queued || scale === 1) return;
  queued = true;
  requestAnimationFrame(() => {
    queued = false;
    resync();
  });
});
watch.observe(document.documentElement, { childList: true, subtree: true });
