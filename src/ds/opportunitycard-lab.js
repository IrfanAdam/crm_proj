/* ADAM/DS — src/ds/opportunitycard-lab.js · single OpportunityCard specimen */
function oppLabInit(root){
if(root.dataset.done)return;root.dataset.done="1";
const q=s=>root.querySelector(s),qa=s=>Array.from(root.querySelectorAll(s));
const stage=q("[data-carlab-stage]"),prev=q("[data-carlab-preview]"),code=q("[data-carlab-code]"),rat=q("[data-carlab-ratio]");
const st={stage:"Negotiate"};
const mark=(s,a,v)=>qa(s).forEach(b=>b.classList.toggle("is-on",b.dataset[a]===v));
function segs(n){let h="";for(let i=0;i<5;i++)h+="<i"+(i<n?' class="on"':"")+"></i>";return h;}
function render(){
const logo=q("[data-opp-logo]").value.trim()||"NS";
const name=q("[data-opp-name]").value.trim()||"Nova Steel";
const prod=q("[data-opp-product]").value.trim()||"Pipe retrofit · Q3";
const chance=q("[data-opp-chance]").value.trim()||"65%";
const value=q("[data-opp-value]").value.trim()||"$48,200";
const segsN=parseInt(q("[data-opp-segs]").value,10)||3;
const contacts=parseInt(q("[data-opp-contacts]").value,10)||2;
const foot=q("[data-opp-foot]").value.trim()||"Updated 2h ago";
const dist=q("[data-opp-dist]").value.trim()||"1.2 km away";
let av="";for(let i=0;i<contacts;i++)av+='<span class="avatar avatar--sm">'+String.fromCharCode(65+i)+String.fromCharCode(75+i)+"</span>";
prev.innerHTML='<article class="opp-card"><div class="opp-card__head"><span class="opp-card__logo" aria-hidden="true">'+logo+'</span><div><span class="opp-card__name">'+name+'</span><span class="opp-card__product">'+prod+'</span></div></div><div class="opp-card__stage"><span class="opp-card__stage-name">'+st.stage+'</span><span class="opp-card__sep" aria-hidden="true"></span><span class="opp-card__chance">'+chance+'</span><span class="opp-card__value">'+value+'</span></div><div class="opp-card__segs" role="progressbar" aria-valuenow="'+(segsN*20)+'" aria-valuemin="0" aria-valuemax="100" aria-label="Deal progress">'+segs(segsN)+'</div><div class="opp-card__contact"><span class="opp-card__stack">'+av+'</span><span class="opp-card__meta">'+foot+'</span></div><div class="opp-card__foot"><div><span class="opp-card__meta">'+foot+'</span><span class="opp-card__dist">'+dist+'</span></div><span class="opp-card__actions"><button class="btn btn--icon-only" aria-label="Call"><i class="ph-bold ph-phone" aria-hidden="true"></i></button><button class="btn btn--icon-only" aria-label="Message"><i class="ph-bold ph-chat-centered-text" aria-hidden="true"></i></button></span></div></article>';
const snip='<article class="opp-card">\n  <div class="opp-card__head"><span class="opp-card__logo">'+logo+'</span><span class="opp-card__name">'+name+'</span></div>\n  <div class="opp-card__stage"><span class="opp-card__stage-name">'+st.stage+'</span><span class="opp-card__chance">'+chance+'</span><span class="opp-card__value">'+value+'</span></div>\n  <div class="opp-card__segs" role="progressbar" aria-valuenow="'+(segsN*20)+'">'+segsN+'/5</div>\n</article>';
if(window.highlight){code.innerHTML=window.highlight(snip);code.classList.add("hl");code.dataset.hlDone="1";}else code.textContent=snip;
if(rat)rat.textContent="Aa 5.90 AA · sapphire/red-beryl/citrine";
}
root.addEventListener("click",e=>{
const p=e.target.closest("[data-opp-stage]");if(p){st.stage=p.dataset.oppStage;mark("[data-opp-stage]","oppStage",st.stage);render();return;}
const s=e.target.closest("[data-carlab-surface]");if(s){stage.dataset.surface=s.dataset.carlabSurface;mark("[data-carlab-surface]","carlabSurface",stage.dataset.surface);return;}
const t=e.target.closest("[data-carlab-scheme]");if(t){stage.dataset.theme=t.dataset.carlabScheme;mark("[data-carlab-scheme]","carlabScheme",stage.dataset.theme);return;}
if(e.target.closest("[data-carlab-copy]"))navigator.clipboard.writeText(code.textContent);
});
root.addEventListener("input",render);root.addEventListener("change",render);render();
}
function oppBoot(){document.querySelectorAll('[data-carlab="opportunitycard"]').forEach(oppLabInit);}
document.addEventListener("ds:doc",oppBoot);oppBoot();
