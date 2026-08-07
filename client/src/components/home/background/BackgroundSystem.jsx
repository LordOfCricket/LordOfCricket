import GradientLayer from './GradientLayer.jsx'
import AmbientLighting from './AmbientLighting.jsx'
import GlowLayer from './GlowLayer.jsx'
import FloatingParticles from './FloatingParticles.jsx'

/**
 * The homepage's single shared atmosphere. Mounted once (in HomePage.jsx,
 * as the first child), `position: fixed` so it stays pinned to the
 * viewport as the page scrolls — every section below Hero renders on
 * translucent surfaces that let this same layer show through underneath
 * it, which is what makes the whole page read as one environment instead
 * of a Hero with a plain page below it. Hero keeps its own existing
 * backdrop layered on top of this for its own viewport-height (untouched,
 * Phase 3 doesn't modify Hero.jsx) — both use the same loc-dark/grass/gold
 * palette, so the handoff between them reads as continuous.
 *
 * Four GPU-cheap layers (gradient, drifting light, glow orbs, floating
 * dust) — all transform/opacity only, all frozen under
 * `prefers-reduced-motion` via CSS (index.css), none of it driven by
 * per-frame React work.
 *
 * `-z-10` + `pointer-events-none` + `aria-hidden` keeps this strictly
 * decorative: never intercepts a click or scroll gesture, never announced
 * to screen readers, and — because -z-10 is a large negative value —
 * can't end up above real content regardless of what z-index a future
 * section adds.
 */
export default function BackgroundSystem() {
  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden" aria-hidden="true">
      <GradientLayer />
      <AmbientLighting />
      <GlowLayer />
      <FloatingParticles />
    </div>
  )
}
