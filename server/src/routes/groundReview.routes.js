import { Router } from 'express'
import { listPendingGrounds, decideGround } from '../controllers/groundReview.controller.js'
import { requireAuth, requireStaffRole } from '../middlewares/auth.js'

const router = Router()

// Staff-only — reviewing a DRAFT ground submitted via POST /grounds and
// deciding whether it goes live (ACTIVE) or is rejected (SUSPENDED). A
// separate route file (not nested under /grounds), same pattern as
// umpireRequest.routes.js, since this is an admin queue, not a public
// ground resource.
router.get('/', requireAuth, requireStaffRole('super_admin'), listPendingGrounds)
router.patch('/:publicGroundId', requireAuth, requireStaffRole('super_admin'), decideGround)

export default router
