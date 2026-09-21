/* ADAM/PAGE — src/patterns/OppsHome/map-flights.js · widget ↔ sheet element continuity */
// Export map: flyPill · flyPillBack
import { CLOSE_MS, OPEN_MS } from "./sheet-morph.js";
import { driveExpand } from "./pill-expand.js";
// — the open's hand-off: the widget's pill grows into the sheet's card —
export function flyPill(screen, sheet) {
  driveExpand(screen, sheet, 1, OPEN_MS);
}
/* — the close's hand-off: the card shrinks back onto the pill before the sheet hides, — */
/* — so the feed's pill is never seen popping in under the map. — */
export function flyPillBack(screen, sheet) {
  driveExpand(screen, sheet, -1, CLOSE_MS);
}
