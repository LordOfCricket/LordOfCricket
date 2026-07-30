import { unlink } from 'fs/promises'
import { join } from 'path'
import { createPartner, findAllPartners, deletePartner } from '../models/partner.model.js'
import { createUploader } from '../config/upload.js'

const { uploadsDir } = createUploader('partners')

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
    const logoUrl = `${req.protocol}://${req.get('host')}/uploads/partners/${req.file.filename}`
    const partner = await createPartner({ name, logoUrl, websiteUrl, sortOrder })
    res.status(201).json(partner)
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
    if (partner.logo_url.includes('/uploads/partners/')) {
      const filename = partner.logo_url.split('/uploads/partners/')[1]
      await unlink(join(uploadsDir, filename)).catch(() => {})
    }
    res.json(partner)
  } catch (err) {
    next(err)
  }
}
