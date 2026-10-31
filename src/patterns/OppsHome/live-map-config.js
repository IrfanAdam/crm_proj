/* ADAM/PAGE — src/patterns/OppsHome/live-map-config.js · map constants (Mumbai home) */
// Export map: HOME · ZOOM · HEADING · BEARING · TILES · HOTSPOT_M · PULSE_MS · K_MIN · T0 · RING_MS · REHOME_GLIDE_S · REHOME_GLIDE_SLOW_S
// Mumbai home — zoomed out to city level (was street-level dummy grid)
export const HOME = [19.0759, 72.8777];
export const ZOOM = 12;
// mock compass heading (phone-sensor stand-in). The map is oriented HEADING-UP, so this
// direction — not map north — is what points to the top of the frame, and the blip arrow
// (which reads screen-up) is the user's north.
export const HEADING = 215;
export const BEARING = 360 - HEADING;   // map rotation that puts HEADING at screen-up
export const TILES = "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}";
export const HOTSPOT_M = 2000;   // coverage radius drawn around HOME
export const PULSE_MS = 2600;    // radius breath cycle
export const K_MIN = 0.74;       // the breath contracts to this share of the radius
export const T0 = performance.now();   // one clock for every map's breath + ring, so the widget and
export const RING_MS = 1800;    // the sheet are in phase when the morph hands over
// — home-glide length (s): pan + zoom on one monotonic ease-out-expo — fast
// launch, long soft tail, no overshoot reversal (the reversal read as judder) —
export const REHOME_GLIDE_S = 0.9;
// — minimise glides slower: the morph-back covers the first half, so the tail is
// still playing when the widget is revealed — the settle stays visible —
export const REHOME_GLIDE_SLOW_S = 1.4;
