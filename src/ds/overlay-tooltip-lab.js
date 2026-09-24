/* ADAM/DS — src/ds/overlay-tooltip-lab.js · tooltip playground */
(function(){
if(window._olabTip)return;window._olabTip=1;
function esc(s){return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/\"/g,'&quot;');}
function init(root){
if(root.dataset.done)return;root.dataset.done='1';
const q=s=>root.querySelector(s),qa=s=>Array.from(root.querySelectorAll(s));
const stage=q('[data-olab-stage]'),preview=q('[data-olab-preview]'),code=q('[data-olab-code]'),ratio=q('[data-olab-ratio]');
let place='top';
function mark(sel,attr,val){qa(sel).forEach(b=>b.classList.toggle('is-on',b.dataset[attr]===val));}
function build(){
const tip=(q('[data-olab-tip]')||{}).value||'Save this view',wrap=(q('[data-olab-wrap]')||{}).checked;
const wrapCls=wrap?' tooltip--wrap':'';
preview.innerHTML='<div class=\"ov-stage\"><span class=\"ov-anchor ov-tip\"><button class=\"btn btn--secondary btn--icon-only\" aria-label=\"'+esc(tip)+'\" aria-describedby=\"olab-tip\"><i class=\"ph ph-bookmark-simple\" aria-hidden=\"true\"></i></button><span class=\"tooltip tooltip--visible'+wrapCls+'\" role=\"tooltip\" data-placement=\"'+place+'\" id=\"olab-tip\">'+esc(tip)+'</span></span></div>';
const src='<button class=\"btn btn--secondary btn--icon-only\" aria-label=\"'+tip+'\" aria-describedby=\"tip\"></button>\n<span class=\"tooltip tooltip--visible'+wrapCls+'\" role=\"tooltip\" data-placement=\"'+place+'\" id=\"tip\">'+tip+'</span>';
if(window.highlight&&code){code.innerHTML=window.highlight(src);code.classList.add('hl');code.dataset.hlDone='1';}else if(code)code.textContent=src;
if(ratio)ratio.textContent='tooltip · '+place+(wrap?' · wrap':'')+' · z-modal · '+stage.dataset.theme+' · pointer-only';
}
root.addEventListener('click',e=>{const p=e.target.closest('[data-olab-size]');if(p){place=p.dataset.olabSize;mark('[data-olab-size]','olabSize',place);build();return;}const sf=e.target.closest('[data-olab-surface]');if(sf){stage.dataset.surface=sf.dataset.olabSurface;mark('[data-olab-surface]','olabSurface',stage.dataset.surface);return;}const sc=e.target.closest('[data-olab-scheme]');if(sc){stage.dataset.theme=sc.dataset.olabScheme;mark('[data-olab-scheme]','olabScheme',stage.dataset.theme);build();return;}if(e.target.closest('[data-olab-copy]')&&code)navigator.clipboard.writeText(code.textContent);});
root.addEventListener('change',build);root.addEventListener('input',build);build();
}
function boot(){document.querySelectorAll('[data-olab=\"tooltip\"]').forEach(init);}
if(window.olabInit)boot();else{document.addEventListener('ds:doc',boot);boot();}
})();
