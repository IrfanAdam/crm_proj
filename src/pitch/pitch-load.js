/* ADAM/PAGE — src/pitch/pitch-load.js · pitch shell: fetch fragments, pain filter, version switch */
/* [plan:2026-09-28_000000-lump-sum-builds.md#phase-1] · gallery-shell pattern + version toggle. */
// Export map: fetch [data-pitch-docs] in order · inject · init pain filter + version switch.
// — Section: version handling —
var PITCH_VERSIONS={v1:{label:"v1 — Original",prefix:"pitch/"},v2:{label:"v2 — Intent → Behavior",prefix:"pitch-v2/"}};
function pitchActiveVersion(){
  var q=new URLSearchParams(window.location.search).get("v");
  if(q&&PITCH_VERSIONS[q]) return q;
  try{var s=localStorage.getItem("pitch-version");if(s&&PITCH_VERSIONS[s]) return s;}catch(e){}
  return "v1";
}
var PITCH_ACTIVE=pitchActiveVersion();
function pitchSetVersion(v){
  try{localStorage.setItem("pitch-version",v);}catch(e){}
  var u=new URL(window.location);
  if(v==="v1") u.searchParams.delete("v"); else u.searchParams.set("v",v);
  window.location.href=u.toString();
}
if(PITCH_ACTIVE==="v2"){
  var heroMount=document.querySelector('[data-pitch-docs*="hero.html"]');
  if(heroMount){
    var loopMount=document.createElement("div");
    loopMount.setAttribute("data-pitch-docs","pitch/loop.html");
    loopMount.innerHTML='<p class="pitch-loading">loading thesis…</p>';
    var hr=document.createElement("hr");
    hr.className="divider";
    heroMount.insertAdjacentElement("afterend",hr);
    hr.insertAdjacentElement("afterend",loopMount);
  }
}
document.querySelectorAll("[data-pitch-docs]").forEach(function(el){
  var docs=el.dataset.pitchDocs.split(" ");
  var out=docs.map(function(d){
    if(d.indexOf("pitch/")===0) return PITCH_VERSIONS[PITCH_ACTIVE].prefix+d.slice(6);
    return d;
  });
  el.dataset.pitchDocs=out.join(" ");
});
// — Section: fetch + inject —
function pitchLoad(el){
  var docs=el.dataset.pitchDocs.split(" ");
  var jobs=docs.map(function(d){return fetch(d).then(function(r){return r.text();});});
  return Promise.all(jobs).then(function(parts){el.innerHTML=parts.join("\n");});
}
var pitchMounts=document.querySelectorAll("[data-pitch-docs]");
var pitchJobs=Array.prototype.map.call(pitchMounts,pitchLoad);
Promise.all(pitchJobs).then(function(){
  document.dispatchEvent(new Event("ds:doc"));
  initPitchFilter();
  initFramedClose();
  initPitchVersion();
});
// — Section: pain filter (binds after inject — mounts load async) —
function initPitchFilter(){
  var tags=document.querySelectorAll(".filter-tag");
  var rows=document.querySelectorAll("#pain-tbody tr");
  var cards=document.querySelectorAll("#pain-cards .pain-card");
  var countEl=document.getElementById("carousel-count");
  function updateCount(){
    var visible=document.querySelectorAll("#pain-cards .pain-card:not(.hidden)");
    if(countEl) countEl.textContent=visible.length+" of "+cards.length+" pain points";
  }
  tags.forEach(function(tag){
    tag.addEventListener("click",function(){
      var wasActive=tag.classList.contains("active");
      tags.forEach(function(t){t.classList.remove("active");});
      var f;
      if(wasActive&&tag.dataset.filter!=="all"){
        f="all";
        document.querySelector('.filter-tag[data-filter="all"]').classList.add("active");
      }else{tag.classList.add("active");f=tag.dataset.filter;}
      rows.forEach(function(row){row.style.display=(f==="all"||row.dataset.lever===f)?"":"none";});
      cards.forEach(function(card){
        if(f==="all"||card.dataset.lever===f) card.classList.remove("hidden");
        else card.classList.add("hidden");
      });
      var carousel=document.getElementById("pain-cards");
      if(carousel) carousel.scrollLeft=0;
      updateCount();
    });
  });
  updateCount();
}
function initFramedClose(){
  if(window.self===window.top) return;
  document.querySelectorAll("[data-pitch-close]").forEach(function(btn){
    btn.hidden=false;
    btn.addEventListener("click",function(){window.parent.postMessage("alphagems:close-pitch","*");});
  });
}
function initPitchVersion(){
  var sel=document.getElementById("pitch-version");
  if(!sel) return;
  function syncVersionLabels(){
    var isMobile=window.innerWidth<=760;
    Array.prototype.forEach.call(sel.options,function(o){
      o.textContent=isMobile? o.value : (PITCH_VERSIONS[o.value] ? PITCH_VERSIONS[o.value].label : o.value);
    });
    sel.value=PITCH_ACTIVE;
  }
  syncVersionLabels();
  window.addEventListener("resize",syncVersionLabels);
  sel.addEventListener("change",function(){pitchSetVersion(sel.value);});
}
