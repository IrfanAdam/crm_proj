/* ADAM/DS — src/ds/gallery-filter.js · search filter + groups [plan:2026-09-29_132702-ds-docs-experience.md#phase-2] */
// Exports: dsFilter (global) — wires #ds-search / #dheader-search to .dnav__item filter
const dsFilter=(q)=>{
q=q.toLowerCase().trim();
document.querySelectorAll('.dnav__group').forEach((g)=>{
let vis=0;
g.querySelectorAll('.dnav__item,.dnav__subitem').forEach((it)=>{
const m=!q||it.textContent.toLowerCase().includes(q);
it.hidden=!m;
if(m) vis+=1;
});
g.querySelectorAll('.dnav__branch').forEach((br)=>{
const it=br.querySelector('.dnav__item');
const subs=[...br.querySelectorAll('.dnav__subitem')];
const any=(!it.hidden)||subs.some(s=>!s.hidden);
br.hidden=!any&&Boolean(q);
if(any) vis+=1;
const sub=br.querySelector('.dnav__sub');
if(sub&&q&&subs.some(s=>!s.hidden)) sub.hidden=false;
});
g.hidden=Boolean(q&&vis===0);
if(q&&vis) g.open=true;
});
if(!q){document.querySelectorAll('.dnav__group,.dnav__branch').forEach((g)=>{g.hidden=false;});const cur=document.querySelector('.dnav__item--active')?.dataset.tab;if(cur) document.querySelectorAll('.dnav__sub').forEach((s)=>{s.hidden=s.dataset.subnav!==cur;});}
};
const s=document.getElementById('ds-search');
const hs=document.getElementById('dheader-search');
if(s) s.addEventListener('input',(e)=>{
if(hs) hs.value=e.target.value;
dsFilter(e.target.value);
});
if(hs) hs.addEventListener('input',(e)=>{
if(s) s.value=e.target.value;
dsFilter(e.target.value);
});
document.querySelectorAll('.dnav__group').forEach((g)=>{
const k='ds:group:'+g.dataset.group;
const v=localStorage.getItem(k);
if(v!==null) g.open=v==='1';
g.addEventListener('toggle',()=>localStorage.setItem(k,g.open?'1':'0'));
});