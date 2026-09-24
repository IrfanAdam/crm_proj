/* ADAM/DS — src/ds/pagination-lab.js · page math + compact + status */
function pgLabInit(root){
  if(root.dataset.done) return; root.dataset.done="1";
  const q=s=>root.querySelector(s), qa=s=>Array.from(root.querySelectorAll(s));
  const stage=q('[data-nlab-stage]'), preview=q('[data-nlab-preview]'), code=q('[data-nlab-code]'), ratio=q('[data-nlab-ratio]');
  const pageEl=q('[data-nlab-page]'), totalEl=q('[data-nlab-total]'), compEl=q('[data-nlab-compact]'), statusEl=q('[data-nlab-status]');
  const mark=(sel,attr,val)=>qa(sel).forEach(b=>b.classList.toggle('is-on',b.dataset[attr]===val));
  function render(){
    let page=Math.max(1,parseInt(pageEl.value,10)||1), total=Math.max(1,parseInt(totalEl.value,10)||8);
    if(page>total) page=total;
    const compact=compEl.checked, showStatus=statusEl.checked;
    let h='<nav class="pagination'+(compact?' pagination--compact':'')+'" aria-label="Pagination">';
    if(compact){
      h+='<button class="pagination__btn"'+(page<=1?' disabled':'')+'>Prev</button>';
      h+='<button class="pagination__btn"'+(page>=total?' disabled':'')+'>Next</button>';
    } else {
      h+='<button class="pagination__btn pagination__nav"'+(page<=1?' disabled':'')+'>Prev</button>';
      for(let i=1;i<=total;i++){
        if(total>5 && i>2 && i<total-1 && Math.abs(i-page)>1){ if(i===3||i===total-2){ h+='<span class="pagination__ellipsis" aria-hidden="true">…</span>'; } continue; }
        const a=i===page; h+='<button class="pagination__btn'+(a?' pagination__btn--active':'')+'"'+(a?' aria-current="page"':'')+'>'+i+'</button>';
      }
      h+='<button class="pagination__btn pagination__nav"'+(page>=total?' disabled':'')+'>Next</button>';
    }
    if(showStatus){ const per=20; const s=(page-1)*per+1, e=Math.min(page*per, total*per>96?96:total*per); h+='<span class="pagination__status">'+s+'–'+e+' of '+(total*12>96?96:total*12)+'</span>'; }
    h+='</nav>'; preview.innerHTML=h;
    const pretty=h.replace(/></g,'>\n<');
    if(window.highlight){ code.innerHTML=window.highlight(pretty); code.classList.add('hl'); } else code.textContent=pretty;
    const el=preview.querySelector('.pagination__btn--active')||preview.querySelector('.pagination__btn');
    if(el&&ratio){ const cs=getComputedStyle(el); const m=s=>{const n=s.match(/[\d.]+/g).slice(0,3).map(Number);const l=n.map(x=>{x/=255;return x<=0.03928?x/12.92:Math.pow((x+0.055)/1.055,2.4)});return 0.2126*l[0]+0.7152*l[1]+0.0722*l[2];}; const r=(Math.max(m(cs.color),m(cs.backgroundColor))+0.05)/(Math.min(m(cs.color),m(cs.backgroundColor))+0.05); let v='Fail',c='mx-bad'; if(r>=7){v='AAA';c='mx-ok';} else if(r>=4.5){v='AA';c='mx-ok';} else if(r>=3){v='AA-large';c='mx-mid';} ratio.textContent='Aa '+r.toFixed(2)+' · '+v; ratio.className='nlab__ratio '+c; }
  }
  root.addEventListener('click',e=>{
    const sf=e.target.closest('[data-nlab-surface]'); if(sf){ stage.dataset.surface=sf.dataset.nlabSurface; mark('[data-nlab-surface]','nlabSurface',stage.dataset.surface); return; }
    const sc=e.target.closest('[data-nlab-scheme]'); if(sc){ stage.dataset.theme=sc.dataset.nlabScheme; mark('[data-nlab-scheme]','nlabScheme',stage.dataset.theme); render(); return; }
    if(e.target.closest('[data-nlab-copy]')) navigator.clipboard.writeText(code.textContent);
    const b=e.target.closest('.pagination__btn'); if(b&&!b.disabled){
      const txt=b.textContent.trim(); let p=parseInt(pageEl.value,10)||1, t=parseInt(totalEl.value,10)||8;
      if(txt==='Prev') p=Math.max(1,p-1); else if(txt==='Next') p=Math.min(t,p+1); else if(/^\d+$/.test(txt)) p=parseInt(txt,10);
      pageEl.value=String(p); render();
    }
  });
  root.addEventListener('change',render); root.addEventListener('input',render);
  render();
}
function pgLabBoot(){ document.querySelectorAll('[data-nlab="pagination"]').forEach(pgLabInit); }
document.addEventListener('ds:doc',pgLabBoot); pgLabBoot();
