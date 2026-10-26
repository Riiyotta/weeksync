import { useCallback, useEffect, useState } from 'react'
import useEmblaCarousel from 'embla-carousel-react'
import { reviews, ui } from '../content.js'
import CtaButton from './CtaButton.jsx'

// Testimonials in a dotted ellipse (spec 8). Embla {loop:true}; Prev/Next jump instantly.
// Each loop copy keeps its own carousel state.
export default function Reviews() {
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true })
  const [index, setIndex] = useState(0)

  useEffect(() => {
    if (!emblaApi) return
    const onSelect = () => setIndex(emblaApi.selectedScrollSnap())
    onSelect()
    emblaApi.on('select', onSelect)
    emblaApi.on('reInit', onSelect)
    return () => {
      emblaApi.off('select', onSelect)
      emblaApi.off('reInit', onSelect)
    }
  }, [emblaApi])

  // scrollPrev(true)/scrollNext(true) = jump. If embla cannot loop with this slide count,
  // wrap manually so Next on the last slide still returns to the first.
  const prev = useCallback(() => {
    if (!emblaApi) return
    if (emblaApi.canScrollPrev()) emblaApi.scrollPrev(true)
    else emblaApi.scrollTo(reviews.length - 1, true)
  }, [emblaApi])
  const next = useCallback(() => {
    if (!emblaApi) return
    if (emblaApi.canScrollNext()) emblaApi.scrollNext(true)
    else emblaApi.scrollTo(0, true)
  }, [emblaApi])

  return (
    <section className="relative w-full flex items-center justify-center pt-[100.8rem] pb-[100.8rem] select-none mob:pt-[60rem] mob:pb-[30rem]">
      <div id="reviews-section" className="pt-pad-section mob:w-full">
        <div className="relative w-[864rem] h-[576rem] flex flex-col items-center justify-between border-dot border-dotted border-landing-black rounded-[50%] overflow-hidden mob:w-full mob:h-auto mob:rounded-none mob:border-0">
          <div ref={emblaRef} className="relative w-full h-full">
            <div className="flex items-stretch h-full">
              {reviews.map((r, i) => (
                <div key={i} className="flex-[0_0_100%] min-w-0 flex justify-center items-start">
                  <div className="relative w-full h-full flex flex-col items-center justify-center text-center pt-[34.56rem] pb-[34.56rem] px-[100.8rem] cursor-grab mob:p-0">
                    <div className="absolute top-[34.56rem] left-0 right-0 w-full flex flex-col mob:relative mob:top-0 mob:pb-[25rem]">
                      <p className="t-para text-center">{r.name}</p>
                      <p className="t-para text-center">{r.role}</p>
                    </div>
                    <div className="flex flex-col max-w-[92%] gap-[11.52rem]">
                      {r.paragraphs.map((p, j) => (
                        <p key={j} className="t-title text-center">
                          {p}
                        </p>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="absolute bottom-[34.56rem] left-0 right-0 z-[2] w-full flex items-center justify-center gap-[34.56rem] mob:relative mob:bottom-0 mob:pt-[25rem]">
            <CtaButton label={ui.prev} onClick={prev} />
            <p className="t-para">{ui.of(index + 1, reviews.length)}</p>
            <CtaButton label={ui.next} onClick={next} />
          </div>
        </div>
      </div>
      <div className="absolute w-px h-px p-0 -m-px overflow-hidden [clip:rect(0,0,0,0)] whitespace-pre-line border-0">
        {reviews.map((r, i) => (
          <article key={i}>
            <h3>
              {r.name}, {r.role}
            </h3>
            {r.paragraphs.map((p, j) => (
              <p key={j}>{p}</p>
            ))}
          </article>
        ))}
      </div>
    </section>
  )
}
