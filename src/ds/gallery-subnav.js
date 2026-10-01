/* ADAM/DS — src/ds/gallery-subnav.js · quick-jump rails + active trail */
/* [plan:2026-09-29_132702-ds-docs-experience.md#phase-2] */
const DS_SUBNAV={
motion:['Time','Curves','Specimens','Orchestra','Scroll','Reduced','Choreography'],
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
if(el) el.scrollIntoView({behavior:'smooth',block:'start'});
}
function dsSubnavBuild(){
const nav=document.querySelector('.dnav');
if(!nav||nav.dataset.subnavDone) return;
nav.dataset.subnavDone='1';
Object.entries(DS_SUBNAV).forEach(([panel,labels])=>{
const btn=nav.querySelector('.dnav__item[data-tab="'+panel+'"]');
if(!btn) return;
const branch=document.createElement('div');
branch.className='dnav__branch';
branch.dataset.branch=panel;
btn.parentNode.insertBefore(branch,btn);
branch.appendChild(btn);
btn.classList.add('dnav__item--has-sub');
btn.setAttribute('aria-expanded','false');
btn.setAttribute('aria-haspopup','true');
const box=document.createElement('div');
box.className='dnav__sub';
box.dataset.subnav=panel;
box.hidden=true;
labels.forEach(label=>{
const b=document.createElement('button');
b.className='dnav__subitem';
b.dataset.subtab=panel+'-'+dsSlug(label);
b.textContent=label;
b.addEventListener('click',e=>{e.stopPropagation();dsSub(b.dataset.subtab);branch.classList.remove('is-open');btn.setAttribute('aria-expanded','false');});
box.appendChild(b);
});
branch.appendChild(box);
// hover intent — CSS handles most, JS adds is-open for click toggle + a11y
let tid;
branch.addEventListener('mouseenter',()=>{clearTimeout(tid);branch.classList.add('is-open');btn.setAttribute('aria-expanded','true');});
branch.addEventListener('mouseleave',()=>{tid=setTimeout(()=>{if(!branch.contains(document.activeElement)){branch.classList.remove('is-open');btn.setAttribute('aria-expanded','false');}},120);});
btn.addEventListener('click',()=>{branch.classList.add('is-open');btn.setAttribute('aria-expanded','true');});
btn.addEventListener('focus',()=>{branch.classList.add('is-open');btn.setAttribute('aria-expanded','true');});
});
const h=location.hash.slice(1).replace(/^\//,'');
if(h) nav.querySelectorAll('.dnav__subitem').forEach(x=>x.classList.toggle('dnav__subitem--active',x.dataset.subtab===h));
}
let dsSubSeen='';
document.addEventListener('ds:doc',()=>{
const h=location.hash.slice(1).replace(/^\//,'');
if(h&&h!==dsSubSeen&&document.getElementById(h)){dsSubSeen=h;dsSub(h);}
});
window.addEventListener('hashchange',()=>{
const h=location.hash.slice(1).replace(/^\//,'');
if(!h) return;
if(document.getElementById(h)&&h!==dsSubSeen){dsSubSeen=h;dsSub(h);return;}
const p=h.split('/')[0].split('-')[0];
if(document.querySelector('[data-panel="'+p+'"]')) dsTab(p);
});
document.addEventListener('click',e=>{
if(!e.target.closest('.dnav__branch')) document.querySelectorAll('.dnav__branch.is-open').forEach(b=>{b.classList.remove('is-open');const bt=b.querySelector('.dnav__item--has-sub');if(bt) bt.setAttribute('aria-expanded','false');});
});
document.addEventListener('keydown',e=>{
if(e.key==='Escape') document.querySelectorAll('.dnav__branch.is-open').forEach(b=>{b.classList.remove('is-open');const bt=b.querySelector('.dnav__item--has-sub');if(bt) bt.setAttribute('aria-expanded','false');});
});
dsSubnavBuild();
