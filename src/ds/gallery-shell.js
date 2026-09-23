/* ADAM/DS — src/ds/gallery-shell.js · gallery frames: language + docs fetch, tabs, sort, accordion, tooltip, signal */
// [plan:2026-09-23_002500-design-system-consolidation.md#phase-3] · shell behavior extracted from gallery.html (Task 9).
// — Language frame (served from public/ at root by Vite) —
fetch('language-panel.html').then(r=>r.text()).then(h=>{document.getElementById('stage').insertAdjacentHTML('afterbegin',h);if(location.hash)dsTab(location.hash.slice(1))});
// — Foundation articles —
document.querySelectorAll('[data-doc]').forEach(el=>{fetch(el.dataset.doc).then(r=>r.text()).then(h=>{el.innerHTML=h;document.dispatchEvent(new Event('ds:doc'))})});
// — Sortable tables (delegated — covers fetched panels) —
const dsSort=th=>{
const asc=th.getAttribute('aria-sort')==='ascending';
document.querySelectorAll('.table th').forEach(h=>h.removeAttribute('aria-sort'));
th.setAttribute('aria-sort',asc?'descending':'ascending');
};
document.addEventListener('click',e=>{
const th=e.target.closest('.table th');
if(th)dsSort(th);
const acc=e.target.closest('.accordion__trigger');
if(acc){
const it=acc.closest('.accordion__item');
const open=it.classList.toggle('accordion__item--open');
acc.setAttribute('aria-expanded',open);
it.querySelector('.accordion__panel').hidden=!open;
}
});
document.addEventListener('keydown',e=>{
if(e.key!=='Enter'&&e.key!==' ')return;
const th=e.target.closest('.table th');
if(th){e.preventDefault();dsSort(th);}
});
// — Fetched panels: indeterminate checkboxes + sortable tab stops —
document.addEventListener('ds:doc',()=>{
document.querySelectorAll('input[indeterminate]').forEach(el=>{el.indeterminate=true});
document.querySelectorAll('.table th').forEach(th=>{th.tabIndex=0});
});
// — Section tabs (hash-deep-linked: #actions etc.) —
const dsTab=name=>{
document.querySelectorAll('.dnav__item').forEach(x=>x.classList.toggle('dnav__item--active',x.dataset.tab===name));
document.querySelectorAll('[data-panel]').forEach(p=>{p.hidden=p.dataset.panel!==name});
};
document.querySelectorAll('.dnav__item').forEach(b=>b.addEventListener('click',()=>{
dsTab(b.dataset.tab);
history.replaceState(null,'','#'+b.dataset.tab);
}));
if(location.hash)dsTab(location.hash.slice(1));
// — Accordions —
document.querySelectorAll('.accordion__trigger').forEach(b=>b.addEventListener('click',()=>{
const it=b.closest('.accordion__item');
const open=it.classList.toggle('accordion__item--open');
b.setAttribute('aria-expanded',open);
it.querySelector('.accordion__panel').hidden=!open;
}));
// — Tooltip demo —
const tip=document.getElementById('tip-1'),tipBtn=document.getElementById('tip-btn');
if(tipBtn){
tipBtn.addEventListener('mouseenter',()=>{tip.hidden=false;tip.classList.add('tooltip--visible')});
tipBtn.addEventListener('mouseleave',()=>{tip.hidden=true;tip.classList.remove('tooltip--visible')});
}
// — Signal swap readout (live binding owned by contrast modules; hex resolves via vars, no literals) —
document.querySelectorAll('[data-signal]').forEach(b=>b.addEventListener('click',()=>{
const v=b.dataset.signal;
const vars={default:'var(--primitive-sapphire-ui-500)',amber:'var(--primitive-citrine-500)',teal:'var(--primitive-green-500)'};
document.documentElement.style.setProperty('--signal',vars[v]);
const live=getComputedStyle(document.documentElement).getPropertyValue('--signal').trim();
document.documentElement.style.setProperty('--signal-live-hex',live);
document.querySelectorAll('[data-signal]').forEach(x=>x.classList.toggle('chip--active',x===b));
const sw=document.getElementById('signal-swatch'),hx=document.getElementById('signal-hex');
const accent=getComputedStyle(document.documentElement).getPropertyValue('--accent-brand').trim();
if(hx)hx.textContent=vars[v]+' → '+live+' · computed '+accent;
if(sw)sw.style.background=vars[v];
}));
