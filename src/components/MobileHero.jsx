import { assets, links, tagline, ui } from '../content.js'
import CtaButton from './CtaButton.jsx'

// Mobile hero ovals (spec 4.4 item 1). Rendered only <= 1023px.
// Motion (from the original CSS): oval ovalGrowShrink, small ovals smallOvalGrowShrink, content
// ovalContentScaleShrink, all `6s linear infinite`, no delay, all three in phase from page load.
// The static classes are the keyframes' 50% frame (used only if animations are unavailable).
export default function MobileHero() {
  return (
    <section className="w-mob-col h-auto mx-auto pt-[80rem] pb-[80rem] desk:hidden">
      <div className="relative w-mob-col h-[350rem] flex items-center justify-center">
        <div className="w-[70%] animate-oval-grow h-full border-dot-m border-dotted border-landing-black rounded-[100%] flex flex-col items-center justify-between pt-[30rem] pb-[30rem]">
          <div className="w-[20rem] animate-small-oval h-[20rem] border-dot-m border-dotted border-landing-black rounded-[100%]" />
          <div className="w-[20rem] animate-small-oval h-[20rem] border-dot-m border-dotted border-landing-black rounded-[100%]" />
        </div>
        <div className="absolute inset-0 z-[2] animate-oval-content flex flex-col items-center justify-center px-[75rem] gap-[24rem] text-center">
          <img src={assets.logoMark} alt="" className="w-[34rem] h-[26rem]" />
          <p className="t-para text-center">{tagline}</p>
          <CtaButton label={ui.startNow} href={links.login} />
        </div>
      </div>
    </section>
  )
}
