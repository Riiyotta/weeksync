import { useEffect, useId, useRef } from 'react'
import { faq } from '../content.js'
import { faqStore, useStore } from '../lib/store.js'
import { notifyContentResize } from '../lib/loopEvents.js'
import TypewriterText from './TypewriterText.jsx'

// FAQ accordion (spec 9). Single-open, item 1 open on load, open item can be closed.
// State is shared between loop copies; opens/closes instantly (no height animation).
export default function Faq() {
  const open = useStore(faqStore, (s) => s.open)
  const baseId = useId()
  const mounted = useRef(false)

  // Let the loop scroller re-measure the wrap height after a toggle.
  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true
      return
    }
    notifyContentResize()
  }, [open])

  const toggle = (i) => faqStore.set((s) => ({ ...s, open: s.open === i ? null : i }))

  return (
    <div
      id="faq-section"
      className="flex flex-col items-center gap-[34.56rem] pt-pad-section px-pad-section pb-[100.8rem] select-none mob:pt-[30rem] mob:pb-[30rem] mob:gap-[20rem] mob:scroll-mt-[60rem]"
    >
      <TypewriterText as="h2" text={faq.title} speed="slow" className="t-para text-center" />
      <ul className="list-none m-0 p-0 w-full max-w-[864rem]">
        {faq.items.map((item, i) => {
          const isOpen = open === i
          const answerId = `${baseId}-a${i}`
          return (
            <li key={i}>
              <button
                type="button"
                aria-expanded={isOpen}
                aria-controls={answerId}
                onClick={() => toggle(i)}
                className="group w-full flex items-start gap-[14.4rem] py-[21.6rem] bg-transparent border-0 cursor-pointer text-left text-landing-black focus-visible:outline focus-visible:outline-2 focus-visible:outline-landing-black focus-visible:outline-offset-2 focus-visible:rounded-[4rem] mob:gap-[10rem] mob:py-[14rem]"
              >
                <span
                  className={`shrink-0 w-[14.4rem] h-[14.4rem] mt-[4.7rem] rounded-[50%] border-[1.584rem] border-solid border-current [transition:background-color_.2s_ease] mob:w-[12rem] mob:h-[12rem] mob:border-[1.5rem] ${isOpen ? 'bg-current' : 'bg-transparent desk:group-hover:bg-current'}`}
                />
                <span
                  className={`t-title text-current ${isOpen ? 'italic t-underline' : 'desk:group-hover:italic desk:group-hover:t-underline'}`}
                >
                  {item.q}
                </span>
              </button>
              <div id={answerId} hidden={!isOpen} className="pl-[28.8rem] pb-[28.8rem] mob:pl-[22rem] mob:pb-[20rem]">
                <div className="flex flex-col items-start gap-[11.52rem] mob:gap-[10rem]">
                  {item.a.map((block, j) =>
                    block.p ? (
                      <p key={j} className="t-title">
                        {block.p}
                      </p>
                    ) : (
                      <ul key={j} className="list-none m-0 p-0 flex flex-col gap-[5.76rem]">
                        {block.list.map((li, k) => (
                          <li key={k} className="faq-li t-title">
                            {li}
                          </li>
                        ))}
                      </ul>
                    ),
                  )}
                </div>
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
