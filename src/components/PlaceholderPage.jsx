import { useEffect } from 'react'
import { brand } from '../content.js'
import CtaButton from './CtaButton.jsx'

// Stand-in for the original's legal and login routes, which the clone does not reproduce.
// Drops the landing-page scroll lock so the page scrolls natively at every width.
export default function PlaceholderPage({ page }) {
  useEffect(() => {
    document.documentElement.classList.remove('landing-page')
    document.body.classList.remove('landing-page')
    document.title = `${page.title} — ${brand.name}`
  }, [page])

  return (
    <main className="min-h-screen w-full bg-landing-gray flex items-center justify-center p-pad-section">
      <div className="max-w-[720rem] w-full flex flex-col items-center gap-[28.8rem] bg-landing-beige rounded-landing p-[72rem] mob:p-[30rem]">
        <h1 className="t-title text-center">{page.title}</h1>
        <p className="t-para text-center">{page.text}</p>
        <CtaButton label="Back to home" href="/" />
      </div>
    </main>
  )
}
