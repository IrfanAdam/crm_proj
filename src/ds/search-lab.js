/* ADAM/DS — src/ds/search-lab.js · Search playground */
function flabSearchInit(root){
 if(root.dataset.done)return;root.dataset.done="1";
 const q=s=>root.querySelector(s),qa=s=>Array.from(root.querySelectorAll(s));
 const stage=q("[data-flab-stage]"),preview=q("[data-flab-preview]"),code=q("[data-flab-code]"),ratio=q("[data-flab-ratio]");
 const queryEl=q("[data-flab-query]"),phEl=q("[data-flab-ph]");
 const st={state:"default"};
 const mark=(sel,attr,val)=>qa(sel).forEach(b=>b.classList.toggle("is-on",b.dataset[attr]===val));
 function render(){
  const query=queryEl.value,ph=phEl.value.trim()||"Search opportunities",loading=st.state==="loading",err=st.state==="error",success=st.state==="success";
  let cls="search__input";if(err)cls+=" search__input--error";if(success)cls+=" search__input--success";
  let wrapCls="search";if(loading)wrapCls+=" search--loading";
  const busy=loading?' aria-busy="true" readonly':"",dis=st.state==="disabled"?" disabled":"";
  const clear=query&&!loading&&st.state!=="disabled"?'<button class="search__clear" type="button" aria-label="Clear"><i class="ph-bold ph-x" aria-hidden="true"></i></button>':"";
  preview.innerHTML='<div class="'+wrapCls+'"><i class="ph-bold ph-magnifying-glass search__icon" aria-hidden="true"></i><input class="'+cls+'" type="search" aria-label="Search" placeholder="'+ph+'" value="'+query+'"'+busy+dis+'><span hidden>'+clear+'</span>'+clear+'</div>';
  if(st.state==="focus")setTimeout(()=>{const el=preview.querySelector("input");if(el)el.focus();},0);
  // clear click
  const clr=preview.querySelector(".search__clear");if(clr)clr.addEventListener("click",()=>{queryEl.value="";render();});
  let html='<div class="'+wrapCls+'">\n  <i class="ph-bold ph-magnifying-glass search__icon" aria-hidden="true"></i>\n  <input class="'+cls+'" type="search" aria-label="Search" placeholder="'+ph+'" value="'+query+'"'+busy+dis+'>\n</div>';
  code.textContent=html;if(window.highlight){code.innerHTML=window.highlight(html);code.classList.add("hl");}
  if(ratio){const el=preview.querySelector("input");if(el){const cs=getComputedStyle(el);const lum=s=>{const n=s.match(/[\d.]+/g).slice(0,3).map(Number).map(x=>{x/=255;return x<=0.03928?x/12.92:Math.pow((x+0.055)/1.055,2.4)});return 0.2126*n[0]+0.7152*n[1]+0.0722*n[2]};const r=(Math.max(lum(cs.color),lum(cs.backgroundColor))+0.05)/(Math.min(lum(cs.color),lum(cs.backgroundColor))+0.05);ratio.textContent="Aa "+r.toFixed(2);}}
 }
 root.addEventListener("click",e=>{
  const stEl=e.target.closest("[data-flab-state]");if(stEl){st.state=stEl.dataset.flabState;mark("[data-flab-state]","flabState",st.state);render();return;}
  const sf=e.target.closest("[data-flab-surface]");if(sf){stage.dataset.surface=sf.dataset.flabSurface;mark("[data-flab-surface]","flabSurface",stage.dataset.surface);return;}
  const th=e.target.closest("[data-flab-scheme]");if(th){stage.dataset.theme=th.dataset.flabScheme;mark("[data-flab-scheme]","flabScheme",stage.dataset.theme);render();return;}
  if(e.target.closest("[data-flab-copy]"))navigator.clipboard.writeText(code.textContent);
 });
 root.addEventListener("input",render);render();
}
function flabSearchBoot(){document.querySelectorAll('[data-flab="search"]').forEach(flabSearchInit);}
document.addEventListener("ds:doc",flabSearchBoot);flabSearchBoot();
