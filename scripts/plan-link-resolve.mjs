/* plan-link-resolve — pick the [plan:file#anchor] an untrailed commit should cite.
   Order: staged plan file → history vote (recent commits touching the same staged
   files) → newest plan file. Single-digit phases cite #{#phase-N}. */
import fs from 'fs';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
export const root = join(dirname(fileURLToPath(import.meta.url)), '..');
export const plansDir = join(root, '.hermes', 'plans');
export const brace = (a) => /^phase-\d$/.test(a) ? `{#${a}}` : a;
export const anchorOf = (file) => { try { return pickAnchor(fs.readFileSync(join(plansDir, file), 'utf8')); } catch { return null; } };
export function stagedFiles() {
  try { return execSync('git diff --cached --name-only', { encoding: 'utf8', cwd: root }).split('\n').map((s) => s.trim()).filter(Boolean); }
  catch { return []; }
}
export function planFromStagedPlans(files) {
  const mine = files.filter((f) => f.startsWith('.hermes/plans/') && f.endsWith('.md'));
  if (!mine.length) return null;
  const mtime = (f) => { try { return fs.statSync(join(root, f)).mtimeMs; } catch { return 0; } };
  return mine.sort((a, b) => mtime(b) - mtime(a))[0].split('/').pop();
}
export function planFromHistory(files) {
  const mine = files.filter((f) => !f.startsWith('.hermes/plans/'));
  if (!mine.length) return null;
  let out = '';
  try { out = execSync(`git log -8 --format=%s -- ${mine.map((f) => JSON.stringify(f)).join(' ')}`, { encoding: 'utf8', cwd: root }); }
  catch { return null; }
  const votes = new Map();
  for (const line of out.split('\n')) {
    const m = line.match(/\[plan:([^\]#\s]+)(?:#([^\]]+))?\]/);
    if (!m) continue;
    const anchor = (m[2] || '').replace(/^\{\#|^\#|\}$/g, '');
    if (!anchor) continue;
    const key = `${m[1]}#${anchor}`;
    votes.set(key, (votes.get(key) || 0) + 1);
  }
  if (!votes.size) return null;
  const [plan, anchor] = [...votes.entries()].sort((a, b) => b[1] - a[1])[0][0].split('#');
  return { plan, anchor: brace(anchor) };
}
export function newestPlan() {
  let best = null;
  let files = [];
  try { files = fs.readdirSync(plansDir).filter((f) => f.endsWith('.md')); } catch { return null; }
  for (const f of files) {
    let st = null;
    try { st = fs.statSync(join(plansDir, f)); } catch { continue; }
    if (!best || st.mtimeMs > best.mtimeMs) best = { file: f, mtimeMs: st.mtimeMs };
  }
  return best ? best.file : null;
}
export function pickAnchor(md) {
  const phases = [];
  let cur = null;
  for (const line of md.split('\n')) {
    const hm = line.match(/^##\s+.*?(?:\{#(phase-[\w-]+)\}|\(#(phase-[\w-]+)\))/);
    if (hm) { cur = { anchor: hm[1] || hm[2], open: 0, tasks: 0 }; phases.push(cur); continue; }
    if (/^###\s+Task\b/.test(line) && cur) { cur.tasks++; if (!/✓\s*done/i.test(line)) cur.open++; }
  }
  if (!phases.length) return null;
  return brace((phases.find((p) => p.tasks > 0 && p.open > 0) || phases[phases.length - 1]).anchor);
}
export function resolvePlan() {
  const staged = stagedFiles();
  const mine = planFromStagedPlans(staged);
  if (mine) { const a = anchorOf(mine); if (a) return { plan: mine, anchor: a }; }
  const vote = planFromHistory(staged);
  if (vote) return vote;
  const plan = newestPlan();
  if (!plan) return null;
  const anchor = anchorOf(plan);
  return anchor ? { plan, anchor } : null;
}
