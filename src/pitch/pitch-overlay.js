/* ADAM/SHARED — src/pitch/pitch-overlay.js · fullscreen pitch overlay */
// [plan:2026-09-21_000000-lump-sum-builds.md#phase-7] · open/close + ?pitch link.
// Export map: open/close overlay · Esc + ?pitch=1 deep link · lazy iframe src.
// — Section: refs —
var overlay = document.querySelector('#pitch-overlay');
var frame = document.querySelector('#pitch-frame');
var closeBtn = document.querySelector('#pitch-close');
var KEY = 'pitch';
// — Section: open/close —
function open() {
  if (!overlay) return;
  if (frame && !frame.src) frame.src = frame.dataset.src;
  overlay.hidden = false;
  document.body.classList.add('pitch-open');
  var u = new URL(location.href);
  u.searchParams.set(KEY, '1');
  history.replaceState(null, '', u);
  if (closeBtn) closeBtn.focus();
}
function close() {
  if (!overlay || overlay.hidden) return;
  overlay.hidden = true;
  document.body.classList.remove('pitch-open');
  var u = new URL(location.href);
  u.searchParams.delete(KEY);
  history.replaceState(null, '', u.pathname + u.search + u.hash);
}
// — Section: wire —
document.addEventListener('click', function (e) {
  if (e.target.closest('[data-open-pitch]')) { e.preventDefault(); open(); }
});
if (closeBtn) closeBtn.addEventListener('click', close);
window.addEventListener('keydown', function (e) {
  if (e.key === 'Escape' && overlay && !overlay.hidden) close();
});
window.addEventListener('popstate', function () {
  if (!new URL(location.href).searchParams.has(KEY)) close();
});
if (new URL(location.href).searchParams.get(KEY) === '1') open();
// — Section: framed close (masthead ✕ posts from inside the iframe) —
window.addEventListener('message', function (e) {
  if (e.data === 'alphagems:close-pitch') close();
});
