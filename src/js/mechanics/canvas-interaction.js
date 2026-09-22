import { getMode, bases } from './graph.js';
import { clearRouteCache } from './route.js';
import { NODES } from './graph.js';
export function attachCanvasInteraction(o){
  const {canvas,tooltip,S,getBB,world,hitNode,hitGroup,layoutGroup,reorderNode,draw,tip,tipEdge,hitEdge}=o;
  const fallback={
    decisions:{product:{x:18,y:16},system:{x:162,y:16},architecture:{x:162,y:244},constraints:{x:322,y:16}},
    schema:{entities:{x:18,y:130},fields:{x:162,y:16},categories:{x:162,y:244},flows:{x:322,y:16}},
    logic:{machines:{x:18,y:16},states:{x:162,y:16},rules:{x:162,y:244},temporal:{x:322,y:16}}
  };
  const getBases=()=>bases||fallback;
  canvas.addEventListener('pointermove',e=>{
    // stuck-drag guard: hover (no button held) must never pan/reorder —
    // a missed pointerup/pointercancel leaves S.pan set with no capture
    if(!e.buttons&&(S.dragGroup||S.dragNode||S.pan)){ S.dragGroup=null; S.dragNode=null; S.pan=null; }
    const p=world(e);
    if(S.dragGroup){ S.moved=true; const dx=p.x-S.dragGroup.offX, dy=p.y-S.dragGroup.offY; S.dragGroup.g.x=S.dragGroup.sx+dx; S.dragGroup.g.y=S.dragGroup.sy+dy; S.dragGroup.members.forEach(m=>{m.n.x=m.sx+dx; m.n.y=m.sy+dy;}); clearRouteCache(); draw(); return; }
    if(S.dragNode){ S.moved=true; reorderNode(S.dragNode,p.y); draw(); tip(S.dragNode); return; }
    if(S.pan){ if(Math.hypot(e.clientX-S.downX,e.clientY-S.downY)>5) S.moved=true; S.ox=e.clientX-S.pan.sx; S.oy=e.clientY-S.pan.sy; draw(); return; }
    const hg=hitGroup(p), h=hitNode(p); const he=h?null:hitEdge(p);
    const hgChanged=hg!==S.hoverGroup; S.hoverGroup=hg;
    if(h!==S.hover||he!==S.hovEdge||hgChanged){ S.hover=h; S.hovEdge=he; canvas.style.cursor=hg?'grab':h?'ns-resize':he?'pointer':'grab'; draw(); }
    if(h) tip(h); else if(he) tipEdge(he); else tooltip.hidden=true;
  });
  canvas.addEventListener('pointerdown',e=>{
    S.downX=e.clientX; S.downY=e.clientY; S.moved=false;
    try{ canvas.focus({preventScroll:true}); }catch{ try{canvas.focus();}catch{} }
    const p=world(e), hg=hitGroup(p);
    if(hg){ S.selected=null; S.selEdge=null; const members=NODES.filter(n=>n.group===hg.id).map(n=>({n,sx:n.x,sy:n.y})); S.dragGroup={g:hg,sx:hg.x,sy:hg.y,offX:p.x,offY:p.y,members}; try{canvas.setPointerCapture(e.pointerId);}catch{} draw(); return; }
    const h=hitNode(p);
    if(h){ S.selected=h; S.selEdge=null; S.dragNode=h; try{canvas.setPointerCapture(e.pointerId);}catch{} draw(); tip(h); try{ canvas.dispatchEvent(new CustomEvent('mechanics:select',{detail:{id:h.id}})); }catch{} return; }
    S.pan={sx:e.clientX-S.ox,sy:e.clientY-S.oy}; try{canvas.setPointerCapture(e.pointerId);}catch{}
  });
  canvas.addEventListener('pointerup',e=>{
    if(S.dragGroup&&S.dragGroup.g){ const movedGrp=Math.hypot(S.dragGroup.g.x-S.dragGroup.sx,S.dragGroup.g.y-S.dragGroup.sy); if(movedGrp<2){ S.selected=null; S.selEdge=null; } }
    S.dragNode=null; S.dragGroup=null; S.pan=null; try{canvas.releasePointerCapture(e.pointerId);}catch{} draw();
  });
  // missed-release cleanup: trackpad gestures fire pointercancel, capture loss
  // orphans drag state — without this every later hover keeps panning
  function clearDrag(){ S.dragNode=null; S.dragGroup=null; S.pan=null; }
  canvas.addEventListener('pointercancel',()=>{ clearDrag(); draw(); });
  canvas.addEventListener('dblclick',e=>{
    const p=world(e), hg=hitGroup(p); if(!hg) return;
    const mode=getMode(); const b=getBases()[mode]||{}; const base=b[hg.id]; if(!base) return;
    hg.x=base.x; hg.y=base.y; layoutGroup(hg); clearRouteCache(); draw();
  });
  canvas.addEventListener('wheel',e=>{
    e.preventDefault(); const r=canvas.getBoundingClientRect(), mx=e.clientX-r.left, my=e.clientY-r.top;
    const k=e.deltaY>0?0.92:1.08, ns=Math.max(.18,Math.min(3.8,S.scale*k));
    S.ox=mx-(mx-S.ox)*(ns/S.scale); S.oy=my-(my-S.oy)*(ns/S.scale); S.scale=ns; draw();
    const p=world(e), h=hitNode(p); if(h||S.hover) tip(h||S.hover);
  },{passive:false});
  canvas.addEventListener('click',e=>{
    const p=world(e); if(hitGroup(p)) return;
    const h=hitNode(p); if(h){ S.selected=h; S.selEdge=null; S.hovEdge=null; draw(); tip(h); try{ canvas.dispatchEvent(new CustomEvent('mechanics:select',{detail:{id:h.id}})); }catch{} }
    else { const he=hitEdge(p); if(he&&!S.moved){ S.selEdge=he; S.selected=null; draw(); tipEdge(he); } else if(!S.pan&&!S.dragNode&&!S.dragGroup){ S.selected=null; S.selEdge=null; draw(); tooltip.hidden=true; try{ canvas.dispatchEvent(new CustomEvent('mechanics:select',{detail:{id:null}})); }catch{} } }
    S.moved=false;
  });
  canvas.addEventListener('pointerleave',()=>{ S.hover=null; S.hoverGroup=null; S.hovEdge=null; tooltip.hidden=true; draw(); });
}
