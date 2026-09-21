import { DEVICES,DEVICE_CATS } from './devices.js';
const $=(s,r=document)=>r.querySelector(s);
const scaler=$('#canvas-scaler'),viewport=$('#canvas-viewport'),device=$('#device');
const select=$('#device-select'),metaBox=$('#device-meta');
const zoomSlider=$('#zoom-slider'),zoomValue=$('#zoom-value'),zoomIn=$('#zoom-in'),zoomOut=$('#zoom-out'),zoomFit=$('#zoom-fit'),zoomReset=$('#zoom-reset');
let zoom=0.8,current='iphone15';
function fmtMeta(d){return `<b>${d.name}</b> <span class="device-meta__dot"></span> ${d.w} × ${d.h} pt <span class="device-meta__dot"></span> ${d.px} <span class="device-meta__dot"></span> ${d.ppi} <span class="device-meta__dot"></span> ${d.ratio} <span class="device-meta__dot"></span> ${d.diag} <span class="device-meta__dot"></span> ${d.chip}<br><span style="font-size:10px;opacity:.75">squircle ${d.r}pt · superellipse ≈ n=5 · corner-shape:squircle (CSS superellipse(2))</span>`}
function buildSelect(){
 if(!select||select.dataset.grouped) return;
 select.innerHTML='';
 for(const cat of DEVICE_CATS){
  const items=Object.values(DEVICES).filter(d=>d.cat===cat);
  if(!items.length) continue;
  const g=document.createElement('optgroup');
  g.label=cat;
  for(const d of items){
   const o=document.createElement('option');
   o.value=d.id;
   o.textContent=d.label;
   if(d.id===current) o.selected=true;
   g.appendChild(o);
  }
  select.appendChild(g);
 }
 select.dataset.grouped='1';
}
function applyDevice(id){
 const d=DEVICES[id]||DEVICES.iphone15;current=id;
 const bezelW=d.bezel??10,bezelR=d.r+bezelW;
 scaler.style.setProperty('--device-w',d.w+'px');scaler.style.setProperty('--device-h',d.h+'px');
 scaler.style.setProperty('--display-r',d.r+'px');scaler.style.setProperty('--bezel-w',bezelW+'px');scaler.style.setProperty('--bezel-r',bezelR+'px');
 device.style.setProperty('--display-r',d.r+'px');device.style.setProperty('--bezel-w',bezelW+'px');device.style.setProperty('--bezel-r',bezelR+'px');
 device.setAttribute('aria-label',`${d.name} prototype — ${d.w}×${d.h} pt, ${d.px}, ${d.diag}`);
 if(metaBox) metaBox.innerHTML=fmtMeta(d);

 const island=device.querySelector('.status__island');
 if(island){
  if(d.notch==='none'){island.style.display='none';}
  else{
   island.style.display='';
   if(d.notch==='hole'){island.style.width='16px';island.style.height='16px';island.style.borderRadius='50%';island.style.left='50%';}
   else if(d.notch==='notch'){island.style.width='160px';island.style.height='24px';island.style.borderRadius='0 0 12px 12px';}
   else{island.style.width='92px';island.style.height='28px';island.style.borderRadius='9999px';}
  }
 }
}
function applyZoom(v,{animate=true}={}){
 zoom=Math.min(2,Math.max(0.5,Math.round(v*100)/100));
 scaler.style.setProperty('--zoom',zoom);
 if(zoomSlider) zoomSlider.value=Math.round(zoom*100);
 if(zoomValue) zoomValue.textContent=Math.round(zoom*100)+'%';
 if(!animate) scaler.style.transition='none'; else scaler.style.transition='';
}
function fitZoom(){
 if(!viewport||!scaler) return;
 const d=DEVICES[current],pad=80;
 const availW=Math.max(240,viewport.clientWidth-pad),availH=Math.max(320,viewport.clientHeight-pad);
 const fit=Math.min(availW/d.w,availH/d.h,1.35);
 applyZoom(Math.min(2,Math.max(0.5,Math.floor(fit*100)/100)));
}
function bind(){
 select?.addEventListener('change',e=>{applyDevice(e.target.value);fitZoom();});
 zoomSlider?.addEventListener('input',e=>applyZoom(Number(e.target.value)/100));
 zoomIn?.addEventListener('click',()=>applyZoom(zoom+0.1));
 zoomOut?.addEventListener('click',()=>applyZoom(zoom-0.1));
 zoomReset?.addEventListener('click',()=>applyZoom(1));
 zoomFit?.addEventListener('click',fitZoom);
 viewport?.addEventListener('wheel',e=>{
  if(e.ctrlKey||e.metaKey){e.preventDefault();applyZoom(zoom-Math.sign(e.deltaY)*0.05);}
 },{passive:false});
 let dragging=false,sx=0,sy=0,sl=0,st=0;
 viewport?.addEventListener('mousedown',e=>{
  if(e.button!==0||e.target.closest('.device')) return;
  dragging=true;viewport.classList.add('ws-canvas--dragging');
  sx=e.clientX;sy=e.clientY;sl=viewport.scrollLeft;st=viewport.scrollTop;e.preventDefault();
 });
 window.addEventListener('mousemove',e=>{
  if(!dragging) return;
  viewport.scrollLeft=sl-(e.clientX-sx);viewport.scrollTop=st-(e.clientY-sy);
 });
 window.addEventListener('mouseup',()=>{dragging=false;viewport?.classList.remove('ws-canvas--dragging');});
 window.addEventListener('keydown',e=>{
  if(e.target.tagName==='INPUT'||e.target.tagName==='SELECT') return;
  if(e.key==='+'||e.key==='=') applyZoom(zoom+0.1);
  if(e.key==='-'||e.key==='_') applyZoom(zoom-0.1);
  if(e.key==='0') applyZoom(1);
  if(e.key==='f'||e.key==='F') fitZoom();
 });
 window.addEventListener('resize',fitZoom);
}
buildSelect();
applyDevice(current);applyZoom(0.8,{animate:false});bind();
