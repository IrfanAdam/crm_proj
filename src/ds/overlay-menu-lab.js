/* ADAM/DS — src/ds/overlay-menu-lab.js · menu playground */
(function(){
if(window._olabMenu)return;window._olabMenu=1;
function esc(s){return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/\"/g,'&quot;');}
function init(root){
if(root.dataset.done)return;root.dataset.done='1';
const q=s=>root.querySelector(s),qa=s=>Array.from(root.querySelectorAll(s));
const stage=q('[data-olab-stage]'),preview=q('[data-olab-preview]'),code=q('[data-olab-code]'),ratio=q('[data-olab-ratio]');
let place='bottom';
function mark(sel,attr,val){qa(sel).forEach(b=>b.classList.toggle('is-on',b.dataset[attr]===val));}
function build(){
const a1=(q('[data-olab-act1]')||{}).value||'Rename',a2=(q('[data-olab-act2]')||{}).value||'Assign',a3=(q('[data-olab-act3]')||{}).value||'Archive';
preview.innerHTML='<div class=\"ov-stage\"><div class=\"ov-anchor\"><button class=\"btn btn--secondary\">Assign <i class=\"ph ph-caret-down\" aria-hidden=\"true\"></i></button><div class=\"menu overlay--open\" role=\"menu\" data-placement=\"'+place+'\"><button class=\"menu__item\" role=\"menuitem\">'+esc(a1)+'</button><button class=\"menu__item menu__item--selected\" role=\"menuitem\">'+esc(a2)+'</button><button class=\"menu__item\" role=\"menuitem\">'+esc(a3)+'</button></div></div></div>';
const src='<button class=\"btn btn--secondary\" aria-haspopup=\"menu\" aria-expanded=\"false\">Assign</button>\n<div class=\"menu overlay--open\" role=\"menu\" data-placement=\"'+place+'\">\n  <button class=\"menu__item\" role=\"menuitem\">'+a1+'</button>\n  <button class=\"menu__item menu__item--selected\" role=\"menuitem\">'+a2+'</button>\n  <button class=\"menu__item\" role=\"menuitem\">'+a3+'</button>\n</div>';
if(window.highlight&&code){code.innerHTML=window.highlight(src);code.classList.add('hl');code.dataset.hlDone='1';}else if(code)code.textContent=src;
if(ratio)ratio.textContent='menu · '+place+' · z-dropdown · '+stage.dataset.theme;
}
root.addEventListener('click',e=>{const p=e.target.closest('[data-olab-size]');if(p){place=p.dataset.olabSize;mark('[data-olab-size]','olabSize',place);build();return;}const sf=e.target.closest('[data-olab-surface]');if(sf){stage.dataset.surface=sf.dataset.olabSurface;mark('[data-olab-surface]','olabSurface',stage.dataset.surface);return;}const sc=e.target.closest('[data-olab-scheme]');if(sc){stage.dataset.theme=sc.dataset.olabScheme;mark('[data-olab-scheme]','olabScheme',stage.dataset.theme);build();return;}if(e.target.closest('[data-olab-copy]')&&code)navigator.clipboard.writeText(code.textContent);});
root.addEventListener('change',build);root.addEventListener('input',build);build();
}
function boot(){document.querySelectorAll('[data-olab=\"menu\"]').forEach(init);}
if(window.olabInit)boot();else{document.addEventListener('ds:doc',boot);boot();}
})();
