import { createMechanicsCanvas } from './canvas.js';
import { getMode } from './graph.js';
let engine=null, view=null, inited=false;
export function initMechanics(){
  const canvas=document.getElementById('mechanics-canvas')||document.getElementById('atlas-canvas');
  const tip=document.getElementById('mechanics-tooltip');
  const nav=document.getElementById('atlas-nav');
  const modeSelect=document.getElementById('mechanics-mode');
  const toggle=document.getElementById('mechanics-chrome-toggle');
  // atlas hosts mechanics directly — no overlay view; fallback for legacy #mechanics-view
  view=document.getElementById('atlas-canvas')||document.getElementById('mechanics-view');
  const link=nav||document.getElementById('mechanics-link');
  const back=document.getElementById('mechanics-back');
  if(!canvas||canvas.tagName!=='CANVAS'){
    // ensure canvas element exists inside #atlas-canvas
    const host=document.getElementById('atlas-canvas');
    if(host&&!host.querySelector('canvas')){
      const c=document.createElement('canvas'); c.id='mechanics-canvas'; c.width=1600; c.height=900; c.setAttribute('aria-label','Architecture mechanics canvas'); host.appendChild(c);
    }
  }
  const getCanvas=()=>document.getElementById('mechanics-canvas')||document.getElementById('atlas-canvas');
  function toggleChrome(){
    const host=document.getElementById('atlas-canvas')||view;
    if(!host) return;
    const clean=host.classList.toggle('mechanics-view--clean');
    if(toggle){ toggle.setAttribute('aria-pressed',String(clean)); toggle.textContent=clean?'◳ Show':'◱ Hide'; }
    if(engine) engine.resize();
  }
  if(toggle) toggle.addEventListener('click',toggleChrome);
  document.addEventListener('keydown',e=>{
    if(e.key==='Escape'){
      if(engine&&view&&history.state&&history.state.mechanics) history.back();
      else if(tip) tip.hidden=true;
    }
    if((e.key==='h'||e.key==='H')&&!e.metaKey&&!e.ctrlKey){
      if(e.target.tagName==='INPUT'||e.target.tagName==='TEXTAREA') return;
      const host=document.getElementById('atlas-canvas'); if(host) toggleChrome();
    }
  });
  function syncModeUI(){
    const m=engine?engine.getMode():getMode();
    if(modeSelect) modeSelect.value=m;
    document.querySelectorAll('#atlas-nav [data-lens]').forEach(b=>b.setAttribute('aria-selected',String(b.dataset.lens===m)));
  }
  if(modeSelect){
    try{ modeSelect.value=getMode(); }catch{}
    modeSelect.addEventListener('change',e=>{
      if(!engine){ try{ localStorage.setItem('mechanics:mode',e.target.value);}catch{} syncModeUI(); return; }
      engine.setMode(e.target.value); syncModeUI();
    });
    document.addEventListener('mechanics:mode',syncModeUI);
  }
  if(nav){
    nav.addEventListener('click',e=>{
      const btn=e.target.closest('[data-lens]'); if(!btn) return;
      const next=btn.dataset.lens;
      if(!engine){
        try{ localStorage.setItem('mechanics:mode',next);}catch{}
        syncModeUI();
        ensureEngine();
        if(engine) engine.setMode(next);
        history.pushState({mechanics:true},'');
        return;
      }
      engine.setMode(next); syncModeUI(); history.pushState({mechanics:true},'');
    });
  }
  if(link&&link.id==='mechanics-link') link.addEventListener('click',e=>{ e.preventDefault(); ensureEngine(); syncModeUI(); history.pushState({mechanics:true},''); });
  if(back) back.addEventListener('click',()=>{ if(history.state&&history.state.mechanics) history.back(); });
  window.addEventListener('popstate',()=>{
    if(tip) tip.hidden=true;
    syncModeUI();
  });
  function ensureEngine(){
    if(inited) return;
    const c=document.getElementById('mechanics-canvas');
    const t=document.getElementById('mechanics-tooltip');
    if(!c||!t) return;
    engine=createMechanicsCanvas(c,t); inited=true; syncModeUI();
  }
  // lazy ensure on first nav interaction; also eager if canvas already present
  ensureEngine();
  return { get engine(){return engine;}, ensureEngine };
}
