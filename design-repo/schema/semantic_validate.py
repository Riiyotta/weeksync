#!/usr/bin/env python3
"""Semantic validator for PageSpecs built from this design-repo.

    python3 schema/semantic_validate.py [spec.json ...]   # default: every example under schema/

Layer 1 is Draft-07 JSON Schema (schema/pagespec.schema.json). Layer 2 (this file)
enforces what JSON Schema cannot express:

  * template cross-reference: the PageSpec's (section, variant) sequence must match
    its declared template's real node list (TEMPLATE_*), and reference-mode routes
    must be template routes (ROUTE_NOT_IN_TEMPLATE);
  * compatibility-graph rules from compatibility/graph.json (ids in
    IMPLEMENTED_GRAPH_RULES; verify_all.py fails if graph and code diverge);
  * per-field maxWords budgets (MAX_WORDS) and motion fallbacks (MOTION_*);
  * token policy for the closed node `tokens` slots (TOKEN_*);
  * asset roles with availability PINNED IN CODE (ASSET_*, PINNED_AVAILABILITY);
  * retrieval eligibility pinned in code (RETRIEVAL_*);
  * mode=generated leakage rules (GENERATED_MODE_BRAND / _CTA / _COPY / _URL /
    _ASSET / _PERSON / _RATING) driven by assets/source-identity.json.

Repo root is derived from this file's location; no machine paths.
Exit code 1 when any error is found. Standard library + `jsonschema`.
"""
import hashlib
import json
import re
import sys

sys.dont_write_bytecode = True  # keep the package free of __pycache__
from pathlib import Path
from urllib.parse import urlparse

REPO = Path(__file__).resolve().parent.parent


def _load(rel):
    return json.loads((REPO / rel).read_text())


# ----------------------------------------------------------------------------- pins
# Availability is pinned here AND in extraction/verify_all.py. Editing
# assets/asset-roles.json alone can never loosen a role: the validator always
# decides with this table, and flags any registry disagreement as ASSET_PIN_DRIFT.
PINNED_AVAILABILITY = {
    "brand.source-mark": "blocked-for-generation",
    "brand.reference-mark": "reference-only",
    "brand.placeholder-mark": "generation-safe",
    "favicon.reference": "reference-only",
    "favicon.generated": "generation-safe",
    "feature.source-illustration": "blocked-for-generation",
    "feature.reference-illustration": "reference-only",
    "feature.generated-illustration": "generation-safe",
    "cta.source-fish-sprite": "blocked-for-generation",
    "cta.reference-sprite-strip": "reference-only",
    "cta.generated-sprite-strip": "generation-safe",
    "person.source-reviewer": "blocked-for-generation",
    "person.fictional-reviewer": "generation-safe",
    "person.fictional-demo-roster": "generation-safe",
    "person.reference-demo-roster": "reference-only",
    "rating.placeholder": "generation-safe",
    "url.source-endpoint": "blocked-for-generation",
    "url.placeholder": "generation-safe",
    "copy.source-marketing": "blocked-for-generation",
    "copy.original": "generation-safe",
}

# Runtime/utility UI that must never be retrievable as content (R8). Pinned here AND
# in extraction/verify_all.py; contracts, allowlist and PageSpec nodes must agree.
RETRIEVAL_INELIGIBLE = {
    "utility.cursor-trail",
    "utility.cookie-consent",
    "shell.mobile-menu",
    "layout.scroll-runway",
}
RUNTIME_UI_NAME = re.compile(r"cookie|consent|modal|dialog|drawer|overlay|preloader|cursor|toast|ticker|menu|spacer|runway", re.I)

IMPLEMENTED_GRAPH_RULES = {
    "ONE_HERO", "HERO_BEFORE_LOOP_CONTENT", "RUNWAY_BRACKETS", "CTA_LAST_CONTENT",
    "NAV_TARGETS_EXIST", "NAV_PARITY", "SHARED_TAGLINE", "NO_ADJACENT_SAME_CATEGORY",
    "MOTION_SINGLETONS", "REVIEW_TOTAL_CHARS", "FAQ_OPEN_INDEX",
}

GENERATED_RULES = ("GENERATED_MODE_BRAND", "GENERATED_MODE_CTA", "GENERATED_MODE_COPY", "GENERATED_MODE_URL",
                   "GENERATED_MODE_ASSET", "GENERATED_MODE_PERSON", "GENERATED_MODE_RATING")

GENERATED_SRC_SCHEMES = ("placeholder://", "generated://", "user-supplied://")

# ----------------------------------------------------------------------------- data
SCHEMA = _load("schema/pagespec.schema.json")
TEMPLATES = _load("templates/templates.json")["templates"]
GRAPH = {r["id"]: r for r in _load("compatibility/graph.json")["rules"]}
CATALOG = _load("tokens/llm/token-catalog.json")["tokens"]
POLICY = _load("tokens/llm/token-policy.json")
ALLOW = _load("tokens/llm/component-allowlist.json")["entries"]
ROLES = {r["id"]: r for r in _load("assets/asset-roles.json")["roles"]}
IDENT = _load("assets/source-identity.json")
PATTERNS = _load("tokens/00-foundation/motion-patterns.json")["patterns"]
SECTIONS = {p.stem: json.loads(p.read_text()) for p in sorted((REPO / "sections").glob("*.json"))}
CATEGORY = {sid: s["semantic"]["category"] for sid, s in SECTIONS.items()}


def norm(s):
    return re.sub(r"[^a-z0-9]+", " ", s.lower()).strip()


def fp(s):
    return hashlib.sha256(("design-repo-fp-v1|" + s).encode()).hexdigest()[:24]


def fingerprints(text, shingle=IDENT["copyFingerprints"]["shingleWords"]):
    w = norm(text).split()
    out = set()
    if len(w) >= 4:
        out.add(fp(" ".join(w)))
    for i in range(0, max(0, len(w) - shingle + 1)):
        out.add(fp(" ".join(w[i:i + shingle])))
    return out


SRC_COPY = set(IDENT["copyFingerprints"]["source"])
REF_COPY = set(IDENT["copyFingerprints"]["reference"])
SRC_PERSON = set(IDENT["personFingerprints"]["source"])
SRC_URL = set(IDENT["urlFingerprints"]["source"])
REF_PEOPLE = {norm(n) for n in IDENT["referencePeople"]["reviewers"] + IDENT["referencePeople"]["demoRoster"]}
BRAND_RE = [re.compile(p, re.I) for p in IDENT["sourceBrand"]["patterns"] + IDENT["referenceBrand"]["patterns"]]
CTA_RE = [re.compile(p, re.I) for p in IDENT["sourceBrand"]["ctaPatterns"] + IDENT["referenceBrand"]["ctaPatterns"]]
BLOCKED_DOMAINS = set(IDENT["sourceBrand"]["domains"] + IDENT["referenceBrand"]["domains"])
SAFE_SUFFIXES = tuple(IDENT["placeholderDomains"]["allowedSuffixes"])
RATING_RE = [re.compile(p, re.I) for p in IDENT["ratingPatterns"]]
PROPRIETARY_FILES = [n.lower() for n in IDENT["proprietaryAssetNames"]["source"] + IDENT["proprietaryAssetNames"]["reference"]]
SOURCE_FILES = [n.lower() for n in IDENT["proprietaryAssetNames"]["source"]]
URL_RE = re.compile(r"(?:https?://|mailto:|www\.)[^\s\"'<>]+", re.I)


# ----------------------------------------------------------------------------- helpers
class Report:
    def __init__(self):
        self.errors, self.warnings = [], []

    def err(self, code, path, msg):
        self.errors.append((code, path, msg))

    def warn(self, code, path, msg):
        self.warnings.append((code, path, msg))

    def codes(self):
        return {c for c, _, _ in self.errors}


def walk_strings(o, path=""):
    if isinstance(o, str):
        yield path, o
    elif isinstance(o, dict):
        for k, v in o.items():
            yield from walk_strings(v, f"{path}/{k}")
    elif isinstance(o, list):
        for i, v in enumerate(o):
            yield from walk_strings(v, f"{path}/{i}")


def walk_assets(o, path=""):
    if isinstance(o, dict):
        if "assetRole" in o:
            yield path, o
        for k, v in o.items():
            yield from walk_assets(v, f"{path}/{k}")
    elif isinstance(o, list):
        for i, v in enumerate(o):
            yield from walk_assets(v, f"{path}/{i}")


def resolve_ref(schema):
    while isinstance(schema, dict) and "$ref" in schema:
        node = SCHEMA
        for part in schema["$ref"].lstrip("#/").split("/"):
            node = node[part]
        schema = node
    return schema


def walk_budgets(schema, data, path, rep):
    """Enforce the custom maxWords annotation by walking data alongside its schema."""
    schema = resolve_ref(schema)
    if not isinstance(schema, dict):
        return
    if isinstance(data, str) and "maxWords" in schema:
        n = len(data.split())
        if n > schema["maxWords"]:
            rep.err("MAX_WORDS", path, f"{n} words > maxWords {schema['maxWords']}")
    if isinstance(data, dict):
        if "oneOf" in schema:
            for br in schema["oneOf"]:
                br = resolve_ref(br)
                if set(br.get("required", [])) <= set(data) and set(data) <= set(br.get("properties", {})):
                    walk_budgets(br, data, path, rep)
                    break
        for k, v in data.items():
            sub = schema.get("properties", {}).get(k)
            if sub is not None:
                walk_budgets(sub, v, f"{path}/{k}", rep)
    if isinstance(data, list) and "items" in schema:
        for i, v in enumerate(data):
            walk_budgets(schema["items"], v, f"{path}/{i}", rep)


def host_of(u):
    if u.lower().startswith("mailto:"):
        return u.split("@", 1)[-1].split("?")[0].lower()
    if u.lower().startswith("www."):
        u = "http://" + u
    return (urlparse(u).hostname or "").lower()


def is_absolute_url(s):
    return bool(re.match(r"^(https?:|mailto:|//|www\.)", s, re.I))


# ----------------------------------------------------------------------------- checks
def check_schema(spec, rep):
    try:
        from jsonschema import Draft7Validator
    except ImportError:  # pragma: no cover
        rep.err("SCHEMA_TOOLING", "", "python package 'jsonschema' is required for the Draft-07 layer")
        return
    for e in sorted(Draft7Validator(SCHEMA).iter_errors(spec), key=lambda e: list(e.absolute_path)):
        rep.err("SCHEMA", "/" + "/".join(map(str, e.absolute_path)), e.message[:200])


def node_key(n):
    return (n.get("section"), n.get("variant", "default"))


def check_template(spec, rep):
    tpl = TEMPLATES.get(spec.get("template"))
    if not tpl:
        rep.err("TEMPLATE_UNKNOWN", "/template", f"unknown template {spec.get('template')!r}")
        return
    tkeys = [(n["section"], n["variant"]) for n in tpl["nodes"]]
    tnode = {(n["section"], n["variant"]): n for n in tpl["nodes"]}
    skeys = [node_key(n) for n in spec.get("nodes", []) if isinstance(n, dict)]
    for k in tkeys:
        if tnode[k]["required"] and k not in skeys:
            rep.err("TEMPLATE_MISSING_REQUIRED", "/nodes", f"template {spec['template']} requires {k[0]}#{k[1]}")
    for i, k in enumerate(skeys):
        if k not in tnode:
            rep.err("TEMPLATE_EXTRA_NODE", f"/nodes/{i}", f"{k[0]}#{k[1]} is not a node of template {spec['template']}")
        elif skeys.count(k) > 1 and not tnode[k]["repeatable"] and skeys.index(k) != i:
            rep.err("TEMPLATE_DUPLICATE", f"/nodes/{i}", f"{k[0]}#{k[1]} is not repeatable in {spec['template']}")
    seen, order = set(), []
    for k in skeys:
        if k in tnode and k not in seen:
            seen.add(k)
            order.append(k)
    expected = [k for k in tkeys if k in seen]
    if order != expected:
        rep.err("TEMPLATE_ORDER", "/nodes", f"node order {[a for a, _ in order]} differs from template order {[a for a, _ in expected]}")
    if spec.get("mode") == "reference" and spec.get("route") not in tpl["routes"]:
        rep.err("ROUTE_NOT_IN_TEMPLATE", "/route", f"reference PageSpec route {spec.get('route')!r} is not served by {spec['template']} ({tpl['routes']})")


def layer_of(spec, k, bp="desktop"):
    tpl = TEMPLATES.get(spec.get("template"), {"nodes": []})
    for n in tpl["nodes"]:
        if (n["section"], n["variant"]) == k:
            return n["layer"][bp]
    return SECTIONS.get(k[0], {}).get("layer", {}).get(bp)


def check_graph(spec, rep):
    nodes = [n for n in spec.get("nodes", []) if isinstance(n, dict) and n.get("section") in SECTIONS]
    sev = lambda rid: rep.err if GRAPH[rid]["severity"] == "error" else rep.warn
    keys = [node_key(n) for n in nodes]
    loop = [(i, k) for i, k in enumerate(keys) if layer_of(spec, k) == "in-flow-loop"]

    heroes = [i for i, k in enumerate(keys) if CATEGORY[k[0]] == "HERO"]
    if len(heroes) != 1:
        sev("ONE_HERO")("ONE_HERO", "/nodes", f"{len(heroes)} HERO nodes; exactly one required")
    if heroes and loop and heroes[0] > loop[0][0]:
        sev("HERO_BEFORE_LOOP_CONTENT")("HERO_BEFORE_LOOP_CONTENT", f"/nodes/{heroes[0]}", "hero must precede all loop content")

    runway = [k[1] for _, k in loop if k[0] == "layout.scroll-runway"]
    if loop and (loop[0][1] != ("layout.scroll-runway", "hero") or loop[-1][1] != ("layout.scroll-runway", "tail") or sorted(runway) != ["hero", "tail"]):
        sev("RUNWAY_BRACKETS")("RUNWAY_BRACKETS", "/nodes", "loop content must open with runway#hero and close with runway#tail, once each")

    content_loop = [(i, k) for i, k in loop if CATEGORY[k[0]] != "SPACER"]
    if content_loop and content_loop[-1][1][0] != "cta.closing-band":
        sev("CTA_LAST_CONTENT")("CTA_LAST_CONTENT", f"/nodes/{content_loop[-1][0]}", "cta.closing-band must be the last content section")

    present = {k[0] for k in keys}
    targets = GRAPH["NAV_TARGETS_EXIST"]["targets"]
    navs = {}
    for i, n in enumerate(nodes):
        if n["section"] in ("shell.sidebar-nav", "shell.mobile-menu") and isinstance(n.get("content"), dict):
            items = n["content"].get("navItems", [])
            navs[n["section"]] = [(x.get("label"), x.get("target")) for x in items if isinstance(x, dict)]
            for j, x in enumerate(items):
                t = x.get("target") if isinstance(x, dict) else None
                if targets.get(t) not in present:
                    sev("NAV_TARGETS_EXIST")("NAV_TARGETS_EXIST", f"/nodes/{i}/content/navItems/{j}", f"target {t!r} -> {targets.get(t)} is not on the page")
    if len(navs) == 2 and navs["shell.sidebar-nav"] != navs["shell.mobile-menu"]:
        sev("NAV_PARITY")("NAV_PARITY", "/nodes", "mobile menu navItems differ from sidebar navItems")

    tags = {n["section"]: n["content"].get("tagline") for n in nodes if n["section"] in ("shell.sidebar-nav", "shell.mobile-brand-intro") and isinstance(n.get("content"), dict)}
    if len(tags) == 2 and tags["shell.sidebar-nav"] != tags["shell.mobile-brand-intro"]:
        sev("SHARED_TAGLINE")("SHARED_TAGLINE", "/nodes", "mobile brand intro tagline differs from sidebar tagline")

    for (i, a), (_, b) in zip(loop, loop[1:]):
        if CATEGORY[a[0]] == CATEGORY[b[0]]:
            sev("NO_ADJACENT_SAME_CATEGORY")("NO_ADJACENT_SAME_CATEGORY", f"/nodes/{i}", f"{a[0]} and {b[0]} are both {CATEGORY[a[0]]}")

    singles = {}
    for i, n in enumerate(nodes):
        for p in (n.get("motion") or {}).get("patterns", []) if isinstance(n.get("motion"), dict) else []:
            if p in ("hero-ticket-flight", "fish-wheel-scrub", "bot-cursors", "cursor-trail", "oval-breathe", "overlay-slide"):
                singles.setdefault(p, []).append(i)
    for p, idx in singles.items():
        if len(idx) > 1:
            sev("MOTION_SINGLETONS")("MOTION_SINGLETONS", f"/nodes/{idx[1]}", f"motion pattern {p} appears {len(idx)} times")

    for i, n in enumerate(nodes):
        c = n.get("content") if isinstance(n.get("content"), dict) else {}
        if n["section"] == "testimonials.ellipse-carousel":
            for j, r in enumerate(c.get("reviews", [])):
                total = sum(len(p) for p in r.get("paragraphs", []) if isinstance(p, str))
                if total > 399:
                    sev("REVIEW_TOTAL_CHARS")("REVIEW_TOTAL_CHARS", f"/nodes/{i}/content/reviews/{j}", f"{total} chars > 399")
        if n["section"] == "faq.accordion" and "initiallyOpenIndex" in c:
            if not isinstance(c["initiallyOpenIndex"], int) or c["initiallyOpenIndex"] >= len(c.get("items", [])):
                sev("FAQ_OPEN_INDEX")("FAQ_OPEN_INDEX", f"/nodes/{i}/content/initiallyOpenIndex", "points past the last item")


def check_budgets_motion(spec, rep):
    for i, n in enumerate(spec.get("nodes", [])):
        if not isinstance(n, dict) or n.get("section") not in SECTIONS:
            continue
        key = n["section"].replace(".", "_")
        walk_budgets(SCHEMA["definitions"].get(f"content_{key}", {}), n.get("content"), f"/nodes/{i}/content", rep)
        m = n.get("motion") if isinstance(n.get("motion"), dict) else {}
        want = SECTIONS[n["section"]]["motion"]["patterns"]
        if sorted(m.get("patterns", [])) != sorted(want):
            rep.err("MOTION_PATTERN_SET", f"/nodes/{i}/motion", f"patterns must be exactly {want} (component-owned behaviour)")
        fb = m.get("reducedMotionFallback") if isinstance(m.get("reducedMotionFallback"), dict) else {}
        for p in m.get("patterns", []):
            if p not in fb:
                rep.err("MOTION_FALLBACK_MISSING", f"/nodes/{i}/motion", f"no reducedMotionFallback for {p}")
            elif p in PATTERNS and fb[p] != PATTERNS[p]["reducedMotionFallback"]:
                rep.err("MOTION_FALLBACK_MISMATCH", f"/nodes/{i}/motion/reducedMotionFallback/{p}", f"must be {PATTERNS[p]['reducedMotionFallback']!r}")
    for path, s in walk_budgets_top(spec):
        pass


def walk_budgets_top(spec):
    title = spec.get("title")
    if isinstance(title, str) and len(title.split()) > SCHEMA["properties"]["title"]["maxWords"]:
        yield "/title", title
    return


def check_title_budget(spec, rep):
    for path, _ in walk_budgets_top(spec):
        rep.err("MAX_WORDS", path, f"> maxWords {SCHEMA['properties']['title']['maxWords']}")


def check_tokens(spec, rep):
    slots = POLICY["slots"]
    raw = POLICY["rawValueRestrictions"]
    theme = spec.get("theme")
    for i, n in enumerate(spec.get("nodes", [])):
        if not isinstance(n, dict) or not isinstance(n.get("tokens"), dict):
            continue
        allowed = ALLOW.get(n.get("section"), {}).get("allowedTokenSlots", {})
        for slot, val in n["tokens"].items():
            p = f"/nodes/{i}/tokens/{slot}"
            if slot not in slots or not isinstance(val, str):
                continue
            cat = slots[slot]["category"]
            if cat == "color" and any(re.search(rx, val) for rx in raw["color"]["rejectPatterns"]):
                rep.err("TOKEN_RAW_COLOR", p, f"raw colour {val!r}; use a color.* token id")
                continue
            if cat == "spacing" and any(re.search(rx, val) for rx in raw["spacing"]["rejectPatterns"]):
                rep.err("TOKEN_ARBITRARY_SPACING", p, f"arbitrary spacing {val!r}; use a spacing.* token id")
                continue
            if cat == "fontFamily" and val not in raw["fontFamily"]["allowed"]:
                rep.err("TOKEN_UNSUPPORTED_FONT", p, f"font {val!r} not in {raw['fontFamily']['allowed']}")
                continue
            tok = CATALOG.get(val)
            if tok is None:
                rep.err("TOKEN_UNKNOWN", p, f"{val!r} is not in tokens/llm/token-catalog.json")
                continue
            if not tok.get("referenceable"):
                rep.err("TOKEN_NOT_REFERENCEABLE", p, f"{val!r} is defined but unused by the source (not referenceable)")
                continue
            if tok["category"] != cat or not any(val.startswith(px) for px in slots[slot]["allowedPrefixes"]):
                rep.err("TOKEN_WRONG_CATEGORY", p, f"{val!r} ({tok['category']}) does not fit slot {slot} ({cat})")
                continue
            if theme not in tok.get("themes", []):
                rep.err("TOKEN_THEME_COMBINATION", p, f"{val!r} is not defined for theme {theme!r}")
                continue
            if val not in allowed.get(slot, []):
                rep.err("TOKEN_NOT_ALLOWED_FOR_SECTION", p, f"{val!r} not allowed for {n.get('section')}.{slot} (allowed {allowed.get(slot, [])})")
        for pair in POLICY["contrastPairs"]:
            (islot, ival), = pair["if"].items()
            (rslot, rvals), = pair["require"].items()
            if n["tokens"].get(islot) == ival and rslot in n["tokens"] and n["tokens"][rslot] not in rvals:
                rep.err("TOKEN_CONTRAST_PAIR", f"/nodes/{i}/tokens", f"{islot}={ival} requires {rslot} in {rvals}, got {n['tokens'][rslot]!r}")


def check_assets(spec, rep):
    mode = spec.get("mode")
    found = list(walk_assets(spec.get("brand", {}), "/brand"))
    for i, n in enumerate(spec.get("nodes", [])):
        if isinstance(n, dict):
            found += [(p, a, n.get("section")) for p, a in walk_assets(n.get("content", {}), f"/nodes/{i}/content")]
    for item in found:
        path, a = item[0], item[1]
        sec = item[2] if len(item) > 2 else None
        role = a.get("assetRole")
        if role not in PINNED_AVAILABILITY:
            rep.err("ASSET_ROLE_UNKNOWN", path, f"{role!r} is not a pinned asset role")
            continue
        avail = PINNED_AVAILABILITY[role]
        if role in ROLES and ROLES[role].get("availability") != avail:
            rep.err("ASSET_PIN_DRIFT", path, f"registry says {ROLES[role].get('availability')!r} but code pins {avail!r}")
        if sec:
            ok = SECTIONS[sec]["generatedAssetRoles"] + SECTIONS[sec]["referenceAssetRoles"]
            if role not in ok:
                rep.err("ASSET_ROLE_NOT_FOR_SECTION", path, f"{role} is not an asset role of {sec}")
        src = str(a.get("src", "")).lower()
        if avail == "blocked-for-generation" or any(src.endswith(f) for f in SOURCE_FILES):
            rep.err("ASSET_BLOCKED", path, f"{role} / {src or '-'} is the original's proprietary asset; never allowed in any mode")
        if mode == "generated":
            if avail == "reference-only":
                rep.err("GENERATED_MODE_ASSET", path, f"{role} is reference-only; use {ROLES.get(role, {}).get('generationSafeSubstitutes')}")
            if src and (any(src.endswith(f) for f in PROPRIETARY_FILES) or not src.startswith(GENERATED_SRC_SCHEMES)):
                rep.err("GENERATED_MODE_ASSET", path, f"src {src!r} must be a placeholder/generated/user-supplied reference, not a source or reference file")


def check_retrieval(spec, rep):
    for i, n in enumerate(spec.get("nodes", [])):
        if isinstance(n, dict) and "retrievalEligible" in n:
            want = n.get("section") not in RETRIEVAL_INELIGIBLE
            if n["retrievalEligible"] is not want:
                rep.err("RETRIEVAL_PIN_NODE", f"/nodes/{i}/retrievalEligible", f"{n.get('section')} is pinned retrievalEligible={want}")


def check_generated(spec, rep):
    if spec.get("mode") != "generated":
        return
    strings = list(walk_strings({"title": spec.get("title"), "brand": spec.get("brand"), "nodes": spec.get("nodes")}))
    for path, s in strings:
        if path.endswith("/src") or path.endswith("/assetRole") or path.endswith("/section") or path.endswith("/variant") or "/motion/" in path or "/tokens/" in path or path.endswith("/target"):
            continue
        low = s.lower()
        if any(rx.search(s) for rx in BRAND_RE):
            rep.err("GENERATED_MODE_BRAND", path, "source or reference brand name/variant")
        is_cta = "/cta/" in path or "/channels/" in path or path.endswith("acceptLabel")
        if is_cta and (any(rx.search(s) for rx in CTA_RE) or (path.endswith("/href") and is_absolute_url(s) and not host_of(s).endswith(SAFE_SUFFIXES))):
            rep.err("GENERATED_MODE_CTA", path, "source-specific CTA (brand CTA or non-placeholder CTA target)")
        urls = [s] if path.endswith("/href") and is_absolute_url(s) else URL_RE.findall(s)
        for u in urls:
            h = host_of(u)
            if not h.endswith(SAFE_SUFFIXES) or any(h == d or h.endswith("." + d) for d in BLOCKED_DOMAINS) or fp(u.lower()) in SRC_URL:
                rep.err("GENERATED_MODE_URL", path, f"URL host {h!r} is not a reserved placeholder domain (*.example / *.invalid)")
        if fingerprints(s) & SRC_COPY:
            rep.err("GENERATED_MODE_COPY", path, "matches the original's marketing copy (fingerprint)")
        elif fingerprints(s) & REF_COPY:
            rep.err("GENERATED_MODE_COPY", path, "matches the reference clone's copy (fingerprint)")
        n = norm(s)
        if fp(n) in SRC_PERSON or n in REF_PEOPLE or any(re.search(r"\b" + re.escape(p) + r"\b", n) for p in REF_PEOPLE if " " in p):
            rep.err("GENERATED_MODE_PERSON", path, "real (source) or reference-build person identity")
        if "/reviews/" in path and any(rx.search(low) for rx in RATING_RE):
            rep.err("GENERATED_MODE_RATING", path, "ratings are never shown by the source; a rating here would be fabricated")


def validate(spec):
    rep = Report()
    if not isinstance(spec, dict):
        rep.err("SCHEMA", "", "PageSpec must be an object")
        return rep
    check_schema(spec, rep)
    check_template(spec, rep)
    check_graph(spec, rep)
    check_budgets_motion(spec, rep)
    check_title_budget(spec, rep)
    check_tokens(spec, rep)
    check_assets(spec, rep)
    check_retrieval(spec, rep)
    check_generated(spec, rep)
    return rep


def main(argv):
    paths = [Path(a) for a in argv] or sorted(p for p in (REPO / "schema").rglob("*.pagespec.json"))
    bad = 0
    for p in paths:
        rep = validate(json.loads(Path(p).read_text()))
        name = p.relative_to(REPO) if str(p).startswith(str(REPO)) else p
        print(f"{name}: {len(rep.errors)} error(s), {len(rep.warnings)} warning(s)")
        for c, path, m in rep.errors:
            print(f"  ERROR {c} {path}: {m}")
        for c, path, m in rep.warnings:
            print(f"  warn  {c} {path}: {m}")
        bad += bool(rep.errors)
    return 1 if bad else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
