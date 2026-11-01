#!/usr/bin/env python3
"""verify_value3/poll.py — wait for the sibling lane's lanes/value3/DONE marker.

Polls every 60 s, up to N polls (default 10 per invocation; the lane budget is
30 polls total, tracked in verify_value3/poll_state.json).

Exit code 0 when DONE exists, 3 when the budget for this call is exhausted.
"""
import json
import os
import sys
import time

ROOT = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.dirname(ROOT)
DONE_CANDIDATES = [
    os.path.join(REPO, "lanes", "value3", "DONE"),
    os.path.join(REPO, ".hermes", "tmp", "round6", "lanes", "value3", "DONE"),
]
STATE = os.path.join(ROOT, "poll_state.json")


def done_path():
    for p in DONE_CANDIDATES:
        if os.path.exists(p):
            return p
    return None


def load_state():
    if os.path.exists(STATE):
        with open(STATE) as fh:
            return json.load(fh)
    return {"polls": 0, "history": []}


def save_state(st):
    with open(STATE, "w") as fh:
        json.dump(st, fh, indent=2)


def main(argv):
    max_polls = int(argv[1]) if len(argv) > 1 else 10
    interval = float(argv[2]) if len(argv) > 2 else 60.0
    st = load_state()
    for i in range(max_polls):
        st["polls"] += 1
        stamp = time.strftime("%H:%M:%S")
        if done_path():
            st["history"].append({"t": stamp, "poll": st["polls"], "result": "DONE", "path": done_path()})
            save_state(st)
            print(f"[{stamp}] poll {st['polls']}: DONE found at {done_path()}")
            return 0
        lane = os.path.join(REPO, "lanes", "value3")
        info = f"lane_dir={'yes' if os.path.isdir(lane) else 'no'}"
        if os.path.isdir(lane):
            pngs = [f for f in os.listdir(lane) if f.endswith(".png")]
            subs = [d for d in os.listdir(lane) if os.path.isdir(os.path.join(lane, d))]
            info += f" pngs={len(pngs)} subdirs={subs}"
        st["history"].append({"t": stamp, "poll": st["polls"], "result": "waiting", "info": info})
        save_state(st)
        print(f"[{stamp}] poll {st['polls']}/{st['polls']}: not done ({info})", flush=True)
        if i < max_polls - 1:
            time.sleep(interval)
    save_state(st)
    return 3


if __name__ == "__main__":
    raise SystemExit(main(sys.argv))
