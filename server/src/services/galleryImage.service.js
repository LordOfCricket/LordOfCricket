import GalleryImage, { GALLERY_CATEGORIES } from '../models/galleryImage.model.js'
import { isMongoReady } from '../config/db.js'
import { uploadImageFileDetailed, deleteImageByPublicId, getOptimizedImageUrl } from '../utils/cloudinaryUpload.js'
import { logger } from '../utils/logger.js'

const CLOUDINARY_FOLDER = 'LOC/ground-gallery'
const DELIVERY_WIDTH = 1600 // wide enough for the hero gallery's largest (desktop 2fr) presentation, capped so nobody downloads a 6000px original

function httpError(message, statusCode) {
  const err = new Error(message)
  err.statusCode = statusCode
  return err
}

function requireMongo() {
  // MongoDB is an optional dependency project-wide (isMongoReady() gates
  // every existing Mongo call site — canteen, AI insight) and never blocks
  // server boot. Gallery follows the same rule: if Mongo isn't reachable,
  // fail this one request clearly rather than crash or silently pretend
  // there's no data.
  if (!isMongoReady()) {
    throw httpError('Gallery storage is temporarily unavailable.', 503)
  }
}

function toPublicShape(doc) {
  return {
    id: String(doc._id),
    title: doc.title,
    description: doc.description || '',
    category: doc.category,
    imageUrl: getOptimizedImageUrl(doc.image.publicId, { width: DELIVERY_WIDTH }) || doc.image.url,
    originalImageUrl: doc.image.url,
    width: doc.image.width,
    height: doc.image.height,
    order: doc.order,
    isActive: doc.isActive,
    createdAt: doc.createdAt,
  }
}

export async function listGalleryImages({ category, activeOnly = true } = {}) {
  requireMongo()

  const filter = {}
  if (category) {
    if (!GALLERY_CATEGORIES.includes(category)) {
      throw httpError(`Unknown category '${category}'. Supported: ${GALLERY_CATEGORIES.join(', ')}.`, 400)
    }
    filter.category = category
  }
  if (activeOnly) filter.isActive = true

  const docs = await GalleryImage.find(filter).sort({ order: 1, createdAt: 1 }).lean()
  return docs.map(toPublicShape)
}

export async function getGalleryImageById(id) {
  requireMongo()
  const doc = await GalleryImage.findById(id).lean().catch(() => null)
  if (!doc) throw httpError('Gallery image not found.', 404)
  return toPublicShape(doc)
}

export async function createGalleryImage({ file, title, description, category, order, createdBy }) {
  requireMongo()

  if (!file) throw httpError('An image file is required.', 400)
  if (!title || !title.trim()) throw httpError('A title is required.', 400)
  const resolvedCategory = category || 'ground'
  if (!GALLERY_CATEGORIES.includes(resolvedCategory)) {
    throw httpError(`Unknown category '${resolvedCategory}'. Supported: ${GALLERY_CATEGORIES.join(', ')}.`, 400)
  }

  const uploaded = await uploadImageFileDetailed(file, CLOUDINARY_FOLDER)

  try {
    const doc = await GalleryImage.create({
      title: title.trim(),
      description: description || '',
      category: resolvedCategory,
      image: uploaded,
      order: Number.isFinite(Number(order)) ? Number(order) : 0,
      createdBy: createdBy ?? null,
    })
    return toPublicShape(doc)
  } catch (err) {
    // Cloudinary upload already succeeded — don't leave it orphaned just
    // because the metadata write failed (validation error, Mongo hiccup).
    try {
      await deleteImageByPublicId(uploaded.publicId)
    } catch (cleanupErr) {
      logger.error('Failed to roll back orphaned Cloudinary asset after MongoDB save failure', {
        publicId: uploaded.publicId,
        saveError: err.message,
        cleanupError: cleanupErr.message,
      })
    }
    throw httpError('Failed to save gallery image metadata.', 500)
  }
}

const PATCHABLE_FIELDS = ['title', 'description', 'order', 'isActive', 'category']

export async function updateGalleryImageMetadata(id, updates) {
  requireMongo()

  const doc = await GalleryImage.findById(id)
  if (!doc) throw httpError('Gallery image not found.', 404)

  for (const field of PATCHABLE_FIELDS) {
    if (updates[field] === undefined) continue
    if (field === 'category' && !GALLERY_CATEGORIES.includes(updates.category)) {
      throw httpError(`Unknown category '${updates.category}'. Supported: ${GALLERY_CATEGORIES.join(', ')}.`, 400)
    }
    if (field === 'title' && !String(updates.title).trim()) {
      throw httpError('Title cannot be empty.', 400)
    }
    doc[field] = field === 'title' ? String(updates.title).trim() : updates[field]
  }

  await doc.save()
  return toPublicShape(doc)
}

export async function deleteGalleryImage(id) {
  requireMongo()

  const doc = await GalleryImage.findById(id)
  if (!doc) throw httpError('Gallery image not found.', 404)

  // Cloudinary first, MongoDB second — an unexpected Cloudinary failure
  // (not just "already gone", which deleteImageByPublicId treats as
  // success) aborts here rather than deleting the record for an asset we
  // couldn't confirm is actually gone.
  let cloudinaryOk
  try {
    cloudinaryOk = await deleteImageByPublicId(doc.image.publicId)
  } catch (err) {
    logger.error('Cloudinary delete failed during gallery image deletion', {
      id: String(doc._id),
      publicId: doc.image.publicId,
      error: err.message,
    })
    throw httpError('Failed to delete the image from Cloudinary. The gallery record was not removed.', 502)
  }

  if (!cloudinaryOk) {
    throw httpError('Failed to delete the image from Cloudinary. The gallery record was not removed.', 502)
  }

  await doc.deleteOne()
  return { id: String(doc._id) }
}
