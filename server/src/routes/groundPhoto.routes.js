import { Router } from 'express'
import {
  listGroundPhotos,
  addGroundPhoto,
  uploadGroundPhoto,
  removeGroundPhoto,
} from '../controllers/groundPhoto.controller.js'
import { createUploader } from '../config/upload.js'
import { requireAuth, requireRole } from '../middlewares/auth.js'

const { upload } = createUploader('ground-photos')
const router = Router()

router.get('/', listGroundPhotos)
router.post('/', requireAuth, requireRole('staff'), addGroundPhoto)
router.post('/upload', requireAuth, requireRole('staff'), upload.single('photo'), uploadGroundPhoto)
router.delete('/:id', requireAuth, requireRole('staff'), removeGroundPhoto)

export default router
