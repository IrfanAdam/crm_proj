# Navigation — Tabs / Breadcrumbs / Pagination / Accordion / TabBar

**Tabs:** roving tabindex, `role=tablist`/`tab` + `aria-selected`. **Breadcrumbs:** `nav` + `aria-label=Breadcrumb`, sep `·` or `/`. **Pagination:** 32px buttons, `aria-current=page`, ellipsis. **Accordion:** `aria-expanded` + `hidden` panel. **TabBar:** 5 glyphs, single active dot (no double dot), `role=tablist`.

**Witness:** ref-01 shell (title→KPI→hero→chips→cards→tab), ref-06 reports depth.

**A11y:** Roving focus (ArrowLeft/Right, Home/End), visible focus ring, `aria-selected`/`aria-expanded`.

**Tokens:** `--radius-md`, `--bg-interactive`, `--border-thin`.