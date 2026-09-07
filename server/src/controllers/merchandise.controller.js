import {
  MERCHANDISE_STATUSES,
  createMerchandise,
  findPublicMerchandise,
  findAllMerchandise,
  findMerchandiseById,
  updateMerchandise,
  deleteMerchandise,
} from '../models/merchandise.model.js'
import { uploadImageFileDetailed, deleteImageByPublicId, getOptimizedImageUrl } from '../utils/cloudinaryUpload.js'
import { logger } from '../utils/logger.js'

const CLOUDINARY_FOLDER = 'LOC/merchandise'
const DELIVERY_WIDTH = 800 // homepage card + detail page never render larger than this

// NUMERIC columns come back from pg as strings — normalize to numbers (or
// null) at the edge so every consumer gets real numbers, never "199.00".
function toMoney(value) {
  if (value === null || value === undefined || value === '') return null
  const n = Number(value)
  return Number.isFinite(n) ? n : null
}

// Public shape — what the homepage / product detail page consume. Internal
// columns (cloudinary_public_id, raw timestamps beyond createdAt) are not exposed.
function toPublicShape(row) {
  const original = toMoney(row.original_price)
  const selling = toMoney(row.selling_price)
  return {
    id: row.id,
    name: row.name,
    description: row.description || '',
    category: row.category || null,
    imageUrl: getOptimizedImageUrl(row.cloudinary_public_id, { width: DELIVERY_WIDTH }) || row.image_url,
    originalPrice: original,
    sellingPrice: selling,
    onSale: original != null && selling != null && original > selling,
    status: row.status,
    sortOrder: row.sort_order,
    createdAt: row.created_at,
  }
}

// Admin shape — adds the fields the management table needs but the public
// API should not leak.
function toAdminShape(row) {
  return {
    ...toPublicShape(row),
    originalImageUrl: row.image_url,
    updatedAt: row.updated_at,
  }
}

function httpError(message, statusCode) {
  const err = new Error(message)
  err.statusCode = statusCode
  return err
}

// Shared create/update validation. `partial` = true for PATCH, where an
// absent field simply isn't being changed. Returns a normalized patch of
// only the provided, valid fields.
function validateAndNormalize(body, { partial, existing } = {}) {
  const patch = {}

  if (body.name !== undefined || !partial) {
    const name = String(body.name ?? '').trim()
    if (!name) throw httpError('Product name is required.', 400)
    if (name.length > 150) throw httpError('Product name must be 150 characters or fewer.', 400)
    patch.name = name
  }

  if (body.description !== undefined) {
    patch.description = body.description === null ? null : String(body.description).trim() || null
  }

  if (body.category !== undefined) {
    const category = body.category === null ? null : String(body.category).trim() || null
    if (category && category.length > 40) throw httpError('Category must be 40 characters or fewer.', 400)
    patch.category = category
  }

  if (body.status !== undefined) {
    if (!MERCHANDISE_STATUSES.includes(body.status)) {
      throw httpError(`Status must be one of: ${MERCHANDISE_STATUSES.join(', ')}.`, 400)
    }
    patch.status = body.status
  }

  if (body.sortOrder !== undefined) {
    const sortOrder = Number(body.sortOrder)
    if (!Number.isInteger(sortOrder) || sortOrder < 0) throw httpError('Display order must be a non-negative whole number.', 400)
    patch.sort_order = sortOrder
  }

  const hasOriginal = body.originalPrice !== undefined && body.originalPrice !== null && body.originalPrice !== ''
  const hasSelling = body.sellingPrice !== undefined && body.sellingPrice !== null && body.sellingPrice !== ''

  if (hasSelling || !partial) {
    const selling = Number(body.sellingPrice)
    if (!Number.isFinite(selling) || selling <= 0) throw httpError('Selling price must be a number greater than 0.', 400)
    patch.selling_price = selling
  }

  if (body.originalPrice !== undefined) {
    if (!hasOriginal) {
      patch.original_price = null
    } else {
      const original = Number(body.originalPrice)
      if (!Number.isFinite(original) || original <= 0) throw httpError('Original price must be a number greater than 0.', 400)
      patch.original_price = original
    }
  }

  // Cross-field: selling must not exceed original when both are known
  // (either from this request or, for a PATCH, the existing row).
  const effectiveSelling = patch.selling_price ?? toMoney(existing?.selling_price)
  const effectiveOriginal = patch.original_price !== undefined ? patch.original_price : toMoney(existing?.original_price)
  if (effectiveOriginal != null && effectiveSelling != null && effectiveSelling > effectiveOriginal) {
    throw httpError('Selling price cannot be greater than the original price.', 400)
  }

  return patch
}

// GET /merchandise — public homepage section. Only ACTIVE / OUT_OF_STOCK.
export async function listPublicMerchandise(req, res, next) {
  try {
    const rows = await findPublicMerchandise()
    res.json({ items: rows.map(toPublicShape) })
  } catch (err) {
    next(err)
  }
}

// GET /merchandise/admin — Super Admin management table. Every product.
export async function listAdminMerchandise(req, res, next) {
  try {
    const rows = await findAllMerchandise()
    res.json({ items: rows.map(toAdminShape) })
  } catch (err) {
    next(err)
  }
}

// GET /merchandise/:id — public product detail page. Only visible statuses;
// a DRAFT/INACTIVE id is indistinguishable from a missing one.
export async function getPublicMerchandise(req, res, next) {
  try {
    const id = Number(req.params.id)
    const row = Number.isInteger(id) ? await findMerchandiseById(id) : null
    if (!row || !['ACTIVE', 'OUT_OF_STOCK'].includes(row.status)) throw httpError('Product not found.', 404)
    res.json(toPublicShape(row))
  } catch (err) {
    next(err)
  }
}

// GET /merchandise/admin/:id — Super Admin, load a product for editing.
export async function getAdminMerchandise(req, res, next) {
  try {
    const id = Number(req.params.id)
    const row = Number.isInteger(id) ? await findMerchandiseById(id) : null
    if (!row) throw httpError('Product not found.', 404)
    res.json(toAdminShape(row))
  } catch (err) {
    next(err)
  }
}

// POST /merchandise — Super Admin. Multipart: `image` file + product fields.
export async function createMerchandiseHandler(req, res, next) {
  try {
    if (!req.file) throw httpError('A product image is required.', 400)
    const patch = validateAndNormalize(req.body, { partial: false })

    const uploaded = await uploadImageFileDetailed(req.file, CLOUDINARY_FOLDER)

    try {
      const row = await createMerchandise({
        name: patch.name,
        description: patch.description ?? null,
        category: patch.category ?? null,
        imageUrl: uploaded.url,
        cloudinaryPublicId: uploaded.publicId,
        originalPrice: patch.original_price ?? null,
        sellingPrice: patch.selling_price,
        status: patch.status ?? 'DRAFT',
        sortOrder: patch.sort_order ?? 0,
      })
      res.status(201).json(toAdminShape(row))
    } catch (dbErr) {
      // Cloudinary upload already succeeded — don't orphan it because the
      // metadata write failed. Same rollback as partner.controller.js.
      try {
        await deleteImageByPublicId(uploaded.publicId)
      } catch (cleanupErr) {
        logger.error('Failed to roll back orphaned Cloudinary asset after merchandise insert failure', {
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

// PATCH /merchandise/:id — Super Admin. Field updates + optional replacement
// `image`. Old Cloudinary asset is deleted only AFTER the DB update commits.
export async function updateMerchandiseHandler(req, res, next) {
  try {
    const id = Number(req.params.id)
    const existing = Number.isInteger(id) ? await findMerchandiseById(id) : null
    if (!existing) throw httpError('Product not found.', 404)

    const patch = validateAndNormalize(req.body, { partial: true, existing })

    let uploaded = null
    if (req.file) {
      uploaded = await uploadImageFileDetailed(req.file, CLOUDINARY_FOLDER)
      patch.image_url = uploaded.url
      patch.cloudinary_public_id = uploaded.publicId
    }

    let row
    try {
      row = await updateMerchandise(id, patch)
    } catch (dbErr) {
      if (uploaded) {
        try {
          await deleteImageByPublicId(uploaded.publicId)
        } catch (cleanupErr) {
          logger.error('Failed to roll back orphaned Cloudinary asset after merchandise update failure', {
            publicId: uploaded.publicId,
            saveError: dbErr.message,
            cleanupError: cleanupErr.message,
          })
        }
      }
      throw dbErr
    }

    if (uploaded && existing.cloudinary_public_id) {
      try {
        await deleteImageByPublicId(existing.cloudinary_public_id)
      } catch (err) {
        logger.error('Cloudinary delete failed for replaced merchandise image', {
          id,
          publicId: existing.cloudinary_public_id,
          error: err.message,
        })
      }
    }

    res.json(toAdminShape(row))
  } catch (err) {
    next(err)
  }
}

// DELETE /merchandise/:id — Super Admin. Hard delete + Cloudinary cleanup,
// same as partner removal (the soft path is PATCH status = 'INACTIVE').
export async function deleteMerchandiseHandler(req, res, next) {
  try {
    const id = Number(req.params.id)
    const row = Number.isInteger(id) ? await deleteMerchandise(id) : null
    if (!row) throw httpError('Product not found.', 404)

    if (row.cloudinary_public_id) {
      try {
        await deleteImageByPublicId(row.cloudinary_public_id)
      } catch (err) {
        logger.error('Cloudinary delete failed during merchandise removal', {
          id,
          publicId: row.cloudinary_public_id,
          error: err.message,
        })
      }
    }
    res.json({ id: row.id })
  } catch (err) {
    next(err)
  }
}
