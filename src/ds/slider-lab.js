/* ADAM/DS — src/ds/slider-lab.js · Slider playground · supports clab + legacy flab */
function flabSliderInit(root){
 if(root.dataset.done)return;root.dataset.done="1";
 const q=s=>root.querySelector(s),qa=s=>Array.from(root.querySelectorAll(s));
 const stage=q("[data-flab-stage]")||q("[data-clab-stage]"),preview=q("[data-flab-preview]")||q("[data-clab-preview]"),code=q("[data-flab-code]")||q("[data-clab-code]"),ratio=q("[data-flab-ratio]")||q("[data-clab-ratio]");
 const minEl=q("[data-flab-min]")||q("[data-clab-min]"),maxEl=q("[data-flab-max]")||q("[data-clab-max]"),stepEl=q("[data-flab-step]")||q("[data-clab-step]"),valEl=q("[data-flab-value]")||q("[data-clab-value]");
 const st={size:"md",state:"default",discrete:"",variant:"continuous"};
 const mark=(sel,attr,val)=>qa(sel).forEach(b=>b.classList.toggle("is-on",b.dataset[attr]===val));
 function cls(){let c=["slider"];if(st.size==="sm")c.push("slider--sm");if(st.size==="lg")c.push("slider--lg");if(st.discrete==="1"||st.variant==="discrete")c.push("slider--discrete");if(st.state==="error")c.push("slider--error");return c.join(" ");}
 function render(){
  const min=minEl.value||"0",max=maxEl.value||"100",step=stepEl.value||"1",val=valEl.value||"40";
  const isDisabled=stage&&stage.querySelector&&false;const disabled=q("[data-clab-disabled]")||q("[data-flab-disabled]");
  const dis=(st.state==="disabled"||(disabled&&disabled.checked))?" disabled":"";
  const isDiscrete=st.discrete==="1"||st.variant==="discrete";
  const ticks=isDiscrete?'<div class="slider__ticks"><span>'+min+'</span><span>'+max+'</span></div>':"",err=st.state==="error"?'<p class="field__error">Out of range.</p>':"";
  preview.innerHTML='<input type="range" class="'+cls()+'" min="'+min+'" max="'+max+'" step="'+step+'" value="'+val+'"'+dis+' aria-label="Quantity">'+ticks+'<p class="flab__value clab__value">'+val+'</p>'+err;
  const inp=preview.querySelector("input");if(inp)inp.addEventListener("input",e=>{valEl.value=e.target.value;render();});
  if(st.state==="focus")setTimeout(()=>{if(inp)inp.focus();},0);
  let html='<input type="range" class="'+cls()+'" min="'+min+'" max="'+max+'" step="'+step+'" value="'+val+'" aria-valuetext="'+val+'">';if(ticks)html+='\n<div class="slider__ticks"><span>'+min+'</span><span>'+max+'</span></div>';
  code.textContent=html;if(window.highlight){code.innerHTML=window.highlight(html);code.classList.add("hl");}
  if(ratio)ratio.textContent="Aa — · —";
 }
 root.addEventListener("click",e=>{
  const s=e.target.closest("[data-flab-size]")||e.target.closest("[data-clab-size]");if(s){st.size=s.dataset.flabSize||s.dataset.clabSize;mark("[data-flab-size]","flabSize",st.size);mark("[data-clab-size]","clabSize",st.size);render();return;}
  const stEl=e.target.closest("[data-flab-state]")||e.target.closest("[data-clab-state]");if(stEl){const v=stEl.dataset.flabState||stEl.dataset.clabState;if(v){st.state=v;const sel=stEl.closest("[data-flab-state]")?"[data-flab-state]":"[data-clab-state]";const attr=sel.includes("flab")?"flabState":"clabState";mark(sel,attr,st.state);}else st.state=stEl.value;render();return;}
  const d=e.target.closest("[data-flab-discrete]")||e.target.closest("[data-clab-variant]");if(d){st.discrete=d.dataset.flabDiscrete||"";st.variant=d.dataset.clabVariant||st.variant;mark("[data-flab-discrete]","flabDiscrete",st.discrete);mark("[data-clab-variant]","clabVariant",st.variant);render();return;}
  const sf=e.target.closest("[data-flab-surface]")||e.target.closest("[data-clab-surface]");if(sf){stage.dataset.surface=sf.dataset.flabSurface||sf.dataset.clabSurface;mark("[data-flab-surface]","flabSurface",stage.dataset.surface);mark("[data-clab-surface]","clabSurface",stage.dataset.surface);return;}
  const th=e.target.closest("[data-flab-scheme]")||e.target.closest("[data-clab-scheme]");if(th){stage.dataset.theme=th.dataset.flabScheme||th.dataset.clabScheme;mark("[data-flab-scheme]","flabScheme",stage.dataset.theme);mark("[data-clab-scheme]","clabScheme",stage.dataset.theme);render();return;}
  if(e.target.closest("[data-flab-copy]")||e.target.closest("[data-clab-copy]"))navigator.clipboard.writeText(code.textContent);
 });
 root.addEventListener("change",e=>{if(e.target.matches("[data-clab-state]")||e.target.matches("[data-flab-state]")){st.state=e.target.value;render(true);return;}render();});
 root.addEventListener("input",render);render();
}
function clabSliderInit(root){
 if(root.dataset.done)return;root.dataset.done="1";
 const q=s=>root.querySelector(s),qa=s=>Array.from(root.querySelectorAll(s));
 const stage=q("[data-clab-stage]"),preview=q("[data-clab-preview]"),code=q("[data-clab-code]"),ratio=q("[data-clab-ratio]");
 const minEl=q("[data-clab-min]"),maxEl=q("[data-clab-max]"),stepEl=q("[data-clab-step]"),valEl=q("[data-clab-value]"),disEl=q("[data-clab-disabled]");
 const st={size:"md",state:"default",variant:"continuous"};
 const mark=(sel,attr,val)=>qa(sel).forEach(b=>b.classList.toggle("is-on",b.dataset[attr]===val));
 function cls(){let c=["slider"];if(st.size==="sm")c.push("slider--sm");if(st.size==="lg")c.push("slider--lg");if(st.variant==="discrete")c.push("slider--discrete");if(st.state==="error")c.push("slider--error");return c.join(" ");}
 function render(focusIt){
  const min=minEl.value||"0",max=maxEl.value||"100",step=stepEl.value||"1",val=valEl.value||"45";
  const disabled=disEl.checked||st.state==="disabled";
  const disAttr=disabled?" disabled":"";const ticks=st.variant==="discrete"?'<div class="slider__ticks"><span>'+min+'</span><span>'+max+'</span></div>':"";
  preview.innerHTML='<div style="width:100%"><input type="range" class="'+cls()+'" min="'+min+'" max="'+max+'" step="'+step+'" value="'+val+'"'+disAttr+' aria-label="Quantity">'+ticks+'<p class="clab__value" style="font-size:var(--font-size-sm);color:var(--text-secondary);text-align:center">'+val+'</p></div>';
  const inp=preview.querySelector("input");if(inp)inp.addEventListener("input",e=>{valEl.value=e.target.value;render();});
  if(st.state==="focus"||focusIt)setTimeout(()=>{if(inp)inp.focus();},0);
  const pretty='<input type="range" class="'+cls()+'" min="'+min+'" max="'+max+'" step="'+step+'" value="'+val+'">';
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
 root.addEventListener("change",e=>{if(e.target.matches("[data-clab-state]")){st.state=e.target.value;render(true);return;}render();});
 root.addEventListener("input",render);render();
}
function sliderBoot(){document.querySelectorAll('[data-flab="slider"]').forEach(flabSliderInit);document.querySelectorAll('[data-clab][data-clab-name="slider"]').forEach(clabSliderInit);}
document.addEventListener("ds:doc",sliderBoot);sliderBoot();
