export function notFound(req, res, next) {
  res.status(404).json({ message: `Route not found: ${req.originalUrl}` })
}

export function errorHandler(err, req, res, next) {
  const status = err.statusCode || 500
  res.status(status).json({ message: err.message || 'Internal Server Error' })
}
