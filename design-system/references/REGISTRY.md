# References Registry (append-only intake)

Every image that shapes the system lives in this folder as `ref-NN-slug.png`.
Add new ones; never rename or delete rows.

## Intake workflow (the polish loop)

1. Drop file → next `ref-NN-slug.png`.
2. Append a row below (subject, type, phases touched, supersedes?).
3. Open a dated polish pass: update the affected `docs/phase-N-*.md` +
   `DESIGN.md` (bump nothing — `version: alpha` stays until spec beta), then
   `npx -y @google/design.md lint DESIGN.md`.
4. Locked decisions change only via a new row citing the new ref.

## Rows

| File | Subject | Type | Phases | Notes |
|---|---|---|---|---|
| ref-01-opportunities.png | Opportunities screen: KPI bars, map, filters, org card, tab bar | app mock | 2, 3 | shell canon |
| ref-02-reports.png | Reports: funnel card, Performance tabs, goal bars | app mock | 2, 3, 4 | — |
| ref-03-funnel-detail.png | Your Funnel: 3D funnel, Top/Mid/Bot cards, quota rows | app mock | 3, 4 | — |
| ref-04-explainer-funnel-3d.png | 7 funnel interaction states, 18th Jan | behavior | 4 | — |
| ref-05-explainer-funnel-tf.png | Timeline slider, transient-vs-temporal doctrine | behavior | 4 | — |
| ref-06-reports-list-states.png | Blob vs Goals Day→Year matrices | behavior | 4 | ref-06-*-DUP is byte-identical |
| ref-07-tokens-color-ramps.png | Citrine/RedBeryl/Amethyst/Neutral/msg/Sapphire ramps | tokens | 1 | ramp source of truth |
| ref-08-mood-rock-solid-goals.png | Gem capsule ceremony, `+Rs 4lakh` | mood | 5 | — |
| ref-09-funnel-tilt.png | Tilted funnel detail card close-up | app mock | 2, 5 | depth reference |
| ref-10-mood-blobs.png | Pink gradient spheres trio | mood | 5 | brand-only |
| ref-11-mood-bubble-cards.png | Bubble editorial + light/dark CRM cards | mood + mock | 3, 5 | dark-wrapper proof |
| ref-12-mood-alpha-poster.png | ALPHA iridescent-cube poster, brand voice | mood | 5 | — |
