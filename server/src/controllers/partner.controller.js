import { createPartner, findAllPartners, deletePartner } from '../models/partner.model.js'
import { uploadImageFileDetailed, deleteImageByPublicId } from '../utils/cloudinaryUpload.js'
import { logger } from '../utils/logger.js'

const CLOUDINARY_FOLDER = 'LOC/partners'

export async function listPartners(req, res, next) {
  try {
    const partners = await findAllPartners()
    res.json(partners)
  } catch (err) {
    next(err)
  }
}

export async function addPartner(req, res, next) {
  try {
    const { name, logoUrl, websiteUrl, sortOrder } = req.body
    if (!name || !logoUrl) {
      return res.status(400).json({ message: 'name and logoUrl are required' })
    }
    const partner = await createPartner({ name, logoUrl, websiteUrl, sortOrder })
    res.status(201).json(partner)
  } catch (err) {
    next(err)
  }
}

export async function uploadPartner(req, res, next) {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'logo file is required' })
    }
    const { name, websiteUrl, sortOrder } = req.body
    if (!name) {
      return res.status(400).json({ message: 'name is required' })
    }
    const uploaded = await uploadImageFileDetailed(req.file, CLOUDINARY_FOLDER)

    try {
      const partner = await createPartner({
        name,
        logoUrl: uploaded.url,
        websiteUrl,
        sortOrder,
        cloudinaryPublicId: uploaded.publicId,
      })
      res.status(201).json(partner)
    } catch (dbErr) {
      try {
        await deleteImageByPublicId(uploaded.publicId)
      } catch (cleanupErr) {
        logger.error('Failed to roll back orphaned Cloudinary asset after partners insert failure', {
          publicId: uploaded.publicId,
          saveError: dbErr.message,
          cleanupError: cleanupErr.message,
        })
      }
      throw dbErr
    }
  } catch (err) {
    next(err)
  }
}

export async function removePartner(req, res, next) {
  try {
    const partner = await deletePartner(req.params.id)
    if (!partner) {
      return res.status(404).json({ message: 'Partner not found' })
    }
    if (partner.cloudinary_public_id) {
      try {
        await deleteImageByPublicId(partner.cloudinary_public_id)
      } catch (err) {
        logger.error('Cloudinary delete failed during partner removal', {
          id: req.params.id,
          publicId: partner.cloudinary_public_id,
          error: err.message,
        })
      }
    }
    res.json(partner)
  } catch (err) {
    next(err)
  }
}
