import { pool } from '../config/db.js'
import { findMatchById, findMatchByIdWithTeams } from '../models/match.model.js'
import { isApprovedUmpireUser } from '../models/umpireRequest.model.js'
import {
  findSlotsByMatch,
  hasActiveSlotAssignment,
  claimAvailableSlot,
  cancelMyAssignment,
  findActiveAssignedMatchesForUmpire,
} from '../models/matchUmpireSlot.model.js'
import { findActiveGroundOwnerUserIds } from '../models/groundUser.model.js'
import { findUserById } from '../models/user.model.js'
import { createNotification } from './groundNotification.service.js'
import { UmpireAssignmentError, UMPIRE_ASSIGNMENT_ERROR_CODES as CODES } from '../domain/umpireAssignment/errors.js'
import { estimateMatchTimeRange } from '../domain/umpireAssignment/matchTimeRange.js'
import { rangesOverlap } from '../domain/booking/availability.js'

// U7 — best-effort, never blocks the primary action (same posture
// groundNotification.service.js's createNotification already guarantees
// internally: it swallows its own write failures). Notifies BOTH the
// umpire (confirming their own status change) and the ground's active
// owner(s), if the match has a real ground — a ground-less legacy match
// simply notifies the umpire only, honestly (no owner to notify).
async function notifySlotEvent(matchId, umpireUserId, type) {
  const [match, umpire, slots] = await Promise.all([findMatchByIdWithTeams(matchId), findUserById(umpireUserId), findSlotsByMatch(matchId)])
  if (!match || !umpire) return

  const matchLabel = `${match.team_a_name} vs ${match.team_b_name}`
  const isAssigned = type === 'UMPIRE_SLOT_ASSIGNED'
  const total = slots.length
  const filled = slots.filter((s) => s.status === 'ASSIGNED').length

  await createNotification({
    userId: umpireUserId,
    type,
    title: isAssigned ? "You're assigned to umpire a match" : 'Your umpire assignment was cancelled',
    body: matchLabel,
    relatedMatchId: matchId,
  })

  if (match.ground_id) {
    const ownerIds = await findActiveGroundOwnerUserIds(match.ground_id)
    await Promise.all(
      ownerIds.map((ownerId) =>
        createNotification({
          userId: ownerId,
          type,
          title: isAssigned ? 'An umpire slot was filled' : 'An umpire slot needs to be refilled',
          body: isAssigned
            ? `${umpire.name} is now assigned to umpire ${matchLabel}. ${filled}/${total} umpire slots filled.`
            : `${umpire.name} cancelled their umpire assignment for ${matchLabel}. ${filled}/${total} umpire slots filled.`,
          relatedMatchId: matchId,
        }),
      ),
    )

    // Distinct, separate signal from the per-assignment notification above —
    // only fires the instant this assignment is what brought the match to
    // fully staffed, not on every assignment.
    if (isAssigned && total > 0 && filled === total) {
      await Promise.all(
        ownerIds.map((ownerId) =>
          createNotification({
            userId: ownerId,
            type: 'UMPIRE_SLOTS_FULLY_STAFFED',
            title: 'All umpire slots are now filled',
            body: `${matchLabel} is fully staffed with umpires.`,
            relatedMatchId: matchId,
          }),
        ),
      )
    }
  }
}

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

  // Everything from here on runs inside one transaction, serialized per
  // umpire by a Postgres advisory lock (pg_advisory_xact_lock, released
  // automatically at COMMIT/ROLLBACK — same transaction shape
  // groundBooking.service.js already uses elsewhere in this codebase).
  // matches has no end time to build a real DB exclusion constraint from
  // (it's derived from a JOINed row, not local columns), so the advisory
  // lock is what closes the "two concurrent brand-new applications for two
  // overlapping matches by the same umpire, both pass a pre-check" race —
  // a second concurrent apply by this same umpire simply waits here, then
  // re-evaluates against whatever the first one just committed.
  const client = await pool.connect()
  let slot
  try {
    await client.query('BEGIN')
    await client.query('SELECT pg_advisory_xact_lock($1)', [user.id])

    if (await hasActiveSlotAssignment(matchId, user.id, client)) {
      throw new UmpireAssignmentError(CODES.ALREADY_ASSIGNED, 'You are already assigned to umpire this match.')
    }

    const candidateRange = estimateMatchTimeRange(match)
    const otherAssignments = await findActiveAssignedMatchesForUmpire(user.id, matchId, client)
    const conflict = otherAssignments.find((other) => {
      const otherRange = estimateMatchTimeRange(other)
      return rangesOverlap(candidateRange.start, candidateRange.end, otherRange.start, otherRange.end)
    })
    if (conflict) {
      throw new UmpireAssignmentError(
        CODES.OVERLAPPING_ASSIGNMENT,
        'You already have an umpire assignment that overlaps with this match\'s time — an umpire can only officiate one match at a time.',
      )
    }

    try {
      slot = await claimAvailableSlot(matchId, user.id, client)
    } catch (err) {
      // The partial unique index (match_id, umpire_user_id) WHERE
      // status='ASSIGNED' is the real concurrency backstop for this same
      // scenario (two of THIS user's own concurrent applies racing for two
      // different open slots on the SAME match) — the pre-check above
      // closes the common case, this closes the race the pre-check can't.
      if (err.code === '23505') {
        throw new UmpireAssignmentError(CODES.ALREADY_ASSIGNED, 'You are already assigned to umpire this match.')
      }
      throw err
    }
    if (!slot) {
      throw new UmpireAssignmentError(CODES.NO_SLOT_AVAILABLE, 'No umpire slot is available for this match.')
    }

    await client.query('COMMIT')
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {})
    throw err
  } finally {
    client.release()
  }

  await notifySlotEvent(matchId, user.id, 'UMPIRE_SLOT_ASSIGNED')
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
  await notifySlotEvent(matchId, user.id, 'UMPIRE_SLOT_CANCELLED')
  return slot
}
