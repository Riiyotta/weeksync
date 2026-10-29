import { useState } from 'react'
import { cookieStorageKey, cookieText, ui } from '../content.js'
import TypewriterText from './TypewriterText.jsx'
import CtaButton from './CtaButton.jsx'

// Triangle cookie banner (spec 11). OK stores "true" and unmounts (no exit animation).
function readConsent() {
  try {
    return localStorage.getItem(cookieStorageKey) === 'true'
  } catch {
    return false
  }
}

export default function CookiePopup() {
  const [visible, setVisible] = useState(() => !readConsent())
  if (!visible) return null

  const accept = () => {
    try {
      localStorage.setItem(cookieStorageKey, 'true')
    } catch {
      /* storage unavailable: just hide */
    }
    setVisible(false)
  }

  return (
    <div className="fixed bottom-0 right-0 z-cookie p-[40rem] pointer-events-none mob:p-[14rem]">
      <div className="relative box-border w-[316.8rem] h-[316.8rem] mob:w-[250rem] mob:h-[250rem]">
        <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" aria-hidden="true">
          <path
            className="dotted-stroke"
            fill="#cec9c0"
            strokeWidth="1.15"
            d="M89.183 4.887C91.74 2.33 96.113 4.141 96.113 7.757V92.054C96.113 94.295 94.295 96.113 92.054 96.113H7.757C4.141 96.113 2.33 91.74 4.887 89.183L89.183 4.887Z"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col justify-between items-center [transform:rotate(-45deg)] pt-[172.8rem] px-[43.2rem] mob:pt-[125rem] mob:px-[20rem]">
          <TypewriterText as="h1" text={cookieText} speed="fast" className="t-para text-center m-0" />
          <div className="pointer-events-auto">
            <CtaButton label={ui.ok} onClick={accept} className="text-start" /* original OK is not a <button>: start-aligned */ />
          </div>
        </div>
      </div>
    </div>
  )
}
