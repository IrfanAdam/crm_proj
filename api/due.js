// api/due.js — Vercel serverless plan-Due commit endpoint (Phase 5, Task 20).
//
// The caller's read:user OAuth token is identity proof ONLY (never a writer).
// The write-capable fine-grained PAT lives only in Vercel env (DUE_TOKEN),
// never in code or the browser. One change = one commit to main (redeploys).
//
// Required Vercel env:
//   DUE_TOKEN   — fine-grained PAT, Contents read+write, this repo only
//   DUE_AUTHOR  — GitHub login allow-list, comma-separated (e.g. "IrfanAdam")
//   DUE_REPO    — "owner/repo" (e.g. "IrfanAdam/crm_proj")
//   DUE_BRANCH  — target branch (default "main")
//
// Body: { file, head, due } — same shape as POST /__ds/due. Filenames locked
// to plan files (no paths/traversal); due is YYYY-MM-DD or '' to clear.
// Shares due-core.js resolution (normalize → exact → single-candidate fuzzy)
// so server anchor lookup never diverges from the client preview.
import { normalizeHead, resolveHead, applyDueEdit } from '../src/pitch/changelog/due-core.js';

const PLAN_RE = /^\d{4}-\d{2}-\d{2}[_-].+\.md$/;
const DUE_RE = /^(20\d{2}-\d{2}-\d{2})?$/;
const send = (res, code, obj) => {
  res.statusCode = code;
  res.setHeader('content-type', 'application/json');
  res.end(JSON.stringify(obj));
};

export default async function handler(req, res) {
  if (req.method !== 'POST') return send(res, 405, { ok: false, error: 'method' });
  const { file = '', head = '', due = '', token = '' } = req.body || {};
  if (file.includes('..') || file.includes('/') || !PLAN_RE.test(file) || !DUE_RE.test(due)) {
    return send(res, 400, { ok: false, error: 'shape' });
  }
  const authors = String(process.env.DUE_AUTHOR || '').split(',').map((s) => s.trim().toLowerCase()).filter(Boolean);
  const repo = process.env.DUE_REPO || '';
  const branch = process.env.DUE_BRANCH || 'main';
  if (!process.env.DUE_TOKEN || !authors.length || !repo) {
    return send(res, 500, { ok: false, error: 'server-misconfigured' });
  }
  // 1) caller identity (read-only token, login allow-list)
  let login = '';
  try {
    const me = await fetch('https://api.github.com/user', {
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json' },
    });
    if (!me.ok) return send(res, 401, { ok: false, error: 'auth' });
    login = String((await me.json()).login || '').toLowerCase();
  } catch {
    return send(res, 502, { ok: false, error: 'auth-unreachable' });
  }
  if (!authors.includes(login)) return send(res, 403, { ok: false, error: 'forbidden' });
  // 2) read current file (server-side PAT)
  const gh = { Authorization: `Bearer ${process.env.DUE_TOKEN}`, Accept: 'application/vnd.github+json' };
  const path = `.hermes/plans/${file}`;
  let sha = '';
  let md = '';
  try {
    const cur = await fetch(`https://api.github.com/repos/${repo}/contents/${path}?ref=${branch}`, { headers: gh });
    if (cur.status === 404) return send(res, 404, { ok: false, error: 'head-not-found' });
    if (!cur.ok) return send(res, 502, { ok: false, error: 'read-failed' });
    const data = await cur.json();
    sha = data.sha;
    md = Buffer.from(data.content || '', 'base64').toString('utf8');
  } catch {
    return send(res, 502, { ok: false, error: 'read-failed' });
  }
  // 3) resolve via the SHARED core (post-resolution canonical key threads onward)
  const canon = resolveHead(md, normalizeHead(head));
  if (!canon) return send(res, 404, { ok: false, error: 'head-not-found' });
  const next = applyDueEdit(md, canon, due);
  if (next === null) return send(res, 404, { ok: false, error: 'head-not-found' });
  if (next === md) return send(res, 200, { ok: true, head: canon, unchanged: true, content: md });
  // 4) single commit to main
  try {
    const put = await fetch(`https://api.github.com/repos/${repo}/contents/${path}`, {
      method: 'PUT',
      headers: gh,
      body: JSON.stringify({
        message: `chore(schedule): due ${due || 'cleared'} — ${file} :: ${canon}`,
        content: Buffer.from(next, 'utf8').toString('base64'),
        sha,
        branch,
      }),
    });
    if (put.status === 409 || put.status === 422) return send(res, 409, { ok: false, error: 'race-retry' });
    if (!put.ok) return send(res, 502, { ok: false, error: `github-write-${put.status}` });
    const saved = await put.json();
    return send(res, 200, { ok: true, head: canon, content: next, sha: saved?.content?.sha || '' });
  } catch {
    return send(res, 502, { ok: false, error: 'write-failed' });
  }
}
