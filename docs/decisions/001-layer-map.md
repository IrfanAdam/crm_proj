# 001 — Shell / device / OS / glass split points

- Context: `index.html` + `app.css` currently hold workspace chrome, device frame, OS status bar, and DS duplicates in one tangle.
- Options: (a) split by file type (all CSS together) — rejected, re-tangles by layer; (b) split by layer ownership — chosen.
- Decision: shell owns chrome, device owns frame geometry from `devices.js`, OS owns status/notch/indicator/edges, glass splits by scope (shell pills vs device dock/appbar).
- Why: each layer answers one audit question with "yes"; dependency arrows point one way (patterns → components, never OS → patterns).
- Consequences: `index.html` shrinks to mounts (≤70 lines); `app.css` dissolves into layer stylesheets; every future style has exactly one legal home.
