/* ADAM/DS — src/components/Icon/GemLite.jsx · silhouette-only gem — extremely minimal */
// Same friendly silhouette as gem-friendly, no girdle, no facet seams, no
// mask — fill is a pure solid. Same weight API as Phosphor.
import { GEM_SILHOUETTE } from "./GemFriendly.jsx";
export default function GemLite({
  size = 20,
  weight = "regular",
  color = "currentColor",
  className = "",
  ...props
}) {
  const sw = { thin: 1, light: 1.5, regular: 2, bold: 3, duotone: 2 }[weight] ?? 2;
  const common = {
    width: size,
    height: size,
    viewBox: "0 0 32 32",
    className,
    "aria-hidden": "true",
    ...props,
  };
  // — Fill: pure solid silhouette grown 1.5u to reach bold's outer edge —
  // nothing to punch, no mask.
  if (weight === "fill") {
    return (
      <svg {...common} fill="none">
        <path d={GEM_SILHOUETTE} fill={color} stroke={color} strokeWidth="3" />
      </svg>
    );
  }
  // — Duotone: outline + soft solid wash (no lines anywhere).
  if (weight === "duotone") {
    return (
      <svg {...common} fill="none" stroke={color} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
        <path d={GEM_SILHOUETTE} />
        <path d={GEM_SILHOUETTE} fill={color} fillOpacity="0.15" stroke="none" />
      </svg>
    );
  }
  // — Thin / Light / Regular / Bold — bare silhouette.
  return (
    <svg {...common} fill="none" stroke={color} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
      <path d={GEM_SILHOUETTE} />
    </svg>
  );
}
