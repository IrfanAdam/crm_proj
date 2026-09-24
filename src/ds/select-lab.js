/* ADAM/DS — src/ds/select-lab.js · Select playground */
function flabSelectInit(root){
 if(root.dataset.done)return;root.dataset.done="1";
 const q=s=>root.querySelector(s),qa=s=>Array.from(root.querySelectorAll(s));
 const stage=q("[data-flab-stage]"),preview=q("[data-flab-preview]"),code=q("[data-flab-code]"),ratio=q("[data-flab-ratio]");
 const labelEl=q("[data-flab-label]"),optsEl=q("[data-flab-options]"),chevEl=q("[data-flab-chevron]");
 const st={variant:"outlined",size:"md",state:"default"};
 const mark=(sel,attr,val)=>qa(sel).forEach(b=>b.classList.toggle("is-on",b.dataset[attr]===val));
 function cls(){let c=["select__input"];if(st.variant==="filled")c.push("select__input--filled");if(st.size==="sm")c.push("select__input--sm");if(st.size==="lg")c.push("select__input--lg");if(st.state==="error")c.push("select__input--error");if(st.state==="success")c.push("select__input--success");return c.join(" ");}
 function attrs(){if(st.state==="disabled")return " disabled";return st.state==="error"?' aria-invalid="true" aria-describedby="flab-err"':"";}
 function opts(){return optsEl.value.split(",").map(s=>s.trim()).filter(Boolean);}
 function render(){
  const lbl=labelEl.value.trim()||"Stage",list=opts(),chevron=chevEl.value.trim()||"ph-caret-down";
  const id="flab-sel",o=list.map((v,i)=>'<option'+(i===1?" selected":"")+'>'+v+'</option>').join("");
  const err=st.state==="error"?'<p class="field__error" id="flab-err">Select a stage.</p>':"";
  preview.innerHTML='<div class="field"><label class="field__label" for="'+id+'">'+lbl+'</label><div class="select"><select class="'+cls()+'" id="'+id+'"'+attrs()+'>'+o+'</select><i class="ph-bold '+chevron+' select__chevron" aria-hidden="true"></i></div>'+err+'</div>';
  if(st.state==="focus")setTimeout(()=>{const el=preview.querySelector("select");if(el)el.focus();},0);
  let html='<label class="field__label" for="'+id+'">'+lbl+'</label>\n<div class="select">\n  <select class="'+cls()+'" id="'+id+'"'+attrs()+'>'+o+'</select>\n  <i class="ph-bold '+chevron+' select__chevron" aria-hidden="true"></i>\n</div>';if(err)html+='\n'+err;
  code.textContent=html;if(window.highlight){code.innerHTML=window.highlight(html);code.classList.add("hl");}
  if(ratio){const el=preview.querySelector("select");if(el){const cs=getComputedStyle(el);const lum=s=>{const n=s.match(/[\d.]+/g).slice(0,3).map(Number).map(x=>{x/=255;return x<=0.03928?x/12.92:Math.pow((x+0.055)/1.055,2.4)});return 0.2126*n[0]+0.7152*n[1]+0.0722*n[2]};const r=(Math.max(lum(cs.color),lum(cs.backgroundColor))+0.05)/(Math.min(lum(cs.color),lum(cs.backgroundColor))+0.05);ratio.textContent="Aa "+r.toFixed(2);}}
 }
 root.addEventListener("click",e=>{
  const v=e.target.closest("[data-flab-variant]");if(v){st.variant=v.dataset.flabVariant;mark("[data-flab-variant]","flabVariant",st.variant);render();return;}
  const s=e.target.closest("[data-flab-size]");if(s){st.size=s.dataset.flabSize;mark("[data-flab-size]","flabSize",st.size);render();return;}
  const stEl=e.target.closest("[data-flab-state]");if(stEl){st.state=stEl.dataset.flabState;mark("[data-flab-state]","flabState",st.state);render();return;}
  const sf=e.target.closest("[data-flab-surface]");if(sf){stage.dataset.surface=sf.dataset.flabSurface;mark("[data-flab-surface]","flabSurface",stage.dataset.surface);return;}
  const th=e.target.closest("[data-flab-scheme]");if(th){stage.dataset.theme=th.dataset.flabScheme;mark("[data-flab-scheme]","flabScheme",stage.dataset.theme);render();return;}
  if(e.target.closest("[data-flab-copy]"))navigator.clipboard.writeText(code.textContent);
 });
 root.addEventListener("input",render);root.addEventListener("change",render);render();
}
function flabSelectBoot(){document.querySelectorAll('[data-flab="select"]').forEach(flabSelectInit);}
document.addEventListener("ds:doc",flabSelectBoot);flabSelectBoot();
