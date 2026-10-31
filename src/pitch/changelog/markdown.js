/* ADAM/DS — ds/changelog/markdown · mini markdown renderer (extracted from paint-detail.js, budget) */
import { esc } from './esc.js';
export const marked = {
  parse(s){
    let src = String(s || '');
    // 1) strip {#anchor} before parse
    src = src.replace(/\s*\{#[^}]*\}/g, '');
    // 2) drop markdown tables (|...|) + Due lines (due lane owns them)
    src = src.split('\n').filter((l)=>{
      const t = l.trim();
      if (!t) return true;
      if (/^Due:\s*20\d{2}-\d{2}-\d{2}\s*$/.test(t)) return false;
      // table separator like | --- | --- | or ---|--- (content rows kept — tables render)
      if (t.includes('|') && /^[\s|:\-]+$/.test(t)) return false;
      return true;
    }).join('\n');
    // 3) remove inline ✓ done / ✗ cancelled duplication (checkbox already shows state)
    src = src.replace(/✓[ \t]*done[ \t]*[—–-][ \t]*/gi, '').replace(/✗[ \t]*cancelled[ \t]*[—–-][ \t]*/gi, '').replace(/[✓✗][ \t]*/g, (m)=> m.trim()==='✓' || m.trim()==='✗' ? '' : m);
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
    // helper to apply inline transforms (bold, italic, links) to a fragment
    function inline(t){
      let r = t.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
      r = r.replace(/\*(.+?)\*/g, '<em>$1</em>');
      r = r.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');
      return r;
    }
    // split into lines for block-local list wrapping
    let lines = html.split('\n');
    // convert markdown list markers to <li> placeholders, table rows to <tr>
    lines = lines.map((l)=>{
      if (/^- \[x\] /i.test(l)) return l.replace(/^- \[x\] /i, '<li><input type="checkbox" checked disabled> ');
      if (/^- \[ \] /.test(l)) return l.replace(/^- \[ \] /, '<li><input type="checkbox" disabled> ');
      if (/^- /.test(l)) return l.replace(/^- /, '<li>');
      if (/^\|/.test(l)) {
        const cells = l.split('|').slice(1, -1).map((c)=>inline(c.trim()));
        if (!cells.length) return '';
        return '<tr>'+cells.map((c)=>'<td>'+c+'</td>').join('')+'</tr>';
      }
      return l;
    });
    // close li
    lines = lines.map((l)=> l.startsWith('<li>') ? l + '</li>' : l);
    let out = [];
    let ulBuf = [];
    let subOpen = false;
    let tableBuf = [];
    const flushUl = ()=>{
      if (!ulBuf.length) return;
      out.push('<ul>'+ulBuf.join('')+'</ul>');
      ulBuf = [];
    };
    const flushTab = ()=>{
      if (!tableBuf.length) return;
      out.push('<table>'+tableBuf.join('')+'</table>');
      tableBuf = [];
    };
    const closeSub = ()=>{ if (subOpen) { out.push('</section>'); subOpen = false; } };
    // One <p> per prose line (never merge — each line keeps its own row),
    // each ### Task header opens a <section class="ds-subtask"> closed by
    // the next header; blank lines only flush lists, never close sections.
    for (const line of lines){
      const isLi = line.startsWith('<li>');
      const isTr = line.startsWith('<tr>');
      const isH3 = /^<h3>/.test(line);
      const isBlock = isH3 || /^<h[12]>/.test(line) || /^<p><em>/.test(line) || line.startsWith('<table>');
      const isEmpty = line.trim() === '';
      if (isEmpty) { flushUl(); flushTab(); }
      else if (isTr){
        flushUl();
        tableBuf.push(!tableBuf.length ? line.replace(/<\/?td>/g, (m)=> m[1] === '/' ? '</th>' : '<th>') : line);
      }
      else if (isLi) { flushTab(); ulBuf.push(inline(line)); }
      else if (isBlock){
        flushUl(); flushTab();
        if (isH3) { closeSub(); out.push('<section class="ds-subtask">'); subOpen = true; }
        else closeSub();
        out.push(inline(line));
      } else { flushUl(); flushTab(); out.push('<p>'+inline(line)+'</p>'); }
    }
    flushUl(); flushTab(); closeSub();
    return out.join('');
  }
};
