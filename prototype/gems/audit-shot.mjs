#!/usr/bin/env node
/* audit-shot.mjs — headless capture driver for the round-10 gem audit (Phase 10 Task 21).
 * 9 rubric roles + 12 photo cells, canvas pinned 510x223 CSS px, pose read back into
 * meta.json, non-zero exit on any pose mismatch or missing clip. Ports
 * .hermes/tmp/r10/photo/lane-shot.mjs (tilt/spin frozen through the drag-pose path).
 *   node prototype/gems/audit-shot.mjs --port 5181 --out DIR [--stone sapphire,citrine]
 *        [--mode rubric|photo|all] [--roles front,txoff] [--cells "-0.55@0,0@35"] [--tries 3]
 * Out: DIR/rubric/<stone>/<role>.png + meta.json · DIR/photo/<stone>/t<tilt>-s<spin>.png + .meta.json
 */
import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync, copyFileSync, existsSync, readFileSync, rmSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ROLES, CELLS, evalFor, poseCheck } from './audit-shot-eval.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const arg = (n, d) => { const i = process.argv.indexOf('--' + n); return i < 0 ? d : process.argv[i + 1]; };
const ROOT = path.resolve(arg('root', path.join(HERE, '../..')));
const THR = JSON.parse(readFileSync(arg('thresholds', path.join(HERE, 'audit-thresholds.json')), 'utf8'));
const BASE = arg('base', 'http://127.0.0.1:' + arg('port', '5181'));
const OUT = path.resolve(arg('out', path.join(ROOT, '.hermes/tmp/r10-audit')));
const MODE = arg('mode', 'all');
const STONES = arg('stone', 'sapphire,citrine').split(',');
const ONLY_ROLES = arg('roles', '').split(',').filter(Boolean);
const ONLY_CELLS = arg('cells', '').split(',').filter(Boolean).map((s) => s.split('@').map(Number));
const TRIES = Number(arg('tries', '5'));
const TAG = { 0: '0', 0.55: '055', '-0.55': 'm055' };

const runShot = (dest, expr) => new Promise((resolve) => {
  const work = dest + '.work';
  rmSync(work, { recursive: true, force: true });
  mkdirSync(work, { recursive: true });
  const p = spawn(process.execPath, [path.join(ROOT, 'prototype/gems/gem-shot.mjs'),
    BASE + THR.capture.url_path, work, '--scale', String(THR.capture.scale), '--wait', '6000',
    '--size', `${THR.capture.viewport.w}x${THR.capture.viewport.h}`, '--clip', THR.capture.clip,
    '--eval', expr], { cwd: ROOT, detached: true, stdio: ['ignore', 'pipe', 'pipe'] });
  let out = '', err = '';
  p.stdout.on('data', (d) => (out += d)); p.stderr.on('data', (d) => (err += d));
  const done = (code) => {
    clearTimeout(timer);
    try { process.kill(-p.pid, 'SIGKILL'); } catch { /* group already gone */ }
    const clip = path.join(work, 'clip-0.png'), ok = existsSync(clip);
    if (ok) copyFileSync(clip, dest);
    rmSync(work, { recursive: true, force: true });
    let meta = null; try { const i = out.indexOf('{'); meta = JSON.parse(JSON.parse(out.slice(i)).fps); } catch { meta = null; }
    resolve({ ok, meta, code, err: (err || '').slice(0, 300) });
  };
  const timer = setTimeout(() => { try { process.kill(-p.pid, 'SIGKILL'); } catch { } }, 240000);
  p.on('close', done);
});

const jobs = [];
const wantCell = (c) => !ONLY_CELLS.length || ONLY_CELLS.some(([t, s]) => t === c.tilt && s === c.spin);
if (MODE !== 'photo') for (const stone of STONES) for (const role of ROLES)
  if (!ONLY_ROLES.length || ONLY_ROLES.includes(role))
    jobs.push({ kind: 'rubric', stone, role, tilt: THR.capture.pose.rubric.tilt, spin: THR.capture.pose.rubric.spin_deg });
if (MODE !== 'rubric') for (const stone of STONES) for (const c of CELLS)
  if (wantCell(c)) jobs.push({ kind: 'photo', stone, role: 'cell', tilt: c.tilt, spin: c.spin });

mkdirSync(OUT, { recursive: true });
const rows = [];
for (const j of jobs) {
  const dir = path.join(OUT, j.kind === 'rubric' ? 'rubric' : 'photo', j.stone);
  mkdirSync(dir, { recursive: true });
  const name = j.kind === 'rubric' ? j.role : `t${TAG[j.tilt]}-s${j.spin}`;
  const dest = path.join(dir, name + '.png');
  let rec = null;
  for (let a = 1; a <= TRIES; a++) {
    const t0 = Date.now();
    const res = await runShot(dest, evalFor({ stone: j.stone, role: j.role, tilt: j.tilt, spin: j.spin }));
    const pose = poseCheck(res.meta, j.tilt, j.spin, THR);
    rec = { ...j, name, file: res.ok ? dest : null, attempt: a, secs: +((Date.now() - t0) / 1000).toFixed(1),
      pose, stderr: res.err || null };
    if (!res.ok) { await new Promise((r) => setTimeout(r, 3000)); continue; }
    if (j.kind === 'photo') {
      writeFileSync(path.join(dir, name + '.meta.json'), JSON.stringify({ ...rec.meta, ...pose }, null, 1) + '\n');
    } else {
      const mp = path.join(dir, 'meta.json');
      const base = existsSync(mp) ? JSON.parse(readFileSync(mp, 'utf8')) : { url: BASE + THR.capture.url_path,
        stone: j.stone, canvas: { w: THR.capture.canvas.w, h: THR.capture.canvas.h }, shots: {} };
      base.canvas = { ...base.canvas, w: pose.canvas.w, h: pose.canvas.h };
      base.shots[j.role] = { file: dest, pose };
      writeFileSync(mp, JSON.stringify(base, null, 1) + '\n');
    }
    break;
  }
  rows.push(rec);
  console.log('[audit-shot]', JSON.stringify({ kind: j.kind, stone: j.stone, name, ok: !!rec.file,
    pose_ok: rec.pose.ok, pose: rec.pose.ok ? `${rec.pose.rotation_x}/${rec.pose.rotation_y}` : rec.pose.why,
    secs: rec.secs }));
}
writeFileSync(path.join(OUT, 'shots.json'), JSON.stringify(rows, null, 1) + '\n');
const bad = rows.filter((r) => !r.file || !r.pose.ok);
console.log(`DONE ${rows.length - bad.length}/${rows.length} cells captured with a matching pose stamp`);
if (bad.length) {
  for (const r of bad) console.error('BAD', r.stone, r.name, r.pose.ok ? 'no clip' : r.pose.why);
  process.exit(2);
}
