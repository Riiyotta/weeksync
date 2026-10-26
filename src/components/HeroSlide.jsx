import { useEffect, useRef, useState } from 'react'
import { heroText, ui } from '../content.js'
import { scrollToSection } from '../lib/loopEvents.js'
import { useHeroMotion, useZipperPull } from '../lib/motion.js'
import TypewriterText from './TypewriterText.jsx'
import { Blade } from './Icons.jsx'

// Fixed hero "ticket" (spec 4.1-4.3); relative block on mobile (spec 4.4 item 2).
// Ticket flight + scissors travel/snip come from useHeroMotion (src/lib/motion.js).

// Zipper pull (spec 4.2): replaces the scissors while ap is in [.30, .49) (scrolling back
// into the hero from the loop end). The handle swings toward the mouse.
function ZipperPull() {
  const boxRef = useRef(null)
  const handleRef = useRef(null)
  useZipperPull(boxRef, handleRef)
  const part = 'absolute border-[2.16rem] border-solid border-landing-black bg-landing-gray'
  return (
    <div ref={boxRef} className={`${part} w-1/2 h-1/2 left-1/4 top-1/4 rounded-[7.2rem] z-[1]`}>
      <div className={`${part} top-[15%] left-[29%] w-[40%] h-[70%] rounded-[30%] z-[2]`} />
      <div ref={handleRef} className={`${part} top-[30%] left-[4%] w-[90%] h-[180%] rounded-[7.2rem] origin-[50%_25%] will-change-transform`}>
        <div className={`${part} top-[61%] left-[14%] w-[68%] h-[29.7%] rounded-[100%]`} />
      </div>
    </div>
  )
}

export default function HeroSlide() {
  const { ticketTransform, ticketHidden, T, opacity, bladeOpen, showZipper, showScissors } = useHeroMotion()

  // Blades: closed + `transition: transform .25s ease-out` while hovered, and keep the
  // transition for 250ms after leaving (spec 4.2).
  const [hovered, setHovered] = useState(false)
  const [animated, setAnimated] = useState(false)
  const leaveTimer = useRef(0)
  useEffect(() => () => clearTimeout(leaveTimer.current), [])
  const onEnter = () => {
    clearTimeout(leaveTimer.current)
    setHovered(true)
    setAnimated(true)
  }
  const onLeave = () => {
    setHovered(false)
    leaveTimer.current = setTimeout(() => setAnimated(false), 250)
  }
  const angle = 20 * (hovered ? 0 : bladeOpen)
  const bladeCls = `absolute top-0 w-[38%] h-full origin-[50%_70%] text-landing-black ${animated ? '[transition:transform_.25s_ease-out]' : ''}`

  return (
    <div className="fixed top-0 right-0 w-[calc(100%-367.2rem)] h-screen pt-[15.000048rem] pr-[15.000048rem] pb-[15.000048rem] z-hero opacity-100 pointer-events-none mob:relative mob:top-auto mob:right-auto mob:w-mob-col mob:h-auto mob:mx-auto mob:pointer-events-auto">
      <div
        className="relative w-full h-full origin-center will-change-transform [backface-visibility:hidden] border-dot border-dotted border-landing-black rounded-r-landing mob:h-auto mob:border-0 mob:rounded-none"
        style={{ transform: ticketTransform, display: ticketHidden ? 'none' : undefined }}
      >
        <div
          className="absolute top-0 left-[-23.76rem] w-[43.2rem] bg-landing-gray opacity-100 mob:hidden"
          style={{ height: `calc(${T * 100}% - 2vw)` }}
        />
        <div
          className="absolute left-[-23.76rem] top-[-57.6rem] w-[43.2rem] h-[43.2rem] mob:hidden"
          style={{ transform: `translateY(calc(${T * 100}vh - ${T * 2}vw))`, opacity }}
        >
          <div
            className="absolute inset-0"
            style={{ opacity: showZipper ? 1 : 0, visibility: showZipper ? 'visible' : 'hidden', pointerEvents: showZipper ? 'auto' : 'none' }}
          >
            <ZipperPull />
          </div>
          <button
            type="button"
            aria-label={ui.scissorsAria}
            style={{ opacity: showScissors ? 1 : 0, visibility: showScissors ? 'visible' : 'hidden', pointerEvents: showScissors ? 'auto' : 'none' }}
            onClick={() => scrollToSection('features-section', { smooth: true })}
            onMouseEnter={onEnter}
            onMouseLeave={onLeave}
            className="absolute inset-0 p-0 border-0 bg-transparent cursor-pointer"
          >
            <span className="block w-full h-full relative">
              <Blade className={`${bladeCls} right-[15%]`} style={{ transform: `rotate(${-angle}deg)` }} />
              <Blade className={`${bladeCls} left-[15%]`} style={{ transform: `rotate(${angle}deg)` }} />
            </span>
          </button>
        </div>
        <div className="pt-[30.24rem] pr-[72rem] pb-[30.24rem] pl-[30.24rem] pointer-events-auto mob:p-0">
          <TypewriterText as="h1" text={heroText} speed="fast" className="t-hero mob:text-center" />
        </div>
      </div>
    </div>
  )
}
