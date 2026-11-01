/* ADAM/SHARED — src/components/GemReward/gem-appearance.js · stone optics, measured */
// [plan:2026-11-01_000000-gem-appearance.md#appearance] · reference data for the gem shader.
// — Colour numbers are MEASURED, not chosen: one fixed recipe over the photographs in —
// —   .hermes/tmp/round6/refs (script + committed output: .hermes/tmp/round6/lanes/appearance/) — :
// —   sat = (max-min)/max*100 · mask = (sat>25 | max<120) & max>8 · opening 3x3 · largest component ·
// —   holes filled · L = 0.2126R+0.7152G+0.0722B · hue = circular mean over pixels with sat>60 & L<220 ·
// —   l50/l95 = percentiles of L within the mask · achromatic = fraction sat<=25 ·
// —   glints = fraction L>=230 & sat<=40. Re-run the script to reproduce every one of them. —
// — Optics are PUBLISHED: ior at 589 nm, abbe from the same aperture values, both cited per stone. —
// — Bands are the absorbing transitions behind the measured hue — { peak nm, fwhm nm, k }. Peaks are —
// —   cited; fwhm is an estimate where the source names only a peak (see `weak`). —
// — `confidence` rates the colour block; `weak` names the fields to distrust per stone. —
// Export map: api.stones · api.of(name) · api.rgb(name) body colour at l50 · api.kAt(name, nm) ·
// —   api.normalise(rgb) unit hue vector · api.absorb(kR, kG, kB, pathLen) Beer–Lambert transmittance —
(function () {
const api = {};
const U = {
sapphire: 'https://en.wikipedia.org/wiki/Sapphire — Abbe 72.2; n(w) 1.768-1.772, n(e) 1.760-1.763',
ivct: 'https://gems.chanthaburi.buu.ac.th/gems_softpower/file/Spectroscopic%20Investigation%20of%20Properties%20of%20Blue%20Sapphire%20Samples%20Depending%20on%20Heating%20Conditions.pdf — Fe/Ti bands at 580 and 710 nm',
quartz: 'https://www.gemologyproject.com/wiki/index.php?title=Quartz — RI 1.544-1.553, dispersion 0.013',
beryl: 'https://www.gemologyproject.com/wiki/index.php?title=Beryl — RI 1.577-1.583, dispersion 0.014',
mindat: 'https://www.mindat.org/min-690.html — red beryl n(w) 1.572-1.580, n(e) 1.564-1.570',
cohen: 'http://www.minsocam.org/ammin/AM41/AM41_874.pdf — Cohen 1956, amethyst bands at 340, 540, 950 nm',
gem_a: 'https://gem-a.com/gem-hub/red-beryl-rare-gemstone/ — Mn3+ bands at 500 and 570 nm, weak 430 nm',
gia: 'https://www.gia.edu/gems-gemology/summer-2022-gemnews-topaz-in-red-beryl — intense 540 nm (Mn3+), weak 370 nm (Fe3+)',
ct: 'https://gia.edu/dam/migrated-assets/docs/doc1/SP88A1.pdf — O-metal charge transfer centred in the near-UV, tailing into blue: yellow',
citrine: 'https://en.wikipedia.org/wiki/Citrine_(quartz) — colour from aluminium-based colour centres',
refs: '.hermes/tmp/round6/refs/{stone}.jpg — measured, see lanes/appearance/refs-measured.json',
};
api.stones = {
sapphire: {
ior: 1.768, abbe: 72.2, hue: 227.0, sat: 0.871, l50: 86.4, l95: 172.8,
achromatic: 0.013, glints: 0.016,
bands: [{ peak: 580, fwhm: 130, k: 0.85 }, { peak: 710, fwhm: 90, k: 0.45 }],
confidence: 'high', weak: [],
note: 'faceted pear, white sweep, no setting; hue result 0.997, IQR 224.3-229.7 over 70% of the mask. Body-only pixels run darker than the mask (l50 67.0, l95 113.4): the mask tail is facet reflection.',
source: [U.sapphire, U.ivct, U.refs],
},
amethyst: {
ior: 1.544, abbe: 70.0, hue: 283.9, sat: 0.62, l50: 96.1, l95: 196.3,
achromatic: 0.129, glints: 0.015,
bands: [{ peak: 340, fwhm: 90, k: 0.3 }, { peak: 540, fwhm: 110, k: 0.9 }, { peak: 950, fwhm: 140, k: 0.3 }],
confidence: 'low', weak: ['l50', 'l95', 'abbe'],
note: 'no clean faceted amethyst reference in the set: this frame shows four stones on white and the recipe locks onto the largest (bbox 479,143-755,419) — 12.9% of that mask is white reflection (sat<=25) and only 0.4% of it (233 px) clears sat>60 & L<220, so hue/sat rest on a thin population and l50/l95 ride the pale reflections; the same-hue core sits at l50 46.3. abbe derived from quartz dispersion, not a published V.',
source: [U.quartz, U.cohen, U.refs],
},
redberyl: {
ior: 1.577, abbe: 68.7, hue: 340.3, sat: 0.88, l50: 64.1, l95: 144.2,
achromatic: 0.022, glints: 0.0,
bands: [{ peak: 540, fwhm: 110, k: 0.95 }, { peak: 500, fwhm: 60, k: 0.35 }, { peak: 430, fwhm: 60, k: 0.2 }],
confidence: 'low', weak: ['ior', 'l50', 'l95', 'abbe'],
note: 'WEAK EVIDENCE: rough crystal specimen on a dark blue-black backdrop, not a faceted stone. The mask covers 72% of the frame and touches all four borders (backdrop admitted by max<120), which drags l50 to 64.1; within-hue crystal pixels sit at l50 33.9, l95 80.7. Published ior spread is 1.560-1.583 (beryl 1.577-1.583, mindat 1.564-1.580): 1.577 is the beryl table value, not a red-beryl specific measurement.',
source: [U.beryl, U.mindat, U.gem_a, U.gia, U.refs],
},
citrine: {
ior: 1.544, abbe: 70.0, hue: 25.0, sat: 0.867, l50: 107.4, l95: 168.2,
achromatic: 0.0, glints: 0.0,
bands: [{ peak: 430, fwhm: 140, k: 0.9 }],
confidence: 'high', weak: ['abbe'],
note: 'faceted stone on white; 97.7% of the mask lands in the hue population (hue result 0.994, IQR 20.1-28.7) and no low-saturation pixel reaches L>=230 (glints 0.0, brightest pixel L 230.2 and still chromatic), so l95 168.2 is the real highlight ceiling, not a clipped glint. abbe derived from quartz dispersion 0.013, not a published V.',
source: [U.quartz, U.citrine, U.ct, U.refs],
},
};
api.of = function (name) { return api.stones[name] || api.stones.sapphire; };
const hsv = function (h, s, v) {
const c = v * s, x = c * (1 - Math.abs(((h / 60) % 2) - 1)), m = v - c;
const t = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
return [t[0] + m, t[1] + m, t[2] + m];
};
api.rgb = function (name) { const r = api.of(name); return hsv(r.hue, r.sat, r.l50 / 255); };
api.kAt = function (name, nm) {
const b = api.of(name).bands; let k = 0;
for (let i = 0; i < b.length; i++) { const t = (nm - b[i].peak) / (b[i].fwhm / 2.3548); k += b[i].k * Math.exp(-0.5 * t * t); }
return k;
};
api.absorb = function (kR, kG, kB, pathLen) {
const d = pathLen == null ? 1 : pathLen;
return [Math.exp(-kR * d), Math.exp(-kG * d), Math.exp(-kB * d)];
};
api.normalise = function (rgb) {
const m = Math.max(rgb[0], rgb[1], rgb[2]);
return m > 0 ? [rgb[0] / m, rgb[1] / m, rgb[2] / m] : [0, 0, 0];
};
window.GEM_APPEARANCE = api;
})();
