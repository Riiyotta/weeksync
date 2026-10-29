// All copy and asset references for the landing page.
// Product, copy, reviewers and links are original placeholders for a fictional
// weekly-planning product ("Sevenday"). Lengths match CLONE_SPEC.md section 14
// so the layout wraps the same as the measured original.

export const brand = {
  name: 'Sevenday',
  documentTitle: 'Sevenday. Calm weekly plans for small teams.',
}

export const assets = {
  logoMark: '/assets/logo-mark.svg', // 34x26 viewBox placeholder wordmark
  favicon: '/assets/icon.svg',
  featureImages: [
    '/assets/feature-a.svg', // 1058x668
    '/assets/feature-b.svg', // 1058x668
    '/assets/feature-c.svg', // 1058x668
  ],
  spriteStrip: '/assets/sprite-strip.svg', // 29 frames of 540x540 = 15660x540
  spriteFrames: 29,
}

export const links = {
  login: '/login',
  legal: [
    { label: 'Terms & Conditions', href: '/terms-and-conditions/' },
    { label: 'Privacy Policy', href: '/privacy-policy/' },
    { label: 'Terms of Use', href: '/terms-of-use/' },
    { label: 'Refund Policy', href: '/refund-policy/' },
  ],
  contact: [
    { label: 'Telegram', href: 'https://t.me/sevenday_example' },
    { label: 'X-Twitter', href: 'https://x.com/sevenday_example' },
    { label: 'Email', href: 'mailto:hello@sevenday.example' },
  ],
}

// Sidebar / mobile menu navigation (labels reused from the spec; targets are section ids).
export const nav = [
  { label: 'Try It', target: 'demo-section' },
  { label: 'Problems It Solves', target: 'features-section' },
  { label: 'Pricing', target: 'price-section' },
  { label: 'Reviews', target: 'reviews-section' },
  { label: 'FAQ', target: 'faq-section' },
]

export const ui = {
  startNow: 'Start Now',
  ok: 'OK',
  prev: 'Prev',
  next: 'Next',
  menu: 'menu',
  close: 'close',
  startNowMobile: 'start now',
  logoAria: 'Go to hero screen',
  scissorsAria: 'Go to the next section',
  of: (i, n) => `${i} of ${n}`,
}

// 34 chars, 2 lines in the 204-wide sidebar box
export const tagline = 'Calm weekly plans for small teams.'

// 166 chars / 27 words, 4 lines at 1440/1280, 6 at 390; longest line 926 / 361.4 px as on the original
export const heroText =
  'Sevenday puts your people, projects and their hours for the week into one single view, so splitting the load fairly and spotting overfull days sooner becomes trivial.'

// 100 chars; monospace lines of 29/25/28/15 chars at 1440 and 29/37/32 at 390, as on the original
export const cookieText =
  'We use a small set of cookies essential to running this website and to measure which pages help you.'
export const cookieStorageKey = 'sevenday_cookie_consent'

// 88 / 86 / 87 chars. Card 1 text-left, card 2 image-left, card 3 text-left.
export const features = [
  {
    text: 'See who is free and who is overloaded before Monday starts, not halfway into a Thursday.',
    image: assets.featureImages[0],
    alt: '',
  },
  {
    text: 'Drag work between people and days in seconds and watch every total update as you move.',
    image: assets.featureImages[1],
    alt: '',
  },
  {
    text: 'Plan in days for detail or in weeks for the big picture, all on one and the same board.',
    image: assets.featureImages[2],
    alt: '',
  },
]

export const price = {
  title: 'Plan',
  // 35 / 26 / 18 / 33 chars
  lines: [
    'Try every feature free for 14 days.',
    '$4 per teammate each month',
    'Unlimited projects',
    'Chat directly with the developers',
  ],
  lineDelays: [300, 600, 900, 1200],
  contactTitle: 'Get in touch',
  // 77 chars
  contactText: 'Got questions, ideas or a bug? Write to us and a real person replies quickly.',
}

// Header: name 12 / role 32 and name 13 / role 35.
// Paragraphs: 70 / 182 / 108 and 399.
export const reviews = [
  {
    name: 'Ada Whitlock',
    role: 'Studio lead, small branding team',
    paragraphs: [
      'It still feels odd to recall that a list in a file ran all of our jobs.',
      'Now every Monday starts with one board that shows exactly who is booked, who has room and which project is about to slip, and the whole planning call is done before coffee gets cold.',
      'It is so simple that even our least organised designer keeps her own week up to date, never needing a nudge.',
    ],
  },
  {
    name: 'Ivo Marchetti',
    role: 'Operations manager, mobile app shop',
    paragraphs: [
      'We juggle six client projects with a team of nine, and before this we only noticed overload when someone was already working late. Seeing each day as a stack of hours made the problem obvious at a glance. We now rebalance work on Friday afternoon in about ten minutes, the weekly totals keep everyone honest, and switching between days and weeks helps us promise realistic delivery dates to clients.',
    ],
  },
]

// Question lengths 17,45,20,55,22,40,37,25,25,38. Answer blocks per spec section 9.
// List item text excludes the "— " prefix (rendered via ::before).
export const faq = {
  title: 'FAQ',
  items: [
    {
      q: 'What is Sevenday?',
      a: [
        { p: 'Sevenday is a planning board for small teams built around weeks. Each person gets a row, each day a cell, and each task is a chip with its project and hours.' },
      ],
    },
    {
      q: 'Do I need to install anything to get started?',
      a: [
        { p: 'No. Sevenday runs in any modern browser on desktop or laptop, so there is nothing to download or configure. Create an account, add your teammates and projects, and you can start dragging work onto the board within a few minutes. Your data syncs on each change.' },
      ],
    },
    {
      q: 'How is pricing done?',
      a: [
        { p: 'You pay a flat monthly price for every active teammate on the board. Projects, boards and history are unlimited, and you can cancel at any time.' },
      ],
    },
    {
      q: 'Can I see the hours of one person across many projects?',
      a: [
        { p: 'Yes. Every person row shows a running total against their capacity, broken down by project, such as:' },
        { list: ['Totals per week', 'Hours per day', 'Breakdown by client', 'Capacity left for the week'] },
        { p: 'Totals turn orange at one hour over capacity and red at two, so you know where to look before the week gets away from anybody.' },
      ],
    },
    {
      q: 'Is there a free trial?',
      a: [
        { p: 'Yes. Every new workspace gets the full product free for fourteen days, with no card required up front. You can invite the whole team and plan real work during the trial.' },
        { p: 'When the trial ends you choose how many seats you need, or you simply stop using it and your data is deleted.' },
      ],
    },
    {
      q: 'Can I plan in weeks rather than in days?',
      a: [
        { p: 'Yes. Switch the view to Weeks and each column becomes a full week, with chips grouped by project and totals measured against forty hours per person, per week.' },
      ],
    },
    {
      q: 'What happens if anyone is overbooked?',
      a: [
        { p: 'The person total and the day summary change colour as soon as planned hours go above capacity, so it is easy to spot. From there you can fix it in a few sensible ways, for example:' },
        {
          list: [
            'Drag a chip to a teammate who still has free time that day',
            'Move part of the work to a later day where there is still space',
            'Split one long task into two smaller chips and spread them across the week so that no day overflows',
            'Switch to the Weeks view to see whether the full week is over or just one day',
          ],
        },
      ],
    },
    {
      q: 'Can I add the whole team?',
      a: [
        { p: 'Of course. Invite as many teammates as you like, and every person gets their own row on the board.' },
      ],
    },
    {
      q: 'Is my planning data safe?',
      a: [
        { p: 'Your boards are stored on encrypted servers in the EU, backed up every day, and never shared or sold. You can export or delete all of it anytime.' },
      ],
    },
    {
      q: 'How do I contact the people behind it?',
      a: [
        { p: 'Use the Telegram, X or Email buttons in the Get in touch card. Messages go straight to the developers, who reply within a day.' },
      ],
    },
  ],
}

// 41 chars
export const copyright = '© 2026 Sevenday Ltd. All rights reserved.'

// ---------------------------------------------------------------------------
// Demo calendar seed (spec 5.4). Generic demo names/projects kept from the spec.
// Week offsets are relative to the visitor's current Monday; hours are Mon..Fri.
export const demo = {
  ariaLabel: 'Sevenday live demo',
  days: 'Days',
  weeks: 'Weeks',
  empty: 'Empty',
  summary: (h) => `Summary: ${h} ${h === 1 ? 'hour' : 'hours'}`,
  total: (h, cap) => `${h}h of ${cap}h`,
  prevAria: 'Previous period',
  nextAria: 'Next period',
  addAria: 'Add entry',
  removeAria: 'Remove entry',
  projects: [
    { id: 'website', name: 'Website' },
    { id: 'logo', name: 'Logo' },
    { id: 'iosApp', name: 'iOS app' },
    { id: 'launch', name: 'Launch' },
    { id: 'ads', name: 'Ads' },
    { id: 'internal', name: 'Internal' },
  ],
  people: [
    { id: 'mia', name: 'Mia Chen', role: 'Designer', cursorName: 'Mia' },
    { id: 'leo', name: 'Leo Novak', role: 'Developer', cursorName: 'Leo' },
    { id: 'sofia', name: 'Sofia Reyes', role: 'Manager', cursorName: 'Sofia' },
  ],
  dayCapacity: 8, // weekdays; 0 on weekends
  weekCapacity: 40,
  seed: {
    '-2': [
      ['mia', 'website', [8, 8, 8, 8, 8]],
      ['leo', 'iosApp', [8, 8, 8, 8, 8]],
      ['sofia', 'launch', [8, 8, 8, 0, 0]],
      ['sofia', 'internal', [0, 0, 0, 8, 8]],
    ],
    '-1': [
      ['mia', 'website', [8, 8, 0, 0, 0]],
      ['mia', 'logo', [0, 0, 8, 8, 8]],
      ['leo', 'iosApp', [8, 8, 8, 8, 0]],
      ['leo', 'website', [0, 0, 0, 0, 8]],
      ['sofia', 'launch', [6, 8, 6, 8, 8]],
      ['sofia', 'ads', [2, 0, 2, 0, 0]],
    ],
    '0': [
      ['mia', 'website', [8, 6, 0, 0, 2]],
      ['mia', 'logo', [0, 2, 8, 8, 6]],
      ['leo', 'iosApp', [8, 8, 0, 2, 8]],
      ['leo', 'website', [0, 0, 8, 6, 0]],
      ['sofia', 'launch', [6, 0, 8, 8, 0]],
      ['sofia', 'ads', [2, 8, 0, 0, 8]],
    ],
    '1': [
      ['mia', 'logo', [8, 8, 8, 0, 0]],
      ['leo', 'iosApp', [8, 8, 8, 8, 8]],
      ['sofia', 'launch', [6, 6, 6, 6, 0]],
    ],
    '2': [
      ['mia', 'website', [8, 8, 0, 0, 0]],
      ['leo', 'iosApp', [8, 8, 8, 0, 0]],
      ['sofia', 'launch', [4, 4, 0, 0, 0]],
    ],
    '3': [
      ['leo', 'launch', [8, 8, 0, 0, 0]],
      ['sofia', 'internal', [4, 0, 0, 0, 0]],
    ],
    '4': [['mia', 'logo', [4, 0, 0, 0, 0]]],
  },
}

// Placeholder pages behind the footer legal links and the Start Now (/login) CTAs.
// The clone has no legal text or auth; each page says so and links back home.
export const placeholderPages = {
  '/login': { title: 'Log in', text: 'Sign-in is not part of this local clone. There is no account system behind it.' },
  '/terms-and-conditions': { title: 'Terms & Conditions', text: 'Placeholder page. No terms are published for this local clone.' },
  '/privacy-policy': { title: 'Privacy Policy', text: 'Placeholder page. This local clone collects no data; the cookie notice only stores a dismissal flag in your browser.' },
  '/terms-of-use': { title: 'Terms of Use', text: 'Placeholder page. No terms of use are published for this local clone.' },
  '/refund-policy': { title: 'Refund Policy', text: 'Placeholder page. Nothing is sold through this local clone.' },
}
