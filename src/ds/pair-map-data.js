/* ADAM/DS — src/ds/pair-map-data.js · shipped pairings, each on its element */
// [plan:2026-09-23_002500-design-system-consolidation.md#phase-4] · rows audited from
// src/components/* CSS (selector → fg/bg pair), not a cross-product. Row =
// [element, markup, fgKey, bgKey]; markup '' renders a swatch. Keys resolve through
// gallery.js FG_BY/BG_BY (or PG_RAMPS), so a card can pin into the playground.
const PM_FAMILIES = [
  {
    label: 'Neutral · Action — Sapphire',
    rows: [
      ['Button · primary', '<span class="btn btn--primary">Save</span>', 'white', 'action'],
      ['Button · primary pressed', '', 'white', 'action-strong'],
      ['Button · tonal', '<span class="btn btn--tonal">Tonal</span>', 'gray-900', 'action-soft'],
      ['Chip · selected', '<span class="chip chip--active">Value range</span>', 'white', 'gray-black'],
      ['Pagination · current', '<span class="pagination__btn pagination__btn--active">2</span>', 'white', 'action'],
      ['Badge · action', '<span class="badge">3</span>', 'sapphire-ui-700', 'sapphire-ui-100'],
      ['Badge · neutral', '<span class="badge badge--neutral">12</span>', 'secondary', 'interactive'],
      ['StatusPill · in progress',
        '<span class="status-pill status-pill--progress">In Progress</span>', 'white', 'sapphire-ui-500']
    ]
  },
  {
    label: 'Neutral · Ink — text on paper',
    rows: [
      ['Card · title', '', 'primary', 'surface'],
      ['Card · meta', '', 'secondary', 'surface'],
      ['Field · hint', '', 'muted', 'surface'],
      ['Eyebrow · disabled', '', 'dim', 'surface'],
      ['Field · error text', '', 'danger', 'surface'],
      ['Field · error label', '', 'danger-strong', 'surface']
    ]
  },
  {
    label: 'Core — the gem hues',
    rows: [
      ['GoalBar · fill',
        '<span class="goal-bar goal-bar--sm"><span class="goal-bar__fill" style="width:72%">72%</span></span>',
        'white', 'amethyst-400'],
      ['GemReward · capsule', '<span class="gem-reward__capsule">+Rs 2.5lakh</span>', 'amethyst-700', 'amethyst-100'],
      ['TabBar · badge',
        '<span class="pm-host"><i class="ph ph-house"></i><span class="tabbar__badge">3</span></span>',
        'white', 'score'],
      ['Toast · action',
        '<span class="toast toast--visible">Deal saved <span class="toast__action">Undo</span></span>',
        'citrine-300', 'neutral-dark-700']
    ]
  },
  {
    label: 'Messaging — feedback, never structural',
    rows: [
      ['StatusPill · accepted', '<span class="status-pill status-pill--accepted">Accepted</span>', 'ink', 'green-300'],
      ['StatusPill · at risk', '<span class="status-pill status-pill--warning">At risk</span>', 'ink', 'orange-400'],
      ['StatusPill · blocked', '<span class="status-pill status-pill--danger">Blocked</span>', 'white', 'red-400'],
      ['KpiStat · delta up', '<span class="kpi"><span class="kpi__delta">+2%</span></span>', 'green-700', 'green-100'],
      ['KpiStat · delta down',
        '<span class="kpi"><span class="kpi__delta kpi__delta--down">−3%</span></span>', 'red-700', 'red-100'],
      ['Badge · warning', '<span class="badge badge--warning">!</span>', 'orange-700', 'orange-100'],
      ['Toast · base', '<span class="toast toast--visible">Deal saved</span>', 'white', 'neutral-dark-700']
    ]
  }
];
