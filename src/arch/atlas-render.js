/* ADAM/SHARED — src/arch/atlas-render.js · svg builders [plan:2026-09-22_082844-arch-atlas.md#phase-2] */
// — Exports: renderAtlas, renderDetail —
import { canvasSize } from './atlas-layout.js';
const KINDS = new Set(['contains', 'governs', 'composes']);
// — Section — escaping —
function esc(s) {
  return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
// — Section — edges (bottom-center to top-center elbows) —
function edgePath(e, pos) {
  const a = pos.get(e.from);
  const b = pos.get(e.to);
  if (!a || !b) return '';
  const x1 = a.x + a.w / 2;
  const y1 = a.y + a.h;
  const x2 = b.x + b.w / 2;
  const y2 = b.y;
  const mid = (y1 + y2) / 2;
  return `<path class="atlas-edge" data-kind="${e.kind}" d="M ${x1} ${y1} V ${mid} H ${x2} V ${y2}"><title>${esc(e.label || e.kind)}</title></path>`;
}
// — Section — nodes (type-set cards) —
function nodeCard(n, pos) {
  const p = pos.get(n.id);
  if (!p) return '';
  const sub = (n.detail || '').split(',')[0].slice(0, 30);
  const stale = n.stale ? `<text class="atlas-stale" x="${p.x + 14}" y="${p.y + p.h - 8}">⚠ stale — regen atlas</text>` : '';
  return `<g><title>${esc(n.title)} — ${esc(n.source)}</title><rect class="atlas-node" data-id="${esc(n.id)}"${n.stale ? ' data-stale="true"' : ''} x="${p.x}" y="${p.y}" width="${p.w}" height="${p.h}" rx="10" tabindex="0" role="button" aria-label="${esc(n.title)}${n.stale ? ' (stale)' : ''}"/><text class="atlas-label" x="${p.x + 14}" y="${p.y + 20}">${esc(n.title)}</text><text class="atlas-sub" x="${p.x + 14}" y="${p.y + 36}">${esc(sub || n.source)}</text>${stale}</g>`;
}
// — Section — atlas svg + detail —
export function renderAtlas(nodes, pos, edges) {
  const size = canvasSize(pos);
  const paths = edges.filter((e) => KINDS.has(e.kind)).map((e) => edgePath(e, pos)).join('');
  const cards = nodes.map((n) => nodeCard(n, pos)).join('');
  return `<svg viewBox="0 0 ${size.w} ${size.h}" role="presentation"><g class="atlas-world">${paths}${cards}</g></svg>`;
}
export function renderDetail(node) {
  if (!node) return '<p>Pick a node to read its contract.</p>';
  return `<h3>${esc(node.title)}</h3><p>${esc(node.detail || 'No contract recorded yet.')}</p><p>Source: <code>${esc(node.source)}</code></p>`;
}
