import rateLimit from 'express-rate-limit'
import { logger } from '../utils/logger.js'

// Phase 19 Feature 5 — rate limiting for the endpoint classes the spec calls
// out by name (login, AI, booking, public search, commentary, analytics).
// In-memory store (express-rate-limit's default) — correct for LOC's current
// single-instance deployment; see docs/DEPLOYMENT.md for the note on what a
// multi-instance deployment would need instead (a shared store).
//
// Every limiter logs a warning (not an error — this is expected, not a bug)
// so repeated hits are visible in the server log without being noisy per
// request.

function makeLimiter({ windowMs, max, message }) {
  return rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    message: { message },
    handler: (req, res, _next, options) => {
      logger.warn('Rate limit exceeded', { path: req.originalUrl, ip: req.ip })
      res.status(options.statusCode).json(options.message)
    },
  })
}

// Brute-force protection on credential endpoints — tight window, low ceiling.
export const authLimiter = makeLimiter({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: 'Too many attempts. Please try again later.',
})

// AI calls cost real money and latency per request.
export const aiLimiter = makeLimiter({
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: 'Too many AI requests. Please try again later.',
})

// Booking/block creation — generous enough for legitimate staff/customer use,
// tight enough to blunt a scripted slot-grabbing attempt.
export const bookingWriteLimiter = makeLimiter({
  windowMs: 10 * 60 * 1000,
  max: 30,
  message: 'Too many booking requests. Please try again shortly.',
})

// Public search/discovery — no login, so this is the main abuse surface.
export const searchLimiter = makeLimiter({
  windowMs: 5 * 60 * 1000,
  max: 120,
  message: 'Too many search requests. Please slow down.',
})

// Commentary is polled by live-match viewers, so the ceiling is high —
// this exists to blunt scripted scraping, not normal spectators.
export const commentaryLimiter = makeLimiter({
  windowMs: 5 * 60 * 1000,
  max: 300,
  message: 'Too many requests. Please slow down.',
})

// Analytics/comparison reads recompute over real match history.
export const analyticsLimiter = makeLimiter({
  windowMs: 5 * 60 * 1000,
  max: 120,
  message: 'Too many analytics requests. Please slow down.',
})
