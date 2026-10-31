/* ADAM/PAGE — src/pitch/pitch-load.js · pitch shell: fetch fragments, version boot */
// Export map: fetch [data-pitch-docs] in order · inject · init pain filter + version switch.
// Helpers live in pitch-load-ui.js (loaded before this file); version boot below.
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
