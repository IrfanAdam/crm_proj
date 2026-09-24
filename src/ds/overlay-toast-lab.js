/* ADAM/DS — src/ds/overlay-toast-lab.js · toast playground */
(function(){
if(window._olabToast)return;window._olabToast=1;
function esc(s){return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/\"/g,'&quot;');}
function init(root){
if(root.dataset.done)return;root.dataset.done='1';
const q=s=>root.querySelector(s),qa=s=>Array.from(root.querySelectorAll(s));
const stage=q('[data-olab-stage]'),preview=q('[data-olab-preview]'),code=q('[data-olab-code]'),ratio=q('[data-olab-ratio]');
let place='bottom-right',tone='';
function mark(sel,attr,val){qa(sel).forEach(b=>b.classList.toggle('is-on',b.dataset[attr]===val));}
function build(){
const msg=(q('[data-olab-body]')||{}).value||'Deal saved',act=(q('[data-olab-act1]')||{}).value||'Undo',dur=(q('[data-olab-dur]')||{}).value||'4',hasAct=(q('[data-olab-hasact]')||{}).checked;
const toneCls=tone?' toast--'+tone:'',region='toast-region--'+place;
preview.innerHTML='<div class=\"ov-stage\"><div class=\"toast-region '+region+'\" aria-live=\"polite\"><div class=\"toast toast--visible'+toneCls+'\" role=\"'+(tone==='danger'?'alert':'status')+'\"><span>'+esc(msg)+'</span>'+(hasAct?'<button class=\"toast__action\">'+esc(act)+'</button>':'')+'<button class=\"toast__close\" aria-label=\"Dismiss\">✕</button></div></div></div>';
const src='<div class=\"toast-region '+region+'\" aria-live=\"polite\">\n  <div class=\"toast toast--visible'+toneCls+'\" role=\"'+(tone==='danger'?'alert':'status')+'\"><span>'+msg+'</span>'+(hasAct?' <button class=\"toast__action\">'+act+'</button>':'')+'</div>\n  <!-- dwell '+(hasAct?'8':dur)+'s -->\n</div>';
if(window.highlight&&code){code.innerHTML=window.highlight(src);code.classList.add('hl');code.dataset.hlDone='1';}else if(code)code.textContent=src;
if(ratio)ratio.textContent='toast · '+toneDim()+' · '+place+' · z-toast · '+stage.dataset.theme+' · '+(hasAct?'8':dur)+'s';
function toneDim(){return tone||'default';}
}
root.addEventListener('click',e=>{const p=e.target.closest('[data-olab-size]');if(p){place=p.dataset.olabSize;mark('[data-olab-size]','olabSize',place);build();return;}const t=e.target.closest('[data-olab-tone]');if(t){tone=t.dataset.olabTone;mark('[data-olab-tone]','olabTone',tone);build();return;}const sf=e.target.closest('[data-olab-surface]');if(sf){stage.dataset.surface=sf.dataset.olabSurface;mark('[data-olab-surface]','olabSurface',stage.dataset.surface);return;}const sc=e.target.closest('[data-olab-scheme]');if(sc){stage.dataset.theme=sc.dataset.olabScheme;mark('[data-olab-scheme]','olabScheme',stage.dataset.theme);build();return;}if(e.target.closest('[data-olab-copy]')&&code)navigator.clipboard.writeText(code.textContent);});
root.addEventListener('change',build);root.addEventListener('input',build);build();
}
function boot(){document.querySelectorAll('[data-olab=\"toast\"]').forEach(init);}
if(window.olabInit)boot();else{document.addEventListener('ds:doc',boot);boot();}
})();
