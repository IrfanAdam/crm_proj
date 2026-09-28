/* ADAM/DS — src/components/Icon/SketchCut.jsx · sketch-logo derivative — cluster-cut */
// [plan:2026-09-28_000000-lump-sum-builds.md#phase-1] · 4-diamond cluster derived from diamonds-four, same weight API.
export default function SketchCut({
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
  // — Cluster geometry: outer frame + 4 small diamonds (top/right/bottom/left)
  const outer = "M16 2.5 29.5 16 16 29.5 2.5 16Z";
  const t = "M16 6 19.5 9.5 16 13 12.5 9.5Z";
  const r = "M22.5 12.5 26 16 22.5 19.5 19 16Z";
  const b = "M16 19 19.5 22.5 16 26 12.5 22.5Z";
  const l = "M9.5 12.5 13 16 9.5 19.5 6 16Z";
  if (weight === "fill") {
    return (
      <svg {...common} fill="none">
        <path d={outer} fill={color} />
        <path d={t} fill="white" fillOpacity="0.32" stroke="white" strokeOpacity="0.5" strokeWidth={1} strokeLinejoin="round" />
        <path d={r} fill="white" fillOpacity="0.32" stroke="white" strokeOpacity="0.5" strokeWidth={1} strokeLinejoin="round" />
        <path d={b} fill="white" fillOpacity="0.32" stroke="white" strokeOpacity="0.5" strokeWidth={1} strokeLinejoin="round" />
        <path d={l} fill="white" fillOpacity="0.32" stroke="white" strokeOpacity="0.5" strokeWidth={1} strokeLinejoin="round" />
        <path d="M16 13 19 16 16 19.5 12.5 16Z" fill="white" fillOpacity="0.18" />
      </svg>
    );
  }
  if (weight === "duotone") {
    return (
      <svg {...common} fill="none" stroke={color} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
        <path d={outer} />
        <g opacity="0.22" fill={color} stroke="none">
          <path d={t} /><path d={r} /><path d={b} /><path d={l} />
        </g>
        <path d={t} /><path d={r} /><path d={b} /><path d={l} />
        <path d="M16 13 19 16 16 19.5 13 16Z" opacity="0.14" fill={color} stroke="none" />
      </svg>
    );
  }
  return (
    <svg {...common} fill="none" stroke={color} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
      <path d={outer} />
      <path d={t} /><path d={r} /><path d={b} /><path d={l} />
      <path d="M16 13 19 16 16 19 12.5 16Z" />
    </svg>
  );
}
