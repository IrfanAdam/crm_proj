/* ADAM/PAGE — src/patterns/OppsHome/leaflet-lazy.js · Leaflet on first mount [plan:2026-09-22_122850-museum-refactor.md#phase-8] */
// Export map: leaflet · pinIcon · meIcon
// leaflet-rotate is a global-script plugin (reads window.L, imports nothing),
// so window.L is set before it evaluates — the awaits below run in order.
let L = null;
export async function leaflet() {
  if (L) return L;
  const m = await import('leaflet');
  L = m.default;
  if (typeof window !== 'undefined') window.L = L;
  await import('leaflet-rotate');
  await import('leaflet/dist/leaflet.css');
  return L;
}
// — call leaflet() first: these read the cached instance —
export const pinIcon = (n) => L.divIcon({
  className: 'opps__leafpin',
  html: `<span class="opps__pin opps__pin--static">${n}</span>`,
  iconSize: [30, 30],
  iconAnchor: [15, 15],
});
export const meIcon = () => L.divIcon({
  className: 'opps__me-wrap',
  html: '<span class="opps__me"><svg class="opps__me-arrow" viewBox="0 0 24 24" aria-hidden="true">'
    + '<path d="M12 2.4 19.6 21 12 16.4 4.4 21Z"/></svg></span>',
  iconSize: [28, 28],
  iconAnchor: [14, 14],
});
