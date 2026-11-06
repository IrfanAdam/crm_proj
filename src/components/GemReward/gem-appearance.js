/* ADAM/SHARED — src/components/GemReward/gem-appearance.js · stone optics, measured */
// [plan:2026-10-03_144222-gem-realism-round2.md#phase-10] · Task 21: ONE population per field.
// — Colour numbers are MEASURED, not chosen: one frozen recipe over the photographs in —
// —   .hermes/tmp/round6/refs — recompute with `python3 prototype/gems/audit.py --refs <dir>` —
// —   (that also re-checks this file field-by-field against the ±1 gate) — :
// —   mask = (sat>25 | max<120) & max>8 · 3x3 opening · largest 8-connected component · holes filled —
// —   sat = whole-mask median of (max-min)/max*255, stored /255 · l50/l95 = whole-mask L percentiles —
// —   hue = circular mean over sat>60 & L<220 · achromatic = fraction sat<=25 · glints = fraction L>235 —
// — Population note: `achromatic` here is sat<=25 (the appearance record). The photo-cell gate in —
// —   audit.py uses sat<60 & L>150 — two instruments, two named populations, never mixed. —
// —   ONE EXCEPTION, named in the record: when the object mask admits a coloured backdrop (redberyl's —
// —   dark blue-black sweep is 55% of its mask), hue/sat/l come from the CRYSTAL CORE instead —
// —   (hue within 295-50 deg, sat>60, L 35-220, largest component, resultant reported) so a two-family —
// —   mean can never become a stone colour. —
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
refs: '.hermes/tmp/round6/refs/{stone}.jpg — measured, re-check with prototype/gems/audit.py --refs',
};
api.stones = {
sapphire: {
ior: 1.768, abbe: 72.2, hue: 226.3, sat: 0.735, l50: 87.1, l95: 179.9,
achromatic: 0.001, glints: 0.014,
bands: [{ peak: 580, fwhm: 130, k: 0.85 }, { peak: 710, fwhm: 90, k: 0.45 }],
confidence: 'high', weak: [],
note: 'faceted pear, white sweep, no setting; whole-mask recipe: 24567 px mask, hue over 96.8% of it (resultant 0.995), sat 187.5/255. The earlier sat 0.871 was the hue-population median — that second population is retired.',
source: [U.sapphire, U.ivct, U.refs],
},
amethyst: {
ior: 1.544, abbe: 70.0, hue: 283.4, sat: 0.349, l50: 99.7, l95: 206.0,
achromatic: 0.019, glints: 0.016,
bands: [{ peak: 340, fwhm: 90, k: 0.3 }, { peak: 540, fwhm: 110, k: 0.9 }, { peak: 950, fwhm: 140, k: 0.3 }],
confidence: 'low', weak: ['l50', 'l95', 'abbe'],
note: 'four stones on white; the recipe locks onto the largest (61384 px mask, bbox 479,143-755,419) so l50/l95 include pale reflections the shader never shows. Hue 283.4 is unimodal on the crystal core (52522 px, resultant 0.997, 85.6% of the mask), and the whole-mask sat median 89/255 agrees with that core (94/255) — sat stays on the whole mask so this record has ONE population. abbe derived from quartz dispersion, not a published V.',
source: [U.quartz, U.cohen, U.refs],
},
redberyl: {
ior: 1.577, abbe: 68.7, hue: 343.72, sat: 0.6353, l50: 72.58, l95: 170.15,
achromatic: 0.0, glints: 0.0,
bands: [{ peak: 540, fwhm: 110, k: 0.95 }, { peak: 500, fwhm: 60, k: 0.35 }, { peak: 430, fwhm: 60, k: 0.2 }],
mask: 'crystal', crystal: { hue: [295, 50], sat_min: 60, L: [35, 220] },
confidence: 'low', weak: ['ior', 'l50', 'l95', 'abbe'],
note: 'WEAK SPECIMEN, SOUND COLOUR: rough crystal on a dark blue-black backdrop, not a faceted stone. The whole-frame mask admits the backdrop (55% of it sits at hue 220-240), so this record declares the CRYSTAL population instead — `mask: crystal`, hue 295-50 deg, sat>60, L 35-220, largest component = 22948 px at native resolution — and audit.py reproduces it field for field. The retired 264.8 was the two-family mean of crystal+backdrop. Published ior spread 1.560-1.583; 1.577 is the beryl table value, not a red-beryl specific measurement.',
source: [U.beryl, U.mindat, U.gem_a, U.gia, U.refs],
},
citrine: {
ior: 1.544, abbe: 70.0, hue: 24.9, sat: 0.864, l50: 107.8, l95: 171.3,
achromatic: 0.0, glints: 0.004,
bands: [{ peak: 430, fwhm: 140, k: 0.9 }],
confidence: 'high', weak: ['abbe'],
note: 'faceted stone on white; 80170 px mask, 98.8% of it in the hue population (resultant 0.994, IQR 20.1-28.7), sat 220.2/255 — the photograph sits above the render on both l50 and sat, which is the gap Task 22 closes. abbe derived from quartz dispersion 0.013, not a published V.',
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
