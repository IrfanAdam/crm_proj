/* ADAM/DS — ds/changelog/timeline-scroll · keep today in view after paint */
import { syncTlEdges } from './tl-edges.js';
export function scrollToday(host, days, todayFrac) {
  const sc0 = host.querySelector('.ds-tl-scroll');
  if (sc0) {
    sc0.onscroll = () => { try { syncTlEdges(host); } catch {} };
    try { syncTlEdges(host); } catch {}
  }
  requestAnimationFrame(() => {
    try {
      const sc = host.querySelector('.ds-tl-scroll'), lane = host.querySelector('.ds-tl-lane');
      if (!sc || !lane) return;
      const dayPx = lane.getBoundingClientRect().width / days;
      if (!dayPx) return;
      // The sticky label column covers the lane's left edge — measure into
      // view past it (reference scrollToday).
      const lab = host.querySelector('.ds-tl-label');
      const pad = lab ? lab.getBoundingClientRect().width : 0;
      const x = pad + todayFrac * dayPx;
      if (x >= sc.scrollLeft + pad && x <= sc.scrollLeft + sc.clientWidth - 24) return;
      const pane = Math.max(sc.clientWidth - pad, 1);
      sc.scrollLeft = Math.max(0, x - pad - pane * 0.5);
      try { syncTlEdges(host); } catch {}
    } catch {}
  });
}
