# Changelog

## 1.1.0 (2026-10-29): clone-fidelity revision (live re-measure, geometry + pixel parity)

- Re-captured the live original (https://weeksync.app/) and a production build of the clone at 1440x900,
  1280x800 and 390x844 (touch phone) with one script on both sites (`extraction/dump_geometry.mjs`, new),
  and added a per-section live-vs-clone screenshot comparison (`extraction/pixel_capture.mjs` +
  `extraction/pixel_parity.py`, new). Evidence is tracked in `extraction/evidence/parity-2026-10-29/`
  (full text-free dumps, before/after results, tile crop/mask boxes; no screenshots, no copy).
- The 1.0.1 390px failures (mhero 0%, reviews 11.8%, faq 9.5%) did not reproduce like for like: the old
  dumps mixed a retina recon capture, different oval animation phases and a non-touch emulation. The real
  gaps found: sidebar 72.2%, hero 85.7%/50.0% (390), cookie 33.3%, reviews 94.4%, demo 97.1%.
- Clone source fixes (the parent project's `src/`, `index.html`): sidebar nav label as its own centred
  block; cookie OK control start-aligned like the original; reviews counter centred; demo header cells
  bottom-border only (no preflight top border style); placeholder hero and cookie copy reworded (same
  lengths) so line breaks and the longest line match the original; Red Hat Mono loaded with 500/600 faces
  only, so weight-400 text renders with the 500 face exactly as on the original (it was visibly lighter).
- Result: geometry parity 100% for every section at all three viewports. Pixel parity: 1440 97.6%,
  1280 97.6%, 390 92.5% average; every section >= 80% except 390 hero 75.3%, recorded as exception
  `parity-exc-390-hero-copy`, **pending human approval** (placeholder headline glyphs; layout matches).
- `geometry_parity.py` now reads the tracked evidence folder by default. `verify_all` gained
  `parity.geometry-evidence` (recorded numbers re-derived from the tracked dumps, dump sha256 pinned),
  `parity.pixel-evidence` and `parity.gates` (80% per section and average, exceptions must be pending or
  carry a named approver). `prove_drift.py` 33 -> 37 cases (recorded parity edited, dump altered,
  exception dropped, exception self-approved).
- Token/contract touch-ups: `typography.fontLoading` cites the new font request and records the
  500-face rule; `color.border.column-current` cites the new demo header class. Section heights unchanged
  (all section roots identical to the original at every viewport).

## 1.0.1 (2026-10-26): fresh-clone verification fix

- Fixed: `verify_all` failed in any fresh clone because 5 citations in `extraction/measured-values.json`
  pointed into the gitignored `.playwright-mcp/` recon dumps. They now cite tracked, verbatim one-line
  excerpts under `extraction/evidence/` (o1440, c1440b, o390; lines copied unedited from the original
  captures, source sha256 recorded under `externalEvidence.trackedEvidence`). Nothing was re-measured and
  no value changed. The citation check is not weakened: citations into `extraction/evidence/` are now
  always re-read, including in a standalone design-repo copy; only citations into the sibling source tree
  are still skipped (warning) when it is absent.
- Added to `verify_all`: `gate.thresholds-pinned` (wrapper_gate thresholds pinned in a second place),
  `gate.whitelist-reviewed`, `mode.schema-required-closed`, `mode.generated-rules-pinned`.
- `scripts/prove_drift.py` (already present since 1.0.0) extended from 25 to 33 cases: loosened wrapper
  thresholds, whitelist without justification / stale whitelist, mode removed from the schema, a
  generated-mode rule dropped, tracked evidence altered / deleted. It no longer depends on `.playwright-mcp/`.
- `geometry_parity.py` is unchanged; it still reads the full local dumps when present.

## Unreleased

- Source moved: the sidebar active-section rule now skips off-screen elements (matches the original; nothing active once the CTA/footer is in view); /login and the four legal links now render clone-only placeholder pages via a pathname switch in src/main.jsx. Citations re-pointed to the shifted lines; docs updated (links are no longer dead).

## 1.0.0 (2026-10-26): initial build

Situation A build from scratch against the current clone source, CLONE_SPEC.md, the
`.playwright-mcp/` recon dumps and a fresh headless measurement of the running clone.

- Tokens: 119 catalog tokens (89 foundation, 30 semantic, 110 referenceable), one `light` theme,
  token-catalog derived mechanically from the token files, and a token policy with closed PageSpec slots.
- Contracts: 8 primitives, 12 components, 13 semantic sections (none whole-page; the loop runway is
  a SPACER with two variants), each with `source`/`semantic` provenance and `retrievalEligible`.
- One template (`template.loop-landing`), one served route (`/`), 11 graph rules all implemented in
  the validator, 20 asset roles with three-way availability pinned in code.
- PageSpec `mode: reference | generated` (pageSpecVersion 1.0.0) with generated-mode leakage rules;
  reference example (the clone's placeholder content and real reference assets) and a generated example.
- Wrapper-height gate on measured heights at 1440x900 (no hero over 1800px; largest share 20%).
- Proofs: 67 static adversarial mutations (+2 runtime source probes when the saved original is
  present) and 25 drift cases.
- Groundwork claims that did not fully hold: shared state across loop copies excludes the reviews
  carousel; smooth scrolling applies to the scissors only; CLONE_SPEC cross-references 9.3/11.5 should
  read 12.3/12.5; /login and the legal links are not served; nine palette tokens are unused; one
  generic 5-word FAQ question in the clone matches the original verbatim (kept in the reference
  example as the clone's real content, rejected in generated mode).
- Concurrent-edit reconciliation (MASTER-GUIDE 3.11): src/lib/loopEvents.js changed during this build
  (scroll targets now subtract the page root's 15rem padding-top). Nothing here asserted the old
  formula; the smooth-scroll-to motion pattern now records and cites the current rule. All motion
  citations were re-read against the current motion.js / botCursors.js / components before packaging.
