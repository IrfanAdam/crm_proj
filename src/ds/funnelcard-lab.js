/* ADAM/DS — src/ds/funnelcard-lab.js · single FunnelCard specimen */
function funnelLabInit(root){
if(root.dataset.done)return;root.dataset.done="1";
const q=s=>root.querySelector(s),qa=s=>Array.from(root.querySelectorAll(s));
const stage=q("[data-carlab-stage]"),prev=q("[data-carlab-preview]"),code=q("[data-carlab-code]"),rat=q("[data-carlab-ratio]");
function esc(s){return s.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");}
function render(){
const glyph=q("[data-funnel-glyph]").value.trim()||"ph-funnel";
const title=q("[data-funnel-title]").value.trim()||"Pipeline health";
const meta=q("[data-funnel-meta]").value.trim()||"Last refreshed 9:41 AM";
const m1=q("[data-funnel-m1]").value.trim()||"CR 24%";
const m2=q("[data-funnel-m2]").value.trim()||"RR 61%";
const m3=q("[data-funnel-m3]").value.trim()||"CSAT 4.8";
const m4=q("[data-funnel-m4]").value.trim()||"NPS 52";
const metrics=[m1,m2,m3,m4].filter(Boolean).map(v=>'<span class="funnel-card__metric">'+esc(v)+"</span>").join("");
prev.innerHTML='<article class="funnel-card"><span class="funnel-card__glyph"><i class="ph-bold '+glyph+'" aria-hidden="true"></i></span><div class="funnel-card__body"><div class="funnel-card__title">'+esc(title)+'</div><div class="funnel-card__meta">'+esc(meta)+'</div><div class="funnel-card__metrics">'+metrics+"</div></div></article>";
const snip='<article class="funnel-card">\n  <span class="funnel-card__glyph"><i class="'+glyph+'"></i></span>\n  <div class="funnel-card__title">'+title+'</div>\n  <div class="funnel-card__meta">'+meta+'</div>\n  <div class="funnel-card__metrics">'+[m1,m2,m3,m4].filter(Boolean).join(" · ")+"</div>\n</article>";
if(window.highlight){code.innerHTML=window.highlight(snip);code.classList.add("hl");code.dataset.hlDone="1";}else code.textContent=snip;
if(rat)rat.textContent="Aa 9.1 AAA · sapphire glyph";
}
root.addEventListener("click",e=>{
const s=e.target.closest("[data-carlab-surface]");if(s){stage.dataset.surface=s.dataset.carlabSurface;qa("[data-carlab-surface]").forEach(b=>b.classList.toggle("is-on",b===s));return;}
const t=e.target.closest("[data-carlab-scheme]");if(t){stage.dataset.theme=t.dataset.carlabScheme;qa("[data-carlab-scheme]").forEach(b=>b.classList.toggle("is-on",b===t));return;}
if(e.target.closest("[data-carlab-copy]"))navigator.clipboard.writeText(code.textContent);
});
root.addEventListener("input",render);root.addEventListener("change",render);render();
}
function funnelBoot(){document.querySelectorAll('[data-carlab="funnelcard"]').forEach(funnelLabInit);}
document.addEventListener("ds:doc",funnelBoot);funnelBoot();
