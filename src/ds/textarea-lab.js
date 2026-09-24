/* ADAM/DS — src/ds/textarea-lab.js · Textarea playground */
function flabTextareaInit(root){
 if(root.dataset.done)return;root.dataset.done="1";
 const q=s=>root.querySelector(s),qa=s=>Array.from(root.querySelectorAll(s));
 const stage=q("[data-flab-stage]"),preview=q("[data-flab-preview]"),code=q("[data-flab-code]"),ratio=q("[data-flab-ratio]");
 const labelEl=q("[data-flab-label]"),valEl=q("[data-flab-value]"),phEl=q("[data-flab-ph]"),rowsEl=q("[data-flab-rows]"),maxEl=q("[data-flab-max]");
 const st={size:"md",state:"default",resize:"vertical"};
 const mark=(sel,attr,val)=>qa(sel).forEach(b=>b.classList.toggle("is-on",b.dataset[attr]===val));
 function cls(){let c=["field__input"];if(st.size==="sm")c.push("textarea__input--sm");if(st.size==="lg")c.push("textarea__input--lg");if(st.state==="error")c.push("field__input--error");if(st.state==="success")c.push("field__input--success");return c.join(" ");}
 function render(){
  const lbl=labelEl.value.trim()||"Notes",val=valEl.value,ph=phEl.value,rows=rowsEl.value||"3",max=maxEl.value.trim();
  const id="flab-ta",count=max?val.length+" / "+max:"",near=max&&val.length/max>=0.9,cl=near?"textarea__count textarea__count--limit":"textarea__count";
  const countHtml=max?'<span class="'+cl+'" id="flab-count">'+count+'</span>':"";
  const attrs=(st.state==="disabled"?" disabled":"")+(st.state==="readonly"?" readonly":"")+(st.state==="error"?' aria-invalid="true" aria-describedby="flab-err"':max?' aria-describedby="flab-count"':"")+(max?' maxlength="'+max+'"':"");
  const err=st.state==="error"?'<p class="field__error" id="flab-err">Fix this field.</p>':"";
  preview.innerHTML='<div class="textarea"><label class="field__label" for="'+id+'">'+lbl+'</label><textarea class="'+cls()+'" id="'+id+'" rows="'+rows+'" placeholder="'+ph+'"'+attrs+' style="resize:'+st.resize+'">'+val+'</textarea>'+countHtml+err+'</div>';
  if(st.state==="focus")setTimeout(()=>{const el=preview.querySelector("textarea");if(el)el.focus();},0);
  let html='<label class="field__label" for="'+id+'">'+lbl+'</label>\n<div class="textarea">\n  <textarea class="'+cls()+'" id="'+id+'" rows="'+rows+'"'+attrs+'>'+val+'</textarea>\n  '+countHtml+'\n</div>';if(err)html+='\n'+err;
  code.textContent=html;if(window.highlight){code.innerHTML=window.highlight(html);code.classList.add("hl");}
  if(ratio){const el=preview.querySelector("textarea");if(el){const cs=getComputedStyle(el);const lum=s=>{const n=s.match(/[\d.]+/g).slice(0,3).map(Number).map(x=>{x/=255;return x<=0.03928?x/12.92:Math.pow((x+0.055)/1.055,2.4)});return 0.2126*n[0]+0.7152*n[1]+0.0722*n[2]};const r=(Math.max(lum(cs.color),lum(cs.backgroundColor))+0.05)/(Math.min(lum(cs.color),lum(cs.backgroundColor))+0.05);ratio.textContent="Aa "+r.toFixed(2);}}
 }
 root.addEventListener("click",e=>{
  const s=e.target.closest("[data-flab-size]");if(s){st.size=s.dataset.flabSize;mark("[data-flab-size]","flabSize",st.size);render();return;}
  const stEl=e.target.closest("[data-flab-state]");if(stEl){st.state=stEl.dataset.flabState;mark("[data-flab-state]","flabState",st.state);render();return;}
  const rs=e.target.closest("[data-flab-resize]");if(rs){st.resize=rs.dataset.flabResize;mark("[data-flab-resize]","flabResize",st.resize);render();return;}
  const sf=e.target.closest("[data-flab-surface]");if(sf){stage.dataset.surface=sf.dataset.flabSurface;mark("[data-flab-surface]","flabSurface",stage.dataset.surface);return;}
  const th=e.target.closest("[data-flab-scheme]");if(th){stage.dataset.theme=th.dataset.flabScheme;mark("[data-flab-scheme]","flabScheme",stage.dataset.theme);render();return;}
  if(e.target.closest("[data-flab-copy]"))navigator.clipboard.writeText(code.textContent);
 });
 root.addEventListener("input",render);render();
}
function flabTextareaBoot(){document.querySelectorAll('[data-flab="textarea"]').forEach(flabTextareaInit);}
document.addEventListener("ds:doc",flabTextareaBoot);flabTextareaBoot();
