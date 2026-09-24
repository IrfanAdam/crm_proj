/* ADAM/DS — src/ds/funnelglyph-lab.js · single FunnelGlyph specimen */
function glyphLabInit(root){
if(root.dataset.done)return;root.dataset.done="1";
const q=s=>root.querySelector(s),qa=s=>Array.from(root.querySelectorAll(s));
const stage=q("[data-carlab-stage]"),prev=q("[data-carlab-preview]"),code=q("[data-carlab-code]"),rat=q("[data-carlab-ratio]");
function render(){
const size=q("[data-glyph-size]").value;
const char=q("[data-glyph-char]").value.trim()||"⬢";
const cls=["funnel-glyph",size!=="default"?"funnel-glyph--"+size:""].filter(Boolean).join(" ");
prev.innerHTML='<span class="'+cls+'" aria-hidden="true">'+char+"</span><span class=\"meta\" style=\"margin-left:8px\">Measure value beside glyph</span>";
const snip='<span class="'+cls+'" aria-hidden="true">'+char+"</span>";
if(window.highlight){code.innerHTML=window.highlight(snip);code.classList.add("hl");code.dataset.hlDone="1";}else code.textContent=snip;
if(rat)rat.textContent="Aa 9.0 AAA · sapphire-100/600";
}
root.addEventListener("click",e=>{
const s=e.target.closest("[data-carlab-surface]");if(s){stage.dataset.surface=s.dataset.carlabSurface;qa("[data-carlab-surface]").forEach(b=>b.classList.toggle("is-on",b===s));return;}
const t=e.target.closest("[data-carlab-scheme]");if(t){stage.dataset.theme=t.dataset.carlabScheme;qa("[data-carlab-scheme]").forEach(b=>b.classList.toggle("is-on",b===t));return;}
if(e.target.closest("[data-carlab-copy]"))navigator.clipboard.writeText(code.textContent);
});
root.addEventListener("input",render);root.addEventListener("change",render);render();
}
function glyphBoot(){document.querySelectorAll('[data-carlab="funnelglyph"]').forEach(glyphLabInit);}
document.addEventListener("ds:doc",glyphBoot);glyphBoot();
