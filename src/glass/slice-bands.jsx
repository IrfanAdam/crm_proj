/* ADAM/GLASS — src/glass/slice-bands.jsx · per-band copy/mask rendering for the slices engine */
// Exports: buildCopies (base copy + masked band clones)
import { SLICES, maskFor } from "./slices-spec.js";

// — Section — Copy construction —
// One masked clone per SLICES entry plus the aligned base copy: each band copy
// is slid outward by the displacement the SDF would apply at that depth and
// feathered into the next. Callers clear the lens first; this only constructs.
export function buildCopies(lens, src) {
  const build = (slice) => {
    const node = src.cloneNode(true);
    node.removeAttribute("id");
    node.querySelectorAll("[id]").forEach((n) => n.removeAttribute("id"));
    node.setAttribute("aria-hidden", "true");
    node.inert = true;
    const copy = document.createElement("div");
    copy.className = "docklens__copy";
    copy.appendChild(node);
    if (slice) {
      const band = document.createElement("div");
      band.className = "docklens__slice";
      band.dataset.band = slice.band;
      Object.assign(band.style, maskFor(slice));
      if (slice.fringe) band.style.filter = slice.fringe;
      band.appendChild(copy);
      lens.appendChild(band);
    } else {
      lens.appendChild(copy);
    }
    return copy;
  };
  return [build(null), ...SLICES.map(build)];
}
