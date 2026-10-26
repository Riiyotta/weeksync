import { useEffect, useState } from 'react'
import { assets, links, nav, tagline, ui } from '../content.js'
import { LOOP_PROGRESS, scrollToSection } from '../lib/loopEvents.js'
import CtaButton from './CtaButton.jsx'

// Spec 3.4 active section logic: among all elements with the nav ids (both loop copies),
// the one spanning 0.33 * innerHeight wins; otherwise the one with the greatest top above
// that line; otherwise none.
function computeActive() {
  const line = window.innerHeight * 0.33
  let best = null
  let bestTop = -Infinity
  for (const { target } of nav) {
    for (const el of document.querySelectorAll(`[id="${target}"]`)) {
      const r = el.getBoundingClientRect()
      if (r.top <= line && r.bottom >= line) return target
      if (r.top < line && r.top > bestTop) {
        bestTop = r.top
        best = target
      }
    }
  }
  return best
}

function SidebarButton({ label, active, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group block bg-transparent border-0 p-0 font-mono font-semibold text-para text-center text-landing-black antialiased cursor-pointer hover:italic hover:t-underline ${active ? 'italic t-underline' : ''}`}
    >
      <span
        className={`block w-[14.4rem] h-[14.4rem] rounded-[50%] border-[1.584rem] border-solid border-landing-black mx-auto mb-[7.2rem] group-hover:bg-landing-black ${active ? 'bg-landing-black' : 'bg-transparent'}`}
      />
      {label}
    </button>
  )
}

export default function Sidebar() {
  const [active, setActive] = useState(null)

  useEffect(() => {
    let raf = 0
    const update = () => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => setActive(computeActive()))
    }
    update()
    window.addEventListener(LOOP_PROGRESS, update)
    window.addEventListener('resize', update)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener(LOOP_PROGRESS, update)
      window.removeEventListener('resize', update)
    }
  }, [])

  return (
    <aside className="fixed top-0 left-0 w-sidebar h-screen pl-pad-section pt-pad-section pb-pad-section z-sidebar mob:hidden">
      <div className="w-full h-full flex flex-col items-center justify-between border-dot border-dotted border-landing-black rounded-l-landing py-[43.2rem]">
        <div className="w-full flex flex-col items-center justify-center px-[72rem]">
          <button
            type="button"
            aria-label={ui.logoAria}
            onClick={() => scrollToSection('hero-section')}
            className="inline-flex p-0 m-0 border-0 bg-transparent cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-landing-black focus-visible:outline-offset-4"
          >
            <img src={assets.logoMark} alt="" className="w-[33.12rem] h-[25.92rem]" />
          </button>
          <div className="pt-[28.8rem] pb-[17.28rem]">
            <p className="t-para text-center">{tagline}</p>
          </div>
          <CtaButton label={ui.startNow} href={links.login} />
        </div>
        <nav className="flex flex-col items-center justify-center gap-[28.8rem]">
          {nav.map((item) => (
            <SidebarButton
              key={item.target}
              label={item.label}
              active={active === item.target}
              // Sidebar clicks pass smooth undefined -> instant jump (spec 3)
              onClick={() => scrollToSection(item.target)}
            />
          ))}
        </nav>
      </div>
    </aside>
  )
}
