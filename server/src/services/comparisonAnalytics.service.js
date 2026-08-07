// Phase 17 — Player vs. Player and Team vs. Team comparison. No composite
// "winner"/score is ever computed (Part 33 — "show side-by-side facts, users
// decide"); this reuses statistics.service.js/team.repository.js/
// domain/team/teamRecord.js and domain/analytics/headToHead.js entirely —
// zero new cricket derivation, purely side-by-side assembly.

import { findTeamById } from '../models/team.model.js'
import * as statsRepo from '../repositories/statistics.repository.js'
import * as teamRepo from '../repositories/team.repository.js'
import * as analyticsRepo from '../repositories/analytics.repository.js'
import * as statisticsService from './statistics.service.js'
import { buildTeamRecord } from '../domain/team/teamRecord.js'
import { computeAverageInnings } from '../domain/analytics/teamAverages.js'
import { computeHeadToHead } from '../domain/analytics/headToHead.js'

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

export async function comparePlayers(publicPlayerIdA, publicPlayerIdB) {
  if (!publicPlayerIdA || !publicPlayerIdB) throw badRequest('Two distinct player ids are required.')
  if (publicPlayerIdA === publicPlayerIdB) throw badRequest('Cannot compare a player to themselves.')

  const [rowA, rowB] = await Promise.all([statsRepo.findPublicPlayerByPublicId(publicPlayerIdA), statsRepo.findPublicPlayerByPublicId(publicPlayerIdB)])
  if (!rowA) throw notFound(`Player not found: ${publicPlayerIdA}`)
  if (!rowB) throw notFound(`Player not found: ${publicPlayerIdB}`)

  const [statsA, statsB] = await Promise.all([
    statisticsService.getPlayerCareerStats(rowA.id, { matchHistoryLimit: 0 }),
    statisticsService.getPlayerCareerStats(rowB.id, { matchHistoryLimit: 0 }),
  ])

  return { playerA: { player: statsA.player, career: statsA.career }, playerB: { player: statsB.player, career: statsB.career } }
}

export async function compareTeams(teamIdA, teamIdB) {
  if (!/^\d+$/.test(String(teamIdA)) || !/^\d+$/.test(String(teamIdB))) throw notFound('Team not found.')
  if (String(teamIdA) === String(teamIdB)) throw badRequest('Cannot compare a team to itself.')

  const [teamA, teamB] = await Promise.all([findTeamById(teamIdA), findTeamById(teamIdB)])
  if (!teamA) throw notFound(`Team not found: ${teamIdA}`)
  if (!teamB) throw notFound(`Team not found: ${teamIdB}`)

  const [matchesA, matchesB, headToHeadRows] = await Promise.all([
    teamRepo.listFinalizedMatchesForTeam(teamA.id),
    teamRepo.listFinalizedMatchesForTeam(teamB.id),
    analyticsRepo.listHeadToHeadMatches(teamA.id, teamB.id),
  ])

  const ownInningsRunsFor = async (teamId) => {
    const rows = await analyticsRepo.listTeamInningsForFinalizedMatches(teamId)
    const own = new Map()
    for (const r of rows) {
      if (r.batting_team_id === teamId) own.set(r.match_id, r.runs)
    }
    return [...own.values()]
  }
  const [runsA, runsB] = await Promise.all([ownInningsRunsFor(teamA.id), ownInningsRunsFor(teamB.id)])

  return {
    teamA: { team: { id: teamA.id, name: teamA.name, shortName: teamA.short_name, logoUrl: teamA.logo_url }, record: buildTeamRecord(matchesA, teamA.id), averageScore: computeAverageInnings(runsA) },
    teamB: { team: { id: teamB.id, name: teamB.name, shortName: teamB.short_name, logoUrl: teamB.logo_url }, record: buildTeamRecord(matchesB, teamB.id), averageScore: computeAverageInnings(runsB) },
    headToHead: computeHeadToHead(headToHeadRows, teamA.id, teamB.id),
  }
}
