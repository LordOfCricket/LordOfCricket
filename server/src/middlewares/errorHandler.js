import { SCORING_ERROR_HTTP_STATUS } from '../domain/scoring/errors.js'
import { BOOKING_ERROR_HTTP_STATUS } from '../domain/booking/errors.js'

export function notFound(req, res, next) {
  res.status(404).json({ message: `Route not found: ${req.originalUrl}` })
}

// Domain error classes that carry a structured `code` (see
// domain/scoring/errors.js, domain/booking/errors.js) so callers can branch
// on it instead of parsing message strings. Each domain owns its own
// code -> HTTP status map; this stays a thin dispatcher, not a place to add
// per-domain logic.
const DOMAIN_ERROR_HTTP_STATUS_MAPS = [SCORING_ERROR_HTTP_STATUS, BOOKING_ERROR_HTTP_STATUS]

export function errorHandler(err, req, res, next) {
  if (err.code) {
    for (const statusMap of DOMAIN_ERROR_HTTP_STATUS_MAPS) {
      if (statusMap[err.code]) {
        return res.status(statusMap[err.code]).json({ code: err.code, message: err.message, details: err.details })
      }
    }
  }
  const status = err.statusCode || 500
  res.status(status).json({ message: err.message || 'Internal Server Error' })
}
