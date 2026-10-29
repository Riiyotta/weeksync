#!/usr/bin/env python3
"""Prove that extraction/verify_all.py actually catches drift.

    python3 scripts/prove_drift.py

For every case: copy design-repo/ into a fresh OS temp directory (with the sibling source
files the citations need, when they exist next to this repo), break ONE thing, run
verify_all.py there, and require exit 1 with the named check FAILing. An untouched copy
must exit 0. Cases that need the sibling source tree are reported as skipped when this
repo is run standalone.
"""
import json
import re
import shutil
import subprocess
import sys

sys.dont_write_bytecode = True  # keep the package free of __pycache__
import tempfile
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent
PROJECT = REPO.parent
SOURCE_ITEMS = ["src", "CLONE_SPEC.md", "tailwind.config.js", "index.html", "package.json"]
SOURCE_PRESENT = (PROJECT / "CLONE_SPEC.md").is_file() and (PROJECT / "src").is_dir()


def jedit(root, rel, fn):
    p = root / rel
    d = json.loads(p.read_text())
    fn(d)
    p.write_text(json.dumps(d, indent=2, ensure_ascii=False) + "\n")


def tedit(root, rel, old, new, count=1):
    p = root / rel
    t = p.read_text()
    if old not in t:
        raise RuntimeError(f"drift fixture not found in {rel}: {old[:50]!r}")
    p.write_text(t.replace(old, new, count))


def rm_line(root, rel, pattern):
    p = root / rel
    lines = p.read_text().splitlines(keepends=True)
    keep = [l for l in lines if not re.search(pattern, l)]
    if len(keep) == len(lines):
        raise RuntimeError(f"no line matching {pattern!r} in {rel}")
    p.write_text("".join(keep))


def _faq_tag(d):
    d["source"]["lines"] = "1-76"
    d["source"]["citation"]["ref"] = d["source"]["file"] + ":1-76"


CASES = [
    # (name, needs_source, mutate(root), check that must FAIL)
    ("allowlist phantom entry", False, lambda r: jedit(r, "tokens/llm/component-allowlist.json", lambda d: d["entries"].update({"section.ghost": {"kind": "section"}})), "allowlist.parity"),
    ("allowlist missing entry (orphan contract)", False, lambda r: jedit(r, "tokens/llm/component-allowlist.json", lambda d: d["entries"].pop("faq.accordion")), "allowlist.parity"),
    ("allowlistVersion drift", False, lambda r: jedit(r, "tokens/llm/component-allowlist.json", lambda d: d.update(allowlistVersion="9.9.9")), "allowlist.version"),
    ("citation out of range", True, lambda r: jedit(r, "sections/hero.ticket.json", lambda d: d["evidence"][0].update(ref="src/components/HeroSlide.jsx:9999")), "citations"),
    ("citation in range but wrong content", True, lambda r: jedit(r, "sections/hero.ticket.json", lambda d: d["evidence"][1].update(ref="src/lib/motion.js:1")), "citations"),
    ("source tag not at cited line", True, lambda r: jedit(r, "sections/faq.accordion.json", _faq_tag), "contracts.source-tag-reread"),
    ("registry availability loosened", False, lambda r: jedit(r, "assets/asset-roles.json", lambda d: next(x for x in d["roles"] if x["id"] == "brand.source-mark").update(availability="generation-safe")), "assets.pin-parity-registry"),
    ("availability pin removed (verify_all)", False, lambda r: rm_line(r, "extraction/verify_all.py", r'^\s+"feature\.source-illustration": "blocked-for-generation",$'), "assets.pin-parity-code"),
    ("availability pin removed (semantic_validate)", False, lambda r: rm_line(r, "schema/semantic_validate.py", r'^\s+"cta\.source-fish-sprite": "blocked-for-generation",$'), "assets.pin-parity-code"),
    ("contract lists a blocked role (contract + allowlist flipped together)", False, lambda r: (jedit(r, "sections/features.stacked-cards.json", lambda d: d["generatedAssetRoles"].append("feature.source-illustration")),
                                                                                              jedit(r, "tokens/llm/component-allowlist.json", lambda d: d["entries"]["features.stacked-cards"]["generatedAssetRoles"].append("feature.source-illustration"))), "assets.roles-consistent"),
    ("retrieval flipped on contract + allowlist together", False, lambda r: (jedit(r, "sections/utility.cookie-consent.json", lambda d: d.update(retrievalEligible=True)),
                                                                            jedit(r, "tokens/llm/component-allowlist.json", lambda d: d["entries"]["utility.cookie-consent"].update(retrievalEligible=True))), "retrieval.contracts-allowlist-pin"),
    ("content section marked ineligible", False, lambda r: (jedit(r, "sections/faq.accordion.json", lambda d: d.update(retrievalEligible=False, retrievalIneligibleReason="pretend this content section is runtime UI only")),
                                                           jedit(r, "tokens/llm/component-allowlist.json", lambda d: d["entries"]["faq.accordion"].update(retrievalEligible=False))), "retrieval.contracts-allowlist-pin"),
    ("retrieval pin removed (semantic_validate)", False, lambda r: rm_line(r, "schema/semantic_validate.py", r'^\s+"utility\.cookie-consent",$'), "retrieval.pin-parity"),
    ("manifest count wrong", False, lambda r: jedit(r, "registry.manifest.json", lambda d: d["counts"].update(sections=d["counts"]["sections"] + 1)), "counts.manifest"),
    ("README count wrong", False, lambda r: tedit(r, "README.md", "| Sections | 13 |", "| Sections | 12 |"), "counts.readme"),
    ("token catalog value drift", False, lambda r: jedit(r, "tokens/llm/token-catalog.json", lambda d: d["tokens"]["color.landing.accent"].update(value="#ffffff")), "tokens.catalog-drift"),
    ("foundation token drift (catalog not regenerated)", False, lambda r: jedit(r, "tokens/00-foundation/color.json", lambda d: d["tokens"]["color.landing.accent"].update(value="#e0e397")), "tokens.catalog-drift"),
    ("policy category is a human label, not a catalog key", False, lambda r: jedit(r, "tokens/llm/token-policy.json", lambda d: d["rawValueRestrictions"].update(typography=d["rawValueRestrictions"].pop("fontFamily"))), "tokens.policy-resolves"),
    ("graph rule without implementation", False, lambda r: jedit(r, "compatibility/graph.json", lambda d: d["rules"].append({"id": "NO_BACK_TO_BACK_CTA", "severity": "error", "rule": "x"})), "graph.rules-implemented"),
    ("motion fallback drift", False, lambda r: jedit(r, "tokens/00-foundation/motion-patterns.json", lambda d: d["patterns"]["typewriter"].update(reducedMotionFallback="instant-swap")), "motion.patterns-and-fallbacks"),
    ("measured height removed", False, lambda r: jedit(r, "extraction/measured-values.json", lambda d: d["sectionHeights"]["pages"]["/"]["sections"].pop(11)), "gate.wrapper"),
    ("hero measured at 3100px", False, lambda r: jedit(r, "extraction/measured-values.json", lambda d: next(x for x in d["sectionHeights"]["pages"]["/"]["sections"] if x["section"] == "hero.ticket").update(renderedHeightPx=3100)), "gate.wrapper"),
    ("absolute machine path", False, lambda r: tedit(r, "README.md", "# ", "# " + "/" + "Users/someone/project ", 1), "hygiene.absolute-paths"),
    ("entryPoint outside the package", False, lambda r: jedit(r, "registry.manifest.json", lambda d: d["entryPoints"].update(external="../CLONE_SPEC.md")), "hygiene.entryPoints"),
    ("generated example leaks the source brand", False, lambda r: jedit(r, "schema/examples/generated.home.pagespec.json", lambda d: d.update(title="WeekSync. Shift plans for kitchens.")), "schema.example"),
    ("wrapper-gate threshold loosened", False, lambda r: tedit(r, "extraction/wrapper_gate.py", "HERO_ERROR_PX = 3000", "HERO_ERROR_PX = 30000"), "gate.thresholds-pinned"),
    ("wrapper-gate share threshold loosened", False, lambda r: tedit(r, "extraction/wrapper_gate.py", "SHARE_ERROR = 0.60", "SHARE_ERROR = 0.99"), "gate.thresholds-pinned"),
    ("whitelist entry without justification", False, lambda r: jedit(r, "extraction/wrapper-whitelist.json", lambda d: d["entries"].append({"page": "/", "section": "hero.ticket", "reviewedBy": "someone", "justification": "ok", "maxHeightPx": 4000})), "gate.whitelist-reviewed"),
    ("stale whitelist entry (page no longer over threshold)", False, lambda r: jedit(r, "extraction/wrapper-whitelist.json", lambda d: d["entries"].append({"page": "/", "section": "hero.ticket", "reviewedBy": "someone", "justification": "this entry exempts a section that is not over any threshold", "maxHeightPx": 4000})), "gate.wrapper"),
    ("mode removed from PageSpec required list", False, lambda r: jedit(r, "schema/pagespec.schema.json", lambda d: d["required"].remove("mode")), "mode.schema-required-closed"),
    ("generated-mode rule dropped from the validator", False, lambda r: tedit(r, "schema/semantic_validate.py", '"GENERATED_MODE_RATING")', '"GENERATED_MODE_X")'), "mode.generated-rules-pinned"),
    ("tracked evidence excerpt altered", False, lambda r: tedit(r, "extraction/evidence/o1440.excerpt.n", "371,1623.8,1069,645", "371,1623.8,1069,999"), "citations"),
    ("tracked evidence excerpt deleted", False, lambda r: (r / "extraction/evidence/o390.excerpt.n").unlink(), "citations"),
    ("recorded geometry parity edited", False, lambda r: jedit(r, "extraction/measured-values.json", lambda d: d["cloneQuality"]["geometryParity"]["results"]["1440"]["sections"]["sidebar"].update(matching=13, pct=72.2)), "parity.geometry-evidence"),
    ("tracked parity dump altered", False, lambda r: tedit(r, "extraction/evidence/parity-2026-10-29/c390b.n", "## cookie root 88.9,542.9,301.1,301.1", "## cookie root 88.9,542.9,301.1,299.1"), "parity.geometry-evidence"),
    ("pixel-parity exception dropped", False, lambda r: jedit(r, "extraction/measured-values.json", lambda d: d["cloneQuality"]["pixelParity"].update(exceptions=[])), "parity.gates"),
    ("pixel-parity exception self-approved", False, lambda r: jedit(r, "extraction/measured-values.json", lambda d: d["cloneQuality"]["pixelParity"]["exceptions"][0].update(status="approved")), "parity.gates"),
    ("hero capture state dropped on the clone side only", False, lambda r: jedit(r, "extraction/evidence/parity-2026-10-29/pixel-tiles/c390.json", lambda d: d["tiles"]["hero_0"].pop("state")), "parity.pixel-capture-state"),
    ("tracked pixel result edited (hero raised to 80)", False, lambda r: jedit(r, "extraction/evidence/parity-2026-10-29/pixel-after.json", lambda d: d["390"]["hero"].update(pct=80.0)), "parity.pixel-evidence"),
]


def make_copy(tmp):
    proj = tmp / "project"
    proj.mkdir()
    if SOURCE_PRESENT:
        for item in SOURCE_ITEMS:
            s = PROJECT / item
            if s.is_dir():
                shutil.copytree(s, proj / item)
            elif s.is_file():
                (proj / item).parent.mkdir(parents=True, exist_ok=True)
                shutil.copy2(s, proj / item)
    shutil.copytree(REPO, proj / "design-repo", ignore=shutil.ignore_patterns("__pycache__", ".DS_Store"))
    return proj / "design-repo"


def run_verify(root):
    p = subprocess.run([sys.executable, "-B", str(root / "extraction/verify_all.py")], capture_output=True, text=True, cwd=root)
    return p.returncode, p.stdout + p.stderr


def main():
    fails = 0
    with tempfile.TemporaryDirectory(prefix="drift-") as t:
        ctl = Path(t) / "control"
        ctl.mkdir()
        root = make_copy(ctl)
        code, out = run_verify(root)
        ok = code == 0
        fails += not ok
        print(f"{'PASS' if ok else 'FAIL'}  control: untouched copy -> verify_all exit {code}  ({out.strip().splitlines()[-1]})")
        for i, (name, needs_src, fn, check) in enumerate(CASES):
            if needs_src and not SOURCE_PRESENT:
                print(f"SKIP  {name}: needs the sibling source tree")
                continue
            d = Path(t) / f"c{i}"
            d.mkdir()
            root = make_copy(d)
            fn(root)
            code, out = run_verify(root)
            hit = re.search(rf"^FAIL  {re.escape(check)}\b", out, re.M)
            ok = code == 1 and bool(hit)
            fails += not ok
            print(f"{'PASS' if ok else 'FAIL'}  {name}: verify_all exit {code}, '{check}' {'FAILED as required' if hit else 'did NOT fail'}")
    n = len([c for c in CASES if SOURCE_PRESENT or not c[1]])
    print(f"\nprove_drift: {n - fails if fails <= n else 0}/{n} drift cases caught; control {'passes' if fails == 0 else 'see above'}; {fails} failure(s)")
    return 1 if fails else 0


if __name__ == "__main__":
    sys.exit(main())
