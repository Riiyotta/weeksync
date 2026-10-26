# Sevenday landing — local layout clone of weeksync.app

React 18 + Vite 5 + Tailwind v3 rebuild of the layout, typography and motion of https://weeksync.app/.
All copy, names, logo and artwork are original placeholders (see `src/content.js`, `public/assets/`);
the original's content belongs to its owner — keep this local and don't publish it with their branding.

```bash
npm ci && npm run dev   # http://localhost:5175
```

## Information architecture

`ia.json` is the only IA file to hand-edit. `IA.md` and `matrix.csv` are **generated** — never edit them by hand.

```bash
node validate.mjs && node build.mjs
```

What the data shows:

- One route (`/`) and one template carrying 15 sections across 7 categories; all hard invariants reconcile.
- Every section is single-use (0 shared, 15 page-local), so there is no reuse case for extracting shared
  section components — the reusable surface is below section level (`CtaButton`, `TypewriterText`, `Icons`).
- 6 of the 15 sections are viewport-specific: `shell.sidebar`, `shell.loop-scroller`, `shell.cursor-trail`
  and `hero.ticket` exist only on desktop; `shell.mobile-menu` and `hero.mobile` exist only on mobile
  (sidebar↔mobile-menu and ticket↔mobile hero are the replacement pairs).
  Desktop vs mobile is modelled as one template, not two, because both are the same single route.
- On desktop the scrolling sections (demo → footer) render twice inside the loop scroller; the IA lists each once.

Other project docs: `CLONE_SPEC.md` (measurements of the original), `design-repo/` (design-system contracts, when built).
