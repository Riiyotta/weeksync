# WeekSync landing: design-repo

An AI-ready design system extracted from the clone in the parent folder: tokens, primitives,
components, semantic section contracts, one page template, a compatibility graph, a Draft-07
PageSpec schema, a semantic validator and adversarial/drift proofs. A generator uses it to compose
new pages (mode `generated`) or to describe the reference build (mode `reference`) without
inventing colours, copy budgets, structure or assets.

**Status:** `design-review-pending`, `productionApproved: false`. **Keep this repository private.** It
documents a real company's live site. Do not publish it or make any repository containing it public.

## Counts (recomputed from disk; `verify_all.py` fails if this table drifts)

| Item | Count |
|---|---|
| Catalog tokens | 119 |
| Referenceable tokens | 110 |
| Foundation tokens | 89 |
| Semantic tokens | 30 |
| Primitives | 8 |
| Components | 12 |
| Sections | 13 |
| Templates | 1 |
| Routes | 1 |
| Asset roles | 20 |
| Motion patterns | 11 |
| Graph rules | 11 |
| Example PageSpecs | 2 |
| Adversarial mutations | 67 |
| Drift cases | 39 |

## Read this first: what is unusual about this page

- Loop scroller (>=1024px): there is no native scroll. A fixed root renders the whole content column TWICE (wrap + wrap-clone, 7504.4px each at 1440x900, 6670.3px at 1280x800, measured) and translates it per frame, wrapping seamlessly. Demo data/view/period and the open FAQ item are shared between the copies through module-level stores; the reviews carousel index is NOT shared. The sidebar scroll-spy scans both copies. Below 1024px the page scrolls natively as a single copy.
- Unit system: 1rem = 1 design px. Root font-size is calc(1vw/14.4) at >=1024, 1px from 480-1023 and calc(1vw/3.6) at <=479, so every rem value scales with the viewport (0.8889px per rem at 1280).
- Fixed layers take no page height: cursor trail, cookie triangle, sidebar and the hero ticket are position:fixed on desktop. The hero's scroll footprint is the in-flow runway spacer layout.scroll-runway#hero (1608.8px at 1440x900); a tail runway (634.5px) sits before the loop wraps. Both collapse to 0 on mobile.
- Motion is mostly scroll-linked: hero ticket flight + scissors snip (+ zipper pull scrolling back in), typewriter entrances at the 30% threshold (reset on exit), demo bot cursors, sprite wheel (scroll-linked outer rotation, 18deg/s inner, 29-frame scrub over 800ms), cursor trail, mobile ovals on a 6s loop, smooth scroll 1600ms easeInOutQuad (scissors only; sidebar links jump instantly).
- Mobile (<=1023): a fixed menu bar + full-screen overlay replaces the sidebar nav; the breathing-oval brand intro replaces the sidebar header; the hero ticket becomes an in-flow block; the demo frame stays 1039rem wide and is scaled down, view-only.
- Single designed route '/'. /login and four legal paths are served by the clone only as generic placeholder pages (src/components/PlaceholderPage.jsx, chosen by pathname in src/main.jsx); they are clone-only stubs, not measured from the original, so they have no template here.
- Only the bot cursors honour prefers-reduced-motion in the source. The reducedMotionFallback values in this repo are requirements for generated pages, recorded per pattern with sourceHonoursReducedMotion.
- Licensing: the measured original is a live commercial product. The clone already swaps in original placeholder copy ('Sevenday'), placeholder reviewers and placeholder SVGs; this repo stores the original's copy and reviewer names only as salted fingerprints, and blocks the original's logo, illustrations, sprite artwork, copy, testimonials, URLs and people in every mode.

## Licensing and generation rules

- The original's wordmark, feature illustrations, fish sprite artwork, marketing copy, testimonials,
  reviewer names, domain, API, mailbox and social profiles are `blocked-for-generation` roles. No
  PageSpec may reference them in any mode (`ASSET_BLOCKED`), and the generated-mode rules reject their
  text (`GENERATED_MODE_BRAND`, `_CTA`, `_COPY`, `_URL`, `_PERSON`, `_RATING`, `_ASSET`).
- The original's copy and reviewer names live in this repo **only** as salted SHA-256 fingerprints
  (`assets/source-identity.json`). No source copy is reproduced here; citations cite geometry and
  style values only.
- The reference clone's own placeholders (`Sevenday`, its reviewers, its SVGs) are `reference-only`.
  A generated page must bring its own brand, copy, fictional people, generated/user-supplied images
  and `.example` / `.invalid` links. The generated example (`schema/examples/generated.home.pagespec.json`,
  a fictional kitchen shift planner) shows the full pattern.
- Asset availability and retrieval eligibility are pinned in code (`PINNED_AVAILABILITY`,
  `RETRIEVAL_INELIGIBLE` in both `schema/semantic_validate.py` and `extraction/verify_all.py`), so
  editing a registry file alone cannot loosen them.

## Sections (measured heights at 1440x900, px)

| Section | Category | Layer desktop / mobile | Motion | Retrievable | Height |
|---|---|---|---|---|---|
| `cta.closing-band` | CTA | in-flow-loop / in-flow | fish-wheel-scrub | yes | 870 |
| `demo.interactive-calendar` | PRODUCT_DEMO | in-flow-loop / in-flow | bot-cursors | yes | 645 |
| `faq.accordion` | FAQ | in-flow-loop / in-flow | instant-swap | yes | 934.6 |
| `features.stacked-cards` | FEATURES | in-flow-loop / in-flow | typewriter | yes | 1503 |
| `hero.ticket` | HERO | fixed / in-flow | hero-ticket-flight, typewriter | yes | fixed |
| `layout.scroll-runway` | SPACER | in-flow-loop / collapsed | none | no | 1608.8 / 634.5 |
| `pricing.plan-contact` | PRICING | in-flow-loop / in-flow | typewriter | yes | 501 |
| `shell.mobile-brand-intro` | SHELL | absent / in-flow | oval-breathe | yes | fixed |
| `shell.mobile-menu` | SHELL | absent / fixed | overlay-slide | no | fixed |
| `shell.sidebar-nav` | SHELL | fixed / absent | none | yes | fixed |
| `testimonials.ellipse-carousel` | TESTIMONIALS | in-flow-loop / in-flow | instant-swap | yes | 792.6 |
| `utility.cookie-consent` | UTILITY | fixed / fixed | typewriter | no | fixed |
| `utility.cursor-trail` | UTILITY | fixed / absent | cursor-trail | no | fixed |

The single template `template.loop-landing` lists these 14 nodes in DOM order (the runway appears
twice, as variants `hero` and `tail`). Structural rules key on `(section, variant)`.

## How to generate a page

1. Start from `templates/templates.json` -> `template.loop-landing`; emit every node in order.
2. Fill `content` per the section's contract (`sections/*.json`): `maxLength` is the measured
   character budget (CLONE_SPEC section 14), `maxWords` the measured word budget.
3. Use `motion.patterns` exactly as the contract lists them, each with its pinned
   `reducedMotionFallback` (`tokens/00-foundation/motion-patterns.json`).
4. Optional `tokens` slots (`surface`, `text`, `fontFamily`, `paddingTop`) take catalog ids allowed
   for that section (`tokens/llm/component-allowlist.json`); raw values are rejected.
5. Set `mode: "generated"`, use only `generation-safe` asset roles, and validate:
   `python3 schema/semantic_validate.py your.pagespec.json`.

## Verify

```bash
python3 extraction/verify_all.py          # hygiene, schema, contracts, parity, pins, tokens, citations, counts, gate
python3 schema/semantic_validate.py       # every example: schema + semantic layer
python3 schema/tests/adversarial_test.py  # every mutation rejected, every control passes
python3 scripts/prove_drift.py            # verify_all catches each injected drift in a scratch copy
python3 extraction/wrapper_gate.py        # measured section-height gate
```

Requires Python 3 and the `jsonschema` package. `extraction/measure_sections.mjs` re-measures section
heights from a running clone (Playwright module path and clone URL via env vars).
`extraction/geometry_parity.py` recomputes geometry parity from the tracked dumps in
`extraction/evidence/parity-2026-10-29/` (verify_all re-derives the recorded numbers from them on every
run). To re-capture against the live original and a clone build (Playwright module via env var, no
machine paths stored):

```bash
# from the clone project root: npm ci; npx vite build --outDir <tmp>; npx vite preview --outDir <tmp> --port 5701
PLAYWRIGHT_MODULE=<playwright module> TARGET_URL=https://weeksync.app/ OUT_FILE=<dir>/o{vp}.n node design-repo/extraction/dump_geometry.mjs
PLAYWRIGHT_MODULE=<playwright module> TARGET_URL=http://localhost:5701/ OUT_FILE=<dir>/c{vp}b.n node design-repo/extraction/dump_geometry.mjs
python3 design-repo/extraction/geometry_parity.py --dumps <dir>
PLAYWRIGHT_MODULE=<playwright module> TARGET_URL=https://weeksync.app/ OUT_DIR=<shots> PREFIX=o node design-repo/extraction/pixel_capture.mjs
PLAYWRIGHT_MODULE=<playwright module> TARGET_URL=http://localhost:5701/ OUT_DIR=<shots> PREFIX=c node design-repo/extraction/pixel_capture.mjs
python3 design-repo/extraction/pixel_parity.py --shots <shots>     # needs Pillow + numpy
```

## Clone quality evidence

- Clean install: `npm ci` + `vite build` in an isolated copy, both exit 0 (see `extraction/measured-values.json -> cloneQuality`).
- Geometry parity (computed-style boxes, live original vs clone build, re-captured 2026-10-29 with the
  same script on both sites; 390 emulated as a touch phone): **100% for every section at 1440, 1280 and
  390** (gate: every section >= 80% and average >= 80%). Before this revision a fresh like-for-like
  capture gave sidebar 72.2 / hero 85.7 / cookie 33.3 at desktop and hero 50.0 / cookie 33.3 at 390;
  the 1.0.1 numbers (390 average 70.9%, mhero/reviews/faq failing) came from recon dumps that were not
  like for like and did not reproduce. Details and fixes: `extraction/measured-values.json -> cloneQuality`.
- Pixel parity (live-vs-clone screenshots per section, same viewport and scroll offset, reached by
  scrolling, placeholders and overlapping fixed layers masked, tolerance 32/255): 1440 avg 97.7%,
  1280 avg 97.7%, 390 avg 92.3%. Since 1.1.1 the hero is captured in the documented capture state
  `cookie: dismissed` on BOTH sites (banner hidden by the same rule in a fresh page load and verified
  gone, consent control not clicked; the cookie section itself is still captured visible), so the whole
  hero crop is compared instead of the strip the banner left uncovered. Every section passes 80% except
  **390 hero 73.9%** (91260 px compared; 75.3% over 20592 px with the banner masked in 1.1.0), carried by
  exception `parity-exc-390-hero-copy` (**pending human approval**, not self-approved): at 390 the hero
  section is only the headline block, the line bands and every background pixel match, and 99.9% of the
  mismatching pixels are glyphs of the clone's own placeholder copy (licensing); no layout gap was found.
  Screenshots of the live site are not committed (they contain its copy and artwork).

## Layout

```
registry.manifest.json  README.md  CHANGELOG.md
tokens/00-foundation/   color, typography, spacing, radius, border, breakpoint, z-index, motion, motion-patterns
tokens/10-semantic/     semantic roles -> foundation
tokens/20-component/    component dimensions
tokens/30-layout/       unit system, grid, runways, loop wrap height
tokens/themes/          light (the only theme the source ships)
tokens/llm/             token-catalog, token-policy, component-allowlist
primitives/ components/ sections/   contracts
templates/              templates.json, routes.json
compatibility/          graph.json
assets/                 asset-roles.json, source-identity.json
schema/                 pagespec + section-contract schemas, semantic_validate.py, examples, tests/
extraction/             evidence/ (tracked verbatim recon excerpts + parity-2026-10-29/ dumps and results), measured-values.json,
                        verify_all.py, wrapper_gate.py, wrapper-whitelist.json, measure_sections.mjs,
                        dump_geometry.mjs, geometry_parity.py, pixel_capture.mjs, pixel_parity.py
scripts/                prove_drift.py
```
