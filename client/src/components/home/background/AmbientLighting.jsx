/**
 * Layer 2 — one large, very slow-moving soft light sweep, suggesting a
 * distant floodlight beam drifting along the stadium roofline. Deliberately
 * a single element: this is atmosphere, not a light show.
 */
export default function AmbientLighting() {
  return (
    <div
      className="loc-bg-light-sweep absolute -top-1/4 left-1/2 h-[70vh] w-[140vw] -translate-x-1/2 opacity-25 blur-2xl sm:opacity-40 sm:blur-3xl"
      style={{
        background:
          'radial-gradient(ellipse 50% 60% at 50% 0%, color-mix(in srgb, var(--color-loc-gold) 16%, transparent), transparent 70%)',
      }}
    />
  )
}
