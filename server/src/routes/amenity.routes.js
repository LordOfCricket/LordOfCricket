import { Router } from 'express'
import {
  listAmenities,
  addAmenity,
  uploadAmenity,
  removeAmenity,
} from '../controllers/amenity.controller.js'
import { createUploader } from '../config/upload.js'
import { requireAuth, requireStaffRole } from '../middlewares/auth.js'

const { upload } = createUploader('amenities')
const router = Router()

router.get('/', listAmenities)
router.post('/', requireAuth, requireStaffRole('super_admin'), addAmenity)
router.post('/upload', requireAuth, requireStaffRole('super_admin'), upload.single('photo'), uploadAmenity)
router.delete('/:id', requireAuth, requireStaffRole('super_admin'), removeAmenity)

export default router
