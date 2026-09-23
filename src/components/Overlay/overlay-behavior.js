/* ADAM/DS — src/components/Overlay/overlay-behavior.js · focus, keys and dwell shared by the overlay engine */
// Exports: focusables(root) · trapTab(e, root) · menuKeys(e, el) · syncExpanded(el, open) · startDwell/stopDwell/wireDwell.
// [plan:2026-09-23_002500-design-system-consolidation.md#phase-4]
const FOCUSABLE = 'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';
const DWELL = 4000;
const DWELL_ACTION = 8000;

export const focusables = (root) => [...root.querySelectorAll(FOCUSABLE)].filter((el) => el.offsetParent !== null);

export function trapTab(e, root) {
  const els = focusables(root);
  if (!els.length) return;
  const first = els[0];
  const last = els[els.length - 1];
  if (e.shiftKey && document.activeElement === first) {
    e.preventDefault();
    last.focus();
  } else if (!e.shiftKey && document.activeElement === last) {
    e.preventDefault();
    first.focus();
  }
}

export function menuKeys(e, el) {
  const items = [...el.querySelectorAll(".menu__item:not(:disabled)")];
  if (!items.length) return;
  const i = items.indexOf(document.activeElement);
  if (e.key === "ArrowDown" || e.key === "ArrowUp") {
    e.preventDefault();
    const step = e.key === "ArrowDown" ? 1 : -1;
    items[(i + step + items.length) % items.length].focus();
  } else if (e.key === "Home" || e.key === "End") {
    e.preventDefault();
    items[e.key === "Home" ? 0 : items.length - 1].focus();
  }
}

export function syncExpanded(el, open) {
  const t = el._trigger;
  if (t && t.hasAttribute("aria-expanded")) t.setAttribute("aria-expanded", open ? "true" : "false");
}

export function stopDwell(el) {
  clearTimeout(el._dwell);
  el._dwell = null;
}

export function startDwell(el) {
  if (el.hidden || el._closing) return;
  stopDwell(el);
  const wait = el.querySelector(".toast__action") ? DWELL_ACTION : DWELL;
  el._dwell = setTimeout(() => {
    if (el._expire) el._expire();
  }, wait);
}

export function wireDwell(el, onExpire) {
  el._expire = onExpire;
  if (el._wired) return;
  el._wired = true;
  el.addEventListener("mouseenter", () => stopDwell(el));
  el.addEventListener("mouseleave", () => startDwell(el));
  el.addEventListener("focusin", () => stopDwell(el));
  el.addEventListener("focusout", () => startDwell(el));
}
