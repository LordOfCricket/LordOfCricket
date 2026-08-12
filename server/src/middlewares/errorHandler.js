import { SCORING_ERROR_HTTP_STATUS } from '../domain/scoring/errors.js'
import { BOOKING_ERROR_HTTP_STATUS } from '../domain/booking/errors.js'
import { TOURNAMENT_ERROR_HTTP_STATUS } from '../domain/tournament/errors.js'
import { UMPIRE_ASSIGNMENT_ERROR_HTTP_STATUS } from '../domain/umpireAssignment/errors.js'
import { FEEDBACK_ERROR_HTTP_STATUS } from '../domain/feedback/errors.js'
import { logger } from '../utils/logger.js'

export function notFound(req, res, next) {
  res.status(404).json({ message: `Route not found: ${req.originalUrl}` })
}

// Domain error classes that carry a structured `code` (see
// domain/scoring/errors.js, domain/booking/errors.js) so callers can branch
// on it instead of parsing message strings. Each domain owns its own
// code -> HTTP status map; this stays a thin dispatcher, not a place to add
// per-domain logic.
const DOMAIN_ERROR_HTTP_STATUS_MAPS = [
  SCORING_ERROR_HTTP_STATUS,
  BOOKING_ERROR_HTTP_STATUS,
  TOURNAMENT_ERROR_HTTP_STATUS,
  UMPIRE_ASSIGNMENT_ERROR_HTTP_STATUS,
  FEEDBACK_ERROR_HTTP_STATUS,
]

export function errorHandler(err, req, res, next) {
  if (err.code) {
    for (const statusMap of DOMAIN_ERROR_HTTP_STATUS_MAPS) {
      if (statusMap[err.code]) {
        return res.status(statusMap[err.code]).json({ code: err.code, message: err.message, details: err.details })
      }
    }
  }
  if (err.statusCode) {
    // U9: a plain statusCode error (match.service.js's own convention — see
    // its file header) can still carry structured `details` the same shape
    // domain errors already expose, e.g. startMatch's understaffed-warning
    // slot counts. Omitted entirely when absent, matching the previous
    // response shape exactly for every existing caller.
    return res.status(err.statusCode).json({ message: err.message, ...(err.details ? { details: err.details } : {}) })
  }

  // Unexpected error (programming bug, raw DB/driver error, etc.) — never
  // leak internal details (message, stack, driver hints) to the client.
  // Full detail goes to the server log only.
  logger.error('Unhandled request error', {
    method: req.method,
    path: req.originalUrl,
    error: err.message,
    stack: err.stack,
  })
  res.status(500).json({ message: 'Internal Server Error' })
}
