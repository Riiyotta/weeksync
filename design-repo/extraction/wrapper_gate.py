#!/usr/bin/env python3
"""Whole-page-wrapper quality gate (BASELINE R9), called from verify_all.py.

    python3 extraction/wrapper_gate.py [--measured file.json] [--whitelist file.json]

Uses MEASURED heights (extraction/measured-values.json -> sectionHeights, captured by
extraction/measure_sections.mjs in a headless browser at 1440px). Thresholds are pinned
here in code, not only in JSON:

  * HERO rendered height > 1800px -> warn; > 3000px -> error unless whitelisted.
  * one in-flow section > 50% of its page -> warn; > 60% -> error unless whitelisted
    (pages with < 3 in-flow sections are skipped; SHELL is excluded; fixed/absent/
    collapsed layers take no page height).
  * a template node with no measurement -> error; measured at a viewport other than
    1440 wide -> error.
  * whitelist entries need reviewedBy, a justification >= 30 chars and a maxHeightPx
    above the measured height; stale or over-cap entries fail; an agent reviewer must
    say "agent attestation, not a human sign-off". A whitelisted hit still warns.
"""
import argparse
import json
import sys

sys.dont_write_bytecode = True  # keep the package free of __pycache__
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent

HERO_WARN_PX = 1800
HERO_ERROR_PX = 3000
SHARE_WARN = 0.50
SHARE_ERROR = 0.60
MIN_INFLOW_SECTIONS = 3
REQUIRED_VIEWPORT_WIDTH = 1440
INFLOW_LAYERS = {"in-flow", "in-flow-loop"}
AGENT_ATTESTATION = "agent attestation, not a human sign-off"


def _load(p):
    return json.loads(Path(p).read_text())


def check(measured, whitelist, templates=None, sections=None):
    templates = templates or _load(REPO / "templates/templates.json")["templates"]
    sections = sections or {p.stem: _load(p) for p in (REPO / "sections").glob("*.json")}
    cat = {k: v["semantic"]["category"] for k, v in sections.items()}
    errors, warnings = [], []
    sh = measured.get("sectionHeights")
    if not sh:
        return ["GATE_NO_MEASUREMENTS: measured-values.json has no sectionHeights"], warnings
    if sh.get("viewportWidth") != REQUIRED_VIEWPORT_WIDTH or not str(sh.get("viewport", "")).startswith(f"{REQUIRED_VIEWPORT_WIDTH}x"):
        errors.append(f"GATE_WRONG_VIEWPORT: heights measured at {sh.get('viewport')!r}, gate requires {REQUIRED_VIEWPORT_WIDTH}px wide")

    entries = whitelist.get("entries", [])
    used = set()
    for i, w in enumerate(entries):
        if not w.get("reviewedBy"):
            errors.append(f"GATE_WHITELIST_INVALID[{i}]: missing reviewedBy")
        elif "agent" in w["reviewedBy"].lower() and AGENT_ATTESTATION not in w["reviewedBy"].lower():
            errors.append(f"GATE_WHITELIST_INVALID[{i}]: agent reviewer must state '{AGENT_ATTESTATION}'")
        if len(str(w.get("justification", ""))) < 30:
            errors.append(f"GATE_WHITELIST_INVALID[{i}]: justification must be >= 30 characters")
        if not isinstance(w.get("maxHeightPx"), (int, float)):
            errors.append(f"GATE_WHITELIST_INVALID[{i}]: maxHeightPx missing")

    def wl(page, sec, var):
        for i, w in enumerate(entries):
            if (w.get("page"), w.get("section"), w.get("variant", "default")) == (page, sec, var):
                return i, w
        return None, None

    pages = sh.get("pages", {})
    for tid, tpl in templates.items():
        for route in tpl["routes"]:
            page = pages.get(route)
            if page is None:
                errors.append(f"GATE_MISSING_MEASUREMENT: route {route} ({tid}) has no measured sections")
                continue
            rows = {(r.get("section"), r.get("variant", "default")): r for r in page.get("sections", [])}
            for n in tpl["nodes"]:
                k = (n["section"], n["variant"])
                r = rows.get(k)
                if r is None or not isinstance(r.get("heightPx"), (int, float)) or not isinstance(r.get("renderedHeightPx"), (int, float)):
                    errors.append(f"GATE_MISSING_MEASUREMENT: {route} {k[0]}#{k[1]} has no measured height")
                    continue
                if cat.get(k[0]) == "HERO":
                    h = r["renderedHeightPx"]
                    if h > HERO_WARN_PX:
                        i, w = wl(route, *k)
                        if h > HERO_ERROR_PX and w is None:
                            errors.append(f"GATE_HERO_TOO_TALL: {route} {k[0]} {h}px > {HERO_ERROR_PX}px")
                        else:
                            warnings.append(f"GATE_HERO_TALL: {route} {k[0]} {h}px > {HERO_WARN_PX}px" + (" (whitelisted)" if w else ""))
                        if w is not None:
                            used.add(i)
            inflow = [r for r in page.get("sections", []) if r.get("layer") in INFLOW_LAYERS and cat.get(r.get("section")) != "SHELL"]
            total = page.get("pageHeightPx")
            if len(inflow) >= MIN_INFLOW_SECTIONS and isinstance(total, (int, float)) and total > 0:
                for r in inflow:
                    share = r["heightPx"] / total
                    if share > SHARE_WARN:
                        i, w = wl(route, r["section"], r.get("variant", "default"))
                        if share > SHARE_ERROR and w is None:
                            errors.append(f"GATE_WHOLE_PAGE_SECTION: {route} {r['section']} holds {share:.0%} of the page (> {SHARE_ERROR:.0%})")
                        else:
                            warnings.append(f"GATE_MAJORITY_SECTION: {route} {r['section']} holds {share:.0%} of the page" + (" (whitelisted)" if w else ""))
                        if w is not None:
                            used.add(i)
            for i, w in enumerate(entries):
                if w.get("page") == route:
                    r = rows.get((w.get("section"), w.get("variant", "default")))
                    if r and isinstance(w.get("maxHeightPx"), (int, float)) and r["renderedHeightPx"] > w["maxHeightPx"]:
                        errors.append(f"GATE_WHITELIST_OVER_CAP[{i}]: measured {r['renderedHeightPx']}px > maxHeightPx {w['maxHeightPx']}")
    for i in range(len(entries)):
        if i not in used:
            errors.append(f"GATE_WHITELIST_STALE[{i}]: entry matches no current gate hit")
    return errors, warnings


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--measured", default=str(REPO / "extraction/measured-values.json"))
    ap.add_argument("--whitelist", default=str(REPO / "extraction/wrapper-whitelist.json"))
    a = ap.parse_args()
    errors, warnings = check(_load(a.measured), _load(a.whitelist))
    for w in warnings:
        print("warn ", w)
    for e in errors:
        print("ERROR", e)
    print(f"wrapper gate: {len(errors)} error(s), {len(warnings)} warning(s)")
    return 1 if errors else 0


if __name__ == "__main__":
    sys.exit(main())
