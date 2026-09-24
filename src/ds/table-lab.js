/* table-lab — single specimen, sort aria-sort · skeleton shimmer · sticky wrap */
function tblInit(root){
if(root.dataset.done)return;root.dataset.done='1';
const q=s=>root.querySelector(s),qa=s=>Array.from(root.querySelectorAll(s));
const stage=q('[data-dlab-stage]'),preview=q('[data-dlab-preview]'),code=q('[data-dlab-code]'),ratio=q('[data-dlab-ratio]');
const rowsEl=q('[data-table-rows]'),colsEl=q('[data-table-cols]'),selEl=q('[data-table-sel]');
let density='default',sortable=true,sortCol=0,sortDir='ascending';
const mark=(sel,attr,val)=>qa(sel).forEach(b=>b.classList.toggle('is-on',b.dataset[attr]===val));
function buildTable(){
const r=Math.max(1,Math.min(5,parseInt(rowsEl.value)||3));
const c=Math.max(2,Math.min(4,parseInt(colsEl.value)||3));
const selIdx=parseInt(selEl.value)||0;
const striped=q('[data-table-striped]').checked,sticky=q('[data-table-sticky]').checked;
const empty=q('[data-table-empty]').checked,skeleton=q('[data-table-skeleton]').checked,hasSel=q('[data-table-selected]').checked;
let cls=['table']; if(density!=='default')cls.push('table--'+density); if(striped)cls.push('table--striped'); if(sticky)cls.push('table--sticky');
let h='<div class="table__wrap"><table class="'+cls.join(' ')+'"><thead><tr>';
if(hasSel) h+='<th class="table__cell--select" scope="col"><input type="checkbox" aria-label="Select all"></th>';
for(let i=0;i<c;i++){
const isSort=sortable&&i===sortCol; const a=isSort?' aria-sort="'+sortDir+'" tabindex="0"':'';
h+='<th scope="col"'+a+'>Col '+(i+1)+'</th>';
}
h+='</tr></thead><tbody>';
if(empty){ h+='<tr class="table__empty"><td colspan="'+(c+(hasSel?1:0))+'">No deals match this filter.</td></tr>';}
for(let ri=0;ri<r;ri++){
const sel=hasSel&&selIdx===ri+1?' class="table__row--selected" aria-selected="true"':'';
h+='<tr'+sel+'>'; if(hasSel) h+='<td class="table__cell--select"><input type="checkbox"'+(sel?' checked':'')+' aria-label="Select row '+(ri+1)+'"></td>';
for(let ci=0;ci<c;ci++){
if(skeleton&&ri===r-1) h+='<td><div class="table__skeleton-bar" style="width:'+(60+ci*10)+'%" aria-hidden="true"></div></td>';
else h+='<td>R'+(ri+1)+'C'+(ci+1)+'</td>';
}
h+='</tr>';
}
if(skeleton) h+='<tr aria-busy="true"><td colspan="'+(c+(hasSel?1:0))+'"><div class="table__skeleton-bar"></div></td></tr>';
h+='</tbody></table><div class="table__footer"><span>'+(empty?0:r)+' of '+(empty?0:r)+'</span><span>Pagination slot</span></div></div>';
return h;
}
function render(){
preview.innerHTML=buildTable();
preview.querySelectorAll('th[aria-sort]').forEach(th=>{th.addEventListener('click',()=>{sortDir=th.getAttribute('aria-sort')==='ascending'?'descending':'ascending';preview.querySelectorAll('th').forEach(x=>x.removeAttribute('aria-sort'));th.setAttribute('aria-sort',sortDir);updateCode();});});
updateCode();updateRatio();
}
function pretty(){
let s=preview.innerHTML.replace(/></g,'>\n<');
if(window.highlight){code.innerHTML=window.highlight(s);code.classList.add('hl');} else code.textContent=s;
code.dataset.hlDone='1';
}
function updateCode(){pretty();}
function updateRatio(){ratio.textContent=(density!=='default'?density:'default')+' · '+rowsEl.value+'×'+colsEl.value+(q('[data-table-striped]').checked?' · striped':'')+(q('[data-table-sticky]').checked?' · sticky':'');q('[data-dlab-note]').textContent=sortable?'Click header to toggle aria-sort — one column at a time.':'Sort off — headers plain.';}
root.addEventListener('click',e=>{
const d=e.target.closest('[data-table-density]');if(d){density=d.dataset.tableDensity;mark('[data-table-density]','tableDensity',density);render();return;}
const sf=e.target.closest('[data-dlab-surface]');if(sf){stage.dataset.surface=sf.dataset.dlabSurface;mark('[data-dlab-surface]','dlabSurface',stage.dataset.surface);return;}
const sc=e.target.closest('[data-dlab-scheme]');if(sc){stage.dataset.theme=sc.dataset.dlabScheme;mark('[data-dlab-scheme]','dlabScheme',stage.dataset.theme);return;}
if(e.target.closest('[data-dlab-copy]')) navigator.clipboard.writeText(code.textContent);
});
root.addEventListener('change',render);root.addEventListener('input',render);render();
}
function tblBoot(){document.querySelectorAll('[data-dlab="table"]').forEach(tblInit);}
document.addEventListener('ds:doc',tblBoot);tblBoot();
