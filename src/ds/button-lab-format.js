/* ADAM/DS — src/ds/button-lab-format.js · pretty formatter · [plan:2026-09-21_000000-lump-sum-builds.md#phase-2] */
/* Exports: pretty — indented multi-line HTML for IDE readablity */

// — Section: pretty —
function blabPretty(cls, aria, hue, attrs, inner, label) {
  let a = [];
  a.push('class="' + cls.join(' ') + '"');
  if (aria) {
    const m = aria.trim().match(/[^\s=]+(?:="[^"]*")?/g);
    if (m) m.forEach((x) => a.push(x));
  }
  if (hue) {
    const m = hue.trim().match(/[^\s=]+(?:="[^"]*")?/g);
    if (m) m.forEach((x) => a.push(x));
  }
  if (attrs) {
    const m = attrs.trim().match(/[^\s=]+(?:="[^"]*")?/g);
    if (m) m.forEach((x) => a.push(x));
  }
  let s = '<button\n';
  a.forEach((x, i) => {
    const last = i === a.length - 1;
    s += '  ' + x + (last ? '>\n' : '\n');
  });
  let innerRaw = inner.replace('{{LABEL}}', label);
  innerRaw = innerRaw.replace(/\saria-hidden="[^"]*"/g, '');
  if (innerRaw) {
    const toks = innerRaw.match(/<[^>]+>|[^<]+/g) || [];
    for (let i = 0; i < toks.length; i++) {
      let v = toks[i].trim();
      if (!v) continue;
      if (v.startsWith('<') && !v.startsWith('</')) {
        const nxt = toks[i + 1] ? toks[i + 1].trim() : '';
        const nxt2 = toks[i + 2] ? toks[i + 2].trim() : '';
        if (nxt.startsWith('</')) {
          const on = v.match(/^<([a-z0-9-]+)/i);
          const cn = nxt.match(/^<\/([a-z0-9-]+)/i);
          if (on && cn && on[1] === cn[1]) {
            v = v + nxt;
            i++;
          }
        } else if (nxt && !nxt.startsWith('<') && nxt2.startsWith('</')) {
          const on = v.match(/^<([a-z0-9-]+)/i);
          const cn = nxt2.match(/^<\/([a-z0-9-]+)/i);
          if (on && cn && on[1] === cn[1]) {
            v = v + nxt + nxt2;
            i += 2;
          }
        }
      }
      s += '  ' + v + '\n';
    }
  }
  s += '</button>';
  return s;
}
if (typeof window !== 'undefined') {
  window.blabPretty = blabPretty;
}
