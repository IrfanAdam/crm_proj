import { createRoot } from "react-dom/client";
import { TopPills } from "./GlassBars.jsx";
import BottomDock from "./BottomDock.jsx";

const top = document.getElementById("glass-top");
if (top) createRoot(top).render(<TopPills />);

const bottom = document.getElementById("glass-bottom");
if (bottom) createRoot(bottom).render(<BottomDock />);

// live IST clock — kept vanilla for status bar
const timeEl = document.querySelector(".status__time");
function tick() { try { timeEl.textContent = new Intl.DateTimeFormat("en-IN", { hour: "numeric", minute: "2-digit", hour12: false, timeZone: "Asia/Kolkata" }).format(new Date()); } catch {} }
tick(); setInterval(tick, 60000);
