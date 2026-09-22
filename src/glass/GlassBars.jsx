/* ADAM/GLASS (device scope) — src/glass/GlassBars.jsx · in-device app bar · TopPills moved to src/shell/top-pills.jsx Phase 4 Task 1 */

// Solid in-flow chrome — no Glass inside the device (Glass SVG filter banded + blurred scroll beneath it).
export function DeviceAppBar() {
  return (
    <div className="app-bar">
      <span className="app-bar__title">ALPHA</span>
      <span className="app-bar__right"><span className="avatar">OA</span></span>
    </div>
  );
}
