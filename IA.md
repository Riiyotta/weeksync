# Local clone at http://localhost:5175/ of the layout of https://weeksync.app/ (single-page landing)

Source: Local clone at http://localhost:5175/ of the layout of https://weeksync.app/ (single-page landing)
Status: **measured-from-codebase**
1 routes · 1 templates · 15 unique sections

> Generated from `ia.json` by `build.mjs`. Edit the JSON, not this file.

## Shape of the site

The largest 1 template (Landing page) accounts for 1 of 1 routes (100%). The remaining 0 routes span 0 templates.

| template | routes | share |
|---|---:|---:|
| Landing page | 1 | 100% |

## Page chrome

**1 routes carry chrome = `fixed-shell`** — Landing page.

## Sections by reuse

How widely a section is shared determines whether it belongs in a shared
component library or stays local to its page.

| section | category | templates | routes | implementation | scope |
|---|---|---:|---:|---|---|
| `shell.loop-scroller` | SHELL | 1 | 1 | `src/components/LoopScroller.jsx` | Wraps all scrolling content on the single route at desktop widths. |
| `shell.cookie-popup` | SHELL | 1 | 1 | `src/components/CookiePopup.jsx` | Shown on the single route until dismissed. |
| `shell.cursor-trail` | SHELL | 1 | 1 | `src/components/CursorTrail.jsx` | Desktop widths with a fine pointer only. |
| `shell.mobile-menu` | SHELL | 1 | 1 | `src/components/MobileMenu.jsx` | Mobile widths only (below the desktop breakpoint); replaces the sidebar. |
| `shell.sidebar` | SHELL | 1 | 1 | `src/components/Sidebar.jsx` | Desktop widths only; hidden on mobile where the mobile menu takes over. |
| `hero.ticket` | HERO | 1 | 1 | `src/components/HeroSlide.jsx` | Desktop widths on the single route; a spacer slide in the scrolling content reserves its scroll distance. |
| `hero.mobile` | HERO | 1 | 1 | `src/components/MobileHero.jsx` | Mobile widths only; the ticket is not used there. |
| `product.demo` | PRODUCT | 1 | 1 | `src/components/AppDemo.jsx` | Single route, all widths (scaled frame on mobile). |
| `product.features` | PRODUCT | 1 | 1 | `src/components/Features.jsx` | Single route, all widths. |
| `conversion.price-card` | CONVERSION | 1 | 1 | `src/components/Price.jsx > price card` | Single route, left half of the price row on desktop. |
| `conversion.contact-card` | CONVERSION | 1 | 1 | `src/components/Price.jsx > contact card` | Single route, right half of the price row on desktop, stacked below on mobile. |
| `proof.reviews` | PROOF | 1 | 1 | `src/components/Reviews.jsx` | Single route, all widths. |
| `support.faq` | SUPPORT | 1 | 1 | `src/components/Faq.jsx` | Single route, all widths. |
| `conversion.cta-block` | CONVERSION | 1 | 1 | `src/components/CtaFooter.jsx > FishWheel` | Single route, all widths; contains the footer row. |
| `footer.legal` | FOOTER | 1 | 1 | `src/components/CtaFooter.jsx` | Single route, inside the CTA block. |

**0 shared sections** appear in more than one template and belong in a component library.

**15 single-use sections** appear in exactly one template. Building these
as "reusable" components up front would be speculative — keep them page-local
until a second caller actually appears.

## Templates

### Landing page — `template.landing`

1 route · `/` · chrome: **fixed-shell**

| # | category | section | |
|---:|---|---|---|
| 1 | SHELL | `shell.loop-scroller` | page-local |
| 2 | SHELL | `shell.cookie-popup` | page-local |
| 3 | SHELL | `shell.cursor-trail` | page-local |
| 4 | SHELL | `shell.mobile-menu` | page-local |
| 5 | SHELL | `shell.sidebar` | page-local |
| 6 | HERO | `hero.ticket` | page-local |
| 7 | HERO | `hero.mobile` | page-local |
| 8 | PRODUCT | `product.demo` | page-local |
| 9 | PRODUCT | `product.features` | page-local |
| 10 | CONVERSION | `conversion.price-card` | page-local |
| 11 | CONVERSION | `conversion.contact-card` | page-local |
| 12 | PROOF | `proof.reviews` | page-local |
| 13 | SUPPORT | `support.faq` | page-local |
| 14 | CONVERSION | `conversion.cta-block` | page-local |
| 15 | FOOTER | `footer.legal` | page-local |

## Section reference

### SHELL

_Fixed, page-level layers that sit outside the scrolling content: scroller, navigation, overlays, consent._

**`shell.loop-scroller`** — Desktop-only fixed scroller that renders the scrolling content twice (wrap + wrap-clone) and wraps the scroll position for an endless loop, with damped wheel physics and 1600ms easeInOutQuad smooth jumps; disabled on mobile, where the page scrolls natively as a single copy.

· Wraps all scrolling content on the single route at desktop widths. · appears on 1 routes · implemented by `src/components/LoopScroller.jsx`

**`shell.cookie-popup`** — Fixed triangular cookie notice with a single OK button that stores a dismissal flag and unmounts instantly.

· Shown on the single route until dismissed. · appears on 1 routes · implemented by `src/components/CookiePopup.jsx`

**`shell.cursor-trail`** — Dotted SVG path following the last 200ms of pointer movement, fading out when idle.

· Desktop widths with a fine pointer only. · appears on 1 routes · implemented by `src/components/CursorTrail.jsx`

**`shell.mobile-menu`** — Fixed top menu bar with a black full-screen overlay that slides down (0.35s) listing the section anchors.

· Mobile widths only (below the desktop breakpoint); replaces the sidebar. · appears on 1 routes · implemented by `src/components/MobileMenu.jsx`

**`shell.sidebar`** — Fixed left dotted-frame column with logo, tagline, Start Now button and five section links whose active state follows scroll position.

· Desktop widths only; hidden on mobile where the mobile menu takes over. · appears on 1 routes · implemented by `src/components/Sidebar.jsx`

### HERO

_First-screen brand statement and primary call to action._

**`hero.ticket`** — Fixed desktop 'ticket' card holding the headline; scroll-linked scissors/zipper cut along a dotted line, then the ticket flies up-right rotating to -12deg and hides, revealing the content behind it.

· Desktop widths on the single route; a spacer slide in the scrolling content reserves its scroll distance. · appears on 1 routes · implemented by `src/components/HeroSlide.jsx`

**`hero.mobile`** — Static-flow mobile hero inside animated dotted ovals (6s loop) with tagline and CTA.

· Mobile widths only; the ticket is not used there. · appears on 1 routes · implemented by `src/components/MobileHero.jsx`

### PRODUCT

_Blocks that show what the product does: the interactive demo and feature explanations._

**`product.demo`** — Interactive team-workload calendar: person rows by day columns, editable task chips with hours, drag between cells, Days/Weeks toggle, period arrows, and autonomous bot cursors that edit the schedule.

· Single route, all widths (scaled frame on mobile). · appears on 1 routes · implemented by `src/components/AppDemo.jsx`

**`product.features`** — Three stacked feature cards alternating text and illustration sides, each labelled with an 'n of 3' counter (not a carousel).

· Single route, all widths. · appears on 1 routes · implemented by `src/components/Features.jsx`

### CONVERSION

_Pricing, contact and closing call-to-action blocks._

**`conversion.price-card`** — Black pricing card with typewritten plan title, staggered price/benefit lines and a Start Now button.

· Single route, left half of the price row on desktop. · appears on 1 routes · implemented by `src/components/Price.jsx > price card`

**`conversion.contact-card`** — Beige 'get in touch' card with a short prompt and three contact-channel buttons.

· Single route, right half of the price row on desktop, stacked below on mobile. · appears on 1 routes · implemented by `src/components/Price.jsx > contact card`

**`conversion.cta-block`** — Lime closing block with a Start Now button and a rotating wheel of sprite-animated fish driven by time and scroll direction.

· Single route, all widths; contains the footer row. · appears on 1 routes · implemented by `src/components/CtaFooter.jsx > FishWheel`

### PROOF

_Social proof from users._

**`proof.reviews`** — Testimonials inside a dotted ellipse with Prev / counter / Next controls that swap slides instantly and drag/swipe via a carousel.

· Single route, all widths. · appears on 1 routes · implemented by `src/components/Reviews.jsx`

### SUPPORT

_Answers to common questions._

**`support.faq`** — Single-open accordion of questions, first item open on load, instant open/close with no height animation.

· Single route, all widths. · appears on 1 routes · implemented by `src/components/Faq.jsx`

### FOOTER

_Legal links and copyright._

**`footer.legal`** — Copyright line and legal links row pinned to the bottom of the lime CTA block.

· Single route, inside the CTA block. · appears on 1 routes · implemented by `src/components/CtaFooter.jsx`
