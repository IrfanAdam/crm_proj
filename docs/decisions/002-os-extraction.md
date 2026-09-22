# 002 — OS extraction proofs and leftovers

- Context: Phase 2 moved status/indicator/edge CSS verbatim and proceduralised clock/battery/notch.
- Options: (a) screenshot pixel-diff as proof — rejected for the device region: Leaflet map renders nondeterministically (two same-code shots differ on ~98% of device px); (b) rule-diff + shell-zero-diff — chosen.
- Decision: verbatim moves are proven by selector-level diff of moved rules against `git HEAD` (only additions allowed: the 3 notch variants); workspace chrome region must be 0% diff; live behavior proven via `--dump-dom` (time text, `data-notch`).
- Why: byte-identical selectors + preserved cascade order = identical computed styles, stronger than pixels where content animates.
- Consequences: every future extract phase uses rule-diff, not pixels, inside the device region. Leftover: `app.css` responsive query (l.41) still holds 2 `.device__edge*` radius overrides — they move with the frame query in Phase 3, not before (frame + edge radii must stay in sync per breakpoint).
