/* ADAM/DS — src/ds/pairing-lab.js · pairing lab picker */
// [plan:2026-09-23_002500-design-system-consolidation.md#phase-2] · needs gallery.js px* globals.
let labF='action';
let labB='white';
const pxChips=(sel,names,set)=>{
  const host=document.querySelector(sel);
  if(!host||host.dataset.done)return;
  host.dataset.done='1';
  names.forEach(n=>{
    const c=document.createElement('button');
    c.className='chip';
    c.textContent=n;
    c.dataset.n=n;
    c.addEventListener('click',()=>set(n));
    host.appendChild(c);
  });
};
const pxMark=(sel,n)=>{
  document.querySelectorAll(sel+' .chip').forEach(c=>{
    c.classList.toggle('chip--active',c.dataset.n===n);
  });
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
  pxMark('[data-lab-fg]',labF);
  pxMark('[data-lab-bg]',labB);
  pxLabPaint();
};
const pxLabLoad=(f,b)=>{
  pxLabSet(f,b);
  const lab=document.querySelector('[data-lab]');
  if(lab)lab.scrollIntoView({block:'nearest'});
};
const pxLabTools=()=>{
  const sw=document.querySelector('[data-lab-swap]');
  if(sw&&!sw.dataset.done){
    sw.dataset.done='1';
    sw.addEventListener('click',()=>{
      if(FG_BY[labB]&&BG_BY[labF])pxLabSet(labB,labF);
    });
  }
  const cp=document.querySelector('[data-lab-copy]');
  if(cp&&!cp.dataset.done){
    cp.dataset.done='1';
    cp.addEventListener('click',()=>{
      const sn=document.querySelector('[data-lab-snippet]');
      if(sn&&navigator.clipboard)navigator.clipboard.writeText(sn.textContent);
      cp.textContent='copied';
      setTimeout(()=>{cp.textContent='copy';},1200);
    });
  }
};
const labWidgets=()=>{
  pxChips('[data-lab-fg]',Object.keys(FG_BY),f=>pxLabSet(f,null));
  pxChips('[data-lab-bg]',Object.keys(BG_BY),b=>pxLabSet(null,b));
  pxLabSet(labF,labB);
  pxLabTools();
};
document.addEventListener('ds:doc',labWidgets);
labWidgets();
