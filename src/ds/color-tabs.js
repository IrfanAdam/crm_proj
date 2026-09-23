/* ADAM/DS — src/ds/color-tabs.js · Ramps/Roles/Semantics as tabs */
// [plan:2026-09-23_002500-design-system-consolidation.md#phase-2]
// Contrast/Matrix/Lab stay as scrolling sections below. No-JS shows all.
const pxTabs=()=>{
  const nav=document.querySelector('.ch-nav');
  if(!nav||nav.dataset.tabs)return;
  nav.dataset.tabs='1';
  nav.setAttribute('role','tablist');
  const ids=['ch-ramps','ch-roles','ch-semantics'];
  const secs=ids.map(id=>document.getElementById(id)).filter(Boolean);
  if(secs.length<2)return;
  const range=h=>{
    const nodes=[];let el=h.nextElementSibling;
    while(el&&!(el.tagName==='H3'&&el.id)){nodes.push(el);el=el.nextElementSibling;}
    return nodes;
  };
  const tabs=[...nav.querySelectorAll('a')].filter(a=>ids.includes(a.getAttribute('href').slice(1)));
  const show=id=>{
    secs.forEach(h=>{
      const on=h.id===id;
      h.toggleAttribute('hidden',!on);
      range(h).forEach(el=>el.toggleAttribute('hidden',!on));
    });
    tabs.forEach(a=>{
      const on=a.getAttribute('href')==='#'+id;
      a.classList.toggle('chip--active',on);
      a.setAttribute('role','tab');
      a.setAttribute('aria-selected',on);
    });
  };
  nav.addEventListener('click',e=>{
    const a=e.target.closest('a');
    if(!a||!nav.contains(a))return;
    const id=a.getAttribute('href').slice(1);
    if(!ids.includes(id))return;
    e.preventDefault();
    show(id);
    history.replaceState(null,'','#'+id);
  });
  const start=ids.includes(location.hash.slice(1))?location.hash.slice(1):ids[0];
  show(start);
};
document.addEventListener('ds:doc',pxTabs);
