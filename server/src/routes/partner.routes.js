import { Router } from 'express'
import {
  listPartners,
  addPartner,
  uploadPartner,
  removePartner,
} from '../controllers/partner.controller.js'
import { createUploader } from '../config/upload.js'

const { upload } = createUploader('partners')
const router = Router()

router.get('/', listPartners)
router.post('/', addPartner)
router.post('/upload', upload.single('logo'), uploadPartner)
router.delete('/:id', removePartner)

export default router
