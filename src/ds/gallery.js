/* ADAM/DS — src/ds/gallery.js · pairing pills + matrix */
// [plan:2026-09-23_002500-design-system-consolidation.md#phase-2] · plain script, lab in pairing-lab.js.
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
const pxCls=r=>{
  if(r>=4.5)return 'mx-ok';
  if(r>=3)return 'mx-mid';
  return 'mx-bad';
};
const pxGuide=r=>{
  if(r>=4.5)return 'Safe for body text.';
  if(r>=3)return 'Large text only — 18pt+, or 14pt+ bold.';
  return 'Decorative only — never for text.';
};
const PAIR_FG=[
  ['white','--primitive-gray-white'],['ink','--primitive-ink'],['action','--role-action'],
  ['action-strong','--role-action-strong'],['measure','--role-measure'],['score','--role-score'],
  ['score-strong','--role-score-strong'],['warn','--role-warn'],['warn-strong','--role-warn-strong'],
  ['mark','--role-mark'],['mark-strong','--role-mark-strong'],['secondary','--text-secondary'],
  ['muted','--text-muted'],['dim','--text-dim'],['accent','--text-accent'],
  ['success','--color-accent-success'],['error','--color-accent-error']
];
const PAIR_BG=[
  ['canvas','--bg-primary'],['surface','--bg-surface'],['white','--primitive-gray-white'],
  ['action','--role-action'],['ink','--primitive-ink'],['measure','--role-measure'],
  ['measure-soft','--role-measure-soft'],['score','--role-score'],['score-soft','--role-score-soft'],
  ['glass','--bg-surface-glass']
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
  host.addEventListener('click',e=>{
    const c=e.target.closest('.mx-cell');
    if(c&&typeof pxLabLoad!=='undefined')pxLabLoad(c.dataset.f,c.dataset.b);
  });
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
