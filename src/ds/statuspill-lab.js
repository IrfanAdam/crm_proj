/* ADAM/DS — src/ds/statuspill-lab.js · statuspill playground */
function spInit(root){
  if(root.dataset.done) return; root.dataset.done="1";
  const q=(s)=>root.querySelector(s);
  const qa=(s)=>Array.from(root.querySelectorAll(s));
  const stage=q("[data-ilab-stage]"), preview=q("[data-ilab-preview]"), code=q("[data-ilab-code]");
  const st={hue:"progress",size:""};
  const mark=(sel,attr,val)=>qa(sel).forEach(b=>b.classList.toggle("is-on",b.dataset[attr]===val));
  function render(){
    const label=(q("[data-ilab-label]").value.trim()||"Status");
    const prefix=q("[data-ilab-prefix]").value;
    const clickable=q("[data-ilab-clickable]").checked;
    let cls=["status-pill","status-pill--"+st.hue];
    if(st.size) cls.push(st.size);
    if(clickable) cls.push("status-pill--clickable");
    let inner="";
    if(prefix==="dot") inner+='<span class="status-pill__dot" aria-hidden="true"></span>';
    if(prefix==="icon") inner+='<span class="status-pill__icon" aria-hidden="true">●</span>';
    inner+=label;
    const tag=clickable?"button":"span";
    const html='<'+tag+' class="'+cls.join(" ")+'">'+inner+'</'+tag+'>';
    preview.dataset.ilabHue=st.hue; preview.innerHTML=html;
    const pretty='<'+tag+' class="'+cls.join(" ")+'">\n  '+(prefix!=="none" ? (prefix==="dot"?'<span class="status-pill__dot"></span>':'<span class="status-pill__icon">●</span>')+" " : "")+label+'\n</'+tag+'>';
    if(window.highlight){code.innerHTML=window.highlight(pretty); code.classList.add("hl"); code.dataset.hlDone="1";} else code.textContent=pretty;
    q("[data-ilab-note]").textContent=clickable?"Clickable adds hover "+ "opacity.subtle.":"";
  }
  root.addEventListener("click",e=>{
    const s=e.target.closest("[data-ilab-size]"); if(s){st.size=s.dataset.ilabSize; mark("[data-ilab-size]","ilabSize",st.size); render(); return;}
    const sf=e.target.closest("[data-ilab-surface]"); if(sf){stage.dataset.surface=sf.dataset.ilabSurface; mark("[data-ilab-surface]","ilabSurface",stage.dataset.surface); return;}
    const sc=e.target.closest("[data-ilab-scheme]"); if(sc){stage.dataset.theme=sc.dataset.ilabScheme; mark("[data-ilab-scheme]","ilabScheme",stage.dataset.theme); render(); return;}
    if(e.target.closest("[data-ilab-copy]")) navigator.clipboard.writeText(code.textContent);
  });
  root.addEventListener("change",e=>{
    if(e.target.matches("[data-ilab-hue-select]")){st.hue=e.target.value; preview.dataset.ilabHue=st.hue; render(); return;}
    render();
  });
  root.addEventListener("input",()=>render());
  render();
}
function spBoot(){document.querySelectorAll('[data-ilab="statuspill"]').forEach(spInit);}
document.addEventListener("ds:doc",spBoot); spBoot();
