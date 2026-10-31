/* ADAM/DS — ds/changelog/due-core · shared due matcher + section edit.
   Single source for client preview, dev write endpoint, and serverless commit —
   never duplicate normalize/resolve/apply (whitespace drift = head-not-found). */
export const normalizeHead = (s) => String(s || '').replace(/\s+/g, ' ').trim();
export const DUE_RE = /^Due:\s*(20\d{2}-\d{2}-\d{2})\s*$/m;
export const dueOf = (body) => (String(body).match(DUE_RE) || [])[1] || '';
// Exact head first, then single-candidate fuzzy (contains either way, case-insensitive).
// Zero or 2+ candidates = '' (caller reports head-not-found, never guesses).
export const resolveHead = (md, head) => {
  const want = normalizeHead(head);
  if (!want) return '';
  const heads = [];
  for (const ln of String(md).split('\n')) if (/^## /.test(ln)) heads.push(ln.slice(3).trim());
  if (heads.includes(want)) return want;
  const wl = want.toLowerCase();
  const cands = heads.filter((h) => { const hl = h.toLowerCase(); return hl.includes(wl) || wl.includes(hl); });
  return cands.length === 1 ? cands[0] : '';
};
// Insert, replace, or (due '') clear a `Due: YYYY-MM-DD` line directly under the head.
// Returns the new markdown, or null when the head is not found.
export const applyDueEdit = (md, head, due) => {
  const lines = String(md).split('\n');
  const want = normalizeHead(head);
  const idx = lines.findIndex((l) => /^## /.test(l) && normalizeHead(l.slice(3)) === want);
  if (idx < 0) return null;
  const j = idx + 1;
  const has = j < lines.length && /^Due:\s*20\d{2}-\d{2}-\d{2}\s*$/.test(lines[j]);
  if (!due) { if (has) lines.splice(j, 1); return lines.join('\n'); }
  if (has) lines[j] = `Due: ${due}`;
  else lines.splice(j, 0, `Due: ${due}`);
  return lines.join('\n');
};
