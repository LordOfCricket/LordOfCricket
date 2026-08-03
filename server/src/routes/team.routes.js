import { Router } from 'express'
import { listTeams, getTeam, listTeamPlayers } from '../controllers/team.controller.js'
import { requireAuth } from '../middlewares/auth.js'

const router = Router()

// Public — team name/short-name/logo carry no privacy concern, and Phase 8's
// public Player Discovery / Leaderboards pages need this for their team
// filter dropdown without requiring a login (same public-read posture as
// GET /matches).
router.get('/', listTeams)
router.get('/:id', requireAuth, getTeam)
router.get('/:id/players', requireAuth, listTeamPlayers)

export default router
