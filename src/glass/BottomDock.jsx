import { useRef, useState } from "react";
import DockLens from "./DockLens.jsx";
import DockSlices from "./DockSlices.jsx";
import { ENGINE } from "./engine.js";

const ITEMS = [{ id: "Home", icon: "◈" }, { id: "Reports", icon: "▦" }, { id: "Leads", icon: "◇" }, { id: "Opps", icon: "⬡" }, { id: "Accounts", icon: "○" }];

/* Floating liquid-glass dock. Pointer input lives on the track (buttons stay
   pointer-events:none so drag never loses the gesture); the capsule is a glass
   pill that swells on press, squashes with drag velocity, and snaps on release. */
export default function BottomDock() {
  const [page, setPage] = useState("Home");
  const trackRef = useRef(null), startX = useRef(0), startIdx = useRef(0), lastX = useRef(0), lastT = useRef(0);
  const [dragX, setDragX] = useState(0), [dragging, setDragging] = useState(false), [pressed, setPressed] = useState(false), [vel, setVel] = useState(0);
  const idx = Math.max(0, ITEMS.findIndex((i) => i.id === page));
  const tabW = () => (trackRef.current ? trackRef.current.offsetWidth / ITEMS.length : 70);
  const onDown = (e) => {
    if (e.button !== undefined && e.button !== 0) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    startX.current = e.clientX; startIdx.current = idx; lastX.current = e.clientX; lastT.current = performance.now();
    e.currentTarget.style.cursor = "grabbing";
    setPressed(true);
  };
  const onMove = (e) => {
    if (!pressed) return;
    const w = tabW();
    const dx = Math.max(-startIdx.current * w, Math.min((ITEMS.length - 1 - startIdx.current) * w, e.clientX - startX.current));
    const now = performance.now(), dt = Math.max(1, now - lastT.current);
    setVel((e.clientX - lastX.current) / dt); lastX.current = e.clientX; lastT.current = now;
    if (Math.abs(dx) > 4) setDragging(true);
    setDragX(dx);
  };
  const onUp = (e) => {
    if (!pressed) return;
    setPressed(false); setDragging(false);
    e.currentTarget.style.cursor = "grab";
    const w = tabW();
    const rail = trackRef.current ? trackRef.current.getBoundingClientRect().left : 0;
    // tap (< 6px travel) picks the tab under the finger; drag snaps to the nearest
    const next = Math.abs(dragX) < 6 ? Math.floor((e.clientX - rail) / w) : Math.round(startIdx.current + dragX / w);
    setPage(ITEMS[Math.max(0, Math.min(ITEMS.length - 1, next))].id);
    setDragX(0); setVel(0);
  };
  const stretch = dragging ? Math.min(Math.abs(vel) * 18, 0.18) : 0;
  const state = dragging ? "live" : pressed ? "press" : "rest";
  // the tab the capsule is currently over — it lights up as the pill arrives (native behaviour)
  const hot = dragging ? Math.max(0, Math.min(ITEMS.length - 1, Math.round(startIdx.current + dragX / tabW()))) : idx;
  return (
    <div className="tabbar" role="navigation" aria-label="App tabs" data-engine={ENGINE}>
      {ENGINE === "lens" ? <DockLens /> : <DockSlices />}
      <span className="tabbar__tint" aria-hidden="true" />
      <span className="tabbar__rim" aria-hidden="true" />
      <div ref={trackRef} className="tabbar__track" onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}>
        <div
          aria-hidden="true"
          className="tabbar__capsule"
          data-glass={state}
          style={{ transform: `translateX(calc(${idx * 100}% + ${dragX}px))`, transition: dragging ? "none" : undefined, "--sweep": Math.max(-1, Math.min(1, vel * 0.4)) }}
        >
          <span className="tabbar__capsule-glass" style={{ transform: `scale(${1 + stretch}, ${1 - stretch * 0.55})`, transition: dragging ? "none" : undefined }} />
        </div>
        <nav className="tabbar__nav">
          {ITEMS.map((it, i) => (
            <button key={it.id} type="button" className="tabbar__item" aria-current={page === it.id ? "page" : undefined} data-hot={i === hot ? "" : undefined} onClick={() => setPage(it.id)} style={{ pointerEvents: "none" }}>
              <span className="icon" aria-hidden="true">{it.icon}</span>{it.id}
            </button>
          ))}
        </nav>
      </div>
    </div>
  );
}
