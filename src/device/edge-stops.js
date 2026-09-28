/* ADAM/DEVICE — src/device/edge-stops.js · progressive-blur stop table for the OS edge materials */
// Exports: TOP, BOT (stop tuples [[blur, alpha%, solid%]]) · stopsHTML(list) (span markup)
// — Section — Stop table —
// Single source for both consumers: frame.js paints the real edge band; the glass
// dock mirror (lens-copy) rebuilds the same band inside its backdrop copy — the two
// must show the same blur ladder over the same pixels, so the numbers live here.
export const TOP = [['1.5px', 12, 20], ['3px', 18, 32], ['6px', 26, 44], ['10px', 34, 56], ['14px', 44, 66]];
export const BOT = [['1px', 16, 32], ['2px', 30, 48], ['3.6px', 44, 64], ['5.2px', 60, 82], ['7px', 76, 100]];

// — Section — Markup —
// One span per stop; --b blur radius, --a fade-in %, --z solid %. An optional class
// lands on the span so the dock mirror (glass) can target its own ladder copies.
// Mask direction lives in the CSS (edge-material.css / dock-band.css), not here.
export function stopsHTML(list, cls = "") {
  const c = cls ? ` class="${cls}"` : "";
  return list.map(([b, a, z]) => `<span${c} style="--b:${b};--a:${a}%;--z:${z}%"></span>`).join("");
}
