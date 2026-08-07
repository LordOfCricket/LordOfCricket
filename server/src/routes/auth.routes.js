import { Router } from 'express'
import { signup, login, me, selectRole, selectPlayerType } from '../controllers/auth.controller.js'
import { requireAuth } from '../middlewares/auth.js'
import { authLimiter } from '../middlewares/rateLimit.js'

const router = Router()

router.post('/signup', authLimiter, signup)
router.post('/login', authLimiter, login)
router.get('/me', requireAuth, me)
router.patch('/role', requireAuth, selectRole)
router.patch('/player-type', requireAuth, selectPlayerType)

export default router
