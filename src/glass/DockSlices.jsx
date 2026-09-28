import { useLayoutEffect, useRef } from "react";
import { SLICES, transformFor } from "./slices-spec.js";
import { buildCopies } from "./slice-bands.jsx";
import { buildBand, placeBand } from "./band-mirror.js";
import { getZoom, toLayout } from "./rect-zoom.js";

/* WebKit's glass: no SDF filter here — the bevel is transform + mask over the live
   copy, each rim-depth copy slid outward as the SDF would displace it and feathered
   into the next. SLICES covers straight rims + rounded ends; no SVG filter involved. */
export default function DockSlices({ source = "#app-content" }) {
  const hostRef = useRef(null);
  const lensRef = useRef(null);
  const copies = useRef([]);
  const band = useRef(null);
  const frame = useRef(0);
  const base = useRef({ l: 0, t: 0, w: 0 });

  const slide = () => {
    frame.current = 0;
    const src = document.querySelector(source);
    if (!src) return;
    const baseY = -src.scrollTop;
    copies.current.forEach((el, i) => {
      if (el) el.style.transform = transformFor(SLICES[i - 1], baseY);
    });
    placeBand(band.current, lensRef.current, src);
  };

  const place = () => {
    const lens = lensRef.current, src = document.querySelector(source);
    if (!lens || !src) return;
    const c = src.getBoundingClientRect(), l = lens.getBoundingClientRect();
    base.current = toLayout({ l: c.left - l.left, t: c.top - l.top, w: c.width }, getZoom());
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
    copies.current = buildCopies(lens, src);
    band.current = buildBand(src);
    lens.appendChild(band.current);
    place();
    const rebuild = () => {
      lens.textContent = "";
      copies.current = buildCopies(lens, src);
      band.current = buildBand(src);
      lens.appendChild(band.current);
      place();
    };
    window.addEventListener("app-tab", rebuild);
    const queue = () => { if (!frame.current) frame.current = requestAnimationFrame(slide); };
    // base geometry depends on layout + zoom: re-place (which re-slides), plus once
    // more after the .18s zoom transition settles, when rects and --zoom agree again.
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
