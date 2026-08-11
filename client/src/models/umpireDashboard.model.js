// U4 — pure helpers for the umpire dashboard/available-matches/my-assignments/
// profile pages. No API calls here; hooks own fetching, these just shape data
// the backend already returned.

export function slotSummary(match) {
  const total = match?.total_slots ?? 0
  const filled = match?.filled_slots ?? 0
  return { total, filled, open: Math.max(total - filled, 0) }
}

// Buckets by the MATCH's lifecycle, not the slot's — an ASSIGNED slot on a
// completed/finalized match stays ASSIGNED forever today (nothing
// transitions it to COMPLETED yet, a later phase's job), so match status is
// the only reliable signal for "is this still upcoming/live/in the past".
// Only ASSIGNED slots are "mine to act on" — CANCELLED history isn't shown
// here (U4 explicitly defers advanced history).
export function bucketAssignments(assignments) {
  const upcoming = []
  const live = []
  const completed = []
  for (const a of assignments || []) {
    if (a.status !== 'ASSIGNED') continue
    if (a.match_status === 'live') live.push(a)
    else if (a.match_status === 'upcoming') upcoming.push(a)
    else completed.push(a)
  }
  return { upcoming, live, completed }
}

// Mirrors the backend exactly (umpireAssignment.service.js's cancelAssignment,
// U3.1: self-cancel is upcoming-only) — the frontend gate is UX only, the
// backend remains authoritative regardless of what this returns.
export function canCancelAssignment(assignment) {
  return assignment?.status === 'ASSIGNED' && assignment?.match_status === 'upcoming'
}

export function canEnterScoring(assignment) {
  return assignment?.status === 'ASSIGNED' && assignment?.match_status === 'live'
}

// Maps the backend's UmpireAssignmentError codes (domain/umpireAssignment/
// errors.js) to a message an umpire can act on — covers the race-condition
// case explicitly (U4's "handle 409 gracefully" requirement).
export function applyErrorMessage(code, fallback) {
  switch (code) {
    case 'NO_SLOT_AVAILABLE':
      return 'This umpire slot was just filled by another umpire.'
    case 'ALREADY_ASSIGNED':
      return "You're already assigned to umpire this match."
    case 'MATCH_NOT_ELIGIBLE':
      return 'This match is no longer accepting umpire applications.'
    case 'NOT_APPROVED_UMPIRE':
      return 'Your umpire approval is no longer active.'
    case 'MATCH_NOT_FOUND':
      return 'This match no longer exists.'
    default:
      return fallback || 'Unable to apply for this match.'
  }
}

export function cancelErrorMessage(code, fallback) {
  switch (code) {
    case 'MATCH_NOT_ELIGIBLE':
      return 'This match is no longer eligible for cancellation.'
    case 'ASSIGNMENT_NOT_FOUND':
      return "You don't have an active assignment for this match."
    case 'MATCH_NOT_FOUND':
      return 'This match no longer exists.'
    default:
      return fallback || 'Unable to cancel this assignment.'
  }
}
