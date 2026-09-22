/* ADAM/GLASS — src/glass/BottomDock.jsx · floating liquid-glass dock: engine material + track + gem */
// Exports: BottomDock (tab state, engine switch, gem)
import { useEffect, useState } from "react";
import DockLens from "./DockLens.jsx";
import DockSlices from "./DockSlices.jsx";
import DockTrack from "./dock-track.jsx";
import { ENGINE } from "./engine.js";
import Icon from "../components/Icon/Icon.jsx";

/* Phosphor icon mapping — 3 tabs, icon-only (learned over time). */
const ITEMS = [
  { id: "Home", icon: "House", a11y: "Home" },
  { id: "Leads", icon: "Users", a11y: "Leads" },
  { id: "Opps", icon: "Handshake", a11y: "Opportunities" },
];

// — Section — Dock shell —
// Tab state lives here; the track owns pointer input and the app-tab event
// bridges state to the vanilla content. Capsule width/drag math: dock-track.
export default function BottomDock() {
  const [page, setPage] = useState("Opps");
  useEffect(() => { window.dispatchEvent(new CustomEvent("app-tab", { detail: page })); }, [page]);
  return (
    <>
    <div className="tabbar" role="navigation" aria-label="App tabs" data-engine={ENGINE}>
      {ENGINE === "lens" ? <DockLens /> : <DockSlices />}
      <span className="tabbar__tint" aria-hidden="true" />
      <span className="tabbar__rim" aria-hidden="true" />
      <DockTrack items={ITEMS} page={page} onSelect={setPage} />
    </div>
    {/* iOS-style floating gem — right side, above dock */}
    <button className="fab-gem" type="button" aria-label="Gem search" onClick={() => console.log('gem search')}>
      <Icon name="Diamond" size={22} weight="fill" aria-hidden="true" />
    </button>
    </>
  );
}
