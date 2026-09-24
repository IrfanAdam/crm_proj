/* ADAM/DS — src/ds/gemreward-lab.js · single GemReward specimen */
function gemLabInit(root){
if(root.dataset.done)return;root.dataset.done="1";
const q=s=>root.querySelector(s);
const stage=q("[data-carlab-stage]"),prev=q("[data-carlab-preview]"),code=q("[data-carlab-code]"),rat=q("[data-carlab-ratio]");
function esc(s){return s.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");}
function canvasTag(cat){return '<canvas class="gem-reward__spline" data-gem="'+cat+'" width="640" height="280" role="img" aria-label="'+cat+' gem ceremony"></canvas>';}
prev.innerHTML='<div class="gem-reward gem-reward--sapphire gem-reward--ceremony">'+canvasTag("sapphire")+'<div class="gem-reward__title"></div><div class="gem-reward__capsule"></div><div class="gem-reward__copy"></div></div>';
const card=prev.firstElementChild,titleEl=card.querySelector(".gem-reward__title"),capEl=card.querySelector(".gem-reward__capsule"),copyEl=card.querySelector(".gem-reward__copy");
card.dataset.cat="sapphire";
function render(){
const title=q("[data-gem-title]").value.trim()||"Rock Solid Goals";
const cap=q("[data-gem-capsule]").value.trim()||"+Rs 4lakh · Beyond Target";
const copy=q("[data-gem-copy]").value.trim()||"data in here don’t lie";
const cat=q("[data-gem-category]").value;
const ceremony=q("[data-gem-ceremony]").checked;
card.className=["gem-reward","gem-reward--"+cat,ceremony?"gem-reward--ceremony":""].filter(Boolean).join(" ");
if(card.dataset.cat!==cat){card.dataset.cat=cat;const nu=document.createElement("div");nu.innerHTML=canvasTag(cat);card.querySelector("canvas").replaceWith(nu.firstChild);}
titleEl.textContent=title;capEl.textContent=cap;copyEl.textContent=copy;
const snip='<div class="gem-reward gem-reward--'+cat+'">\n  '+canvasTag(cat)+'\n  <div class="gem-reward__title">'+esc(title)+'</div>\n  <div class="gem-reward__capsule">'+esc(cap)+'</div>\n  <div class="gem-reward__copy">'+esc(copy)+'</div>\n</div>';
if(window.highlight){code.innerHTML=window.highlight(snip);code.classList.add("hl");code.dataset.hlDone="1";}else code.textContent=snip;
if(rat)rat.textContent="Aa — · quarantine "+cat;
}
root.addEventListener("click",e=>{
const s=e.target.closest("[data-carlab-surface]");if(s){stage.dataset.surface=s.dataset.carlabSurface;Array.from(root.querySelectorAll("[data-carlab-surface]")).forEach(b=>b.classList.toggle("is-on",b===s));return;}
const t=e.target.closest("[data-carlab-scheme]");if(t){stage.dataset.theme=t.dataset.carlabScheme;Array.from(root.querySelectorAll("[data-carlab-scheme]")).forEach(b=>b.classList.toggle("is-on",b===t));return;}
const p=e.target.closest("[data-gem-photo]");if(p){const on=!p.classList.contains("is-on");p.classList.toggle("is-on",on);if(window.GEM3D)window.GEM3D.bg(on?"/gem-demo-bg.jpg":null);return;}
if(e.target.closest("[data-carlab-copy]"))navigator.clipboard.writeText(code.textContent);
});
root.addEventListener("input",render);root.addEventListener("change",render);render();
}
function gemBoot(){document.querySelectorAll('[data-carlab="gemreward"]').forEach(gemLabInit);}
document.addEventListener("ds:doc",gemBoot);gemBoot();
