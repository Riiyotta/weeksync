import { links, price, ui } from '../content.js'
import TypewriterText from './TypewriterText.jsx'
import CtaButton from './CtaButton.jsx'

// Plan card + Get in touch card (spec 7).
const card =
  'box-border w-full h-[486rem] rounded-landing p-pad-base flex flex-col justify-between items-center mob:h-[370rem] mob:px-[30rem]'

export default function Price() {
  return (
    <div id="price-section" className="grid grid-cols-2 gap-gap-base pt-pad-section px-pad-section mob:flex mob:flex-col mob:gap-[10rem]">
      <div className={`${card} bg-landing-black`}>
        <TypewriterText as="h2" text={price.title} speed="slow" className="t-para text-center text-landing-white" />
        <div className="flex flex-col gap-gap-base">
          {price.lines.map((line, i) => (
            <TypewriterText
              key={i}
              as="p"
              text={line}
              speed="fast"
              delay={price.lineDelays[i]}
              className="t-title text-center text-landing-white"
            />
          ))}
        </div>
        <CtaButton label={ui.startNow} href={links.login} light />
      </div>
      <div className={`${card} bg-landing-beige px-[72rem]`}>
        <TypewriterText as="h2" text={price.contactTitle} speed="normal" className="t-para text-center" />
        <TypewriterText as="p" text={price.contactText} speed="fast" delay={400} className="t-title text-center" />
        <div className="flex gap-[43.2rem] mob:gap-[13rem]">
          {links.contact.map((c) => (
            <CtaButton key={c.label} label={c.label} href={c.href} target="_blank" rel="noopener noreferrer" />
          ))}
        </div>
      </div>
    </div>
  )
}
