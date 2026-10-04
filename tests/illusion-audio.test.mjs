/* ADAM/TOOL — tests/illusion-audio.test.mjs · mute/unmute state machine */
// — Stub-first trick temporal.test.mjs uses: fake window/AudioContext/fetch, load classic scripts —
import { readFileSync } from 'node:fs';
const store = { 'illusion-sound': 'on' };
function mkCtx() {
  const srcs = [];
  const ctx = {
    state: 'suspended', currentTime: 0, _srcs: srcs, _master: null,
    resume() { ctx.state = 'running'; return Promise.resolve(); },
    suspend() { ctx.state = 'suspended'; return Promise.resolve(); },
    createGain() { const g = { gain: { value: 1 }, connect() {} }; if (!ctx._master) ctx._master = g; return g; },
    createBufferSource() { const s = { buffer: null, loop: false, _started: false, _stopped: false, connect() {}, start() { s._started = true; }, stop() { s._stopped = true; } }; srcs.push(s); return s; },
    decodeAudioData() { return Promise.resolve({ duration: 1 }); },
    destination: {},
  };
  return ctx;
}
const ctx = mkCtx();
let releaseFetch = null;
globalThis.fetch = () => new Promise((res) => { releaseFetch = () => res({ ok: true, arrayBuffer: () => Promise.resolve(new ArrayBuffer(8)) }); });
globalThis.window = {
  localStorage: { getItem: (k) => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); } },
  matchMedia: () => ({ matches: false }),
  addEventListener() {}, AudioContext: function () { return ctx; },
};
globalThis.document = { addEventListener() {}, hidden: false };
const load = (p) => new Function(readFileSync(new URL(p, import.meta.url), 'utf8'))();
load('../src/components/IllusionCube/illusion-audio-engine.js');
load('../src/components/IllusionCube/illusion-audio.js');
const Au = globalThis.window.ILLUSION_AUDIO;
const gain = () => ctx._master.gain.value;
const live = () => ctx._srcs.filter((s) => s._started && !s._stopped);
const tick = (ms = 20) => new Promise((r) => setTimeout(r, ms));
let fails = 0;
const ok = (n, c) => { console.log(`${c ? '✓' : '✗'} ${n}`); if (!c) fails++; };
// Mute during in-flight load must never become audible (fetch held open).
Au.unlock(); Au.toggleMute(); releaseFetch(); await tick();
ok('mute mid-load stays silent', live().length === 0 && Au.status() === 'muted');
// Glass path: unmute restarts the bed, mute silences it again.
Au.toggleMute(); releaseFetch(); await tick();
ok('unmute restarts bed', Au.status() === 'playing' && live().length > 0 && gain() === 1);
// Mute is a volume gate: the loop keeps its position, unmute never restarts it.
const looped = live().length;
Au.toggleMute();
ok('mute keeps loop at zero gain', looped > 0 && live().length === looped && gain() === 0 && Au.status() === 'muted');
Au.toggleMute();
ok('unmute resumes same loop', live().length === looped && gain() === 1 && Au.status() === 'playing');
Au.toggle(); Au.toggle();
ok('double round-trip never stacks loops', live().length === looped && gain() === 1 && Au.status() === 'playing');
// Gesture-gated birth, fresh sandbox: intent births nothing, gestures recover.
const w0 = globalThis.window;
let births = 0; let stuck = true;
globalThis.window = {
  localStorage: { getItem: () => 'on', setItem() {} },
  matchMedia: () => ({ matches: false }),
  addEventListener() {},
  AudioContext: function () {
    births++;
    const c = { state: 'suspended', currentTime: 0, _m: null,
      resume() { if (!stuck) c.state = 'running'; return Promise.resolve(); },
      suspend() { c.state = 'suspended'; return Promise.resolve(); },
      createGain() { const g = { gain: { value: 1 }, connect() {} }; if (!c._m) c._m = g; return g; },
      createBufferSource() { const s = { _s: false, _x: false, connect() {}, start() { s._s = true; }, stop() { s._x = true; } }; return s; },
      decodeAudioData() { return Promise.resolve({}); }, destination: {} };
    return c;
  },
};
load('../src/components/IllusionCube/illusion-audio-engine.js');
load('../src/components/IllusionCube/illusion-audio.js');
const Au2 = globalThis.window.ILLUSION_AUDIO, E2 = globalThis.window.ILLUSION_AUDIO_ENGINE;
ok('intent API exists', typeof Au2.expectBed === 'function');
if (typeof Au2.expectBed === 'function') {
  Au2.expectBed(); await tick();
  ok('scroll intent births no context', !E2.ready() && births === 0);
  Au2.unlock(); releaseFetch(); await tick(1500);
  ok('stuck gesture birth stays honest', births === 1 && Au2.status() === 'blocked');
  stuck = false; Au2.unlock(); await tick();
  ok('live gesture discards stale + plays', births === 2 && Au2.status() === 'playing');
}
globalThis.window = w0;
if (fails) { console.error(`FAIL ${fails}`); process.exit(1); }
console.log('illusion-audio: mute machine ok');
