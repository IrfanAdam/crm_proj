/* Which glass material path this browser gets.

   "lens"   — the SDF displacement lens (src/glass/DockLens.jsx): a live copy of the
              screen content inside the dock, refracted by an SVG filter. Best optics;
              verified in Chromium.
   "slices" — src/glass/DockSlices.jsx: the same bevel built from transform + mask
              layers over the live copy, which every engine renders (plus a
              backdrop-filter frost on the dock). No SVG filter to resolve.

   WebKit resolves an SVG `filter: url()` reference exactly once and can leave this
   dock unfiltered — a raw, un-frosted copy — so Safari defaults to "slices".
   Force either with ?glass=lens / ?glass=slices. */
const FORCED =
  typeof location !== "undefined" ? new URLSearchParams(location.search).get("glass") : null;
const UA = typeof navigator !== "undefined" ? navigator.userAgent : "";
const WEBKIT = /^((?!chrome|chromium|android|edg).)*safari/i.test(UA);

export const ENGINE = FORCED === "lens" || FORCED === "slices" ? FORCED : WEBKIT ? "slices" : "lens";
