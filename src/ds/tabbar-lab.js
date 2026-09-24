/* ADAM/DS — src/ds/tabbar-lab.js · glass + active signal */
function tbLabInit(root){
  if(root.dataset.done) return; root.dataset.done="1";
  const q=s=>root.querySelector(s), qa=s=>Array.from(root.querySelectorAll(s));
  const stage=q('[data-nlab-stage]'), preview=q('[data-nlab-preview]'), code=q('[data-nlab-code]'), ratio=q('[data-nlab-ratio]');
  const cntEl=q('[data-nlab-count]'), actEl=q('[data-nlab-active]'), glassEl=q('[data-nlab-glass]');
  const icons=["ph-house","ph-users","ph-chart-bar","ph-gear","ph-bell"];
  const mark=(sel,attr,val)=>qa(sel).forEach(b=>b.classList.toggle('is-on',b.dataset[attr]===val));
  function render(){
    const n=Math.max(1,Math.min(3,parseInt(cntEl.value,10)||3));
    const act=Math.max(0,Math.min(n-1,parseInt(actEl.value,10)||0));
    const glass=glassEl.checked;
    stage.dataset.surface=glass?'glass':stage.dataset.surface;
    let h='<div class="tabbar"'+(glass?'':' style="background:var(--bg-surface)"')+'><nav class="tabbar__nav" role="tablist" aria-label="Primary">';
    for(let i=0;i<n;i++){
      const a=i===act;
      h+='<button class="tabbar__item'+(a?' tabbar__item--active':'')+'" role="tab"'+(a?' aria-current="page"':'')+' aria-label="Tab '+(i+1)+'"><i class="ph '+icons[i]+'" aria-hidden="true"></i>'+(a?'<span class="tabbar__signal"></span>':'')+(i===1?'<span class="tabbar__badge">4</span>':'')+'</button>';
    }
    h+='</nav></div>'; preview.innerHTML=h;
    const pretty=h.replace(/></g,'>\n<');
    if(window.highlight){ code.innerHTML=window.highlight(pretty); code.classList.add('hl'); } else code.textContent=pretty;
    const el=preview.querySelector('.tabbar__item--active');
    if(el&&ratio){ const cs=getComputedStyle(el); const m=s=>{const n=s.match(/[\d.]+/g).slice(0,3).map(Number);const l=n.map(x=>{x/=255;return x<=0.03928?x/12.92:Math.pow((x+0.055)/1.055,2.4)});return 0.2126*l[0]+0.7152*l[1]+0.0722*l[2];}; const r=(Math.max(m(cs.color),m(getComputedStyle(preview).backgroundColor))+0.05)/(Math.min(m(cs.color),m(getComputedStyle(preview).backgroundColor))+0.05); let v='Fail',c='mx-bad'; if(r>=7){v='AAA';c='mx-ok';} else if(r>=4.5){v='AA';c='mx-ok';} else if(r>=3){v='AA-large';c='mx-mid';} ratio.textContent='Aa '+r.toFixed(2)+' · '+v; ratio.className='nlab__ratio '+c; }
  }
  root.addEventListener('click',e=>{
    const sf=e.target.closest('[data-nlab-surface]'); if(sf){ stage.dataset.surface=sf.dataset.nlabSurface; mark('[data-nlab-surface]','nlabSurface',stage.dataset.surface); return; }
    const sc=e.target.closest('[data-nlab-scheme]'); if(sc){ stage.dataset.theme=sc.dataset.nlabScheme; mark('[data-nlab-scheme]','nlabScheme',stage.dataset.theme); render(); return; }
    if(e.target.closest('[data-nlab-copy]')) navigator.clipboard.writeText(code.textContent);
    const t=e.target.closest('.tabbar__item'); if(t){ const idx=Array.from(preview.querySelectorAll('.tabbar__item')).indexOf(t); actEl.value=String(idx); render(); }
  });
  root.addEventListener('change',render); root.addEventListener('input',render);
  render();
}
function tbLabBoot(){ document.querySelectorAll('[data-nlab="tabbar"]').forEach(tbLabInit); }
document.addEventListener('ds:doc',tbLabBoot); tbLabBoot();
