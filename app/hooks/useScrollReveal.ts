'use client'
import { useEffect, useRef, useState } from 'react'

/**
 * Attach `ref` to an element; `revealed` flips to true (and stays true) the first time it scrolls
 * into view, then the observer disconnects — the entrance never replays on scroll-up/scroll-down.
 * Pair with the `.scroll-reveal` / `.is-revealed` classes in ui.css, which own the motion entirely:
 * under `prefers-reduced-motion: reduce` those classes have no effect at all, so this hook doesn't
 * need its own reduced-motion branch.
 */
export function useScrollReveal<T extends Element>(threshold = 0.15) {
  const ref = useRef<T>(null)
  const [revealed, setRevealed] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    // No observer, no reveal to withhold — show the content rather than hide it forever.
    if (typeof IntersectionObserver === 'undefined') {
      setRevealed(true)
      return
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setRevealed(true)
          observer.disconnect()
        }
      },
      { threshold },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [threshold])

  return { ref, revealed }
}
