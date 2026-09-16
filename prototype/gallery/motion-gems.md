# Motion & Gamification — ElasticScroll / TiltCard / GemReward

**Motion tokens** (`tokens/motion.json`): duration xs 100/sm 150/md 250/lg 400/xl 600; easing standard `cubic-bezier(0.4,0,0.2,1)`, spring `cubic-bezier(0.25,1,0.5,1)`, elastic; spring stiffness/damping/mass; translate overshoot 12px / tilt-max 12deg. Built to `--motion-*` → `design-system/tokens.css` (27 lines).

**ElasticScroll** (`src/motion/elastic-scroll.*`): overscroll pull 12px spring, indicator width by scroll ratio, `prefers-reduced-motion:reduce` → instant/no overshoot.

**TiltCard** (`src/motion/tilt-card.*`): perspective 600px, mousemove tilt ±12°, hover `rotateX/Y`, `prefers-reduced-motion` → no tilt.

**GemReward** (`src/components/GemReward/*`): Single Spline iframe `https://my.spline.design/gem-embed` + `category → hue-rotate` API: sapphire 0°, citrine 38° saturate 1.1, red-beryl 310° saturate 1.2, amethyst 265° saturate 1.2. Capsule stand, Rock Solid Goals copy slots (`+Rs 4lakh / Beyond Your Target`). Mood quarantined — never inside Operate/Monitor (P5). Reduced-motion → no hue-rotate.

**Witness:** ref-09 tilt, ref-08 Rock Solid, ref-04 funnel elastic, guardrails §4.

**A11y:** Reduced-motion respects `prefers-reduced-motion`; iframe `title`, Spline fallback SVG per category.

**Tokens:** `var(--transition-spring)`, `var(--motion-duration-*)`, `var(--motion-easing-*)`.