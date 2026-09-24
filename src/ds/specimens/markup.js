/* ADAM/DS — src/ds/specimens/markup.js · code entry · [plan:2026-09-21_000000-lump-sum-builds.md#phase-2] */
/* Single entry: all specimens call code() — no direct ds-code elsewhere */

import { highlight } from '../code-highlight.js';

// — Section: code —
export const code = (s, lang) => {
  const l = lang || 'html';
  return '<div class="ds-code" data-lang="' + l + '"><pre><code class="hl">' + highlight(s) + '</code></pre></div>';
};
