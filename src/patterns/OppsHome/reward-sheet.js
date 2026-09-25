/* ADAM/PAGE — reward-sheet.js · peak bar → gem reward sheet (serialised) */
import { PEAK } from "../ActivityStrip/activity-strip.js";
import { relRect } from "./nearby-map.js";
import { morph } from "./sheet-morph.js";
let openFn=null,tGem=0,tText=0;
export function openReward(){ if(openFn) openFn(); }
export function rewardSheetHTML(){
  return `<div class="reward-sheet" id="reward-sheet" hidden>`
    + `<div class="reward-sheet__scrim" data-close></div>`
    + `<section class="reward-sheet__panel" role="dialog" aria-modal="true" aria-label="Goal reward">`
    + `<div class="reward-sheet__win" id="reward-win"><div class="reward-sheet__layer" id="reward-layer">`
    + `<article class="gem-reward gem-reward--sapphire"><div class="gem-stage"><canvas class="gem-reward__spline gem-screen__canvas" data-gem="sapphire" role="img" aria-label="Sapphire goal gem"></canvas></div>`
    + `<div class="gem-reward__text" id="reward-text"><span class="gem-reward__title">Rock Solid Goals</span><span class="gem-reward__capsule">+Rs 4lakh · Beyond Target</span><p class="gem-reward__copy">Highest day so far — the goal bar, fullscreen.</p></div>`
    + `<div class="reward-sheet__skeleton" id="reward-skeleton" aria-hidden="true"><span class="reward-sheet__skeleton-bar" style="width:58%"></span><span class="reward-sheet__skeleton-bar reward-sheet__skeleton-bar--capsule" style="width:42%"></span><span class="reward-sheet__skeleton-bar reward-sheet__skeleton-bar--copy" style="width:74%"></span></div></article>`
    + `</div></div><button class="reward-sheet__close" id="reward-close" type="button" aria-label="Close reward">✕</button>`
    + `<div class="reward-sheet__card"><span class="reward-sheet__handle"></span><div class="reward-sheet__head"><span><b>New milestone</b><i>Highest activity day · tap ✕ to return</i></span></div></div></section></div>`;
}
function parts(){
  const s=document.getElementById("reward-sheet");
  return {sheet:s,screen:document.querySelector(".device__screen"),win:s.querySelector(".reward-sheet__win"),layer:s.querySelector("#reward-layer"),scrim:s.querySelector(".reward-sheet__scrim"),card:s.querySelector(".reward-sheet__card"),x:s.querySelector("#reward-close")};
}
function fromState(){
  const b=document.querySelector(".activity-strip")?.children[PEAK],screen=document.querySelector(".device__screen"),m=relRect(b,screen),cs=getComputedStyle(b.querySelector("i"));
  return {screen,rect:{l:m.l,t:m.t,w:m.w,h:m.h,r:parseFloat(cs.borderTopLeftRadius)||0}};
}
function open(){
  const p=parts(); if(!p.sheet||!p.sheet.hidden) return;
  const feed=document.getElementById("app-content"),{screen,rect}=fromState();
  p.sheet.hidden=false; p.sheet.classList.remove("is-gem-in","is-text-in"); void p.sheet.offsetWidth;
  if(feed) feed.style.overflow="hidden";
  const reduced=matchMedia("(prefers-reduced-motion: reduce)").matches, cv=p.layer.querySelector("canvas[data-gem]");
  if(cv&&window.GEM3D&&!cv.dataset.gemDone) cv.dispatchEvent(new Event("reward:open",{bubbles:true}));
  clearTimeout(tGem); clearTimeout(tText);
  if(reduced) p.sheet.classList.add("is-gem-in","is-text-in");
  else{ tGem=setTimeout(()=>p.sheet.classList.add("is-gem-in"),140); tText=setTimeout(()=>p.sheet.classList.add("is-text-in"),420); }
  morph(p,rect,1,()=>{p.x.focus({preventScroll:true}); if(cv) cv.dispatchEvent(new Event("reward:shown",{bubbles:true}));},reduced);
}
function close(){
  const p=parts(); if(!p.sheet||p.sheet.hidden) return;
  const feed=document.getElementById("app-content"),{screen,rect}=fromState(),reduced=matchMedia("(prefers-reduced-motion: reduce)").matches;
  clearTimeout(tGem); clearTimeout(tText);
  if(!reduced){ p.sheet.classList.remove("is-text-in"); setTimeout(()=>p.sheet.classList.remove("is-gem-in"),120); }
  else p.sheet.classList.remove("is-gem-in","is-text-in");
  const done=()=>{p.sheet.hidden=true; p.sheet.classList.remove("is-gem-in","is-text-in"); if(feed) feed.style.overflow=""; document.querySelector(".activity-strip")?.children[PEAK]?.focus({preventScroll:true});};
  morph(p,rect,-1,done,reduced);
}
export function initRewardSheet(root){
  let host=document.getElementById("reward-sheet-host");
  if(!host){ host=document.createElement("div"); host.id="reward-sheet-host"; document.querySelector(".device__screen")?.appendChild(host); }
  if(!host.innerHTML) host.innerHTML=rewardSheetHTML();
  const sheet=document.getElementById("reward-sheet"); openFn=open;
  if(!sheet.dataset.wired){ sheet.dataset.wired="1"; sheet.querySelector("#reward-close")?.addEventListener("click",close); sheet.querySelector("[data-close]")?.addEventListener("click",close); sheet.addEventListener("keydown",e=>{if(e.key==="Escape") close();}); }
  const bar=root.querySelector(".activity-strip")?.children[PEAK];
  if(bar&&!bar.dataset.rewardWired){ bar.dataset.rewardWired="1"; bar.setAttribute("role","button"); bar.setAttribute("tabindex","0"); bar.setAttribute("aria-label","Open goal reward"); bar.addEventListener("click",open); bar.addEventListener("keydown",e=>{if(e.key==="Enter"||e.key===" ") {e.preventDefault(); open();}}); }
}
