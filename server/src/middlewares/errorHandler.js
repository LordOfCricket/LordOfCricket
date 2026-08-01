import { SCORING_ERROR_HTTP_STATUS } from '../domain/scoring/errors.js'

export function notFound(req, res, next) {
  res.status(404).json({ message: `Route not found: ${req.originalUrl}` })
}

export function errorHandler(err, req, res, next) {
  // ScoringError carries a structured `code` (see domain/scoring/errors.js) so
  // callers can branch on it instead of parsing message strings.
  if (err.code && SCORING_ERROR_HTTP_STATUS[err.code]) {
    return res.status(SCORING_ERROR_HTTP_STATUS[err.code]).json({ code: err.code, message: err.message, details: err.details })
  }
  const status = err.statusCode || 500
  res.status(status).json({ message: err.message || 'Internal Server Error' })
}
