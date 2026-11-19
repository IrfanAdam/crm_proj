/* ADAM/GEMS — prototype/gems/oracle-args.mjs · CLI flags + capture constants, parsed once at import time.
 * [plan:2026-10-03_144222-gem-realism-round2.md#phase-18] · split out of pixel-oracle.mjs; every sibling imports here
 * rather than re-parsing process.argv, so flag()/has() keep the same values in every mode.
 */
export const ARGS = process.argv.slice(2);
export const flag = (n, d) => { const i = ARGS.indexOf('--' + n); return i < 0 ? d : ARGS[i + 1]; };
export const has = (n) => ARGS.includes('--' + n);
export const CHROME = process.env.CHROME_BIN || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
export const STONES = String(flag('stones', 'sapphire,citrine,amethyst,redberyl')).split(',').filter(Boolean);
export const TILTS = String(flag('tilts', '-0.30,-0.15,0.00,0.15,0.30')).split(',').map(Number);
export const BUFFERS = String(flag('buffers', 'card,ceremony')).split(',').filter(Boolean);
const box = (v, d) => String(flag(v, d)).split('x').map(Number);
export const SIZE = { card: box('cardsize', '320x320'), ceremony: box('ceremonsize', '393x320') };   // forced CSS box per surface (sheet caps the ceremony canvas at 340 px); buffer = box * min(dpr,2)
export const MASK_MIN = 20000, MASK_EPS = 6;
export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
