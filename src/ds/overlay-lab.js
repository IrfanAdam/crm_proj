/* ADAM/DS — src/ds/overlay-lab.js · overlay playground engine: 6 layers, live interactions */
const OLAB_SIZES={modal:{sm:'overlay__content--sm',md:'overlay__content--md',lg:'overlay__content--lg',full:'overlay__content--full'},drawer:{narrow:'drawer--narrow',wide:'drawer--wide'}};
function olabInit(root){
if(root.dataset.done)return;root.dataset.done='1';
const q=s=>root.querySelector(s),qa=s=>Array.from(root.querySelectorAll(s));
const stage=q('[data-olab-stage]'),preview=q('[data-olab-preview]'),code=q('[data-olab-code]'),ratio=q('[data-olab-ratio]');
const kind=root.dataset.olab;
const uid='olab-'+Math.random().toString(36).slice(2,7);
const st={size:kind==='modal'?'md':kind==='drawer'?'wide':kind==='menu'||kind==='popover'?'bottom':'top',extra:kind==='drawer'?'right':''};
function mark(sel,attr,val){qa(sel).forEach(b=>b.classList.toggle('is-on',b.dataset[attr]===val));}
function build(){
const title=(q('[data-olab-title]')||{}).value||'',body=(q('[data-olab-body]')||{}).value||'',persist=(q('[data-olab-persist]')||{}).checked||false;
const act1=(q('[data-olab-act1]')||{}).value||'',act2=(q('[data-olab-act2]')||{}).value||'';
const tone=(q('[data-olab-tone]')||{}).value||'',tip=(q('[data-olab-tip]')||{}).value||'';
const placement=st.size;
let html='',codeStr='';
if(kind==='modal'){
const cls='overlay__content '+OLAB_SIZES.modal[st.size];const pers=persist?' overlay--persistent':'';
html='<div class="ov-stage"><button class="btn btn--primary btn--sm" data-overlay-target="'+uid+'">Open modal</button><div id="'+uid+'" class="overlay'+pers+'" hidden aria-hidden="true"><div class="'+cls+'" role="dialog" aria-modal="true" aria-labelledby="'+uid+'-t"><div class="overlay__header"><span class="overlay__title" id="'+uid+'-t">'+esc(title||'Delete deal?')+'</span><button class="overlay__close" aria-label="Close" data-overlay-close>✕</button></div><p class="overlay__body">'+esc(body||'Removes Acme from the pipeline.')+'</p><div class="overlay__footer"><button class="btn btn--secondary btn--sm" data-overlay-close>'+esc(act1||'Cancel')+'</button><button class="btn btn--primary btn--sm">'+esc(act2||'Delete')+'</button></div></div></div></div>';
codeStr='<button data-overlay-target="'+uid+'">Open</button>\n<div id="'+uid+'" class="overlay'+pers+'" hidden>\n  <div class="'+cls+'" role="dialog" aria-modal="true">\n    <h2>'+(title||'Delete deal?')+'</h2>\n    <p>'+(body||'Removes Acme')+'</p>\n  </div>\n</div>\n<!-- scrim/Esc close'+(persist?' disabled — persistent':'')+' · focus trap · return-focus -->';
}else if(kind==='drawer'){
const side=st.extra,wide=OLAB_SIZES.drawer[st.size]||'',pers=persist?' drawer--persistent':'';const sideCls=side==='left'?' drawer--left':'';
html='<div class="ov-stage"><button class="btn btn--primary btn--sm" data-overlay-target="'+uid+'">Open drawer</button><div id="'+uid+'" class="drawer'+sideCls+' '+wide+pers+'" hidden aria-hidden="true"><div class="overlay__header"><span class="overlay__title">'+esc(title||'Filters')+'</span><button class="overlay__close" aria-label="Close" data-overlay-close>✕</button></div><p class="overlay__body">'+esc(body||'Stage · Owner · Close date')+'</p><div class="overlay__footer"><button class="btn btn--secondary btn--sm" data-overlay-close>'+esc(act1||'Reset')+'</button><button class="btn btn--primary btn--sm">'+esc(act2||'Apply')+'</button></div></div></div>';
codeStr='<button data-overlay-target="'+uid+'">Open drawer</button>\n<div id="'+uid+'" class="drawer'+sideCls+' '+wide+pers+'" hidden>\n  <div class="overlay__header"><span>'+(title||'Filters')+'</span></div>\n  <p>'+(body||'Stage · Owner')+'</p>\n</div>';
}else if(kind==='menu'){
html='<div class="ov-stage"><span class="ov-anchor"><button class="btn btn--secondary" data-overlay-target="'+uid+'" aria-haspopup="menu" aria-expanded="false">Assign <i class="ph ph-caret-down" aria-hidden="true"></i></button><div id="'+uid+'" class="menu" hidden role="menu" data-placement="'+placement+'"><button class="menu__item" role="menuitem">'+esc(act1||'Rename')+'</button><button class="menu__item menu__item--selected" role="menuitem">'+esc(act2||'Assign')+'</button><button class="menu__item" role="menuitem">Archive</button></div></span></div>';
codeStr='<button data-overlay-target="'+uid+'" aria-haspopup="menu">Assign</button>\n<div id="'+uid+'" class="menu" hidden role="menu" data-placement="'+placement+'">\n  <button class="menu__item">'+(act1||'Rename')+'</button>\n  <button class="menu__item menu__item--selected">'+(act2||'Assign')+'</button>\n</div>\n<!-- outside click · item select · Arrows/Home/End · Esc close + refocus -->';
}else if(kind==='popover'){
html='<div class="ov-stage"><span class="ov-anchor"><button class="btn btn--secondary" data-overlay-target="'+uid+'" aria-haspopup="dialog" aria-expanded="false">'+esc(act1||'Close date')+'</button><div id="'+uid+'" class="popover" hidden role="dialog" data-placement="'+placement+'" aria-labelledby="'+uid+'-pt"><p class="popover__title" id="'+uid+'-pt">'+esc(title||'Close date')+'</p><p class="popover__body">'+esc(body||'Anchored detail that keeps its trigger.')+'</p><button class="btn btn--sm btn--secondary" data-overlay-close style="margin-top:8px">Close</button></div></span></div>';
codeStr='<button data-overlay-target="'+uid+'" aria-haspopup="dialog">Close date</button>\n<div id="'+uid+'" class="popover" hidden role="dialog" data-placement="'+placement+'">\n  <p class="popover__title">'+(title||'Close date')+'</p>\n  <p class="popover__body">'+(body||'Anchored detail')+'</p>\n</div>';
}else if(kind==='tooltip'){
const wrap=(q('[data-olab-wrap]')||{}).checked?' tooltip--wrap':'';
html='<div class="ov-stage"><span class="ov-anchor ov-tip"><button class="btn btn--secondary btn--icon-only" aria-label="'+esc(tip||'Save this view')+'" aria-describedby="'+uid+'"><i class="ph ph-bookmark-simple" aria-hidden="true"></i></button><span class="tooltip'+wrap+'" role="tooltip" data-placement="'+placement+'" id="'+uid+'">'+esc(tip||'Save this view')+'</span></span></div>';
codeStr='<button aria-describedby="'+uid+'" aria-label="'+(tip||'Save')+'"></button>\n<span class="tooltip'+wrap+'" role="tooltip" data-placement="'+placement+'" id="'+uid+'">'+(tip||'Save this view')+'</span>\n<!-- hover/focus shows · Esc hides · never focusable -->';
}else if(kind==='toast'){
const region='toast-region--'+placement,toneCls=tone?' toast--'+tone:'';
html='<div class="ov-stage"><button class="btn btn--primary btn--sm" data-overlay-target="'+uid+'">Show toast</button><div class="toast-region '+region+'" aria-live="polite"><div id="'+uid+'" class="toast'+toneCls+'" hidden role="'+(tone==='danger'?'alert':'status')+'"><span>'+esc(body||'Deal saved')+'</span>'+(act1?'<button class="toast__action">'+esc(act1)+'</button>':'')+'<button class="toast__close" aria-label="Dismiss" data-overlay-close>✕</button></div></div></div>';
codeStr='<button data-overlay-target="'+uid+'">Show toast</button>\n<div class="toast-region '+region+'" aria-live="polite">\n  <div id="'+uid+'" class="toast'+toneCls+'" hidden role="'+(tone==='danger'?'alert':'status')+'"><span>'+(body||'Deal saved')+'</span>'+(act1?' <button class="toast__action">'+act1+'</button>':'')+'</div>\n</div>\n<!-- data-overlay-target opens · dwell 4s / 8s+action · hover pauses · close sinks -->';
}
preview.innerHTML=html;
if(kind!=='toast'&&kind!=='tooltip'){
// ensure trigger uses overlay engine (already via data-overlay-target delegation)
}
if(window.highlight&&code){code.innerHTML=window.highlight(codeStr);code.classList.add('hl');}else if(code)code.textContent=codeStr;
if(ratio)ratio.textContent=kind+' · '+placement+' · '+(kind==='toast'?'z-toast':kind==='menu'||kind==='popover'?'z-dropdown':'z-modal')+' · '+stage.dataset.theme+(persist&&kind!=='tooltip'?' · persistent':'');
}
function esc(s){return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}
root.addEventListener('click',e=>{
const p=e.target.closest('[data-olab-size]');if(p){st.size=p.dataset.olabSize;mark('[data-olab-size]','olabSize',st.size);build();return;}
const s=e.target.closest('[data-olab-side]');if(s){st.extra=s.dataset.olabSide;mark('[data-olab-side]','olabSide',st.extra);build();return;}
const sf=e.target.closest('[data-olab-surface]');if(sf){stage.dataset.surface=sf.dataset.olabSurface;mark('[data-olab-surface]','olabSurface',stage.dataset.surface);return;}
const sc=e.target.closest('[data-olab-scheme]');if(sc){stage.dataset.theme=sc.dataset.olabScheme;mark('[data-olab-scheme]','olabScheme',stage.dataset.theme);build();return;}
if(e.target.closest('[data-olab-copy]')&&code)navigator.clipboard.writeText(code.textContent);
});
root.addEventListener('change',build);root.addEventListener('input',build);build();
}
function olabBoot(){document.querySelectorAll('[data-olab]').forEach(olabInit);}
document.addEventListener('ds:doc',olabBoot);olabBoot();
