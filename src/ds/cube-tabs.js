/* ADAM/DS — src/ds/cube-tabs.js · Cube | Preview tabs on the gallery cube panel */
// [plan:2026-09-28_000000-lump-sum-builds.md#phase-5] · Cube stays default; Preview lazy-loads cube-illusion.html.
// — Tabs: [data-cubetab] pills switch [data-cubepane] panes —
// — Preview: iframe src set from data-src on first open only —
function cubeTab(name){
var root=document.querySelector('[data-cubetabs]');
if(!root)return;
root.querySelectorAll('[data-cubetab]').forEach(function(b){
b.classList.toggle('is-on',b.dataset.cubetab===name);
});
root.querySelectorAll('[data-cubepane]').forEach(function(p){
p.hidden=p.dataset.cubepane!==name;
});
if(name==='preview'){
var f=root.querySelector('[data-cube-preview]');
if(f&&!f.src)f.src=f.dataset.src;
}
}
document.addEventListener('click',function(e){
var b=e.target.closest&&e.target.closest('[data-cubetab]');
if(b)cubeTab(b.dataset.cubetab);
});
