/* ADAM/PAGE — src/pitch/pitch-load-ui.js · pain filter + framed close + version switch */
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
