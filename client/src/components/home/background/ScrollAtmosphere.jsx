import { useEffect } from 'react'
import { motion, useMotionValue, useReducedMotion, useSpring, useTransform } from 'motion/react'

/**
 * Phase 5 — a barely-perceptible scroll-linked brightness "breathe" on the
 * lighting layers (Ambient + Glow) only, so depth evolves gently as the
 * user moves through the page instead of every layer staying perfectly
 * static. Independent of Phase 4's ParallaxLayer (that tracks the cursor;
 * this tracks scroll position) — the two nest without conflict since each
 * drives a different style on a different DOM node.
 *
 * Uses a plain `window` scroll listener rather than `useScroll()` — this
 * page has no scrollable container ref to target (Lenis runs in `root`
 * mode with no wrapper div, per SmoothScrollProvider.jsx), and `useScroll()`
 * with no `target` did not pick up Lenis-driven scroll here (its
 * `scrollYProgress` stayed pinned at its mount-time value). A direct
 * `scroll` listener is what Lenis itself dispatches on `window` as it
 * updates the real scroll position, so this tracks it reliably.
 */
export default function ScrollAtmosphere({ children, className = '' }) {
  const reduceMotion = useReducedMotion()
  const rawProgress = useMotionValue(0)
  const progress = useSpring(rawProgress, { stiffness: 60, damping: 20, mass: 0.5 })
  const opacity = useTransform(progress, [0, 0.5, 1], [0.85, 1, 0.85])

  useEffect(() => {
    if (reduceMotion) return undefined

    const updateProgress = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight
      rawProgress.set(max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0)
    }

    updateProgress()
    window.addEventListener('scroll', updateProgress, { passive: true })
    window.addEventListener('resize', updateProgress)
    return () => {
      window.removeEventListener('scroll', updateProgress)
      window.removeEventListener('resize', updateProgress)
    }
  }, [reduceMotion, rawProgress])

  if (reduceMotion) {
    return <div className={className}>{children}</div>
  }

  return (
    <motion.div className={className} style={{ opacity }}>
      {children}
    </motion.div>
  )
}
