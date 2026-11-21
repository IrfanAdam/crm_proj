/* ADAM/SHARED — src/components/GemReward/gem-cand.js · the bounce scan as a candidate set (table-driven) */
// — The interior trace tests all 170 facet planes on every bounce (gem-shader-ext.js tr()). For a given entry facet
// — and exit-direction cell only a handful of those planes can ever win, so a baked table names them: uint8 plane
// — indices, layout [ei][az][el][slot], az = 128, el = 64, facet index == plane index, 255 = terminator/pad.
// — The CAND path runs the SAME intersection test and the SAME strict '<' tie rule on those slots, in slot order, and
// — falls back to the full 170-plane scan when no candidate wins — correctness never depends on the table.
// — Cell mapping (must equal the bake): az = atan2(d.z, d.x), +2pi into [0,2pi); el = asin(clamp(d.y,-1,1));
// —   ia = clamp(floor(az*128/2pi), 0, 127); je = clamp(floor((el+pi/2)*64/pi), 0, 63); d is OBJECT space (== dl).
// — Texture: R8 (RedFormat/UnsignedByteType), NearestFilter, no mips, clamp, unpackAlignment from the row width;
// —   the table is flattened row-major, so the shader indexes idx = ei*(128*64*k) + ia*(64*k) + je*k + slot.
// — Gating: DEFAULT OFF. ?gemcand=1 → /cand.bin; ?gemcand=<url> → that URL; ?gemcand=0 or absent → off. The CAND
// —   define is set at MATERIAL CREATION (gem-shader.js farside → claim), never mid-animation: a material built
// —   before the table resolves keeps the plain path and is never recompiled. A 404/parse failure leaves it off.
// — WebGL2 only: the shader needs highp int for the flat index (236 MB at k=170) and R8 sampling.
// Export map: GEM_CAND { on · url · ready · tex · k · W · H · claim(sm) · stats() }
(function () {
const api = {}, QS = String((window.location && window.location.search) || '');
window.GEM_CAND = api;
const qv = function (k) { const m = QS.match(new RegExp('[?&]' + k + '=([^&]*)')); return m ? m[1] : ''; };
api.on = function () { const v = qv('gemcand'); return !!(v && v !== '0'); };            // opt-in only
api.url = function () { const v = qv('gemcand'); return (v && v !== '1' && v !== '0') ? decodeURIComponent(v) : '/cand.bin'; };
const EI = 170, AZ = 128, EL = 64, CELLS = EI * AZ * EL;                                  // the table's fixed geometry
api.ready = false; api.tex = null; api.k = 0; api.W = 0; api.H = 0;
api.stat = { on: 0, k: 0, cells: CELLS, bytes: 0, W: 0, H: 0, claimed: 0, skipped: 0, errors: [], url: '' };
let g2 = -1;
const webgl2 = function () {                                                             // one probe, cached
if (g2 >= 0) return !!g2;
g2 = 0;
try { const c = document.createElement('canvas'); g2 = (c.getContext && c.getContext('webgl2')) ? 1 : 0; } catch (e) { g2 = 0; }
return !!g2;
};
// — load(): fetch once at script-parse time so the table is resolved long before the first material is built.
api.load = function () {
if (!api.on() || api._asked) return 0;
api._asked = 1; api.stat.on = 1; api.stat.url = api.url();
if (!webgl2()) { api.stat.errors.push('webgl2-required'); return 0; }
fetch(api.stat.url).then(function (r) { if (!r.ok) throw new Error('http-' + r.status); return r.arrayBuffer(); }).then(function (ab) {
const n = ab.byteLength, k = Math.round(n / CELLS);
if (!(k > 0) || k * CELLS !== n) throw new Error('size ' + n + ' is not cells*k');
let W = Math.min(16384, Math.max(4, n));
if (Math.ceil(n / W) > 16384) W = Math.min(16384, 4 * Math.ceil(Math.sqrt(n) / 4));
const H = Math.ceil(n / W);
if (H > 16384) throw new Error('table ' + n + ' B does not fit one texture');
const T = window.THREE;
if (!T || !T.DataTexture) throw new Error('no THREE');
const tex = new T.DataTexture(new Uint8Array(ab), W, H, T.RedFormat, T.UnsignedByteType);
tex.minFilter = tex.magFilter = T.NearestFilter; tex.generateMipmaps = false;
tex.wrapS = tex.wrapT = T.ClampToEdgeWrapping;
tex.unpackAlignment = W % 4 === 0 ? 4 : 1;
tex.needsUpdate = true;
api.k = k; api.W = W; api.H = H; api.tex = tex; api.ready = true;
api.stat.k = k; api.stat.bytes = n; api.stat.W = W; api.stat.H = H;
}).catch(function (e) { api.stat.errors.push(String((e && e.message) || e)); });        // 404/no-THREE → plain path
return 1;
};
// — claim(sm): from gem-shader.farside() at MATERIAL CREATION. 0 = untouched scan (the shipped default).
api.claim = function (sm) {
if (!api.on() || !sm || !sm.defines || !sm.uniforms) return 0;
if (sm.defines.CAND) return 1;
if (!api.ready || !api.tex) { api.stat.skipped += 1; return 0; }                        // no recompile later, ever
if (sm.defines.PLMAX !== EI) { api.stat.errors.push('plmax ' + sm.defines.PLMAX + ' != ' + EI); return 0; }
const d = sm.defines;
d.CAND = 1; d.CANDK = api.k; d.CANDW = api.W; d.CANDH = api.H;
sm.uniforms.uCandTex = { value: api.tex };
api.stat.claimed += 1;
return 1;
};
api.stats = function () { return { mode: api.on() ? 'cand' : 'scan', ready: api.ready, k: api.stat.k, W: api.stat.W, H: api.stat.H,
bytes: api.stat.bytes, claimed: api.stat.claimed, skipped: api.stat.skipped, url: api.stat.url, errors: api.stat.errors }; };
api.load();
})();
