// Structured domain errors for umpire match-slot assignment, same
// shape/convention as domain/scoring/errors.js and domain/booking/errors.js
// so errorHandler.js can dispatch on them identically.

export const UMPIRE_ASSIGNMENT_ERROR_CODES = Object.freeze({
  MATCH_NOT_FOUND: 'MATCH_NOT_FOUND',
  NOT_APPROVED_UMPIRE: 'NOT_APPROVED_UMPIRE',
  MATCH_NOT_ELIGIBLE: 'MATCH_NOT_ELIGIBLE',
  ALREADY_ASSIGNED: 'ALREADY_ASSIGNED',
  NO_SLOT_AVAILABLE: 'NO_SLOT_AVAILABLE',
  ASSIGNMENT_NOT_FOUND: 'ASSIGNMENT_NOT_FOUND',
})

export class UmpireAssignmentError extends Error {
  constructor(code, message, details = {}) {
    super(message)
    this.name = 'UmpireAssignmentError'
    this.code = code
    this.details = details
  }
}

export const UMPIRE_ASSIGNMENT_ERROR_HTTP_STATUS = Object.freeze({
  [UMPIRE_ASSIGNMENT_ERROR_CODES.MATCH_NOT_FOUND]: 404,
  [UMPIRE_ASSIGNMENT_ERROR_CODES.NOT_APPROVED_UMPIRE]: 403,
  [UMPIRE_ASSIGNMENT_ERROR_CODES.MATCH_NOT_ELIGIBLE]: 409,
  [UMPIRE_ASSIGNMENT_ERROR_CODES.ALREADY_ASSIGNED]: 409,
  [UMPIRE_ASSIGNMENT_ERROR_CODES.NO_SLOT_AVAILABLE]: 409,
  [UMPIRE_ASSIGNMENT_ERROR_CODES.ASSIGNMENT_NOT_FOUND]: 404,
})
