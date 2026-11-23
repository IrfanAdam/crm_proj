# Process Audit Report — 2026-11-22 19:44 IST
Working directory: /Users/irfan/Documents/Portfolio Redo/crm_proj
No processes killed — read-only inspection only.

## 1. Summary (Top Compute Hogs)

| RANK | PID | %CPU | %MEM | COMMAND (truncated) |
|------|-----|------|------|---------------------|
| 1 | 49077 | 66.2 | 0.1 | /usr/libexec/sysmond (macOS system monitor — spikes under load, NOT a leak) |
| 2 | 84568 | 44.6 | 0.3 | Hermes Helper (GPU) |
| 3 | 634 | 42.8 | 0.5 | WindowServer |
| 4 | 24457 | 39.0 | 1.0 | Hermes Helper (Renderer) id=20 |
| 5 | 83968 | 31.1 | 1.3 | Hermes gateway `gateway run --external-supervisor` (python3 launcher + gateway) |
| 6 | 83656 | 25.0 | 1.4 | Hermes Helper (Renderer) id=9 |
| 7 | 97475/2125/5702 | 3-5 | 0.2 | Chrome headless GPU helpers (gem-* temp dirs) |
| 8 | 97487/5712/2131/23246 | 2-3 | 0.5 | Chrome headless RENDERER helpers |

System-level hogs (sysmond, WindowServer, audioanalyticsd, coreaudiod, driverkit) are normal macOS.

---

## 2. Node / Vite / Esbuild — THE MAIN USER-STARTED SERVERS

### 2.1 Vite dev server — crm_proj @ 5173 (KEEP — active project)
- PID 53101: `npm exec vite --port 5173 --strictPort` — parent, 0.0% CPU, 0.1% MEM (19 MB)
- PID 53121: `node .../crm_proj/node_modules/.bin/vite --port 5173 --strictPort` — **LISTEN *:5173**, 0.0% CPU, 0.1% MEM (30 MB), VSZ 499M, cumulative 1:12.97 CPU
- PID 53122: `.../crm_proj/node_modules/@esbuild/darwin-arm64/bin/esbuild --service=0.21.5 --ping` — idle ping, 0.0% CPU
- Started: Fri 11PM (recent) — **This is your current crm_proj dev server**

### 2.2 Vite dev server — crm_proj @ 5174 (DUPLICATE / STALE — candidate to kill)
- PID 24098: `npm exec vite --host 0.0.0.0 --port 5174` — parent, 0.0% CPU
- PID 24494: `node .../crm_proj/node_modules/.bin/vite --host 0.0.0.0 --port 5174` — **LISTEN *:5174**, 0.0% CPU, 0.1% MEM (25 MB), cumulative 0:30 CPU
- PID 24495: `esbuild --service --ping` — idle
- Started: Fri 07PM — Older second instance for same project on different port. Likely orphanED from earlier session.

### 2.3 Vite preview — personal_website @ 5200
- PID 32772: `npm exec vite preview --port 5200 --strictPort` — parent
- PID 33149: `node .../personal_website/node_modules/.bin/vite preview --port 5200 --strictPort` — **LISTEN [::1]:5200**, 0.0% CPU, 0.1% MEM (20 MB)
- PID 33151: `esbuild --service --ping`
- Started: Sat 05PM — Separate project (personal_website). Not crm_proj but still running.

---

## 3. Listening Ports (lsof -i -P -n)

| Port | PID | Process | Bind | Purpose | Verdict |
|------|-----|---------|------|---------|---------|
| **5173** | 53121 | node vite (crm_proj) | *:5173 | crm_proj dev | **KEEP** |
| **5174** | 24494 | node vite (crm_proj) | *:5174 | crm_proj duplicate dev | **STALE — kill candidate** |
| **5200** | 33149 | node vite preview | [::1]:5200 | personal_website preview | Keep or kill if not needed |
| **8931** | 60731 | Python http.server | *:8931 | /Users/irfan/.hermes/cache/scratch/preview-p1 | Preview helper |
| **8080** | 95288 | Python http.server | *:8080 | Xcode Python http.server | Hermes/desktop helper |
| **8956** | 24965 | Python | *:8956 | detected in later lsof sweep | Check origin |
| 57522 | 83968 | python3.1 (Hermes gateway) | 127.0.0.1:57522 | Hermes gateway IPC | **KEEP** (gateway) |
| 5037 | 19388 | adb | 127.0.0.1:5037 | Android Debug Bridge | Keep if Android dev |
| 19692 | 3199 | Spline | 127.0.0.1:19692 | Spline tool | Keep |
| 7768 / 57621 | 1512 | Spotify | 127.0.0.1:7768 / *:57621 | Spotify local API | System |
| 42050 | 43719 | OneDrive | [::1]:42050 | OneDrive | System |
| 3845 / 44950/44960 | 62387/62410 | Figma | 127.0.0.1 | Figma agent | System |
| 49621 | 1860 | Notion | 127.0.0.1:49621 | Notion | System |
| 7000/5000 | 1335 | ControlCenter | *:7000/*:5000 | AirPlay | System |
| 7679 | 64668 | Google Drive | [::1]:7679 | Drive | System |
| 57539 | 992 | rapportd | *:57539 | Apple Rapport | System |

**Port 3000: NOT LISTENING** (no lsof entry — free)

**Established connections to 5173:** 4 Chrome headless sessions connected (PIDs 2126, 5703, 23240, 97476) — these are the browser_harness/Chrome probes hitting vite hot-reload.

---

## 4. Chrome Headless Herd (High CPU but ephemeral?)

8+ Chrome instances in /var/folders/lv/.../gem-*/ and /tmp/cdp-cv-profile-9410:
- gem-sweep-97466-59229 (port 59229) — GPU 5.4% + Renderer 3.4% = ~8.8% CPU
- gem-sweep-2113-60175 (port 60175) — GPU 3.3% + Renderer 2.4%
- gem-probe2-5690 (port 61106) — GPU 3.4% + Renderer 2.6%
- gem-ab-23232-65532 (port 65532) — GPU 2.9% + Renderer 2.3%
- gem-ab-30588-54501 (port 54501) — 5 processes ~10% combined
- gem-ab-?? (port 54176) + cv-profile-9410 (port 9410) — 6 processes

These are **browser_harness driven Chrome** — each pairs with a `python3 -m browser_harness.daemon`. They poll vite for visual testing. Not vite servers themselves but collectively ~25-30% CPU. Candidates for cleanup.

---

## 5. Hermes / Python Background Jobs (32 daemons!)

### 5.1 Hermes Gateway (ESSENTIAL — DO NOT KILL)
- PID 83968: Main gateway launcher (python3 -I -c ... `gateway run --external-supervisor`) — 31% CPU, 1.3% MEM — **KEEP**
- PID 83956: Recovery wrapper (`hermes_cli.stderr_timestamp`) — parent of gateway
- PID 83952: `/usr/bin/osascript -l JavaScript ... Hermes gateway` — launchd supervisor
- PID 92789: `hermes_cli/process_supervisor.sh 83952` — supervisor shell
- PID 84557: `/Applications/Hermes.app/Contents/MacOS/Hermes` — Electron main
- PIDs 84568/84569/86032/83656/24457: Hermes Helper (GPU, Network, Audio, Renderers) — Electron runtime

### 5.2 browser_harness.daemon swarm (32 instances — MAJOR CLEANUP TARGET)
All are `/Users/irfan/.hermes/tools/python-3.14.9+20261021-darwin-arm64/bin/python3 -m browser_harness.daemon`
Each ~0.0% CPU idle, 0.0% MEM, but 32 x Python processes + paired Chrome = memory/CPU overhead.

PIDs (sorted newest first):
11649,10822,10338,9015,7635,6872,6449,4539,2009,102,98646,82478,80892,79677,78011,73317,71015,70575,66185,63336,62031,43256,96192,19648,97325,23899,22377,20374,19076,18116,17959,17097,24965

- Oldest: Sat03PM (96192) — 3 days old
- Most are orphans from prior Hermes sessions that never exited. Should be reaped.
- Each daemon holds no listening port directly; Chrome children do.

### 5.3 Preview / HTTP helpers
- PID 60731: `Python -m http.server 8931 --directory /Users/irfan/.hermes/cache/scratch/preview-p1` — Started Sat06PM, 0.06 CPU — serves scratch preview
- PID 95288: `Python -m http.server 8080` — Started Fri05PM

### 5.4 Shell jobs
- `jobs -l` in current shell: **empty** (no foreground jobs in this terminal)

---

## 6. Git Worktrees & Branches

### git branch -a
```
* main                          dee15c3 [origin/main] fix(mechanics): content-hash graph sources...
  remotes/origin/HEAD -> origin/main
  remotes/origin/main
  remotes/origin/polish/changelog-drawer
```
- Only 1 local branch: `main` — clean, up to date with origin/main, working tree clean.
- 1 remote branch: `polish/changelog-drawer` — not checked out locally.

### git worktree list (6 entries — 5 are detached temp lanes)
```
1. /Users/irfan/Documents/Portfolio Redo/crm_proj           dee15c3 [main]                          (MAIN — KEEP)
2. /private/tmp/changelog-cancel                             a4d36d7 (detached HEAD)                — plan 2026-11-16_225300 #rev-3
3. /private/tmp/changelog-tasks                              a4d36d7 (detached HEAD)                — SAME commit as #2 (duplicate)
4. /private/tmp/gem-prev                                     dedfc58 (detached HEAD)                — gem realism round2 phase-18
5. /private/tmp/plan-close                                   a4d36d7 (detached HEAD)                — SAME as #2/#3
6. /Users/irfan/.hermes/cache/scratch/look-oracle/wt         e2a0b9f (detached HEAD)                — plan rev 5b sweep
```

All tmp worktrees point to commits a4d36d7/dedfc58/e2a0b9f which are **ahead/behind main?** Need to check age — all from recent plans.
- `/private/tmp/changelog-cancel`, `changelog-tasks`, `plan-close` are **triplicates at same commit** — likely helper lanes that can be pruned.
- `/private/tmp/gem-prev` at dedfc58 — separate gem lane.
- `look-oracle/wt` at e2a0b9f — scratch oracle lane.
- None have running processes bound (lsof +D returned empty) — safe to `git worktree remove` when done.

---

## 7. Kill / Keep Recommendations (NO ACTION TAKEN)

### KEEP (useful)
- node 53121 @ 5173 — active crm_proj dev server
- python 83968 + 83952/83956/92789 + Hermes.app 84557 + helpers — gateway + Electron (killing breaks Hermes)
- WindowServer, sysmond, coreaudiod, etc. — macOS system

### KILL CANDIDATES (non-useful / orphaned — ask user before killing)
1. **node 24494 @ 5174** (+ 24098, 24495) — duplicate vite for same project, different port, Fri07PM vintage
2. **node 33149 @ 5200** (+ 32772, 33151) — personal_website preview — kill if not actively previewing that site
3. **browser_harness daemons × 32** — biggest win: each spawns Chrome. Kill all except maybe 1-2 newest if active session needs them. Command: `pkill -f browser_harness.daemon`
4. **Chrome headless herd** — will die when daemons killed; else `pkill -f 'gem-sweep|gem-probe2|gem-ab'` and `/tmp/cdp-cv-profile-9410` instance
5. **python http.server 8931 (60731) and 8080 (95288) and 8956 (24965)** — kill if not previewing anything
6. **Temp worktrees** — `git worktree remove /private/tmp/changelog-cancel` etc. when lanes no longer needed (frees disk, not CPU)
7. **adb (19388)** — only if not doing Android work

### ESTIMATED SAVINGS IF CLEANED
- Killing browser_harness + Chrome: ~25-35% CPU, ~1.5GB RAM, reduces sysmond load
- Killing duplicate vite @5174: minor (0% idle) but frees port
- Worktree cleanup: disk only, ~0 CPU

---

## 8. Raw Command Outputs (for verification)
- ps aux | head -n 100 — captured 2026-11-22 19:44
- ps aux | grep -E 'node|vite|hermes|python' — 38 matches
- lsof -i :5173 -i :5174 -i :3000 -i :5200 — ports 5173,5174,5200 live; 3000 free
- lsof -i -P -n (all) — 70+ entries
- ps aux | sort -k3 -rn — sysmond 66%, Hermes GPU 44%, WindowServer 42%, Hermes gateway 31%
- git worktree list — 6 worktrees
- git branch -a — 1 local, 2 remote refs
- git status — clean

---
Generated: 2026-11-22T19:44:00+05:30
Host: macOS 27.2.1 (arm64)
Auditor: Hermes subagent (read-only)
