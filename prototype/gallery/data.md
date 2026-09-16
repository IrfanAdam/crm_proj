# Data — Table / ListRow / KpiStat / Timeline

**Table** (sortable, `aria-sort` ascending/descending, keyboard Enter/Space, striped optional). **ListRow** (logo→name/product→stage/chance/value→progress segments→last-contact/distance→mail/phone). **KpiStat** (`4/32 closed +2%` from `kpi__value/total/delta` attributes alone — P3 witness). **Timeline** (vertical line + 10px dots, `timeline__item--done` filled sapphire, blob report).

**Witness:** ref-01 KPI strip + list rows, ref-02 opportunity rows, ref-06 activity dots.

**A11y:** Table `scope=col`, `aria-sort`, keyboard sort; KPI live? static; list `article` semantics if needed; timeline `role=list`.

**Tokens:** `--spacing-*`, `--border-thin`, `--primitive-sapphire-ui-300`, `--primitive-green-*`.