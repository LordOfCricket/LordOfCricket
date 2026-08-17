import { Router } from 'express'
import { submit, getStatus, list, getDetail, approve, reject, requestInformation } from '../controllers/groundOwnerRequest.controller.js'
import { requireAuth, requireStaffRole } from '../middlewares/auth.js'
import { groundWriteLimiter } from '../middlewares/rateLimit.js'

// Mounted at /api/ground-owner-requests. Replaces the old self-serve
// POST /grounds + GET/PATCH /ground-review pair (ground.controller.js#
// registerGround / groundReview.controller.js) — those now just forward
// here (see their own files) rather than existing as a second, competing
// registration path with the bug this phase fixes: membership was
// previously granted at submission time, before any review.
//
// '/status/:publicRequestId' and the bare '/' (POST/GET) MUST be registered
// before '/:publicRequestId' below for the same reason documented in
// ground.routes.js — Express matches in registration order and
// '/:publicRequestId' would otherwise swallow the literal 'status' segment.
const router = Router()

router.post('/', groundWriteLimiter, submit)
router.get('/status/:publicRequestId', getStatus)

router.get('/', requireAuth, requireStaffRole('super_admin'), list)
router.get('/:publicRequestId', requireAuth, requireStaffRole('super_admin'), getDetail)
router.post('/:publicRequestId/approve', requireAuth, requireStaffRole('super_admin'), approve)
router.post('/:publicRequestId/reject', requireAuth, requireStaffRole('super_admin'), reject)
router.post('/:publicRequestId/request-information', requireAuth, requireStaffRole('super_admin'), requestInformation)

export default router
