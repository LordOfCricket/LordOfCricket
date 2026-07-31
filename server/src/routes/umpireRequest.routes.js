import { Router } from 'express'
import { listPending, getMine, decide } from '../controllers/umpireRequest.controller.js'
import { requireAuth, requireRole } from '../middlewares/auth.js'

const router = Router()

router.get('/me', requireAuth, getMine)
router.get('/', requireAuth, requireRole('staff'), listPending)
router.patch('/:id', requireAuth, requireRole('staff'), decide)

export default router
