import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

export default function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => {
    // smooth scroll to top on route change
    window.scrollTo({ top: 0, left: 0, behavior: 'smooth' })

    // add a short fade/slide animation to main content
    const el = document.getElementById('app-main')
    if (el) {
      el.classList.remove('page-enter')
      // force reflow so removing the class takes effect
      // eslint-disable-next-line @typescript-eslint/no-unused-expressions
      void el.offsetWidth
      el.classList.add('page-enter')

      const onAnimEnd = () => {
        el.classList.remove('page-enter')
        el.removeEventListener('animationend', onAnimEnd)
      }

      el.addEventListener('animationend', onAnimEnd)
    }
  }, [pathname])
  return null
}
