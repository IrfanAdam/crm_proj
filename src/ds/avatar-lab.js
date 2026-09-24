/* ADAM/DS — src/ds/avatar-lab.js · avatar playground */
function avatarInit(root){
  if(root.dataset.done) return; root.dataset.done="1";
  const q=(s)=>root.querySelector(s);
  const qa=(s)=>Array.from(root.querySelectorAll(s));
  const stage=q("[data-ilab-stage]"), preview=q("[data-ilab-preview]"), code=q("[data-ilab-code]");
  const st={size:"avatar--md",presence:""};
  const mark=(sel,attr,val)=>qa(sel).forEach(b=>b.classList.toggle("is-on",b.dataset[attr]===val));
  function render(){
    const initials=(q("[data-ilab-label]").value.trim()||"OA").slice(0,2).toUpperCase();
    const stack=q("[data-ilab-stack]").checked;
    const clickable=q("[data-ilab-clickable]").checked;
    let singleCls=["avatar",st.size]; if(st.presence) singleCls.push(st.presence); if(clickable) singleCls.push("avatar--clickable");
    let html="";
    if(stack){
      html='<span class="avatar-stack"><span class="'+singleCls.join(" ")+'">'+initials+'</span><span class="avatar avatar--sm">AJ</span><span class="avatar avatar--sm">+2</span></span>';
    } else {
      html='<span class="'+singleCls.join(" ")+'">'+initials+'</span>';
    }
    const box=q("[data-ilab-capsule]")?.checked;
    const wrap=box?'<div class="ilab-box" style="border-radius:var(--radius-full)">'+html+"</div>":html;
    preview.innerHTML=wrap;
    if(box){
      const pad=parseInt(q("[data-ilab-pad]").value,10); const rad=parseInt(q("[data-ilab-radius]").value,10);
      q("[data-ilab-pad-val]").textContent=pad+"px"; q("[data-ilab-radius-val]").textContent=rad+"px";
      const boxEl=preview.querySelector(".ilab-box"); if(boxEl){boxEl.style.padding=pad+"px"; boxEl.style.borderRadius=rad+"px";}
      q("[data-ilab-tune]").hidden=!box;
    } else q("[data-ilab-tune]").hidden=true;
    const pretty=stack?'<span class="avatar-stack">\n  <span class="'+singleCls.join(" ")+'">'+initials+'</span>\n  <span class="avatar avatar--sm">AJ</span>\n  <span class="avatar avatar--sm">+2</span>\n</span>':html;
    if(window.highlight){code.innerHTML=window.highlight(pretty); code.classList.add("hl"); code.dataset.hlDone="1";} else code.textContent=pretty;
    q("[data-ilab-note]").textContent=st.presence?"Presence is decorative — announce name in text.":"";
  }
  root.addEventListener("click",e=>{
    const sz=e.target.closest("[data-ilab-size]"); if(sz){st.size=sz.dataset.ilabSize; mark("[data-ilab-size]","ilabSize",st.size); render(); return;}
    const pr=e.target.closest("[data-ilab-presence]"); if(pr){st.presence=pr.dataset.ilabPresence; mark("[data-ilab-presence]","ilabPresence",st.presence); render(); return;}
    const sf=e.target.closest("[data-ilab-surface]"); if(sf){stage.dataset.surface=sf.dataset.ilabSurface; mark("[data-ilab-surface]","ilabSurface",stage.dataset.surface); return;}
    const sc=e.target.closest("[data-ilab-scheme]"); if(sc){stage.dataset.theme=sc.dataset.ilabScheme; mark("[data-ilab-scheme]","ilabScheme",stage.dataset.theme); render(); return;}
    if(e.target.closest("[data-ilab-copy]")) navigator.clipboard.writeText(code.textContent);
  });
  root.addEventListener("change",()=>render());
  root.addEventListener("input",()=>render());
  render();
}
function avatarBoot(){document.querySelectorAll('[data-ilab="avatar"]').forEach(avatarInit);}
document.addEventListener("ds:doc",avatarBoot); avatarBoot();
