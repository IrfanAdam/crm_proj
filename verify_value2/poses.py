#!/usr/bin/env python3
"""poses.py — locate (front, dark) pose pairs in a lane dir, flat or per-cat layout.

Layouts supported:
  flat : <dir>/<cat>_front[_aNN][_tTILT].png  + <dir>/<cat>_dark...png
  sub  : <dir>/<cat>/front...png              + <dir>/<cat>/dark...png

Each pose is yielded as a dict:
  {"cat","pose","angle","tilt","front","dark"}
"""
import glob
import os
import re

FRONT_RE = re.compile(r"^front(?:_a(\d+))?(?:_t(-?[\d.]+))?\.png$")
TIR_RE = re.compile(r"^tirmask(?:_a(\d+))?(?:_t(-?[\d.]+))?\.png$")


def label(ang, tilt):
    s = f"a{ang}"
    if abs(tilt) > 1e-9:
        s += f"_t{tilt:g}"
    return s


def suffix(ang, tilt):
    return ("_a%d" % ang if ang else "") + (("_t%g" % tilt) if tilt else "")


def poses(root, cat):
    """Yield dicts for every front/dark pair of `cat`."""
    sub = os.path.join(root, cat)
    out = []
    if os.path.isdir(sub) and glob.glob(os.path.join(sub, "front*.png")):
        files = sorted(glob.glob(os.path.join(sub, "front*.png")))
        for f in files:
            m = FRONT_RE.match(os.path.basename(f))
            if not m:
                continue
            ang = int(m.group(1)) if m.group(1) else 0
            tilt = float(m.group(2)) if m.group(2) else 0.0
            dark = os.path.join(sub, "dark" + suffix(ang, tilt) + ".png")
            out.append({"cat": cat, "pose": label(ang, tilt), "angle": ang, "tilt": tilt,
                        "front": f, "dark": dark, "dir": sub})
    else:
        files = sorted(glob.glob(os.path.join(root, f"{cat}_front*.png")))
        for f in files:
            base = os.path.basename(f)[len(cat) + 1:]
            m = FRONT_RE.match(base)
            if not m:
                continue
            ang = int(m.group(1)) if m.group(1) else 0
            tilt = float(m.group(2)) if m.group(2) else 0.0
            dark = os.path.join(root, f"{cat}_dark" + suffix(ang, tilt) + ".png")
            out.append({"cat": cat, "pose": label(ang, tilt), "angle": ang, "tilt": tilt,
                        "front": f, "dark": dark, "dir": root})
    out.sort(key=lambda p: (p["angle"], p["tilt"]))
    return out


def tirmasks(root, cat):
    """Yield dicts for every tirmask shot of `cat` (may be a subset of poses)."""
    sub = os.path.join(root, cat)
    out = []
    if os.path.isdir(sub) and glob.glob(os.path.join(sub, "tirmask*.png")):
        files = sorted(glob.glob(os.path.join(sub, "tirmask*.png")))
        for f in files:
            m = TIR_RE.match(os.path.basename(f))
            if not m:
                continue
            ang = int(m.group(1)) if m.group(1) else 0
            tilt = float(m.group(2)) if m.group(2) else 0.0
            out.append({"cat": cat, "pose": label(ang, tilt), "angle": ang, "tilt": tilt,
                        "tir": f, "dark": os.path.join(sub, "dark" + suffix(ang, tilt) + ".png"),
                        "front": os.path.join(sub, "front" + suffix(ang, tilt) + ".png"),
                        "dir": sub})
    else:
        files = sorted(glob.glob(os.path.join(root, f"{cat}_tirmask*.png")))
        for f in files:
            base = os.path.basename(f)[len(cat) + 1:]
            m = TIR_RE.match(base)
            if not m:
                continue
            ang = int(m.group(1)) if m.group(1) else 0
            tilt = float(m.group(2)) if m.group(2) else 0.0
            out.append({"cat": cat, "pose": label(ang, tilt), "angle": ang, "tilt": tilt,
                        "tir": f, "dark": os.path.join(root, f"{cat}_dark" + suffix(ang, tilt) + ".png"),
                        "front": os.path.join(root, f"{cat}_front" + suffix(ang, tilt) + ".png"),
                        "dir": root})
    out.sort(key=lambda p: (p["angle"], p["tilt"]))
    return out
