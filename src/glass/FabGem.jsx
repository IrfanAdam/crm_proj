/* ADAM/GLASS — src/glass/FabGem.jsx · floating gem action — gooey spring blob (see fab-spring.js) */
import { useEffect, useRef } from "react";
import { attachGooey } from "./fab-spring.js";
import Icon from "../components/Icon/Icon.jsx";

// Tap keeps the action; a drag lets the blob lag, stretch and wobble home,
// and its trailing click is swallowed via the dataset flag fab-spring sets.
export default function FabGem() {
  const ref = useRef(null);
  useEffect(() => attachGooey(ref.current).detach, []);
  return (
    <button
      ref={ref}
      className="fab-gem"
      type="button"
      aria-label="Gem search"
      onClick={(e) => { if (!e.currentTarget.dataset.fabMoved) console.log("gem search"); }}
    >
      <Icon name="gem-minimal" size={24} weight="regular" aria-hidden="true" />
    </button>
  );
}
