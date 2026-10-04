/* ADAM/GLASS — src/glass/FabGem.jsx · floating gem action — the shared gooey drive (src/motion/gooey.js) */
import { useEffect, useRef } from "react";
import { attachGooey } from "../motion/gooey.js";
import Icon from "../components/Icon/Icon.jsx";

// Tap keeps the action; a drag gives the blob its elastic strain and wobbles home,
// and the trailing click of a drag is swallowed via the data-gooey-moved flag.
export default function FabGem() {
  const ref = useRef(null);
  useEffect(() => attachGooey(ref.current).detach, []);
  return (
    <button
      ref={ref}
      className="fab-gem"
      type="button"
      aria-label="Gem search"
      onClick={(e) => { if (!e.currentTarget.dataset.gooeyMoved) console.log("gem search"); }}
    >
      <Icon name="gem-minimal" size={24} weight="regular" aria-hidden="true" />
    </button>
  );
}
