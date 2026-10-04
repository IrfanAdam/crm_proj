/* ADAM/SHARED — src/components/IllusionCube/illusion-audio-engine.js · decode-once + unlock-safe play */
// [plan:2026-09-28_221212-illusion-cube-recreation.md#{#phase-5}] · audio layer engine (Task 32).
// — decodeAudioData(ab.slice(0)) once per URL · resume + re-check before schedule —
// Export map: ILLUSION_AUDIO_ENGINE.ensure/load/play/hush/ready/state/now/fail
(function () {
const api = {};
let ctx = null;
let master = null;
let bufs = {};
let live = [];
let failed = '';
// — Context is born only inside a user gesture —
api.ensure = function () {
if (ctx) return true;
const AC = window.AudioContext || window.webkitAudioContext;
if (!AC) {
failed = 'ctx';
return false;
}
try {
ctx = new AC();
} catch (e) {
failed = 'ctx';
return false;
}
master = ctx.createGain();
try { master.gain.value = window.localStorage.getItem('illusion-sound') === 'off' ? 0 : 1; } catch (e) { master.gain.value = 1; }
master.connect(ctx.destination);
return true;
};
// — Decode once from a copy; decoding the cache detaches it —
api.load = function (url, tag) {
if (bufs[url]) return Promise.resolve(bufs[url]);
return fetch(url).then(function (r) {
if (!r.ok) throw new Error('http');
return r.arrayBuffer();
}).then(function (ab) {
return ctx.decodeAudioData(ab.slice(0));
}).then(function (buf) {
bufs[url] = buf;
return buf;
}, function () {
failed = tag;
return null;
});
};
// — Unlock-safe play: resume, re-check running, then schedule —
api.play = function (buf, gain, loop) {
return ctx.resume().then(function () {
if (!ctx || ctx.state !== 'running') return false;
const src = ctx.createBufferSource();
src.buffer = buf;
src.loop = !!loop;
const g = ctx.createGain();
g.gain.value = gain;
src.connect(g);
g.connect(master);
src.start(0);
live.push(src);
return true;
});
};
// — Stop every live source —
api.hush = function () {
live.forEach(function (s) {
try {
s.stop(0);
} catch (e) {}
});
live = [];
};
api.setMuted=function(m){if(master)master.gain.value=m?0:1;try{window.localStorage.setItem('illusion-sound',m?'off':'on');}catch(e){}return m;};
api.isMuted=function(){if(master)return master.gain.value===0;try{return window.localStorage.getItem('illusion-sound')==='off';}catch(e){return false;}};
api.suspend = function () {
if (ctx && ctx.state === 'running') { try { ctx.suspend(); } catch (e) {} }
};
api.resume = function () {
if (ctx && ctx.state === 'suspended') { try { ctx.resume(); } catch (e) {} }
};
api.ready = function () {
return !!ctx;
};
api.state = function () {
if (!ctx) return '';
return ctx.state;
};
api.now = function () {
if (!ctx) return 0;
return ctx.currentTime;
};
api.fail = function () {
return failed;
};
window.ILLUSION_AUDIO_ENGINE = api;
})();
