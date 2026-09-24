/* ADAM/DS — src/ds/overlay-lab.js · overlay playground engine: 6 layers, stage-local */
const OLAB_SIZES={modal:{sm:'overlay__content--sm',md:'overlay__content--md',lg:'overlay__content--lg',full:'overlay__content--full'},drawer:{narrow:'drawer--narrow',wide:'drawer--wide'}};
function olabInit(root){
if(root.dataset.done)return;root.dataset.done='1';
const q=s=>root.querySelector(s),qa=s=>Array.from(root.querySelectorAll(s));
const stage=q('[data-olab-stage]'),preview=q('[data-olab-preview]'),code=q('[data-olab-code]'),ratio=q('[data-olab-ratio]');
const kind=root.dataset.olab;
const st={size:kind==='modal'?'md':kind==='drawer'?'wide':kind==='menu'||kind==='popover'?'bottom':'top',extra:kind==='drawer'?'right':''};
function mark(sel,attr,val){qa(sel).forEach(b=>b.classList.toggle('is-on',b.dataset[attr]===val));}
function build(){
const title=(q('[data-olab-title]')||{}).value||'',body=(q('[data-olab-body]')||{}).value||'',persist=(q('[data-olab-persist]')||{}).checked||false;
const act1=(q('[data-olab-act1]')||{}).value||'',act2=(q('[data-olab-act2]')||{}).value||'';
const tone=(q('[data-olab-tone]')||{}).value||'',dur=(q('[data-olab-dur]')||{}).value||'4',tip=(q('[data-olab-tip]')||{}).value||'';
const placement=st.size;
let html='',codeStr='';
if(kind==='modal'){
const cls='overlay__content '+OLAB_SIZES.modal[st.size];const pers=persist?' overlay--persistent':'';
html='<div class=\"ov-stage\"><div class=\"overlay overlay--open'+pers+'\"><div class=\"'+cls+'\" role=\"dialog\" aria-modal=\"true\" aria-labelledby=\"olab-t\"><div class=\"overlay__header\"><span class=\"overlay__title\" id=\"olab-t\">'+esc(title||'Delete deal?')+'</span><button class=\"overlay__close\" aria-label=\"Close\">✕</button></div><p class=\"overlay__body\">'+esc(body||'Removes Acme from the pipeline.')+'</p><div class=\"overlay__footer\"><button class=\"btn btn--secondary btn--sm\">'+esc(act1||'Cancel')+'</button><button class=\"btn btn--primary btn--sm\">'+esc(act2||'Delete')+'</button></div></div></div></div>';
codeStr='<div class=\"overlay overlay--open'+pers+'\">\n  <div class=\"'+cls+'\" role=\"dialog\" aria-modal=\"true\" aria-labelledby=\"t1\">\n    <div class=\"overlay__header\"><h2 class=\"overlay__title\" id=\"t1\">'+(title||'Delete deal?')+'</h2></div>\n    <p class=\"overlay__body\">'+(body||'Removes Acme from the pipeline.')+'</p>\n    <div class=\"overlay__footer\"><button class=\"btn btn--secondary btn--sm\">'+(act1||'Cancel')+'</button><button class=\"btn btn--primary btn--sm\">'+(act2||'Delete')+'</button></div>\n  </div>\n</div>';
}else if(kind==='drawer'){
const side=st.extra,wide=OLAB_SIZES.drawer[st.size]||'',pers=persist?' drawer--persistent':'';
const sideCls=side==='left'?' drawer--left':'';html='<div class=\"ov-stage\"><div class=\"drawer drawer--open'+sideCls+' '+wide+pers+'\"><div class=\"overlay__header\"><span class=\"overlay__title\">'+esc(title||'Filters')+'</span><button class=\"overlay__close\" aria-label=\"Close\">✕</button></div><p class=\"overlay__body\">'+esc(body||'Stage · Owner · Close date')+'</p><div class=\"overlay__footer\"><button class=\"btn btn--secondary btn--sm\">'+esc(act1||'Reset')+'</button><button class=\"btn btn--primary btn--sm\">'+esc(act2||'Apply')+'</button></div></div></div>';
codeStr='<div class=\"drawer drawer--open'+sideCls+' '+wide+pers+'\">\n  <div class=\"overlay__header\"><span class=\"overlay__title\">'+(title||'Filters')+'</span></div>\n  <p class=\"overlay__body\">'+(body||'Stage · Owner')+'</p>\n</div>';
}else if(kind==='menu'){
html='<div class=\"ov-stage\"><div class=\"ov-anchor\"><button class=\"btn btn--secondary\">Assign <i class=\"ph ph-caret-down\" aria-hidden=\"true\"></i></button><div class=\"menu overlay--open\" data-placement=\"'+placement+'\" role=\"menu\"><button class=\"menu__item\" role=\"menuitem\">'+esc(act1||'Rename')+'</button><button class=\"menu__item menu__item--selected\" role=\"menuitem\">'+esc(act2||'Assign')+'</button><button class=\"menu__item\" role=\"menuitem\">Archive</button></div></div></div>';
codeStr='<div class=\"menu overlay--open\" data-placement=\"'+placement+'\" role=\"menu\">\n  <button class=\"menu__item\" role=\"menuitem\">'+(act1||'Rename')+'</button>\n  <button class=\"menu__item menu__item--selected\" role=\"menuitem\">'+(act2||'Assign')+'</button>\n</div>';
}else if(kind==='popover'){
html='<div class=\"ov-stage\"><div class=\"ov-anchor\"><button class=\"btn btn--secondary\">'+esc(act1||'Close date')+'</button><div class=\"popover overlay--open\" data-placement=\"'+placement+'\" role=\"dialog\" aria-labelledby=\"pt\"><p class=\"popover__title\" id=\"pt\">'+esc(title||'Close date')+'</p><p class=\"popover__body\">'+esc(body||'Anchored detail that keeps its trigger.')+'</p></div></div></div>';
codeStr='<div class=\"popover overlay--open\" data-placement=\"'+placement+'\" role=\"dialog\">\n  <p class=\"popover__title\">'+(title||'Close date')+'</p>\n  <p class=\"popover__body\">'+(body||'Anchored detail')+'</p>\n</div>';
}else if(kind==='tooltip'){
const wrap=(q('[data-olab-wrap]')||{}).checked?' tooltip--wrap':'';
html='<div class=\"ov-stage\"><span class=\"ov-anchor ov-tip\"><button class=\"btn btn--secondary btn--icon-only\" aria-label=\"'+esc(tip||'Save this view')+'\" aria-describedby=\"olab-tip\"><i class=\"ph ph-bookmark-simple\" aria-hidden=\"true\"></i></button><span class=\"tooltip tooltip--visible'+wrap+'\" role=\"tooltip\" data-placement=\"'+placement+'\" id=\"olab-tip\">'+esc(tip||'Save this view')+'</span></span></div>';
codeStr='<button aria-describedby=\"tip\" aria-label=\"'+(tip||'Save')+'\"></button>\n<span class=\"tooltip tooltip--visible'+wrap+'\" role=\"tooltip\" data-placement=\"'+placement+'\">'+(tip||'Save this view')+'</span>';
}else if(kind==='toast'){
const region='toast-region--'+placement,toneCls=tone?' toast--'+tone:'';
html='<div class=\"ov-stage\"><div class=\"toast-region '+region+'\" aria-live=\"polite\"><div class=\"toast toast--visible'+toneCls+'\" role=\"status\"><span>'+esc(body||'Deal saved')+'</span>'+(act1?'<button class=\"toast__action\">'+esc(act1)+'</button>':'')+'<button class=\"toast__close\" aria-label=\"Dismiss\">✕</button></div></div></div>';
codeStr='<div class=\"toast-region '+region+'\" aria-live=\"polite\">\n  <div class=\"toast toast--visible'+toneCls+'\" role=\"status\"><span>'+(body||'Deal saved')+'</span>'+(act1?' <button class=\"toast__action\">'+act1+'</button>':'')+'</div>\n  <!-- dwell '+dur+'s'+(persist?' paused on hover':'')+' -->\n</div>';
}
preview.innerHTML=html;
if(window.highlight&&code){code.innerHTML=window.highlight(codeStr);code.classList.add('hl');code.dataset.hlDone='1';}else if(code){code.textContent=codeStr;}
if(ratio)ratio.textContent=kind+' · '+placement+' · z-'+(kind==='toast'?'toast':kind==='menu'||kind==='popover'?'dropdown':'modal')+' · '+stage.dataset.theme;
}
function esc(s){return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/\"/g,'&quot;');}
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
