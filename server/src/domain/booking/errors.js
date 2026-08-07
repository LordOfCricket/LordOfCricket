// Phase 14 Part 3 — structured booking domain errors, same shape/convention
// as domain/scoring/errors.js so errorHandler.js can treat them identically.

export const BOOKING_ERROR_CODES = Object.freeze({
  INVALID_DATE: 'INVALID_DATE',
  PAST_TIME: 'PAST_TIME',
  INVALID_SLOT: 'INVALID_SLOT',
  BOOKING_CONFLICT: 'BOOKING_CONFLICT',
  BOOKING_NOT_FOUND: 'BOOKING_NOT_FOUND',
  ALREADY_CANCELLED: 'ALREADY_CANCELLED',
  FORBIDDEN: 'FORBIDDEN',
})

export class BookingError extends Error {
  constructor(code, message, details = {}) {
    super(message)
    this.name = 'BookingError'
    this.code = code
    this.details = details
  }
}

export const BOOKING_ERROR_HTTP_STATUS = Object.freeze({
  [BOOKING_ERROR_CODES.INVALID_DATE]: 400,
  [BOOKING_ERROR_CODES.PAST_TIME]: 400,
  [BOOKING_ERROR_CODES.INVALID_SLOT]: 400,
  [BOOKING_ERROR_CODES.BOOKING_CONFLICT]: 409,
  [BOOKING_ERROR_CODES.BOOKING_NOT_FOUND]: 404,
  [BOOKING_ERROR_CODES.ALREADY_CANCELLED]: 409,
  [BOOKING_ERROR_CODES.FORBIDDEN]: 403,
})
