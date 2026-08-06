import { Router } from 'express'
import { createStaff } from '../controllers/staff.controller.js'
import { requireAuth, requireStaffRole } from '../middlewares/auth.js'

const router = Router()

router.post('/', requireAuth, requireStaffRole('super_admin'), createStaff)

export default router
