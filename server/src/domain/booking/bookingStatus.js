// Phase 18 Feature 9 — booking status. LOC's `ground_bookings` model has no
// manual approval step (Phase 14: auto-confirm by design — the EXCLUDE
// constraint is the only gate, documented deliberately as "the smallest flow
// consistent with this app's existing auth architecture"). PENDING/REJECTED/
// EXPIRED therefore never occur as real states in this system — rather than
// silently pretending they do, this module derives exactly the states that
// ARE real: the stored `CONFIRMED`/`CANCELLED` plus a computed `COMPLETED`
// (a confirmed booking whose slot has already passed). `CONFIRMED` is
// displayed as "Approved" — the closest honest equivalent, since auto-confirm
// IS the approval in this system (see docs/TECHNICAL_DEBT.md for the
// documented scope decision).

export function deriveDisplayStatus(booking, now = new Date()) {
  if (booking.status === 'CANCELLED') return 'CANCELLED'
  if (new Date(booking.end_time).getTime() <= now.getTime()) return 'COMPLETED'
  return 'APPROVED'
}

const VALID_TRANSITIONS = { CONFIRMED: ['CANCELLED'], CANCELLED: [] }

/** Validates a STORED status transition (never the derived COMPLETED display state, which is never a transition target). */
export function isValidStatusTransition(fromStatus, toStatus) {
  return Boolean(VALID_TRANSITIONS[fromStatus]?.includes(toStatus))
}
