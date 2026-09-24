/* ADAM/SHARED — src/arch/atlas.js · mechanics shell [plan:2026-09-22_155000-architecture-mechanics.md#phase-4] */
import { createAtlasState } from './atlas-state.js';
import { ensureTruthEl } from './lens-truth.js';
import { getMode, setMode as setGraphMode, GRAPHS } from '../js/mechanics/graph.js';
const GRAPH = ['decisions', 'schema', 'logic'];
const state=createAtlasState();
let engine=null,loaded=false;
function tintDot(tint){
  if(tint==='--violet-50') return 'var(--violet-600)';
  if(tint==='--amber-50') return 'var(--amber-600)';
  if(tint==='--stone-100') return 'var(--stone-500)';
  if(tint==='--emerald-50') return 'var(--emerald-700)';
  if(tint==='--color-card') return 'var(--stone-500)';
  return 'var(--stone-500)';
}
function edgeDot(kind){
  if(kind==='signal') return 'var(--amber-600)';
  if(kind==='data'||kind==='governs') return 'var(--violet-600)';
  return 'var(--stone-500)';
}
function syncModeUI(m){
  const cur=m||state.lens||getMode();
  const s=document.getElementById('mechanics-mode'); if(s) s.value=GRAPH.includes(cur)?cur:getMode();
  document.querySelectorAll('#atlas-nav [data-lens]').forEach(b=>b.setAttribute('aria-selected',String(b.dataset.lens===cur)));
  // per-lens float legends: Lanes (group tints) + Kinds (node kinds) + Edges (kind semantics)
  const legendsWrap=document.querySelector('.mechanics-float-legends');
  if(legendsWrap){
    const g=(GRAPHS&&GRAPHS[cur])?GRAPHS[cur]:null;
    const groups=g? g.GROUPS: [];
    const kinds=g? g.KINDS: null;
    const lanesHTML=groups.map(gd=>`<span class="mech-pill mech-pill--lane" style="background:var(${gd.tint})"><i style="background:${tintDot(gd.tint)}"></i> ${gd.label}</span>`).join('');
    let kindsHTML='';
    if(kinds){
      kindsHTML=Object.entries(kinds).map(([k,v])=>`<span class="mech-pill mech-pill--edge-legend"><i style="background:var(${v.color})"></i> ${v.label}</span>`).join('');
    }
    let edgesHTML='';
    if(cur==='logic'){
      edgesHTML=`<span class="mech-pill"><i style="background:${edgeDot('data')}"></i> governs</span><span class="mech-pill"><i style="background:${edgeDot('signal')};transform:rotate(45deg);border-radius:1px"></i> signal</span>`;
    } else if(cur==='schema'){
      edgesHTML=`<span class="mech-pill"><i style="background:${edgeDot('call')}"></i> contains</span><span class="mech-pill"><i style="background:${edgeDot('data')}"></i> governs</span><span class="mech-pill"><i style="background:${edgeDot('signal')};transform:rotate(45deg);border-radius:1px"></i> signal</span>`;
    } else {
      edgesHTML=`<span class="mech-pill"><i style="background:${edgeDot('data')}"></i> governs</span><span class="mech-pill"><i style="background:${edgeDot('call')}"></i> contains</span>`;
    }
    legendsWrap.innerHTML=`<div class="mechanics-legend mechanics-legend--float" aria-label="Lane legend"><span class="mech-legend-label">Lanes</span>${lanesHTML}</div><div class="mechanics-legend mechanics-legend--float" aria-label="Kind legend"><span class="mech-legend-label">Kinds</span>${kindsHTML}</div><div class="mechanics-legend mechanics-legend--float" aria-label="Edge legend"><span class="mech-legend-label">Edges</span>${edgesHTML}</div>`;
  }
}
function toggleChrome(){
  const h=document.getElementById('atlas-canvas'),b=document.getElementById('mechanics-chrome-toggle');
  if(!h) return; const c=h.classList.toggle('mechanics-view--clean');
  if(b){b.setAttribute('aria-pressed',String(c)); b.textContent=c?'◳ Show':'◱ Hide';}
  if(engine) engine.resize();
}
function paintLens(){
  const lens=state.lens, isTruth=lens==='truth';
  const c=document.getElementById('mechanics-canvas'), t=ensureTruthEl();
  const fc=document.querySelector('.mechanics-float-controls'), fl=document.querySelector('.mechanics-float-legends'), tip=document.getElementById('mechanics-tooltip');
  if(c) c.hidden=isTruth; if(t) t.hidden=!isTruth;
  if(fc) fc.hidden=isTruth; if(fl) fl.hidden=isTruth; if(tip&&isTruth) tip.hidden=true;
  if(!isTruth&&engine&&engine.getMode()!==lens) engine.setMode(lens);
  syncModeUI(lens);
}
async function ensureEngine(){
  if(loaded&&engine) return engine;
  const c=document.getElementById('mechanics-canvas'),t=document.getElementById('mechanics-tooltip');
  if(!c||!t||c.tagName!=='CANVAS') return null;
  const {createMechanicsCanvas}=await import('../js/mechanics/canvas.js');
  engine=createMechanicsCanvas(c,t); loaded=true;
  c.addEventListener('mechanics:select',e=>{ const id=e.detail?.id; if(id) state.select(id); else state.clear(); });
  const cur=state.lens||getMode(); if(cur!==getMode()) setGraphMode(cur);
  if(state.selected) engine.select(state.selected);
  paintLens(); return engine;
}
export function initAtlas(){
  const nav=document.getElementById('atlas-nav'),canvas=document.getElementById('mechanics-canvas');
  if(!nav||!canvas) return null;
  const sel=document.getElementById('mechanics-mode'),tog=document.getElementById('mechanics-chrome-toggle');
  paintLens();
  if(sel){ sel.value=state.lens; sel.addEventListener('change',async e=>{ const n=e.target.value; if(!GRAPH.includes(n))return; state.setLens(n); if(!loaded) await ensureEngine(); paintLens(); });}
  if(tog) tog.addEventListener('click',toggleChrome);
  document.addEventListener('keydown',e=>{
    if(e.target&&(e.target.tagName==='INPUT'||e.target.tagName==='TEXTAREA'||e.target.tagName==='SELECT')) return;
    if((e.key==='h'||e.key==='H')&&!e.metaKey&&!e.ctrlKey){ e.preventDefault(); toggleChrome(); }
    if(e.key==='Escape'){ if(state.selected){ state.clear(); if(engine) engine.clearSelection(); } const tip=document.getElementById('mechanics-tooltip'); if(tip) tip.hidden=true; }
  });
  nav.addEventListener('click',async e=>{ const b=e.target.closest('[data-lens]'); if(!b) return; const n=b.dataset.lens; if(n!=='truth'&&!GRAPH.includes(n)) return; state.setLens(n); if(!loaded) await ensureEngine(); paintLens(); });
  state.subscribe(()=>{ paintLens(); if(engine&&state.lens!=='truth'){ const s=state.selected; if(s) engine.select(s); else engine.clearSelection(); } });
  document.addEventListener('mechanics:mode',()=>syncModeUI(state.lens));
  return {get engine(){return engine;},ensureEngine,syncModeUI,state};
}
if(typeof document!=='undefined'&&document.getElementById('atlas-nav')) initAtlas();
