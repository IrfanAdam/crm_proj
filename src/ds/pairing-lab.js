/* ADAM/DS — src/ds/pairing-lab.js · pairing explorer state + display */
// [plan:2026-09-23_002500-design-system-consolidation.md#phase-2] · options via pairing-options.js.
let labF='action';
let labB='white';
let labLevel=4.5;
let labProbe=null;
const pxScopeResolve=t=>{
  const v=t.startsWith('var(')?t.slice(4,-1):t;
  labProbe.style.color='var('+v+')';
  return getComputedStyle(labProbe).color;
};
const pxLabPaint=()=>{
  const spec=document.getElementById('lab-spec');
  const out=document.querySelector('[data-lab-out]');
  if(!spec||!out)return;
  spec.style.color='var('+FG_BY[labF]+')';
  spec.style.background='var('+BG_BY[labB]+')';
  const cs=getComputedStyle(spec);
  const r=pxRatio(cs.color,cs.backgroundColor);
  const badge=document.querySelector('[data-lab-badge]');
  badge.textContent=pxVerdict(r);
  badge.className='lab-badge '+pxCls(r);
  out.textContent=labF+' on '+labB+' — '+r.toFixed(2)+' · '+pxGuide(r);
  const sn=document.querySelector('[data-lab-snippet]');
  if(sn)sn.textContent='color:var('+FG_BY[labF]+');background:var('+BG_BY[labB]+');';
};
const pxLabSet=(f,b)=>{
  if(f&&FG_BY[f])labF=f;
  if(b&&BG_BY[b])labB=b;
  if(!pxPass(labF,labB)){
    const nb=pxFirstBg(labF);
    if(nb)labB=nb;
  }
  pxLabSync();
};
const pxLabLoad=(f,b)=>{
  if(FG_BY[f])labF=f;
  if(BG_BY[b])labB=b;
  pxLabSync();
  const lab=document.querySelector('[data-lab]');
  if(lab)lab.scrollIntoView({block:'nearest'});
};
const labWidgets=()=>{
  const sc=document.querySelector('[data-lab-scope]');
  if(!sc)return;
  if(!labProbe){
    labProbe=document.createElement('span');
    labProbe.style.cssText='position:absolute;visibility:hidden';
    sc.appendChild(labProbe);
  }
  const fg=document.querySelector('[data-lab-fg]');
  if(fg&&!fg.dataset.done){
    fg.dataset.done='1';
    fg.addEventListener('change',()=>pxLabSet(fg.value,null));
  }
  const bg=document.querySelector('[data-lab-bg]');
  if(bg&&!bg.dataset.done){
    bg.dataset.done='1';
    bg.addEventListener('change',()=>pxLabSet(null,bg.value));
  }
  pxLabSet(labF,labB);
  pxLabTools();
};
document.addEventListener('ds:doc',labWidgets);
labWidgets();
