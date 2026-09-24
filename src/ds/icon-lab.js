/* ADAM/DS — src/ds/icon-lab.js · icon playground */
function iconInit(root){
  if(root.dataset.done) return; root.dataset.done="1";
  const q=(s)=>root.querySelector(s);
  const qa=(s)=>Array.from(root.querySelectorAll(s));
  const stage=q("[data-ilab-stage]"), preview=q("[data-ilab-preview]"), code=q("[data-ilab-code]");
  const st={size:"",hue:"neutral",weight:"regular"};
  const HUE_MAP={neutral:"var(--text-primary)",measure:"var(--role-measure)",score:"var(--role-score)",streak:"var(--role-streak)"};
  const mark=(sel,attr,val)=>qa(sel).forEach(b=>b.classList.toggle("is-on",b.dataset[attr]===val));
  function render(){
    const icon=q("[data-ilab-icon]").value||"ph-house";
    const muted=q("[data-ilab-muted]").checked;
    const subtle=q("[data-ilab-subtle]").checked;
    let cls=["icon"]; if(st.size) cls.push(st.size); if(muted) cls.push("icon--muted"); if(subtle) cls.push("icon--subtle");
    const weightCls=st.weight==="regular" ? "ph" : st.weight==="fill" ? "ph-fill" : "ph-"+st.weight;
    // CDN path via ph classes: ph ph-* etc. Use mapping: icon class ph + variant
    const inner='<i class="'+weightCls+" "+icon+'" aria-hidden="true"></i>';
    const style=' style="color:'+HUE_MAP[st.hue]+'"';
    const html='<span class="'+cls.join(" ")+'"'+style+' aria-hidden="true">'+inner+"</span>";
    preview.dataset.ilabHue=st.hue; preview.innerHTML=html;
    const pretty='<span class="'+cls.join(" ")+'" aria-hidden="true">\n  <i class="'+weightCls+" "+icon+'"></i>\n</span>';
    if(window.highlight){code.innerHTML=window.highlight(pretty); code.classList.add("hl"); code.dataset.hlDone="1";} else code.textContent=pretty;
    q("[data-ilab-note]").textContent=st.weight==="fill"?"Fill marks selected.":"Regular is default 1.5px.";
  }
  root.addEventListener("click",e=>{
    const s=e.target.closest("[data-ilab-size]"); if(s){st.size=s.dataset.ilabSize; mark("[data-ilab-size]","ilabSize",st.size); render(); return;}
    const h=e.target.closest("[data-ilab-hue]"); if(h){st.hue=h.dataset.ilabHue; mark("[data-ilab-hue]","ilabHue",st.hue); render(); return;}
    const sf=e.target.closest("[data-ilab-surface]"); if(sf){stage.dataset.surface=sf.dataset.ilabSurface; mark("[data-ilab-surface]","ilabSurface",stage.dataset.surface); return;}
    const sc=e.target.closest("[data-ilab-scheme]"); if(sc){stage.dataset.theme=sc.dataset.ilabScheme; mark("[data-ilab-scheme]","ilabScheme",stage.dataset.theme); render(); return;}
    if(e.target.closest("[data-ilab-copy]")) navigator.clipboard.writeText(code.textContent);
  });
  root.addEventListener("change",e=>{
    if(e.target.matches("[data-ilab-weight]")){st.weight=e.target.value; render(); return;}
    if(e.target.matches("[data-ilab-icon]")){render(); return;}
    render();
  });
  root.addEventListener("input",()=>render());
  render();
}
function iconBoot(){document.querySelectorAll('[data-ilab="icon"]').forEach(iconInit);}
document.addEventListener("ds:doc",iconBoot); iconBoot();
