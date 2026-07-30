import { unlink } from 'fs/promises'
import { join } from 'path'
import {
  createGroundPhoto,
  findAllGroundPhotos,
  deleteGroundPhoto,
} from '../models/groundPhoto.model.js'
import { createUploader } from '../config/upload.js'

const { uploadsDir } = createUploader('ground-photos')

export async function listGroundPhotos(req, res, next) {
  try {
    const photos = await findAllGroundPhotos()
    res.json(photos)
  } catch (err) {
    next(err)
  }
}

export async function addGroundPhoto(req, res, next) {
  try {
    const { title, imageUrl, sortOrder } = req.body
    if (!imageUrl) {
      return res.status(400).json({ message: 'imageUrl is required' })
    }
    const photo = await createGroundPhoto({ title, imageUrl, sortOrder })
    res.status(201).json(photo)
  } catch (err) {
    next(err)
  }
}

export async function uploadGroundPhoto(req, res, next) {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'photo file is required' })
    }
    const { title, sortOrder } = req.body
    const imageUrl = `${req.protocol}://${req.get('host')}/uploads/ground-photos/${req.file.filename}`
    const photo = await createGroundPhoto({ title, imageUrl, sortOrder })
    res.status(201).json(photo)
  } catch (err) {
    next(err)
  }
}

export async function removeGroundPhoto(req, res, next) {
  try {
    const photo = await deleteGroundPhoto(req.params.id)
    if (!photo) {
      return res.status(404).json({ message: 'Ground photo not found' })
    }
    if (photo.image_url.includes('/uploads/ground-photos/')) {
      const filename = photo.image_url.split('/uploads/ground-photos/')[1]
      await unlink(join(uploadsDir, filename)).catch(() => {})
    }
    res.json(photo)
  } catch (err) {
    next(err)
  }
}
