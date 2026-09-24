/* ADAM/DS — src/ds/overlay-modal-lab.js · modal playground · delegates to overlay-lab.js if present else self boots */
(function(){
if(window._olabModal)return;window._olabModal=1;
function esc(s){return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/\"/g,'&quot;');}
function init(root){
if(root.dataset.done)return;root.dataset.done='1';
const q=s=>root.querySelector(s),qa=s=>Array.from(root.querySelectorAll(s));
const stage=q('[data-olab-stage]'),preview=q('[data-olab-preview]'),code=q('[data-olab-code]'),ratio=q('[data-olab-ratio]');
let size='md';
function mark(sel,attr,val){qa(sel).forEach(b=>b.classList.toggle('is-on',b.dataset[attr]===val));}
function build(){
const t=(q('[data-olab-title]')||{}).value||'Delete deal?',b=(q('[data-olab-body]')||{}).value||'Removes Acme from the pipeline. Esc, scrim or Cancel closes and returns focus.',a1=(q('[data-olab-act1]')||{}).value||'Cancel',a2=(q('[data-olab-act2]')||{}).value||'Delete',pers=(q('[data-olab-persist]')||{}).checked;
const cls='overlay__content overlay__content--'+size,persCls=pers?' overlay--persistent':'';
preview.innerHTML='<div class=\"ov-stage\"><div class=\"overlay overlay--open'+persCls+'\"><div class=\"'+cls+'\" role=\"dialog\" aria-modal=\"true\" aria-labelledby=\"olab-t\"><div class=\"overlay__header\"><span class=\"overlay__title\" id=\"olab-t\">'+esc(t)+'</span><button class=\"overlay__close\" aria-label=\"Close\">✕</button></div><p class=\"overlay__body\">'+esc(b)+'</p><div class=\"overlay__footer\"><button class=\"btn btn--secondary btn--sm\">'+esc(a1)+'</button><button class=\"btn btn--primary btn--sm\">'+esc(a2)+'</button></div></div></div></div>';
const src='<div class=\"overlay overlay--open'+persCls+'\">\n  <div class=\"'+cls+'\" role=\"dialog\" aria-modal=\"true\" aria-labelledby=\"t1\">\n    <div class=\"overlay__header\"><h2 class=\"overlay__title\" id=\"t1\">'+t+'</h2></div>\n    <p class=\"overlay__body\">'+b+'</p>\n    <div class=\"overlay__footer\"><button class=\"btn btn--secondary btn--sm\">'+a1+'</button><button class=\"btn btn--primary btn--sm\">'+a2+'</button></div>\n  </div>\n</div>';
if(window.highlight&&code){code.innerHTML=window.highlight(src);code.classList.add('hl');code.dataset.hlDone='1';}else if(code)code.textContent=src;
if(ratio)ratio.textContent='modal · '+size+' · z-modal · '+stage.dataset.theme+(pers?' · persistent':'');
}
root.addEventListener('click',e=>{const p=e.target.closest('[data-olab-size]');if(p){size=p.dataset.olabSize;mark('[data-olab-size]','olabSize',size);build();return;}const sf=e.target.closest('[data-olab-surface]');if(sf){stage.dataset.surface=sf.dataset.olabSurface;mark('[data-olab-surface]','olabSurface',stage.dataset.surface);return;}const sc=e.target.closest('[data-olab-scheme]');if(sc){stage.dataset.theme=sc.dataset.olabScheme;mark('[data-olab-scheme]','olabScheme',stage.dataset.theme);build();return;}if(e.target.closest('[data-olab-copy]')&&code)navigator.clipboard.writeText(code.textContent);});
root.addEventListener('change',build);root.addEventListener('input',build);build();
}
function boot(){document.querySelectorAll('[data-olab=\"modal\"]').forEach(init);}
if(window.olabInit)boot();else{document.addEventListener('ds:doc',boot);boot();}
})();
