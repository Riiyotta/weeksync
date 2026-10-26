// Shared CtaButton "{ Label }" (spec 1.4). Renders <a> when href is given, else <button>.
// Braces/label use <span> (block flex items) instead of <p> so the markup is valid inside <button>.
export default function CtaButton({ label, href, onClick, light = false, target, rel, className = '' }) {
  const color = light ? 'text-landing-white' : 'text-landing-black'
  const cls = `flex items-center justify-center gap-[7.2rem] hover:gap-[14.4rem] bg-transparent border-0 p-0 no-underline font-mono font-semibold text-para mob:text-para-m antialiased whitespace-nowrap cursor-pointer [transition:all_.2s_ease] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-landing-black ${color} ${className}`
  const content = (
    <>
      <span className="relative top-[-.1em]">{'{'}</span>
      <span>{label}</span>
      <span className="relative top-[-.1em]">{'}'}</span>
    </>
  )
  if (href) {
    return (
      <a className={cls} href={href} target={target} rel={rel} aria-label={label}>
        {content}
      </a>
    )
  }
  return (
    <button type="button" className={cls} onClick={onClick} aria-label={label}>
      {content}
    </button>
  )
}
