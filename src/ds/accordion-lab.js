/* ADAM/DS — src/ds/accordion-lab.js · aria-expanded + chevronLeading */
function accLabInit(root){
  if(root.dataset.done) return; root.dataset.done="1";
  const q=s=>root.querySelector(s), qa=s=>Array.from(root.querySelectorAll(s));
  const stage=q('[data-nlab-stage]'), preview=q('[data-nlab-preview]'), code=q('[data-nlab-code]'), ratio=q('[data-nlab-ratio]');
  const countEl=q('[data-nlab-count]'), openEl=q('[data-nlab-open]'), disEl=q('[data-nlab-disabled]'), leadEl=q('[data-nlab-leading]');
  const mark=(sel,attr,val)=>qa(sel).forEach(b=>b.classList.toggle('is-on',b.dataset[attr]===val));
  function render(){
    const n=Math.max(1,Math.min(4,parseInt(countEl.value,10)||2));
    const open=(openEl.value||"0").split(',').map(s=>parseInt(s.trim(),10)).filter(x=>!isNaN(x));
    const dis=(disEl.value||"").split(',').map(s=>parseInt(s.trim(),10)).filter(x=>!isNaN(x));
    const leading=leadEl.checked;
    let h='<div class="accordion'+(leading?' accordion--chevron-leading':'')+'">';
    for(let i=0;i<n;i++){
      const isOpen=open.includes(i), isDis=dis.includes(i);
      h+='<div class="accordion__item'+(isOpen?' accordion__item--open':'')+'">';
      h+='<button class="accordion__trigger" aria-expanded="'+isOpen+'" aria-controls="acc-'+i+'"'+(isDis?' disabled':'')+'><span class="accordion__label">Section '+(i+1)+'</span><i class="ph ph-caret-down accordion__icon" aria-hidden="true"></i></button>';
      h+='<div class="accordion__panel" id="acc-'+i+'"'+(isOpen?'':' hidden')+'><div class="accordion__panel-inner">Content for section '+(i+1)+' — detail on demand.</div></div>';
      h+='</div>';
    }
    h+='</div>'; preview.innerHTML=h;
    const pretty=h.replace(/></g,'>\n<');
    if(window.highlight){ code.innerHTML=window.highlight(pretty); code.classList.add('hl'); } else code.textContent=pretty;
    const el=preview.querySelector('.accordion__trigger');
    if(el&&ratio){ const cs=getComputedStyle(el); const m=s=>{const n=s.match(/[\d.]+/g).slice(0,3).map(Number);const l=n.map(x=>{x/=255;return x<=0.03928?x/12.92:Math.pow((x+0.055)/1.055,2.4)});return 0.2126*l[0]+0.7152*l[1]+0.0722*l[2];}; const r=(Math.max(m(cs.color),m(getComputedStyle(preview).backgroundColor))+0.05)/(Math.min(m(cs.color),m(getComputedStyle(preview).backgroundColor))+0.05); let v='Fail',c='mx-bad'; if(r>=7){v='AAA';c='mx-ok';} else if(r>=4.5){v='AA';c='mx-ok';} else if(r>=3){v='AA-large';c='mx-mid';} ratio.textContent='Aa '+r.toFixed(2)+' · '+v; ratio.className='nlab__ratio '+c; }
  }
  root.addEventListener('click',e=>{
    const sf=e.target.closest('[data-nlab-surface]'); if(sf){ stage.dataset.surface=sf.dataset.nlabSurface; mark('[data-nlab-surface]','nlabSurface',stage.dataset.surface); return; }
    const sc=e.target.closest('[data-nlab-scheme]'); if(sc){ stage.dataset.theme=sc.dataset.nlabScheme; mark('[data-nlab-scheme]','nlabScheme',stage.dataset.theme); render(); return; }
    if(e.target.closest('[data-nlab-copy]')) navigator.clipboard.writeText(code.textContent);
    const t=e.target.closest('.accordion__trigger'); if(t&&!t.disabled){
      const item=t.closest('.accordion__item'); const open=item.classList.toggle('accordion__item--open');
      t.setAttribute('aria-expanded', open); item.querySelector('.accordion__panel').hidden=!open;
      const idx=Array.from(preview.querySelectorAll('.accordion__item')).indexOf(item);
      let cur=(openEl.value||"").split(',').map(s=>s.trim()).filter(Boolean);
      if(open){ if(!cur.includes(String(idx))) cur.push(String(idx)); } else { cur=cur.filter(x=>x!==String(idx)); }
      openEl.value=cur.join(','); const pretty=preview.innerHTML.replace(/></g,'>\n<'); if(window.highlight) code.innerHTML=window.highlight(pretty); else code.textContent=pretty;
    }
  });
  root.addEventListener('change',render); root.addEventListener('input',render);
  render();
}
function accLabBoot(){ document.querySelectorAll('[data-nlab="accordion"]').forEach(accLabInit); }
document.addEventListener('ds:doc',accLabBoot); accLabBoot();
