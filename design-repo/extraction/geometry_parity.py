#!/usr/bin/env python3
"""Per-section geometry parity between the original and clone recon dumps.

    python3 extraction/geometry_parity.py [--dumps <dir>] [--json]

Reads the text-free computed-style dumps written during recon/pixel-audit
(`o<vp>.n` = original, `c<vp>b.n` = clone after pixel-audit fixes) from the
sibling project's `.playwright-mcp/` folder (default: <repo>/../.playwright-mcp).
For every `## <section>` block it matches each original row to an unused clone
row with the identical style suffix (font / border / radius / colour) and all
four box numbers within 1.5 px (element kind ignored, see compare()).

This is GEOMETRY parity over measured boxes and computed styles, not pixel
parity: no live-vs-clone screenshot diff exists for this project (see
measured-values.json -> cloneQuality). When the dumps are absent (e.g. a
standalone copy of design-repo/), it prints a notice and exits 0.
"""
import argparse, json, re, sys
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent
TOL = 1.5
VIEWPORTS = ("1440", "1280", "390")


def parse(path):
    blocks, cur = {}, None
    for line in path.read_text(errors="ignore").splitlines():
        if line.startswith("## "):
            name = line[3:].split(" ")[0]
            cur = blocks.setdefault(name, [])
            cur.append(line)  # header row (root box) counts as a row
        elif cur is not None and line.strip():
            cur.append(line)
    return blocks


NUM = re.compile(r"^(\S+)\s+(-?[\d.]+),(-?[\d.]+),(-?[\d.]+),(-?[\d.]+)(.*)$")


def key(row):
    m = NUM.match(row.replace("## ", ""))
    if not m:
        return None
    return tuple(float(m.group(i)) for i in range(2, 6)), m.group(6).strip()


def compare(o, c):
    """Greedy tolerant matching: an original row counts as matched when some unused
    clone row in the same section has the same style suffix and all four box numbers
    within TOL px. The element kind is ignored on purpose (the clone swaps the
    original's inline brand svg for a placeholder img, and wraps some text rows in a
    button), so only geometry + computed style decide parity."""
    res = {}
    for name, orows in o.items():
        if orows and "MISSING" in orows[0]:
            continue
        pool = [k for k in (key(r) for r in c.get(name, [])) if k]
        okeys = [k for k in (key(r) for r in orows) if k]
        ok = 0
        for box, style in okeys:
            for j, (cbox, cstyle) in enumerate(pool):
                if cstyle == style and all(abs(a - b) <= TOL for a, b in zip(box, cbox)):
                    ok += 1
                    pool.pop(j)
                    break
        n = len(okeys)
        res[name] = {"rows": n, "matching": ok, "pct": round(100.0 * ok / n, 1) if n else 100.0}
    return res


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--dumps", default=str(REPO.parent / ".playwright-mcp"))
    ap.add_argument("--json", action="store_true")
    a = ap.parse_args()
    d = Path(a.dumps)
    if not d.is_dir():
        print(f"NOTICE: no dump folder at {d.name!r} next to design-repo; geometry parity not re-run (recorded values stay in measured-values.json)")
        return 0
    out = {}
    for vp in VIEWPORTS:
        o, c = d / f"o{vp}.n", d / f"c{vp}b.n"
        if o.exists() and c.exists():
            out[vp] = compare(parse(o), parse(c))
    if a.json:
        print(json.dumps(out, indent=1))
    else:
        for vp, secs in out.items():
            avg = sum(s["pct"] for s in secs.values()) / len(secs)
            worst = min(secs.items(), key=lambda kv: kv[1]["pct"])
            print(f"{vp}: average {avg:.1f}% over {len(secs)} sections; worst {worst[0]} {worst[1]['pct']}%")
            for k, s in secs.items():
                print(f"   {k:10} {s['matching']:3}/{s['rows']:3}  {s['pct']}%")
    return 0


if __name__ == "__main__":
    sys.exit(main())
