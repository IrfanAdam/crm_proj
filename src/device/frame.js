/* ADAM/DEVICE — src/device/frame.js · frame geometry (single consumer of devices.js) + device chrome builder */
import { mountStatus } from '../os/status-bar.js';
const $=(s,r=document)=>r.querySelector(s);
// 5 scaler vars from one device record — canvas.js applies, never computes.
export function frameVars(d){const bw=d.bezel??10;return {'--device-w':d.w+'px','--device-h':d.h+'px','--display-r':d.r+'px','--bezel-w':bw+'px','--bezel-r':(d.r+bw)+'px'};}
// edge blur stops: tuned constants, generated not repeated (values match pre-Phase-3 markup verbatim).
const TOP=[['1.5px',12,20],['3px',18,32],['6px',26,44],['10px',34,56],['14px',44,66]];
const BOT=[['1px',16,32],['2px',30,48],['3.6px',44,64],['5.2px',60,82],['7px',76,100]];
const stops=l=>l.map(([b,a,z])=>`<span style="--b:${b};--a:${a}%;--z:${z}%"></span>`).join('');
// builds .device__screen + frame + OS mount points once; patterns/glass mount into the ids after.
export function buildFrame(){
 const device=$('#device');if(!device||device.dataset.framed) return;
 device.innerHTML=`<div class="device__screen"><div id="os-status"></div><div id="glass-appbar"></div><div class="device__edge device__edge--top" aria-hidden="true">${stops(TOP)}</div><div class="device__content" id="app-content"><div class="pad"><div id="opps-home"></div></div></div><div id="glass-bottom"></div><div class="device__edge" aria-hidden="true">${stops(BOT)}</div><div class="home-indicator-wrap" aria-hidden="true"><span class="home-indicator"></span></div></div><div class="device__frame" aria-hidden="true"></div>`;
 device.dataset.framed='1';mountStatus($('#os-status',device));
}
