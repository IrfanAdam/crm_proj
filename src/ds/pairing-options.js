/* ADAM/DS — src/ds/pairing-options.js · grouped pass-only lab options */
// [plan:2026-09-23_002500-design-system-consolidation.md#phase-2] · needs gallery.js; used by pairing-lab.js.
const FG_GROUPS=['Action','Measure','Score','Warn','Mark','Text','Feedback','Neutrals'];
const BG_GROUPS=['Surfaces','Action','Measure','Score','Neutrals'];
const FG_GRP=Object.fromEntries(PAIR_FG.map(e=>[e[0],e[2]]));
const BG_GRP=Object.fromEntries(PAIR_BG.map(e=>[e[0],e[2]]));
const pxPass=(f,b)=>pxRatio(pxScopeResolve(FG_BY[f]),pxScopeResolve(BG_BY[b]))>=labLevel;
const pxFirstBg=f=>Object.keys(BG_BY).find(b=>pxPass(f,b));
const pxFill=(sel,groups,gmap,cmap,anchor,keep)=>{
  const host=document.querySelector(sel);
  if(!host)return;
  host.innerHTML='';
  groups.forEach(g=>{
    const names=Object.keys(cmap).filter(n=>gmap[n]===g);
    const ok=names.filter(n=>n===keep||pxRatio(cmap[n],anchor)>=labLevel);
    if(!ok.length)return;
    const og=document.createElement('optgroup');
    og.label=g;
    ok.forEach(n=>{
      const o=document.createElement('option');
      o.value=n;
      const r=pxRatio(cmap[n],anchor);
      o.textContent=n+' — '+r.toFixed(2)+' '+pxVerdict(r);
      og.appendChild(o);
    });
    host.appendChild(og);
  });
  host.value=keep;
};
const pxLabSync=()=>{
  const fc={};
  Object.keys(FG_BY).forEach(f=>{fc[f]=pxScopeResolve(FG_BY[f])});
  const bc={};
  Object.keys(BG_BY).forEach(b=>{bc[b]=pxScopeResolve(BG_BY[b])});
  pxFill('[data-lab-fg]',FG_GROUPS,FG_GRP,fc,bc[labB],labF);
  pxFill('[data-lab-bg]',BG_GROUPS,BG_GRP,bc,fc[labF],labB);
  pxLabPaint();
};
