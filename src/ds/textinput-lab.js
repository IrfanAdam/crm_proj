/* ADAM/DS — src/ds/textinput-lab.js · TextInput playground */
function flabTextInputInit(root){
 if(root.dataset.done)return;root.dataset.done="1";
 const q=s=>root.querySelector(s),qa=s=>Array.from(root.querySelectorAll(s));
 const stage=q("[data-flab-stage]"),preview=q("[data-flab-preview]"),code=q("[data-flab-code]"),ratio=q("[data-flab-ratio]");
 const labelEl=q("[data-flab-label]"),phEl=q("[data-flab-ph]"),valEl=q("[data-flab-value]"),prefixEl=q("[data-flab-prefix]"),suffixEl=q("[data-flab-suffix]"),errEl=q("[data-flab-error]"),helpEl=q("[data-flab-help]");
 const st={variant:"outlined",size:"md",state:"default"};
 const mark=(sel,attr,val)=>qa(sel).forEach(b=>b.classList.toggle("is-on",b.dataset[attr]===val));
 function cls(){
  let c=["field__input"];if(st.variant==="filled")c.push("field__input--filled");if(st.size==="sm")c.push("field__input--sm");if(st.size==="lg")c.push("field__input--lg");
  if(prefixEl.value.trim())c.push("field__input--with-prefix");if(suffixEl.value.trim())c.push("field__input--with-suffix");
  if(st.state==="error")c.push("field__input--error");if(st.state==="success")c.push("field__input--success");return c.join(" ");
 }
 function attrs(){
  if(st.state==="error")return ' aria-invalid="true" aria-describedby="flab-err"';
  if(st.state==="disabled")return " disabled";if(st.state==="readonly")return " readonly";return "";
 }
 function render(){
  const id="flab-ti",lbl=labelEl.value.trim()||"Label",ph=phEl.value, val=valEl.value,pfx=prefixEl.value.trim(),sfx=suffixEl.value.trim(),help=helpEl.value.trim(),err=errEl.value.trim();
  const pr=pfx?'<span class="field__prefix" aria-hidden="true">'+pfx+'</span>':"",su=sfx?'<span class="field__suffix" aria-hidden="true">'+sfx+'</span>':"";
  const errHtml=st.state==="error"&&err?'<p class="field__error" id="flab-err">'+err+'</p>':help&&st.state!=="error"?'<p class="field__help">'+help+'</p>':"";
  const helpId=st.state==="error"?"flab-err":"";
  preview.innerHTML='<div class="field"><label class="field__label" for="'+id+'">'+lbl+'</label><div class="field__wrap">'+pr+'<input class="'+cls()+'" id="'+id+'" type="text" placeholder="'+ph+'" value="'+val+'"'+attrs()+' aria-describedby="'+helpId+'">'+su+'</div>'+errHtml+'</div>';
  if(st.state==="focus")setTimeout(()=>{const el=preview.querySelector("input");if(el)el.focus();},0);
  let html='<label class="field__label" for="'+id+'">'+lbl+'</label>\n<div class="field__wrap">\n  <input class="'+cls()+'" id="'+id+'" type="text" placeholder="'+ph+'"'+attrs()+'>\n</div>';if(errHtml)html+='\n'+errHtml;
  code.textContent=html;if(window.highlight){code.innerHTML=window.highlight(html);code.classList.add("hl");}
  if(ratio){const inp=preview.querySelector("input");if(inp){const cs=getComputedStyle(inp);const lum=s=>{const n=s.match(/[\d.]+/g).slice(0,3).map(Number).map(x=>{x/=255;return x<=0.03928?x/12.92:Math.pow((x+0.055)/1.055,2.4)});return 0.2126*n[0]+0.7152*n[1]+0.0722*n[2]};const r=(Math.max(lum(cs.color),lum(cs.backgroundColor))+0.05)/(Math.min(lum(cs.color),lum(cs.backgroundColor))+0.05);let v=r>=7?"AAA":r>=4.5?"AA":r>=3?"AA-large":"Fail";ratio.textContent="Aa "+r.toFixed(2)+" · "+v;}}
 }
 root.addEventListener("click",e=>{
  const v=e.target.closest("[data-flab-variant]");if(v){st.variant=v.dataset.flabVariant;mark("[data-flab-variant]","flabVariant",st.variant);render();return;}
  const s=e.target.closest("[data-flab-size]");if(s){st.size=s.dataset.flabSize;mark("[data-flab-size]","flabSize",st.size);render();return;}
  const stEl=e.target.closest("[data-flab-state]");if(stEl){st.state=stEl.dataset.flabState;mark("[data-flab-state]","flabState",st.state);render();return;}
  const sf=e.target.closest("[data-flab-surface]");if(sf){stage.dataset.surface=sf.dataset.flabSurface;mark("[data-flab-surface]","flabSurface",stage.dataset.surface);return;}
  const th=e.target.closest("[data-flab-scheme]");if(th){stage.dataset.theme=th.dataset.flabScheme;mark("[data-flab-scheme]","flabScheme",stage.dataset.theme);render();return;}
  if(e.target.closest("[data-flab-copy]"))navigator.clipboard.writeText(code.textContent);
 });
 root.addEventListener("input",render);render();
}
function flabTextInputBoot(){document.querySelectorAll('[data-flab="textinput"]').forEach(flabTextInputInit);}
document.addEventListener("ds:doc",flabTextInputBoot);flabTextInputBoot();
