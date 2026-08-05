import { Router } from 'express'
import {
  listPartners,
  addPartner,
  uploadPartner,
  removePartner,
} from '../controllers/partner.controller.js'
import { createUploader } from '../config/upload.js'
import { requireAuth, requireRole } from '../middlewares/auth.js'

const { upload } = createUploader('partners')
const router = Router()

router.get('/', listPartners)
router.post('/', requireAuth, requireRole('staff'), addPartner)
router.post('/upload', requireAuth, requireRole('staff'), upload.single('logo'), uploadPartner)
router.delete('/:id', requireAuth, requireRole('staff'), removePartner)

export default router
