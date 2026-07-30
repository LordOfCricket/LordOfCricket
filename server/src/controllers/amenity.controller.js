import { unlink } from 'fs/promises'
import { join } from 'path'
import { createAmenity, findAllAmenities, deleteAmenity } from '../models/amenity.model.js'
import { createUploader } from '../config/upload.js'

const { uploadsDir } = createUploader('amenities')

export async function listAmenities(req, res, next) {
  try {
    const amenities = await findAllAmenities()
    res.json(amenities)
  } catch (err) {
    next(err)
  }
}

export async function addAmenity(req, res, next) {
  try {
    const { name, imageUrl, sortOrder } = req.body
    if (!name || !imageUrl) {
      return res.status(400).json({ message: 'name and imageUrl are required' })
    }
    const amenity = await createAmenity({ name, imageUrl, sortOrder })
    res.status(201).json(amenity)
  } catch (err) {
    next(err)
  }
}

export async function uploadAmenity(req, res, next) {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'photo file is required' })
    }
    const { name, sortOrder } = req.body
    if (!name) {
      return res.status(400).json({ message: 'name is required' })
    }
    const imageUrl = `${req.protocol}://${req.get('host')}/uploads/amenities/${req.file.filename}`
    const amenity = await createAmenity({ name, imageUrl, sortOrder })
    res.status(201).json(amenity)
  } catch (err) {
    next(err)
  }
}

export async function removeAmenity(req, res, next) {
  try {
    const amenity = await deleteAmenity(req.params.id)
    if (!amenity) {
      return res.status(404).json({ message: 'Amenity not found' })
    }
    if (amenity.image_url.includes('/uploads/amenities/')) {
      const filename = amenity.image_url.split('/uploads/amenities/')[1]
      await unlink(join(uploadsDir, filename)).catch(() => {})
    }
    res.json(amenity)
  } catch (err) {
    next(err)
  }
}
