import { Router } from 'express'
import { listTeams, getTeam, listTeamPlayers, getPublicTeams, getTeamProfile } from '../controllers/team.controller.js'
import { requireAuth } from '../middlewares/auth.js'

const router = Router()

// Phase 10 Part 2 — public team ecosystem. Registered before '/:id' so
// 'discover' is never swallowed as a team id.
router.get('/discover', getPublicTeams)

// Public — team name/short-name/logo carry no privacy concern, and Phase 8's
// public Player Discovery / Leaderboards pages need this for their team
// filter dropdown without requiring a login (same public-read posture as
// GET /matches).
router.get('/', listTeams)
router.get('/:id/profile', getTeamProfile)
router.get('/:id', requireAuth, getTeam)
router.get('/:id/players', requireAuth, listTeamPlayers)

export default router
