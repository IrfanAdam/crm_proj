#!/usr/bin/env node
/* plan-auto-link — commit-msg helper: every commit cites its plan without asking.
   Usage: node scripts/plan-auto-link.mjs <msg-file>   (from .git/hooks/commit-msg)
          node scripts/plan-auto-link.mjs --install    (writes .git/hooks/commit-msg)
   Tagged subjects and merges pass through untouched; see plan-link-resolve.mjs. */
import fs from 'fs';
import { execSync } from 'child_process';
import { root } from './plan-link-resolve.mjs';
import { resolvePlan } from './plan-link-resolve.mjs';
import { join } from 'path';
function install() {
  const hook = join(root, '.git', 'hooks', 'commit-msg');
  fs.writeFileSync(hook, `#!/bin/sh\n# auto-tag every commit with its plan (plan-auto-link — no ask)\nnode scripts/plan-auto-link.mjs "$1" || true\n`, { mode: 0o755 });
  try { execSync(`chmod +x ${JSON.stringify(hook)}`); } catch {}
  console.log(`installed ${hook}`);
}
function main() {
  const arg = process.argv[2];
  if (arg === '--install') { install(); return; }
  if (!arg) { console.error('usage: plan-auto-link.mjs <msg-file> | --install'); process.exit(1); }
  let msg = '';
  try { msg = fs.readFileSync(arg, 'utf8'); } catch { return; }
  const lines = msg.split('\n');
  const idx = lines.findIndex((l) => l.trim() !== '' && !l.startsWith('#'));
  if (idx === -1) return;
  const subject = lines[idx];
  if (/\[plan:/.test(subject) || /^Merge\s/.test(subject)) return;
  const hit = resolvePlan();
  if (!hit) return;
  lines[idx] = `${subject.trim()} [plan:${hit.plan}#${hit.anchor}]`;
  fs.writeFileSync(arg, lines.join('\n'));
  console.log(`auto-link: [plan:${hit.plan}#${hit.anchor}]`);
}
main();
