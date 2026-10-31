/* ADAM/DS — ds/changelog/paint-detail · rail + detail · [plan:2026-09-13_193000-refactor-manageability.md#phase-3] */
import { hits, badges, unlinked, orphans } from '../changelog-links.js';
import { dueFor, dueErr } from './due.js';
import { shortPhase as short, provenance, descOf, clip } from '../changelog-titles.js';
import { isDone, state, hash, planStatus, parseGates, fmtDate } from '../changelog-parse.js';
import { esc } from './esc.js';
import history from '../../../design-system/plan-history.json';

const marked = {
  parse(s){
    let src = String(s || '');
    // 1) strip {#anchor} before parse
    src = src.replace(/\s*\{#[^}]*\}/g, '');
    // 2) drop markdown tables (|...|)
    src = src.split('\n').filter((l)=>{
      const t = l.trim();
      if (!t) return true;
      if (/^Due:\s*20\d{2}-\d{2}-\d{2}\s*$/.test(t)) return false;
      if (t.startsWith('|')) return false;
      // table separator like | --- | --- | or ---|---
      if (t.includes('|') && /^[\s|:\-]+$/.test(t)) return false;
      return true;
    }).join('\n');
    // 3) remove inline ✓ done / ✗ cancelled duplication (checkbox already shows state)
    src = src.replace(/✓\s*done\s*[—–-]\s*/gi, '').replace(/✗\s*cancelled\s*[—–-]\s*/gi, '').replace(/[✓✗]\s*/g, (m)=> m.trim()==='✓' || m.trim()==='✗' ? '' : m);
    // clean up multiple spaces created
    // keep newlines intact for block parsing

    // escape before markdown transforms (escAll)
    let html = esc(src);

    // headings (must run on escaped text — # not escaped)
    html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
    html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>');
    html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>');

    // remove Tags line (both **Tags:** and *Tags:* forms)
    html = html.replace(/\*\*Tags:[^*]*\*\*/g, '');
    html = html.replace(/\*Tags:[^*]*\*/g, '');

    // shipped line -> <p><em>
    html = html.replace(/\*Shipped in [^*]*\*/g, (m)=> '<p><em>'+m.slice(1,-1)+'</em></p>');

    // split into lines for block-local list wrapping
    let lines = html.split('\n');

    // convert markdown list markers to <li> placeholders
    lines = lines.map((l)=>{
      if (/^- \[x\] /i.test(l)) return l.replace(/^- \[x\] /i, '<li><input type="checkbox" checked disabled> ');
      if (/^- \[ \] /.test(l)) return l.replace(/^- \[ \] /, '<li><input type="checkbox" disabled> ');
      if (/^- /.test(l)) return l.replace(/^- /, '<li>');
      return l;
    });
    // close li
    lines = lines.map((l)=> l.startsWith('<li>') ? l + '</li>' : l);

    // helper to apply inline transforms (bold, italic, links) to a fragment
    const inline = (t)=>{
      // render Objective inline: keep **Objective:** as <strong> inline (already)
      let r = t.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
      r = r.replace(/\*(.+?)\*/g, '<em>$1</em>');
      r = r.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');
      return r;
    };

    let out = [];
    let ulBuf = [];
    let paraBuf = [];
    const flushUl = ()=>{
      if (!ulBuf.length) return;
      out.push('<ul>'+ulBuf.join('')+'</ul>');
      ulBuf = [];
    };
    const flushPara = ()=>{
      if (!paraBuf.length) return;
      const raw = paraBuf.join(' ').replace(/\s+/g, ' ').trim();
      paraBuf = [];
      if (!raw) return;
      // raw may already be a block tag (should not happen as those lines are handled separately)
      if (/^<h[1-3]>/.test(raw) || /^<p><em>/.test(raw)) { out.push(inline(raw)); return; }
      const p = inline(raw);
      if (p) out.push('<p>'+p+'</p>');
    };

    for (const line of lines){
      const isLi = line.startsWith('<li>');
      const isBlock = /^<h[1-3]>/.test(line) || /^<p><em>/.test(line);
      const isEmpty = line.trim() === '';
      if (isLi){
        flushPara();
        ulBuf.push(inline(line));
      } else if (isBlock){
        flushUl();
        flushPara();
        if (!isEmpty) out.push(inline(line));
      } else if (isEmpty){
        flushUl();
        flushPara();
      } else {
        flushUl();
        // accumulate paragraph lines (Objective inline stays with its task line if that line was li, else here)
        paraBuf.push(line);
      }
    }
    flushUl();
    flushPara();
    return out.join('');
  }
};
function isEdited(planFile, head, body){
  const hist = history[planFile] || [];
  if(!hist.length) return false;
  const liveHash = hash(body);
  const hashes = new Set();
  let everFound = false;
  for(const e of hist){
    const sec = e.sections.find(x=>x.head===head);
    if(sec){ hashes.add(sec.hash); everFound=true; }
  }
  if(!everFound) return true;
  const earliestHas = hist[0].sections.some(x=>x.head===head);
  if(!earliestHas) return true;
  if(hashes.size>1) return true;
  if(!hashes.has(liveHash)) return true;
  return false;
}
// — Evals + commits panels (detail renderer only — norm()/hashes untouched).
// Gate thread lines are dropped from the markdown body and rendered here instead.
const GATE_THREAD = /^- .*REF GATE\s+0*\d+\b/;
const stripGateThread = (body) => String(body).split('\n').filter((l) => !GATE_THREAD.test(l)).join('\n');
const cleanEval = (line) => esc(line.replace(/^- /, '').replace(/\s*\{#.*$/, '').trim());
const renderEvals = (planFile, planDate, head, body) => {
  const g = parseGates(head, body);
  if (!g) return '';
  const entries = g.bases.map((t) => ({ date: firstGateDate(t) || planDate, kind: 'eval', text: cleanEval(t) }))
    .concat(g.revLines.map((t) => ({ date: firstGateDate(t) || planDate, kind: 'iter', text: cleanEval(t) })));
  if (!entries.length) return '';
  const byDate = {};
  entries.forEach((e) => { (byDate[e.date] = byDate[e.date] || []).push(e); });
  const dates = Object.keys(byDate).sort().reverse();
  const total = dates.length;
  const groups = dates.map((d, di) => {
    const rows = byDate[d];
    const dayN = total - di;
    const items = rows.map((r) => r.kind === 'eval'
      ? `<div class="ds-timeline-item ds-timeline-item--eval"><span>${r.text}</span></div>`
      : `<div class="ds-timeline-item ds-timeline-item--iter"><span>${r.text}</span><small>${esc(d)}</small></div>`).join('');
    return `<details class="ds-timeline-group" open><summary class="ds-timeline-date"><span class="ds-caret">‹›</span>Day ${dayN} · ${esc(fmtDate(d) || d)} · ${rows.length}</summary>${items}</details>`;
  }).join('');
  return `<details class="ds-panel" open><summary class="ds-panel-title"><span class="ds-caret">‹›</span>Evals · ${entries.length}</summary><div class="ds-timeline">${groups}</div></details>`;
};
const firstGateDate = (s) => ((s || '').match(/(20\d{2}-\d{2}-\d{2})/) || [])[1] || '';
const renderCommitsPanel = (hs, badgesHtml) => {
  if (!hs.length) return '';
  return `<details class="ds-panel" open><summary class="ds-panel-title"><span class="ds-caret">‹›</span>Commits · ${hs.length}</summary>${badgesHtml}</details>`;
};
const gateVerdictTag = (head, body) => {
  const g = parseGates(head, body);
  if (!g) return '';
  return g.verdict === 'passed' ? 'GATE PASSED' : g.verdict === 'failed' ? 'GATE FAILED' : 'GATE OPEN';
};
export function paintDetail(root, ctx){
  const { list, pi, plan, sprints, si, active, day, sel, open, counts, plans, texts } = ctx;
  const scrim = root.querySelector('[data-scrim]'), drawer = root.querySelector('[data-drawer]');
  const sprint = sprints[si], sprintDesc = (s) => descOf(s.body);
  const seq = String(list.length - pi).padStart(2, '0');
  const planNum = plan.id || seq;
  const railTitle = short(sprint.head).toUpperCase();
  const railHead = [
    `<div class="ds-rail-head">`,
    `<span class="ds-rail-num">${esc(planNum)}</span>`,
    `<span class="ds-rail-title" title="${esc(railTitle)}">${esc(railTitle)}</span>`,
    `</div>`,
  ].join('');
  root.querySelector('[data-col="sprint"]').innerHTML = railHead + sprints.map((s, i) => {
    const n = (s.head.match(/Phase (\d+)/) || [])[1] || String(i + 1),
      hsS = hits(plan.file, s.body, plan.sprints.indexOf(s) === 0),
      has = hsS.length ? ' · ' + hsS.length + ' commit' + (hsS.length > 1 ? 's' : '') : '',
      frac = state(s.body);
    const edited = isEdited(plan.file, s.head, s.body) ? ' · edited' : '';
    const gate = gateVerdictTag(s.head, s.body) ? ' · ' + gateVerdictTag(s.head, s.body) : '';
    const done = isDone(frac);
    return [
      `<button class="ds-pick`,
      i === sel[1] ? ' on' : '',
      done ? ' is-done' : /✗/.test(s.head) ? ' is-cancelled' : ' is-open is-pending',
      `" data-tip="`,
      esc(clip(sprintDesc(s), 100)),
      `"><span class="ds-row"><span class="ds-num">Phase `,
      String(n).padStart(2, '0'),
      `</span><b>`,
      esc(short(s.head)),
      `</b></span><small>`,
      [frac + has + edited + gate].filter(Boolean).join(' · '),
      `</small></button>`,
    ].join('');
  }).join('') + [
    `<div class="ds-rail-foot" data-foot>`,
    esc(plan.goal || sprintDesc(sprint)),
    `</div>`,
  ].join('');
  const hs = hits(plan.file, sprint.body, plan.sprints.indexOf(sprint) === 0);
  const headGate = gateVerdictTag(sprint.head, sprint.body);
  const due = dueFor(plan.file, sprint.head, sprint.body);
  const derr = dueErr(plan.file, sprint.head);
  const dueHtml = `<label class="ds-due"><span data-due-label${derr ? ' data-due-retry=""' : ''}>${derr ? `Deadline · ${esc(due)} (${esc(derr)} — kept locally, click to retry)` : due ? `Deadline · ${esc(due)}` : 'Add deadline'}</span><input type="date" data-due-input value="${esc(due)}" aria-label="Deadline"></label>`;
  const evalsHtml = renderEvals(plan.file, plan.date, sprint.head, sprint.body);
  const commitsHtml = renderCommitsPanel(hs, badges(hs));
  const orph = orphans(plan.file, plan.sprints).filter((c) => !hs.includes(c));
  const orphanHtml = badges(orph, 'Further commits');
  root.querySelector('[data-col="tasks"]').innerHTML = [
    `<div class="ds-drawer-head"><b>`,
    esc(short(sprint.head)),
    `</b>`,
    headGate ? `<span class="ds-gate">${headGate}</span>` : '',
    dueHtml,
    `<button data-close aria-label="Close detail">✕</button></div><div class="ds-md">`,
    marked.parse(stripGateThread(sprint.body)) + evalsHtml + commitsHtml + orphanHtml,
    `</div>`,
  ].join('');
  const u = unlinked(texts);
  const tri = root.querySelector('[data-col="triage"]');
  const isAllTracked = /All tracked/.test(u);
  tri.innerHTML = isAllTracked ? '' : `<hr class="ds-hr">${u}`;
  tri.hidden = isAllTracked;
  if (open) { drawer.hidden = false; scrim.hidden = false; } else { drawer.hidden = true; scrim.hidden = true; }
}
export { marked };
