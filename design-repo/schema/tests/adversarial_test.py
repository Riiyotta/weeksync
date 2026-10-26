#!/usr/bin/env python3
"""Adversarial suite: every mutation must be REJECTED with its expected rule code, and
every control must PASS with zero errors.

    python3 schema/tests/adversarial_test.py

Covers the schema layer, structure/template cross-reference, budgets, motion, token policy,
retrieval pins, generated-mode leakage (brand, store mark/URL, review/rating, person, URL,
copy, CTA, proprietary media) and the wrapper-height gate.

Two extra probes run only when the sibling project is present: a real copy block and a real
reviewer name are read from the saved original page at RUNTIME (never written into this
repo) and must be caught by the fingerprint registry.
"""
import copy
import importlib.util
import json
import re
import sys

sys.dont_write_bytecode = True  # keep the package free of __pycache__
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
PROJECT = REPO.parent


def _module(rel, name):
    spec = importlib.util.spec_from_file_location(name, REPO / rel)
    m = importlib.util.module_from_spec(spec)
    sys.modules[name] = m
    spec.loader.exec_module(m)
    return m


SV = _module("schema/semantic_validate.py", "semantic_validate")
GATE = _module("extraction/wrapper_gate.py", "wrapper_gate")
REF = json.loads((REPO / "schema/example.pagespec.json").read_text())
GEN = json.loads((REPO / "schema/examples/generated.home.pagespec.json").read_text())
MEASURED = json.loads((REPO / "extraction/measured-values.json").read_text())
WL = json.loads((REPO / "extraction/wrapper-whitelist.json").read_text())


def idx(spec, section, variant="default"):
    return next(i for i, n in enumerate(spec["nodes"]) if n["section"] == section and n["variant"] == variant)


def node(spec, section, variant="default"):
    return spec["nodes"][idx(spec, section, variant)]


def c(spec, section):
    return node(spec, section)["content"]


def mut(base, fn):
    s = copy.deepcopy(base)
    fn(s)
    return s


def _swap(s, a, b):
    i, j = idx(s, *a), idx(s, *b)
    s["nodes"][i], s["nodes"][j] = s["nodes"][j], s["nodes"][i]


def _set(path_fn, value):
    def f(s):
        obj, key = path_fn(s)
        obj[key] = value
    return f


def static_cases():
    """(name, base, mutate, expected codes - any one must be reported)"""
    hero, feat, price, faq, rev, cta = "hero.ticket", "features.stacked-cards", "pricing.plan-contact", "faq.accordion", "testimonials.ellipse-carousel", "cta.closing-band"
    ref_faq_para = c(REF, faq)["items"][2]["answer"][0]["paragraph"]
    cases = [
        # --- schema layer
        ("schema.template-not-in-enum", REF, lambda s: s.update(template="template.blog"), {"SCHEMA", "TEMPLATE_UNKNOWN"}),
        ("schema.missing-mode", REF, lambda s: s.pop("mode"), {"SCHEMA"}),
        ("schema.mode-not-in-enum", REF, lambda s: s.update(mode="draft"), {"SCHEMA"}),
        ("schema.missing-reducedMotionFallback", REF, lambda s: node(s, hero)["motion"].pop("reducedMotionFallback"), {"SCHEMA"}),
        ("schema.wrong-reducedMotionFallback", REF, lambda s: node(s, hero)["motion"]["reducedMotionFallback"].update({"hero-ticket-flight": "none"}), {"SCHEMA", "MOTION_FALLBACK_MISMATCH"}),
        ("schema.invented-motion-field", REF, lambda s: node(s, hero)["motion"].update(inventedAnimation="spin"), {"SCHEMA"}),
        ("schema.invented-section-type", REF, lambda s: s["nodes"].insert(7, {"section": "hero.video", "variant": "default", "content": {}, "motion": {}}), {"SCHEMA"}),
        ("schema.extra-content-field", REF, lambda s: c(s, feat).update(subtitle="extra"), {"SCHEMA"}),
        ("schema.invented-asset-role", REF, lambda s: c(s, feat)["cards"][0]["image"].update(assetRole="store.badge"), {"SCHEMA", "ASSET_ROLE_UNKNOWN"}),
        ("schema.theme-not-supported", REF, lambda s: s.update(theme="dark"), {"SCHEMA"}),
        ("schema.char-budget-overflow", REF, lambda s: c(s, hero).update(headline="x" * 200), {"SCHEMA"}),
        # --- structure / template cross-reference
        ("structure.duplicate-hero", REF, lambda s: s["nodes"].insert(idx(s, hero) + 1, copy.deepcopy(node(s, hero))), {"ONE_HERO", "TEMPLATE_DUPLICATE"}),
        ("structure.missing-required-section", REF, lambda s: s["nodes"].pop(idx(s, faq)), {"TEMPLATE_MISSING_REQUIRED"}),
        ("structure.reordered-sections", REF, lambda s: _swap(s, (faq, "default"), (cta, "default")), {"TEMPLATE_ORDER", "CTA_LAST_CONTENT"}),
        ("structure.runway-variants-swapped", REF, lambda s: (node(s, "layout.scroll-runway", "hero").update(variant="tmp"), node(s, "layout.scroll-runway", "tail").update(variant="hero"), node(s, "layout.scroll-runway", "tmp").update(variant="tail")), {"TEMPLATE_ORDER", "RUNWAY_BRACKETS"}),
        ("structure.unknown-variant", REF, lambda s: node(s, "layout.scroll-runway", "tail").update(variant="middle"), {"SCHEMA", "TEMPLATE_EXTRA_NODE"}),
        ("structure.nav-target-missing", REF, lambda s: s["nodes"].pop(idx(s, feat)), {"NAV_TARGETS_EXIST"}),
        ("structure.nav-parity", REF, lambda s: c(s, "shell.mobile-menu")["navItems"][1].update(label="Benefits"), {"NAV_PARITY"}),
        ("structure.motion-singleton", REF, lambda s: s["nodes"].insert(idx(s, cta), copy.deepcopy(node(s, cta))), {"MOTION_SINGLETONS"}),
        ("structure.review-total-chars", REF, lambda s: c(s, rev)["reviews"][0].update(paragraphs=["word " * 30, "word " * 30, "word " * 30]), {"REVIEW_TOTAL_CHARS"}),
        ("structure.faq-open-index", GEN, lambda s: c(s, faq).update(initiallyOpenIndex=9), {"FAQ_OPEN_INDEX"}),
        ("structure.route-not-in-template", REF, lambda s: s.update(route="/pricing"), {"ROUTE_NOT_IN_TEMPLATE"}),
        ("runtime.maxWords-overflow", REF, lambda s: c(s, hero).update(headline=" ".join(["go"] * 40)), {"MAX_WORDS"}),
        ("runtime.motion-pattern-dropped", REF, lambda s: node(s, hero)["motion"].update(patterns=["typewriter"]), {"MOTION_PATTERN_SET"}),
        # --- token policy
        ("token.unknown", REF, lambda s: node(s, feat)["tokens"].update(surface="color.surface.glass"), {"TOKEN_UNKNOWN"}),
        ("token.raw-hex", REF, lambda s: node(s, feat)["tokens"].update(surface="#dfe296"), {"TOKEN_RAW_COLOR"}),
        ("token.raw-rgb", REF, lambda s: node(s, feat)["tokens"].update(text="rgb(0, 0, 0)"), {"TOKEN_RAW_COLOR"}),
        ("token.arbitrary-spacing", REF, lambda s: node(s, feat)["tokens"].update(paddingTop="24px"), {"TOKEN_ARBITRARY_SPACING"}),
        ("token.unsupported-font", REF, lambda s: node(s, feat).setdefault("tokens", {}).update(fontFamily="Roboto"), {"TOKEN_UNSUPPORTED_FONT"}),
        ("token.wrong-category", REF, lambda s: node(s, feat)["tokens"].update(surface="spacing.section"), {"TOKEN_WRONG_CATEGORY"}),
        ("token.not-allowed-for-section", REF, lambda s: node(s, feat)["tokens"].update(surface="color.surface.inverse"), {"TOKEN_NOT_ALLOWED_FOR_SECTION"}),
        ("token.invalid-contrast-combination", REF, lambda s: node(s, price)["tokens"].update(text="color.text.primary"), {"TOKEN_CONTRAST_PAIR"}),
        ("token.not-referenceable", REF, lambda s: node(s, feat)["tokens"].update(surface="color.green.200"), {"TOKEN_NOT_REFERENCEABLE"}),
        # --- retrieval pins (node level; contract/allowlist level in scripts/prove_drift.py)
        ("retrieval.cookie-flipped-eligible", REF, lambda s: node(s, "utility.cookie-consent").update(retrievalEligible=True), {"RETRIEVAL_PIN_NODE"}),
        ("retrieval.content-marked-ineligible", REF, lambda s: node(s, faq).update(retrievalEligible=False), {"RETRIEVAL_PIN_NODE"}),
        # --- generated-mode leakage
        ("generated.brand-name", GEN, lambda s: c(s, hero).update(headline=c(s, hero)["headline"].replace("Brindlewick", "WeekSync")), {"GENERATED_MODE_BRAND"}),
        ("generated.brand-variant-spelling", GEN, lambda s: s["brand"].update(name="Week Sync"), {"GENERATED_MODE_BRAND"}),
        ("generated.reference-brand", GEN, lambda s: c(s, "shell.sidebar-nav").update(tagline="Sevenday for small kitchens."), {"GENERATED_MODE_BRAND"}),
        ("generated.logo-reference-mark", GEN, lambda s: s["brand"]["mark"].update(assetRole="brand.reference-mark"), {"GENERATED_MODE_ASSET"}),
        ("generated.logo-source-mark", GEN, lambda s: c(s, "shell.sidebar-nav")["brandMark"].update(assetRole="brand.source-mark"), {"ASSET_BLOCKED"}),
        ("generated.store-url", GEN, lambda s: c(s, price)["contact"]["channels"][1].update(href="https://apps.apple.com/app/brindlewick/id123"), {"GENERATED_MODE_URL"}),
        ("generated.store-mark-media", GEN, lambda s: c(s, feat)["cards"][1]["image"].update(src="/assets/app-store-badge.svg"), {"GENERATED_MODE_ASSET"}),
        ("generated.source-url-cta", GEN, lambda s: c(s, cta)["cta"].update(href="https://weeksync.app/login"), {"GENERATED_MODE_URL", "GENERATED_MODE_CTA"}),
        ("generated.source-domain-in-copy", GEN, lambda s: c(s, faq)["items"][0]["answer"][0].update(paragraph="Read more at www.weeksync.app before you start."), {"GENERATED_MODE_URL"}),
        ("generated.source-mailbox", GEN, lambda s: c(s, price)["contact"]["channels"][2].update(href="mailto:hello@weeksync.app"), {"GENERATED_MODE_URL"}),
        ("generated.non-placeholder-social", GEN, lambda s: c(s, price)["contact"]["channels"][1].update(href="https://t.me/brindlewick"), {"GENERATED_MODE_URL"}),
        ("generated.brand-cta", GEN, lambda s: c(s, price)["plan"]["cta"].update(label="Try WeekSync"), {"GENERATED_MODE_CTA"}),
        ("generated.reference-copy", GEN, lambda s: c(s, faq)["items"][2]["answer"][0].update(paragraph=ref_faq_para), {"GENERATED_MODE_COPY"}),
        ("generated.reference-reviewer", GEN, lambda s: c(s, rev)["reviews"][0].update(name="Ada Whitlock"), {"GENERATED_MODE_PERSON"}),
        ("generated.reference-demo-roster", GEN, lambda s: c(s, "demo.interactive-calendar")["people"][0].update(name="Mia Chen"), {"GENERATED_MODE_PERSON"}),
        ("generated.fabricated-rating", GEN, lambda s: c(s, rev)["reviews"][0]["paragraphs"].__setitem__(2, "Rated 5/5 by our whole brigade."), {"GENERATED_MODE_RATING"}),
        ("generated.fabricated-stars", GEN, lambda s: c(s, rev)["reviews"][1]["paragraphs"].__setitem__(0, "★★★★★ would plan again."), {"GENERATED_MODE_RATING"}),
        ("generated.reference-illustration", GEN, lambda s: c(s, feat)["cards"][0].update(image={"assetRole": "feature.reference-illustration", "src": "/assets/feature-a.svg", "alt": ""}), {"GENERATED_MODE_ASSET"}),
        ("generated.source-illustration-file", GEN, lambda s: c(s, feat)["cards"][2]["image"].update(src="/features/features-img-1-2.png"), {"ASSET_BLOCKED", "GENERATED_MODE_ASSET"}),
        ("generated.reference-sprite", GEN, lambda s: c(s, cta).update(sprite={"assetRole": "cta.reference-sprite-strip", "src": "/assets/sprite-strip.svg"}), {"GENERATED_MODE_ASSET"}),
        ("generated.reference-roster-asset", GEN, lambda s: c(s, "demo.interactive-calendar").update(rosterAsset={"assetRole": "person.reference-demo-roster"}), {"GENERATED_MODE_ASSET"}),
        ("reference.blocked-source-illustration", REF, lambda s: c(s, feat)["cards"][0]["image"].update(assetRole="feature.source-illustration"), {"ASSET_BLOCKED"}),
        ("reference.source-asset-file", REF, lambda s: c(s, feat)["cards"][1]["image"].update(src="/features/features-img-1-1.png"), {"ASSET_BLOCKED"}),
    ]
    cases = [{"kind": "pagespec", "name": n, "spec": mut(b, f), "expect": e} for n, b, f, e in cases]
    cases += gate_cases()
    return cases


def gate_cases():
    def m(fn, wl=None):
        d = copy.deepcopy(MEASURED)
        fn(d)
        return d, wl if wl is not None else WL

    def row(d, sid, var="default"):
        return next(r for r in d["sectionHeights"]["pages"]["/"]["sections"] if r["section"] == sid and r["variant"] == var)

    hero_wl = lambda cap, who="Design lead", just="Fixed hero ticket intentionally fills the viewport during review.": {"entries": [{"page": "/", "section": "hero.ticket", "variant": "default", "reviewedBy": who, "justification": just, "maxHeightPx": cap}]}
    out = []
    spec = [
        ("gate.hero-1900-warns", lambda d: row(d, "hero.ticket").update(renderedHeightPx=1900), None, "warn:GATE_HERO_TALL"),
        ("gate.hero-3100-fails", lambda d: row(d, "hero.ticket").update(renderedHeightPx=3100), None, "GATE_HERO_TOO_TALL"),
        ("gate.majority-share", lambda d: row(d, "features.stacked-cards").update(heightPx=6000), None, "GATE_WHOLE_PAGE_SECTION"),
        ("gate.whitelist-missing-justification", lambda d: row(d, "hero.ticket").update(renderedHeightPx=3100), hero_wl(4000, just="ok"), "GATE_WHITELIST_INVALID"),
        ("gate.missing-measurement", lambda d: d["sectionHeights"]["pages"]["/"]["sections"].remove(row(d, "faq.accordion")), None, "GATE_MISSING_MEASUREMENT"),
        ("gate.wrong-viewport", lambda d: d["sectionHeights"].update(viewport="1280x800", viewportWidth=1280), None, "GATE_WRONG_VIEWPORT"),
        ("gate.agent-reviewer-without-attestation", lambda d: row(d, "hero.ticket").update(renderedHeightPx=3100), hero_wl(4000, who="review agent"), "GATE_WHITELIST_INVALID"),
        ("gate.stale-whitelist", lambda d: None, hero_wl(4000), "GATE_WHITELIST_STALE"),
        ("gate.whitelist-over-cap", lambda d: row(d, "hero.ticket").update(renderedHeightPx=3100), hero_wl(3000), "GATE_WHITELIST_OVER_CAP"),
    ]
    for name, fn, wl, expect in spec:
        d, w = m(fn, wl)
        out.append({"kind": "gate", "name": name, "measured": d, "whitelist": w, "expect": {expect}})
    return out


def dynamic_cases():
    """Source-identity probes read at runtime from the sibling saved original (never stored)."""
    page = PROJECT / "_reference/original.html"
    if not page.is_file():
        return []
    html = page.read_text(encoding="utf-8", errors="ignore")
    out = []
    names = [re.sub(r"<[^>]+>", "", n).strip() for n in re.findall(r"<h3[^>]*>(.*?)</h3>", html, re.S)]
    names = [n for n in names if 0 < len(n) <= 13]
    if names:
        out.append({"kind": "pagespec", "name": "generated.source-reviewer-name (runtime probe)", "spec": mut(GEN, lambda s: c(s, "testimonials.ellipse-carousel")["reviews"][0].update(name=names[0])), "expect": {"GENERATED_MODE_PERSON"}})
    blocks = re.findall(r"<p[^>]*class=\"[^\"]*landing_bigParagraph[^\"]*\"[^>]*>(.*?)</p>", html, re.S)
    blocks = [re.sub(r"\s+", " ", re.sub(r"<[^>]+>", " ", b)).strip() for b in blocks]
    blocks = [b for b in blocks if len(b.split()) >= 8 and len(b) <= 260]
    if blocks:
        out.append({"kind": "pagespec", "name": "generated.source-marketing-copy (runtime probe)", "spec": mut(GEN, lambda s: c(s, "faq.accordion")["items"][1]["answer"][0].update(paragraph=blocks[0])), "expect": {"GENERATED_MODE_COPY"}})
    return out


def run_case(case):
    if case["kind"] == "pagespec":
        rep = SV.validate(case["spec"])
        codes = rep.codes()
        exp = case["expect"]
        return bool(rep.errors) and bool(codes & exp), sorted(codes)
    errors, warnings = GATE.check(case["measured"], case["whitelist"])
    (exp,) = case["expect"]
    if exp.startswith("warn:"):
        ok = not errors and any(w.startswith(exp[5:]) for w in warnings)
        return ok, ["warn:" + w.split(":")[0] for w in warnings] + [e.split(":")[0] for e in errors]
    return any(e.startswith(exp) for e in errors), [e.split(":")[0] for e in errors]


def main():
    fails = 0
    print("CONTROLS (must pass with 0 errors)")
    for name, spec in (("reference example (real reference assets)", REF), ("generated example (generation-safe)", GEN)):
        rep = SV.validate(spec)
        ok = not rep.errors
        fails += not ok
        print(f"  {'PASS' if ok else 'FAIL'}  {name}: {len(rep.errors)} errors, {len(rep.warnings)} warnings")
    for tid in SV.TEMPLATES:  # generic per-template control: the reference example re-targeted at each template
        spec = copy.deepcopy(REF)
        spec["template"] = tid
        ok = not SV.validate(spec).errors
        fails += not ok
        print(f"  {'PASS' if ok else 'FAIL'}  per-template control {tid}")
    errors, warnings = GATE.check(MEASURED, WL)
    fails += bool(errors)
    print(f"  {'PASS' if not errors else 'FAIL'}  wrapper gate on real measurements: {len(errors)} errors, {len(warnings)} warnings")
    wl = {"entries": [{"page": "/", "section": "hero.ticket", "variant": "default", "reviewedBy": "review agent (agent attestation, not a human sign-off)", "justification": "Fixed hero ticket intentionally fills the viewport during review.", "maxHeightPx": 4000}]}
    d = copy.deepcopy(MEASURED)
    next(r for r in d["sectionHeights"]["pages"]["/"]["sections"] if r["section"] == "hero.ticket")["renderedHeightPx"] = 3100
    e2, w2 = GATE.check(d, wl)
    ok = not e2 and any("whitelisted" in w for w in w2)
    fails += not ok
    print(f"  {'PASS' if ok else 'FAIL'}  whitelisted 3100px hero: no error, still warns")

    cases = static_cases()
    dyn = dynamic_cases()
    print(f"\nMUTATIONS (must be rejected): {len(cases)} static + {len(dyn)} runtime probes")
    for case in cases + dyn:
        ok, got = run_case(case)
        fails += not ok
        print(f"  {'PASS' if ok else 'FAIL'}  {case['name']}: expected {sorted(case['expect'])} got {got[:4]}")
    if not dyn:
        print("  (runtime source probes skipped: sibling saved original not present)")
    total = len(cases) + len(dyn)
    print(f"\nadversarial: {total - sum(1 for x in cases + dyn if not run_case(x)[0])}/{total} mutations rejected; controls {'all pass' if fails == 0 else 'see above'}; {fails} failure(s)")
    return 1 if fails else 0


if __name__ == "__main__":
    sys.exit(main())
