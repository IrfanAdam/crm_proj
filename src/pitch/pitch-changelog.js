/* ADAM/PAGE — src/pitch/pitch-changelog.js · boot: mount pages-changelog into pitch shell */
/* [plan:2026-09-28_000000-lump-sum-builds.md#phase-1] · state machine parity with reference */
import { render, mount } from './pages-changelog.js';
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
