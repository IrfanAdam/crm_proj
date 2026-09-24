/* ADAM/DS — src/ds/switch-lab.js · single live switch */
function clabSwitchInit(root){
 if(root.dataset.done)return;root.dataset.done="1";
 const q=s=>root.querySelector(s),qa=s=>Array.from(root.querySelectorAll(s));
 const stage=q("[data-clab-stage]"),preview=q("[data-clab-preview]"),code=q("[data-clab-code]"),ratio=q("[data-clab-ratio]");
 const labelEl=q("[data-clab-label]"),onEl=q("[data-clab-checked]"),disEl=q("[data-clab-disabled]"),smEl=q("[data-clab-sm]"),iconEl=q("[data-clab-icon]");
 const stateEl=q("[data-clab-state]");
 const st={size:"md",state:"off"};
 const mark=(sel,attr,val)=>qa(sel).forEach(b=>b.classList.toggle("is-on",b.dataset[attr]===val));
 function render(focusIt){
  const label=labelEl.value.trim()||"Switch";
  const checked=onEl.checked||st.state==="on";
  const disabled=disEl.checked||st.state==="disabled";
  const sm=smEl.checked||st.size==="sm";
  const icon=iconEl.checked;
  let cls="switch";if(sm)cls+=" switch--sm";if(disabled)cls+=" switch--disabled";
  const chkAttr=checked?" checked":"";const disAttr=disabled?" disabled":"";
  const iconHtml=icon?'<svg class="switch__icon" viewBox="0 0 16 16" aria-hidden="true"><path d="M3 8.5 6.5 12 13 4.5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>':"";
  preview.innerHTML='<label class="'+cls+'"><input type="checkbox" role="switch"'+chkAttr+disAttr+'><span class="switch__track"><span class="switch__thumb">'+iconHtml+'</span></span><span class="switch__label">'+label+'</span></label>';
  if(st.state==="focus"||focusIt){const i=preview.querySelector("input");if(i)i.focus();}
  const pretty='<label class="'+cls+'">\n  <input type="checkbox" role="switch"'+chkAttr+disAttr+'>\n  <span class="switch__track"><span class="switch__thumb">'+(icon?'<span class="switch__icon"></span>':'')+'</span></span>\n  <span class="switch__label">'+label+'</span>\n</label>';
  if(window.highlight){code.innerHTML=window.highlight(pretty);code.classList.add("hl");}else code.textContent=pretty;
  if(ratio)ratio.textContent="Aa — · —";
 }
 root.addEventListener("click",e=>{
  const s=e.target.closest("[data-clab-size]");if(s){st.size=s.dataset.clabSize;mark("[data-clab-size]","clabSize",st.size);smEl.checked=st.size==="sm";render();return;}
  const sf=e.target.closest("[data-clab-surface]");if(sf){stage.dataset.surface=sf.dataset.clabSurface;mark("[data-clab-surface]","clabSurface",stage.dataset.surface);return;}
  const th=e.target.closest("[data-clab-scheme]");if(th){stage.dataset.theme=th.dataset.clabScheme;mark("[data-clab-scheme]","clabScheme",stage.dataset.theme);render();return;}
  if(e.target.closest("[data-clab-copy]"))navigator.clipboard.writeText(code.textContent);
 });
 root.addEventListener("change",e=>{
  if(e.target===stateEl){st.state=stateEl.value;render(true);return;}
  render();
 });
 root.addEventListener("input",render);
 render();
}
function clabSwitchBoot(){document.querySelectorAll('[data-clab][data-clab-name="switch"]').forEach(clabSwitchInit);}
document.addEventListener("ds:doc",clabSwitchBoot);clabSwitchBoot();
