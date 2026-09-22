let decl = null;
const cache = new Map();
function styleDecl() {
  if (!decl) decl = getComputedStyle(document.documentElement);
  return decl;
}
export function token(n) {
  let v = cache.get(n);
  if (v === undefined) {
    try {
      v = styleDecl().getPropertyValue(n).trim();
    } catch {
      v = '';
    }
    if (!v && n !== '--stone-900') v = token('--stone-900');
    cache.set(n, v);
  }
  return v;
}
export function clearTokenCache() {
  cache.clear();
  decl = null;
}
try {
  new MutationObserver(() => clearTokenCache()).observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['data-theme', 'class', 'style'],
  });
} catch {}
