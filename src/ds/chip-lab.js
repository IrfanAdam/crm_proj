/* ADAM/DS — src/ds/chip-lab.js · chip playground */
const CHIP_CLASS="chip";
function chipInit(root){
  if(root.dataset.done) return; root.dataset.done="1";
  const q=(s)=>root.querySelector(s);
  const qa=(s)=>Array.from(root.querySelectorAll(s));
  const stage=q("[data-ilab-stage]"), preview=q("[data-ilab-preview]"), code=q("[data-ilab-code]");
  const st={variant:"",size:"",state:"default"};
  const mark=(sel,attr,val)=>qa(sel).forEach(b=>b.classList.toggle("is-on",b.dataset[attr]===val));
  function curLabel(){const v=q("[data-ilab-label]").value.trim(); return v||"Chip";}
  function buildAttrs(){if(st.state==="disabled") return " disabled"; if(st.state==="aria-disabled") return ' aria-disabled="true"'; return "";}
  function buildInner(forCode){
    const lab=forCode?"{{LABEL}}":curLabel();
    let s=lab;
    if(q("[data-ilab-hascount]")?.checked) s+='<span class="chip__count">'+(forCode?"{{COUNT}}":q("[data-ilab-count]").value.trim()||"4")+"</span>";
    if(q("[data-ilab-close]").checked) s+='<span class="chip__close" aria-label="Remove">×</span>';
    return s;
  }
  function render(){
    const cls=[CHIP_CLASS]; if(st.variant) cls.push(st.variant); if(st.size) cls.push(st.size);
    const isSel=st.variant==="chip--selected";
    const aria=isSel?' aria-pressed="'+(st.state==="default"?"true":"false")+'"':"";
    const attrs=buildAttrs(); const box=q("[data-ilab-capsule]")?.checked;
    const inner=buildInner(false);
    const html='<button class="'+cls.join(" ")+'"'+aria+attrs+">"+inner+"</button>";
    const wrap=box?'<div class="ilab-box">'+html+"</div>":html;
    preview.innerHTML=wrap;
    if(box) tuneApply(root);
    const pretty=chipPretty(cls,aria,attrs,inner,curLabel());
    if(window.highlight) {code.innerHTML=window.highlight(pretty); code.classList.add("hl"); code.dataset.hlDone="1";} else code.textContent=pretty;
    q("[data-ilab-note]").textContent=st.variant==="chip--suggestion"&&isSel?"Suggestion never selected.":"";
  }
  function tuneApply(r){
    const tune=r.querySelector("[data-ilab-tune]"); if(!tune) return;
    tune.hidden=!q("[data-ilab-capsule]").checked; if(tune.hidden) return;
    const pad=parseInt(q("[data-ilab-pad]").value,10); const rad=parseInt(q("[data-ilab-radius]").value,10);
    q("[data-ilab-pad-val]").textContent=pad+"px"; q("[data-ilab-radius-val]").textContent=rad+"px";
    const boxEl=preview.querySelector(".ilab-box"); if(boxEl){boxEl.style.padding=pad+"px"; boxEl.style.borderRadius=rad+"px"; const inner=Math.max(8,Math.round((rad-pad)/4)*4); const btn=boxEl.querySelector("."+CHIP_CLASS); if(btn) btn.style.borderRadius=inner+"px";}
  }
  root.addEventListener("click",e=>{
    const v=e.target.closest("[data-ilab-variant]"); if(v){st.variant=v.dataset.ilabVariant; mark("[data-ilab-variant]","ilabVariant",st.variant); render(); return;}
    const s=e.target.closest("[data-ilab-size]"); if(s){st.size=s.dataset.ilabSize; mark("[data-ilab-size]","ilabSize",st.size); render(); return;}
    const sf=e.target.closest("[data-ilab-surface]"); if(sf){stage.dataset.surface=sf.dataset.ilabSurface; mark("[data-ilab-surface]","ilabSurface",stage.dataset.surface); return;}
    const sc=e.target.closest("[data-ilab-scheme]"); if(sc){stage.dataset.theme=sc.dataset.ilabScheme; mark("[data-ilab-scheme]","ilabScheme",stage.dataset.theme); render(); return;}
    if(e.target.closest("[data-ilab-copy]")) navigator.clipboard.writeText(code.textContent);
  });
  root.addEventListener("change",e=>{
    if(e.target.matches("[data-ilab-state]")){st.state=e.target.value; render(); return;}
    render();
  });
  root.addEventListener("input",()=>render());
  render();
}
function chipPretty(cls,aria,attrs,inner,label){
  let a=['class="'+cls.join(" ")+'"']; if(aria) a.push(aria.trim()); if(attrs) a.push(attrs.trim());
  let s="<button\n"; a.forEach((x,i)=>s+="  "+x+(i===a.length-1?">\n":"\n"));
  s+="  "+inner.replace("{{LABEL}}",label).replace("{{COUNT}}","4")+"\n</button>"; return s;
}
function chipBoot(){document.querySelectorAll('[data-ilab="chip"]').forEach(chipInit);}
document.addEventListener("ds:doc",chipBoot); chipBoot();
