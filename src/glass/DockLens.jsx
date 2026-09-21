import { Fragment, useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { makeLensMap } from "./lens-map.js";
import { LensFilter, OPTICS } from "./lens-filter.jsx";

/* The dock's material. A live copy of the screen content is parked inside the dock,
   clamped to its shape, and slid 1:1 with the scroll — then the SVG lens refracts it.
   React never re-renders for this; geometry is written straight to the DOM so the
   glass tracks scroll at 60fps. Base offsets are measured on layout changes only —
   a getBoundingClientRect per frame would force a layout in the scroll path. */
export default function DockLens({ source = "#app-content" }) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
  const hostRef = useRef(null);
  const lensRef = useRef(null);
  const copyRef = useRef(null);
  const frame = useRef(0);
  const base = useRef({ l: 0, t: 0, w: 0 });
  const [box, setBox] = useState({ w: 0, h: 0 });
  const [map, setMap] = useState(null);
  const [gen, setGen] = useState(0);
  const [armed, setArmed] = useState(false);
  const id = "dl" + uid + gen;

  const getZoom = () => {
    // Effective visual scale: the copy lives inside the device tree, so rect
    // deltas only need un-scaling while the device is actually transformed.
    // In app-fullscreen the frame transform is gone (transform:none) while the
    // --zoom var is still set — using it would offset the copy (mobile bug).
    const d = document.getElementById('device');
    if (!d || getComputedStyle(d).transform === 'none') return 1;
    const s = document.getElementById('canvas-scaler');
    const v = s ? parseFloat(getComputedStyle(s).getPropertyValue('--zoom')) : 1;
    return Number.isFinite(v) && v > 0 ? v : 1;
  };

  const place = () => {
    const copy = copyRef.current, lens = lensRef.current, src = document.querySelector(source);
    if (!copy || !lens || !src) return;
    const z = getZoom();
    const c = src.getBoundingClientRect(), l = lens.getBoundingClientRect();
    base.current = { l: (c.left - l.left) / z, t: (c.top - l.top) / z, w: c.width / z };
    copy.style.left = `${base.current.l}px`;
    copy.style.top = `${base.current.t}px`;
    copy.style.width = `${base.current.w}px`;
    copy.style.transform = `translateY(${-src.scrollTop}px)`;
  };
  useLayoutEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const measure = () => {
      const z = getZoom();
      const r = host.getBoundingClientRect();
      const w = Math.round(r.width / z) + OPTICS.bleed * 2;
      const h = Math.round(r.height / z) + OPTICS.bleed * 2;
      setBox((p) => (p.w === w && p.h === h ? p : { w, h }));
      place();
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(host);
    window.addEventListener("resize", measure);
    return () => { ro.disconnect(); window.removeEventListener("resize", measure); };
  }, []);
  useEffect(() => {
    if (!box.w) return;
    const radius = Math.round((box.h - OPTICS.bleed * 2) / 2);
    // map is baked at region size (element + bleed on every side) — see LensFilter
    setMap(makeLensMap({ w: box.w + OPTICS.bleed * 2, h: box.h + OPTICS.bleed * 2, inset: OPTICS.bleed * 2, radius, band: OPTICS.band, pull: OPTICS.pull }));
    setGen((g) => g + 1);      // new id + remount below: WebKit resolves a filter once
  }, [box]);
  useLayoutEffect(() => {
    const copy = copyRef.current, lens = lensRef.current, src = document.querySelector(source);
    if (!copy || !lens || !src) return;
    const rebuild = () => {
      copy.textContent = "";
      const node = src.cloneNode(true);
      node.removeAttribute("id");
      node.querySelectorAll("[id]").forEach((n) => n.removeAttribute("id"));
      node.setAttribute("aria-hidden", "true");
      node.inert = true;
      copy.appendChild(node);
      place();
    };
    rebuild();
    setArmed(true);      // filter is only switched on once the copy exists (WebKit)
    const slide = () => { frame.current = 0; copy.style.transform = `translateY(${-src.scrollTop}px)`; };
    const queue = () => { if (!frame.current) frame.current = requestAnimationFrame(slide); };
    src.addEventListener("scroll", queue, { passive: true });
    window.addEventListener("resize", queue);
    window.addEventListener("app-tab", rebuild);
    const ro = new ResizeObserver(queue);
    ro.observe(src);
    return () => {
      setArmed(false);
      src.removeEventListener("scroll", queue);
      window.removeEventListener("resize", queue);
      window.removeEventListener("app-tab", rebuild);
      ro.disconnect();
      if (frame.current) cancelAnimationFrame(frame.current);
      frame.current = 0; // a cancelled frame must not read as "scheduled" — or scroll tracking dies
    };
  }, [source, gen]);
  return (
    <div className="docklens" ref={hostRef} aria-hidden="true">
      {/* key={gen} remounts BOTH the filter and the element that references it, in that
          order and with the map already on feImage. WebKit resolves a filter reference
          exactly once — if the feImage had no href at that moment, the element stays
          unfiltered forever, which is what made the dock look flat in Safari. */}
      <Fragment key={gen}>
        <LensFilter id={id} map={map} w={box.w} h={box.h} />
        <div className="docklens__lens" ref={lensRef} style={{ filter: armed && map ? `url(#${id})` : undefined, visibility: map ? "visible" : "hidden" }}>
          <div className="docklens__copy" ref={copyRef} />
        </div>
      </Fragment>
    </div>
  );
}
