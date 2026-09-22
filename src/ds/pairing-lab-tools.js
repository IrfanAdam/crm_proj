/* ADAM/DS — src/ds/pairing-lab-tools.js · lab swap, copy, theme, level */
// [plan:2026-09-23_002500-design-system-consolidation.md#phase-2] · wired once by pairing-lab.js.
const pxLabTools=()=>{
  const sw=document.querySelector('[data-lab-swap]');
  if(sw&&!sw.dataset.done){
    sw.dataset.done='1';
    sw.addEventListener('click',()=>{
      if(FG_BY[labB]&&BG_BY[labF])pxLabSet(labB,labF);
    });
  }
  const cp=document.querySelector('[data-lab-copy]');
  if(cp&&!cp.dataset.done){
    cp.dataset.done='1';
    cp.addEventListener('click',()=>{
      const sn=document.querySelector('[data-lab-snippet]');
      if(sn&&navigator.clipboard)navigator.clipboard.writeText(sn.textContent);
      cp.textContent='copied';
      setTimeout(()=>{cp.textContent='copy';},1200);
    });
  }
  const th=document.querySelector('[data-lab-theme]');
  if(th&&!th.dataset.done){
    th.dataset.done='1';
    th.addEventListener('click',()=>{
      const sc=document.querySelector('[data-lab-scope]');
      const dark=sc.dataset.theme!=='dark';
      sc.dataset.theme=dark?'dark':'light';
      th.textContent=dark?'light preview':'dark preview';
      pxLabSync();
    });
  }
  const lv=document.querySelector('[data-lab-level]');
  if(lv&&!lv.dataset.done){
    lv.dataset.done='1';
    lv.addEventListener('change',()=>{
      labLevel=parseFloat(lv.value);
      pxLabSet(labF,labB);
    });
  }
};
