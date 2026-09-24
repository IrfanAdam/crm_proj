# Motion & Gamification — ElasticScroll / TiltCard / GemReward

**Motion tokens** (`tokens/motion.json`): duration xs 100/sm 150/md 250/lg 400/xl 600; easing standard `cubic-bezier(0.4,0,0.2,1)`, spring `cubic-bezier(0.25,1,0.5,1)`, elastic; spring stiffness/damping/mass; translate overshoot 12px / tilt-max 12deg. Built to `--motion-*` → `design-system/tokens.css` (27 lines).

**ElasticScroll** (`src/motion/elastic-scroll.*`): overscroll pull 12px spring, indicator width by scroll ratio, `prefers-reduced-motion:reduce` → instant/no overshoot.

**TiltCard** (`src/motion/tilt-card.*`): perspective 600px, mousemove tilt ±12°, hover `rotateX/Y`, `prefers-reduced-motion` → no tilt.

**GemReward** (`src/components/GemReward/*`): one procedural round-brilliant cut (`gem-cut.js`, portable math — `prototype/gems/` mirrors it) rendered per category on a `canvas[data-gem=sapphire|citrine|amethyst|redberyl]` by the `gem3d.js` three.js scene, painted per category from a gem token: sapphire `--primitive-sapphire-ui`, citrine `--primitive-citrine`, amethyst `--primitive-amethyst`, red beryl `--primitive-red-beryl`. No iframe, no embeds, no CSS filter pass (a filter distorted the canvas colors). Capsule stand, Rock Solid Goals copy slots (`+Rs 4lakh / Beyond Your Target`). Mood quarantined — never inside Operate/Monitor (P5). Reduced-motion → still frame, no spin.

**Witness:** ref-09 tilt, ref-08 Rock Solid, ref-04 funnel elastic, guardrails §4.

**A11y:** Reduced-motion respects `prefers-reduced-motion`; the gem canvas is decorative — category meaning and copy stay real text in the capsule.

**Tokens:** `var(--transition-spring)`, `var(--motion-duration-*)`, `var(--motion-easing-*)`.
