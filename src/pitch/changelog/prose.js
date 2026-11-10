/* ADAM/DS — ds/changelog/prose · reflow hard-wrapped plan prose into one bullet per point.
   Plan bodies wrap mid-sentence, so lines join back into blocks; a **Label:** line
   always starts a new block, and a fenced run becomes a real code block (never a bullet). */
const LABEL = /^\*\*([^*]+:)\*\*\s*/;
const QUOTE = /^&gt;\s?/;
const FENCE = /^```/;
const blocks = (lines) => {
  const out = [];
  let code = null;
  for (const raw of lines) {
    const line = raw.replace(QUOTE, '');
    if (FENCE.test(line)) { if (code) { out.push({ code: code.join('\n') }); code = null; } else code = []; continue; }
    if (code) { code.push(line); continue; }
    const starts = LABEL.test(line);
    const prev = out[out.length - 1];
    if (!starts && prev && prev.text !== undefined) prev.text += ' ' + line.trim();
    else out.push({ text: line.trim() });
  }
  if (code) out.push({ code: code.join('\n') });
  return out;
};
export const bullets = (lines, inline) => {
  const out = [];
  let buf = [];
  const flush = () => { if (buf.length) { out.push(`<ul class="ds-bullets">${buf.join('')}</ul>`); buf = []; } };
  for (const b of blocks(lines)) {
    if (b.code !== undefined) { flush(); out.push(`<pre><code>${b.code}</code></pre>`); continue; }
    const m = b.text.match(LABEL);
    buf.push(`<li>${m ? `<span class="ds-b-t">${m[1]}</span> ` : ''}${inline(m ? b.text.slice(m[0].length) : b.text)}</li>`);
  }
  flush();
  return out.join('');
};
