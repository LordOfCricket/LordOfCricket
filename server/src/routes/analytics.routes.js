import { Router } from 'express'
import {
  getPlayerAnalytics,
  getTeamAnalytics,
  getMatchAnalytics,
  getTournamentAnalytics,
  comparePlayers,
  compareTeams,
} from '../controllers/analytics.controller.js'

// Phase 17 — mounted onto the EXISTING /players, /teams, /matches,
// /tournaments route prefixes (routes/index.js), matching the exact
// precedent Phase 16's aiInsight.routes.js already established: small
// per-resource routers added alongside a base resource's own router, never a
// new top-level /analytics resource. Every route here is a public,
// unauthenticated GET — analytics are derived read-only views over already-
// public cricket data, same authorization posture as Match Summary/Player/
// Team profiles and tournament standings.
//
// Comparison routes are registered on their base router BEFORE the base
// router's own `/:id`-shaped routes are matched (Express matches in
// registration order across routers mounted on the same prefix) so
// `/players/compare` and `/teams/compare` never get swallowed by a
// `/:publicPlayerId` or `/:id` route — the same "static segment before
// dynamic segment" convention already used for /teams/discover, /matches/discover, etc.

export const playerAnalyticsRoutes = Router()
playerAnalyticsRoutes.get('/compare', comparePlayers)
playerAnalyticsRoutes.get('/:publicPlayerId/analytics', getPlayerAnalytics)

export const teamAnalyticsRoutes = Router()
teamAnalyticsRoutes.get('/compare', compareTeams)
teamAnalyticsRoutes.get('/:id/analytics', getTeamAnalytics)

export const matchAnalyticsRoutes = Router()
matchAnalyticsRoutes.get('/:id/analytics', getMatchAnalytics)

export const tournamentAnalyticsRoutes = Router()
tournamentAnalyticsRoutes.get('/:publicTournamentId/analytics', getTournamentAnalytics)
