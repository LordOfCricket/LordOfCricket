import { Router } from 'express'
import { listTeams, getTeam } from '../controllers/team.controller.js'
import { requireAuth } from '../middlewares/auth.js'

const router = Router()

router.get('/', requireAuth, listTeams)
router.get('/:id', requireAuth, getTeam)

export default router
