/* ADAM/SHELL — src/shell/top-pills.jsx · workspace section pills (Prototype/Architecture) · moved verbatim from GlassBars.jsx Phase 4 Task 1 */
import { Glass } from "@samasante/liquid-glass";
import { useState, useEffect } from "react";
import { TOP_OPTICS } from "../glass/optics.js";


export function TopPills() {
  const [active, setActive] = useState(() => (location.hash === "#architecture" ? "architecture" : "prototype"));
  useEffect(() => {
    const panels = { prototype: document.getElementById("panel-prototype"), architecture: document.getElementById("panel-architecture") };
    Object.entries(panels).forEach(([k, el]) => { if (el) el.hidden = k !== active; });
    const leftProto = document.getElementById("ws-proto-stack");
    const leftArch = document.getElementById("ws-arch-stack");
    if (leftProto) leftProto.hidden = active !== "prototype";
    if (leftArch) leftArch.hidden = active !== "architecture";
    document.querySelectorAll(".pill-tab").forEach((b) => {
      const on = b.dataset.tab === active;
      b.setAttribute("aria-selected", String(on));
      if (on) {
        b.setAttribute("data-transit", "true");
        setTimeout(() => b.removeAttribute("data-transit"), 280);
      } else b.removeAttribute("data-transit");
    });
    history.replaceState(null, "", `#${active}`);
  }, [active]);
  return (
    <Glass
      radius={9999}
      optics={TOP_OPTICS}
      style={{
        background: "color-mix(in srgb, var(--bg-surface) 38%, transparent)",
        borderRadius: 9999,
        padding: 4,
        border: "1px solid color-mix(in srgb, white 34%, transparent)",
        boxShadow: "0 8px 28px rgba(15,16,21,0.10), 0 1px 2px rgba(15,16,21,0.06)",
        width: "100%",
      }}
    >
      <div className="shell-tabs" role="tablist" aria-label="Sections" style={{ display: "inline-flex", gap: 6, width: "100%", justifyContent: "center" }}>
        <button className="pill-tab" role="tab" data-tab="prototype" aria-selected={active === "prototype"} onClick={() => setActive("prototype")} style={{ flex: 1 }}>Prototype</button>
        <button className="pill-tab" role="tab" data-tab="architecture" aria-selected={active === "architecture"} onClick={() => setActive("architecture")} style={{ flex: 1 }}>Architecture</button>
      </div>
    </Glass>
  );
}
