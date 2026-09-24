/* ADAM/DS — src/ds/code-highlight.js · mono highlight · [plan:2026-09-21_000000-lump-sum-builds.md#phase-2] */
/* Exports: highlight, codeBlock — single highlight path for every specimen */

// — Section: highlight —

export function highlight(src) {
  let s = src;
  s = s.replace(/&/g, '&amp;');
  s = s.replace(/</g, '&lt;');
  s = s.replace(/>/g, '&gt;');
  const stash = [];
  const hold = (txt, cls) => {
    stash.push('<span class="' + cls + '">' + txt + '</span>');
    return '§HL' + (stash.length - 1) + '§';
  };
  s = s.replace(/"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'/g, (m) => hold(m, 'hl-str'));
  s = s.replace(/\/\/.*$|\/\*[\s\S]*?\*\/|&lt;!--[\s\S]*?--&gt;/gm, (m) => hold(m, 'hl-comm'));
  s = s.replace(/--[a-z0-9-]+/gi, (m) => hold(m, 'hl-var'));
  s = s.replace(/&lt;\/?[a-zA-Z][\w-]*\b[^]*?&gt;/g, (m) => {
    let t = m;
    t = t.replace(/\s([a-zA-Z_:][\w:.-]*)(?=\s*=)/g, (a, n) => ' <span class="hl-attr">' + n + '</span>');
    return hold(t, 'hl-tag');
  });
  s = s.replace(/\b(?:const|let|var|function|return|import|export|class)\b/g, (m) => hold(m, 'hl-kw'));
  s = s.replace(/\b(?:if|else|for|while|async|await|new|try|catch)\b/g, (m) => hold(m, 'hl-kw'));
  s = s.replace(/\b\d+(?:\.\d+)?(?:px|rem|em|%|ch|vw|vh|ms|s)?\b/g, (m) => hold(m, 'hl-num'));
  s = s.replace(/[{}();:,=]/g, (m) => hold(m, 'hl-punct'));
  for (let i = stash.length - 1; i >= 0; i--) {
    s = s.split('§HL' + i + '§').join(stash[i]);
  }
  return s;
}

// — Section: codeBlock —

export function codeBlock(src, lang) {
  const l = lang || 'html';
  return '<div class="ds-code" data-lang="' + l + '"><pre><code class="hl">' + highlight(src) + '</code></pre></div>';
}

// — Section: auto enhance static blocks —

function enhance(root) {
  const sel = 'code.tp-code, code[data-blab-code]';
  const nodes = (root || document).querySelectorAll(sel);
  nodes.forEach((el) => {
    if (el.dataset.hlDone) return;
    el.dataset.hlDone = '1';
    const raw = el.textContent;
    el.classList.add('hl');
    el.innerHTML = highlight(raw);
  });
}

function enhanceDsCode(root) {
  const nodes = (root || document).querySelectorAll('.ds-code code.hl');
  nodes.forEach((el) => {
    if (el.dataset.hlDone) return;
    el.dataset.hlDone = '1';
  });
}

if (typeof window !== 'undefined') {
  window.highlight = highlight;
  window.codeBlock = codeBlock;
  window.DSHighlight = { highlight, codeBlock };
}

if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => enhance(document));
  document.addEventListener('ds:doc', () => enhance(document));
}
