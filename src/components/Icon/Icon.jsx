/* ADAM/DS — src/components/Icon/Icon.jsx · single icon registry for the DS.
   The Phosphor runtime is gone from the boot graph: the glyphs the app renders
   are inlined in src/shell/icons.jsx (see that file for provenance). Names that
   no longer exist locally fall back to House, exactly as unknown names always did. */
import { House, Users, Handshake } from "../../shell/icons.jsx";
import GemFriendly from "./GemFriendly.jsx";
import GemLite from "./GemLite.jsx";
import GemMinimal from "./GemMinimal.jsx";

/* Registry — Phosphor geometry (256 viewBox, regular/fill weights).
   Dock = 3 primary destinations; gem family = the reward/library role. */
const MAP = {
  House,
  "house": House,
  Users,
  "users": Users,
  Handshake,
  "handshake": Handshake,
  // Gem family — local components, Phosphor sketch-logo derivatives
  GemFriendly,
  "gem-friendly": GemFriendly,
  "gemFriendly": GemFriendly,
  GemLite,
  "gem-lite": GemLite,
  "gemLite": GemLite,
  GemMinimal,
  "gem-minimal": GemMinimal,
  "gemMinimal": GemMinimal,
};

export default function Icon({ name, size = 20, weight = "regular", color, className = "", ...props }) {
  const Cmp = MAP[name] || MAP[name?.replace?.(/-/g, "")] || House;
  // weight selects the inlined path variant; fill draws the solid form
  return <Cmp size={size} weight={weight} color={color} className={className} {...props} />;
}

export { MAP as IconMap };
