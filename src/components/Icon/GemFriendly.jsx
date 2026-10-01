/* ADAM/DS — src/components/Icon/GemFriendly.jsx · sketch-logo derivative — friendly gem */
// [plan:2026-09-28_000000-lump-sum-builds.md#phase-2] · rounded sketch-logo gem, same weight API as Phosphor.
import { useId } from "react";
const P = {
  outer:
    "M12.2 3.7L19.8 3.7Q22.4 3.7 24.25 5.53L28.21 9.43Q30.91 12.1 28.36 14.92L18.55 25.74Q16 28.56 13.45 25.74L3.64 14.92Q1.09 12.1 3.79 9.43L7.75 5.53Q9.6 3.7 12.2 3.7Z",
  girdle: "M2.4 12.1L29.6 12.1",
  seams: "M14.2 3.7L10 12.1L16 27.15M17.8 3.7L22 12.1L16 27.15",
  crown: "M14.2 3.7L17.8 3.7L22 12.1L10 12.1Z",
  pavi: "M10 12.1L22 12.1L16 27.15Z",
};
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
  // — Fill: solid stone, facet seams punched as TRUE transparency (mask) — the
  // library-fill language. White paint would render gray over the dark solid.
  if (weight === "fill") {
    return (
      <svg {...common} fill="none">
        <mask id={clipId}>
          <path d={P.outer} fill="white" />
          <path d={P.girdle} stroke="black" strokeWidth="2" strokeLinecap="butt" />
          <path d={P.seams} stroke="black" strokeWidth="2" strokeLinecap="butt" strokeLinejoin="round" />
        </mask>
        <path d={P.outer} fill={color} mask={`url(#${clipId})`} />
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
        <path d={P.girdle} />
        <path d={P.seams} />
      </svg>
    );
  }
  // — Thin / Light / Regular / Bold — rounded silhouette + girdle line + two facet seams.
  return (
    <svg {...common} fill="none" stroke={color} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
      <path d={P.outer} />
      <path d={P.girdle} />
      <path d={P.seams} />
    </svg>
  );
}
