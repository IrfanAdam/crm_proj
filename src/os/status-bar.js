/* ADAM/OS — src/os/status-bar.js · live status bar: clock, signal, battery · mounts into #os-status */
const $=(s,r=document)=>r.querySelector(s);
// signal/wifi are static SVG: no web API exposes radio strength, so live values are impossible — document, don't fake.
const SIGNAL='<svg viewBox="0 0 18 11" fill="none" aria-hidden="true"><rect x="0" y="7" width="3" height="4" rx="1" fill="currentColor"/><rect x="5" y="5" width="3" height="6" rx="1" fill="currentColor"/><rect x="10" y="2" width="3" height="9" rx="1" fill="currentColor"/><rect x="15" y="0" width="3" height="11" rx="1" fill="currentColor" opacity=".35"/></svg><svg viewBox="0 0 16 11" fill="none" aria-hidden="true" style="width:15px"><path d="M1 4.5C3.5 2 12.5 2 15 4.5" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/><path d="M3.5 6.8C5.5 5 10.5 5 12.5 6.8" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/><circle cx="8" cy="9" r="1.2" fill="currentColor"/></svg>';
const time=()=>{const d=new Date(),h=d.getHours()%12||12;return h+':'+String(d.getMinutes()).padStart(2,'0');};
export function mountStatus(root){
 root.innerHTML=`<div class="status" aria-hidden="true"><span class="status__time"></span><span class="status__island" title="Dynamic Island"></span><span class="status__right">${SIGNAL}<span class="status__battery"><span class="status__battery-fill"></span></span></span></div>`;
 const t=$('.status__time',root),fill=$('.status__battery-fill',root);
 const tick=()=>{t.textContent=time();};tick();const clock=setInterval(tick,15000);
 const setLvl=l=>{fill.style.width=Math.round(l*100)+'%';};
 if(navigator.getBattery) navigator.getBattery().then(b=>{const u=()=>setLvl(b.level);u();b.addEventListener('levelchange',u);}).catch(()=>setLvl(.68));
 else setLvl(.68);
 return ()=>clearInterval(clock);
}
export function setNotch(mode='island'){const n=$('.status__island');if(n) n.dataset.notch=mode;}
if($('#os-status')) mountStatus($('#os-status'));setNotch('island');
