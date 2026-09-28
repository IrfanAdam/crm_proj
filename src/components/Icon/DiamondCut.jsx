/* ADAM/DS — src/components/Icon/DiamondCut.jsx · diamond derivative — cut-facet */
// [plan:2026-09-28_000000-lump-sum-builds.md#phase-1] · distinctly different diamond with same weight API.
export default function DiamondCut({
  size = 20,
  weight = "regular",
  color = "currentColor",
  className = "",
  ...props
}) {
  const sw = { thin: 1, light: 1.2, regular: 1.5, bold: 2, duotone: 1.5 }[weight] ?? 1.5;
  const common = {
    width: size,
    height: size,
    viewBox: "0 0 32 32",
    className,
    "aria-hidden": "true",
    ...props,
  };
  // — Fill: solid outer + white-glazed table so it stays distinct from plain Diamond fill.
  if (weight === "fill") {
    return (
      <svg {...common} fill="none">
        <path d="M16 2.5 29.5 16 16 29.5 2.5 16Z" fill={color} />
        <path
          d="M16 9 22.5 16 16 23 9.5 16Z"
          fill="white"
          fillOpacity="0.28"
          stroke="white"
          strokeOpacity="0.45"
          strokeWidth={1}
          strokeLinejoin="round"
        />
        <path
          d="M16 2.5 16 9M29.5 16 22.5 16M16 29.5 16 23M2.5 16 9.5 16"
          stroke="white"
          strokeOpacity="0.55"
          strokeWidth={1}
          strokeLinecap="round"
        />
      </svg>
    );
  }
  // — Duotone: outline + 20% table
  if (weight === "duotone") {
    return (
      <svg {...common} fill="none" stroke={color} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
        <path d="M16 2.5 29.5 16 16 29.5 2.5 16Z" />
        <path d="M16 9 22.5 16 16 23 9.5 16Z" opacity="0.2" fill={color} stroke="none" />
        <path d="M16 9 22.5 16 16 23 9.5 16Z" />
        <path d="M16 2.5 16 9M29.5 16 22.5 16M16 29.5 16 23M2.5 16 9.5 16" />
      </svg>
    );
  }
  // — Thin / Light / Regular / Bold — faceted outline (outer + table + 4 spokes)
  return (
    <svg {...common} fill="none" stroke={color} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 2.5 29.5 16 16 29.5 2.5 16Z" />
      <path d="M16 9 22.5 16 16 23 9.5 16Z" />
      <path d="M16 2.5 16 9M29.5 16 22.5 16M16 29.5 16 23M2.5 16 9.5 16" />
    </svg>
  );
}
