import { useLayoutEffect, useRef } from "react";
import { SLICES, maskFor, transformFor } from "./slices-spec.js";

/* WebKit's glass. Safari won't run the SDF displacement filter on this element, so the
   same bevel is built from what every engine always renders: transform + mask. The
   strip of content is drawn once per rim depth, each copy slid outward by the
   displacement the SDF would apply there and feathered into the next — a stepped lens
   over the live copy, no SVG filter involved. SLICES carries both the straight rims
   (vertical refraction) and the capsule's rounded ends (horizontal refraction), so the
   whole outline lenses instead of only the middle of the top and bottom edges. */
export default function DockSlices({ source = "#app-content" }) {
  const hostRef = useRef(null);
  const lensRef = useRef(null);
  const copies = useRef([]);
  const frame = useRef(0);
  const base = useRef({ l: 0, t: 0, w: 0 });

  // The device is scaled with transform:scale(var(--zoom)) from the canvas, so
  // getBoundingClientRect() returns scaled (screen) px. Geometry written to the
  // DOM copy lives in unscaled local px — divide the rect delta by the zoom.
  // (DockLens already does this; DockSlices missing it showed content from ~140px
  // higher up at the default 80% zoom — the "already scrolled" image in the glass.)
  // Effective visual scale — see DockLens: in app-fullscreen the device is
  // untransformed, so rect deltas are already 1:1 and must NOT be divided.
  const getZoom = () => {
    const d = document.getElementById('device');
    if (!d || getComputedStyle(d).transform === 'none') return 1;
    const s = document.getElementById('canvas-scaler');
    const v = s ? parseFloat(getComputedStyle(s).getPropertyValue('--zoom')) : 1;
    return Number.isFinite(v) && v > 0 ? v : 1;
  };

  const slide = () => {
    frame.current = 0;
    const src = document.querySelector(source);
    if (!src) return;
    const baseY = -src.scrollTop;
    copies.current.forEach((el, i) => {
      if (el) el.style.transform = transformFor(SLICES[i - 1], baseY);
    });
  };

  const place = () => {
    const lens = lensRef.current, src = document.querySelector(source);
    if (!lens || !src) return;
    const z = getZoom();
    const c = src.getBoundingClientRect(), l = lens.getBoundingClientRect();
    base.current = { l: (c.left - l.left) / z, t: (c.top - l.top) / z, w: c.width / z };
    copies.current.forEach((el) => {
      if (!el) return;
      el.style.left = `${base.current.l}px`;
      el.style.top = `${base.current.t}px`;
      el.style.width = `${base.current.w}px`;
    });
    slide();
  };

  useLayoutEffect(() => {
    const lens = lensRef.current, src = document.querySelector(source);
    if (!lens || !src) return;
    lens.textContent = "";
    const build = (slice) => {
      const node = src.cloneNode(true);
      node.removeAttribute("id");
      node.querySelectorAll("[id]").forEach((n) => n.removeAttribute("id"));
      node.setAttribute("aria-hidden", "true");
      node.inert = true;
      const copy = document.createElement("div");
      copy.className = "docklens__copy";
      copy.appendChild(node);
      if (slice) {
        const band = document.createElement("div");
        band.className = "docklens__slice";
        band.dataset.band = slice.band;
        Object.assign(band.style, maskFor(slice));
        if (slice.fringe) band.style.filter = slice.fringe;
        band.appendChild(copy);
        lens.appendChild(band);
      } else {
        lens.appendChild(copy);
      }
      return copy;
    };
    copies.current = [build(null), ...SLICES.map(build)];
    place();
    const rebuild = () => {
      lens.textContent = "";
      copies.current = [build(null), ...SLICES.map(build)];
      place();
    };
    window.addEventListener("app-tab", rebuild);
    const queue = () => { if (!frame.current) frame.current = requestAnimationFrame(slide); };
    // base geometry depends on layout + canvas zoom: re-place (which re-slides),
    // and re-place once more after the .18s zoom scale transition settles, when
    // getBoundingClientRect() and --zoom agree again.
    const queuePlace = () => { if (!frame.current) frame.current = requestAnimationFrame(place); };
    let settleT = 0;
    const queuePlaceSettled = () => { queuePlace(); clearTimeout(settleT); settleT = setTimeout(place, 230); };
    src.addEventListener("scroll", queue, { passive: true });
    window.addEventListener("resize", queuePlace);
    window.addEventListener("scroll", queue, { passive: true });
    const device = document.getElementById("device");
    device?.addEventListener("transitionend", queuePlace);
    const zoomCtl = document.getElementById("ws-proto-stack");
    zoomCtl?.addEventListener("input", queuePlaceSettled);
    zoomCtl?.addEventListener("click", queuePlaceSettled);
    const ro = new ResizeObserver(queue);
    ro.observe(src);
    const ro2 = new ResizeObserver(queuePlace);
    ro2.observe(hostRef.current || lens);
    return () => {
      window.removeEventListener("app-tab", rebuild);
      src.removeEventListener("scroll", queue);
      window.removeEventListener("resize", queuePlace);
      window.removeEventListener("scroll", queue);
      device?.removeEventListener("transitionend", queuePlace);
      zoomCtl?.removeEventListener("input", queuePlaceSettled);
      zoomCtl?.removeEventListener("click", queuePlaceSettled);
      clearTimeout(settleT);
      ro.disconnect(); ro2.disconnect();
      if (frame.current) cancelAnimationFrame(frame.current);
      frame.current = 0; // same guard as DockLens: a cancelled frame must not read as "scheduled"
    };
  }, [source]);

  return (
    <div className="docklens" ref={hostRef} aria-hidden="true">
      <div className="docklens__lens" ref={lensRef} />
    </div>
  );
}
