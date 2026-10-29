#!/usr/bin/env python3
"""Per-section live-vs-clone PIXEL parity over the tiles written by extraction/pixel_capture.mjs.

    python3 extraction/pixel_parity.py --shots <dir> [--json] [--tol 32]

For every viewport and section tile present for both the original (o<vp>_*) and the clone
(c<vp>_*): crop both screenshots to the original's section box (same viewport, same scroll
offset), drop the union of both sites' mask boxes, and count the pixels whose max RGB channel
difference is <= tol (default 32 of 255). A section's score is matched / compared pixels over
all its tiles. Requires Pillow + numpy; when the shots folder is absent it prints a notice and
exits 0 (the recorded numbers live in measured-values.json -> cloneQuality.pixelParity).
"""
import argparse, json, sys
from pathlib import Path

VIEWPORTS = ("1440", "1280", "390")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--shots", required=True)
    ap.add_argument("--tol", type=int, default=32)
    ap.add_argument("--json", action="store_true")
    a = ap.parse_args()
    d = Path(a.shots)
    if not d.is_dir():
        print(f"NOTICE: no shots folder {d.name!r}; pixel parity not re-run")
        return 0
    try:
        import numpy as np
        from PIL import Image
    except ImportError:
        print("NOTICE: Pillow/numpy not installed; pixel parity not re-run")
        return 0
    out = {}
    for vp in VIEWPORTS:
        mo, mc = d / f"o{vp}.json", d / f"c{vp}.json"
        if not (mo.exists() and mc.exists()):
            continue
        o, c = json.loads(mo.read_text()), json.loads(mc.read_text())
        secs = {}
        for key, ot in o["tiles"].items():
            ct = c["tiles"].get(key)
            if not ct:
                continue
            A = np.asarray(Image.open(d / ot["file"]).convert("RGB"), dtype=np.int16)
            B = np.asarray(Image.open(d / ct["file"]).convert("RGB"), dtype=np.int16)
            h, w = A.shape[:2]
            keep = np.zeros((h, w), bool)

            def box(x, y, bw, bh, pad=0):
                # clamp to the image; boxes fully off-screen give an empty slice (never a negative index)
                y0, y1 = min(h, max(0, int(y))), min(h, max(0, int(y + bh + pad)))
                x0, x1 = min(w, max(0, int(x))), min(w, max(0, int(x + bw + pad)))
                return slice(y0, y1), slice(x0, x1)

            keep[box(*ot["crop"])] = True
            for m in ot["masks"] + ct["masks"]:
                keep[box(*m, pad=1)] = False
            diff = np.abs(A - B).max(axis=2)
            n = int(keep.sum())
            m = int(((diff <= a.tol) & keep).sum())
            name = key.rsplit("_", 1)[0]
            s = secs.setdefault(name, {"pixels": 0, "matching": 0, "tiles": 0})
            s["pixels"] += n; s["matching"] += m; s["tiles"] += 1
        for s in secs.values():
            s["pct"] = round(100.0 * s["matching"] / s["pixels"], 1) if s["pixels"] else 100.0
        out[vp] = secs
    if a.json:
        print(json.dumps(out, indent=1))
    else:
        for vp, secs in out.items():
            avg = sum(s["pct"] for s in secs.values()) / max(1, len(secs))
            print(f"{vp}: average {avg:.1f}% over {len(secs)} sections (tol {a.tol})")
            for k, s in secs.items():
                print(f"   {k:10} {s['pct']:5}%  ({s['tiles']} tile(s), {s['pixels']} px compared)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
