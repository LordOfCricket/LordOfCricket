import { Router } from 'express'
import { signup, login, me, selectRole, selectPlayerType } from '../controllers/auth.controller.js'
import { requireAuth } from '../middlewares/auth.js'

const router = Router()

router.post('/signup', signup)
router.post('/login', login)
router.get('/me', requireAuth, me)
router.patch('/role', requireAuth, selectRole)
router.patch('/player-type', requireAuth, selectPlayerType)

export default router
