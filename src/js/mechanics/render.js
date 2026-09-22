import { NODES, EDGES, KINDS, GROUPS } from './graph.js';
import { fitTextSubtle, subtleFont } from './text.js';
import { getRoute } from './route.js';
import { token } from './tokens.js';
export function kindColor(k){ return token(KINDS[k]?.color || '--stone-500'); }
function isReduced(){ try{ return window.matchMedia('(prefers-reduced-motion: reduce)').matches; }catch{ return false; } }
let _nodeMap=null, _nodesRef=null;
function getNode(id){
  if(_nodesRef!==NODES){
    _nodeMap=new Map(NODES.map(n=>[n.id,n]));
    _nodesRef=NODES;
  }
  return _nodeMap.get(id);
}
export function drawRound(c,x,y,w,h,r){ c.beginPath();c.moveTo(x+r,y);c.arcTo(x+w,y,x+w,y+h,r);c.arcTo(x+w,y+h,x,y+h,r);c.arcTo(x,y+h,x,y,r);c.arcTo(x,y,x+w,y,r);c.closePath(); }

const EDGE_STYLES={ call:{color:'--stone-500',dash:[],w:1.25,head:'tri'}, data:{color:'--violet-600',dash:[],w:1.25,head:'tri'}, signal:{color:'--amber-600',dash:[7,5],w:1.25,head:'diamond'} };
// product edge aliases: contains→call (stone tri), governs/composes/depends→data (violet tri)
EDGE_STYLES.contains=EDGE_STYLES.call; EDGE_STYLES.composes=EDGE_STYLES.data; EDGE_STYLES.governs=EDGE_STYLES.data; EDGE_STYLES.depends=EDGE_STYLES.data;
function drawHead(ctx,head,s,color){ const sc=s;
  function halo(path){ ctx.save(); ctx.fillStyle=token('--color-card'); ctx.strokeStyle=token('--color-card'); ctx.lineWidth=2.2/sc; ctx.lineJoin='round'; ctx.lineCap='round'; path(true); ctx.fill(); ctx.stroke(); ctx.restore(); }
  if(head==='tri'){ halo(d=>{ctx.beginPath();ctx.moveTo(0.7,0);ctx.lineTo(-6.2/sc,-2.9/sc);ctx.lineTo(-6.2/sc,2.9/sc);ctx.closePath();}); ctx.fillStyle=color; ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(-5.5/sc,-2.5/sc);ctx.lineTo(-5.5/sc,2.5/sc);ctx.closePath();ctx.fill(); }
  else if(head==='diamond'){ halo(d=>{ctx.beginPath();ctx.moveTo(0.7,0);ctx.lineTo(-3.2/sc,-2.9/sc);ctx.lineTo(-6.4/sc,0);ctx.lineTo(-3.2/sc,2.9/sc);ctx.closePath();}); ctx.fillStyle=color; ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(-2.8/sc,-2.5/sc);ctx.lineTo(-5.6/sc,0);ctx.lineTo(-2.8/sc,2.5/sc);ctx.closePath();ctx.fill(); }
}

export function drawGroups(ctx,scale,hoverGroup,selected){
  const inc=new Set(); if(selected){ EDGES.forEach(e=>{ if(e.from===selected.id||e.to===selected.id){ inc.add(e.from); inc.add(e.to); }}); const sg=NODES.find(n=>n.id===selected.id)?.group; if(sg) inc.add(sg); }
  const reduced=isReduced();
  GROUPS.forEach(g=>{
    const dim=selected && !inc.has(g.id) && !NODES.some(n=>n.group===g.id && inc.has(n.id));
    const hg=hoverGroup===g&&!reduced;
    ctx.save();
    if(dim) ctx.globalAlpha=.48;
    ctx.shadowColor=hg?token('--color-overlay-soft'):token('--color-transparent'); ctx.shadowBlur=hg?14:0; ctx.shadowOffsetY=hg?2:0;
    drawRound(ctx,g.x,g.y,g.w,g.h,12); ctx.fillStyle=token('--color-card'); ctx.fill();
    ctx.shadowColor=token('--color-transparent');
    if(hg){
      ctx.strokeStyle=token('--stone-300'); ctx.lineWidth=1.25/scale; ctx.setLineDash([]); ctx.stroke();
      ctx.fillStyle=token('--amber-50'); ctx.globalAlpha=.34; drawRound(ctx,g.x,g.y,g.w,g.h,12); ctx.fill(); ctx.globalAlpha=dim?.48:1;
    } else {
      ctx.strokeStyle=token('--color-overlay-light'); ctx.lineWidth=1/scale; ctx.setLineDash([6/scale,6/scale]); ctx.stroke(); ctx.setLineDash([]);
    }
    const tintCol=token(g.tint);
    ctx.globalAlpha=dim?.52:1;
    ctx.fillStyle=tintCol; ctx.globalAlpha=hg? .52 : dim? .22 : .28;
    drawRound(ctx,g.x,g.y,g.w,32,12); ctx.fill();
    ctx.beginPath(); ctx.rect(g.x,g.y+20,g.w,12); ctx.fill();
    ctx.globalAlpha=1;
    ctx.strokeStyle=hg?token('--stone-200'): token('--color-transparent'); ctx.lineWidth=1/scale; ctx.beginPath(); ctx.moveTo(g.x,g.y+32); ctx.lineTo(g.x+g.w,g.y+32); ctx.stroke();
    // subtle scaling: p=0.38 — header grows slightly on zoom, never tiny when zoomed out
    const hl = subtleFont(11, scale, 0.38);
    const hs = subtleFont(8, scale, 0.38);
    ctx.fillStyle=hg?token('--stone-900'):token('--stone-800'); ctx.font=`700 ${hl}px ${token('--font-display')}`; ctx.fillText(g.label,g.x+11,g.y+16);
    ctx.fillStyle=token('--stone-500'); ctx.font=`500 ${hs}px ${token('--font-body')}`; ctx.fillText(g.sub,g.x+11,g.y+26);
    ctx.strokeStyle=token('--stone-100'); ctx.lineWidth=1/scale; ctx.globalAlpha=.9;
    ctx.restore();
  });
}
export function drawGrid(ctx,ox,oy,scale,W,H){ ctx.strokeStyle=token('--stone-200'); ctx.globalAlpha=.30; ctx.lineWidth=1/scale; const s=40,minX=-ox/scale,minY=-oy/scale; ctx.beginPath();
  for(let x=Math.floor(minX/s)*s;x<minX+W/scale;x+=s){ ctx.moveTo(x,minY);ctx.lineTo(x,minY+H/scale); }
  for(let y=Math.floor(minY/s)*s;y<minY+H/scale;y+=s){ ctx.moveTo(minX,y);ctx.lineTo(minX+W/scale,y); } ctx.stroke(); ctx.globalAlpha=1; }

function clamp(v,lo,hi){ return Math.max(lo,Math.min(hi,v)); }

function anchor(from,to){
  const fx=from.x+from.w/2,fy=from.y+from.h/2,tx=to.x+to.w/2,ty=to.y+to.h/2,dx=tx-fx;
  if(Math.abs(dx) > 2){
    if(dx>0) return {x:from.x+from.w,y:clamp(fy,from.y+4,from.y+from.h-4),nx:1,ny:0};
    return {x:from.x,y:clamp(fy,from.y+4,from.y+from.h-4),nx:-1,ny:0};
  }
  if(fy<ty) return {x:from.x+from.w,y:clamp(fy,from.y+4,from.y+from.h-4),nx:1,ny:0};
  return {x:from.x+from.w,y:clamp(fy,from.y+4,from.y+from.h-4),nx:1,ny:0}; }

// Single source for an edge's rendered geometry — draw + hit-test share it.
export function edgePath(e){
  const a=getNode(e.from), b=getNode(e.to); if(!a||!b) return null;
  const A=anchor(a,b), B=anchor(b,a);
  return getRoute(a,b,A.x,A.y,B.x,B.y,A,B);
}

export function drawEdges(ctx,scale,hover,selected,hovEdge,selEdge){
  const reduced=isReduced();
  const sorted=[...EDGES].sort((a,b)=>{
    const na=getNode(a.from), nb=getNode(a.to);
    const ca=getNode(b.from), cb=getNode(b.to);
    if(!na||!nb||!ca||!cb) return 0;
    const da=Math.hypot((nb.x-nb.w)-(na.x+na.w),(nb.y-na.y));
    const db=Math.hypot((cb.x-cb.w)-(ca.x+ca.w),(cb.y-ca.y));
    return db-da;
  });
  sorted.forEach(e=>{
    const a=getNode(e.from),b=getNode(e.to); if(!a||!b) return;
    const sel=e===selEdge||(selected&&(e.from===selected.id||e.to===selected.id)), hov=e===hovEdge||(hover&&(e.from===hover.id||e.to===hover.id));
    const staleInc=!!(a.stale||b.stale);
    const r=edgePath(e); if(!r) return; const path=r.path;
    const st=EDGE_STYLES[e.kind]||EDGE_STYLES.call;
    const ang=r.ang;
    const isDim=(selected||selEdge) && !sel;
    const alpha = staleInc ? .52 : isDim ? .20 : sel ? 1 : hov ? .95 : .72;
    const lw = sel ? 2.1/scale : hov ? 1.65/scale : st.w/scale;
    const haloW = lw + 3.6/scale;
    let minSeg = Infinity;
    for (let i = 0; i < path.length - 1; i++) minSeg = Math.min(minSeg, Math.hypot(path[i+1].x - path[i].x, path[i+1].y - path[i].y));
    const rad = Math.max(2/scale, Math.min(9/scale, minSeg/2.4));
    ctx.save(); ctx.globalAlpha=staleInc? .32 : isDim? .18 : .95; ctx.strokeStyle=token('--color-card'); ctx.lineWidth=haloW; ctx.lineJoin='round'; ctx.lineCap='round'; ctx.setLineDash([]); ctx.beginPath(); ctx.moveTo(path[0].x,path[0].y);
    for(let i=1;i<path.length-1;i++) ctx.arcTo(path[i].x,path[i].y,path[i+1].x,path[i+1].y,rad);
    ctx.lineTo(r.bx,r.by); ctx.stroke(); ctx.restore();
    const strokeCol = sel?token('--stone-900'): hov?token('--stone-700'):token(st.color);
    ctx.save(); ctx.globalAlpha=alpha; ctx.beginPath(); ctx.moveTo(path[0].x,path[0].y);
    for(let i=1;i<path.length-1;i++) ctx.arcTo(path[i].x,path[i].y,path[i+1].x,path[i+1].y,rad);
    ctx.lineTo(r.bx,r.by);
    ctx.strokeStyle=strokeCol;
    ctx.lineWidth=lw; ctx.lineJoin='round'; ctx.lineCap='round'; ctx.setLineDash(reduced?[]:st.dash.length?st.dash.map(v=>v/scale):[]); ctx.stroke(); ctx.setLineDash([]); ctx.restore();
    ctx.save(); ctx.globalAlpha=1; ctx.translate(r.bx,r.by); ctx.rotate(ang); drawHead(ctx,st.head,scale,strokeCol); ctx.restore();
    // data/both: one path, head at each end (tail head points outward, same strokeCol, full opacity)
    if(e.kind==='data' && e.access==='both' && path.length>1){
      const tailAng=Math.atan2(path[0].y-path[1].y, path[0].x-path[1].x);
      ctx.save(); ctx.globalAlpha=staleInc ? .52 : 1; ctx.translate(path[0].x,path[0].y); ctx.rotate(tailAng); drawHead(ctx,st.head,scale,strokeCol); ctx.restore();
    }
    const srcKind=getNode(e.from)?.kind; const dotCol=kindColor(srcKind||'game');
    ctx.save(); ctx.globalAlpha=staleInc? .52 : isDim? .24 : sel||hov ? 1 : .88;
    ctx.beginPath(); ctx.arc(path[0].x,path[0].y,3.8/scale,0,Math.PI*2); ctx.fillStyle=sel?token('--stone-900'):hov?token('--stone-700'):dotCol; ctx.fill(); ctx.strokeStyle=token('--color-card'); ctx.lineWidth=1.7/scale; ctx.stroke();
    if(!sel){ ctx.beginPath(); ctx.arc(path[0].x,path[0].y,1.35/scale,0,Math.PI*2); ctx.fillStyle=token('--color-card'); ctx.globalAlpha=.96; ctx.fill(); }
    ctx.restore();
    const dist=Math.hypot(r.bx-path[0].x,r.by-path[0].y);
    const showLabel=e.label && (sel||hov) && dist*scale>34;
    if(showLabel){
      const mid=path[Math.floor(path.length/2)], prev=path[Math.floor(path.length/2)-1]||mid; const lx=(mid.x+prev.x)/2+4/scale, ly=(mid.y+prev.y)/2-5/scale; ctx.font=`${9.5/scale}px ${token('--font-body')}`;
      const isSignal=e.kind==='signal', isData=e.kind==='data', bg=isSignal?'--amber-50':isData?'--violet-50':'--stone-50';
      const tw=ctx.measureText(e.label).width,th=12/scale; ctx.fillStyle=token(bg); if(!token(bg)) ctx.fillStyle=token('--color-card'); ctx.globalAlpha=staleInc? .62 : .98;
      drawRound(ctx,lx-5/scale,ly-th+2/scale,tw+10/scale,th+4/scale,5/scale); ctx.fill(); ctx.globalAlpha=1;
      ctx.strokeStyle=token('--color-border'); ctx.lineWidth=1/scale; ctx.stroke();
      ctx.fillStyle=token('--stone-700'); ctx.globalAlpha=staleInc? .52:1; ctx.fillText(e.label,lx,ly); ctx.globalAlpha=1;
    }
  });
}
export function drawNodes(ctx,scale,hover,selected,selEdge){
  const reduced=isReduced();
  const focus=selected||selEdge; const inc=new Set(); if(selected){ EDGES.forEach(e=>{ if(e.from===selected.id||e.to===selected.id){ inc.add(e.from); inc.add(e.to);} }); } if(selEdge){ inc.add(selEdge.from); inc.add(selEdge.to); }
  NODES.forEach(n=>{
    const act=n===hover||n===selected;
    const isInc=focus && inc.has(n.id);
    const dim=focus && !act && !isInc;
    ctx.save();
    if(dim) ctx.globalAlpha=.52;
    const kc=kindColor(n.kind);
    const showContainer = act&&!reduced;
    if(showContainer){
      ctx.shadowColor=token('--color-shadow-strong'); ctx.shadowBlur=10; ctx.shadowOffsetY=2;
      drawRound(ctx,n.x,n.y,n.w,n.h,6); ctx.fillStyle=token('--amber-50'); ctx.globalAlpha=dim? .72:1; ctx.fill();
      ctx.shadowColor=token('--color-transparent');
      ctx.globalAlpha=dim? .55:1;
      ctx.strokeStyle=token('--stone-900'); ctx.lineWidth=1.7/scale; ctx.stroke();
      ctx.save(); ctx.globalAlpha=dim? .45:1;
      drawRound(ctx,n.x,n.y,n.w,n.h,6); ctx.clip();
      ctx.fillStyle=kc; ctx.fillRect(n.x,n.y,2.5,n.h);
      ctx.restore();
    } else {
      ctx.shadowColor=token('--color-transparent');
    }
    ctx.beginPath(); ctx.arc(n.x+7,n.y+n.h/2,2.8,0,Math.PI*2); ctx.fillStyle=kc; ctx.fill(); ctx.strokeStyle=token('--color-card'); ctx.lineWidth=1.2; ctx.stroke();
    const leftPad=12;
    const contentW=n.w-leftPad-4;
    // subtle scaling: p=0.38 — keeps 7.5 base readable, grows only gently on zoom (no tiny when zoomed out, no huge when zoomed in)
    const labelFit=fitTextSubtle(ctx,n.label,contentW,7.5,scale,token('--font-body'),'600',0.38);
    ctx.font=labelFit.font; ctx.fillStyle=dim? token('--stone-500'): token('--stone-900'); ctx.textAlign='left'; ctx.textBaseline='middle';
    ctx.fillText(labelFit.text,n.x+leftPad,n.y+n.h/2+0.3);
    if(n.w>88 && contentW>40){
      const subText=n.sub.split('·')[0].trim()||n.sub;
      const subWorld = subtleFont(6, scale, 0.38);
      ctx.font=`500 ${subWorld}px ${token('--font-body')}`; ctx.fillStyle=token('--stone-500'); ctx.textAlign='right';
      ctx.font=labelFit.font; const tw=ctx.measureText(labelFit.text).width;
      ctx.font=`500 ${subWorld}px ${token('--font-body')}`;
      const avail=contentW - tw - 6;
      if(avail>20){
        let t=subText;
        while(t.length>3 && ctx.measureText(t).width > avail) t=t.slice(0,-2)+'…';
        ctx.globalAlpha=dim? .6 : .72;
        ctx.fillText(t,n.x+n.w-4,n.y+n.h/2+0.3);
        ctx.globalAlpha=1;
      }
    }
    // stale badge: muted pill amber-100 at node top-right (same as atlas-render ⚠ stale — regen)
    if(n.stale){
      const bw=16, bh=10;
      const bx=n.x+n.w - bw + 3, by=n.y - 5;
      ctx.save();
      ctx.fillStyle=token('--amber-100'); ctx.globalAlpha=1;
      drawRound(ctx,bx,by,bw,bh,4); ctx.fill();
      ctx.strokeStyle=token('--amber-200'); ctx.lineWidth=1/scale; ctx.stroke();
      ctx.fillStyle=token('--amber-700');
      const fs = 6/scale;
      ctx.font=`600 ${fs}px ${token('--font-body')}`;
      ctx.textAlign='center'; ctx.textBaseline='middle';
      ctx.fillText('⚠',bx+bw/2,by+bh/2+0.4);
      ctx.restore();
    }
    ctx.textAlign='left'; ctx.textBaseline='alphabetic';
    ctx.restore();
  });
}
