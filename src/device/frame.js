/* ADAM/DEVICE — src/device/frame.js · frame geometry (single consumer of devices.js) + device chrome builder */
import { mountStatus } from '../os/status-bar.js';
import { TOP, BOT, stopsHTML } from './edge-stops.js';
const $=(s,r=document)=>r.querySelector(s);
// 5 scaler vars from one device record — canvas.js applies, never computes.
export function frameVars(d){const bw=d.bezel??10;return {'--device-w':d.w+'px','--device-h':d.h+'px','--display-r':d.r+'px','--bezel-w':bw+'px','--bezel-r':(d.r+bw)+'px'};}
// builds .device__screen + frame + OS mount points once; patterns/glass mount into the ids after.
export function buildFrame(){
 const device=$('#device');if(!device||device.dataset.framed) return;
 device.innerHTML=`<div class="device__screen"><div id="os-status"></div><div id="glass-appbar"></div><div class="device__edge device__edge--top" aria-hidden="true">${stopsHTML(TOP)}</div><div class="device__content" id="app-content"><div class="pad"><div id="opps-home"></div></div></div><div id="glass-bottom"></div><div class="device__edge" aria-hidden="true">${stopsHTML(BOT)}</div><div class="home-indicator-wrap" aria-hidden="true"><span class="home-indicator"></span></div></div><div class="device__frame" aria-hidden="true"></div>`;
 device.dataset.framed='1';mountStatus($('#os-status',device));
}
