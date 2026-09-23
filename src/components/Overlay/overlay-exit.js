/* ADAM/DS — src/components/Overlay/overlay-exit.js · exit-motion timing shared by every layer */
// Exports: exitMs(el) — longest transition on the layer in ms · afterExit(el, fn) — fn once the exit settles.
// [plan:2026-09-23_002500-design-system-consolidation.md#phase-4]
export function exitMs(el) {
  const list = (getComputedStyle(el).transitionDuration || "0s").split(",");
  let max = 0;
  list.forEach((v) => {
    const n = parseFloat(v) || 0;
    max = Math.max(max, v.includes("ms") ? n : n * 1000);
  });
  return Math.round(max);
}
export function afterExit(el, fn) {
  let done = false;
  const finish = () => {
    if (done) return;
    done = true;
    el.removeEventListener("transitionend", onEnd);
    fn();
  };
  const onEnd = (e) => {
    if (e.target === el) finish();
  };
  el.addEventListener("transitionend", onEnd);
  const ms = exitMs(el);
  if (ms <= 0) {
    finish();
    return;
  }
  setTimeout(finish, ms + 40);
}
