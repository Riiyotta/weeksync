import { features, ui } from '../content.js'
import TypewriterText from './TypewriterText.jsx'

// Three stacked feature cards (spec 6). Card 2 is image-left; on mobile the image always
// comes first via order.
function FeatureCard({ text, image, alt, index, total, imageFirst }) {
  const textSide = (
    <div
      key="text"
      className="box-border w-full h-[486rem] flex flex-col justify-center items-center bg-landing-beige rounded-landing p-pad-base px-[72rem] gap-[37.44rem] mob:order-2 mob:h-auto mob:bg-transparent mob:p-[10rem] mob:gap-[20rem]"
    >
      <TypewriterText as="p" text={text} speed="normal" className="t-title text-center" />
      <TypewriterText as="h2" text={ui.of(index + 1, total)} speed="slow" delay={200} className="t-para text-center" />
    </div>
  )
  const imageSide = (
    <div
      key="image"
      className="box-border w-full h-[486rem] flex flex-col justify-center items-center bg-landing-accent rounded-landing p-pad-base mob:order-1 mob:h-auto mob:bg-transparent mob:p-[10rem] mob:gap-[20rem]"
    >
      <img loading="lazy" src={image} alt={alt} width="1058" height="668" className="w-full h-full object-contain" />
    </div>
  )
  return (
    <div className="grid grid-cols-2 gap-gap-base pt-pad-section px-pad-section mob:flex mob:flex-col mob:gap-0">
      {imageFirst ? [imageSide, textSide] : [textSide, imageSide]}
    </div>
  )
}

export default function Features() {
  return (
    <div id="features-section">
      {features.map((f, i) => (
        <FeatureCard key={i} {...f} index={i} total={features.length} imageFirst={i === 1} />
      ))}
    </div>
  )
}
