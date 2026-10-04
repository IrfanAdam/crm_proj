/* ADAM/DS — src/components/Icon/GemFriendly.jsx · sketch-logo derivative — friendly gem */
// [plan:2026-09-28_000000-lump-sum-builds.md#phase-2] · rounded sketch-logo gem, same weight API as Phosphor.
import { useId } from "react";
const P = {
  outer:
    "M12.2 3.7L19.8 3.7Q22.4 3.7 24.25 5.53L28.21 9.43Q30.91 12.1 28.36 14.92L18.55 25.74Q16 28.56 13.45 25.74L3.64 14.92Q1.09 12.1 3.79 9.43L7.75 5.53Q9.6 3.7 12.2 3.7Z",
  // Connected joints: seam endpoints land ON the outline centerline so round
  // caps bury inside the outline's own ink (cap radius == outline half-width
  // at every weight) — a clean joint, never a poke. The girdle uses butt caps
  // so its ends never overshoot the side walls.
  girdle: "M2.4 12.1L29.6 12.1",
  seams: "M14.2 3.7L10 12.1L16 27.15M17.8 3.7L22 12.1L16 27.15",
  // Fill-only cut: one merged path (round junctions), extended past the
  // silhouette on every side so the mask trims full-width soft mouths —
  // butt caps ending ON the edge pinch razor walls (the papercut defect).
  // 1.5u cuts + 1.5u silhouette grow: fill reaches bold's outer edge.
  fillCut:
    "M0 12.1L32 12.1M15.55 1L10 12.1L17 29.7M16.45 1L22 12.1L15 29.7",
  crown: "M14.2 3.7L17.8 3.7L22 12.1L10 12.1Z",
  pavi: "M10 12.1L22 12.1L16 27.15Z",
};
// Shared silhouette — GemLite renders this bare (no interior lines).
export const GEM_SILHOUETTE = P.outer;
export default function GemFriendly({
  size = 20,
  weight = "regular",
  color = "currentColor",
  className = "",
  ...props
}) {
  const sw = { thin: 1, light: 1.5, regular: 2, bold: 3, duotone: 2 }[weight] ?? 2;
  const clipId = "gf" + useId().replace(/:/g, "");
  const common = {
    width: size,
    height: size,
    viewBox: "0 0 32 32",
    className,
    "aria-hidden": "true",
    ...props,
  };
  // — Fill: solid stone, soft facet seams punched as TRUE transparency (mask)
  // — the library-fill language. White paint would render gray over the dark
  // solid. 1.5u round cuts + 1.5u grow: fill reaches bold's outer edge.
  if (weight === "fill") {
    return (
      <svg {...common} fill="none">
        <mask id={clipId}>
          <path d={P.outer} fill="white" stroke="white" strokeWidth="3" />
          <path d={P.fillCut} stroke="black" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </mask>
        <path d={P.outer} fill={color} stroke={color} strokeWidth="3" mask={`url(#${clipId})`} />
      </svg>
    );
  }
  // — Duotone: outline + shaded crown table and pavilion centre (family convention: centre lifts).
  if (weight === "duotone") {
    return (
      <svg {...common} fill="none" stroke={color} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
        <path d={P.outer} />
        <path d={P.crown} fill={color} fillOpacity="0.18" stroke="none" />
        <path d={P.pavi} fill={color} fillOpacity="0.18" stroke="none" />
        <path d={P.girdle} strokeLinecap="butt" />
        <path d={P.seams} />
      </svg>
    );
  }
  // — Thin / Light / Regular / Bold — rounded silhouette + girdle line + two facet seams.
  return (
    <svg {...common} fill="none" stroke={color} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
      <path d={P.outer} />
      <path d={P.girdle} strokeLinecap="butt" />
      <path d={P.seams} />
    </svg>
  );
}
