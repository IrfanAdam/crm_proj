# Cards — Opportunity / Funnel / Profile + Viz (GoalBar/Glyph/Sparkline)

**OpportunityCard:** org logo → name → product → stage+chance+value → segmented progress (active sapphire) → contacts → last-contact/distance → mail/calendar/phone.

**FunnelCard:** 48px glyph (`--primitive-sapphire-ui-100` / 500) + `Last Refreshed` + pipelines/demographics + CR/RR/CSAT/NPS strip.

**ProfileCard:** Olivia Jein (avatar, score, projects, return, skill rows).

**Viz:** GoalBar (purple pill label-left/value-right, `1.4x` gem variant via `--primitive-amethyst-700`), FunnelGlyph (56/40), Sparkline (bars gem-hue only: amethyst 300/500/700).

**Witness:** ref-01/02/03/11.

**A11y:** Card `article` with heading, progress `role=progressbar aria-valuenow`, sparkline `aria-hidden` + table fallback.

**Tokens:** `--radius-lg`, `--bg-surface`, `--border-thin`, `--primitive-amethyst-*`, `--primitive-sapphire-*`.