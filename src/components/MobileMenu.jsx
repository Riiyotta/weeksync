import { useState } from 'react'
import { links, nav, ui } from '../content.js'

// Fixed mobile menu bar + full-screen overlay (spec 4.4 item 3). Hidden >= 1024px.
const barBtn =
  'font-mono text-menu-bar font-normal pointer-events-auto items-center p-0 m-0 border-0 bg-transparent cursor-pointer underline decoration-dotted decoration-current decoration-[length:.11em] underline-offset-[.3em]'

export default function MobileMenu() {
  const [open, setOpen] = useState(false)
  const color = open ? 'text-[#ffffff]' : 'text-landing-black'

  return (
    <div className="fixed top-0 left-0 right-0 z-menu pointer-events-none desk:hidden">
      <div className="relative z-[2] flex justify-between w-full p-[20rem]">
        <button type="button" className={`${barBtn} ${color}`} aria-expanded={open} onClick={() => setOpen((o) => !o)}>
          <span className="italic">{open ? ui.close : ui.menu}</span>
        </button>
        <a href={links.login} className={`${barBtn} ${color}`}>
          <span className="italic">{ui.startNowMobile}</span>
        </a>
      </div>
      <div
        className={`fixed inset-0 z-[1] bg-[#000000] [transition:transform_.35s_cubic-bezier(.22,.61,.36,1)] ${open ? 'translate-y-0 pointer-events-auto' : '-translate-y-full pointer-events-none'}`}
      >
        <nav className="absolute inset-0 pt-[24px] px-[24px] pb-[32px] flex flex-col justify-center items-center gap-[16px]">
          {nav.map((item) => (
            <a
              key={item.target}
              href={`#${item.target}`}
              onClick={() => setOpen(false)}
              className="py-[10rem] border-0 bg-transparent text-center font-inter text-menu-item italic cursor-pointer text-landing-white no-underline"
            >
              {item.label}
            </a>
          ))}
        </nav>
      </div>
    </div>
  )
}
