# Patterns — Operate / Monitor / ReportsMatrix

**OperateScreen** (`src/patterns/OperateScreen/*`): Template enforcing P2 order law — title (32/bold left) + avatar right → KPI strip (`4/32 closed +2%`) → hero visual (bar/map/3D funnel) → delta line (`+32 than yesterday`) → filter chips → content cards → bottom tab (5 items). Dev warning if sections out-of-order.

**MonitorScreen** (`src/patterns/MonitorScreen/*`): Funnel hero with tilt-depth (ref-09), metrics grid, timeline Y/Q/M/W/D + Now. Selecting funnel segment expands that stage’s metric card (P4 guarantee via `funnel-machine`).

**ReportsMatrix** (`src/patterns/ReportsMatrix/*`): Blob (activity dots) vs Goals (bars) across Day/Week/Month/Quarter/Year (ref-06). State chips Business/Performance/Productivity. Timeline slider reshapes funnel.

**Logic:** `src/logic/funnel-machine.js` (7 states: initial→elastic→top→middle→bottom→closed→retained), `transient.js`/`temporal.js` (Activities transient, Goals temporal).

**A11y:** Template landmarks (`main`, `header`, `nav`), heading order, tab order preserves P2 sequence.

**Tokens:** Layout gap `var(--spacing-4)`, card radius `var(--radius-lg)`, hero `var(--bg-interactive)`.