import GradientLayer from './GradientLayer.jsx'
import FogLayer from './FogLayer.jsx'
import FloodLightRays from './FloodLightRays.jsx'
import AmbientLighting from './AmbientLighting.jsx'
import GlowLayer from './GlowLayer.jsx'
import FloatingParticles from './FloatingParticles.jsx'
import ParallaxLayer from '../../common/ParallaxLayer.jsx'

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
 *
 * Phase 4 — each layer (except FloatingParticles, which already animates)
 * is wrapped in ParallaxLayer for a few px of mouse-parallax, sourced from
 * Hero's pointer listener via MouseParallaxProvider (see HomePage.jsx).
 * Background moves least, glow moves most — a subtle depth cue, not a
 * redesign of any layer. Each wrapper's `absolute inset-0` is pixel-
 * identical to the outer `fixed inset-0` div it sits inside, so every
 * layer's own offsets (-top-32, top-1/3, etc.) resolve exactly as before.
 */
export default function BackgroundSystem() {
  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden" aria-hidden="true">
      <ParallaxLayer strength={3} className="pointer-events-none absolute inset-0">
        <GradientLayer />
      </ParallaxLayer>
      <ParallaxLayer strength={5} className="pointer-events-none absolute inset-0">
        <FogLayer />
      </ParallaxLayer>
      <ParallaxLayer strength={6} className="pointer-events-none absolute inset-0">
        <FloodLightRays />
      </ParallaxLayer>
      <ParallaxLayer strength={4} className="pointer-events-none absolute inset-0">
        <AmbientLighting />
      </ParallaxLayer>
      <ParallaxLayer strength={8} className="pointer-events-none absolute inset-0">
        <GlowLayer />
      </ParallaxLayer>
      <FloatingParticles />
    </div>
  )
}
