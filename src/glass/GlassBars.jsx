import { Glass } from "@samasante/liquid-glass";
import { useState, useEffect } from "react";

const TOP_OPTICS = { frost: 4, dispersion: 0.042, strength: 0.09, depth: 0.38, curvature: 0.32, saturate: 1.04, brightness: -0.02, specular: 0.12, sheen: 0.07, glow: 0.03, bend: 0.34 };

export function TopPills() {
  const [active, setActive] = useState(() => (location.hash === "#architecture" ? "architecture" : "prototype"));
  useEffect(() => {
    const panels = { prototype: document.getElementById("panel-prototype"), architecture: document.getElementById("panel-architecture") };
    Object.entries(panels).forEach(([k, el]) => { if (el) el.hidden = k !== active; });
    document.querySelectorAll(".pill-tab").forEach((b) => b.setAttribute("aria-selected", String(b.dataset.tab === active)));
    history.replaceState(null, "", `#${active}`);
  }, [active]);
  return (
    <Glass radius={9999} optics={TOP_OPTICS} style={{ background: "color-mix(in srgb, var(--bg-surface) 10%, transparent)", borderRadius: 9999, padding: 4, border: "1px solid color-mix(in srgb, white 28%, transparent)", boxShadow: "0 4px 18px rgba(0,0,0,0.08), inset 0 1px 0 rgba(255,255,255,0.52)" }}>
      <div className="shell-tabs" role="tablist" aria-label="Sections" style={{ display: "inline-flex", gap: 6 }}>
        <button className="pill-tab" role="tab" data-tab="prototype" aria-selected={active === "prototype"} onClick={() => setActive("prototype")}>Prototype</button>
        <button className="pill-tab" role="tab" data-tab="architecture" aria-selected={active === "architecture"} onClick={() => setActive("architecture")}>Architecture</button>
      </div>
    </Glass>
  );
}

// Solid in-flow chrome — no Glass inside the device (Glass SVG filter banded + blurred scroll beneath it).
export function DeviceAppBar() {
  return (
    <div className="app-bar">
      <span className="app-bar__title">ALPHA</span>
      <span className="app-bar__right"><span className="avatar">OA</span></span>
    </div>
  );
}

