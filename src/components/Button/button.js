document.addEventListener('click',e=>{
 const b=e.target.closest('[data-loading]');
 if(!b) return;
 if(b.disabled||b.dataset.loading==='1') return;
 b.dataset.loading='1'; b.setAttribute('aria-busy','true');
 const orig=b.innerHTML; b.innerHTML='<span class="btn__spinner" aria-hidden="true"></span> Loading…';
 setTimeout(()=>{ b.innerHTML=orig; b.dataset.loading='0'; b.removeAttribute('aria-busy');}, 1500);
});
document.addEventListener('click',e=>{
 const c=e.target.closest('.chip');
 if(!c||c.disabled) return;
 if(c.hasAttribute('data-toggle')) c.classList.toggle('chip--active');
});
