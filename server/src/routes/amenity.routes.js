import { Router } from 'express'
import {
  listAmenities,
  addAmenity,
  uploadAmenity,
  removeAmenity,
} from '../controllers/amenity.controller.js'
import { createUploader } from '../config/upload.js'
import { requireAuth, requireRole } from '../middlewares/auth.js'

const { upload } = createUploader('amenities')
const router = Router()

router.get('/', listAmenities)
router.post('/', requireAuth, requireRole('staff'), addAmenity)
router.post('/upload', requireAuth, requireRole('staff'), upload.single('photo'), uploadAmenity)
router.delete('/:id', requireAuth, requireRole('staff'), removeAmenity)

export default router
