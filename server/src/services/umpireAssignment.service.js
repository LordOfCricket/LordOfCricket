import { findMatchById } from '../models/match.model.js'
import { isApprovedUmpireUser } from '../models/umpireRequest.model.js'
import { findSlotsByMatch, hasActiveSlotAssignment, claimAvailableSlot, cancelMyAssignment } from '../models/matchUmpireSlot.model.js'
import { UmpireAssignmentError, UMPIRE_ASSIGNMENT_ERROR_CODES as CODES } from '../domain/umpireAssignment/errors.js'

export async function listSlots(matchId) {
  const match = await findMatchById(matchId)
  if (!match) return null
  return findSlotsByMatch(matchId)
}

// Gate 1 (approved umpire) is re-checked here, independently of
// requireScorer/requireMatchScorer — this route sits behind plain
// requireAuth only, since there is (by definition) no existing assignment
// yet for requireMatchScorer's Gate 2 to check.
export async function applyForSlot({ matchId, user }) {
  const match = await findMatchById(matchId)
  if (!match) throw new UmpireAssignmentError(CODES.MATCH_NOT_FOUND, 'Match not found.')

  if (!(await isApprovedUmpireUser(user))) {
    throw new UmpireAssignmentError(CODES.NOT_APPROVED_UMPIRE, 'Only an approved umpire may apply to umpire a match.')
  }

  // Applications close once the match leaves 'upcoming' — matches the
  // brief's explicit UPCOMING-only table; LIVE/COMPLETED/FINALIZED all deny.
  if (match.status !== 'upcoming') {
    throw new UmpireAssignmentError(CODES.MATCH_NOT_ELIGIBLE, 'This match is no longer accepting umpire applications.')
  }

  if (await hasActiveSlotAssignment(matchId, user.id)) {
    throw new UmpireAssignmentError(CODES.ALREADY_ASSIGNED, 'You are already assigned to umpire this match.')
  }

  let slot
  try {
    slot = await claimAvailableSlot(matchId, user.id)
  } catch (err) {
    // The partial unique index (match_id, umpire_user_id) WHERE
    // status='ASSIGNED' is the real concurrency backstop for this same
    // scenario (two of THIS user's own concurrent applies racing for two
    // different open slots) — the pre-check above closes the common case,
    // this closes the race the pre-check can't.
    if (err.code === '23505') {
      throw new UmpireAssignmentError(CODES.ALREADY_ASSIGNED, 'You are already assigned to umpire this match.')
    }
    throw err
  }
  if (!slot) {
    throw new UmpireAssignmentError(CODES.NO_SLOT_AVAILABLE, 'No umpire slot is available for this match.')
  }
  return slot
}

export async function cancelAssignment({ matchId, user, reason }) {
  const match = await findMatchById(matchId)
  if (!match) throw new UmpireAssignmentError(CODES.MATCH_NOT_FOUND, 'Match not found.')

  // U3.1 product decision: self-cancellation is UPCOMING-only, same window
  // as application. Once a match goes live, an umpire stepping away is an
  // operational/replacement problem (a match now needs a replacement
  // umpire, not just an empty slot) — not something normal self-cancel
  // should handle silently. A replacement-umpire workflow is explicitly
  // deferred to a later phase; this only closes the self-service path.
  if (match.status !== 'upcoming') {
    throw new UmpireAssignmentError(CODES.MATCH_NOT_ELIGIBLE, 'This match is no longer eligible for umpire assignment changes.')
  }

  // Scoped to (matchId, user.id) inside cancelMyAssignment's WHERE clause —
  // never a slot id supplied by the caller — so this can only ever cancel
  // the CALLING user's own assignment.
  const slot = await cancelMyAssignment(matchId, user.id, reason ?? null)
  if (!slot) {
    throw new UmpireAssignmentError(CODES.ASSIGNMENT_NOT_FOUND, 'You do not have an active umpire assignment for this match.')
  }
  return slot
}
