import { Router } from 'express'
import {
  listAdvertisements,
  addAdvertisement,
  removeAdvertisement,
} from '../controllers/advertisement.controller.js'

const router = Router()

router.get('/', listAdvertisements)
router.post('/', addAdvertisement)
router.delete('/:id', removeAdvertisement)

export default router
