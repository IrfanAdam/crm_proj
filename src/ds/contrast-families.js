/* ADAM/DS — src/ds/contrast-families.js · playground families, subs, tiers */
// [plan:2026-09-23_002500-design-system-consolidation.md#phase-2]
// Exports: PG_TIERS, PG_STEPS, PG_RAMPS, PG_FAM. Tier = how much ramp shows:
// strong = hero fill (most color), basic = tinted ground (hue in the ground),
// neut = hue as ink on paper (no fill). Candidates come from that sub's ramp
// only; the runtime keeps the strongest passing one.
const PG_TIERS = [
  ['strong', 'Strong', 'hero fill — most color'],
  ['basic', 'Basic', 'tinted ground — hue behind the ink'],
  ['neut', 'Neutral', 'hue as ink — no fill']
];
const PG_STEPS = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900];
const PG_RAMPS = ['neutral-light', 'neutral-dark', 'sapphire-ui', 'amethyst', 'red-beryl', 'citrine', 'green', 'red', 'orange'];
const PG_FAM = {
  neutral: {
    label: 'Neutral',
    subs: [{
      key: 'content', label: 'Content · Ink', ramp: 'neutral-dark',
      tiers: {
        strong: [['white', 'neutral-dark-700'], ['neutral-light-900', 'neutral-dark-800']],
        basic: [['ink', 'neutral-light-500'], ['ink', 'neutral-light-400'], ['neutral-dark-800', 'neutral-light-400']],
        neut: [['neutral-dark-400', 'white'], ['neutral-dark-300', 'white'], ['neutral-dark-100', 'white']]
      }
    }]
  },
  core: {
    label: 'Core',
    subs: [
      {
        key: 'action', label: 'Action · Sapphire', ramp: 'sapphire-ui',
        tiers: {
          strong: [['white', 'sapphire-ui-500'], ['sapphire-ui-100', 'sapphire-ui-700']],
          basic: [['sapphire-ui-700', 'sapphire-ui-100'], ['sapphire-ui-700', 'sapphire-ui-50'], ['ink', 'sapphire-ui-200']],
          neut: [['sapphire-ui-600', 'white'], ['sapphire-ui-700', 'white'], ['sapphire-ui-500', 'surface']]
        }
      },
      {
        key: 'measure', label: 'Measure · Amethyst', ramp: 'amethyst',
        tiers: {
          strong: [['white', 'amethyst-500'], ['amethyst-100', 'amethyst-600']],
          basic: [['amethyst-700', 'amethyst-100'], ['amethyst-700', 'amethyst-50'], ['ink', 'amethyst-200']],
          neut: [['amethyst-600', 'white'], ['amethyst-500', 'white'], ['amethyst-700', 'white']]
        }
      },
      {
        key: 'score', label: 'Score · Red Beryl', ramp: 'red-beryl',
        tiers: {
          strong: [['white', 'red-beryl-500'], ['red-beryl-100', 'red-beryl-700']],
          basic: [['red-beryl-700', 'red-beryl-100'], ['red-beryl-700', 'red-beryl-50'], ['ink', 'red-beryl-200']],
          neut: [['red-beryl-600', 'white'], ['red-beryl-500', 'white'], ['red-beryl-700', 'white']]
        }
      }
    ]
  },
  messaging: {
    label: 'Messaging',
    subs: [
      {
        key: 'success', label: 'Success · Green', ramp: 'green',
        tiers: {
          strong: [['ink', 'green-300'], ['white', 'green-600']],
          basic: [['green-900', 'green-50'], ['green-800', 'green-100'], ['ink', 'green-100']],
          neut: [['green-700', 'white'], ['green-800', 'white'], ['green-600', 'white']]
        }
      },
      {
        key: 'danger', label: 'Danger · Red', ramp: 'red',
        tiers: {
          strong: [['white', 'red-600'], ['white', 'red-500'], ['ink', 'red-100']],
          basic: [['red-900', 'red-50'], ['red-800', 'red-100'], ['ink', 'red-100']],
          neut: [['red-700', 'white'], ['red-800', 'white'], ['red-600', 'white']]
        }
      },
      {
        key: 'warning', label: 'Warning · Citrine', ramp: 'citrine',
        tiers: {
          strong: [['ink', 'citrine-400'], ['citrine-800', 'citrine-100']],
          basic: [['citrine-700', 'citrine-50'], ['citrine-800', 'citrine-100'], ['ink', 'citrine-200']],
          neut: [['citrine-700', 'white'], ['citrine-600', 'white'], ['citrine-800', 'white']]
        }
      }
    ]
  }
};
