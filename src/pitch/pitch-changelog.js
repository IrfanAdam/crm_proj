/* ADAM/PAGE — src/pitch/pitch-changelog.js · boot: mount pages-changelog into pitch shell */
/* [plan:2026-09-28_000000-lump-sum-builds.md#phase-1] · state machine parity with reference */
import { render, mount } from './pages-changelog.js';
// TEMP-DEBUG sh3: surface runtime errors on-page (no console access on user Safari). Revert after root-cause.
window.addEventListener('error', (e) => {
  const d = document.createElement('div');
  d.setAttribute('style', 'position:fixed;left:8px;bottom:8px;z-index:99999;background:#400;color:#fff;font:11px/1.4 monospace;padding:6px 8px;max-width:92vw;white-space:pre-wrap');
  d.textContent = 'ERR: ' + (e.message || e.error) + ' @' + String(e.filename || '').split('/').pop() + ':' + e.lineno;
  document.body.appendChild(d);
});
window.addEventListener('unhandledrejection', (e) => {
  const d = document.createElement('div');
  d.setAttribute('style', 'position:fixed;left:8px;bottom:8px;z-index:99999;background:#400;color:#fff;font:11px/1.4 monospace;padding:6px 8px;max-width:92vw;white-space:pre-wrap');
  d.textContent = 'REJ: ' + (e.reason && e.reason.message ? e.reason.message : e.reason);
  document.body.appendChild(d);
});
const root = document.getElementById('cl-root');
root.innerHTML = render();
const teardown = mount(root);
// deep links ?day= & tag via URL kept for compat — reference handles via state, not URL
try {
  const q = new URLSearchParams(location.search);
  const d = q.get('day');
  if (d) {
    const btn = root.querySelector(`[data-day="${d}"]`);
    if (btn) btn.click();
  }
  const sha = q.get('sha');
  if (sha) {
    // open the plan whose badge contains this sha after paint
    requestAnimationFrame(() => {
      const link = root.querySelector(`a[href*="${sha.slice(0,7)}"]`);
      if (link) {
        const pick = link.closest('.ds-pick');
        if (pick) pick.click();
      }
    });
  }
} catch {}
