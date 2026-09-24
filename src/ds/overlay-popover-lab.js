/* ADAM/DS — src/ds/overlay-popover-lab.js · popover playground */
(function(){
if(window._olabPop)return;window._olabPop=1;
function esc(s){return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/\"/g,'&quot;');}
function init(root){
if(root.dataset.done)return;root.dataset.done='1';
const q=s=>root.querySelector(s),qa=s=>Array.from(root.querySelectorAll(s));
const stage=q('[data-olab-stage]'),preview=q('[data-olab-preview]'),code=q('[data-olab-code]'),ratio=q('[data-olab-ratio]');
let place='bottom';
function mark(sel,attr,val){qa(sel).forEach(b=>b.classList.toggle('is-on',b.dataset[attr]===val));}
function build(){
const t=(q('[data-olab-title]')||{}).value||'Close date',b=(q('[data-olab-body]')||{}).value||'Anchored detail that keeps its trigger — links and buttons welcome.',a1=(q('[data-olab-act1]')||{}).value||'Close date';
preview.innerHTML='<div class=\"ov-stage\"><div class=\"ov-anchor\"><button class=\"btn btn--secondary\">'+esc(a1)+'</button><div class=\"popover overlay--open\" role=\"dialog\" data-placement=\"'+place+'\" aria-labelledby=\"olab-pt\"><p class=\"popover__title\" id=\"olab-pt\">'+esc(t)+'</p><p class=\"popover__body\">'+esc(b)+'</p></div></div></div>';
const src='<button aria-haspopup=\"dialog\" aria-expanded=\"false\">'+a1+'</button>\n<div class=\"popover overlay--open\" role=\"dialog\" data-placement=\"'+place+'\" aria-labelledby=\"t1\">\n  <p class=\"popover__title\" id=\"t1\">'+t+'</p>\n  <p class=\"popover__body\">'+b+'</p>\n</div>';
if(window.highlight&&code){code.innerHTML=window.highlight(src);code.classList.add('hl');code.dataset.hlDone='1';}else if(code)code.textContent=src;
if(ratio)ratio.textContent='popover · '+place+' · z-dropdown · '+stage.dataset.theme;
}
root.addEventListener('click',e=>{const p=e.target.closest('[data-olab-size]');if(p){place=p.dataset.olabSize;mark('[data-olab-size]','olabSize',place);build();return;}const sf=e.target.closest('[data-olab-surface]');if(sf){stage.dataset.surface=sf.dataset.olabSurface;mark('[data-olab-surface]','olabSurface',stage.dataset.surface);return;}const sc=e.target.closest('[data-olab-scheme]');if(sc){stage.dataset.theme=sc.dataset.olabScheme;mark('[data-olab-scheme]','olabScheme',stage.dataset.theme);build();return;}if(e.target.closest('[data-olab-copy]')&&code)navigator.clipboard.writeText(code.textContent);});
root.addEventListener('change',build);root.addEventListener('input',build);build();
}
function boot(){document.querySelectorAll('[data-olab=\"popover\"]').forEach(init);}
if(window.olabInit)boot();else{document.addEventListener('ds:doc',boot);boot();}
})();
