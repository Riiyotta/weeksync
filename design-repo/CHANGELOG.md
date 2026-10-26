# Changelog

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
