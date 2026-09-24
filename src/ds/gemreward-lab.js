/* ADAM/DS — src/ds/gemreward-lab.js · single GemReward specimen */
function gemLabInit(root){
if(root.dataset.done)return;root.dataset.done="1";
const q=s=>root.querySelector(s),qa=s=>Array.from(root.querySelectorAll(s));
const stage=q("[data-carlab-stage]"),prev=q("[data-carlab-preview]"),code=q("[data-carlab-code]"),rat=q("[data-carlab-ratio]");
function esc(s){return s.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");}
function render(){
const title=q("[data-gem-title]").value.trim()||"Rock Solid Goals";
const cap=q("[data-gem-capsule]").value.trim()||"+Rs 4lakh · Beyond Target";
const copy=q("[data-gem-copy]").value.trim()||"data in here don’t lie";
const cat=q("[data-gem-category]").value;
const ceremony=q("[data-gem-ceremony]").checked;
const cls=["gem-reward","gem-reward--"+cat].filter(Boolean).join(" ");
const cer=ceremony?" gem-reward--ceremony":"";
prev.innerHTML='<div class="'+cls+cer+'" style="min-width:280px"><iframe class="gem-reward__spline" src="https://my.spline.design/gem-embed" title="'+esc(title)+'" loading="lazy"></iframe><div class="gem-reward__title">'+esc(title)+'</div><div class="gem-reward__capsule">'+esc(cap)+'</div><div class="gem-reward__copy">'+esc(copy)+'</div></div>';
const snip='<div class="'+cls+'">\n  <iframe class="gem-reward__spline" src="https://my.spline.design/gem-embed" title="'+title+'"></iframe>\n  <div class="gem-reward__title">'+title+'</div>\n  <div class="gem-reward__capsule">'+cap+"</div>\n</div>";
if(window.highlight){code.innerHTML=window.highlight(snip);code.classList.add("hl");code.dataset.hlDone="1";}else code.textContent=snip;
if(rat)rat.textContent="Aa — · quarantine "+cat;
}
root.addEventListener("click",e=>{
const s=e.target.closest("[data-carlab-surface]");if(s){stage.dataset.surface=s.dataset.carlabSurface;qa("[data-carlab-surface]").forEach(b=>b.classList.toggle("is-on",b===s));return;}
const t=e.target.closest("[data-carlab-scheme]");if(t){stage.dataset.theme=t.dataset.carlabScheme;qa("[data-carlab-scheme]").forEach(b=>b.classList.toggle("is-on",b===t));return;}
if(e.target.closest("[data-carlab-copy]"))navigator.clipboard.writeText(code.textContent);
});
root.addEventListener("input",render);root.addEventListener("change",render);render();
}
function gemBoot(){document.querySelectorAll('[data-carlab="gemreward"]').forEach(gemLabInit);}
document.addEventListener("ds:doc",gemBoot);gemBoot();
