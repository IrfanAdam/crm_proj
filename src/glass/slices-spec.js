import { OPTICS } from "./lens-filter.jsx";

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
const Y = (band, u, span) => ({ axis: "y", band, u, span });
const X = (band, u, span) => ({ axis: "x", band, u, span });

export const SLICES = [
  Y("top", 0.16, 13), Y("top", 0.46, 15), Y("top", 0.80, 17),
  Y("bottom", 0.16, 13), Y("bottom", 0.46, 15), Y("bottom", 0.80, 17),
  X("left", 0.30, 20), X("left", 0.74, 24),
  X("right", 0.30, 20), X("right", 0.74, 24),
];

// signed displacement (px) of a slice's copy: outward at its own rim, so the world just
// outside the shape is pulled in and compressed along the edge
export const offsetFor = (s) => {
  const d = profile(s.u) * OPTICS.strength;
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
  const g = `linear-gradient(${dir},transparent ${(a - 2).toFixed(1)}px,rgba(0,0,0,.94) ${(a + 4).toFixed(1)}px,rgba(0,0,0,.94) ${(b - 4).toFixed(1)}px,transparent ${b.toFixed(1)}px)`;
  return { maskImage: g, WebkitMaskImage: g };
};
