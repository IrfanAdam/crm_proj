/* ADAM/DS — src/ds/gallery.js · foundation doc widgets (pairing lab + matrix) */
const labLum=v=>{const m=v.match(/[\d.]+/g).slice(0,3).map(x=>{x/=255;return x<=0.03928?x/12.92:Math.pow((x+0.055)/1.055,2.4)});return 0.2126*m[0]+0.7152*m[1]+0.0722*m[2]};
const labRatio=(a,b)=>{const x=labLum(a),y=labLum(b);return (Math.max(x,y)+0.05)/(Math.min(x,y)+0.05)};
const labVerdict=r=>r>=7?'AAA':r>=4.5?'AA':r>=3?'AA-large only':'FAIL';
const labNm=s=>s.replace('var(--','').replace(')','').replace('primitive-gray-white','white');
const labInit=()=>{const out=document.querySelector('[data-lab-out]');if(!out||out.dataset.done)return;out.dataset.done='1';const spec=document.getElementById('lab-spec');
let labFg='var(--role-action)',labBg='var(--primitive-gray-white)';
const labPaint=()=>{spec.style.color=labFg;spec.style.background=labBg;const cs=getComputedStyle(spec);const r=labRatio(cs.color,cs.backgroundColor);out.textContent=labNm(labFg)+' on '+labNm(labBg)+' — '+r.toFixed(2)+' '+labVerdict(r)};
document.querySelectorAll('[data-lab-fg] .chip').forEach(c=>c.addEventListener('click',()=>{document.querySelectorAll('[data-lab-fg] .chip').forEach(x=>x.classList.remove('chip--active'));c.classList.add('chip--active');labFg=c.dataset.c;labPaint()}));
document.querySelectorAll('[data-lab-bg] .chip').forEach(c=>c.addEventListener('click',()=>{document.querySelectorAll('[data-lab-bg] .chip').forEach(x=>x.classList.remove('chip--active'));c.classList.add('chip--active');labBg=c.dataset.c;labPaint()}));labPaint()};
const MX_FG=[['white','--primitive-gray-white'],['ink','--primitive-ink'],['action','--role-action'],['action-soft','--role-action-soft'],['measure','--role-measure'],['score','--role-score'],['warn','--role-warn'],['mark','--role-mark'],['secondary','--text-secondary'],['muted','--text-muted'],['success','--color-accent-success'],['error','--color-accent-error']];
const MX_BG=[['canvas','--bg-primary'],['surface','--bg-surface'],['white','--primitive-gray-white'],['action','--role-action'],['ink','--primitive-ink'],['measure','--role-measure'],['measure-soft','--role-measure-soft'],['score','--role-score'],['glass','--bg-surface-glass']];
let mxProbe=null;
const mxResolve=v=>{mxProbe.style.color=v;return getComputedStyle(mxProbe).color};
const mxInit=()=>{const host=document.querySelector('[data-matrix]');if(!host||host.dataset.done)return;host.dataset.done='1';
if(!mxProbe){mxProbe=document.createElement('span');mxProbe.style.cssText='position:absolute;visibility:hidden';document.body.appendChild(mxProbe)}
let h='<table class="mx"><thead><tr><th>fg \\ bg</th>'+MX_BG.map(b=>'<th>'+b[0]+'</th>').join('')+'</tr></thead><tbody>';
for(const f of MX_FG){h+='<tr><th>'+f[0]+'</th>';const fc=mxResolve('var('+f[1]+')');
for(const b of MX_BG){const bc=mxResolve('var('+b[1]+')');const r=labRatio(fc,bc);const cls=r>=4.5?'mx-ok':r>=3?'mx-mid':'mx-bad';h+='<td class="'+cls+'" title="'+f[0]+' on '+b[0]+' — '+r.toFixed(2)+' '+labVerdict(r)+'">'+r.toFixed(2)+'</td>'}
h+='</tr>'}
host.innerHTML=h+'</tbody></table>'};
const dsWidgets=()=>{labInit();mxInit()};
document.addEventListener('ds:doc',dsWidgets);dsWidgets();
