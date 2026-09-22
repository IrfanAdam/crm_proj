import { createRoot } from "react-dom/client";
import { TopPills } from "../shell/top-pills.jsx";
import BottomDock from "./BottomDock.jsx";

const top = document.getElementById("glass-top");
if (top) createRoot(top).render(<TopPills />);

const bottom = document.getElementById("glass-bottom");
if (bottom) createRoot(bottom).render(<BottomDock />);
