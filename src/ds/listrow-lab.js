/* listrow-lab — single specimen, selected/disabled, logo/main/end */
function lrInit(root){
if(root.dataset.done)return;root.dataset.done='1';
const q=s=>root.querySelector(s),qa=s=>Array.from(root.querySelectorAll(s));
const stage=q('[data-dlab-stage]'),preview=q('[data-dlab-preview]'),code=q('[data-dlab-code]'),ratio=q('[data-dlab-ratio]');
let state='default';
const mark=(sel,attr,val)=>qa(sel).forEach(b=>b.classList.toggle('is-on',b.dataset[attr]===val));
function render(){
const logo=(q('[data-listrow-logo]').value.trim()||'AC').slice(0,2).toUpperCase();
const name=q('[data-listrow-name]').value.trim()||'Acme Corp';
const meta=q('[data-listrow-meta]').value.trim()||'Negotiation · $48k';
const time=q('[data-listrow-timestamp]').value.trim()||'2h ago';
const tone=q('[data-listrow-tone]').value; const hasBadge=q('[data-listrow-badge]').checked,hasTime=q('[data-listrow-time]').checked;
let cls=['list-row']; if(state==='selected')cls.push('list-row--selected'); if(state==='disabled')cls.push('list-row--disabled');
const badge=hasBadge?'<span class="badge '+(tone||'')+'">'+(tone.includes('success')?'Open':tone.includes('warning')?'Stale':tone.includes('danger')?'Risk':tone.includes('neutral')?'Won':'Open')+'</span>':'';
const timeEl=hasTime?'<span class="list-row__time">'+time+'</span>':'';
preview.innerHTML='<article class="'+cls.join(' ')+'"'+(state==='disabled'?' aria-disabled="true"':'')+'><span class="list-row__logo" aria-hidden="true">'+logo+'</span><div class="list-row__main"><div class="list-row__name">'+name+'</div><div class="list-row__meta">'+meta+'</div></div><div class="list-row__end">'+badge+timeEl+'</div></article>';
const raw=preview.innerHTML.replace(/></g,'>\n<');
if(window.highlight){code.innerHTML=window.highlight(raw);code.classList.add('hl');}else code.textContent=raw;code.dataset.hlDone='1';
ratio.textContent=state+(hasBadge?' · badge':' · no-badge')+(hasTime?' · time':'');
q('[data-dlab-note]').textContent=state==='selected'?'Selected: wash + sapphire border — rail marks current.':state==='disabled'?'Disabled: opacity.disabled, no pointer, leaves tab order.':'Default: hover wash only.';
}
root.addEventListener('click',e=>{
const s=e.target.closest('[data-listrow-state]');if(s){state=s.dataset.listrowState;mark('[data-listrow-state]','listrowState',state);render();return;}
const sf=e.target.closest('[data-dlab-surface]');if(sf){stage.dataset.surface=sf.dataset.dlabSurface;mark('[data-dlab-surface]','dlabSurface',stage.dataset.surface);return;}
const sc=e.target.closest('[data-dlab-scheme]');if(sc){stage.dataset.theme=sc.dataset.dlabScheme;mark('[data-dlab-scheme]','dlabScheme',stage.dataset.theme);return;}
if(e.target.closest('[data-dlab-copy]')) navigator.clipboard.writeText(code.textContent);
});
root.addEventListener('change',render);root.addEventListener('input',render);render();
}
function lrBoot(){document.querySelectorAll('[data-dlab="listrow"]').forEach(lrInit);}
document.addEventListener('ds:doc',lrBoot);lrBoot();
