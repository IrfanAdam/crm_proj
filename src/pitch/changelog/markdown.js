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
      if (t.startsWith('|')) return false;
      // table separator like | --- | --- | or ---|---
      if (t.includes('|') && /^[\s|:\-]+$/.test(t)) return false;
      return true;
    }).join('\n');
    // 3) remove inline ✓ done / ✗ cancelled duplication (checkbox already shows state)
    src = src.replace(/✓\s*done\s*[—–-]\s*/gi, '').replace(/✗\s*cancelled\s*[—–-]\s*/gi, '').replace(/[✓✗]\s*/g, (m)=> m.trim()==='✓' || m.trim()==='✗' ? '' : m);
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
