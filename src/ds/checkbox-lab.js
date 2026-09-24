/* ADAM/DS — src/ds/checkbox-lab.js · single live checkbox */
function clabCheckboxInit(root){
 if(root.dataset.done)return;root.dataset.done="1";
 const q=s=>root.querySelector(s),qa=s=>Array.from(root.querySelectorAll(s));
 const stage=q("[data-clab-stage]"),preview=q("[data-clab-preview]"),code=q("[data-clab-code]"),ratio=q("[data-clab-ratio]");
 const labelEl=q("[data-clab-label]"),chkEl=q("[data-clab-checked]"),indEl=q("[data-clab-indeterminate]"),disEl=q("[data-clab-disabled]"),errEl=q("[data-clab-error]");
 const st={size:"md",state:"default"};
 const mark=(sel,attr,val)=>qa(sel).forEach(b=>b.classList.toggle("is-on",b.dataset[attr]===val));
 function render(focusIt){
  const label=labelEl.value.trim()||"Checkbox";
  const checked=chkEl.checked||st.state==="checked";
  const indeterminate=indEl.checked||st.state==="indeterminate";
  const disabled=disEl.checked||st.state==="disabled";
  const error=errEl.checked||st.state==="error";
  let cls="check";if(st.size==="sm")cls+=" check--sm";if(st.size==="lg")cls+=" check--lg";if(disabled)cls+=" check--disabled";if(error)cls+=" check--error";
  const chkAttr=checked?" checked":"";const disAttr=disabled?" disabled":"";const errAttr=error?' aria-invalid="true"':"";
  const icon=indeterminate?'<path d="M3.5 8h9" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>':'<path d="M3 8.5 6.5 12 13 4.5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>';
  preview.innerHTML='<label class="'+cls+'"><input type="checkbox"'+chkAttr+disAttr+errAttr+'><span class="check__box"><svg class="check__icon" viewBox="0 0 16 16" aria-hidden="true">'+icon+'</svg></span><span class="check__label">'+label+'</span></label>';
  const inp=preview.querySelector("input");if(inp)inp.indeterminate=indeterminate;
  if(st.state==="focus"||focusIt)inp&&inp.focus();
  const pretty='<label class="'+cls+'">\n  <input type="checkbox"'+chkAttr+disAttr+errAttr+(indeterminate?' data-indeterminate':'')+'>\n  <span class="check__box"><svg class="check__icon" viewBox="0 0 16 16"></svg></span>\n  <span class="check__label">'+label+'</span>\n</label>';
  if(window.highlight){code.innerHTML=window.highlight(pretty);code.classList.add("hl");}else code.textContent=pretty;
  if(ratio)ratio.textContent="Aa — · —";
  chkEl.checked=checked;indEl.checked=indeterminate;
 }
 root.addEventListener("click",e=>{
  const s=e.target.closest("[data-clab-size]");if(s){st.size=s.dataset.clabSize;mark("[data-clab-size]","clabSize",st.size);render();return;}
  const sf=e.target.closest("[data-clab-surface]");if(sf){stage.dataset.surface=sf.dataset.clabSurface;mark("[data-clab-surface]","clabSurface",stage.dataset.surface);return;}
  const sc=e.target.closest("[data-clab-scheme]");if(sc){stage.dataset.theme=sc.dataset.clabScheme;mark("[data-clab-scheme]","clabScheme",stage.dataset.theme);render();return;}
  if(e.target.closest("[data-clab-copy]"))navigator.clipboard.writeText(code.textContent);
 });
 root.addEventListener("change",e=>{
  if(e.target.matches("[data-clab-state]")){st.state=e.target.value;render(true);return;}
  render();
 });
 root.addEventListener("input",render);
 render();
}
function clabCheckboxBoot(){document.querySelectorAll('[data-clab][data-clab-name="checkbox"]').forEach(clabCheckboxInit);}
document.addEventListener("ds:doc",clabCheckboxBoot);clabCheckboxBoot();
