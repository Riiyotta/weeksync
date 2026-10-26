import { useEffect, useState } from 'react'
import { brand } from './content.js'
import useIsDesktop from './lib/useIsDesktop.js'
import LoopScroller from './components/LoopScroller.jsx'
import CookiePopup from './components/CookiePopup.jsx'
import CursorTrail from './components/CursorTrail.jsx'
import HeroSlide from './components/HeroSlide.jsx'
import Sidebar from './components/Sidebar.jsx'
import MobileHero from './components/MobileHero.jsx'
import MobileMenu from './components/MobileMenu.jsx'
import AppDemo from './components/AppDemo.jsx'
import Features from './components/Features.jsx'
import Price from './components/Price.jsx'
import Reviews from './components/Reviews.jsx'
import Faq from './components/Faq.jsx'
import CtaFooter from './components/CtaFooter.jsx'

// Spacer: calc(heightVw/2 vw + heightVh/4 vh); 0 on mobile (spec 2).
function EmptySlide({ id, height }) {
  return <div id={id} className="mob:!h-0" style={{ height }} />
}

// One copy of the scrolling page. Rendered twice on desktop (wrap + wrap-clone).
function PageContent() {
  return (
    <div className="w-full bg-landing-gray pt-pad-section pl-sidebar mob:pt-0 mob:pl-0">
      <div className="mob:overflow-visible mob:w-mob-col mob:mx-auto">
        <EmptySlide id="hero-section" height="calc(118.75vh + 37.5vw)" />
        <AppDemo />
        <Features />
        <Price />
        <Reviews />
        <Faq />
        <CtaFooter />
        <EmptySlide height="calc(22.5vh + 30vw)" />
      </div>
    </div>
  )
}

function usePointerFine() {
  const [fine, setFine] = useState(() => window.matchMedia('(pointer: fine)').matches)
  useEffect(() => {
    const mql = window.matchMedia('(pointer: fine)')
    const onChange = () => setFine(mql.matches)
    mql.addEventListener('change', onChange)
    return () => mql.removeEventListener('change', onChange)
  }, [])
  return fine
}

export default function App() {
  const isDesktop = useIsDesktop()
  const pointerFine = usePointerFine()

  useEffect(() => {
    document.title = brand.documentTitle
  }, [])

  return (
    <div className="w-full h-full bg-landing-gray">
      {isDesktop && pointerFine && <CursorTrail />}
      <CookiePopup />
      {!isDesktop && <MobileMenu />}
      {!isDesktop && <MobileHero />}
      <HeroSlide />
      <Sidebar />
      <LoopScroller enabled={isDesktop}>
        <PageContent />
      </LoopScroller>
    </div>
  )
}
