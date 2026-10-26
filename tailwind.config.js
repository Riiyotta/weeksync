/** @type {import('tailwindcss').Config} */
// Design tokens from CLONE_SPEC.md section 1. Root font-size makes 1rem = 1 design px
// (see src/index.css), so every layout token here is expressed in rem.
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    // Spec is desktop-first: mobile layout at max-width 1023px (spec 0.4).
    screens: {
      desk: { min: '1024px' },
      mob: { max: '1023px' },
    },
    extend: {
      colors: {
        landing: {
          black: '#000',
          white: '#fff',
          beige: '#f9f7f3',
          accent: '#dfe296',
          gray: '#cec9c0',
          body: '#d2d2d2',
        },
        ink: '#222222', // --black
        sand: {
          100: '#f9f7f3',
          200: '#efede7',
          300: '#e5e1d9',
          400: '#cec9c0',
          500: '#b8b2a6',
          600: '#969490',
          700: '#757471',
        },
        gray: {
          500: '#80868b',
          600: '#535353',
          700: '#333333',
        },
        red: { 300: '#f9a8a8', 500: '#e77d5f', 700: '#c15051' },
        orange: { 300: '#ffca9e', 500: '#eaa165', 700: '#e77d5f' },
        green: { 200: '#80e1c2' },
        // color-mix(in srgb, #333 78%, #f9f7f3 22%), computed color(srgb .3708 .3691 .3656)
        'demo-active': 'color-mix(in srgb, #333333 78%, #f9f7f3 22%)',
      },
      fontFamily: {
        inter: ['Inter', '"Inter Fallback"', 'sans-serif'],
        mono: ['"Red Hat Mono"', '"Red Hat Mono Fallback"', 'monospace'],
      },
      fontSize: {
        hero: ['42.624rem', { lineHeight: '110%', letterSpacing: '-0.05em', fontWeight: '500' }],
        'hero-m': ['27rem', { lineHeight: '115%', letterSpacing: '-0.05em', fontWeight: '500' }],
        title: ['19.4rem', { lineHeight: '122%', letterSpacing: '-0.03em', fontWeight: '600' }],
        'title-m': ['16rem', { lineHeight: '122%', letterSpacing: '-0.03em', fontWeight: '600' }],
        para: ['12rem', { lineHeight: '132%', letterSpacing: '0.03em' }],
        'para-m': ['9rem', { lineHeight: '132%', letterSpacing: '0.03em' }],
        'demo-md': ['16rem', { lineHeight: '135%', fontWeight: '500' }],
        demo: ['12rem', { lineHeight: '135%', fontWeight: '500' }],
        'demo-sm': ['10rem', { lineHeight: '135%', fontWeight: '500' }],
        'menu-bar': ['16rem', { lineHeight: 'normal' }],
        'menu-item': ['27rem', { lineHeight: 'normal' }],
      },
      spacing: {
        'pad-base': '24.99984rem', // --landing-padding-base
        'pad-section': '15rem', // --landing-padding-section
        'gap-base': '15rem', // --landing-gap-base
        sidebar: '371rem',
        'mob-col': '360rem', // mobile content column
      },
      borderRadius: {
        landing: '33.12rem', // --landing-border-radius
        big: '15px',
        medium: '10px',
        small: '5px',
      },
      borderWidth: {
        dot: '4.032rem', // --landing-border-dotted
        'dot-m': '3.5rem', // --landing-mobile-border-dotted
      },
      zIndex: {
        sidebar: '1000',
        hero: '1002',
        menu: '1500',
        cookie: '9999',
        trail: '2147483647',
      },
      transitionTimingFunction: {
        menu: 'cubic-bezier(.22,.61,.36,1)',
      },
      // Keyframes are defined here as tokens for the Animation pass.
      // They are NOT applied by any component yet (see TODO(motion) markers).
      keyframes: {
        ovalGrowShrink: {
          '0%': { width: '3%' },
          '50%': { width: '70%' },
          '100%': { width: '3%' },
        },
        smallOvalGrowShrink: {
          '0%': { width: '0', opacity: '0' },
          '25%': { opacity: '1' },
          '50%': { width: '20rem', opacity: '1' },
          '75%': { opacity: '1' },
          '100%': { width: '0', opacity: '0' },
        },
        ovalContentScaleShrink: {
          '0%': { transform: 'scaleX(0)', opacity: '0' },
          '25%': { opacity: '1' },
          '50%': { transform: 'scaleX(1)', opacity: '1' },
          '75%': { opacity: '1' },
          '100%': { transform: 'scaleX(0)', opacity: '0' },
        },
        swingAndMove: {
          '0%': { transform: 'translateY(2rem) rotate(15deg)' },
          '50%': { transform: 'translateY(-2rem) rotate(-15deg)' },
          '100%': { transform: 'translateY(2rem) rotate(15deg)' },
        },
        appear: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
      },
      animation: {
        'oval-grow': 'ovalGrowShrink 6s linear infinite',
        'small-oval': 'smallOvalGrowShrink 6s linear infinite',
        'oval-content': 'ovalContentScaleShrink 6s linear infinite',
        'fish-swing': 'swingAndMove 10s ease infinite',
        appear: 'appear .4s ease both',
      },
    },
  },
  plugins: [],
}
