import { findGroundsOwnedByUser } from '../models/groundUser.model.js'
import { findMatchesByGroundId, findMatchById, findMatchByIdWithTeams } from '../models/match.model.js'
import { findSlotsByMatch } from '../models/matchUmpireSlot.model.js'
import * as matchService from './match.service.js'
import { createNotification } from './groundNotification.service.js'

function badRequest(message) {
  const err = new Error(message)
  err.statusCode = 400
  return err
}

function notFound(message) {
  const err = new Error(message)
  err.statusCode = 404
  return err
}

// Every ground-owner-scoped match action shares this same check: `ground`
// is the authorized row requireGroundRole already resolved from the URL's
// :publicGroundId (never client-supplied); this additionally confirms the
// TARGET match actually belongs to THAT ground before any lifecycle action
// touches it — a 404, not a 403, so an owner can never even confirm another
// ground's match exists by probing match ids.
async function resolveOwnedMatch(ground, matchId) {
  const match = await findMatchById(matchId)
  if (!match || match.ground_id !== ground.id) {
    throw notFound('Match not found for this ground.')
  }
  return match
}

async function notifyAssignedUmpires(matchId, { type, title, body }) {
  const slots = await findSlotsByMatch(matchId)
  const umpireUserIds = slots.filter((s) => s.status === 'ASSIGNED' && s.umpire_user_id).map((s) => s.umpire_user_id)
  await Promise.all(umpireUserIds.map((userId) => createNotification({ userId, type, title, body, relatedMatchId: matchId })))
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

// U8 hardening fix: oversPerInnings/ballsPerOver were never accepted here at
// all (only teams/date/requiredUmpires) — every ground-owner-created match
// silently got oversPerInnings=NULL, which means "no overs limit" to the
// scoring engine, so an innings can never auto-complete from overs bowled.
// Discovered by the U8 end-to-end test actually playing a match out via
// real scoring, not the status-shortcut every earlier test used. Both are
// optional, same as the legacy POST /matches — omitting them keeps prior
// behavior for any caller that only ever sent the original 4 fields.
export async function createGroundMatch(ground, { teamAId, teamBId, matchDate, requiredUmpires, oversPerInnings, ballsPerOver }) {
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
    oversPerInnings,
    ballsPerOver,
    groundId: ground.id,
    venue: ground.name,
  })
}

// Ground-owner-scoped umpire staffing detail — same real per-slot data
// (findSlotsByMatch, already returns umpire_name via its own LEFT JOIN
// users) the generic /matches/:matchId/umpire-slots route already exposes,
// just properly scoped to the authorized owner of the match's own ground
// rather than any authenticated user. No phone number: users has no phone
// column anywhere in this schema — never fabricated, simply not returned.
export async function getMatchUmpireSlots(ground, matchId) {
  await resolveOwnedMatch(ground, matchId)
  return findSlotsByMatch(matchId)
}

// "Match is Starting" — reuses match.service.js#startMatch verbatim (toss/
// playing-XI/understaffed preconditions all unchanged, exactly the same
// function the assigned umpire's own /matches/:id/start already calls) —
// this route only adds WHO may call it for a ground-owned match.
export async function startGroundMatch(ground, matchId, { confirmUnderstaffed = false } = {}) {
  await resolveOwnedMatch(ground, matchId)
  const match = await matchService.startMatch(matchId, { confirmUnderstaffed })
  const withTeams = await findMatchByIdWithTeams(matchId)
  await notifyAssignedUmpires(matchId, {
    type: 'MATCH_STARTING',
    title: 'Your assigned match is starting',
    body: `${withTeams.team_a_name} vs ${withTeams.team_b_name} is now live.`,
  })
  return match
}

// "Match is Over" — reuses match.service.js#completeMatchManually (idempotent
// no-op if the scoring engine already auto-completed it, otherwise a manual
// NO_RESULT transition). Only notifies on a REAL transition, never on the
// no-op branch (the umpire already effectively knows scoring ended, and a
// duplicate notification for the same event would be noise).
export async function completeGroundMatch(ground, matchId) {
  await resolveOwnedMatch(ground, matchId)
  const { match, transitioned } = await matchService.completeMatchManually(matchId)
  if (transitioned) {
    const withTeams = await findMatchByIdWithTeams(matchId)
    await notifyAssignedUmpires(matchId, {
      type: 'MATCH_COMPLETED',
      title: 'Your match has ended',
      body: `${withTeams.team_a_name} vs ${withTeams.team_b_name} at ${ground.name} has ended.`,
    })
  }
  return match
}
