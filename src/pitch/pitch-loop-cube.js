/* ADAM/PAGE — src/pitch/pitch-loop-cube.js · v2 loop cube: play on view + ready handshake */
// Pitch shell: fragments inject async — wire after ds:doc; v1 has no frame (no-op).
// One-shot play per frame: IntersectionObserver fires play when 20% visible;
// child acks 'illusion-played'; 'illusion-ready' re-fires play if visible (covers
// posts lost while the iframe was still booting). Scroll-out is a no-op — camera
// never moves except A→B forward. Overlay close / tab hide pause via messages.
(function () {
var SEL = '.loop-cube-frame iframe';
var lastPlay = 0;
var played = new WeakSet();
var visible = new WeakMap();
function post(f, msg) { try { f.contentWindow.postMessage(msg, '*'); } catch (e) {} }
function postAll(msg) {
Array.prototype.forEach.call(document.querySelectorAll(SEL), function (f) { post(f, msg); });
}
function postPlayDebounced(f) {
var now = Date.now();
if (now - lastPlay < 320) return;
lastPlay = now;
if (f) post(f, 'illusion-play'); else postAll('illusion-play');
}
function playWithRetry(f) {
var n = 0;
(function tick() {
if (played.has(f) || n++ >= 4) return;
post(f, 'illusion-play');
setTimeout(tick, 900);
})();
}
function frameVisible(f) {
try {
var r = f.getBoundingClientRect(), vh = window.innerHeight || document.documentElement.clientHeight;
if (r.top >= vh || r.bottom <= 0) return false;
var vis = Math.max(0, Math.min(r.bottom, vh) - Math.max(r.top, 0)) / Math.max(1, r.height);
return vis >= 0.2;
} catch (e) { return false; }
}
function wire() {
var frames = document.querySelectorAll(SEL);
if (!frames.length) return;
var io = window._pitchLoopIO;
if (!io && ('IntersectionObserver' in window)) {
io = new IntersectionObserver(function (es) {
es.forEach(function (en) {
visible.set(en.target, en.isIntersecting);
if (en.isIntersecting && !played.has(en.target)) { postPlayDebounced(en.target); playWithRetry(en.target); }
});
}, { threshold: 0.2 });
window._pitchLoopIO = io;
}
Array.prototype.forEach.call(frames, function (f) {
if (f.dataset.cubeWired) return;
f.dataset.cubeWired = '1';
if (io) io.observe(f);
f.addEventListener('load', function () {
if (frameVisible(f) && !played.has(f)) { postPlayDebounced(f); playWithRetry(f); }
});
if (frameVisible(f) && !played.has(f)) { postPlayDebounced(f); playWithRetry(f); }
});
}
// No global unlock — cube unlocks only via its own canvas or glass mute button.
// Child handshake: ready → play if visible; played → stop retries.
window.addEventListener('message', function (ev) {
if (ev.data !== 'illusion-ready' && ev.data !== 'illusion-played') {
// Parent overlay can pause/hush all cubes
if (ev.data === 'illusion-pause' || ev.data === 'illusion-hush' || ev.data === 'illusion-stop' || ev.data === 'pitch-pause') {
postAll(ev.data === 'pitch-pause' ? 'illusion-hush' : ev.data);
}
return;
}
try {
var frames = document.querySelectorAll(SEL);
for (var i = 0; i < frames.length; i++) {
if (frames[i].contentWindow === ev.source) {
if (ev.data === 'illusion-played') played.add(frames[i]);
else if (frameVisible(frames[i]) && !played.has(frames[i])) { postPlayDebounced(frames[i]); playWithRetry(frames[i]); }
break;
}
}
} catch (e) {}
});
// Tab hidden => pause cubes (suspend only, camera untouched)
document.addEventListener('visibilitychange', function () {
if (document.hidden) postAll('illusion-pause');
});
window.addEventListener('pagehide', function () { postAll('illusion-hush'); });
window.addEventListener('beforeunload', function () { postAll('illusion-hush'); });
document.addEventListener('ds:doc', wire);
wire();
})();
