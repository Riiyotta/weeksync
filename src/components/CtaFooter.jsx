import { useRef } from 'react'
import { assets, copyright, links, ui } from '../content.js'
import { useFishFrame, useFishWheel } from '../lib/motion.js'
import CtaButton from './CtaButton.jsx'

// Sprite frame scrub via useFishFrame; each sprite also swings (swingAndMove 10s ease infinite,
// applied on the original's FishVideo_sprite).
function FishSprite() {
  const frame = useFishFrame()
  const last = assets.spriteFrames - 1
  return (
    <div className="flex flex-col items-center gap-[12px]">
      <div
        role="presentation"
        className="fish-sprite animate-fish-swing"
        style={{ backgroundImage: `url("${assets.spriteStrip}")`, backgroundPosition: `${(frame / last) * 100}% 0%` }}
      />
    </div>
  )
}

// Four sprites in a rotating cross (spec 10, 12.5).
// useFishWheel drives the outer (scroll-linked) and inner (18deg/s) rotations.
function FishWheel() {
  const outerRef = useRef(null)
  const innerRef = useRef(null)
  useFishWheel(outerRef, innerRef)
  return (
    <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none mix-blend-multiply">
      <div ref={outerRef} className="w-full h-full" style={{ transform: 'rotate(0deg)' }}>
        <div ref={innerRef} className="w-full h-full" style={{ transform: 'rotate(0deg)' }}>
          <div className="absolute top-0 left-0 w-full h-full flex items-center justify-center">
            <div className="flex flex-col items-center justify-center gap-[216rem] mob:gap-[95rem]">
              <div className="[transform:rotate(0deg)]">
                <FishSprite />
              </div>
              <div className="[transform:rotate(180deg)]">
                <FishSprite />
              </div>
            </div>
          </div>
          <div className="absolute top-0 left-0 w-full h-full flex items-center justify-center">
            <div className="flex flex-row items-center justify-center gap-[216rem] mob:gap-[95rem]">
              <div className="[transform:rotate(270deg)]">
                <FishSprite />
              </div>
              <div className="[transform:rotate(90deg)]">
                <FishSprite />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function CtaFooter() {
  return (
    <div className="px-pad-section">
      <div className="relative w-full h-[calc(100vh-29.999952rem)] flex flex-col items-center justify-between bg-landing-accent rounded-landing p-pad-base mob:h-auto mob:bg-transparent mob:gap-[20rem]">
        {/* Empty in-flow item (as in the original): with justify-between it pins the footer row to the bottom */}
        <div />
        <div className="absolute bottom-0 left-0 w-full h-full flex items-center justify-center pointer-events-none mob:relative mob:aspect-square mob:bg-landing-accent mob:rounded-landing">
          <FishWheel />
          <div className="relative z-[1] pointer-events-auto">
            <CtaButton label={ui.startNow} href={links.login} />
          </div>
        </div>
        <div className="relative order-2 z-[2] w-full flex items-center justify-between mob:flex-col mob:gap-[10rem] mob:text-center">
          <p className="t-para">{copyright}</p>
          <div className="flex items-center justify-center gap-[7.2rem]">
            {links.legal.map((l) => (
              <a
                key={l.href}
                href={l.href}
                className="t-para t-underline cursor-pointer [transition:text-decoration_.2s_ease] hover:no-underline"
              >
                {l.label}
              </a>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
