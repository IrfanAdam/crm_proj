# Lane C2 — remove the dead `@phosphor-icons/react` dependency

**Base:** `b97b1de` + the six lanes' uncommitted working tree. **Port:** none used (no dev server started).
**Writes owned:** `package.json`, `package-lock.json`, deletion of `src/components/Icon/gem-icons.js`, this file.
**Outcome:** dead file deleted, dependency dropped, lock refreshed without a full install, `npm ci` clean,
build exit 0, and the shipped output is **byte-identical** — this change cannot regress rendering or bytes.

## 1. Deadness proof (run before anything was touched)

```
$ git grep -n "gem-icons"
.hermes/evals/2026-11-16-mobile-perf-parity/lane-C.md:29,135      (docs)
docs/graph.mmd:74    components_Icon_gem-icons[gem-icons.js]        (generated architecture graph)
docs/graph.mmd:118   components_Icon_Icon --> components_Icon_gem-icons
src/components/Icon/gem-icons.js:1                                 (its own header comment)
```

```
$ git grep -n "@phosphor-icons/react"
package.json:29            "@phosphor-icons/react": "^2.1.10",     (the dependency)
package-lock.json:11,795,797                                        (the lock entries)
src/components/Icon/gem-icons.js:23   } from "@phosphor-icons/react";   (the import)
src/shell/icons.jsx:2,4                                             (comment text only — no import)
DESIGN_SYSTEM.md:10 · .hermes/plans/*.md · .hermes/evals/*.md       (prose)
```

Plain recursive grep over the whole tree (tracked **and** untracked, `node_modules`/`.git`/`dist` excluded):

```
$ grep -rn --binary-files=without-match -E "gem-icons|@phosphor-icons/react" . \
    --exclude-dir=node_modules --exclude-dir=.git --exclude-dir=dist
… same hits as above, plus:
.hermes/tmp/lane-c/extract.mjs:7,8,9   import … from '@phosphor-icons/react/dist/csr/{House,Users,Handshake}'
```

**Verdict: zero importers inside the app.** No file under `src/`, `scripts/`, `public/`, `prototype/` or any
`*.html` references `gem-icons` except its own header; `Icon.jsx` imports only `../../shell/icons.jsx` and
`GemFriendly/GemLite/GemMinimal`. Confirmed there is no glob/dynamic loader that could pull it in
(`import.meta.glob` exists only for `.hermes/plans/*.md` in `src/pitch/pages-changelog.js`).

The one non-doc importer is `.hermes/tmp/lane-c/extract.mjs` — a **gitignored throwaway** (`.gitignore:4`,
`git ls-files .hermes/tmp` → 0 files) left by the lane that extracted the path data. It is a scratch oracle,
not app code, and is intentionally not a blocker; see §5.

## 2. Deletion + build A/B

Deleted `src/components/Icon/gem-icons.js` (88 lines). Build command (no `npm run build`, so the shared
generators stay untouched — see §5):

```
DEP_OUTDIR=$TMPDIR/dep-dist-<n> node node_modules/vite/bin/vite.js build --config <temp config>
```

The temp config is `vite.config.js` verbatim **minus `mechanicsGraphPlugin`**, which re-spawns
`scripts/generate-mechanics-graph.js` on `buildStart` and rewrites `src/js/mechanics/graphData*.js` — files a
concurrent lane owns. Every other plugin (`react`, `gemBootPlugin`, `entryPreloadPlugin`,
`rawSourceRefsPlugin`) is kept. Both sides of the A/B use the same config, so the delta is attributable only
to my change.

| metric (entry chunk = `main-*.js`) | before deletion | after deletion | delta |
| --- | --- | --- | --- |
| entry raw bytes | 362 571 | 362 571 | **0** |
| entry gzip -9 bytes | 112 762 | 112 762 | **0** |
| all JS raw | 1 907 603 | 1 907 603 | **0** |
| all JS gzip -9 | 566 694 | 566 694 | **0** |
| dist files | 361 | 361 | sha256 set **identical** |

Both builds exit **0**. The reason it is exactly equal: the file had no importers, so Rollup never had it in
the module graph — deleting it removes a latent import of an uninstalled package, not a byte.

Re-run as a back-to-back control pair on the *current* tree with post-`npm ci` `node_modules`
(`git show HEAD:…gem-icons.js` restored → build → deleted → build): both produced
`main-DpMkrA1i.js` 362 571 raw / 112 762 gz, 1 907 603 total JS, and all **361 dist files byte-identical**.

Caveat recorded honestly: a third build after the dependency drop hashed `main-DpMkrA1i.js` instead of
`main-vZpzLePQ.js` at *identical* size. Cause is another lane: `src/js/mechanics/graphData{,.logic,.schema,
.decisions}.js` and `src/components/GemReward/gem-rig.js` were written at 09:27:05–09:27:23, between my
builds, and my build logs show the generator was never invoked (`grep -ci "mechanics|graphData" → 0`).

## 3. `package.json` + lockfile, no full install

Removed the single line `"@phosphor-icons/react": "^2.1.10",` from `dependencies`, then:

```
$ npm install --package-lock-only --prefer-offline --no-audit --no-fund
up to date in 678ms          # exit 0
$ diff package-lock.before.json package-lock.json
11d10     <         "@phosphor-icons/react": "^2.1.10",
795,806d793  <     "node_modules/@phosphor-icons/react": { … version/resolved/integrity/engines/peers … }
```

Exactly the two expected removals, 13 lines, nothing else in the 1 753-line lock moved. `node_modules` was
not written by this command for the package tree itself (entry count unchanged at that point).

### Coherence checks

| check | result |
| --- | --- |
| `npm ls --package-lock-only @phosphor-icons/react` | `└── (empty)`, exit 1 — npm's exit code for a name filter that matches nothing; this *is* the "absent" signal |
| `npm ls --package-lock-only --all \| grep -i phosphor` | no match (exit 1) — absent from the resolved lock tree |
| `npm ls --all` | exit **0**, `grep -ci phosphor` → **0** |
| real `npm ci --prefer-offline --no-audit --no-fund` | exit **0**, `added 71 packages in 4s` |
| **negative control** (temp dir: this lock + a `package.json` that re-declares the package) | `npm ERR! code EUSAGE … Missing: @phosphor-icons/react@2.1.10 from lock file`, exit 1 |

The negative control is the point: `npm ci` hard-fails on any package.json/lock disagreement, so the clean
`npm ci` in the positive row proves the lock really matches the manifest. **Do not use `npm ci --dry-run` as
a coherence check** — in this npm version it deletes `node_modules` before the dry-run short-circuits (see §6).

## 4. Glyph markup parity (3 glyphs × 2 weights)

Method: a scratch oracle renders the real component module, `src/shell/icons.jsx`, through esbuild
(`loader: jsx, jsx: automatic`) and `react-dom/server renderToStaticMarkup` with the dock's props
(`{ size: 24, weight, className: 'dock-ico', 'aria-hidden': 'true' }`), then extracts `xmlns`, `viewBox`,
`width`, `height`, `fill`, `class`, `aria-hidden`, every `<path d>` and a sha256 of the markup. Run once
before my change and once after; `diff` of the two JSON snapshots.

Result: **snapshots identical for all 6 combinations** — `House/Users/Handshake` × `regular/fill`, each
`viewBox="0 0 256 256"`, `24x24`, `fill="currentColor"`, exactly 1 path, `d` lengths 256/193, 406/409,
798/723 bytes. `shasum -c` also confirms `src/shell/icons.jsx` and `src/components/Icon/Icon.jsx` are
unchanged by me (I only read them). Screenshots were deliberately not used — another lane already
pixel-proved these glyphs; markup equality is the stronger check for a dependency removal.

## 5. Deliberately left alone

- `src/shell/icons.jsx` lines 2, 4 — the `Why:` comment naming `@phosphor-icons/react` as the provenance of
  the path data. It is accurate provenance (MIT attribution), not a reference, and another lane owns that file.
- `docs/graph.mmd` — generated by `scripts/generate-arch-atlas.mjs`; still lists an `Icon → gem-icons.js`
  edge and is now stale. Regenerating is a `generate-*` run that rewrites shared files, so it is left for a
  lane that owns it (`npm run verify:atlas` will flag it until then).
- `DESIGN_SYSTEM.md:10`, `.hermes/plans/*.md`, `.hermes/evals/*.md` — prose/history that describes the old
  state; history should not be rewritten.
- `.hermes/tmp/lane-c/*` — gitignored scratch; `extract.mjs` no longer resolves now that the package is
  uninstalled, which is fine for a throwaway, and its output snapshot is already committed under that lane's
  report.

## 6. Incident + recovery (disclosure)

Running `npm ci --dry-run` (with the intent of a non-destructive coherence check) **emptied `node_modules`**:
this npm deletes the tree before honouring `--dry-run`. It was detected within one command
(`node_modules` = 3 entries, `react` unreadable) and restored immediately with a real
`npm ci --prefer-offline --no-audit --no-fund` → exit 0, `added 71 packages`, all ten direct deps present at
their locked versions (`react`/`react-dom` 19.3.0, `vite` 5.4.11, `@vitejs/plugin-react` 4.7.0, …).

Residual effect: any dev server on the shared tree that served a request inside the ~2-minute window lost its
module resolution and its `node_modules/.vite` prebundle cache. Servers must be reloaded/re-run; no tracked
file was affected. The restored tree is the *intended* end state — `@phosphor-icons/react` is no longer
installed, which is why deleting `gem-icons.js` had to land in the same change.

## Reproduce

```sh
grep -rn "gem-icons" src scripts public *.html          # expect: no hits
npm ls --package-lock-only @phosphor-icons/react        # expect: └── (empty)
npm ci --dry-run                                        # DO NOT RUN — deletes node_modules
node node_modules/vite/bin/vite.js build                # expect: exit 0
```
