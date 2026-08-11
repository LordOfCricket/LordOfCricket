import { findGroundsOwnedByUser } from '../models/groundUser.model.js'
import { findMatchesByGroundId } from '../models/match.model.js'
import * as matchService from './match.service.js'

function badRequest(message) {
  const err = new Error(message)
  err.statusCode = 400
  return err
}

// Slot aggregates cover 'upcoming'/'live' matches only — a completed/
// finalized match's umpire slots are history, not something the owner needs
// to see filling. upcomingMatchesCount stays strictly 'upcoming' (matches
// the dashboard's own "Upcoming Matches" label).
export async function listMyGrounds(userId) {
  const grounds = await findGroundsOwnedByUser(userId)
  return Promise.all(
    grounds.map(async (ground) => {
      const matches = await findMatchesByGroundId(ground.id)
      const relevant = matches.filter((m) => m.status === 'upcoming' || m.status === 'live')
      return {
        ...ground,
        upcomingMatchesCount: matches.filter((m) => m.status === 'upcoming').length,
        umpireSlotsTotal: relevant.reduce((sum, m) => sum + m.total_slots, 0),
        umpireSlotsFilled: relevant.reduce((sum, m) => sum + m.filled_slots, 0),
      }
    }),
  )
}

// `ground` is already the authorized, resolved row requireGroundRole
// attached to req.ground — ground.id here is never client-supplied.
export async function listGroundMatches(ground) {
  return findMatchesByGroundId(ground.id)
}

export async function createGroundMatch(ground, { teamAId, teamBId, matchDate, requiredUmpires }) {
  if (ground.status !== 'ACTIVE') {
    throw badRequest(`This ground is '${ground.status}' and cannot have matches created for it yet.`)
  }
  // Reuses match.service.js#createMatch exactly — the SAME function
  // POST /matches calls — so team validation, date validation, and
  // transaction-safe umpire-slot creation (U3) are never duplicated here.
  // groundId comes from the authorized ground context, never client input —
  // closing the "arbitrary groundId" gap flagged back in U3.1.
  return matchService.createMatch({
    teamAId,
    teamBId,
    matchDate,
    requiredUmpires,
    groundId: ground.id,
    venue: ground.name,
  })
}
