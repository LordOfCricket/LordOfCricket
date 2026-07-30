import { Router } from 'express'
import {
  listGroundPhotos,
  addGroundPhoto,
  uploadGroundPhoto,
  removeGroundPhoto,
} from '../controllers/groundPhoto.controller.js'
import { createUploader } from '../config/upload.js'

const { upload } = createUploader('ground-photos')
const router = Router()

router.get('/', listGroundPhotos)
router.post('/', addGroundPhoto)
router.post('/upload', upload.single('photo'), uploadGroundPhoto)
router.delete('/:id', removeGroundPhoto)

export default router
