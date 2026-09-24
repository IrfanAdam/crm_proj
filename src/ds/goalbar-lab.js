/* ADAM/DS — src/ds/goalbar-lab.js · single GoalBar specimen */
function goalLabInit(root){
if(root.dataset.done)return;root.dataset.done="1";
const q=s=>root.querySelector(s),qa=s=>Array.from(root.querySelectorAll(s));
const stage=q("[data-carlab-stage]"),prev=q("[data-carlab-preview]"),code=q("[data-carlab-code]"),rat=q("[data-carlab-ratio]");
function esc(s){return s.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");}
function render(){
const label=q("[data-goal-label]").value.trim()||"Q3 quota";
const val=parseInt(q("[data-goal-value]").value,10)||60;
const fill=Math.max(0,Math.min(100,val));
const size=q("[data-goal-size]").value;
const gem=q("[data-goal-gem]").checked;
const cls=["goal-bar",size!=="default"?"goal-bar--"+size:"",gem?"goal-bar--gem":""].filter(Boolean).join(" ");
prev.innerHTML='<div class="'+cls+'"><div class="goal-bar__fill" role="progressbar" aria-valuenow="'+fill+'" aria-valuemin="0" aria-valuemax="100" aria-label="'+esc(label)+'" style="width:'+fill+'%"><span class="goal-bar__label">'+esc(label)+'</span><span class="goal-bar__value">'+fill+"%</span></div></div>";
const snip='<div class="'+cls+'">\n  <div class="goal-bar__fill" role="progressbar" aria-valuenow="'+fill+'" style="width:'+fill+'%">\n    <span class="goal-bar__label">'+label+'</span><span class="goal-bar__value">'+fill+"%</span>\n  </div>\n</div>";
if(window.highlight){code.innerHTML=window.highlight(snip);code.classList.add("hl");code.dataset.hlDone="1";}else code.textContent=snip;
if(rat)rat.textContent="Aa "+(gem?"4.14 gem":"5.2 amethyst")+" · "+size;
}
root.addEventListener("click",e=>{
const s=e.target.closest("[data-carlab-surface]");if(s){stage.dataset.surface=s.dataset.carlabSurface;qa("[data-carlab-surface]").forEach(b=>b.classList.toggle("is-on",b===s));return;}
const t=e.target.closest("[data-carlab-scheme]");if(t){stage.dataset.theme=t.dataset.carlabScheme;qa("[data-carlab-scheme]").forEach(b=>b.classList.toggle("is-on",b===t));return;}
if(e.target.closest("[data-carlab-copy]"))navigator.clipboard.writeText(code.textContent);
});
root.addEventListener("input",render);root.addEventListener("change",render);render();
}
function goalBoot(){document.querySelectorAll('[data-carlab="goalbar"]').forEach(goalLabInit);}
document.addEventListener("ds:doc",goalBoot);goalBoot();
