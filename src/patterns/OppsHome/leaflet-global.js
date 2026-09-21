/* ADAM/PAGE — src/patterns/OppsHome/leaflet-global.js · Leaflet on window for global-script plugins */
// Export map: L (default)
// leaflet-rotate ships as a global-script plugin (its dist reads window.L and imports
// nothing), so this module must evaluate BEFORE "leaflet-rotate" is imported: list it
// first in the importer's import block — ESM runs a dependency's body before the next one.
import L from "leaflet";
if (typeof window !== "undefined") window.L = L;
export default L;
