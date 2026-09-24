/* ADAM/DS — src/ds/radio-lab.js · single live radio group */
function clabRadioInit(root){
 if(root.dataset.done)return;root.dataset.done="1";
 const q=s=>root.querySelector(s),qa=s=>Array.from(root.querySelectorAll(s));
 const stage=q("[data-clab-stage]"),preview=q("[data-clab-preview]"),code=q("[data-clab-code]"),ratio=q("[data-clab-ratio]");
 const legendEl=q("[data-clab-group]"),nameEl=q("[data-clab-name]"),optsEl=q("[data-clab-options]"),disEl=q("[data-clab-disabled]");
 const idxEl=q("[data-clab-checked-index]"),stateEl=q("[data-clab-state]");
 const st={variant:"vertical",size:"md",state:"default"};
 const mark=(sel,attr,val)=>qa(sel).forEach(b=>b.classList.toggle("is-on",b.dataset[attr]===val));
 function render(focusIt){
  const legend=legendEl.value.trim()||"Group";
  const name=nameEl.value.trim()||"group";
  const opts=optsEl.value.split(",").map(s=>s.trim()).filter(Boolean);
  const idx=parseInt(idxEl.value,10);
  const disableLast=disEl.checked;
  let gCls="radio-group";if(st.variant==="horizontal")gCls+=" radio-group--horizontal";
  let html='<fieldset class="'+gCls+'"><legend>'+legend+'</legend>';
  opts.forEach((opt,i)=>{
   let cls="radio";if(st.size==="sm")cls+=" radio--sm";if(st.size==="lg")cls+=" radio--lg";
   if(st.state==="error"&&i===idx)cls+=" radio--error";if(st.state==="disabled"&&i===opts.length-1)cls+=" radio--disabled";
   if(disableLast&&i===opts.length-1)cls+=" radio--disabled";
   const chk=i===idx?" checked":"";const dis=(disableLast&&i===opts.length-1)||(st.state==="disabled"&&i===opts.length-1)?" disabled":"";
   const err=st.state==="error"&&i===idx?' aria-invalid="true"':"";
   html+='<label class="'+cls+'"><input type="radio" name="'+name+'"'+chk+dis+err+'><span class="radio__dot"></span><span class="radio__label">'+opt+'</span></label>';
  });
  html+="</fieldset>";
  preview.innerHTML=html;
  if(st.state==="focus"||focusIt){const r=preview.querySelector("input:not([disabled])");if(r)r.focus();}
  const pretty='<fieldset class="'+gCls+'">\n  <legend>'+legend+'</legend>\n'+opts.map((o,i)=>'  <label class="radio"><input type="radio" name="'+name+'"'+(i===idx?' checked':'')+'>'+o+'</label>').join("\n")+'\n</fieldset>';
  if(window.highlight){code.innerHTML=window.highlight(pretty);code.classList.add("hl");}else code.textContent=pretty;
  if(ratio)ratio.textContent="Aa — · —";
 }
 root.addEventListener("click",e=>{
  const v=e.target.closest("[data-clab-variant]");if(v){st.variant=v.dataset.clabVariant;mark("[data-clab-variant]","clabVariant",st.variant);render();return;}
  const s=e.target.closest("[data-clab-size]");if(s){st.size=s.dataset.clabSize;mark("[data-clab-size]","clabSize",st.size);render();return;}
  const sf=e.target.closest("[data-clab-surface]");if(sf){stage.dataset.surface=sf.dataset.clabSurface;mark("[data-clab-surface]","clabSurface",stage.dataset.surface);return;}
  const th=e.target.closest("[data-clab-scheme]");if(th){stage.dataset.theme=th.dataset.clabScheme;mark("[data-clab-scheme]","clabScheme",stage.dataset.theme);render();return;}
  if(e.target.closest("[data-clab-copy]"))navigator.clipboard.writeText(code.textContent);
 });
 root.addEventListener("change",e=>{
  if(e.target===idxEl||e.target===stateEl){if(stateEl)st.state=stateEl.value;render(true);return;}
  render();
 });
 root.addEventListener("input",render);
 render();
}
function clabRadioBoot(){document.querySelectorAll('[data-clab][data-clab-name="radio"]').forEach(clabRadioInit);}
document.addEventListener("ds:doc",clabRadioBoot);clabRadioBoot();
