import { Router } from 'express'
import {
  listGroundPhotos,
  addGroundPhoto,
  uploadGroundPhoto,
  removeGroundPhoto,
} from '../controllers/groundPhoto.controller.js'
import { createUploader } from '../config/upload.js'
import { requireAuth, requireStaffRole } from '../middlewares/auth.js'

const { upload } = createUploader('ground-photos')
const router = Router()

router.get('/', listGroundPhotos)
router.post('/', requireAuth, requireStaffRole('super_admin'), addGroundPhoto)
router.post('/upload', requireAuth, requireStaffRole('super_admin'), upload.single('photo'), uploadGroundPhoto)
router.delete('/:id', requireAuth, requireStaffRole('super_admin'), removeGroundPhoto)

export default router
