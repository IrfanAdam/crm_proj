/* kpi-lab — value/total/delta + spark size, up/down tokens */
function kpiInit(root){
if(root.dataset.done)return;root.dataset.done='1';
const q=s=>root.querySelector(s),qa=s=>Array.from(root.querySelectorAll(s));
const stage=q('[data-dlab-stage]'),preview=q('[data-dlab-preview]'),code=q('[data-dlab-code]'),ratio=q('[data-dlab-ratio]');
let delta='up',size='kpi--lg';
const mark=(sel,attr,val)=>qa(sel).forEach(b=>b.classList.toggle('is-on',b.dataset[attr]===val));
function render(){
const val=q('[data-kpi-value]').value.trim()||'4';
const tot=q('[data-kpi-total]').value.trim()||'/32 closed';
const dval=q('[data-kpi-delta-val]').value.trim()||'+2%';
const sparkOn=q('[data-kpi-spark]').checked;
const sparkSize=q('[data-kpi-spark-size]').value;
const dCls=delta==='down'?' kpi__delta--down':'';
const spark=sparkOn?'<span class="kpi__spark"><span class="sparkline '+(sparkSize||'')+'" aria-hidden="true"><span class="sparkline__bar" style="height:30%"></span><span class="sparkline__bar sparkline__bar--accent" style="height:70%"></span></span></span>':'';
preview.innerHTML='<span class="kpi '+(size||'')+'"><span class="kpi__value">'+val+'</span><span class="kpi__total">'+tot+'</span><span class="kpi__delta'+dCls+'">'+dval+'</span>'+spark+'</span>';
const raw=preview.innerHTML.replace(/></g,'>\n<');
if(window.highlight){code.innerHTML=window.highlight(raw);code.classList.add('hl');}else code.textContent=raw;code.dataset.hlDone='1';
ratio.textContent=(size||'default')+' · '+delta+(sparkOn?' · spark':'');
q('[data-dlab-note]').textContent=delta==='up'?'Up: green-700 on green-100 — 700-step ink passes.':'Down: red-700 on red-100 — sign carries meaning.';
}
root.addEventListener('click',e=>{
const d=e.target.closest('[data-kpi-delta]');if(d){delta=d.dataset.kpiDelta;mark('[data-kpi-delta]','kpiDelta',delta);render();return;}
const sz=e.target.closest('[data-kpi-size]');if(sz){size=sz.dataset.kpiSize;mark('[data-kpi-size]','kpiSize',size);render();return;}
const sf=e.target.closest('[data-dlab-surface]');if(sf){stage.dataset.surface=sf.dataset.dlabSurface;mark('[data-dlab-surface]','dlabSurface',stage.dataset.surface);return;}
const sc=e.target.closest('[data-dlab-scheme]');if(sc){stage.dataset.theme=sc.dataset.dlabScheme;mark('[data-dlab-scheme]','dlabScheme',stage.dataset.theme);return;}
if(e.target.closest('[data-dlab-copy]')) navigator.clipboard.writeText(code.textContent);
});
root.addEventListener('change',render);root.addEventListener('input',render);render();
}
function kpiBoot(){document.querySelectorAll('[data-dlab="kpi"]').forEach(kpiInit);}
document.addEventListener('ds:doc',kpiBoot);kpiBoot();
