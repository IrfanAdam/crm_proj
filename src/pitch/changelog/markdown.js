/* ADAM/DS — ds/changelog/markdown · mini markdown renderer (safepipe-detail contract) */
import { esc } from './esc.js';
export const marked = {
  parse(s){
    let src = String(s || '');
    src = src.replace(/\s*\{#[^}]*\}/g, ''); // machine anchors never render
    src = src.replace(/^## [^\n]*\n?/m, ''); // drawer head owns the phase title
    src = src.split('\n').filter((l)=>{ // drop Due/---/Status/table rows
      const t = l.trim();
      if (!t) return true;
      if (/^Due:\s*20\d{2}-\d{2}-\d{2}\s*$/.test(t)) return false;
      if (/^---\s*$/.test(t)) return false;
      if (/^\*\*Status:\*\*/.test(t)) return false;
      if (/^\|/.test(t)) return false; // overview tables dup the checkbox list
      return true;
    }).join('\n');
    let html = esc(src);
    html = html.replace(/^### (.+)$/gm, (m, t) => `<h3 data-tick="${/✗/.test(t) ? '☒' : /✓/.test(t) ? '☑' : '☐'}">${t}</h3>`);
    html = html.replace(/✓[ \t]*done([ \t]*[—–-][ \t]*)?/gi, '').replace(/✗[ \t]*cancelled([ \t]*[—–-][ \t]*)?/gi, '').replace(/[✓✗][ \t]*/g, (m)=> m.trim()==='✓' || m.trim()==='✗' ? '' : m);
    html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>');
    html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>');
    html = html.replace(/\*\*Tags:[^*]*\*\*/g, '');
    html = html.replace(/\*Tags:[^*]*\*/g, '');
    html = html.replace(/\*Shipped in [^*]*\*/g, ''); // commits panel owns SHAs
    function inline(t){
      let r = t.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
      r = r.replace(/\*(.+?)\*/g, '<em>$1</em>');
      r = r.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');
      return r;
    }
    let lines = html.split('\n');
    lines = lines.map((l)=>{
      if (/^- \[x\] /i.test(l)) return l.replace(/^- \[x\] /i, '<li><input type="checkbox" checked disabled> ');
      if (/^- \[ \] /.test(l)) return l.replace(/^- \[ \] /, '<li><input type="checkbox" disabled> ');
      if (/^- /.test(l)) return l.replace(/^- /, '<li>');
      return l;
    });
    lines = lines.map((l)=> l.startsWith('<li>') ? l + '</li>' : l);
    const foldOpen = (tick, headHtml) => `<section class="ds-subtask"><details class="ds-task-fold"><summary class="ds-acc-head"><span class="ds-tick">${tick}</span>${headHtml}<span class="ds-caret">›</span></summary><div class="ds-acc-body">`;
    const cleanName = (raw) => inline(raw.replace(/✓[ \t]*done[ \t]*[—–-]?/gi, '').replace(/✗[ \t]*cancelled[ \t]*[—–-]?/gi, '').replace(/[✓✗]/g, '').replace(/<[^>]+>/g, '').trim());
    const taskItem = (li) => { // norm-shaped "- [x] **N name** flag tail" -> fold
      const m = li.match(/^<li><input type="checkbox"( checked)? disabled> \*\*([\d-]+) (.+?)\*\*\s?(.*)<\/li>$/);
      if (!m) return null;
      const rest = m[4] || '';
      const tick = /✗|ds-cancelled/.test(rest) ? '☒' : m[1] ? '☑' : '☐';
      const tail = /ds-cancelled/.test(rest) ? rest.replace(/^.*?&lt;\/span&gt;\s*[—–-]\s*/, '').trim() : rest.replace(/^✓ done — /, '').trim();
      return { head: foldOpen(tick, `<h3>${m[2]} ${cleanName(m[3])}</h3>`), tail };
    };
    let out = [];
    let ulBuf = [];
    let subOpen = false;
    const flushUl = ()=>{ if (!ulBuf.length) return; out.push('<ul>'+ulBuf.join('')+'</ul>'); ulBuf = []; };
    const closeSub = ()=>{ if (subOpen) { out.push('</div></details></section>'); subOpen = false; } };
    for (const line of lines){
      const isLi = line.startsWith('<li>');
      const isH3 = /^<h3[\s>]/.test(line);
      const isBlock = isH3 || /^<h[12]>/.test(line);
      const isEmpty = line.trim() === '';
      const ti = isLi ? taskItem(line) : null;
      if (isEmpty) flushUl();
      else if (ti){ flushUl(); closeSub(); out.push(ti.head); subOpen = true; if (ti.tail) out.push('<p>'+inline(ti.tail)+'</p>'); }
      else if (isLi) ulBuf.push(inline(line));
      else if (isBlock){
        flushUl();
        if (isH3){ closeSub(); const raw = line.replace(/^<h3[^>]*>|<\/h3>$/g, ''); const tick = (line.match(/data-tick="(.)"/) || [])[1] || '☐'; out.push(foldOpen(tick, `<h3>${cleanName(raw)}</h3>`)); subOpen = true; }
        else { closeSub(); out.push(inline(line)); }
      } else { flushUl(); out.push('<p>'+inline(line)+'</p>'); }
    }
    flushUl(); closeSub();
    return out.join('');
  }
};
