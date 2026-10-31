/* ADAM/SHARED — src/components/IllusionCube/illusion-audio-engine.js · context lifecycle (1/2) */
// [plan:2026-09-28_221212-illusion-cube-recreation.md#{#phase-5}] · audio layer engine (Task 32).
// — Context is born only inside a user gesture · state shared with illusion-audio-engine-buffers.js —
// Export map: ILLUSION_AUDIO_ENGINE.ensure/discardStale/suspend/resume/ready/state/now/fail
(function () {
var E = (window.ILLUSION_AUDIO_ENGINE = {});
var S = (E._shared = { ctx: null, master: null, bufs: {}, live: [], failed: '' });
// — Context is born only inside a user gesture —
E.ensure = function () {
if (S.ctx) return true;
var AC = window.AudioContext || window.webkitAudioContext;
if (!AC) {
S.failed = 'ctx';
return false;
}
try {
S.ctx = new AC();
} catch (e) {
S.failed = 'ctx';
return false;
}
S.master = S.ctx.createGain();
try { S.master.gain.value = window.localStorage.getItem('illusion-sound') === 'off' ? 0 : 1; } catch (e) { S.master.gain.value = 1; }
S.master.connect(S.ctx.destination);
return true;
};
// — Drop a pre-gesture context: on Safari it stays silent forever, so the
// first real gesture always births a fresh in-gesture one (bufs survive) —
E.discardStale = function () {
if (S.ctx && S.ctx.state !== 'running') {
try { if (S.ctx.close) S.ctx.close(); } catch (e) {}
S.ctx = null; S.master = null; S.live = [];
}
return !S.ctx;
};
E.suspend = function () {
if (S.ctx && S.ctx.state === 'running') { try { S.ctx.suspend(); } catch (e) {} }
};
E.resume = function () {
if (S.ctx && S.ctx.state === 'suspended') { try { S.ctx.resume(); } catch (e) {} }
};
E.ready = function () {
return !!S.ctx;
};
E.state = function () {
if (!S.ctx) return '';
return S.ctx.state;
};
E.now = function () {
if (!S.ctx) return 0;
return S.ctx.currentTime;
};
E.fail = function () {
return S.failed;
};
window.ILLUSION_AUDIO_ENGINE = E;
})();
