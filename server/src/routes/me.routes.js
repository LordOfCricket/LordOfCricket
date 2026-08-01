import { Router } from 'express'
import { getMyPlayer, updateMyPlayer } from '../controllers/player.controller.js'
import { requireAuth } from '../middlewares/auth.js'

const router = Router()

router.get('/player', requireAuth, getMyPlayer)
router.patch('/player', requireAuth, updateMyPlayer)

export default router
