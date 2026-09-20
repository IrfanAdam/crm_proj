/* The dock's optical chain: frost → SDF refraction → 3-pass RGB dispersion →
   saturation/brightness. Runs on the element itself (filter: url()), which is the
   one refraction path Safari, Chrome and Firefox all render — unlike
   backdrop-filter: url(), which is Chromium-only.

   Two WebKit (Safari) rules this markup has to obey, both learned the hard way:
   1. the <svg> that owns the filter must be inserted BEFORE the element that
      references it, and
   2. <feImage> must already carry its href in the same commit the filter is first
      applied — WebKit resolves a filter reference once and never re-evaluates it,
      so a map that arrives later leaves the element painted unfiltered for good.
   The map is also baked at region size and placed at the region's origin, because
   Chrome and WebKit disagree about how an under-specified feImage stretches. */
export const OPTICS = {
  bleed: 18,
  band: 10,
  pull: 1.0,
  frost: 1.2,
  strength: 3.2,
  dispersion: 0.3,
  saturate: 1.12,
  brightness: 1.01,
};

const CH_R = "1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0";
const CH_G = "0 0 0 0 0  0 1 0 0 0  0 0 0 0 0  0 0 0 1 0";
const CH_B = "0 0 0 0 0  0 0 0 0 0  0 0 1 0 0  0 0 0 1 0";

export function LensFilter({ id, map, w, h }) {
  const scale = OPTICS.strength * 2;
  const box = (v) => Math.max(1, v);
  const bleed = OPTICS.bleed;
  const fe = { x: -bleed, y: -bleed, w: box(w) + bleed * 2, h: box(h) + bleed * 2 };
  return (
    <svg className="docklens__defs" aria-hidden="true" width="0" height="0">
      {/* region as bbox fractions: WebKit renders an explicit userSpaceOnUse region as blank */}
      <filter
        id={id}
        x={-bleed / box(w)}
        y={-bleed / box(h)}
        width={1 + (2 * bleed) / box(w)}
        height={1 + (2 * bleed) / box(h)}
        colorInterpolationFilters="sRGB"
      >
        <feImage href={map || undefined} xlinkHref={map || undefined} x={fe.x} y={fe.y} width={fe.w} height={fe.h} preserveAspectRatio="none" result="map" />
        <feGaussianBlur in="SourceGraphic" stdDeviation={OPTICS.frost} result="frost" />
        <feDisplacementMap in="frost" in2="map" scale={scale * (1 + OPTICS.dispersion)} xChannelSelector="R" yChannelSelector="G" result="dR" />
        <feDisplacementMap in="frost" in2="map" scale={scale} xChannelSelector="R" yChannelSelector="G" result="dG" />
        <feDisplacementMap in="frost" in2="map" scale={scale * (1 - OPTICS.dispersion)} xChannelSelector="R" yChannelSelector="G" result="dB" />
        <feColorMatrix in="dR" type="matrix" values={CH_R} result="cR" />
        <feColorMatrix in="dG" type="matrix" values={CH_G} result="cG" />
        <feColorMatrix in="dB" type="matrix" values={CH_B} result="cB" />
        <feBlend in="cR" in2="cG" mode="screen" result="cRG" />
        <feBlend in="cRG" in2="cB" mode="screen" result="rgb" />
        <feColorMatrix in="rgb" type="saturate" values={OPTICS.saturate} result="sat" />
        <feComponentTransfer in="sat">
          <feFuncR type="linear" slope={OPTICS.brightness} />
          <feFuncG type="linear" slope={OPTICS.brightness} />
          <feFuncB type="linear" slope={OPTICS.brightness} />
        </feComponentTransfer>
      </filter>
    </svg>
  );
}
