import { NODES, GROUPS, EDGES, getMode, setMode as setGraphMode, bases } from './graph.js';
import { token, drawGroups, drawGrid, drawEdges, drawNodes, edgePath } from './render.js';
import { nodeTipHTML } from './popover.js';
import { clearRouteCache } from './route.js';
import { attachCanvasInteraction } from './canvas-interaction.js';
const RH=18,RG=3,HH=32,PY=4,PX=3;
export function createMechanicsCanvas(canvas, tooltip){
  const ctx=canvas.getContext('2d');
  const S={W:0,H:0,dpr:1,scale:1,ox:0,oy:0,dragGroup:null,dragNode:null,pan:null,hover:null,hoverGroup:null,selected:null,hovEdge:null,selEdge:null,downX:0,downY:0,moved:false,pending:false};
  function getBB(){ let minX=Infinity,minY=Infinity,maxX=-Infinity,maxY=-Infinity; GROUPS.forEach(g=>{minX=Math.min(minX,g.x);minY=Math.min(minY,g.y);maxX=Math.max(maxX,g.x+g.w);maxY=Math.max(maxY,g.y+g.h);}); NODES.forEach(n=>{minX=Math.min(minX,n.x);minY=Math.min(minY,n.y);maxX=Math.max(maxX,n.x+n.w);maxY=Math.max(maxY,n.y+n.h);}); return {minX,minY,w:maxX-minX,h:maxY-minY}; }
  function clampScale(v){ return Math.max(.18,Math.min(3.8,v)); }
  function fitScale(){ const b=getBB(); return clampScale(Math.min(1,(S.W-48)/b.w,(S.H-80)/b.h)); }
  function resize(){ const r=canvas.parentElement.getBoundingClientRect(); S.dpr=Math.min(window.devicePixelRatio||1,2); S.W=r.width;S.H=r.height; canvas.width=S.W*S.dpr; canvas.height=S.H*S.dpr; canvas.style.width=S.W+'px'; canvas.style.height=S.H+'px'; ctx.setTransform(S.dpr,0,0,S.dpr,0,0); if(!S.ox&&!S.oy){ S.scale=fitScale(); const b=getBB(); S.ox=(S.W-b.w*S.scale)/2-b.minX*S.scale; S.oy=(S.H-b.h*S.scale)/2-b.minY*S.scale; } draw(); }
  function world(e){ const r=canvas.getBoundingClientRect(); return {x:(e.clientX-r.left-S.ox)/S.scale,y:(e.clientY-r.top-S.oy)/S.scale}; }
  function hitNode(p){ for(let i=NODES.length-1;i>=0;i--){ const n=NODES[i]; if(p.x>=n.x-4&&p.x<=n.x+n.w+4&&p.y>=n.y-4&&p.y<=n.y+n.h+4) return n;} return null; }
  function hitGroup(p){ for(let i=GROUPS.length-1;i>=0;i--){ const g=GROUPS[i]; if(p.x>=g.x&&p.x<=g.x+g.w&&p.y>=g.y&&p.y<=g.y+32) return g;} return null; }
  function layoutGroup(g){ const list=NODES.filter(n=>n.group===g.id).sort((a,b)=>a.y-b.y); list.forEach((n,i)=>{ n.y=g.y+HH+PY+i*(RH+RG); n.x=g.x+PX; }); }
  function reorderNode(node, worldY){ const g=GROUPS.find(x=>x.id===node.group); if(!g) return; const list=NODES.filter(n=>n.group===g.id).sort((a,b)=>a.y-b.y); const cur=list.indexOf(node); if(cur<0) return; let tgt=Math.floor((worldY-g.y-HH-PY+RH/2)/(RH+RG)); tgt=Math.max(0,Math.min(list.length-1,tgt)); if(tgt===cur) return; list.splice(cur,1); list.splice(tgt,0,node); list.forEach((n,i)=>{ n.y=g.y+HH+PY+i*(RH+RG); n.x=g.x+PX; }); clearRouteCache(); }
  function draw(){ if(S.pending) return; S.pending=true; requestAnimationFrame(()=>{ S.pending=false; ctx.clearRect(0,0,S.W,S.H); ctx.fillStyle=token('--stone-100'); ctx.fillRect(0,0,S.W,S.H); ctx.save(); ctx.translate(S.ox,S.oy); ctx.scale(S.scale,S.scale); drawGroups(ctx,S.scale,S.hoverGroup,S.selected); drawGrid(ctx,S.ox,S.oy,S.scale,S.W,S.H); drawEdges(ctx,S.scale,S.hover,S.selected,S.hovEdge,S.selEdge); drawNodes(ctx,S.scale,S.hover,S.selected,S.selEdge); ctx.restore(); }); }
  function tip(n){ if(!n){ tooltip.hidden=true; return;} tooltip.hidden=false; tooltip.innerHTML=nodeTipHTML(n,undefined); let x=(n.x*S.scale+S.ox)+n.w*S.scale+10, y=(n.y*S.scale+S.oy); const tw=280; if(x+tw>S.W-12) x=(n.x*S.scale+S.ox)-tw-10; if(y+110>S.H-12) y=S.H-122; if(y<8) y=8; if(x<8) x=8; tooltip.style.left=x+'px'; tooltip.style.top=y+'px'; }
  function distSeg(p,a,b){ const dx=b.x-a.x,dy=b.y-a.y,L=dx*dx+dy*dy; let t=L?((p.x-a.x)*dx+(p.y-a.y)*dy)/L:0; t=Math.max(0,Math.min(1,t)); return Math.hypot(p.x-(a.x+t*dx),p.y-(a.y+t*dy)); }
  function hitEdge(p){ const tol=Math.max(5/S.scale,1.6); let best=null,bd=tol; for(const e of EDGES){ const r=edgePath(e); if(!r) continue; const pts=r.path; for(let i=0;i<pts.length-1;i++){ const d=distSeg(p,pts[i],pts[i+1]); if(d<bd){ bd=d; best=e; } } } return best; }
  function tipEdge(e){ const a=NODES.find(n=>n.id===e.from), b=NODES.find(n=>n.id===e.to); if(!a||!b){ tooltip.hidden=true; return;} tooltip.hidden=false; tooltip.innerHTML=`<strong>${a.label} → ${b.label}</strong><span style="margin-top:var(--space-2)">${e.label||e.kind}</span><em>${e.kind} · ${a.file} → ${b.file}</em>`; const r=edgePath(e); const mid=r?r.path[Math.floor(r.path.length/2)]:{x:(a.x+b.x)/2,y:(a.y+b.y)/2}; let x=(mid.x*S.scale+S.ox)+12, y=(mid.y*S.scale+S.oy)-20; const tw=280; if(x+tw>S.W-12) x=(mid.x*S.scale+S.ox)-tw-12; if(y+110>S.H-12) y=S.H-122; if(y<8) y=8; if(x<8) x=8; tooltip.style.left=x+'px'; tooltip.style.top=y+'px'; }
  function setMode(next){ if(!['decisions','schema','logic'].includes(next)) return; if(getMode()===next) return; setGraphMode(next); clearRouteCache(); S.selected=null; S.selEdge=null; S.hover=null; S.hovEdge=null; S.hoverGroup=null; tooltip.hidden=true; if(S.W&&S.H){ S.scale=fitScale(); const b=getBB(); S.ox=(S.W-b.w*S.scale)/2-b.minX*S.scale; S.oy=(S.H-b.h*S.scale)/2-b.minY*S.scale; } draw(); }
  function select(id){ const n=NODES.find(x=>x.id===id)||null; S.selected=n; S.selEdge=null; if(n) tip(n); else tooltip.hidden=true; draw(); }
  function clearSelection(){ S.selected=null; S.selEdge=null; tooltip.hidden=true; draw(); }
  function getSelected(){ return S.selected?.id||null; }
  // a11y: focusable + keyboard arrow nav via atlas-state (canvas owns order, dispatches select)
  canvas.tabIndex=0; canvas.setAttribute('role','img');
  canvas.addEventListener('keydown',e=>{
    if(e.target!==canvas) return;
    const keys=['ArrowRight','ArrowDown','ArrowLeft','ArrowUp','Enter'];
    if(!keys.includes(e.key)) return;
    if(e.key==='Enter'){ const el=document.getElementById('atlas-sel'); if(el) el.focus?.()||el.scrollIntoView({behavior:'smooth',block:'nearest'}); if(S.selected) tip(S.selected); e.preventDefault(); return; }
    if(!NODES.length) return;
    e.preventDefault();
    let idx=S.selected? NODES.findIndex(n=>n.id===S.selected.id):-1;
    if(e.key==='ArrowRight'||e.key==='ArrowDown') idx=(idx+1)%NODES.length;
    else idx=(idx-1+NODES.length)%NODES.length;
    const next=NODES[idx]; if(!next) return;
    S.selected=next; S.selEdge=null; tip(next); draw();
    try{ canvas.dispatchEvent(new CustomEvent('mechanics:select',{detail:{id:next.id}})); }catch{}
  });
  attachCanvasInteraction({canvas,tooltip,S,getBB,world,hitNode,hitGroup,layoutGroup,reorderNode,draw,tip,tipEdge,hitEdge,setMode});
  window.addEventListener('resize',resize); resize();
  return { resize, draw, setMode, getMode, select, clearSelection, getSelected };
}
