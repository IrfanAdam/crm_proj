/* ADAM/DS — src/ds/gallery.js · pairing pills + matrix */
// [plan:2026-09-23_002500-design-system-consolidation.md#phase-2] · plain script, playground in contrast-playground.js.
const pxLum=v=>{
  const m=v.match(/[\d.]+/g).slice(0,3).map(x=>{
    x/=255;
    return x<=0.03928?x/12.92:Math.pow((x+0.055)/1.055,2.4);
  });
  return 0.2126*m[0]+0.7152*m[1]+0.0722*m[2];
};
const pxRatio=(a,b)=>{
  const x=pxLum(a);
  const y=pxLum(b);
  return (Math.max(x,y)+0.05)/(Math.min(x,y)+0.05);
};
const pxVerdict=r=>{
  if(r>=7)return 'AAA';
  if(r>=4.5)return 'AA';
  if(r>=3)return 'AA-large';
  return 'FAIL';
};
const PX_CLS={AAA:'mx-ok',AA:'mx-ok','AA-large':'mx-mid',FAIL:'mx-bad'};
const pxCls=r=>PX_CLS[pxVerdict(r)];
const PX_GUIDE=['Decorative only — never for text.','Large text only — 18pt+.','Safe for body text.'];
const pxGuide=r=>PX_GUIDE[(r>=3)+(r>=4.5)];
const PAIR_FG=[
  ['action','--role-action','Action'],['action-strong','--role-action-strong','Action'],
  ['measure','--role-measure','Measure'],['measure-strong','--role-measure-strong','Measure'],
  ['score','--role-score','Score'],['score-strong','--role-score-strong','Score'],
  ['streak','--role-streak','Streak'],['streak-strong','--role-streak-strong','Streak'],
  ['secondary','--text-secondary','Text'],['muted','--text-muted','Text'],
  ['dim','--text-dim','Text'],['emphasis','--text-emphasis','Text'],
  ['white','--primitive-gray-white','Neutrals'],['ink','--primitive-ink','Neutrals'],
  ['success','--role-success','Feedback'],['danger','--role-danger','Feedback'],
  ['warning','--role-warning','Feedback']
];
const PAIR_BG=[
  ['canvas','--bg-primary','Surfaces'],['surface','--bg-surface','Surfaces'],
  ['white','--primitive-gray-white','Surfaces'],['glass','--bg-surface-glass','Surfaces'],
  ['action','--role-action','Action'],['ink','--primitive-ink','Neutrals'],
  ['measure','--role-measure','Measure'],['measure-soft','--role-measure-soft','Measure'],
  ['score','--role-score','Score'],['score-soft','--role-score-soft','Score'],
  ['action-soft','--role-action-soft','Action'],['streak','--role-streak','Streak'],
  ['streak-soft','--role-streak-soft','Streak'],
  ['success','--role-success','Feedback'],['danger','--role-danger','Feedback'],
  ['warning','--role-warning','Feedback']
];
const FG_BY=Object.fromEntries(PAIR_FG);
const BG_BY=Object.fromEntries(PAIR_BG);
let pxProbe=null;
const pxResolve=t=>{
  const v=t.startsWith('var(')?t.slice(4,-1):t;
  pxProbe.style.color='var('+v+')';
  return getComputedStyle(pxProbe).color;
};
const pxPills=()=>{
  document.querySelectorAll('[data-pair]').forEach(el=>{
    if(el.dataset.done)return;
    el.dataset.done='1';
    const r=pxRatio(pxResolve(el.dataset.fg),pxResolve(el.dataset.bg));
    el.style.cssText='color:var('+el.dataset.fg+');background:var('+el.dataset.bg+')';
    el.textContent=el.dataset.label+' '+r.toFixed(2)+' '+pxVerdict(r);
  });
};
const pxCell=(f,b,fc)=>{
  const r=pxRatio(fc,pxResolve(BG_BY[b]));
  const tip=f+' on '+b+' — '+r.toFixed(2)+' '+pxVerdict(r);
  const open='<td><button class="'+pxCls(r)+' mx-cell" data-f="'+f+'" data-b="'+b+'"';
  return open+' title="'+tip+'">'+r.toFixed(2)+'</button></td>';
};
const pxMatrix=()=>{
  const host=document.querySelector('[data-matrix]');
  if(!host||host.dataset.done)return;
  host.dataset.done='1';
  let h='<table class="mx"><thead><tr><th>fg \\ bg</th>';
  Object.keys(BG_BY).forEach(b=>{h+='<th>'+b+'</th>'});
  h+='</tr></thead><tbody>';
  Object.keys(FG_BY).forEach(f=>{
    h+='<tr><th>'+f+'</th>';
    const fc=pxResolve(FG_BY[f]);
    Object.keys(BG_BY).forEach(b=>{h+=pxCell(f,b,fc)});
    h+='</tr>';
  });
  host.innerHTML=h+'</tbody></table>';
  const aa=document.querySelector('[data-matrix-aa]');
  if(aa)aa.addEventListener('change',()=>host.querySelector('.mx').classList.toggle('mx--aa',aa.checked));
};
const dsWidgets=()=>{
  if(!pxProbe){
    pxProbe=document.createElement('span');
    pxProbe.style.cssText='position:absolute;visibility:hidden';
    document.body.appendChild(pxProbe);
  }
  pxPills();
  pxMatrix();
};
document.addEventListener('ds:doc',dsWidgets);
dsWidgets();
