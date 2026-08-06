import { Router } from 'express'
import {
  listPartners,
  addPartner,
  uploadPartner,
  removePartner,
} from '../controllers/partner.controller.js'
import { createUploader } from '../config/upload.js'
import { requireAuth, requireStaffRole } from '../middlewares/auth.js'

const { upload } = createUploader('partners')
const router = Router()

router.get('/', listPartners)
router.post('/', requireAuth, requireStaffRole('super_admin'), addPartner)
router.post('/upload', requireAuth, requireStaffRole('super_admin'), upload.single('logo'), uploadPartner)
router.delete('/:id', requireAuth, requireStaffRole('super_admin'), removePartner)

export default router
