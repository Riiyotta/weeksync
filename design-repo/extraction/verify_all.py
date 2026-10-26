#!/usr/bin/env python3
"""One-shot verification of this design-repo. Exit 1 on any FAIL.

    python3 extraction/verify_all.py

Checks (each prints PASS / FAIL / WARN with evidence):
  hygiene        no junk files, no absolute machine paths, entryPoints inside the package
  schema         Draft-07 meta-check + every example PageSpec: schema and semantic layer 0 errors;
                 one generated example per template; reference example uses real reference assets
  contracts      section contracts valid against schema/section-contract.schema.json; semantic.id == id,
                 source.id != id; source tag re-read at the cited line (needs the sibling source tree)
  allowlist      two-way parity with primitives/, components/, sections/; allowlistVersion; settable
                 properties == PageSpec node schema; variants / motion / roles / retrieval agree
  retrieval      RETRIEVAL_INELIGIBLE pinned here == pinned in schema/semantic_validate.py == contracts ==
                 allowlist; runtime-UI-looking ids must be pinned; reasons >= 30 chars
  assets         PINNED_AVAILABILITY here == semantic_validate.py == assets/asset-roles.json; substitutes are
                 generation-safe; contract roles match availability and usedBySections both ways
  graph          compatibility/graph.json rule ids == IMPLEMENTED_GRAPH_RULES in the validator
  templates      node sections/variants/layers exist; routes mapped exactly once
  tokens         token-catalog.json recomputed from the token files (drift = FAIL); theme resolves;
                 token-policy categories/slots resolve against real catalog keys
  motion         every section pattern exists with the pinned fallback; schema const == pattern table
  citations      every {ref, expect} citation resolves in range AND the expected text is at the cited
                 lines (sibling source tree present) - otherwise one WARN, never a FAIL
  counts         registry.manifest.json counts and README counts recomputed from disk
  gate           extraction/wrapper_gate.py (measured heights, pinned thresholds)

Drift-proof: scripts/prove_drift.py breaks a scratch copy of this repo in each way above and
shows the matching check FAILs while the untouched copy passes.
"""
import importlib.util
import json
import re
import sys

sys.dont_write_bytecode = True  # keep the package free of __pycache__
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent
PROJECT = REPO.parent
SOURCE_PRESENT = (PROJECT / "CLONE_SPEC.md").is_file() and (PROJECT / "src").is_dir()

# ---- pins (duplicated on purpose from schema/semantic_validate.py; parity is checked) ----
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
RETRIEVAL_INELIGIBLE = {"utility.cursor-trail", "utility.cookie-consent", "shell.mobile-menu", "layout.scroll-runway"}
RUNTIME_UI_NAME = re.compile(r"cookie|consent|modal|dialog|drawer|overlay|preloader|cursor|toast|ticker|menu|spacer|runway", re.I)
README_LABELS = {"Catalog tokens": "catalogTokens", "Referenceable tokens": "referenceableTokens", "Foundation tokens": "foundationTokens",
                 "Semantic tokens": "semanticTokens", "Primitives": "primitives", "Components": "components", "Sections": "sections",
                 "Templates": "templates", "Routes": "routes", "Asset roles": "assetRoles", "Motion patterns": "motionPatterns",
                 "Graph rules": "graphRules", "Example PageSpecs": "examples", "Adversarial mutations": "adversarialMutations",
                 "Drift cases": "driftCases"}

RESULTS = []


def rec(name, ok, detail):
    RESULTS.append((name, "PASS" if ok is True else ("WARN" if ok == "warn" else "FAIL"), detail))


def load(rel):
    return json.loads((REPO / rel).read_text())


def module(rel, name):
    spec = importlib.util.spec_from_file_location(name, REPO / rel)
    m = importlib.util.module_from_spec(spec)
    sys.modules[name] = m
    spec.loader.exec_module(m)
    return m


SV = module("schema/semantic_validate.py", "semantic_validate")
MAN = load("registry.manifest.json")
ALLOW = load("tokens/llm/component-allowlist.json")
SECTIONS = {p.stem: json.loads(p.read_text()) for p in sorted((REPO / "sections").glob("*.json"))}
PRIMS = {p.stem: json.loads(p.read_text()) for p in sorted((REPO / "primitives").glob("*.json"))}
COMPS = {p.stem: json.loads(p.read_text()) for p in sorted((REPO / "components").glob("*.json"))}
ROLES = {r["id"]: r for r in load("assets/asset-roles.json")["roles"]}
TEMPLATES = load("templates/templates.json")["templates"]
ROUTES = load("templates/routes.json")
SCHEMA = load("schema/pagespec.schema.json")
PATTERNS = load("tokens/00-foundation/motion-patterns.json")["patterns"]


def all_json():
    return sorted(p for p in REPO.rglob("*.json") if p.is_file())


# ----------------------------------------------------------------------------- hygiene
def check_hygiene():
    junk = [str(p.relative_to(REPO)) for p in REPO.rglob("*") if p.name in (".DS_Store", "Thumbs.db", "desktop.ini") or "__MACOSX" in p.parts or "__pycache__" in p.parts]
    rec("hygiene.junk", not junk, "none" if not junk else junk[:5])
    # built by concatenation so this detector never matches a repo-wide grep for machine paths
    pat = re.compile("/" + r"Users/[A-Za-z0-9._-]+|" + "/" + r"home/[A-Za-z0-9._-]+/|" + r"[A-Za-z]:\\" + "Us" + r"ers\\|/private/(tmp|var)/")
    hits = []
    for p in REPO.rglob("*"):
        if p.is_file() and p.suffix in (".json", ".md", ".py", ".mjs", ".txt", ".csv"):
            for i, line in enumerate(p.read_text(errors="ignore").splitlines(), 1):
                if pat.search(line) and "pat = re.compile" not in line and "rejectPatterns" not in line:
                    hits.append(f"{p.relative_to(REPO)}:{i}")
    rec("hygiene.absolute-paths", not hits, "none" if not hits else hits[:5])
    eps = MAN.get("entryPoints", {})
    flat = [v for vs in eps.values() for v in (vs if isinstance(vs, list) else [vs])]
    bad = [e for e in flat if e.startswith(("..", "/")) or ":" in e or not (REPO / e).exists()]
    rec("hygiene.entryPoints", bool(flat) and not bad, f"{len(flat)} entry points, all inside design-repo and present" if not bad else f"bad: {bad[:5]}")


# ----------------------------------------------------------------------------- schema
def check_schema_examples():
    from jsonschema import Draft7Validator
    Draft7Validator.check_schema(SCHEMA)
    rec("schema.meta", True, "pagespec.schema.json is valid Draft-07")
    examples = sorted(p for p in (REPO / "schema").rglob("*.pagespec.json"))
    gens = {}
    for p in examples:
        spec = json.loads(p.read_text())
        rep = SV.validate(spec)
        rec(f"schema.example {p.relative_to(REPO)}", not rep.errors, f"{len(rep.errors)} errors, {len(rep.warnings)} warnings ({spec.get('mode')})" + (f": {rep.errors[:3]}" if rep.errors else ""))
        if spec.get("mode") == "generated":
            gens.setdefault(spec.get("template"), []).append(p.name)
        if spec.get("mode") == "reference":
            roles = {a.get("assetRole") for _, a in SV.walk_assets(spec)}
            rec(f"schema.reference-uses-real-assets {p.name}", any(PINNED_AVAILABILITY.get(r) == "reference-only" for r in roles), f"reference-only roles used: {sorted(r for r in roles if PINNED_AVAILABILITY.get(r) == 'reference-only')}")
    missing = [t for t in TEMPLATES if t not in gens]
    rec("schema.generated-example-per-template", not missing, f"generated examples: {gens}" if not missing else f"no generated example for {missing}")


# ----------------------------------------------------------------------------- contracts
def check_contracts():
    from jsonschema import Draft7Validator
    cs = load("schema/section-contract.schema.json")
    for sid, c in SECTIONS.items():
        errs = [e.message[:120] for e in Draft7Validator(cs).iter_errors(c)]
        problems = list(errs)
        if c.get("id") != sid:
            problems.append(f"file stem {sid} != id {c.get('id')}")
        if c.get("semantic", {}).get("id") != c.get("id"):
            problems.append("semantic.id must equal contract id")
        if c.get("source", {}).get("id") == c.get("id"):
            problems.append("source.id must not equal contract id")
        src = c.get("source", {})
        if src.get("citation", {}).get("ref") != f"{src.get('file')}:{src.get('lines')}":
            problems.append("source.citation.ref must equal file:lines")
        rec(f"contracts.{sid}", not problems, "valid, source/semantic split ok" if not problems else problems[:3])
    for kind, d in (("primitive", PRIMS), ("component", COMPS)):
        bad = [k for k, v in d.items() if v.get("kind") != kind or v.get("id") != f"{kind}.{k}"]
        rec(f"contracts.{kind}s", not bad, f"{len(d)} {kind} contracts" if not bad else bad)
    if SOURCE_PRESENT:
        bad = []
        for sid, c in SECTIONS.items():
            s = c["source"]
            f = PROJECT / s["file"]
            lo = int(s["lines"].split("-")[0])
            lines = f.read_text(errors="ignore").splitlines() if f.is_file() else []
            if not lines or lo > len(lines) or f"<{s['tag']}" not in lines[lo - 1]:
                bad.append(f"{sid}: <{s['tag']} not at {s['file']}:{lo}")
        rec("contracts.source-tag-reread", not bad, f"{len(SECTIONS)} source tags re-read at their cited lines" if not bad else bad)
    else:
        rec("contracts.source-tag-reread", "warn", "sibling source tree absent (standalone copy); tag re-read skipped")


# ----------------------------------------------------------------------------- allowlist
def check_allowlist():
    entries = ALLOW["entries"]
    files = {**{v["id"]: ("section", k) for k, v in SECTIONS.items()}, **{v["id"]: ("primitive", k) for k, v in PRIMS.items()}, **{v["id"]: ("component", k) for k, v in COMPS.items()}}
    phantom = sorted(set(entries) - set(files))
    orphan = sorted(set(files) - set(entries))
    rec("allowlist.parity", not phantom and not orphan, f"{len(entries)} entries == {len(files)} contract files" if not phantom and not orphan else f"phantom={phantom} orphan={orphan}")
    rec("allowlist.version", ALLOW.get("allowlistVersion") == MAN.get("allowlistVersion"), f"allowlist {ALLOW.get('allowlistVersion')} vs manifest {MAN.get('allowlistVersion')}")
    props = sorted(SCHEMA["definitions"]["node"]["properties"])
    bad = []
    for sid, c in SECTIONS.items():
        e = entries.get(sid, {})
        if sorted(e.get("settableProperties", [])) != props:
            bad.append(f"{sid}: settableProperties != schema node properties {props}")
        for k_e, k_c in (("variants", "variants"), ("generatedAssetRoles", "generatedAssetRoles"), ("referenceAssetRoles", "referenceAssetRoles"), ("allowedTokenSlots", "allowedTokenSlots")):
            if e.get(k_e) != c.get(k_c):
                bad.append(f"{sid}: allowlist {k_e} != contract")
        if e.get("motionPatterns") != c["motion"]["patterns"]:
            bad.append(f"{sid}: motionPatterns != contract")
        if e.get("category") != c["semantic"]["category"]:
            bad.append(f"{sid}: category != contract")
        if e.get("contract") != f"sections/{sid}.json":
            bad.append(f"{sid}: contract path")
    rec("allowlist.entries-match-contracts", not bad, "settable properties, variants, roles, slots, motion, category all agree" if not bad else bad[:4])


# ----------------------------------------------------------------------------- retrieval
def check_retrieval():
    rec("retrieval.pin-parity", RETRIEVAL_INELIGIBLE == SV.RETRIEVAL_INELIGIBLE, f"verify_all pin == semantic_validate pin ({sorted(RETRIEVAL_INELIGIBLE)})" if RETRIEVAL_INELIGIBLE == SV.RETRIEVAL_INELIGIBLE else f"diverged: {sorted(RETRIEVAL_INELIGIBLE ^ SV.RETRIEVAL_INELIGIBLE)}")
    bad = []
    for sid, c in SECTIONS.items():
        want = sid not in RETRIEVAL_INELIGIBLE
        if c.get("retrievalEligible") is not want:
            bad.append(f"{sid}: contract retrievalEligible={c.get('retrievalEligible')} but pinned {want}")
        if ALLOW["entries"].get(sid, {}).get("retrievalEligible") is not want:
            bad.append(f"{sid}: allowlist retrievalEligible disagrees with pin")
        if not want and len(c.get("retrievalIneligibleReason", "")) < 30:
            bad.append(f"{sid}: reason < 30 chars")
        if (RUNTIME_UI_NAME.search(sid) or RUNTIME_UI_NAME.search(c.get("title", ""))) and want:
            bad.append(f"{sid}: looks like runtime UI but is not pinned ineligible")
    for p in RETRIEVAL_INELIGIBLE:
        if p not in SECTIONS:
            bad.append(f"pin names unknown section {p}")
    rec("retrieval.contracts-allowlist-pin", not bad, f"{len(RETRIEVAL_INELIGIBLE)} ineligible, {len(SECTIONS) - len(RETRIEVAL_INELIGIBLE)} eligible; contracts, allowlist and pins agree" if not bad else bad[:4])


# ----------------------------------------------------------------------------- mode
PINNED_MODE_RULES = ("GENERATED_MODE_BRAND", "GENERATED_MODE_CTA", "GENERATED_MODE_COPY", "GENERATED_MODE_URL",
                     "GENERATED_MODE_ASSET", "GENERATED_MODE_PERSON", "GENERATED_MODE_RATING")


def check_mode():
    prop = SCHEMA.get("properties", {}).get("mode", {})
    ok = "mode" in SCHEMA.get("required", []) and sorted(prop.get("enum", [])) == ["generated", "reference"]
    rec("mode.schema-required-closed", ok, "mode is required and closed to reference|generated" if ok else "PageSpec schema no longer requires a closed mode enum")
    src = (REPO / "schema/semantic_validate.py").read_text()
    missing = [r for r in PINNED_MODE_RULES if r not in tuple(SV.GENERATED_RULES) or f'"{r}"' not in src.split("GENERATED_RULES", 1)[1]]
    rec("mode.generated-rules-pinned", not missing, f"{len(PINNED_MODE_RULES)} generated-mode leakage rules present" if not missing else f"missing: {missing}")


# ----------------------------------------------------------------------------- assets
def check_assets():
    rec("assets.pin-parity-code", PINNED_AVAILABILITY == SV.PINNED_AVAILABILITY, "verify_all pin == semantic_validate pin" if PINNED_AVAILABILITY == SV.PINNED_AVAILABILITY else f"diverged: {sorted(set(PINNED_AVAILABILITY.items()) ^ set(SV.PINNED_AVAILABILITY.items()))}")
    reg = {k: v.get("availability") for k, v in ROLES.items()}
    rec("assets.pin-parity-registry", reg == PINNED_AVAILABILITY, f"{len(reg)} roles, registry == code pin" if reg == PINNED_AVAILABILITY else f"diverged: {sorted(set(reg.items()) ^ set(PINNED_AVAILABILITY.items()))}")
    bad = []
    for rid, r in ROLES.items():
        if r.get("availability") not in ("reference-only", "generation-safe", "blocked-for-generation"):
            bad.append(f"{rid}: availability not in the closed enum")
        if r.get("availability") != "generation-safe" and not r.get("generationSafeSubstitutes"):
            bad.append(f"{rid}: non-generation-safe role without generationSafeSubstitutes")
        for s in r.get("generationSafeSubstitutes", []):
            if PINNED_AVAILABILITY.get(s) != "generation-safe":
                bad.append(f"{rid}: substitute {s} is not generation-safe")
        if PINNED_AVAILABILITY.get(rid) == "blocked-for-generation" and r.get("usedBySections"):
            bad.append(f"{rid}: blocked role used by sections")
        for s in r.get("usedBySections", []):
            c = SECTIONS.get(s)
            if not c or rid not in c["generatedAssetRoles"] + c["referenceAssetRoles"]:
                bad.append(f"{rid}: usedBySections {s} but that contract does not list it")
    for sid, c in SECTIONS.items():
        for r in c["generatedAssetRoles"]:
            if PINNED_AVAILABILITY.get(r) != "generation-safe":
                bad.append(f"{sid}: generatedAssetRoles has non-generation-safe {r}")
            elif sid not in ROLES.get(r, {}).get("usedBySections", []):
                bad.append(f"{sid}: lists {r} but the role's usedBySections omits it")
        for r in c["referenceAssetRoles"]:
            if PINNED_AVAILABILITY.get(r) != "reference-only":
                bad.append(f"{sid}: referenceAssetRoles has non-reference-only {r}")
        enums = set()
        def walk(o):
            if isinstance(o, dict):
                if "assetRole" in o.get("properties", {}):
                    enums.update(o["properties"]["assetRole"].get("enum", []))
                for v in o.values():
                    walk(v)
            elif isinstance(o, list):
                for v in o:
                    walk(v)
        walk(c["content"])
        extra = enums - set(c["generatedAssetRoles"] + c["referenceAssetRoles"])
        if extra:
            bad.append(f"{sid}: content assetRole enum has undeclared roles {sorted(extra)}")
    vocab = set(SCHEMA.get("x-assetRoleVocabulary", []))
    if vocab != set(PINNED_AVAILABILITY):
        bad.append("schema x-assetRoleVocabulary != pinned roles")
    rec("assets.roles-consistent", not bad, "closed enum, substitutes generation-safe, contracts <-> usedBySections both ways, no blocked role reachable" if not bad else bad[:5])
    lic = load("assets/asset-roles.json").get("licensing", {})
    rec("assets.licensing", "never be reproduced" in lic.get("summary", "") and "private" in lic.get("doNotPublish", ""), "licensing forbids reproducing the original's identity and says keep private")


# ----------------------------------------------------------------------------- graph
def check_graph():
    g = load("compatibility/graph.json")
    ids = {r["id"] for r in g["rules"]}
    ok = ids == SV.IMPLEMENTED_GRAPH_RULES
    rec("graph.rules-implemented", ok, f"{len(ids)} graph rules == validator implementation" if ok else f"graph-only={sorted(ids - SV.IMPLEMENTED_GRAPH_RULES)} code-only={sorted(SV.IMPLEMENTED_GRAPH_RULES - ids)}")
    bad = [r["id"] for r in g["rules"] if r.get("severity") not in ("error", "warn")]
    tg = next(r for r in g["rules"] if r["id"] == "NAV_TARGETS_EXIST")["targets"]
    bad += [f"nav target {k}->{v} unknown" for k, v in tg.items() if v not in SECTIONS]
    nav_enum = set(SCHEMA["definitions"]["content_shell_sidebar-nav"]["properties"]["navItems"]["items"]["properties"]["target"]["enum"])
    if nav_enum != set(tg):
        bad.append("schema nav target enum != graph targets")
    rec("graph.severity-and-targets", not bad, "severities closed; nav targets resolve" if not bad else bad)


# ----------------------------------------------------------------------------- templates
def check_templates():
    bad = []
    for tid, t in TEMPLATES.items():
        for n in t["nodes"]:
            c = SECTIONS.get(n["section"])
            if not c:
                bad.append(f"{tid}: unknown section {n['section']}")
                continue
            if n["variant"] not in c["variants"]:
                bad.append(f"{tid}: variant {n['variant']} not in {n['section']}")
            if n["layer"] != c["layer"] or n["category"] != c["semantic"]["category"]:
                bad.append(f"{tid}: layer/category of {n['section']} disagrees with contract")
    seen = {}
    for r in ROUTES["routes"]:
        seen.setdefault(r["route"], []).append(r["template"])
        if r["template"] not in TEMPLATES or r["route"] not in TEMPLATES[r["template"]]["routes"]:
            bad.append(f"route {r['route']} -> {r['template']} not reciprocated")
    for tid, t in TEMPLATES.items():
        for route in t["routes"]:
            if seen.get(route) != [tid]:
                bad.append(f"route {route} mapped {seen.get(route)}")
    dup = [k for k, v in seen.items() if len(v) != 1]
    rec("templates.nodes-and-routes", not bad and not dup, f"{len(TEMPLATES)} template(s), {len(seen)} route(s) each mapped exactly once" if not bad and not dup else (bad + dup)[:5])


# ----------------------------------------------------------------------------- tokens
def recompute_catalog():
    cat = {}
    for f, c in (("color", "color"), ("spacing", "spacing"), ("radius", "radius"), ("border", "border")):
        d = load(f"tokens/00-foundation/{f}.json")
        for k, v in d["tokens"].items():
            ref = (v.get("usageCount", 0) > 0) if c == "color" else True
            cat[k] = {"category": c, "layer": "foundation", "value": v["value"], "themes": ["light"], "referenceable": ref}
    ty = load("tokens/00-foundation/typography.json")
    for k, v in ty["fontFamily"].items():
        cat[k] = {"category": "fontFamily", "layer": "foundation", "value": v["value"], "themes": ["light"], "referenceable": True}
    for k, v in ty["fontSize"].items():
        cat[k] = {"category": "fontSize", "layer": "foundation", "value": v["value"], "themes": ["light"], "referenceable": True}
    mo = load("tokens/00-foundation/motion.json")
    for k, v in mo["duration"].items():
        cat[k] = {"category": "duration", "layer": "foundation", "value": v["value"], "themes": ["light"], "referenceable": True}
    for k, v in mo["easing"].items():
        cat[k] = {"category": "easing", "layer": "foundation", "value": v["value"], "themes": ["light"], "referenceable": True}
    sem = load("tokens/10-semantic/semantic.json")["tokens"]

    def resolve(t):
        for _ in range(6):
            if t in sem:
                t = sem[t]["resolvesTo"]
        return t
    for k, v in sem.items():
        tgt = resolve(k)
        if tgt not in cat:
            return None, f"semantic {k} resolves to unknown {tgt}"
        cat[k] = {"category": cat[tgt]["category"], "layer": "semantic", "resolvesTo": v["resolvesTo"], "value": cat[tgt]["value"], "themes": ["light"], "referenceable": True}
    return cat, None


def check_tokens():
    cat, err = recompute_catalog()
    real = load("tokens/llm/token-catalog.json")
    if err:
        rec("tokens.catalog-drift", False, err)
        return
    diff = sorted(k for k in set(cat) | set(real["tokens"]) if cat.get(k) != real["tokens"].get(k))
    rec("tokens.catalog-drift", not diff, f"{len(cat)} tokens recomputed from the token files == token-catalog.json" if not diff else f"{len(diff)} drifted: {diff[:5]}")
    cnt = real.get("counts", {})
    okc = cnt.get("total") == len(cat) and cnt.get("referenceable") == sum(1 for v in cat.values() if v["referenceable"])
    rec("tokens.catalog-counts", okc, f"catalog counts {cnt}")
    light = load("tokens/themes/light.json")["resolved"]
    bad = [k for k, v in light.items() if cat.get(k, {}).get("value") != v["value"]]
    missing = [k for k in cat if cat[k]["layer"] == "semantic" and k not in light]
    rec("tokens.theme-light", not bad and not missing, f"{len(light)} semantic tokens resolve to real foundation values in light" if not bad and not missing else (bad + missing)[:5])
    pol = load("tokens/llm/token-policy.json")
    cats = {v["category"] for v in cat.values()}
    probs = [f"rawValueRestrictions key {k!r} is not a catalog category" for k in pol["rawValueRestrictions"] if k not in cats]
    probs += [f"slot {s} category {v['category']!r} not in catalog" for s, v in pol["slots"].items() if v["category"] not in cats]
    probs += [f"font {f} not in catalog" for f in pol["rawValueRestrictions"].get("fontFamily", {}).get("allowed", []) if f not in cat]
    for pair in pol["contrastPairs"]:
        for t in list(pair["if"].values()) + [x for v in pair["require"].values() for x in v]:
            if t not in cat:
                probs.append(f"contrast pair token {t} unknown")
    for sid, c in SECTIONS.items():
        for slot, vals in c["allowedTokenSlots"].items():
            for v in vals:
                t = cat.get(v)
                if not t or not t["referenceable"] or t["category"] != pol["slots"][slot]["category"] or not any(v.startswith(px) for px in pol["slots"][slot]["allowedPrefixes"]):
                    probs.append(f"{sid}.{slot}: {v} is not a referenceable {pol['slots'][slot]['category']} token")
    rec("tokens.policy-resolves", not probs, "policy categories, slots, fonts, contrast pairs and section slot allow-lists all resolve to real catalog keys" if not probs else probs[:5])


# ----------------------------------------------------------------------------- motion
def check_motion():
    bad = []
    for sid, c in SECTIONS.items():
        for p in c["motion"]["patterns"]:
            if p not in PATTERNS:
                bad.append(f"{sid}: unknown pattern {p}")
            elif c["motion"]["reducedMotionFallbacks"].get(p) != PATTERNS[p]["reducedMotionFallback"]:
                bad.append(f"{sid}: fallback for {p} != motion-patterns.json")
        m = SCHEMA["definitions"][f"motion_{sid.replace('.', '_')}"]
        for p, v in m["properties"]["reducedMotionFallback"]["properties"].items():
            if v.get("const") != PATTERNS.get(p, {}).get("reducedMotionFallback"):
                bad.append(f"schema const for {sid}/{p} drifted")
        if m.get("additionalProperties") is not False:
            bad.append(f"schema motion for {sid} is open")
    rec("motion.patterns-and-fallbacks", not bad, f"{len(PATTERNS)} patterns; every section motion closed with the pinned reducedMotionFallback" if not bad else bad[:5])


# ----------------------------------------------------------------------------- citations
CITE_RE = re.compile(r"^(?P<file>[^:]+):(?P<a>\d+)(?:-(?P<b>\d+))?$")


def walk_cites(o, where):
    if isinstance(o, dict):
        if isinstance(o.get("ref"), str) and "expect" in o and CITE_RE.match(o["ref"]):
            yield where, o
        for k, v in o.items():
            yield from walk_cites(v, where)
    elif isinstance(o, list):
        for v in o:
            yield from walk_cites(v, where)


def check_citations():
    cites = [(str(p.relative_to(REPO)), c) for p in all_json() for _, c in walk_cites(json.loads(p.read_text()), p)]
    # citations into the package's own tracked evidence are always re-read (even standalone)
    inpkg = lambda ref: ref.startswith("extraction/evidence/")
    skipped = 0
    if not SOURCE_PRESENT:
        skipped = sum(1 for _, c in cites if not inpkg(c["ref"]))
        cites = [(w, c) for w, c in cites if inpkg(c["ref"])]
    cache, bad = {}, []
    for where, c in cites:
        m = CITE_RE.match(c["ref"])
        f = (REPO if inpkg(c["ref"]) else PROJECT) / m["file"]
        if m["file"] not in cache:
            cache[m["file"]] = f.read_text(errors="ignore").splitlines() if f.is_file() else None
        lines = cache[m["file"]]
        a, b = int(m["a"]), int(m["b"] or m["a"])
        if lines is None:
            bad.append(f"{where}: {c['ref']} file missing")
        elif a < 1 or b < a or b > len(lines):
            bad.append(f"{where}: {c['ref']} out of range (file has {len(lines)} lines)")
        elif not any(c["expect"] in lines[i] for i in range(a - 1, b)):
            bad.append(f"{where}: {c['ref']} does not contain {c['expect'][:60]!r}")
    if not SOURCE_PRESENT and not bad:
        rec("citations", "warn", f"{len(cites)} in-package citations re-read OK; {skipped} citations into the sibling source tree skipped (standalone copy)")
        return
    rec("citations", not bad, f"{len(cites)} citations across {len(cache)} source files resolve in range with the expected text at the cited lines" if not bad else f"{len(bad)} bad: {bad[:4]}")


# ----------------------------------------------------------------------------- counts
def computed_counts():
    cat = load("tokens/llm/token-catalog.json")["tokens"]
    adv = module("schema/tests/adversarial_test.py", "adversarial_test")
    drift = module("scripts/prove_drift.py", "prove_drift")
    return {
        "catalogTokens": len(cat), "referenceableTokens": sum(1 for v in cat.values() if v["referenceable"]),
        "foundationTokens": sum(1 for v in cat.values() if v["layer"] == "foundation"), "semanticTokens": sum(1 for v in cat.values() if v["layer"] == "semantic"),
        "primitives": len(PRIMS), "components": len(COMPS), "sections": len(SECTIONS), "templates": len(TEMPLATES), "routes": len(ROUTES["routes"]),
        "assetRoles": len(ROLES), "motionPatterns": len(PATTERNS), "graphRules": len(load("compatibility/graph.json")["rules"]),
        "examples": len(list((REPO / "schema").rglob("*.pagespec.json"))), "adversarialMutations": len(adv.static_cases()), "driftCases": len(drift.CASES),
    }


def check_counts():
    real = computed_counts()
    m = MAN.get("counts", {})
    diff = {k: (m.get(k), v) for k, v in real.items() if m.get(k) != v}
    rec("counts.manifest", not diff, f"manifest counts == disk {real}" if not diff else f"manifest vs disk: {diff}")
    readme = (REPO / "README.md").read_text()
    rows = dict(re.findall(r"^\| ([A-Za-z ]+?) \| (\d+) \|$", readme, re.M))
    rd = {lab: (rows.get(lab), real[key]) for lab, key in README_LABELS.items() if rows.get(lab) is None or int(rows[lab]) != real[key]}
    rec("counts.readme", not rd, "README counts table == disk" if not rd else f"README vs disk: {rd}")
    rec("versions.pageSpecVersion", MAN.get("pageSpecVersion") == SCHEMA["properties"]["pageSpecVersion"]["const"], f"manifest {MAN.get('pageSpecVersion')} == schema const {SCHEMA['properties']['pageSpecVersion']['const']}")


def check_gate():
    gate = module("extraction/wrapper_gate.py", "wrapper_gate")
    # thresholds pinned here as well, so loosening wrapper_gate.py alone is caught
    pinned = {"HERO_WARN_PX": 1800, "HERO_ERROR_PX": 3000, "SHARE_WARN": 0.50, "SHARE_ERROR": 0.60,
              "MIN_INFLOW_SECTIONS": 3, "REQUIRED_VIEWPORT_WIDTH": 1440}
    drift = {k: getattr(gate, k, None) for k, v in pinned.items() if getattr(gate, k, None) != v}
    rec("gate.thresholds-pinned", not drift, "wrapper_gate thresholds == verify_all pin" if not drift else f"loosened/changed: {drift}")
    wl = load("extraction/wrapper-whitelist.json")
    rec("gate.whitelist-reviewed", all(w.get("reviewedBy") and len(w.get("justification", "")) >= 30 for w in wl.get("entries", [])), f"{len(wl.get('entries', []))} whitelist entries, each with reviewedBy and a 30+ char justification")
    errors, warnings = gate.check(load("extraction/measured-values.json"), wl)
    rec("gate.wrapper", not errors, f"{len(errors)} errors, {len(warnings)} warnings" + (f": {errors[:3]}" if errors else ""))


def main():
    for fn in (check_hygiene, check_schema_examples, check_contracts, check_mode, check_allowlist, check_retrieval, check_assets, check_graph,
               check_templates, check_tokens, check_motion, check_citations, check_counts, check_gate):
        try:
            fn()
        except Exception as e:  # a crash is a failure, never a silent pass
            rec(fn.__name__, False, f"crashed: {type(e).__name__}: {e}")
    for n, r, d in RESULTS:
        print(f"{r:4}  {n}: {d}")
    f = sum(1 for _, r, _ in RESULTS if r == "FAIL")
    w = sum(1 for _, r, _ in RESULTS if r == "WARN")
    print(f"\nverify_all: {len(RESULTS) - f - w} pass, {w} warn, {f} fail  (source tree {'present' if SOURCE_PRESENT else 'absent: standalone mode'})")
    return 1 if f else 0


if __name__ == "__main__":
    sys.exit(main())
