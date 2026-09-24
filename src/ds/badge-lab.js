/* ADAM/DS — src/ds/badge-lab.js · badge playground */
function badgeInit(root){
  if(root.dataset.done) return; root.dataset.done="1";
  const q=(s)=>root.querySelector(s);
  const qa=(s)=>Array.from(root.querySelectorAll(s));
  const stage=q("[data-ilab-stage]"), preview=q("[data-ilab-preview]"), code=q("[data-ilab-code]");
  const st={hue:"default",size:""};
  const mark=(sel,attr,val)=>qa(sel).forEach(b=>b.classList.toggle("is-on",b.dataset[attr]===val));
  function render(){
    const count=q("[data-ilab-count]").value.trim()||"3";
    const max=q("[data-ilab-max]").checked;
    const overlap=q("[data-ilab-overlap]").checked;
    const isDot=st.size==="badge--dot"||st.hue==="dot";
    let cls=["badge"];
    if(!isDot){
      if(st.hue!=="default"&&st.hue!=="dot") cls.push("badge--"+st.hue);
      if(st.size==="badge--sm") cls.push("badge--sm");
      if(max) cls.push("badge--max");
      if(overlap) cls.push("badge--overlap");
    } else {cls=["badge","badge--dot"]; }
    const text=isDot?"": (max ? "99+" : count);
    const aria=isDot?' aria-label="New updates"':"";
    let html='<span class="'+cls.join(" ")+'"'+aria+">"+text+"</span>";
    if(overlap&&!isDot) html='<span class="badge-wrap"><span class="avatar avatar--sm">OA</span>'+html+"</span>";
    const box=q("[data-ilab-capsule]")?.checked;
    const wrap=box?'<div class="ilab-box">'+html+"</div>":html;
    preview.dataset.ilabHue=st.hue; preview.innerHTML=wrap;
    if(box){
      const pad=parseInt(q("[data-ilab-pad]").value,10); const rad=parseInt(q("[data-ilab-radius]").value,10);
      q("[data-ilab-pad-val]").textContent=pad+"px"; q("[data-ilab-radius-val]").textContent=rad+"px";
      const boxEl=preview.querySelector(".ilab-box"); if(boxEl){boxEl.style.padding=pad+"px"; boxEl.style.borderRadius=rad+"px";}
      q("[data-ilab-tune]").hidden=!box;
    } else q("[data-ilab-tune]").hidden=true;
    const pretty=overlap&&!isDot?'<span class="badge-wrap">\n  <span class="avatar avatar--sm">OA</span>\n  '+html.match(/<span class="badge[^>]*>[^<]*<\/span>/)[0]+"\n</span>":html;
    if(window.highlight){code.innerHTML=window.highlight(pretty); code.classList.add("hl"); code.dataset.hlDone="1";} else code.textContent=pretty;
    q("[data-ilab-note]").textContent=isDot&&max?"Dot has no count.":"";
  }
  root.addEventListener("click",e=>{
    const s=e.target.closest("[data-ilab-size]"); if(s){st.size=s.dataset.ilabSize; mark("[data-ilab-size]","ilabSize",st.size); render(); return;}
    const sf=e.target.closest("[data-ilab-surface]"); if(sf){stage.dataset.surface=sf.dataset.ilabSurface; mark("[data-ilab-surface]","ilabSurface",stage.dataset.surface); return;}
    const sc=e.target.closest("[data-ilab-scheme]"); if(sc){stage.dataset.theme=sc.dataset.ilabScheme; mark("[data-ilab-scheme]","ilabScheme",stage.dataset.theme); render(); return;}
    if(e.target.closest("[data-ilab-copy]")) navigator.clipboard.writeText(code.textContent);
  });
  root.addEventListener("change",e=>{
    if(e.target.matches("[data-ilab-hue-select]")){st.hue=e.target.value; render(); return;}
    render();
  });
  root.addEventListener("input",()=>render());
  render();
}
function badgeBoot(){document.querySelectorAll('[data-ilab="badge"]').forEach(badgeInit);}
document.addEventListener("ds:doc",badgeBoot); badgeBoot();
