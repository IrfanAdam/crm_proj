/* sparkline-lab — bars, accent/gem peak, stroke, semantic vs decorative */
function spInit(root){
if(root.dataset.done)return;root.dataset.done='1';
const q=s=>root.querySelector(s),qa=s=>Array.from(root.querySelectorAll(s));
const stage=q('[data-dlab-stage]'),preview=q('[data-dlab-preview]'),code=q('[data-dlab-code]'),ratio=q('[data-dlab-ratio]');
let size='',peak='gem';
const mark=(sel,attr,val)=>qa(sel).forEach(b=>b.classList.toggle('is-on',b.dataset[attr]===val));
function render(){
const n=Math.max(3,Math.min(7,parseInt(q('[data-sp-bars]').value)||5));
const label=q('[data-sp-label]').value.trim()||'Up 12% over 7 days';
const semantic=q('[data-sp-semantic]').checked,stroke=q('[data-sp-stroke]').checked;
const heights=[25,40,55,70,85,60,35];
let cls=['sparkline']; if(size)cls.push(size); if(stroke)cls.push('sparkline--stroke');
let h='<span class="'+cls.join(' ')+'" '+(semantic?'role="img" aria-label="'+label+'"':'aria-hidden="true"')+'>';
for(let i=0;i<n;i++){
let b='sparkline__bar'; if(i===n-1&&peak) b+=' sparkline__bar--'+peak; else if(i===n-2&&peak==='gem') b+=' sparkline__bar--accent';
h+='<span class="'+b+'" style="height:'+heights[i%heights.length]+'%"></span>';
}
h+='</span>'; if(!semantic) h+='<span class="meta" style="margin-left:8px;font-size:12px">'+label+'</span>';
preview.innerHTML=h;
const raw=preview.innerHTML.replace(/></g,'>\n<');
if(window.highlight){code.innerHTML=window.highlight(raw);code.classList.add('hl');}else code.textContent=raw;code.dataset.hlDone='1';
ratio.textContent=(size||'md')+(stroke?' · stroke':'')+' · '+(peak||'no-peak')+' · '+n+' bars';
q('[data-dlab-note]').textContent=semantic?'Semantic: role=img + trend label — peak crowned.':'Decorative: aria-hidden + data fallback beside bars.';
}
root.addEventListener('click',e=>{
const sz=e.target.closest('[data-sp-size]');if(sz){size=sz.dataset.spSize;mark('[data-sp-size]','spSize',size);render();return;}
const pk=e.target.closest('[data-sp-peak]');if(pk){peak=pk.dataset.spPeak;mark('[data-sp-peak]','spPeak',peak);render();return;}
const sf=e.target.closest('[data-dlab-surface]');if(sf){stage.dataset.surface=sf.dataset.dlabSurface;mark('[data-dlab-surface]','dlabSurface',stage.dataset.surface);return;}
const sc=e.target.closest('[data-dlab-scheme]');if(sc){stage.dataset.theme=sc.dataset.dlabScheme;mark('[data-dlab-scheme]','dlabScheme',stage.dataset.theme);return;}
if(e.target.closest('[data-dlab-copy]')) navigator.clipboard.writeText(code.textContent);
});
root.addEventListener('change',render);root.addEventListener('input',render);render();
}
function spBoot(){document.querySelectorAll('[data-dlab="sparkline"]').forEach(spInit);}
document.addEventListener('ds:doc',spBoot);spBoot();
