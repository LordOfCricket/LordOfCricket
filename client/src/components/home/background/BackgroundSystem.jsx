import GradientLayer from './GradientLayer.jsx'
import FogLayer from './FogLayer.jsx'
import FloodLightRays from './FloodLightRays.jsx'
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
 * Six GPU-cheap layers (gradient, fog, floodlight rays, drifting light,
 * glow orbs, floating dust) — all transform/opacity only, all frozen under
 * `prefers-reduced-motion` via CSS (index.css), none of it driven by
 * per-frame React work.
 *
 * FogLayer and FloodLightRays are new (stadium-atmosphere pass): fog sits
 * right above the base gradient so it reads as haze the rest of the scene
 * sits behind, and the floodlight rays sit above that so they read as
 * cutting through it — both land before the existing AmbientLighting/
 * GlowLayer/FloatingParticles, which keep their exact original relative
 * order and implementation.
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
      <FogLayer />
      <FloodLightRays />
      <AmbientLighting />
      <GlowLayer />
      <FloatingParticles />
    </div>
  )
}
