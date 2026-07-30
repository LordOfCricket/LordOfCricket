import { Router } from 'express'
import {
  listAmenities,
  addAmenity,
  uploadAmenity,
  removeAmenity,
} from '../controllers/amenity.controller.js'
import { createUploader } from '../config/upload.js'

const { upload } = createUploader('amenities')
const router = Router()

router.get('/', listAmenities)
router.post('/', addAmenity)
router.post('/upload', upload.single('photo'), uploadAmenity)
router.delete('/:id', removeAmenity)

export default router
