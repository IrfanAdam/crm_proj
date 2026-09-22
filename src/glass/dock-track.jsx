/* ADAM/GLASS — src/glass/dock-track.jsx · dock track: capsule + tap/drag tab switching */
// Exports: DockTrack (track, glass capsule, icon nav)
import { useRef, useState } from "react";
import { getZoom } from "./rect-zoom.js";
import Icon from "../components/Icon/Icon.jsx";

// — Section — Track component —
// Pointer input lives on the track (buttons stay pointer-events:none so drag
// never loses the gesture). The capsule is a glass pill: width always
// 100/items.length%, swells on press, squashes with drag velocity, snaps on
// release. Hit math is pure visual (rect widths); the capsule offset converts
// visual drag to layout via /getZoom().
export default function DockTrack({ items, page, onSelect }) {
  const trackRef = useRef(null);
  const startX = useRef(0), startIdx = useRef(0), lastX = useRef(0), lastT = useRef(0);
  const [dragX, setDragX] = useState(0), [dragging, setDragging] = useState(false);
  const [pressed, setPressed] = useState(false), [vel, setVel] = useState(0);
  const idx = Math.max(0, items.findIndex((i) => i.id === page));
  // visual tab width (accounts for canvas --zoom scale); offsetWidth is layout and breaks at 80%
  const tabW = () => {
    const r = trackRef.current?.getBoundingClientRect();
    return r && r.width ? r.width / items.length : 70;
  };
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
    const lo = -startIdx.current * w;
    const hi = (items.length - 1 - startIdx.current) * w;
    const dx = Math.max(lo, Math.min(hi, e.clientX - startX.current));
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
    const tap = Math.abs(dragX) < 6;
    const next = tap ? Math.floor((e.clientX - rail) / w) : Math.round(startIdx.current + dragX / w);
    onSelect(items[Math.max(0, Math.min(items.length - 1, next))].id);
    setDragX(0); setVel(0);
  };
  const stretch = dragging ? Math.min(Math.abs(vel) * 18, 0.18) : 0;
  const state = dragging ? "live" : pressed ? "press" : "rest";
  const hot = dragging ? Math.max(0, Math.min(items.length - 1, Math.round(startIdx.current + dragX / tabW()))) : idx;
  return (
    <div ref={trackRef} className="tabbar__track" onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}>
      <div
        aria-hidden="true"
        className="tabbar__capsule"
        data-glass={state}
        style={{
          width: `${100 / items.length}%`,
          transform: `translateX(calc(${idx * 100}% + ${dragX / getZoom()}px))`,
          transition: dragging ? "none" : undefined,
          "--sweep": Math.max(-1, Math.min(1, vel * 0.4)),
        }}
      >
        <span
          className="tabbar__capsule-glass"
          style={{
            transform: `scale(${1 + stretch}, ${1 - stretch * 0.55})`,
            transition: dragging ? "none" : undefined,
          }}
        />
      </div>
      <nav className="tabbar__nav">
        {items.map((it, i) => {
          const isActive = page === it.id || i === hot;
          return (
            <button
              key={it.id}
              type="button"
              className="tabbar__item"
              aria-label={it.a11y}
              aria-current={page === it.id ? "page" : undefined}
              data-hot={i === hot ? "" : undefined}
              onClick={() => onSelect(it.id)}
              style={{ pointerEvents: "none" }}
            >
              <Icon name={it.icon} size={24} weight={isActive ? "fill" : "regular"} aria-hidden="true" />
            </button>
          );
        })}
      </nav>
    </div>
  );
}
