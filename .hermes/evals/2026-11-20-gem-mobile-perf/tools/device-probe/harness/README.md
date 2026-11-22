# device-probe / harness

The scripts this lane used to (a) prove the probe is inert and (b) smoke it in headless Chrome. They import the
in-repo rogue harness (`../../rogue/harness.mjs`) — same pin law, same-task render+read, same access to a rig.
Chrome profiles and shot files go to `$TMPDIR/e5-probe-runs` (or `$ROGUE_ROOT`), never into the repo.

Start a server first (`npx vite --port 5413 --strictPort`), then from this directory:

```bash
# 1. Probe smoke: HUD appears, JSON populated, rAF fallback labelled, inert without the param.
node smoke.mjs                     # -> JSON: on / raf / knob / off

# 2. The four E5 arms through the probe (headless plumbing evidence, NOT device numbers).
node arms.mjs

# 3. Pixel capture of a page at one dpr (pinned pose, floors hidden, A-vs-A control inline).
E5W=340 E5H=480 E5R=3 node capture.mjs gallery 3 post      # forced 340x480 css @3 -> 1020x1440
E5W=358 E5H=240 E5R=2 node capture.mjs pitch   2 post
E5BASE=http://127.0.0.1:5414 node capture.mjs gallery 3 pre2   # same capture against a second server

# 4. Diff two captures byte-wise (px >2/255, maxΔ, meanΔ).
node compare.mjs                   # compares shots/pre2-*.raw against shots/post-*.raw
```

Notes:

- `E5W/E5H/E5R` exist because the ceremony canvas box jitters 339 vs 340 css px between loads; forcing
  `setDrawingBufferSize(css * ratio)` in **both** arms removes that from the comparison. Capture both arms through
  the *same* script or the numbers are not comparable.
- `E5BASE` lets the same script capture a second checkout — this lane served `dee15c3` from `git archive HEAD` on
  :5414 and the working tree on :5413, so pre and post go through identical code.
- `capture.mjs` prints `control`, an A-vs-A capture of the same pinned pose in a second CDP task. It must be 0.
- `compare.mjs` expects the four pairs used by this lane (`gallery` and `pitch` at dpr 3 and 2, tags `pre2`/`post`).
  Edit the pair list for a different run.
- These scripts are copies of the scratch harness; they are evidence, not an API.
