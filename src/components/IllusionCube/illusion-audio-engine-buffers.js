/* ADAM/SHARED — src/components/IllusionCube/illusion-audio-engine-buffers.js · decode-once + unlock-safe play (2/2) */
// [plan:2026-09-28_221212-illusion-cube-recreation.md#{#phase-5}] · audio layer engine (Task 32).
// — decodeAudioData(ab.slice(0)) once per URL · resume + re-check before schedule —
// Export map: ILLUSION_AUDIO_ENGINE.load/prime/play/hush/setMuted/isMuted
(function () {
var E = (window.ILLUSION_AUDIO_ENGINE = window.ILLUSION_AUDIO_ENGINE || {});
var S = (E._shared = E._shared || { ctx: null, master: null, bufs: {}, live: [], failed: '' });
// — Decode once from a copy; decoding the cache detaches it —
E.load = function (url, tag) {
if (S.bufs[url]) return Promise.resolve(S.bufs[url]);
return fetch(url).then(function (r) {
if (!r.ok) throw new Error('http');
return r.arrayBuffer();
}).then(function (ab) {
return S.ctx.decodeAudioData(ab.slice(0));
}).then(function (buf) {
S.bufs[url] = buf;
return buf;
}, function () {
S.failed = tag;
return null;
});
};
// — Gesture-free prefetch: fetch + decode via OfflineAudioContext so the
// first real unlock plays instantly. Never poisons `failed` (offline/slow
// networks just mean no cache — the gesture path still tries live) —
E.prime = function (url, tag) {
if (!url || S.bufs[url]) return Promise.resolve(!!S.bufs[url]);
var OC = window.OfflineAudioContext || window.webkitOfflineAudioContext;
return fetch(url).then(function (r) {
if (!r.ok) throw new Error('http');
return r.arrayBuffer();
}).then(function (ab) {
if (OC) { try { return new OC(1, 8, 8000).decodeAudioData(ab.slice(0)); } catch (e) {} }
if (S.ctx) { try { return S.ctx.decodeAudioData(ab.slice(0)); } catch (e) {} }
return null;
}).then(function (buf) {
if (buf) { S.bufs[url] = buf; return true; }
return false;
}, function () { return false; });
};
// — Unlock-safe play: resume, re-check running, then schedule —
E.play = function (buf, gain, loop) {
return S.ctx.resume().then(function () {
if (!S.ctx || S.ctx.state !== 'running') return false;
var src = S.ctx.createBufferSource();
src.buffer = buf;
src.loop = !!loop;
var g = S.ctx.createGain();
g.gain.value = gain;
src.connect(g);
g.connect(S.master);
src.start(0);
S.live.push(src);
return true;
});
};
// — Stop every live source —
E.hush = function () {
S.live.forEach(function (s) {
try {
s.stop(0);
} catch (e) {}
});
S.live = [];
};
E.setMuted=function(m){if(S.master)S.master.gain.value=m?0:1;try{window.localStorage.setItem('illusion-sound',m?'off':'on');}catch(e){}return m;};
E.isMuted=function(){if(S.master)return S.master.gain.value===0;try{return window.localStorage.getItem('illusion-sound')==='off';}catch(e){return false;}};
window.ILLUSION_AUDIO_ENGINE = E;
})();
