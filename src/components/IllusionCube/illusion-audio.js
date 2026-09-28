/* ADAM/SHARED — src/components/IllusionCube/illusion-audio.js · cues, gates, gesture arm */
// [plan:2026-09-28_221212-illusion-cube-recreation.md#{#phase-5}] · audio layer surface (Task 32).
// — Bed 0.5 looped · whoosh 0.3 one-shot · bed copy 0.2 — map: arm() · status() · cue(name?) · toggle()
(function () {
const api = {};
const E = window.ILLUSION_AUDIO_ENGINE || null;
const KEY = 'illusion-sound';
const BED = 'cube-illusion/audio/ambient.mp3';
const WHOOSH = 'cube-illusion/audio/whoosh.mp3';
const log = [];
let bedOn = false;
let playing = false;
// — Gates: stored off mutes; reduced motion gates unless explicitly on —
function stored() {
try {
return window.localStorage.getItem(KEY);
} catch (e) {
return null;
}
}
function gate() {
if (!E) return 'silent';
if (stored() === 'off') return 'muted';
try {
if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
return stored() === 'on' ? '' : 'reduced';
}
} catch (e) {}
if (E.fail()) return 'silent';
return '';
}
function schedule(name, url, gain, loop) {
if (gate() || !E.ready()) return Promise.resolve('');
return E.load(url, name).then(function (buf) {
if (!buf) return 'silent';
return E.play(buf, gain, loop);
}).then(function (ok) {
if (ok === 'silent') return 'silent';
if (!ok) {
if (name === 'bed') bedOn = false;
return 'blocked';
}
log.push({ cue: name, t: E.now() });
if (name === 'bed') playing = true;
return name;
}, function () {
if (name === 'bed') bedOn = false;
return 'blocked';
});
}
// — Arm the bed; the context is born only inside a gesture —
function unlock() {
if (gate() || bedOn) return;
if (!E.ensure()) return;
bedOn = true;
schedule('bed', BED, 0.5, true);
}
api.arm = function () {
window.addEventListener('pointerdown', unlock, { once: true });
window.addEventListener('keydown', unlock, { once: true });
};
api.status = function () {
if (gate()) return gate();
if (playing) return 'playing';
if (E.ready()) return 'blocked';
return 'armed';
};
api.cue = function (name) {
if (!name) return log.slice();
if (name === 'whoosh') return schedule(name, WHOOSH, 0.3, false);
if (name === 'bed2') return schedule(name, BED, 0.2, true);
if (name === 'bed') return schedule(name, BED, 0.5, true);
return Promise.resolve('');
};
api.toggle = function () {
const next = stored() === 'off' ? 'on' : 'off';
try {
window.localStorage.setItem(KEY, next);
} catch (e) {}
E.hush();
playing = false;
bedOn = false;
if (next === 'on') unlock();
return next;
};
window.ILLUSION_AUDIO = api;
})();
