/* ADAM/DS — src/ds/gallery-subnav.js · quick-jump left rails */
// [plan:2026-09-21_000000-lump-sum-builds.md#phase-3] · rails from map (Task 10).
// — Map: panel → rail labels (slug = anchor id suffix) —
// — Build: insert .dnav__sub after each panel button —
// — Jump: dsSub shows panel + scrolls; deep hash scrolls once —
const DS_SUBNAV={
identity:['Chip','Badge','Status pill','Avatar','Icon'],
text:['Text input','Select','Search','Textarea'],
choice:['Checkbox','Radio','Switch','Slider'],
nav:['Tabs','Breadcrumbs','Pagination','Accordion','TabBar','Toolbar'],
overlays:['Modal','Drawer','Menu','Popover','Tooltip','Toast'],
data:['Table','List row','KPI','Timeline','Sparkline'],
cards:['Opportunity','Funnel','Profile','Goal bar','Glyph','Gem reward'],
};
const dsSlug=s=>s.toLowerCase().replace(/[^a-z]+/g,'');
function dsSub(name){
const panel=name.split('-')[0];
dsTab(panel);
history.replaceState(null,'','#'+name);
document.querySelectorAll('.dnav__subitem').forEach(x=>x.classList.toggle('dnav__subitem--active',x.dataset.subtab===name));
const el=document.getElementById(name);
if(el)el.scrollIntoView({behavior:'smooth',block:'start'});
}
function dsSubnavBuild(){
const nav=document.querySelector('.dnav');
if(!nav||nav.dataset.subnavDone)return;
nav.dataset.subnavDone='1';
Object.entries(DS_SUBNAV).forEach(([panel,labels])=>{
const btn=nav.querySelector('.dnav__item[data-tab="'+panel+'"]');
if(!btn)return;
const box=document.createElement('div');
box.className='dnav__sub';
box.dataset.subnav=panel;
box.hidden=true;
labels.forEach(label=>{
const b=document.createElement('button');
b.className='dnav__subitem';
b.dataset.subtab=panel+'-'+dsSlug(label);
b.textContent=label;
b.addEventListener('click',()=>dsSub(b.dataset.subtab));
box.appendChild(b);
});
btn.after(box);
});
const h=location.hash.slice(1);
if(h)nav.querySelectorAll('.dnav__subitem').forEach(x=>x.classList.toggle('dnav__subitem--active',x.dataset.subtab===h));
}
let dsSubSeen='';
document.addEventListener('ds:doc',()=>{
const h=location.hash.slice(1);
if(h&&h!==dsSubSeen&&document.getElementById(h)){dsSubSeen=h;dsSub(h);}
});
dsSubnavBuild();
