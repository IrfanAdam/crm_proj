/* ADAM/DS — src/ds/overlay-drawer-lab.js · drawer playground */
(function(){
if(window._olabDrawer)return;window._olabDrawer=1;
function esc(s){return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/\"/g,'&quot;');}
function init(root){
if(root.dataset.done)return;root.dataset.done='1';
const q=s=>root.querySelector(s),qa=s=>Array.from(root.querySelectorAll(s));
const stage=q('[data-olab-stage]'),preview=q('[data-olab-preview]'),code=q('[data-olab-code]'),ratio=q('[data-olab-ratio]');
let size='wide',side='right';
function mark(sel,attr,val){qa(sel).forEach(b=>b.classList.toggle('is-on',b.dataset[attr]===val));}
function build(){
const t=(q('[data-olab-title]')||{}).value||'Filters',b=(q('[data-olab-body]')||{}).value||'Stage · Owner · Close date — body scrolls, footer sticks.',a1=(q('[data-olab-act1]')||{}).value||'Reset',a2=(q('[data-olab-act2]')||{}).value||'Apply',pers=(q('[data-olab-persist]')||{}).checked;
const wide=size==='narrow'?'drawer--narrow':size==='wide'?'drawer--wide':'',sideCls=side==='left'?' drawer--left':'',persCls=pers?' drawer--persistent':'';
preview.innerHTML='<div class=\"ov-stage\"><div class=\"drawer drawer--open'+sideCls+' '+wide+persCls+'\"><div class=\"overlay__header\"><span class=\"overlay__title\">'+esc(t)+'</span><button class=\"overlay__close\" aria-label=\"Close\">✕</button></div><p class=\"overlay__body\">'+esc(b)+'</p><div class=\"overlay__footer\"><button class=\"btn btn--secondary btn--sm\">'+esc(a1)+'</button><button class=\"btn btn--primary btn--sm\">'+esc(a2)+'</button></div></div></div>';
const src='<div class=\"drawer drawer--open'+sideCls+' '+wide+persCls+'\">\n  <div class=\"overlay__header\"><span class=\"overlay__title\">'+t+'</span></div>\n  <p class=\"overlay__body\">'+b+'</p>\n</div>';
if(window.highlight&&code){code.innerHTML=window.highlight(src);code.classList.add('hl');code.dataset.hlDone='1';}else if(code)code.textContent=src;
if(ratio)ratio.textContent='drawer · '+side+' · '+size+' · z-modal · '+stage.dataset.theme+(pers?' · persistent':'');
}
root.addEventListener('click',e=>{const p=e.target.closest('[data-olab-size]');if(p){size=p.dataset.olabSize;mark('[data-olab-size]','olabSize',size);build();return;}const s=e.target.closest('[data-olab-side]');if(s){side=s.dataset.olabSide;mark('[data-olab-side]','olabSide',side);build();return;}const sf=e.target.closest('[data-olab-surface]');if(sf){stage.dataset.surface=sf.dataset.olabSurface;mark('[data-olab-surface]','olabSurface',stage.dataset.surface);return;}const sc=e.target.closest('[data-olab-scheme]');if(sc){stage.dataset.theme=sc.dataset.olabScheme;mark('[data-olab-scheme]','olabScheme',stage.dataset.theme);build();return;}if(e.target.closest('[data-olab-copy]')&&code)navigator.clipboard.writeText(code.textContent);});
root.addEventListener('change',build);root.addEventListener('input',build);build();
}
function boot(){document.querySelectorAll('[data-olab=\"drawer\"]').forEach(init);}
if(window.olabInit)boot();else{document.addEventListener('ds:doc',boot);boot();}
})();
