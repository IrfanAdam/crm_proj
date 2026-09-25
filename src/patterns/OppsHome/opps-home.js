import { mapViewHTML, initMap } from "./nearby-map.js";
import { sheetHTML, initSheet, openSheet } from "./nearby-sheet.js";
import { activityStripHTML } from "../ActivityStrip/activity-strip.js";
import { initRewardSheet } from "./reward-sheet.js";
import { emptyStateHTML } from "../EmptyState/empty-state.js";
const bars = activityStripHTML();
const OPPS = [
  { org: "Acme Corp", initial: "A", product: "SAP HANA · Enterprise", stage: "Negotiation Stage", chance: "73% chance", value: "Rs 3.2L", segs: 2, who: "Ursula + 3 others", img: "47", contact: "last contact 2d", dist: "23km away" },
  { org: "PayLeap", initial: "P", product: "Fintech · Series B", stage: "Qualification Stage", chance: "42% chance", value: "Rs 1.8L", segs: 1, who: "Ravi + 1 other", img: "12", contact: "last contact 5h", dist: "0.8km away" },
  { org: "Nimai Hospitals", initial: "N", product: "Healthcare · Renewal", stage: "Negotiation Stage", chance: "61% chance", value: "Rs 4.1L", segs: 3, who: "Meera + 5 others", img: "32", contact: "last contact 1d", dist: "5.3km away" },
  { org: "KiranaOne", initial: "K", product: "Retail · 12 stores", stage: "Prospecting Stage", chance: "28% chance", value: "Rs 0.9L", segs: 1, who: "Arjun + 2 others", img: "59", contact: "last contact 4d", dist: "11km away" },
];
const cards = OPPS.map((o) => {
  const segs = [0, 1, 2, 3, 4].map((s) => `<i class="${s < o.segs ? "on" : ""}"></i>`).join("");
  return `<article class="opp-card"><div class="opp-card__head"><span class="opp-card__logo">${o.initial}</span><span><span class="opp-card__name">${o.org}</span><span class="opp-card__product">${o.product}</span></span></div><div class="opp-card__stage"><span class="opp-card__stage-name">${o.stage}</span><span class="opp-card__sep"></span><span class="opp-card__sep"></span><span class="opp-card__sep"></span><span class="opp-card__chance">${o.chance}</span><span class="opp-card__value">${o.value}</span></div><div class="opp-card__segs">${segs}</div><div class="opp-card__contact"><span class="opp-card__stack"><span class="avatar"><img src="https://i.pravatar.cc/64?img=${o.img}" alt="" loading="lazy"/></span><span class="avatar">+3</span></span><span><span class="opp-card__who">${o.who}</span><span class="opp-card__sub">Last transcript</span></span></div><div class="opp-card__foot"><span><span class="opp-card__meta">${o.contact}</span><span class="opp-card__dist">${o.dist}</span></span><span class="opp-card__actions"><button type="button" aria-label="Email"><i class="ph ph-envelope"></i></button><button type="button" aria-label="Schedule"><i class="ph ph-calendar-blank"></i></button><button type="button" aria-label="Call"><i class="ph ph-phone"></i></button></span></div></article>`;
}).join("");
const OPPS_HTML = `<div class="opps"><div class="opps__compact"><span class="opps__compact-title">Opportunities</span><button class="opps__compact-avatar" type="button" aria-label="Profile"><img src="https://i.pravatar.cc/64?img=13" alt=""/></button></div><div class="opps__header"><span class="opps__title">Opportunities</span><span class="opps__avatar"><img src="https://i.pravatar.cc/96?img=13" alt="Profile"/></span></div><div class="opps__kpi">4/32 closed <b>+2%</b></div><div class="activity-strip" role="img" aria-label="Activity last 56 days, scrollable — outline gem marks achievements, filled gem the highest so far">${bars}</div><div class="opps__delta"><b>↑ +32 than yesterday</b> &nbsp;|&nbsp; last updated 4:35pm today</div><div class="opps__map" id="nearby-map">${mapViewHTML()}</div><div class="opps__filters"><button class="opps__tune" type="button" aria-label="Filters"><i class="ph ph-sliders-horizontal"></i></button><button class="chip chip--hot chip--faces" type="button"><span class="opps__mini-stack"><i><img src="https://i.pravatar.cc/44?img=5" alt=""/></i><i><img src="https://i.pravatar.cc/44?img=44" alt=""/></i><i><img src="https://i.pravatar.cc/44?img=68" alt=""/></i></span>4 <i class="ph ph-flame opps__flame"></i></button><button class="chip" type="button">Value range</button><button class="chip" type="button">Stages</button><button class="chip" type="button">Nearby</button></div><div class="opps__list">${cards}</div></div>`;
const EMPTY_HTML = (t) => `<div class="opps"><div class="opps__compact"><span class="opps__compact-title">${t}</span></div><div class="opps__header"><span class="opps__title">${t}</span></div>${emptyStateHTML(t)}</div>`;
const root = document.getElementById("opps-home");
const feed = document.getElementById("app-content"), device = document.getElementById("device");
let large = null, small = null, compact = null, largeAv = null, smallAv = null;
let RANGE = 56, TX = 0, TY = 0, S = 0.6;
/* layout offsets share one frame: large/compact resolve to the screen, small to
   compact — so small is re-based via compact. Immune to zoom/scroll/transforms. */
const measure = () => { if (!large || !small || !compact || !feed) return;
  const lw = large.offsetWidth, lh = large.offsetHeight;
  const padTop = parseFloat(getComputedStyle(feed).paddingTop) || 0; /* sticky top:0 pins here */
  RANGE = Math.max(8, large.offsetTop - padTop - small.offsetTop); S = small.offsetHeight / lh;
  const smallCx = compact.offsetLeft + small.offsetLeft + small.offsetWidth / 2;
  TX = smallCx - (large.offsetLeft + lw / 2) + (lw * (1 - S)) / 2;
  TY = -(lh * (1 - S)) / 2; };
const smooth = (a, b, p) => { const t = Math.min(Math.max((p - a) / (b - a), 0), 1); return t * t * (3 - 2 * t); };
const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
let tick = false;
const frame = () => { tick = false; const y = feed?.scrollTop || 0;
  device?.classList.toggle("device--scrolled", y > 8);
  if (!large || !small) return; /* empty tab: no large-title morph */
  let p = Math.min(Math.max(y / RANGE, 0), 1); if (reduced) p = y > 8 ? 1 : 0;
  const q = smooth(0.55, 1, p);
  large.style.transform = `translate(${p * TX}px, ${p * TY}px) scale(${1 - p * (1 - S)})`;
  large.style.opacity = 1 - smooth(0.45, 0.95, p);
  small.style.opacity = q; small.style.transform = `scale(${0.94 + 0.06 * q})`;
  if (largeAv) largeAv.style.opacity = 1 - smooth(0.4, 0.9, p);
  if (smallAv) smallAv.style.opacity = q; };
function mount(page) {
  if (!root) return;
  const isOpps = page === "Opps";
  root.innerHTML = isOpps ? OPPS_HTML : EMPTY_HTML(page === "Leads" ? "Leads" : "Home");
  device?.classList.toggle("device--large", true);
  large = small = compact = largeAv = smallAv = null;
  if (isOpps) {
    initRewardSheet(root);
    // — maps resolve after Leaflet's first load; the feed renders first, tiles fade in —
    initMap(() => openSheet()).then((api) => {
      if (!api) return;
      let host = document.getElementById("map-sheet-host");
      if (!host) {
        host = document.createElement("div");
        host.id = "map-sheet-host";
        document.querySelector(".device__screen")?.appendChild(host);
      }
      if (!host.innerHTML) host.innerHTML = sheetHTML();
      initSheet(api);
      const strip = root.querySelector(".opps__bars"); if (strip) strip.scrollLeft = strip.scrollWidth;
    });
  }
  large = root.querySelector(".opps__title"); small = root.querySelector(".opps__compact-title");
  compact = root.querySelector(".opps__compact");
  largeAv = root.querySelector(".opps__avatar"); smallAv = root.querySelector(".opps__compact-avatar");
  if (feed) feed.scrollTop = 0;
  measure(); frame();
}
feed?.addEventListener("scroll", () => { if (!tick) { tick = true; requestAnimationFrame(frame); } }, { passive: true });
addEventListener("resize", () => { measure(); frame(); });
document.fonts?.ready.then(() => { measure(); frame(); }).catch(() => {});
window.addEventListener("app-tab", (e) => mount(e.detail));
mount("Opps");
