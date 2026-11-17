import { OPTICS, PULL } from "./optics.js";

/* The bevel spec for the "slices" path: the SDF displacement profile sampled at three
   depths per rim. u = 0 at the rim, 1 at the band's inner edge; the profile is the same
   curve the Chromium lens burns into its displacement map.

   Horizontal rims ("top"/"bottom") refract vertically. The capsule's rounded ends
   ("left"/"right") refract sideways — without them the ends of the bar stay perfectly
   flat and the glass only reads along the middle of the top/bottom edges. Each slice is
   one masked copy, slid by the displacement the SDF would apply at that depth. */
export const profile = (u) => (Math.sin(Math.PI * u) * (1 - 0.5 * u)) / 0.79;

// the rounded end reaches deeper than the straight rim: it is a quarter-arc of ~radius
const CAP = 30;
const Y = (band, u, span, fringe) => ({ axis: "y", band, u, span, fringe });
const X = (band, u, span, fringe) => ({ axis: "x", band, u, span, fringe });

// Faked chromatic fringe: zero extra clones — the outer rim band skews warm
// (red lags outward) and the inner band skews cool (blue leads inward), so the
// feathered bands blend into an RGB split exactly where dispersion would show.
const FR = {
  WARM: "saturate(1.45) hue-rotate(-14deg)",
  COOL: "saturate(1.45) hue-rotate(14deg)",
};

const DEFAULT = [
  Y("top", 0.10, 9, FR.WARM), Y("top", 0.30, 10), Y("top", 0.55, 11), Y("top", 0.85, 12, FR.COOL),
  Y("bottom", 0.10, 9, FR.WARM), Y("bottom", 0.30, 10), Y("bottom", 0.55, 11), Y("bottom", 0.85, 12, FR.COOL),
  X("left", 0.25, 16, FR.WARM), X("left", 0.60, 20), X("left", 0.85, 24, FR.COOL),
  X("right", 0.25, 16, FR.WARM), X("right", 0.60, 20), X("right", 0.85, 24, FR.COOL),
];

/* `?dock=lean` — opt-in cheap material, measured in
   .hermes/evals/2026-11-16-mobile-perf-parity/lane-F.md. DEFAULT IS UNCHANGED: the
   ladder is the material, so lean only exists when the flag is on. Lean keeps the ONE
   aligned copy (the live content the glass refracts) and drops this ladder — no per-slice
   displacement and no per-slice parallax at the rim — while the capsule, rim, press states
   and geometry stay exactly as they are. The flag also raises `data-dock="lean"` so the CSS
   can drop the 5-stop band mirror (dock-band.css) and swap it for the band's own gradient. */
export const LEAN = (() => {
  try {
    const on = new URLSearchParams(location.search).get("dock") === "lean";
    if (on && typeof document !== "undefined") document.documentElement.dataset.dock = "lean";
    return on;
  } catch {
    return false;
  }
})();

export const SLICES = LEAN ? [] : DEFAULT;

// PULL (direct-px pull, decoupled from OPTICS.strength) lives in ./optics.js.
export const offsetFor = (s) => {
  const d = profile(s.u) * PULL;
  return s.band === "top" || s.band === "left" ? d : -d;
};

/* The transform every copy gets: the scroll slide on Y (so the material tracks the feed)
   plus its own displacement on the axis it refracts. `null` = the aligned base copy. */
export const transformFor = (s, baseY) => {
  const o = s ? offsetFor(s) : 0;
  const dx = s && s.axis === "x" ? o : 0;
  const dy = s && s.axis === "y" ? o : 0;
  return `translate(${dx.toFixed(2)}px,${(baseY + dy).toFixed(2)}px)`;
};

// the slice box starts OPTICS.bleed above/left of the dock's rim, so depth → px needs the offset
export const maskFor = (s) => {
  const o = OPTICS.bleed;
  const mid = s.u * (s.axis === "x" ? CAP : OPTICS.band);
  const a = o + Math.max(0, mid - s.span / 2), b = o + mid + s.span / 2;
  const dir = { top: "to bottom", bottom: "to top", left: "to right", right: "to left" }[s.band];
  // softer feather — 14px fade, 0.95 peak — hides hard band stepping that read as horizontal seam on WebKit
  const g = `linear-gradient(${dir},transparent ${(a - 6).toFixed(1)}px,rgba(0,0,0,.95) ${(a + 8).toFixed(1)}px,rgba(0,0,0,.95) ${(b - 8).toFixed(1)}px,transparent ${b.toFixed(1)}px)`;
  return { maskImage: g, WebkitMaskImage: g };
};
