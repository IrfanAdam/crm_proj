/* ADAM/DS — src/ds/breadcrumbs-lab.js · collapse toggle + truncated */
function bcLabInit(root){
  if(root.dataset.done) return; root.dataset.done="1";
  const q=s=>root.querySelector(s), qa=s=>Array.from(root.querySelectorAll(s));
  const stage=q('[data-nlab-stage]'), preview=q('[data-nlab-preview]'), code=q('[data-nlab-code]'), ratio=q('[data-nlab-ratio]');
  const itemsEl=q('[data-nlab-items]'), collEl=q('[data-nlab-collapsed]'), truncEl=q('[data-nlab-truncated]');
  const mark=(sel,attr,val)=>qa(sel).forEach(b=>b.classList.toggle('is-on',b.dataset[attr]===val));
  function items(){ const v=itemsEl.value.trim(); return v? v.split(',').map(s=>s.trim()).filter(Boolean) : ["Home","Deals","Acme Corp renewal","Quote"]; }
  function render(){
    const arr=items(); const collapsed=collEl.checked, trunc=truncEl.checked;
    let h='<nav aria-label="Breadcrumb"><ol class="breadcrumbs'+(collapsed?' breadcrumbs--collapsed':'')+'">';
    arr.forEach((t,i)=>{
      const isLast=i===arr.length-1; const mid=i>0&&i<arr.length-1;
      const cls= 'breadcrumbs__item'+(trunc&&t.length>12?' breadcrumbs__item--truncated':'')+(mid?' breadcrumbs__item--collapsible':'');
      if(mid&&collapsed&&i===1){ h+='<li class="'+cls+'"><button class="breadcrumbs__collapse" aria-label="Show path">…</button><span class="breadcrumbs__sep" aria-hidden="true">/</span></li>'; return; }
      if(mid&&collapsed&&i>1&&i<arr.length-1) return;
      if(isLast) h+='<li class="'+cls+'"><span class="breadcrumbs__current" aria-current="page">'+t+'</span></li>';
      else h+='<li class="'+cls+'"><a href="#">'+t+'</a><span class="breadcrumbs__sep" aria-hidden="true">/</span></li>';
    });
    h+='</ol></nav>';
    preview.innerHTML=h;
    const pretty=h.replace(/></g,'>\n<');
    if(window.highlight){ code.innerHTML=window.highlight(pretty); code.classList.add('hl'); } else code.textContent=pretty;
    const el=preview.querySelector('.breadcrumbs__current');
    if(el&&ratio){ const cs=getComputedStyle(el); const m=s=>{const n=s.match(/[\d.]+/g).slice(0,3).map(Number);const l=n.map(x=>{x/=255;return x<=0.03928?x/12.92:Math.pow((x+0.055)/1.055,2.4)});return 0.2126*l[0]+0.7152*l[1]+0.0722*l[2];}; const r=(Math.max(m(cs.color),m(getComputedStyle(preview).backgroundColor))+0.05)/(Math.min(m(cs.color),m(getComputedStyle(preview).backgroundColor))+0.05); let v='Fail',c='mx-bad'; if(r>=7){v='AAA';c='mx-ok';} else if(r>=4.5){v='AA';c='mx-ok';} else if(r>=3){v='AA-large';c='mx-mid';} ratio.textContent='Aa '+r.toFixed(2)+' · '+v; ratio.className='nlab__ratio '+c; }
  }
  root.addEventListener('click',e=>{
    const sf=e.target.closest('[data-nlab-surface]'); if(sf){ stage.dataset.surface=sf.dataset.nlabSurface; mark('[data-nlab-surface]','nlabSurface',stage.dataset.surface); return; }
    const sc=e.target.closest('[data-nlab-scheme]'); if(sc){ stage.dataset.theme=sc.dataset.nlabScheme; mark('[data-nlab-scheme]','nlabScheme',stage.dataset.theme); render(); return; }
    if(e.target.closest('[data-nlab-copy]')) navigator.clipboard.writeText(code.textContent);
    if(e.target.closest('.breadcrumbs__collapse')){ collEl.checked=false; render(); }
  });
  root.addEventListener('change',render); root.addEventListener('input',render);
  render();
}
function bcLabBoot(){ document.querySelectorAll('[data-nlab="breadcrumbs"]').forEach(bcLabInit); }
document.addEventListener('ds:doc',bcLabBoot); bcLabBoot();
