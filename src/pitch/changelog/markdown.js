/* ADAM/DS — ds/changelog/markdown · mini markdown renderer (safepipe-detail contract) */
import { esc } from './esc.js';
import { bullets } from './prose.js';
import { taskExtras } from './task-panels.js';
import { triCaret } from './caret.js';
export const marked = {
  parse(s, extra){
    let src = String(s || '');
    src = src.replace(/\s*\{#[^}]*\}/g, ''); // machine anchors never render
    src = src.replace(/^## [^\n]*\n?/m, ''); // drawer head owns the phase title
    src = src.split('\n').filter((l)=>{ // drop Due/---/Status/tables/separators
      const t = l.trim();
      if (!t) return true;
      if (/^Due:\s*20\d{2}-\d{2}-\d{2}\s*$/.test(t)) return false;
      if (/^---\s*$/.test(t)) return false;
      if (/^\*\*Status:\*\*/.test(t)) return false;
      if (/^\|/.test(t)) return false; // tables never render; items carry tasks
      if (t.includes('|') && /^[\s|:\-]+$/.test(t)) return false;
      return true;
    }).join('\n');
    let html = esc(src);
    html = html.replace(/^### (.+)$/gm, (m, t) => `<h3 data-s="${/✗/.test(t) ? 'cancelled' : /✓/.test(t) ? 'done' : 'todo'}">${t}</h3>`);
    html = html.replace(/^#### (.+)$/gm, '<h4>$1</h4>');
    html = html.replace(/✓[ \t]*done([ \t]*[—–-][ \t]*)?/gi, '').replace(/✗[ \t]*cancelled([ \t]*[—–-][ \t]*)?/gi, '').replace(/[✓✗][ \t]*/g, (m)=> m.trim()==='✓' || m.trim()==='✗' ? '' : m);
    html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>');
    html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>');
    html = html.replace(/\*\*Tags:[^*]*\*\*/g, '');
    html = html.replace(/\*Tags:[^*]*\*/g, '');
    html = html.replace(/\*Shipped in [^*]*\*/g, ''); // commits panel owns SHAs
    function inline(t){
      // Code spans are masked first so **bold** can wrap them without leaving stray asterisks.
      const codes = [];
      const masked = String(t).replace(/`([^`]+)`/g, (m, c) => { codes.push(c); return `\u0001${codes.length - 1}\u0001`; });
      const tx = (r) => r.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/\*(.+?)\*/g, '<em>$1</em>').replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');
      return tx(masked).replace(/\u0001(\d+)\u0001/g, (m, i) => `<code>${codes[+i]}</code>`);
    }
    const prose = (l)=> bullets([l], inline); // one bullet row per point
    let lines = html.split('\n');
    lines = lines.map((l)=>{
      if (/^- \[x\] /i.test(l)) return l.replace(/^- \[x\] /i, '<li><input type="checkbox" checked disabled> ');
      if (/^- \[ \] /.test(l)) return l.replace(/^- \[ \] /, '<li><input type="checkbox" disabled> ');
      if (/^- /.test(l)) return l.replace(/^- /, '<li>');
      return l;
    });
    lines = lines.map((l)=> l.startsWith('<li>') ? l + '</li>' : l);
    const foldOpen = (tick, headHtml) => `<section class="ds-subtask"><details class="ds-task-fold"><summary class="ds-acc-head"><span class="ds-tick" data-s="${tick}"></span>${headHtml}${triCaret}</summary><div class="ds-acc-body">`;
    const bareRow = (tick, headHtml) => `<section class="ds-subtask"><div class="ds-task-bare"><span class="ds-tick" data-s="${tick}"></span>${headHtml}</div></section>`;
    const cleanName = (raw) => inline(raw.replace(/✓[ \t]*done[ \t]*[—–-]?/gi, '').replace(/✗[ \t]*cancelled[ \t]*[—–-]?/gi, '').replace(/[✓✗]/g, '').replace(/<[^>]+>/g, '').trim());
    const taskItem = (li) => { // norm-shaped "- [x] **N name** flag tail"
      const m = li.match(/^<li><input type="checkbox"( checked)? disabled> \*\*([\d-]+) (.+?)\*\*\s?(.*)<\/li>$/);
      if (!m) return null;
      const rest = m[4] || '';
      const tick = /✗|ds-cancelled/.test(rest) ? 'cancelled' : m[1] ? 'done' : 'todo';
      const tail = (/ds-cancelled/.test(rest) ? rest.replace(/^.*?&lt;\/span&gt;\s*[—–-]\s*/, '') : rest.replace(/^✓ done — /, '')).replace(/^(done|cancelled)$/i, '').trim();
      const inner = `${m[2]} ${cleanName(m[3])}`, tip = inner.replace(/<[^>]+>/g, '');
      return { tick, tail, num: m[2], name: `<h3 title="${tip}">${inner}</h3>` };
    };
    const isTaskLine = (l) => l.startsWith('<li>') && taskItem(l);
    const hasBody = (i) => {
      for (let j = i + 1; j < lines.length; j++){ const l = lines[j];
        if (!l.trim()) continue;
        return !(isTaskLine(l) || /^<h3[\s>]/.test(l) || /^<h[12]>/.test(l)); }
      return false; };
    let out = [], ulBuf = [], pBuf = [], subOpen = false, pendingBare = null; // held bare task joins its fold — never lands between folds
    const emit = (h) => { if (pendingBare) { out.push(foldOpen(pendingBare.tick, pendingBare.name)); subOpen = true; pendingBare = null; } out.push(h); };
    const flushUl = ()=>{ if (!ulBuf.length) return; const h = '<ul>'+ulBuf.join('')+'</ul>'; ulBuf = []; emit(h); };
    const flushProse = ()=>{ if (!pBuf.length) return; const h = bullets(pBuf, inline); pBuf = []; emit(h); };
    const closeSub = ()=>{ if (subOpen) { out.push('</div></details></section>'); subOpen = false; } };
    const flushBare = ()=>{ if (pendingBare) { out.push(bareRow(pendingBare.tick, pendingBare.name)); pendingBare = null; } };
    for (let i = 0; i < lines.length; i++){
      const line = lines[i];
      const isLi = line.startsWith('<li>');
      const isH3 = /^<h3[\s>]/.test(line);
      const isBlock = isH3 || /^<h[1-4]>/.test(line);
      const isEmpty = line.trim() === '';
      const ti = isLi ? taskItem(line) : null;
      if (isEmpty) { flushUl(); flushProse(); }
      else if (ti){ flushUl(); flushProse(); closeSub(); flushBare();
        const body = ti.tail || hasBody(i) || (ti.num && extra && extra[ti.num]);
        if (!body) pendingBare = { tick: ti.tick, name: ti.name };
        else { out.push(foldOpen(ti.tick, ti.name)); subOpen = true;
          const ex = ti.num && extra && extra[ti.num] ? taskExtras(extra[ti.num], (t) => marked.parse(t, null)) : '';
          if (ex) out.push(ex);
          if (ti.tail) out.push(prose(ti.tail)); } }
      else if (isLi) { flushProse(); ulBuf.push(inline(line)); }
      else if (isBlock){
        flushUl(); flushProse();
        if (isH3){ closeSub(); flushBare(); const raw = line.replace(/^<h3[^>]*>|<\/h3>$/g, ''); const tick = (line.match(/data-s="(\w+)"/) || [])[1] || 'todo'; const inner = cleanName(raw); const tip = inner.replace(/<[^>]+>/g, ''); out.push(foldOpen(tick, `<h3 title="${tip}">${inner}</h3>`)); subOpen = true; }
        else emit(inline(line)); // non-fold headings stay inside the open task fold — never bare between folds
      } else { pBuf.push(line); }
    }
    flushUl(); flushProse(); flushBare(); closeSub();
    return out.join('');
  }
};
