/* Mobile launcher -> fullscreen prototype. Left panel acts as launcher:
   tap Open (or ?app=fullscreen link) for a chromeless responsive render. */
const openBtn = document.querySelector('#open-fullscreen');
const exitBtn = document.querySelector('#exit-fullscreen');
const KEY = 'app';
function enter() {
  document.body.classList.add('app-fullscreen');
  const u = new URL(location.href);
  u.searchParams.set(KEY, 'fullscreen');
  history.replaceState(null, '', u);
  window.scrollTo(0, 0);
}
function exit() {
  document.body.classList.remove('app-fullscreen', 'show-exit');
  const u = new URL(location.href);
  u.searchParams.delete(KEY);
  history.replaceState(null, '', u.pathname + u.search + u.hash);
}
/* 3-finger tap-and-hold reveals the floating exit pill (auto-hides).
   A quick 3-finger double-tap does the same — no motionless hold needed. */
let holdTimer = 0, hideTimer = 0, startXY = null, lastTriple = 0;
function showExit() {
  holdTimer = 0;
  document.body.classList.add('show-exit');
  clearTimeout(hideTimer);
  hideTimer = setTimeout(() => document.body.classList.remove('show-exit'), 4000);
}
window.addEventListener('touchstart', (e) => {
  if (!document.body.classList.contains('app-fullscreen') || e.touches.length !== 3) return;
  const now = performance.now();
  if (now - lastTriple < 350) { lastTriple = 0; clearTimeout(holdTimer); holdTimer = 0; showExit(); return; }
  lastTriple = now;
  const t = e.touches[0];
  startXY = [t.clientX, t.clientY];
  clearTimeout(holdTimer);
  holdTimer = setTimeout(showExit, 600);
}, { passive: true });
window.addEventListener('touchmove', (e) => {
  if (!holdTimer || !startXY) return;
  const t = e.touches[0];
  if (e.touches.length !== 3 || Math.hypot(t.clientX - startXY[0], t.clientY - startXY[1]) > 12) {
    clearTimeout(holdTimer);
    holdTimer = 0;
  }
}, { passive: true });
const cancelHold = () => { clearTimeout(holdTimer); holdTimer = 0; };
window.addEventListener('touchend', cancelHold);
window.addEventListener('touchcancel', cancelHold);
openBtn?.addEventListener('click', enter);
exitBtn?.addEventListener('click', exit);
window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && document.body.classList.contains('app-fullscreen')) exit();
});
window.addEventListener('popstate', () => {
  if (!new URL(location.href).searchParams.has(KEY)) exit();
});
if (new URL(location.href).searchParams.get(KEY) === 'fullscreen') enter();
/* Service worker (installability only) — skipped off secure contexts. */
if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1')) {
  navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch(() => {});
}
