/* ADAM/DS — src/ds/profilecard-lab.js · single ProfileCard specimen */
function profileLabInit(root){
if(root.dataset.done)return;root.dataset.done="1";
const q=s=>root.querySelector(s),qa=s=>Array.from(root.querySelectorAll(s));
const stage=q("[data-carlab-stage]"),prev=q("[data-carlab-preview]"),code=q("[data-carlab-code]"),rat=q("[data-carlab-ratio]");
function esc(s){return s.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");}
function render(){
const avatar=q("[data-profile-avatar]").value.trim()||"OK";
const name=q("[data-profile-name]").value.trim()||"Olivia Kang";
const role=q("[data-profile-role]").value.trim()||"Regional rep · West";
const v1=q("[data-profile-v1]").value.trim()||"128";const l1=q("[data-profile-l1]").value.trim()||"Deals";
const v2=q("[data-profile-v2]").value.trim()||"96%";const l2=q("[data-profile-l2]").value.trim()||"Quota";
const v3=q("[data-profile-v3]").value.trim()||"4.9";const l3=q("[data-profile-l3]").value.trim()||"CSAT";
prev.innerHTML='<article class="profile-card"><span class="profile-card__avatar" aria-hidden="true">'+esc(avatar)+'</span><div><div class="profile-card__name">'+esc(name)+'</div><div class="profile-card__role">'+esc(role)+'</div></div><div class="profile-card__stats"><div class="profile-card__stat"><span class="profile-card__val">'+esc(v1)+'</span><span class="profile-card__label">'+esc(l1)+'</span></div><div class="profile-card__stat"><span class="profile-card__val">'+esc(v2)+'</span><span class="profile-card__label">'+esc(l2)+'</span></div><div class="profile-card__stat"><span class="profile-card__val">'+esc(v3)+'</span><span class="profile-card__label">'+esc(l3)+'</span></div></div></article>';
const snip='<article class="profile-card">\n  <span class="profile-card__avatar">'+avatar+'</span>\n  <div class="profile-card__name">'+name+'</div><div class="profile-card__role">'+role+'</div>\n  <div class="profile-card__stats">'+v1+" "+l1+" · "+v2+" "+l2+" · "+v3+" "+l3+"</div>\n</article>";
if(window.highlight){code.innerHTML=window.highlight(snip);code.classList.add("hl");code.dataset.hlDone="1";}else code.textContent=snip;
if(rat)rat.textContent="Aa 12.4 AAA · centered trio";
}
root.addEventListener("click",e=>{
const s=e.target.closest("[data-carlab-surface]");if(s){stage.dataset.surface=s.dataset.carlabSurface;qa("[data-carlab-surface]").forEach(b=>b.classList.toggle("is-on",b===s));return;}
const t=e.target.closest("[data-carlab-scheme]");if(t){stage.dataset.theme=t.dataset.carlabScheme;qa("[data-carlab-scheme]").forEach(b=>b.classList.toggle("is-on",b===t));return;}
if(e.target.closest("[data-carlab-copy]"))navigator.clipboard.writeText(code.textContent);
});
root.addEventListener("input",render);root.addEventListener("change",render);render();
}
function profileBoot(){document.querySelectorAll('[data-carlab="profilecard"]').forEach(profileLabInit);}
document.addEventListener("ds:doc",profileBoot);profileBoot();
