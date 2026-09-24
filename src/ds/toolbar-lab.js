/* ADAM/DS — src/ds/toolbar-lab.js · density + overflow */
function toolLabInit(root){
  if(root.dataset.done) return; root.dataset.done="1";
  const q=s=>root.querySelector(s), qa=s=>Array.from(root.querySelectorAll(s));
  const stage=q('[data-nlab-stage]'), preview=q('[data-nlab-preview]'), code=q('[data-nlab-code]'), ratio=q('[data-nlab-ratio]');
  const densEl=q('[data-nlab-density]'), titleEl=q('[data-nlab-title]'), grpEl=q('[data-nlab-groups]'), overEl=q('[data-nlab-overflow]');
  const mark=(sel,attr,val)=>qa(sel).forEach(b=>b.classList.toggle('is-on',b.dataset[attr]===val));
  function render(){
    const density=densEl.value, title=titleEl.value.trim()||"Acme renewal";
    const groups=Math.max(1,Math.min(3,parseInt(grpEl.value,10)||2));
    const overflow=overEl.checked;
    let h='<div class="toolbar'+(density!=='default'?' toolbar--'+density:'')+'" role="toolbar" aria-label="Demo">';
    h+='<span class="toolbar__title">'+title+'</span><span class="toolbar__spacer"></span>';
    for(let i=0;i<groups;i++){
      h+='<div class="toolbar__group" aria-label="Group '+(i+1)+'">';
      h+='<button class="toolbar__action"><i class="ph ph-squares-four" aria-hidden="true"></i></button>';
      if(i===0) h+='<button class="toolbar__action">Share</button>';
      h+='</div>';
    }
    if(overflow) h+='<span class="toolbar__overflow"><button class="toolbar__action" aria-label="More actions"><i class="ph ph-dots-three" aria-hidden="true"></i></button></span>';
    h+='</div>'; preview.innerHTML=h;
    const pretty=h.replace(/></g,'>\n<');
    if(window.highlight){ code.innerHTML=window.highlight(pretty); code.classList.add('hl'); } else code.textContent=pretty;
    const el=preview.querySelector('.toolbar__action');
    if(el&&ratio){ const cs=getComputedStyle(el); const m=s=>{const n=s.match(/[\d.]+/g).slice(0,3).map(Number);const l=n.map(x=>{x/=255;return x<=0.03928?x/12.92:Math.pow((x+0.055)/1.055,2.4)});return 0.2126*l[0]+0.7152*l[1]+0.0722*l[2];}; const r=(Math.max(m(cs.color),m(getComputedStyle(preview).backgroundColor))+0.05)/(Math.min(m(cs.color),m(getComputedStyle(preview).backgroundColor))+0.05); let v='Fail',c='mx-bad'; if(r>=7){v='AAA';c='mx-ok';} else if(r>=4.5){v='AA';c='mx-ok';} else if(r>=3){v='AA-large';c='mx-mid';} ratio.textContent='Aa '+r.toFixed(2)+' · '+v; ratio.className='nlab__ratio '+c; }
  }
  root.addEventListener('click',e=>{
    const sf=e.target.closest('[data-nlab-surface]'); if(sf){ stage.dataset.surface=sf.dataset.nlabSurface; mark('[data-nlab-surface]','nlabSurface',stage.dataset.surface); return; }
    const sc=e.target.closest('[data-nlab-scheme]'); if(sc){ stage.dataset.theme=sc.dataset.nlabScheme; mark('[data-nlab-scheme]','nlabScheme',stage.dataset.theme); render(); return; }
    if(e.target.closest('[data-nlab-copy]')) navigator.clipboard.writeText(code.textContent);
    const d=e.target.closest('[data-nlab-density]'); if(d){ densEl.value=d.dataset.nlabDensity; mark('[data-nlab-density]','nlabDensity',densEl.value); render(); return; }
  });
  root.addEventListener('change',render); root.addEventListener('input',render);
  render();
}
function toolLabBoot(){ document.querySelectorAll('[data-nlab="toolbar"]').forEach(toolLabInit); }
document.addEventListener('ds:doc',toolLabBoot); toolLabBoot();
