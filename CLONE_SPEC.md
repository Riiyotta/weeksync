Source: https://weeksync.app/

# WeekSync landing page: clone build spec

Measured 2026-10-26 with Playwright on the live site at 1440x900, 1280x800 and 390x844. Values come from computed styles, the compiled CSS (`_reference/original_files/71b28bf756a1fd0e.css`, `b18950e5cb669db8.css`) and the live page JS chunk (`/_next/static/chunks/app/page-52680d2de05f6f30.js`, which is not in `_reference/`). Target stack: React 18 + Vite + Tailwind v3.

Only one route is covered: `/` (single landing page). Footer links go to `/terms-and-conditions/`, `/privacy-policy/`, `/terms-of-use/` and `/refund-policy/`; those pages were not measured. Their CSS exists (`legalPage_*`) if they are needed later.

---

## 0. Read this first: architecture and the "repeated calendar"

### 0.1 Why the calendar (and everything else) appears twice
On desktop (viewport >= 1024px) the page has **no native scroll**. `body.landing-page { overflow:hidden }` and `html/body` have height 0. All scrolling content sits inside an **infinite loop scroller**:

```
div.LoopScrollContainer_root   position:fixed; inset:0; height:100vh; overflow:hidden
  div[data-loop-scroll="container"]  position:absolute; top:0; width:100%; will-change:transform; transform:translate3d(0,<pos>px,0)
    div[data-loop-scroll="wrap"]        <- page content (height H = 7504px at 1440x900, 6671px at 1280x800)
    div[data-loop-scroll="wrap-clone"]  <- exact DOM duplicate of the wrap
```

The duplicate (demo calendar, features, price, reviews, FAQ, CTA) is the **loop clone**. It lets scrolling past the bottom wrap seamlessly back to the top. It is not a mobile variant and not a sticky element. Any React state shared by both copies uses a module-level store, so the copies stay in sync: demo data, Days/Weeks view, the open FAQ item. Only the embla reviews carousel keeps its own state per copy.

On mobile (<= 1023px) the loop scroller is **not started**. The root becomes `position:relative; height:auto; overflow:visible` and the page scrolls natively. The clone is not rendered on mobile (only one `page_wrapper` is in the DOM at 390px).

### 0.2 Fixed layers on desktop (z-order, back to front)
| Layer | Position | z-index |
|---|---|---|
| Loop scroller (sections) | fixed, full viewport | auto |
| Sidebar (logo, tagline, CTA, nav) | fixed left, `width:371rem; height:100vh` | 1000 |
| Hero "ticket" slide | fixed right, `width:calc(100% - 367.2rem); height:100vh` | 1002 |
| Cookie popup (triangle) | fixed bottom-right | 9999 |
| Cursor trail SVG | fixed full viewport, pointer-events none | 2147483647 |

### 0.3 Unit system (essential for pixel-matching)
```
html, body { font-size: calc(1vw / 14.4); }                     /* >= 1024px: 1rem = 1px at 1440 wide */
@media (max-width:1023px) and (min-width:480px) { html,body { font-size:1px } }
@media (max-width:479px) { html,body { font-size: calc(1vw / 3.6); } }  /* 1rem = 1px at 360 wide */
```
All landing CSS is written in `rem` and `em`, where **1rem = 1 design-px**. Text sizes use `em`, but the parent font-size is also 1rem, so `em` = `rem` in practice. Results:
- 1440: 1rem = 1px. 1280: 1rem = 0.8889px, so every measurement scales by exactly 0.8889 (verified: h1 42.624px becomes 37.888px, sidebar 371px becomes 329.8px). 390: 1rem = 1.0833px.
- **Tailwind caution:** with this root size the default Tailwind scale breaks (`p-4` = 4px at 1440 and about 3.6px at 1280). Either use arbitrary values (`p-[24rem]`, `text-[19.4rem]`) or override `theme.spacing`/`fontSize` with rem-as-px tokens. Do not use `px` for layout values, or the 1280 and 390 scaling is lost. Exceptions that the original keeps in raw px: 1px borders, `--border-radius-*` (15/10/5px), the demo cell `1px` borders, the mobile menu gaps (24px/32px/16px), FishVideo wrapper gap 12px.

All values below are in **rem (= px at 1440)** unless marked px.

### 0.4 Breakpoints
- `>= 1024px`: desktop layout (sidebar + hero ticket + loop scroller). JS uses `mobileBreakpoint = 1023` (`max-width:1023px` media queries; loop scroller enabled when `innerWidth >= 1024`).
- `480–1023px`: mobile layout, `1rem = 1px`.
- `<= 479px`: mobile layout, fluid `1rem = 1vw/3.6`.
- Content column on mobile: `width:360rem; margin:0 auto` (`page_wrapperContent`, hero and mobile hero root).

---

## 1. Global design tokens

### 1.1 CSS variables (copy verbatim into `:root`)
```
--landing-color-black:#000; --landing-color-white:#fff;
--landing-color-beige:#f9f7f3;   /* cards */
--landing-color-accent:#dfe296;  /* lime cards / CTA */
--landing-color-gray:#cec9c0;    /* page background */
--landing-border-radius:33.12rem;
--landing-padding-base:24.99984rem;
--landing-padding-section:15rem;
--landing-gap-base:15rem;
--landing-border-dotted:4.032rem dotted #000;          /* desktop dotted frames */
--landing-mobile-border-dotted:3.5rem dotted #000;
--border-radius-big:15px; --border-radius-medium:10px; --border-radius-small:5px;
--black:#222222;
--sand-100:#f9f7f3; --sand-200:#efede7; --sand-300:#e5e1d9; --sand-400:#cec9c0; --sand-500:#b8b2a6; --sand-600:#969490; --sand-700:#757471;
--gray-500:#80868b; --gray-600:#535353; --gray-700:#333333;
--red-300:#f9a8a8; --red-500:#e77d5f; --red-700:#c15051;
--orange-300:#ffca9e; --orange-500:#eaa165; --orange-700:#e77d5f;
--green-200:#80e1c2;
```
(The CSS also defines `--workload-*` and `--stage-*` palettes, which are unused on the landing page.)

### 1.2 Colors as used
| Role | Value |
|---|---|
| Page background (`page_globalWrapper`, `page_wrapper`) | `#cec9c0` (rgb 206,201,192) |
| `body.landing-page` background (shows behind on overscroll) | `#d2d2d2` |
| Default body text color | `#535353` (gray-600) |
| Landing text (all headings/paragraphs/buttons) | `#000` |
| Light text on black card | `#fff` |
| Beige card / demo frame | `#f9f7f3` |
| Accent card / CTA block | `#dfe296` |
| Price card | `#000` |
| Demo cell box | `#efede7` (sand-200) |
| Demo column underline | `#cec9c0`; current column `#333333` |
| Demo muted text (totals, summary, "Empty") | `#b8b2a6` (sand-500) |
| Demo over-capacity text | `#e77d5f` (red-500); 1h over `#eaa165` (orange-500) |
| Demo control pills | bg `#333333`, text `#f9f7f3`; hover bg `#535353`; active view `color-mix(in srgb,#333 78%,#f9f7f3 22%)` = computed `color(srgb .3708 .3691 .3656)`, about `#5e5e5d` |
| Remove-x icon | `#969490`; hover `#333333` |
| Mobile menu overlay | `#000000`; items `#fff` |

### 1.3 Typography
Fonts (Google Fonts):
- **Inter** variable 100–900 (used weights: 500 for hero and demo; 400 default). Stack: `Inter, "Inter Fallback", sans-serif`. Next's fallback: `@font-face{font-family:"Inter Fallback";src:local("Arial");ascent-override:90.44%;descent-override:22.52%;line-gap-override:0%;size-adjust:107.12%}`.
- **Red Hat Mono**. Loaded faces: 500, 600 normal plus 500, 600 italic (as served by next/font). Computed weights in use are **400** and **600**. The 400 renders with the nearest available face, and *italic* is used on hover/active states. Load `ital,wght@0,400;0,500;0,600;1,400;1,500;1,600` from Google Fonts to be safe. Stack: `"Red Hat Mono", "Red Hat Mono Fallback", monospace`. Fallback: `local("Arial"); ascent-override:75.64%; descent-override:22.66%; line-gap-override:0%; size-adjust:134.59%`.
- `-webkit-font-smoothing: antialiased` on body and all landing text.

Text roles (desktop rem values; px at 1440 shown; mobile values in the last column):

| Role (original class) | Family | Size | Weight | Line-height | Letter-spacing | Mobile (<=1023) |
|---|---|---|---|---|---|---|
| Hero h1 `landing_heroText` | Inter | 42.624 | 500 | 110% (46.886) | -0.05em (-2.131) | 27rem, lh 115%, ls -0.05em, centered |
| Title / big paragraph `landing_title`/`landing_bigParagraph` | Red Hat Mono | 19.4 | 600 | 122% (23.668) | -0.03em (-0.582) | 16rem (17.33px at 390) |
| Paragraph / label `landing_paragraph` | Red Hat Mono | 12 | 400 | 132% (15.84) | 0.03em (0.36) | 9rem, lh 132% |
| CTA button text `{ Start Now }` | Red Hat Mono | 12 | 600 | 132% | 0.03em | 9rem |
| Sidebar nav button | Red Hat Mono | 12 | 600 | 132% | 0.03em | n/a (hidden) |
| Sidebar header title (class exists, unused) | Red Hat Mono | 12 | 400 | 132% | 0.432em | n/a |
| Mobile menu bar buttons ("menu", "start now") | Red Hat Mono | 16em (17.33px at 390) | 400 italic | normal | normal | dotted underline, thickness .11em, offset .3em |
| Mobile menu overlay item | inherits Inter | 27em (29.25px at 390) | 400 italic | normal | normal | #fff |
| Demo `pMedium` (Days header dates) | Inter | 16 | 500 | 135% (21.6) | normal | (scaled via transform) |
| Demo `pNormal` (names, entries, hours, period, view buttons, Weeks header) | Inter | 12 | 500 | 135% (16.2) | normal | |
| Demo `pSmall` (totals, "Summary:", cursor name tags, project list) | Inter | 10 | 500 | 135% (13.5) | normal | |

Text decoration tokens (used on hover/active): `text-decoration: underline; text-decoration-thickness: .11em; text-underline-offset: .3em;` (FAQ at 1440: 2.134px thick, 5.82px offset; footer links: 1.32px thick, 3.6px offset).

### 1.4 Shared components

**CtaButton** (`{ Label }`): a flex row of three `<p>`: `{`, label, `}`. `display:flex; align-items:center; justify-content:center; gap:7.2rem; white-space:nowrap; transition:all .2s ease; cursor:pointer`. Font is Red Hat Mono 600 12rem (9rem mobile), ls .03em, lh 132%, black. Each brace is `position:relative; top:-.1em` (raised by about 1.2px). Measured 97.55 x 15.84 for "Start Now". **Hover:** `gap:14.4rem` (the braces spread apart, animated .2s ease). Focus-visible: `outline:2px solid #000; outline-offset:2px`. Light variant: text and braces `#fff`. Rendered as `<a href="/login">` or `<button>`.

**Dotted frames:** `border: 4.032rem dotted #000` (computes to 4px at 1440, 3.5px at 1280). Mobile: `3.5rem dotted`.

**Dotted SVG stroke** (cookie triangle, cursor trail): `stroke:#000; stroke-linecap:round; stroke-dasharray:.1 2.3` (cookie, in a 0–100 viewBox, stroke-width 1.15) or `.1rem 8rem` with width 3.9rem (trail). Safari override: `stroke-linecap:square` inside `@supports (-webkit-hyphens:none)`.

**Custom scrollbar** (visible on mobile/native scroll): `::-webkit-scrollbar{width:14px;height:14px}`, track transparent with radius 10px, thumb `#cec9c0` with radius 10px and `border:2px solid #efede7`, thumb hover `#b8b2a6`.

**TypewriterText:** see Motion section 9.3. It renders `<tag><span class=visible>{typed}</span><span style="opacity:0">{rest}</span></tag>` so the full text always reserves its final layout (no reflow while typing).

---

## 2. Section order and desktop geometry (1440x900)

All sections are inside `page_wrapper { padding-top:15rem; padding-left:371rem; background:#cec9c0 }`. The content column is 1069 wide at x=371. Each section has `padding: 15rem 15rem 0` (`--landing-padding-section`), so cards span x 386–1425 (1039 wide). The gap between stacked sections is 15.

Y offsets within one wrap (wrap height 7504 at 1440x900):

| # | Block | id | y | height | Notes |
|---|---|---|---|---|---|
| a | Hero spacer (empty) | `hero-section` | 15 | `calc(118.75vh + 37.5vw)` = 1609 | Scroll distance during which the fixed hero ticket animates out |
| b | Demo calendar | `demo-section` | 1624 | 645 (15 pad + 630 frame) | |
| c | Features x3 | `features-section` | 2269 | 3 x 501 = 1503 | |
| d | Price + Get in touch | `price-section` | 3772 | 501 | |
| e | Reviews | (inner `reviews-section`) | 4273 | 793 | |
| f | FAQ | `faq-section` | 5065 | 935 (first item open) | Height changes with the open item; the loop scroller re-measures on `loopscroll:contentResize` |
| g | CTA + footer | n/a | 6000 | 870 | |
| h | Tail spacer | n/a | 6870 | `calc(22.5vh + 30vw)` = 635 | Gap before the loop wraps to the hero again |

Spacer formula used by the original: `height: calc(heightVw/2 vw + heightVh/4 vh)`. Hero: (75, 475). Tail: (60, 90). Both are 0 on mobile.

---

## 3. Sidebar (desktop only, `display:none` <= 1023)

- `position:fixed; top:0; left:0; width:371rem; height:100vh; padding:15rem 0 15rem 15rem; z-index:1000`.
- Inner frame `sidebarWrapper`: 356 x 870, `border:4.032rem dotted #000` on all four sides, `border-radius:33.12rem 0 0 33.12rem`, `display:flex; flex-direction:column; justify-content:space-between; align-items:center; padding:43.2rem 0`.
- **Header** (`padding:0 72rem`, column, centered), top at y=62:
  - Logo button: inline SVG 33.12 x 25.92 (viewBox 34x26), black fill. It is a "W" wordmark built from rounded vertical bars. **Do not copy; use a placeholder mark of the same box.** Click scrolls to `hero-section`. Focus-visible: `outline:2px solid #000; outline-offset:4px`.
  - Tagline wrapper `padding:28.8rem 0 17.28rem`. `<p class=paragraph center>`: 34-char tagline that wraps to 2 lines in a 204-wide box (the box is 348 - 2x72).
  - CtaButton "Start Now", `href=/login`.
- **Nav panel** (bottom of frame, y 535–838): column, `gap:28.8rem`, centered. Five items: **Try It -> demo-section, Problems It Solves -> features-section, Pricing -> price-section, Reviews -> reviews-section, FAQ -> faq-section**.
  - Item: circle `14.4 x 14.4; border:1.584rem solid #000; border-radius:50%; margin:0 auto 7.2rem; background:transparent`, then label (Red Hat Mono 600 12rem). Item height 37.44.
  - **Hover** and **active**: label `font-style:italic; text-decoration:underline (.11em, offset .3em)`; circle `background:#000`. No transition is declared (instant).
  - **Active section logic** (runs on each scroll-progress event): take all elements with the section ids (both copies). If one spans the line at `0.33 * innerHeight`, it is active. Otherwise the active one is the element with the greatest `top` still above that line. If none qualifies, nothing is active (the hero area shows no active item).
  - Click: smooth-scroll to the section (see 9.1, `loopscroll:scrollTo`, 1600ms easeInOutQuad when `smooth:true`; sidebar clicks pass `smooth` undefined, which is an **instant jump**; only the scissors button uses smooth).

---

## 4. Hero (fixed "ticket")

### 4.1 Desktop geometry
- `heroSlide_wrapper`: `position:fixed; top:0; right:0; width:calc(100% - 367.2rem); height:100vh; padding:15rem 15rem 15rem 0; z-index:1002; pointer-events:none`. At 1440 it spans x 367.2 to 1440, 1072.8 wide.
- `ticket`: fills the wrapper (1057.8 x 870 at x 367.2, y 15). `border:4.032rem dotted #000; border-radius:0 33.12rem 33.12rem 0`. Its left border sits on top of the sidebar's right border (overlap of about 3.8). Together they read as one rounded "ticket" with a perforation line.
- `scissorsFilledLine`: `position:absolute; top:0; left:-23.76rem; width:43.2rem; background:#cec9c0`, height set inline (see 4.3). It covers the perforation so the ticket looks uncut.
- Hero content `heroContent_wrapper`: `padding:30.24rem 72rem 30.24rem 30.24rem; pointer-events:auto`. H1 (role "Hero h1", black) starts at x 401.4, y 49.2, 947.6 wide. **166 chars / 27 words, 4 lines at 1440 and 1280** (187.5 tall at 1440). The text is typewritten (speed fast, 15ms/char).
- The rest of the ticket is empty (page-bg color shows through: the ticket has no background).

### 4.2 Scissors icon
- Container `scissors_iconContainer`: `position:absolute; left:-23.76rem; top:-57.6rem; 43.2 x 43.2`; inline `transform: translateY(calc(T*100vh - T*2vw)); opacity:O`.
- Two blade SVGs (each `width:38%; height:100%`, viewBox 0 0 14 42, black). Each blade is a vertical 2-unit bar with a ring (r 6, stroke 2) at the bottom: the classic scissors outline split into left and right halves. Left blade `right:15%`, right blade `left:15%`, both `transform-origin:50% 70%`, rotated `-20*f` and `+20*f` deg. Redraw as simple original SVG.
- Blades get `transition: transform .25s ease-out` only while hovered (and for 250ms after leaving).
- The icon is a `<button aria-label="Go to the next section">`. Click smooth-scrolls to `features-section`.
- An alternate "zipper pull" icon (CSS `zipperPull_*`: a 50% box with `border:2.16rem solid #000; border-radius:7.2rem; bg #cec9c0`, plus cap and handle that rotate toward the mouse) replaces the scissors only while scrolling *backwards* into the hero (progress window .30–.49). Optional to clone.

### 4.3 Hero scroll animation (exact formulas)
The loop scroller emits `cycleProgress = progress / wrapHeight` (progress is negative when scrolling down). With `distance = 0.2` the hero component derives `ap` (animation progress):
```
n = 1 - ((c % 1) + 1) % 1          // scrolling down from the top: n = |scrolled| / H
ap = n in [0.8,1]  -> (n-0.8)/0.2/2         (0 -> 0.5, approaching from the loop end)
     n in [0,0.2]  -> n/0.2/2 + 0.5         (0.5 -> 1, scrolling down away from the hero)
     otherwise     -> 0
```
At page load ap = 0.5 (resting). Steps: step1 .3, step2 .3, step3 .45, step4 .55, step5 .7, step6 .7.

**Ticket transform** (`t`):
```
t = ap<=.3 ? ap/.3*.5 : ap>=.7 ? .5 + .5*(ap-.7)/.3 : .5
rotate = (.5 - t) * 24 deg
tx = 2*|t-.5| * 0.20 * innerWidth px
ty = (.5 - t) * 3 * innerHeight px
style: transform: translate(tx px, ty px) rotate(rotate deg) translateZ(0); display: none when t==0 or t==1
```
Scrolling down, the ticket flies **up and right**, rotating to -12° (ty to -1.5 x vh, tx to +0.2 x vw). Approaching from below it rises from +1.5vh at +12°.

**Scissors (and filled line)** with `f = clamp((ap-.3)/.15)` and `v = clamp((ap-.55)/.15)`:
```
T = ap<.3 ? 0 : ap<=.45 ? f : ap<.55 ? 1 : ap<=.7 ? 1-v : 0
icon transform: translateY(calc(T*100vh - T*2vw))
filled line height: calc(T*100% - 2vw)
opacity: 0 outside [.3,.7]; fade in f .10->.15; fade out v .85->.90; else 1
blade snip (ap in [.55,.7]): f_blade = (1 + sin(10 * v * 2π)) / 2  -> 10 open/close cycles; angle ±20*f_blade deg (f_blade=1 outside the window, 0 while hovered = closed)
```
In pixels at 1440x900 (H = 7504) while scrolling down: 0–150px nothing; **150–600px the scissors travel from the bottom to the top of the perforation, snipping 10 times, and the gray cover line shrinks to reveal the dotted cut line**; 600–1500px the ticket flies away. The demo section enters the viewport at about 1609px.

### 4.4 Mobile hero (<= 1023)
Two stacked blocks replace the sidebar header and the fixed ticket:
1. `mobileHeroSection_root`: `width:360rem; margin:0 auto; padding:80rem 0`. `ovalContainer` 360 x 350, flex centered.
   - `oval`: `height:100%; border:3.5rem dotted #000; border-radius:100%; padding:30rem 0; flex column space-between`, `animation: ovalGrowShrink 6s linear infinite` (width 3% -> 70% -> 3%).
   - Two `smallOval` (top and bottom inside the oval): `height:20rem; border:3.5rem dotted; border-radius:100%`, animation 6s linear infinite (width 0 -> 20rem at 50% -> 0; opacity 0 at 0%/100%, 1 from 25% to 75%).
   - `ovalContent` (absolute inset 0, `padding:0 75rem; gap:24rem; z-index:2`, centered column): logo placeholder 34 x 26rem, tagline paragraph, CtaButton. Animation `ovalContentScaleShrink 6s linear infinite` (scaleX 0 -> 1 at 50% -> 0; opacity 0 at ends, 1 between 25% and 75%).
2. `heroSlide_wrapper` (relative, `width:360rem; margin:0 auto; padding:15rem 15rem 15rem 0`). The ticket has no border. H1 is centered, 27rem (29.25px at 390), lh 115%: **6 lines at 390** (202 tall).
3. Fixed **MobileMenu** bar: `position:fixed; top:0; z-index:1500; padding:20rem; display:flex; justify-content:space-between` (66 tall at 390). Left: `<button>` "menu" (toggles to "close"). Right: `<a href=/login>` "start now". Both use the mobile bar style from the typography table (italic label, dotted underline). When open, the bar text turns `#fff`.
   - Overlay: `position:fixed; inset:0; background:#000; transform:translateY(-100%)`, open `translateY(0)`, `transition: transform .35s cubic-bezier(.22,.61,.36,1)`. The nav is centered as a column, `padding:24px 24px 32px; gap:16px`. Items: same 5 labels, `padding:10rem 0`, white italic 27em (29.25px), each 57 tall at 390, stacked at y 243/316/389/463/536. Tapping an item closes the menu and follows the `#id` anchor.

---

## 5. Demo calendar ("Try It", `#demo-section`)

### 5.1 Container
- Section: `padding:15rem 15rem 0` (desktop); mobile `padding:60rem 0 30rem`.
- `AppDemo_frame`: `width:100%` (1039); `height:630rem; background:#f9f7f3; border-radius:33.12rem; overflow:hidden; color:#535353; user-select:none` (inputs `user-select:text`).
- **Mobile:** `AppDemo_outer { width:calc(100vw - 40rem); margin-left:calc(50% - 50vw + 20rem); aspect-ratio:1039/630; overflow:hidden }`. The frame is fixed at `width:1039rem` and JS sets `transform:scale(outer.clientWidth / frame.offsetWidth)` (0.308 at 390, so 347 x 210 rendered) with `transform-origin:top left`. On mobile it is `pointer-events:none` (view-only), and starts `visibility:hidden` until scaled.

### 5.2 Schedule layout
- `DemoSchedule_scroll`: `height:100%; overflow-y:auto; padding:0 25rem 45rem; scrollbar hidden`. Inner wheel events are stopped from reaching the page scroller unless the inner scroll is at its edge.
- **Sticky header**: `position:sticky; top:0; z-index:50; display:grid; grid-template-columns:repeat(7,minmax(0,1fr)); gap:7rem; margin:0 -25rem 15rem; padding:25rem 35rem 0; background:#f9f7f3`. Height 63.6.
  - Column: `display:flex; justify-content:center; padding:8rem 0; border-bottom:1px solid #cec9c0; white-space:nowrap`. Current column `border-bottom-color:#333`. Column width 132.43.
  - Days view label: `D Mon` ("26 Oct" ... "1 Nov") in pMedium 16. Weeks view label: `D Mon – D Mon` in pNormal 12.
- **Person row**: `padding:0 10rem 15rem`. Head: `display:flex; align-items:baseline; gap:6rem; padding-bottom:10rem`. Name `"<Name> (<Role>)"` pNormal; total `"40h of 40h"` pSmall, sand-500, or red-500 when over capacity.
- Cells grid: `repeat(7,minmax(0,1fr)); gap:7rem; align-items:start`.
- **Cell box**: `padding:7rem; display:flex; flex-direction:column; align-items:center; gap:5rem; background:#efede7; border-radius:10rem`. An empty weekend cell holds only the "+" (box height 28).
- **Entry chip**: `width:100%; display:flex; justify-content:space-between; align-items:flex-start; gap:4rem; padding:8rem; background:#f9f7f3; border:1px solid transparent; border-radius:5rem; transition:border-color .5s ease`. Measured 118.4 x 34.2.
  - Hover (not over the input): `border-color:#cec9c0`. Draggable chips use `cursor:grab` (`grabbing` while active). A chip being carried by a bot cursor gets `opacity:.4`.
  - Name button (pNormal, `padding:0 3rem; margin-left:-3rem; border-radius:5rem; ellipsis; transition: background-color .3s ease`). Hover/focus `background:#efede7`. With no project it shows "Empty" in sand-500. Clicking opens the project list.
  - Hours input (pNormal, centered, `min-width:16rem; padding:0 2rem; border-radius:5rem; width:calc(<chars>ch + 4rem)`). Hover/focus `background:#efede7` (.3s ease). Disabled text `#b8b2a6`.
  - Remove button: 14 x 14 "x" icon (see assets), `padding-top:1rem`, color `#969490`, hover `#333`.
- **Add button**: full width, height 14, color #333. Icon circle 14 x 14 (`border-radius:100rem; transition: background-color .3s ease, transform .3s ease`) holding a 12 x 12 "+" glyph. Hover/focus: `background:#f9f7f3; transform:rotate(90deg)`.
- Drop indicator (while dragging over a cell): `height:2rem; background:#cec9c0; border-radius:5rem`.
- **Summary** under each cell: `min-height:13.5rem; margin-top:7rem`. Text `"Summary: 8 hours"` (pSmall). Color by hours minus capacity: `>=2` red-500, `>=1` orange-500, else sand-500. Hidden when 0.
- **Project dropdown**: `position:absolute; top:calc(100% + 12rem); left:-8rem; width:calc(100% + 44rem); z-index:20; background:#333; border-radius:5rem; box-shadow:0 4rem 20rem rgba(0,0,0,.12)`. It opens upward (`bottom:calc(100% + 12rem)`) if it would overlap the controls. Options: pSmall, `padding:7rem; color:#f9f7f3; border-bottom:1px solid #535353` (none on the last), hover `background:#535353` (.3s), selected `color:#b8b2a6`. Closes on outside pointerdown or Escape.

### 5.3 Controls (bottom-center overlay)
- `position:absolute; left:0; right:0; bottom:20rem; z-index:60; display:flex; justify-content:center; gap:5rem`.
- Pill: `height:30rem; border-radius:100rem; background:#333; color:#f9f7f3; overflow:hidden`.
  - Pagination pill: `width:190rem; padding:0 4rem; justify-content:space-between`. Arrow buttons are 22 x 22, round, holding 12 x 12 chevrons. The period label is centered (pNormal), e.g. "26 Oct – 1 Nov" (Days) or "12 Oct – 29 Nov" (Weeks). Arrows move the period by ±1 week (Days) or ±7 weeks (Weeks).
  - View toggle pill: two buttons, each 60 x 30 (pNormal): **Days** | **Weeks**. Active button background is the color-mix value above. Hover/focus-visible (arrows and buttons): `background:#535353`, `transition: background-color .2s ease`.
- **Days/Weeks toggle** swaps columns instantly (no animation). Days = the 7 dates of the current week (Mon–Sun, current day underlined in #333). Weeks = 7 weeks from current-2 to current+4, with the current week underlined, cells aggregated per project per week, capacity 40h per week and 280h per row.

### 5.4 Seed data (fictional demo content; fine to keep or rename)
Projects: Website, Logo, iOS app, Launch, Ads, Internal. People: Mia Chen (Designer), Leo Novak (Developer), Sofia Reyes (Manager). Capacity 8h per weekday, 0 on weekends. Dates are **relative to the visitor's current Monday** (week offsets below; hours Mon..Fri):
```
-2: mia website[8,8,8,8,8]; leo iosApp[8,8,8,8,8]; sofia launch[8,8,8,0,0]; sofia internal[0,0,0,8,8]
-1: mia website[8,8,0,0,0]; mia logo[0,0,8,8,8]; leo iosApp[8,8,8,8,0]; leo website[0,0,0,0,8]; sofia launch[6,8,6,8,8]; sofia ads[2,0,2,0,0]
 0: mia website[8,6,0,0,2]; mia logo[0,2,8,8,6]; leo iosApp[8,8,0,2,8]; leo website[0,0,8,6,0]; sofia launch[6,0,8,8,0]; sofia ads[2,8,0,0,8]
+1: mia logo[8,8,8,0,0]; leo iosApp[8,8,8,8,8]; sofia launch[6,6,6,6,0]
+2: mia website[8,8,0,0,0]; leo iosApp[8,8,8,0,0]; sofia launch[4,4,0,0,0]
+3: leo launch[8,8,0,0,0]; sofia internal[4,0,0,0,0]
+4: mia logo[4,0,0,0,0]
```

### 5.5 Autoplay "bot cursors"
When the demo frame is >= 30% visible (IntersectionObserver thresholds [0,.3,.6,1]) and the user does not prefer reduced motion, three fake cursors appear, named with each person's first name (Mia, Leo, Sofia). They start with staggered delays of 600 / 1200 / 1800ms and keep editing the schedule: swap two chips (45%), change a chip's project (20%), split hours (15%), merge chips (10%), move 2h between chips (10%), or fill a day back to 8h. All edits keep each day at capacity. They pause for 2.5s after any user pointerdown/keydown/dragstart in the demo. They disappear (and reset) when the frame drops below 30% visibility.
- Layer: `position:absolute; inset:0; z-index:100; pointer-events:none; overflow:hidden; border-radius:inherit`.
- Cursor: `color:#333; will-change:transform; animation: appear .4s ease both` (opacity 0 -> 1). Positioned with `transform:translate3d(x rem, y rem, 0)`.
- Pointer: 12 x 12 arrow SVG (path `M1.5 1.5 L10.5 5 L5 10.5 Z`, fill and stroke currentColor, stroke-width 1.5, round join), `margin:-1.5rem 0 0 -1.5rem; transform-origin:1.5rem 1.5rem; transition: transform .12s ease`. Pressed state `scale(.8)`.
- Name tag: `position:absolute; top:10rem; left:9rem; padding:1rem 6rem; border-radius:999rem; background:#333; color:#f9f7f3`, pSmall.
- Carried chip ghost: `top:6rem; left:6rem; width:112rem; padding:8rem; background:#f9f7f3; border:1px solid #cec9c0; border-radius:5rem; box-shadow:0 6rem 16rem rgba(0,0,0,.08); transform:rotate(-2deg)`, showing the project name and hours.
- Movement: cubic Bezier paths with a random perpendicular bow (4–16% of distance) and smootherstep easing `c^3(10 - 15c + 6c^2)`. Duration `(200 + 120*log2(1 + dist/14)) * rand(.85,1.15)` ms. 50% of long moves (>160) overshoot by 3–9 and then settle in 130–220ms. Idle jitter is ±6 x ±4 over 600–1200ms. Waits between actions are 700–1800ms. Press hold is 90–150ms, pre-press 120–300ms, post-release 150–350ms, and drag moves are 1.35x slower.

---

## 6. Features (`#features-section`): three stacked cards (not a carousel)

Each `FeatureCard_wrapper`: `padding:15rem 15rem 0; display:grid; grid-template-columns:1fr 1fr; gap:15rem`, so two 512 x 486 cards. Cards alternate: card 1 is text-left/image-right, card 2 is image-left/text-right, card 3 is text-left/image-right.
- Text card `leftSide`: `background:#f9f7f3; border-radius:33.12rem; height:486rem; padding:24.99984rem 72rem; display:flex; flex-direction:column; justify-content:center; align-items:center; gap:37.44rem`.
  - Big paragraph (role "Big paragraph", centered, black): card 1 is **88 chars**, card 2 **86**, card 3 **87**. Each is **3 lines** in a 368-wide box at 1440 (71 tall). Typewriter speed normal (30ms/char).
  - Counter `h2` "1 of 3" / "2 of 3" / "3 of 3" (paragraph role, centered). Typewriter slow (50ms/char), delay 200ms.
- Image card `rightSide`: `background:#dfe296; border-radius:33.12rem; height:486rem; padding:24.99984rem`, flex centered. `<img loading="lazy" style="width:100%;height:100%;object-fit:contain">` renders at 462 x 436 (the image itself is 1058 x 668, so it letterboxes to about 462 x 292 inside the box).
  - Image mapping: card 1 uses `/features/features-img-1-2.png`, card 2 uses `features-img-1-1.png`, card 3 uses `features-img-1-3.png`. All are black hand-drawn line illustrations (cartoon crowds) on a transparent background. **Replace with original placeholders, 1058 x 668 aspect.**
- **Mobile:** wrapper becomes `display:flex; flex-direction:column; gap:0` with padding 15rem 15rem 0. Both sides have `height:auto; background:transparent; padding:10rem; gap:20rem`. The image always comes first (`order:1`), then the text (`order:2`). At 390 the image is 336 x 212 and the text block 358 x 120. The big paragraph is 16rem, 3 lines.

---

## 7. Price and contact (`#price-section`)

Wrapper same as features (grid 1fr 1fr, gap 15, padding 15 15 0); cards are 512 x 486.
- **Left "Plan" card**: `background:#000; border-radius:33.12rem; height:486rem; padding:24.99984rem; display:flex; flex-direction:column; justify-content:space-between; align-items:center`.
  - `h2` "Plan" (paragraph role, #fff, centered), typewriter slow.
  - Features list: `display:flex; flex-direction:column; gap:15rem`. Four big-paragraph lines (#fff, centered, single line each at 1440) of **35 / 26 / 18 / 33 chars**. They cover the trial, price per user, unlimited projects, and direct developer contact. Typewriter fast with delays 300 / 600 / 900 / 1200ms (staggered).
  - CtaButton light "Start Now" -> /login.
- **Right "Get in touch" card**: `background:#f9f7f3; padding:24.99984rem 72rem`, other properties as the left card.
  - `h2` "Get in touch" (paragraph, centered), typewriter normal.
  - Big paragraph, **77 chars, 3 lines** in 368 wide, typewriter fast, delay 400ms.
  - Buttons row `display:flex; gap:43.2rem`: CtaButtons **Telegram** (`https://t.me/...`), **X-Twitter** (`https://x.com/...`), **Email** (`mailto:`). All use `target=_blank rel="noopener noreferrer"`. Use your own links.
- **Mobile:** `flex-direction:column; gap:10rem`. Each card `height:370rem; padding-left/right:30rem` (padding-top/bottom stays 25rem). The button row gap becomes 13rem. At 390 some list lines wrap to 2 lines.

---

## 8. Reviews (testimonials carousel)

- `section.Reviews_root`: `width:100%; padding:100.8rem 0; display:flex; justify-content:center; align-items:center; user-select:none`. The inner `#reviews-section` wrapper has `padding-top:15rem`.
- **Ellipse frame**: `width:864rem; height:576rem; border:4.032rem dotted #000; border-radius:50%; overflow:hidden; position:relative; display:flex; flex-direction:column; align-items:center; justify-content:space-between`.
- Embla viewport and container fill the ellipse (`display:flex; height:100%`). Slide `flex:0 0 100%`.
- Card: `height:100%; padding:34.56rem 100.8rem; flex column centered; text-align:center; cursor:grab`.
  - Header (`position:absolute; top:34.56rem; left:0; right:0`): name (paragraph role) and role line (paragraph role), both centered, stacked at 15.84 line height.
  - Body: `display:flex; flex-direction:column; max-width:92%` (602 wide); `gap:11.52rem`. Big paragraphs, centered.
    - Review 1: 3 paragraphs of **70 / 182 / 108 chars** (2 / 4 / 2 lines at 1440).
    - Review 2: 1 paragraph of **399 chars** (8 lines at 1440).
  - Header text lengths: review 1 name 12 / role 32; review 2 name 13 / role 35.
- Controls: `position:absolute; bottom:34.56rem; left:0; right:0; display:flex; justify-content:center; align-items:center; gap:34.56rem; z-index:2`. `{ Prev }` button, counter `"1 of 2"` (paragraph role), `{ Next }` button.
- **Behaviour:** embla-carousel with `{loop:true}`, so dragging/swiping works with embla's default physics (duration 25). Prev/Next call `scrollPrev(true)` / `scrollNext(true)`, which is a **jump**: measured as an instant swap with no tween (translate goes straight from 0 to -856). Counter updates on `select`. Pressing Next on the last slide wraps to the first.
- SEO: a visually-hidden div (`position:absolute; width:1px; height:1px; clip:rect(0,0,0,0); overflow:hidden`) repeats both reviews as `<article><h3/><p/>...`.
- **Mobile:** root `padding:60rem 0 30rem`. Ellipse becomes `width:100%; height:auto; border:none; border-radius:0`. Card padding 0. Header becomes `position:relative; top:0; padding-bottom:25rem`. Controls become `position:relative; bottom:0; padding-top:25rem`.

---

## 9. FAQ (`#faq-section`)

- Wrapper: `padding:15rem 15rem 100.8rem; display:flex; flex-direction:column; align-items:center; gap:34.56rem; user-select:none`.
- Title `h2` "FAQ" (paragraph role, centered), typewriter slow.
- List: `width:100%; max-width:864rem; list-style:none`. 10 items.
- Question button: `width:100%; display:flex; align-items:flex-start; gap:14.4rem; padding:21.6rem 0; text-align:left; color:#000; background:none; border:0`. Closed item height 66.86.
  - Circle: `14.4 x 14.4; margin-top:4.7rem; border:1.584rem solid currentColor; border-radius:50%; transition: background-color .2s ease`.
  - Question text: big paragraph role.
  - **Hover and open state:** text `font-style:italic; text-decoration:underline; thickness .11em; offset .3em`; circle `background:currentColor`. On mobile, hover styles are disabled; only the open item gets them.
  - Focus-visible: `outline:2px solid #000; outline-offset:2px; border-radius:4rem`.
- Answer: `padding-left:28.8rem; padding-bottom:28.8rem`; `[hidden]{display:none}`. **Opens and closes instantly, with no height animation.** Body `display:flex; flex-direction:column; align-items:flex-start; gap:11.52rem`. Paragraphs use the big paragraph role. Lists: `list-style:none; gap:5.76rem`, each `li::before{content:"— "}`.
- **Accordion behaviour:** single-open. **Item 1 is open on load.** Clicking the open item closes it (all closed is allowed). The state is shared between the loop copies. After toggling, it dispatches `loopscroll:contentResize` so the loop scroller re-measures the wrap height.
- Question lengths (chars): 17, 45, 20, 55, 22, 40, 37, 25, 25, 38. Answer structure (chars):
  1. p 157 (3 lines at 835 wide)
  2. p 260
  3. p 144
  4. p 100, list [15, 13, 19, 26], p 126
  5. p 169, p 109
  6. p 158
  7. p 180, list [58, 63, 99, 77]
  8. p 98
  9. p 145
  10. p 126
- **Mobile:** wrapper `padding:30rem 15rem; gap:20rem; scroll-margin-top:60rem`. Button `gap:10rem; padding:14rem 0`. Circle `12 x 12; border-width:1.5rem`. Answer `padding-left:22rem; padding-bottom:20rem`. Body gap 10rem.

---

## 10. CTA block and footer

- Wrapper: `padding:0 15rem`.
- Container: `height:calc(100vh - 29.999952rem)` (870 at 900 tall); `background:#dfe296; border-radius:33.12rem; padding:24.99984rem; display:flex; flex-direction:column; align-items:center; justify-content:space-between; position:relative`.
- Center: `ctaButtonWrapper` (absolute, full size, flex centered, `pointer-events:none`) holds the **fish wheel** plus `ctaAction` (`position:relative; z-index:1; pointer-events:auto`) with CtaButton "Start Now" -> /login, centered.
- **Fish wheel** (`Wheel_mainContainer`): `position:absolute; inset:0; overflow:hidden; pointer-events:none; mix-blend-mode:multiply`. It holds four sprite instances in a cross. Wrapper 1 is a column (top and bottom fish, the second rotated 180°); wrapper 2 is a row (fish rotated 270° and 90°). Gap `216rem` (95rem mobile). Each sprite: `height:25vh; aspect-ratio:1/1` (225 at 900 tall; `10vh` on mobile). The whole cross rotates. See 11.5 for motion. **Fish artwork: do not copy; use a placeholder.**
- Footer row (`order:2; z-index:2; width:100%; display:flex; justify-content:space-between; align-items:center`) at the bottom inside the padding:
  - Left: copyright line, paragraph role, 41 chars.
  - Right: `display:flex; gap:7.2rem` with 4 links (paragraph role, `underline; thickness .11em; offset .3em; transition: text-decoration .2s ease`). **Hover: underline removed.** Labels: Terms & Conditions, Privacy Policy, Terms of Use, Refund Policy.
- **Mobile:** container `background:transparent; height:auto; gap:20rem`. `ctaButtonWrapper` becomes `position:relative; aspect-ratio:1/1; background:#dfe296; border-radius:33.12rem` (303 square at 390). Footer becomes a centered column `gap:10rem`, and links wrap (each link box is 26 tall at 390).

---

## 11. Cookie banner (triangle)

- Shown when `localStorage.weeksync_cookie_consent !== "true"`. "OK" sets it to "true" and unmounts the banner (no exit animation).
- Wrapper: `position:fixed; bottom:0; right:0; z-index:9999; padding:40rem; pointer-events:none`.
- Triangle box `316.8 x 316.8`. Background is an inline SVG `viewBox 0 0 100 100`, path `M89.183 4.887C91.74 2.33 96.113 4.141 96.113 7.757V92.054C96.113 94.295 94.295 96.113 92.054 96.113H7.757C4.141 96.113 2.33 91.74 4.887 89.183L89.183 4.887Z` (a right triangle with rounded corners, right angle at bottom-right). Styles: `fill:#cec9c0; stroke:#000; stroke-width:1.15; stroke-linecap:round; stroke-dasharray:.1 2.3`, giving a dotted outline. This is a simple geometric shape, fine to reuse.
- Content: `position:absolute; inset:0; transform:rotate(-45deg); display:flex; flex-direction:column; justify-content:space-between; align-items:center; padding:172.8rem 43.2rem 0`. Text `h1` (paragraph role, centered) is 100 chars, 4 lines, typewriter fast. Below it is a `{ OK }` CtaButton (`pointer-events:auto`).
- **Mobile:** triangle `250 x 250rem`; content padding `125rem 20rem 0`; wrapper padding `14rem`.

---

## 12. Motion summary

### 12.1 Loop scroller (desktop >= 1024 only)
- Inputs: `wheel` on window (`velocity += -deltaY * speedFactor`), touch (direct position follow, each step clamped to ±50px, with fling from the last 10 samples), and custom events `loopscroll:scrollTo {progressPx, smooth}` / `loopscroll:contentResize`.
- Each rAF: `pos += velocity; velocity *= friction`. Velocity is zeroed below 0.001. Desktop uses `speedFactor .25, friction .55`, so the total travel per wheel delta = .25/(1-.55) = **0.556 x deltaY**, settling within about 10 frames (measured: 1000 deltaY gave 555.5px). Mobile params (unused because mobile is native scroll): `.1 / .92`.
- Wrapping: if `pos < -H` then `pos += H`; if `pos > 0` then `pos -= H`. Render: `container.style.transform = translate3d(0, pos px, 0)`. It re-measures H every 500px of progress and on resize.
- Smooth scrollTo: default **1600ms**, easeInOutQuad `t<.5 ? 2t² : 1 - (-2t+2)²/2`, taking the shortest path around the loop.
- It emits `window` event `loopscroll:progress {progress, cycleProgress}` when progress changes by >= 1px. The sidebar active state, hero ticket, fish wheel and fish sprite frames all subscribe to it.
- React recommendation: implement as a small class or hook with the same constants; render the content twice (`wrap` + `wrap-clone`).

### 12.2 Hero ticket and scissors: see 4.3 (scroll-linked, no CSS transition; recomputed each progress event via rAF).

### 12.3 TypewriterText (entrance animation for most copy)
- Trigger: IntersectionObserver `threshold:0.3`. Entering the view starts typing; leaving **resets the text to empty** (it retypes on every re-entry).
- After `delay` ms, one character is revealed every `speed` ms: **fast 15ms, normal 30ms, slow 50ms**.
- Assignments: hero h1 fast; cookie text fast; FAQ title slow; feature paragraph normal (delay 0) with counter slow (delay 200); "Plan" slow; price lines fast at 300/600/900/1200; "Get in touch" normal; contact paragraph fast at 400. Reviews, FAQ questions/answers, footer, sidebar tagline and all buttons are static (no typewriter).

### 12.4 Hover/interaction transitions (all from CSS)
| Element | Property | Duration and easing |
|---|---|---|
| CtaButton | gap 7.2 to 14.4rem (`transition: all`) | .2s ease |
| Sidebar nav item | italic + underline + circle fill | instant |
| FAQ circle | background-color | .2s ease |
| FAQ question text | italic + underline | instant |
| Footer link | text-decoration removed on hover | .2s ease (declared) |
| Demo entry chip | border-color | .5s ease |
| Demo name / hours / project option | background-color | .3s ease |
| Demo add icon | background-color + rotate(90deg) | .3s ease |
| Demo control arrows / view buttons | background-color | .2s ease |
| Bot cursor appear | opacity 0 to 1 | .4s ease, fill both |
| Bot cursor press | scale(.8) | .12s ease |
| Scissors blades (hover) | transform | .25s ease-out |
| Mobile menu overlay | translateY(-100%) to 0 | .35s cubic-bezier(.22,.61,.36,1) |
| Cursor trail visibility | opacity | .18s ease-out |

### 12.5 Fish wheel and sprite (CTA)
- Sprite: `background-image: <29-frame horizontal strip>; background-size:2900% 100%; image-rendering:crisp-edges; background-position: (frame/28*100)% 0%`.
- Keyframes `swingAndMove 10s ease infinite`: `0% translateY(2rem) rotate(15deg)`, `50% translateY(-2rem) rotate(-15deg)`, `100%` same as 0%.
- Frame scrub: when the scroll direction changes, frames run 0 to 28 (scroll up) or 28 to 0 (scroll down) over **800ms** linearly via rAF.
- Wheel: inner container rotates continuously at **18°/s** (rAF). The direction flips with scroll direction. The outer container rotates `360 * cycleProgress` deg (scroll-linked).

### 12.6 Mobile hero ovals: 6s linear infinite keyframes (see 4.4).

### 12.7 Cursor trail (desktop, `(pointer: fine)` only)
- A full-viewport fixed SVG with one `<path>`. Points come from `pointermove` and are kept for **200ms**. The path is a polyline `M x y L ...`. Style: `fill:none; stroke:#000; stroke-width:3.9rem; stroke-linecap:round; stroke-dasharray:.1rem 8rem` (a dotted trail). The SVG gets the `visible` class (opacity 1) while >= 2 points exist, otherwise opacity 0 (.18s ease-out).

### 12.8 Sound (optional)
On desktop, elements with `data-sound-hover` / `data-sound-click` play `/landing/hover.mp3` (gain .2) and `/landing/click.mp3` (gain .5) through WebAudio after the first user gesture. These were not downloaded or inspected; skip them or use your own sounds.

### 12.9 Not animated
Section entrances have no fade/slide (only the typewriter). There is no parallax besides the hero ticket. There are no CSS transitions on cards.

---

## 13. Assets inventory

| Asset | URL (original) | Natural size / format | Rendered | Role | Clone action |
|---|---|---|---|---|---|
| Feature illustration A | `/features/features-img-1-2.png` | 1058x668 PNG (8-bit colormap), lazy | box 462x436 contain (about 462x292 visible) at 1440; 336x212 at 390 | Feature card 1 image | Original placeholder, same aspect |
| Feature illustration B | `/features/features-img-1-1.png` | 1058x668 PNG | same | Feature card 2 | Placeholder |
| Feature illustration C | `/features/features-img-1-3.png` | 1058x668 PNG | same | Feature card 3 | Placeholder |
| Fish sprite strip | `/29 frames fish sequency.png` | 15660x540 PNG (29 frames of 540x540) | 4 instances, each 25vh square (225 at 900h); 10vh mobile | CTA spinning wheel | Placeholder sprite or a static shape |
| Logo mark | inline SVG (sidebar + mobile hero) | viewBox 34x26 | 33.12x25.92rem (sidebar), 34x26rem (mobile) | Brand mark, button to hero | **Do not copy**; placeholder mark |
| Favicon | `/favicon.ico` (16), `/icon.svg` (64x64), `/apple-icon.png` (180) | | | Tab icons | Own icons |
| OG image | `/opengraph-image.png` | 1200x630 | meta only | Social preview | Own image |
| Sounds | `/landing/hover.mp3`, `/landing/click.mp3` | not fetched | | UI sounds | Optional, own files |

Simple UI icons (redraw as inline SVG, stroke/fill `currentColor`):
- **Chevron left** (demo prev): 12x12 viewBox, path `M7.25 10.5 L2.75 5.9945 L7.25 1.5`, stroke round caps/joins, no fill, stroke-width 1.
- **Chevron right** (demo next): 12x12, `M4.75 1.5 L9.25 6.0055 L4.75 10.5`, same stroke.
- **Plus** (cell add): 12x12, cross from 2.125 to 9.875 on both axes with 0.75 stroke and round ends (filled path).
- **Close x** (remove entry): rendered 14x14, viewBox 12x12, two diagonals from (2.73,2.73) to (9.27,9.27) with 0.75 thickness and round ends (filled path).
- **Bot cursor arrow**: 12x12, triangle `M1.5 1.5 L10.5 5 L5 10.5 Z`, fill + stroke 1.5, round join.
- **Scissors blades**: two 14x42 shapes, each a 2-wide vertical bar with a ring of outer r 6 / inner r 4 at the bottom (centered at (7,35)). Redraw.
- **Select chevron** (in global CSS, unused on landing): 10x10 `M8 4.5 L5 7.5 L2 4.5`.
- **Dotted circles / ovals / ellipse / triangle**: CSS borders or SVG as described; no images.

Fonts actually loaded on first paint: Red Hat Mono latin 500/600 normal (`c6590e94fb93f6bd-s.p.woff2`), Red Hat Mono latin italic (`f152897b8b9d2cf6-s.p.woff2`), Inter latin variable (`e4af272ccee01ff0-s.p.woff2`). Use Google Fonts equivalents.

---

## 14. Copy placeholders (lengths to match)
Short UI labels can be reused as-is: Start Now, Try It, Problems It Solves, Pricing, Reviews, FAQ, 1 of 3, Plan, Get in touch, Telegram, X-Twitter, Email, Prev, Next, 1 of 2, OK, menu/close, start now, Days, Weeks, footer link labels. Write your own marketing copy with these lengths:
| Block | Chars | Lines (1440 / 390) |
|---|---|---|
| Hero h1 | 166 (27 words) | 4 / 6 |
| Sidebar tagline | 34 | 2 (204 wide) / 1 |
| Cookie text | 100 | 4 |
| Feature 1 / 2 / 3 paragraph | 88 / 86 / 87 | 3 / 3 |
| Price list lines | 35 / 26 / 18 / 33 | 1 each / some 2 |
| Contact paragraph | 77 | 3 / 3 |
| Review 1 header | name 12, role 32 | |
| Review 1 paragraphs | 70 / 182 / 108 | 2 / 4 / 2 |
| Review 2 header | name 13, role 35 | |
| Review 2 paragraph | 399 | 8 |
| FAQ questions and answers | see section 9 | |
| Copyright | 41 | 1 |

---

## 15. Not measured, and caveats
- **Auth redirect:** on load the original calls `GET https://api.weeksync.app/auth/session` (+ refresh). If the visitor is logged in it redirects to `/workspaces/`. Not cloned (401 for anonymous visitors).
- **Embla drag physics:** default embla `duration: 25` is assumed from the library defaults; drag feel was not instrumented.
- **Sounds:** hover/click mp3 files were not inspected.
- **Fish sprite and illustrations:** content was intentionally not downloaded or reproduced; only dimensions are recorded.
- **Bot cursor behaviour** is randomized, so exact paths are not reproducible. Rules and timing ranges come from source.
- The 480–1023px tablet range was not visually checked. CSS rules show it uses the mobile layout at a fixed 1rem = 1px.
- Demo dates depend on the visitor's current date (measured on Mon 26 Oct 2026, giving columns 26 Oct–1 Nov, current = 26 Oct).
- Wrap height H depends on viewport (7504 at 1440x900, 6671 at 1280x800) and on the open FAQ item. Scroll-linked hero thresholds therefore scale with H.
- Console on the live site shows 2 errors (the 401 auth calls); irrelevant to the clone.
