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
    const c = src.getBoundingClientRect(), l = lens.getBoundingClientRect();
    base.current = { l: c.left - l.left, t: c.top - l.top, w: c.width };
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
        band.appendChild(copy);
        lens.appendChild(band);
      } else {
        lens.appendChild(copy);
      }
      return copy;
    };
    copies.current = [build(null), ...SLICES.map(build)];
    place();
    const queue = () => { if (!frame.current) frame.current = requestAnimationFrame(slide); };
    src.addEventListener("scroll", queue, { passive: true });
    window.addEventListener("resize", queue);
    window.addEventListener("scroll", queue, { passive: true });
    const ro = new ResizeObserver(queue);
    ro.observe(src);
    const ro2 = new ResizeObserver(place);
    ro2.observe(hostRef.current || lens);
    return () => {
      src.removeEventListener("scroll", queue);
      window.removeEventListener("resize", queue);
      window.removeEventListener("scroll", queue);
      ro.disconnect(); ro2.disconnect();
      if (frame.current) cancelAnimationFrame(frame.current);
    };
  }, [source]);

  return (
    <div className="docklens" ref={hostRef} aria-hidden="true">
      <div className="docklens__lens" ref={lensRef} />
    </div>
  );
}
