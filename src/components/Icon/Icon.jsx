import {
  House,
  ChartBar,
  Users,
  Handshake,
  Buildings,
  MagnifyingGlass,
  Check,
  X,
  Plus,
  Envelope,
  Phone,
  CalendarBlank,
  MapPin,
  User,
  CaretDown,
  CaretRight,
  DotsThree,
  Bell,
  Target,
  TrendUp,
  Briefcase,
  Kanban,
  SquaresFour,
  Diamond,
  Sparkle,
} from "@phosphor-icons/react";

/* Phosphor icon registry — single source for the DS.
   Weight "regular" = 1.5px stroke (matches DS iconography spec).
   Fill is reserved for active states only if needed; default stays regular. */
const MAP = {
  // Dock — 3 primary destinations (icon-only, learned over time) — slot 2 generic (SquaresFour) until spec lands
  House,
  SquaresFour,
  Users,
  Handshake,
  Buildings,
  Diamond,
  Sparkle,
  // Legacy sprite IDs → Phosphor (keeps old gallery code working)
  "i-search": MagnifyingGlass,
  "i-check": Check,
  "i-x": X,
  "i-chevron": CaretDown,
  "i-plus": Plus,
  "i-mail": Envelope,
  "i-phone": Phone,
  "i-calendar": CalendarBlank,
  "i-map": MapPin,
  "i-user": User,
  // Direct names
  MagnifyingGlass,
  Check,
  X,
  Plus,
  Envelope,
  Phone,
  CalendarBlank,
  MapPin,
  User,
  CaretDown,
  CaretRight,
  DotsThree,
  Bell,
  Target,
  TrendUp,
  Briefcase,
  Kanban,
};

export default function Icon({ name, size = 20, weight = "regular", color, className = "", ...props }) {
  const Cmp = MAP[name] || MAP[name?.replace?.(/-/g, "")] || House;
  // Phosphor fills via color prop; regular uses currentColor stroke
  return <Cmp size={size} weight={weight} color={color} className={className} {...props} />;
}

export { MAP as IconMap };
