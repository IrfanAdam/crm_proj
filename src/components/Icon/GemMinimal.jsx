/* ADAM/DS — src/components/Icon/GemMinimal.jsx · floating-facet gem — minimal with interior lines */
// Same friendly silhouette as gem-friendly, but every interior line stops
// short of the outline: the girdle and facet seams float, never touching the
// bound line. Same weight API as Phosphor.
import { useId } from "react";
import { GEM_SILHOUETTE } from "./GemFriendly.jsx";
// Interior lines — the girdle floats well off the outline on every side (regular
// ends sit ~4.5u off the side-wall centerlines ≈ 2.5u of clear air once ink lands;
// bold's 3u strokes eat ~1u more per side, so it gets its own deeper-set chord).
// The pavilion legs run down to meet at the tip (a buried joint, cap radius ==
// outline half-width, so no poke). One connected floating network, one anchor.
export const GEM_MINIMAL_GIRDLE =
  "M7 12.1L25 12.1";
export const GEM_MINIMAL_GIRDLE_BOLD =
  "M8.2 12.1L23.8 12.1";
export const GEM_MINIMAL_SEAMS =
  "M12.6 7.2L10 12.1L16 27.15M19.4 7.2L22 12.1L16 27.15";
const cutFor = (w) =>
  ((w === "bold" || w === "fill") ? GEM_MINIMAL_GIRDLE_BOLD : GEM_MINIMAL_GIRDLE) + GEM_MINIMAL_SEAMS;
export default function GemMinimal({
  size = 20,
  weight = "regular",
  color = "currentColor",
  className = "",
  ...props
}) {
  const sw = { thin: 1, light: 1.5, regular: 2, bold: 3, duotone: 2 }[weight] ?? 2;
  const clipId = "gm" + useId().replace(/:/g, "");
  const common = {
    width: size,
    height: size,
    viewBox: "0 0 32 32",
    className,
    "aria-hidden": "true",
    ...props,
  };
  // — Fill: solid stone, floating facet seams punched as TRUE transparency
  // (mask) — cuts float inside the fill, round caps, no silhouette crossing.
  if (weight === "fill") {
    return (
      <svg {...common} fill="none">
        <mask id={clipId}>
          <path d={GEM_SILHOUETTE} fill="white" stroke="white" strokeWidth="3" />
          <path d={cutFor(weight)} stroke="black" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </mask>
        <path d={GEM_SILHOUETTE} fill={color} stroke={color} strokeWidth="3" mask={`url(#${clipId})`} />
      </svg>
    );
  }
  // — Duotone: outline + shaded crown table and pavilion centre + floating seams.
  if (weight === "duotone") {
    return (
      <svg {...common} fill="none" stroke={color} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
        <path d={GEM_SILHOUETTE} />
        <path d="M14.2 3.7L17.8 3.7L22 12.1L10 12.1Z" fill={color} fillOpacity="0.18" stroke="none" />
        <path d="M10 12.1L22 12.1L16 27.15Z" fill={color} fillOpacity="0.18" stroke="none" />
        <path d={weight === "bold" ? GEM_MINIMAL_GIRDLE_BOLD : GEM_MINIMAL_GIRDLE} />
        <path d={GEM_MINIMAL_SEAMS} />
      </svg>
    );
  }
  // — Thin / Light / Regular / Bold — silhouette + floating girdle + floating seams.
  return (
    <svg {...common} fill="none" stroke={color} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
      <path d={GEM_SILHOUETTE} />
      <path d={weight === "bold" ? GEM_MINIMAL_GIRDLE_BOLD : GEM_MINIMAL_GIRDLE} />
      <path d={GEM_MINIMAL_SEAMS} />
    </svg>
  );
}
