# Lane I — hardening: a token gate that could pass blind, and a gem rig that could stay dead

**Date:** 2026-11-16 · **Repo:** `/Users/irfan/Documents/Portfolio Redo/crm_proj` · **Base:** `b97b1de` (+ six lanes' uncommitted work)
**Write scope:** two files only — `scripts/lint-tokens.mjs`, `src/components/GemReward/gem-rig.js`. No commit.
**Dev server:** `npx vite --port 5243 --strictPort` (lane port). No `npm run build`, no `npm test`, no `ds-track`.

Both items are *falsification* items: each defect is reproduced on the pre-fix code, then the fix is proven by the state the defect could not survive.

---

## Item 1 — `scripts/lint-tokens.mjs` returned a FALSE GREEN

### The defect (pre-fix, `b97b1de:scripts/lint-tokens.mjs`)

```js
// b97b1de:4
let list=[]; try{list=execSync('git ls-files --cached --others --exclude-standard',{encoding:'utf8'}).trim().split('\n').filter(Boolean)}catch{ list=[]}
// b97b1de:45
console.log('✓ lint:tokens — 0 raw leaks, 0 over-limit');
```

`git ls-files` throws in any tree without `.git` (a `git archive` export, a tarball, a CI checkout with the
history stripped, a deploy artifact). The `catch` swallows it into `list=[]`, the `for` loop below iterates zero
files, no violation arrays fill, and line 45 prints a green tick. **The gate's "no leaks" verdict was
indistinguishable from "read nothing".** The independent audit lane hit exactly this on its first run
(`lane-G.md:245`) and had to `git init && git add -A` in its copy to get a real answer.

### The fix (`scripts/lint-tokens.mjs`)

- `:4` `SKIP` set — walk never descends into `node_modules`, `dist`, `build`, `coverage`, `__pycache__` (or any dot-dir).
- `:5` `walk(dir,out)` — recursive enumerator, returns paths relative to `process.cwd()`.
- `:6–8` `git ls-files` stays the primary enumerator (same command, same order); its stderr is discarded
  (`stdio:['ignore','pipe','ignore']`) so the failure is reported by us, not by git. On throw, `why` records the cause.
- `:9` fallback: if the git list is empty, enumerate by walk; if that is also empty, `why` accumulates both causes.
- `:10` **hard zero-file error** — prints the cause *and* the directory it looked in, then `process.exit(2)`.
- `:51` the success line now reports the count it actually scanned, so a green run carries its own evidence.

Before intent: *a missing file list looks like a clean file list.*
After intent: *zero files is a hard failure (exit 2) that names the cause and the directory, and a green run prints how many files it read.*

### Falsification — three states (plus two supporting probes)

| # | State | Command (cwd) | Output | Exit |
|---|-------|---------------|--------|------|
| 1 | **Pre-fix**, no `.git`, files present | `node lint-tokens.orig.mjs` in `…/lane-I/repo-nogit` | `fatal: not a git repository` → `✓ lint:tokens — 0 raw leaks, 0 over-limit` | **0 (false green)** |
| 2 | **Pre-fix**, genuinely empty dir, no `.git` | `node lint-tokens.orig.mjs` in `…/lane-I/empty2` | `fatal: not a git repository` → `✓ … 0 raw leaks, 0 over-limit` | **0 (false green)** |
| 3 | (a) real repo, after fix | `node scripts/lint-tokens.mjs` in the repo | `✓ lint:tokens — 0 raw leaks, 0 over-limit (1720 files scanned)` | **0** |
| 4 | (b) no `.git`, files present, after fix | `node scripts/lint-tokens.mjs` in `…/lane-I/repo-nogit` | `✓ … (1295 files scanned)` — via the walk | **0** |
| 5 | (b-proof) same walk tree + one injected `#ff0000` line in `src/components/Chip/laneI-probe.css` | same | `✗ lint:tokens` / `src/components/Chip/laneI-probe.css:1 #ff0000 → var(--token)` | **1** |
| 6 | (c) genuinely empty dir, no `.git`, after fix | `node /…/scripts/lint-tokens.mjs` in `…/lane-I/empty2` | `✗ lint:tokens — 0 files enumerated in /Users/…/empty2 — git ls-files failed — no .git index in this directory; recursive walk found no files; a lint that scans nothing is not a pass` | **2** |
| 7 | (c2) `git init` with nothing added, after fix | same command in `…/lane-I/emptygit` | `✗ … — git index empty; recursive walk found no files; a lint that scans nothing is not a pass` | **2** |

Verdict parity with the pre-fix gate on the real repo: `git ls-files --cached --others --exclude-standard | wc -l`
= **1720** and both the HEAD script and the fixed script report `0 raw leaks / 0 over-limit`, `EXIT=0`. The count
drifts between runs because six lanes are writing into the same tree (1714 at first run, 1720 at the recorded run,
1721 a minute later); the enumerator command and its cwd are byte-identical, so the scanned set is identical.

The fallback's scanned set is equivalent, not identical: the walk skips dot-dirs (`.hermes/` — every path there is
already `exempt()` at `:3`) and `dist/`, so a no-`.git` copy scans 1295 files of the same lint-relevant corpus.
Checked: of the 422 paths git lists that the walk does not, **0** are non-exempt lintable files except
`src/components/Icon/gem-icons.js`, which another lane has staged as deleted and which is absent from disk — the git
path `continue`s on `readFileSync` for it too, so both enumerators scan the same live files.

---

## Item 2 — the gem rig recovered from the dead state asymmetrically

### The asymmetry (read side by side)

Every other 3D rig re-arms the loop from its own `ResizeObserver` callback:

| Rig | `arm()` definition | ResizeObserver callback |
|-----|--------------------|-------------------------|
| `src/components/GlassDeck/deck3d.js` | `:11` `if (rig.raf \|\| rig.gone \|\| !rig.vis \|\| document.hidden \|\| rig.dead) return; …` | `:38` `… new window.ResizeObserver(function () { size(); arm(rig); })` |
| `src/components/IntelCube/cube3d.js` | `:13` same guard | `:46` `… function () { size(); arm(rig); }` |
| `src/components/IllusionCube/illusion3d.js` | `:12` same guard | `:40` `… function () { size(); arm(rig); }` |
| `src/components/GemReward/gem-rig.js` **pre-fix** | *no `arm()` existed in the module*; the loop's arm is `gem3d.js:13` | `b97b1de:21` `… function () { rig.epoch = -1; api.size(rig); }` — **`size()` and nothing else** |

`gem-rig.js` is the module that owns the gem's box measurement (`api.size`, `:26–34`), and it deliberately recomputes
`rig.dead = !cw || !ch` at `:31`. It just never restarted the loop after clearing that flag. Today the gem still comes
back because a zero-area canvas never intersects the viewport, so the *IntersectionObserver* (`gem3d.js:81–85`,
`rootMargin: '160px'`) fires `arm(rig)` on the way in — a different path doing the repair. That works only while
"zero-area ⇒ non-intersecting" holds; touch the intersection logic, the `rootMargin`, or mount a gem inside a
container that stays intersecting while its box collapses, and the gem stays parked with `vis === true, dead === false`
and no frame ever scheduled. Exactly the state reproduced below.

### The fix (`src/components/GemReward/gem-rig.js`) — three edits, no behaviour parameters touched

```js
// :19  the siblings' arm(), verbatim guard + two guards gem-rig needs
api.arm = function (rig) { if (rig.raf || rig.gone || !rig.vis || document.hidden || rig.dead || !rig.frame) return; rig.last = performance.now(); rig.raf = requestAnimationFrame(rig.frame); };
// :24  the same `size(); arm(rig)` contract as deck3d:38 / cube3d:46 / illusion3d:40
rig.ro = new window.ResizeObserver(function () { rig.epoch = -1; api.size(rig); api.arm(rig); });
```

- `|| rig.dead` is the sibling guard (deck3d:11, cube3d:13, illusion3d:12) — order matters: `size()` clears `dead`
  first, so a box that regains area arms and a box that stays collapsed does not.
- `|| !rig.frame` is the one guard the siblings don't need: gem-rig is a separate module used by a rig that under
  `prefers-reduced-motion` returns from `start()` before `rig.frame` is assigned (`gem3d.js:23–27`), and arming a
  `null` callback is a TypeError rather than a no-op.
- `rig.last = performance.now()` is the same clock contract as the siblings: resume continues `t` from where it
  stopped instead of replaying the parked interval.
- Header comment (`:12–14`) and the export map (`:15`) updated: `GEM_RIG.arm(rig)` is now part of the module surface.

Untouched, verified by diff: no rendering parameter, the park condition (`gem3d.js:40`
`if (!rig.vis || document.hidden || rig.dead) return;`), the visibility threshold (`rootMargin: '160px'`,
`gem3d.js:85`), `api.size`'s measurement maths, `rig.dead` semantics. `gem3d.js` (100 lines, another lane's budget)
was **not** edited.

Before intent: *a dead gem is revived only by the intersection observer firing again.*
After intent: *a dead gem is revived by whichever event restores its box — its own ResizeObserver, exactly like the other three rigs.*

### Falsification — three states, old vs fixed

Same harness both runs, on `:5243`: the gem's IntersectionObserver is replaced **once per document** (fires the first
intersecting entry while the tab is visible, then never again) — i.e. "the intersection logic changed". Everything
else is real: real WebGL renderer, real ResizeObserver, real loop.

| State | OLD `gem-rig.js` (HEAD) | FIXED `gem-rig.js` |
|-------|-------------------------|--------------------|
| 1. Alive (initial arm via the documented `visibilitychange` re-arm) | `raf=true`, **52 rAF/s**, `t` 2.396 → 3.482 | `raf=true`, **50 rAF/s**, `t` 3.406 → 4.430 |
| 2. Box collapsed (`card.style.display='none'` → RO: `clientWidth 0`) | `dead=true`, `raf=false`, **0 rAF/s**, `t` frozen 3.502 | `dead=true`, `raf=false`, **0 rAF/s**, `t` frozen 4.454 |
| 3. Box restored (`display=''` → RO: box 388×388) | `vis=true`, `dead=false`, `box 388×388`, **`raf=false`, 0 rAF/s, `t` frozen 3.502 → 3.502 — silently dead** | `vis=true`, `dead=false`, **`raf=true`, 57 rAF/s, `t` 4.454 → 5.826 (1.372 s of `t` per 1.5 s wall)** |

State 3 is the defect made visible: OLD ends in a rig that reports itself healthy (`vis`/`dead` correct) and never
draws another frame. FIXED comes back on the ResizeObserver alone, with no help from the intersection observer.
Raw: `.hermes/cache/scratch/lane-I/rig-old.json`, `rig-fixed.json` (scratch, disposable).

---

## Item 3 — proof the gem still behaves on the real thing (`:5243`, no stubs)

`http://127.0.0.1:5243/gallery.html` → gems panel revealed, canvas scrolled into view. Rendering confirmed real,
not the painted stand-in: `canvas.getContext('webgl2') === true`, `renderer.isWebGLRenderer === true`,
`renderer.info.programs.length === 8`, box 388×170. `GEM_FALLBACK.paint` never ran for this canvas.

rAF accounting wraps `window.requestAnimationFrame` and counts only callbacks whose identity is that rig's
`rig.frame`; `t` is sampled every frame and every sample's delta recomputed.

| Phase | rAF callbacks / 1 s | `vis` / `raf` | `t` |
|-------|---------------------|---------------|-----|
| Gem visible | **48** | `true` / `true` | 2.278 → 3.265 (+0.987 in 1 s) |
| Scrolled offscreen (+3000 px spacer, `scrollTo(0,0)`) | **0** | `false` / `false` | 3.318 → 3.318 (frozen) |
| Scrolled back into view | **49** | `true` / `true` | 4.933 → 5.918 (+0.985 in 1 s) |

`t` continuity across the resume (134 frames sampled after the re-arm):

| Metric | Value |
|--------|-------|
| **max single-frame `Δt`** | **0.0500 s** — exactly the pre-existing clamp `Math.min((now - rig.last)/1000 \|\| 0, 0.05)` (`gem3d.js:38`) |
| frames exceeding the clamp | **0** (`> 0.0501` count = 0) |
| first non-zero `Δt` after re-arm | 0.0169 s (an ordinary frame, not a catch-up) |
| `t` gained over 2.89 s wall after the re-arm | 2.5993 s → velocity 0.90 ×, no accumulated jump |

Reading the numbers: the parked second added **zero** to `t` (3.318 stayed put), and after the re-arm `t` advanced
only with real wall time (3.318 + 1.6 s visible = 4.93 at the resume checkpoint). `arm()`'s
`rig.last = performance.now()` is what makes that true; without it the first frame after resume would carry the
parked interval and only the 0.05 clamp would hide it. Nothing about the scene, camera, pool or backdrop changed —
`GEM_RIG.tick(rig)` still runs every frame (`gem3d.js:41`).

---

## Commands (copy-paste order)

```bash
# --- Item 1: reproduce, then prove three states ---
REPO="/Users/irfan/Documents/Portfolio Redo/crm_proj"; cd "$REPO"
SCR=~/.hermes/cache/scratch/lane-I
cp scripts/lint-tokens.mjs "$SCR/lint-tokens.orig.mjs"                     # pre-fix copy
rsync -a --exclude '.git' --exclude node_modules --exclude dist --exclude '.hermes/tmp' ./ "$SCR/repo-nogit/"
cp scripts/lint-tokens.mjs "$SCR/repo-nogit/scripts/lint-tokens.mjs"       # fixed copy, still no .git
mkdir -p "$SCR/empty2" "$SCR/emptygit" && (cd "$SCR/emptygit" && git init -q .)

(cd "$SCR/repo-nogit" && node "$SCR/lint-tokens.orig.mjs"); echo "EXIT=$?"  # 0 — FALSE GREEN, no .git
(cd "$SCR/empty2"     && node "$SCR/lint-tokens.orig.mjs"); echo "EXIT=$?"  # 0 — FALSE GREEN, nothing at all

node scripts/lint-tokens.mjs; echo "EXIT=$?"                                # (a) 0, 1720 files
(cd "$SCR/repo-nogit" && node scripts/lint-tokens.mjs); echo "EXIT=$?"      # (b) 0, 1295 files via walk
(cd "$SCR/empty2"     && node "$REPO/scripts/lint-tokens.mjs"); echo "EXIT=$?"  # (c) 2 + cause + directory
(cd "$SCR/emptygit"   && node "$REPO/scripts/lint-tokens.mjs"); echo "EXIT=$?"  # 2, "git index empty"

# --- Item 2/3: browser proof on the lane port ---
cd "/Users/irfan/Documents/Portfolio Redo/crm_proj"
npx vite --port 5243 --strictPort --host 127.0.0.1
#   headless Chrome → http://127.0.0.1:5243/gallery.html, gems panel revealed, canvas scrolled into view
#   rAF wrapper counts only callbacks === rig.frame; every frame sampled for rig.t
#   scroll-offscreen / scroll-back uses a 3000px spacer + window.scrollTo (real IntersectionObserver)
#   dead-box test stubs IntersectionObserver once-per-document to isolate the ResizeObserver path
```

## Files

| File | Change |
|------|--------|
| `scripts/lint-tokens.mjs` | `:4–10` walk fallback + hard zero-file error (exit 2, cause + cwd); `:51` success prints scanned count. 45 → 51 lines. |
| `src/components/GemReward/gem-rig.js` | `:19` `api.arm`; `:24` ResizeObserver calls it; `:12–15` header/export map. 69 → 72 lines. |

Not touched, per lane ownership: `gem3d.js` (still 100 lines — its own `arm` at `:13` keeps the narrower guard; the
loop's `rig.dead` check at `:40` covers it), `package.json`, `live-map.js`, `reward-sheet.css`, the pixel gate.
`node --check` clean on both files; `node scripts/lint-tokens.mjs` green on the real repo after both edits. Nothing
committed.
