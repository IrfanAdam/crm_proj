let stack=[]; const focusable='a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';
const VARIANT=[['drawer','drawer--open'],['tooltip','tooltip--visible'],['toast','toast--visible']];
function trap(e,root){
 const els=[...root.querySelectorAll(focusable)].filter(el=>el.offsetParent!==null);
 if(!els.length) return; const first=els[0], last=els[els.length-1];
 if(e.key==='Tab'){ if(e.shiftKey && document.activeElement===first){ e.preventDefault(); last.focus(); } else if(!e.shiftKey && document.activeElement===last){ e.preventDefault(); first.focus(); } }
}
export function openOverlay(el, opts={}){
 const prev=document.activeElement; el.classList.add('overlay--open'); VARIANT.forEach(([base,mod])=>{ if(el.classList.contains(base)) el.classList.add(mod); }); el.removeAttribute('hidden'); el.setAttribute('aria-hidden','false');
 const toFocus=el.querySelector(focusable) || el; setTimeout(()=>toFocus.focus(),10);
 const onKey=e=>{ if(e.key==='Escape'){ closeOverlay(el,prev); } else trap(e,el); };
 el._overlay={prev,onKey}; document.addEventListener('keydown',onKey); stack.push(el);
}
export function closeOverlay(el,prev){
 el.classList.remove('overlay--open'); VARIANT.forEach(([base,mod])=>el.classList.remove(mod)); el.setAttribute('hidden',''); el.setAttribute('aria-hidden','true');
 if(el._overlay){ document.removeEventListener('keydown',el._overlay.onKey); const p=el._overlay.prev || prev; if(p && p.focus) try{p.focus()}catch{}; delete el._overlay; }
 stack=stack.filter(x=>x!==el);
}
document.addEventListener('click',e=>{
 const t=e.target.closest('[data-overlay-close]'); if(t){ const root=t.closest('.overlay,.drawer,.menu,.popover,.toast'); if(root) closeOverlay(root); }
 const trigger=e.target.closest('[data-overlay-target]'); if(trigger){
  const id=trigger.dataset.overlayTarget; const el=document.getElementById(id);
  if(el) { e.preventDefault(); el.hidden ? openOverlay(el) : closeOverlay(el); }
 }
});
