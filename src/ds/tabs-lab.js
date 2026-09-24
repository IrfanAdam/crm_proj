/* ADAM/DS — src/ds/tabs-lab.js · Tabs playground: roving tabindex */
function tabsLabInit(root){
  if(root.dataset.done) return; root.dataset.done="1";
  const q=s=>root.querySelector(s), qa=s=>Array.from(root.querySelectorAll(s));
  const stage=q('[data-nlab-stage]'), preview=q('[data-nlab-preview]'), code=q('[data-nlab-code]');
  const ratio=q('[data-nlab-ratio]');
  const varSel=q('[data-nlab-variant]'), s0=q('[data-nlab-l0]'), s1=q('[data-nlab-l1]'), s2=q('[data-nlab-l2]');
  const actSel=q('[data-nlab-active]'), disSel=q('[data-nlab-disabled]');
  const mark=(sel,attr,val)=>qa(sel).forEach(b=>b.classList.toggle('is-on',b.dataset[attr]===val));
  let variant="underline";
  function labels(){ return [s0.value.trim()||"Pipeline", s1.value.trim()||"Won", s2.value.trim()||"Archive"]; }
  function render(){
    const labs=labels();
    const act=parseInt(actSel.value,10)||0;
    const dis=disSel.value==="none"?-1:parseInt(disSel.value,10);
    const cls = variant==="contained"?"tabs tabs--contained":"tabs";
    let h='<div class="'+cls+'" role="tablist" aria-label="Demo">';
    labs.forEach((t,i)=>{
      const sel=i===act, d=i===dis;
      h+='<button class="tab__trigger'+(sel?' tab__trigger--active':'')+'" role="tab" aria-selected="'+sel+'" tabindex="'+(sel?0:-1)+'"'+(d?' disabled':'')+'>'+t+'</button>';
    });
    h+='</div>';
    preview.innerHTML=h;
    const pretty=h.replace(/></g,'>\n<');
    if(window.highlight){ code.innerHTML=window.highlight(pretty); code.classList.add('hl'); } else code.textContent=pretty;
    updateRatio();
  }
  function updateRatio(){
    const el=preview.querySelector('.tab__trigger--active');
    if(!el||!ratio) return;
    const cs=getComputedStyle(el);
    const m=s=>{const n=s.match(/[\d.]+/g).slice(0,3).map(Number);const l=n.map(x=>{x/=255;return x<=0.03928?x/12.92:Math.pow((x+0.055)/1.055,2.4)});return 0.2126*l[0]+0.7152*l[1]+0.0722*l[2];};
    const r=(Math.max(m(cs.color),m(cs.backgroundColor))+0.05)/(Math.min(m(cs.color),m(cs.backgroundColor))+0.05);
    let v='Fail',c='mx-bad'; if(r>=7){v='AAA';c='mx-ok';} else if(r>=4.5){v='AA';c='mx-ok';} else if(r>=3){v='AA-large';c='mx-mid';}
    ratio.textContent='Aa '+r.toFixed(2)+' · '+v; ratio.className='nlab__ratio '+c;
  }
  root.addEventListener('click',e=>{
    const v=e.target.closest('[data-nlab-variant]'); if(v){ variant=v.dataset.nlabVariant; mark('[data-nlab-variant]','nlabVariant',variant); render(); return; }
    const sf=e.target.closest('[data-nlab-surface]'); if(sf){ stage.dataset.surface=sf.dataset.nlabSurface; mark('[data-nlab-surface]','nlabSurface',stage.dataset.surface); return; }
    const sc=e.target.closest('[data-nlab-scheme]'); if(sc){ stage.dataset.theme=sc.dataset.nlabScheme; mark('[data-nlab-scheme]','nlabScheme',stage.dataset.theme); render(); return; }
    if(e.target.closest('[data-nlab-copy]')) navigator.clipboard.writeText(code.textContent);
    const t=e.target.closest('.tab__trigger'); if(t&&!t.disabled){ const idx=Array.from(preview.querySelectorAll('.tab__trigger')).indexOf(t); actSel.value=String(idx); render(); preview.querySelectorAll('.tab__trigger')[idx].focus(); }
  });
  root.addEventListener('change',render); root.addEventListener('input',render);
  // roving keys
  preview.addEventListener('keydown',e=>{
    const tabs=Array.from(preview.querySelectorAll('.tab__trigger:not([disabled])'));
    const cur=tabs.findIndex(x=>x.getAttribute('tabindex')==='0');
    let nxt=-1;
    if(e.key==='ArrowRight') nxt=(cur+1)%tabs.length;
    if(e.key==='ArrowLeft') nxt=(cur-1+tabs.length)%tabs.length;
    if(e.key==='Home') nxt=0;
    if(e.key==='End') nxt=tabs.length-1;
    if(nxt>=0){ e.preventDefault(); const all=Array.from(preview.querySelectorAll('.tab__trigger')); const target=tabs[nxt]; const idx=all.indexOf(target); actSel.value=String(idx); render(); preview.querySelectorAll('.tab__trigger')[idx].focus(); }
  });
  render();
}
function tabsLabBoot(){ document.querySelectorAll('[data-nlab="tabs"]').forEach(tabsLabInit); }
document.addEventListener('ds:doc',tabsLabBoot); tabsLabBoot();
