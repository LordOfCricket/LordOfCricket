// Phase 5 — real match creation/setup. Deliberately plain thrown Errors with
// `.statusCode` (the generic branch errorHandler.js already had for anything
// that isn't a scoring/correction ScoringError) rather than extending that
// domain's error codes — match setup isn't part of the replay/cricket-rules
// domain, it's request validation, same tier as auth.controller.js's checks.

import { findMatchByIdWithTeams, createMatch as createMatchModel, updateMatch } from '../models/match.model.js'
import { findTeamById } from '../models/team.model.js'
import { findGroundById } from '../models/ground.model.js'
import { countPlayingXiByTeam } from '../repositories/matchPlayer.repository.js'
import { createSlotsForMatch } from '../models/matchUmpireSlot.model.js'
import { pool } from '../config/db.js'

const MIN_PLAYING_XI = 2 // absolute floor: need a striker and a non-striker to start batting
const DEFAULT_MAX_PLAYING_XI = 11

function badRequest(message) {
  const err = new Error(message)
  err.statusCode = 400
  return err
}

function conflict(message) {
  const err = new Error(message)
  err.statusCode = 409
  return err
}

function notFound(message) {
  const err = new Error(message)
  err.statusCode = 404
  return err
}

// groundId/requiredUmpires (U3) are optional — omitted, a match behaves
// exactly as before (ground_id NULL, no umpire slots), matching U1's
// no-fabricated-backfill stance for every match created before this phase.
export async function createMatch({ teamAId, teamBId, venue, matchDate, oversPerInnings, ballsPerOver, rules, groundId, requiredUmpires }) {
  if (!Number.isInteger(teamAId) || !Number.isInteger(teamBId)) {
    throw badRequest('teamAId and teamBId are required.')
  }
  if (teamAId === teamBId) {
    throw badRequest('teamAId and teamBId must be different teams.')
  }
  if (!matchDate || Number.isNaN(new Date(matchDate).getTime())) {
    throw badRequest('matchDate must be a valid date.')
  }
  if (oversPerInnings !== undefined && oversPerInnings !== null && (!Number.isInteger(oversPerInnings) || oversPerInnings <= 0)) {
    throw badRequest('oversPerInnings must be a positive integer.')
  }
  if (ballsPerOver !== undefined && (!Number.isInteger(ballsPerOver) || ballsPerOver <= 0)) {
    throw badRequest('ballsPerOver must be a positive integer.')
  }
  if (requiredUmpires !== undefined && requiredUmpires !== null && (!Number.isInteger(requiredUmpires) || requiredUmpires < 0)) {
    throw badRequest('requiredUmpires must be a non-negative integer.')
  }

  // Never trust frontend-supplied team/ground identity beyond the id — confirm the rows exist.
  const [teamA, teamB, ground] = await Promise.all([
    findTeamById(teamAId),
    findTeamById(teamBId),
    groundId != null ? findGroundById(groundId) : Promise.resolve(undefined),
  ])
  if (!teamA || !teamB) {
    throw badRequest('teamAId and teamBId must reference existing teams.')
  }
  if (groundId != null && !ground) {
    throw badRequest('groundId must reference an existing ground.')
  }

  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const match = await createMatchModel(
      {
        teamAId,
        teamBId,
        venue: venue || null,
        matchDate,
        oversPerInnings: oversPerInnings ?? null,
        ballsPerOver: ballsPerOver ?? 6,
        rules: rules && typeof rules === 'object' ? rules : {},
        groundId: groundId ?? null,
        requiredUmpires: requiredUmpires ?? 0,
      },
      client
    )
    if (match.required_umpires > 0) {
      await createSlotsForMatch(match.id, match.required_umpires, client)
    }
    await client.query('COMMIT')
    return match
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {})
    throw err
  } finally {
    client.release()
  }
}

export async function setToss(matchId, { tossWinnerId, tossDecision }) {
  const match = await findMatchByIdWithTeams(matchId)
  if (!match) throw notFound('Match not found.')
  if (match.status !== 'upcoming') {
    throw conflict(`Cannot set the toss once a match is '${match.status}'.`)
  }
  if (![match.team_a_id, match.team_b_id].includes(tossWinnerId)) {
    throw badRequest('tossWinnerId must be one of the two teams in this match.')
  }
  if (!['bat', 'bowl'].includes(tossDecision)) {
    throw badRequest("tossDecision must be 'bat' or 'bowl'.")
  }

  return updateMatch(matchId, { toss_winner_id: tossWinnerId, toss_decision: tossDecision })
}

/** Derives which team bats first from the toss — the one server-side place
 * this decision is made, so a client never has to (and can't disagree). */
export function battingTeamFromToss(match) {
  if (!match.toss_winner_id || !match.toss_decision) return null
  const otherTeamId = match.toss_winner_id === match.team_a_id ? match.team_b_id : match.team_a_id
  return match.toss_decision === 'bat' ? match.toss_winner_id : otherTeamId
}

export async function startMatch(matchId) {
  const match = await findMatchByIdWithTeams(matchId)
  if (!match) throw notFound('Match not found.')
  if (match.status !== 'upcoming') {
    throw conflict(`Match is already '${match.status}'.`)
  }
  if (!match.toss_winner_id || !match.toss_decision) {
    throw badRequest('Toss must be recorded before starting the match.')
  }

  const maxPlayingXi = match.rules?.maxPlayers || DEFAULT_MAX_PLAYING_XI
  const counts = await countPlayingXiByTeam(match.id)
  for (const [label, teamId] of [
    ['Team A', match.team_a_id],
    ['Team B', match.team_b_id],
  ]) {
    const count = counts.get(teamId) || 0
    if (count < MIN_PLAYING_XI) {
      throw badRequest(`${label} needs at least ${MIN_PLAYING_XI} playing XI players before the match can start (has ${count}).`)
    }
    if (count > maxPlayingXi) {
      throw badRequest(`${label} has ${count} playing XI players, more than this match's limit of ${maxPlayingXi}.`)
    }
  }

  return updateMatch(match.id, { status: 'live' })
}

/** Locks the official record. Only reachable once a result exists — a
 * 'completed' match, never 'upcoming'/'live'. Irreversible by design (no
 * un-finalize path): after this, correction.service.js's MATCH_LOCKED check
 * rejects every correction unconditionally. */
export async function finalizeMatch(matchId) {
  const match = await findMatchByIdWithTeams(matchId)
  if (!match) throw notFound('Match not found.')
  if (match.status === 'finalized') {
    throw conflict('Match is already finalized.')
  }
  if (match.status !== 'completed') {
    throw conflict(`Cannot finalize a match that is '${match.status}' — it must be completed first.`)
  }

  return updateMatch(match.id, { status: 'finalized', finalized_at: new Date() })
}
