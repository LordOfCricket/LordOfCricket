// Phase 20 Feature 1 — fail fast, with a clear message, rather than boot
// into a broken state. `utils/jwt.js` already refuses to boot in production
// without JWT_SECRET (a pre-existing, separate check, left as-is); this
// covers the other variables the app cannot run without in production —
// previously a missing PG_* var surfaced only as an opaque driver error
// ("password authentication failed", "getaddrinfo ENOTFOUND undefined")
// several layers away from the actual cause, and a missing CLIENT_ORIGIN
// silently produced a CORS allow-list of zero origins with no explanation.
//
// Deliberately narrow: only variables the app cannot function without in
// production. Every optional integration (Mongo, Google Calendar, AI,
// Cloudinary, CricAPI) already degrades gracefully by design (see
// docs/ARCHITECTURE.md) and must stay optional here too — this is not the
// place to make an optional feature mandatory.

const REQUIRED_IN_PRODUCTION = ['JWT_SECRET', 'PG_USER', 'PG_HOST', 'PG_DATABASE', 'PG_PASSWORD', 'PG_PORT', 'CLIENT_ORIGIN']

export function validateEnv() {
  if (process.env.NODE_ENV !== 'production') return

  const missing = REQUIRED_IN_PRODUCTION.filter((name) => !process.env[name])
  if (missing.length > 0) {
    throw new Error(`Missing required environment variable(s) in production: ${missing.join(', ')}. See server/.env.example.`)
  }
}
