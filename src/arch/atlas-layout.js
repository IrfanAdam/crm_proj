/* ADAM/SHARED — src/arch/atlas-layout.js · lane layout [plan:2026-09-22_082844-arch-atlas.md#phase-2] */
// — Exports: layoutLens, lensGraph, canvasSize —
const W = 280;
const H = 48;
const GAP = 16;
// — Section — deterministic lane positions —
export function layoutLens(nodes) {
  const sorted = [...nodes].sort((a, b) => a.id.localeCompare(b.id));
  const pos = new Map();
  sorted.forEach((n, i) => pos.set(n.id, { x: 40, y: 32 + i * (H + GAP), w: W, h: H }));
  return pos;
}
// — Section — lens neighborhood (focus + 1 hop) —
export function lensGraph(atlas, lens) {
  const focus = new Set(atlas.nodes.filter((n) => n.lens === lens).map((n) => n.id));
  const ids = new Set(focus);
  for (const e of atlas.edges) {
    if (focus.has(e.from)) ids.add(e.to);
    if (focus.has(e.to)) ids.add(e.from);
  }
  return {
    nodes: atlas.nodes.filter((n) => ids.has(n.id)),
    edges: atlas.edges.filter((e) => ids.has(e.from) && ids.has(e.to)),
  };
}
// — Section — canvas bounds —
export function canvasSize(pos) {
  let w = 0;
  let h = 0;
  for (const p of pos.values()) {
    w = Math.max(w, p.x + p.w);
    h = Math.max(h, p.y + p.h);
  }
  return { w: w + 40, h: h + 32 };
}
