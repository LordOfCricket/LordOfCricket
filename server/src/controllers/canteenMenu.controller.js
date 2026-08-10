import { uploadImageFileDetailed, deleteImageByPublicId } from '../utils/cloudinaryUpload.js'
import { logger } from '../utils/logger.js'
import {
  insertMenuItem,
  findActiveMenuItemsByCanteenId,
  updateMenuItemById,
  deactivateMenuItemById,
} from '../models/canteenMenuItem.model.js'
import { getTodayMenu, replaceTodayMenu, deleteTodayMenuItemsByMenuItemId } from '../models/canteenTodayMenu.model.js'

// MongoDB cleanup, Phase 3 (MenuItem) + Phase 4 (TodayMenu) — both halves of
// the canteen MENU are now unconditionally PostgreSQL, a hard dependency
// for this whole app (never "unreachable" the way MongoDB was). Every
// `isMongoReady()` gate that used to appear in this file is gone — Order
// (canteenOrder.controller.js, untouched, out of scope) remains the only
// genuinely Mongo-backed part of the canteen module. The `masterMenu`/
// `todaysMenu` in-memory demo data (canteenStore.model.js) is no longer
// reachable from this file at all: it existed solely as a fallback for
// "Mongo is down," which can no longer happen for either MenuItem or
// TodayMenu specifically.

function formatImageUrl(req, image) {
  if (!image) return ''
  if (image.startsWith('http://') || image.startsWith('https://')) {
    return image
  }
  return `${req.protocol}://${req.get('host')}${image}`
}

function parseMenuItemId(id) {
  const numericId = Number(id)
  return Number.isInteger(numericId) ? numericId : null
}

// Shared by listMenu/getTodaysMenuConfig — the today_menu_items row for a
// given menu_item_id, keyed by string id to match the retired code's own
// `Object.fromEntries(items.map(i => [String(i.id), i]))` lookup shape.
function indexTodayMenuItems(today) {
  if (!today || !Array.isArray(today.items)) return {}
  return Object.fromEntries(today.items.map((row) => [String(row.menu_item_id), row]))
}

export async function listMenu(req, res) {
  try {
    const items = await findActiveMenuItemsByCanteenId(req.canteen.id)
    const today = await getTodayMenu(req.canteen.id)
    const settings = indexTodayMenuItems(today)

    const mapped = items.map((item) => {
      const setting = settings[String(item.id)]
      return {
        id: String(item.id),
        name: item.name,
        category: item.category,
        description: item.description,
        price: Number(item.price),
        image: formatImageUrl(req, item.image_url),
        defaultStock: item.default_stock,
        isActive: item.is_active,
        available: setting ? setting.available : true,
        stock: setting ? setting.stock : item.default_stock,
        dailyPrice: setting ? Number(setting.daily_price) : Number(item.price),
      }
    })
    return res.json({ items: mapped })
  } catch (error) {
    return res.status(500).json({ error: error.message })
  }
}

export async function listMasterMenu(req, res) {
  try {
    const items = await findActiveMenuItemsByCanteenId(req.canteen.id)
    return res.json({
      items: items.map((item) => ({
        id: String(item.id),
        name: item.name,
        category: item.category,
        description: item.description,
        price: Number(item.price),
        image: formatImageUrl(req, item.image_url),
        defaultStock: item.default_stock,
        isActive: item.is_active,
      })),
    })
  } catch (error) {
    return res.status(500).json({ error: error.message })
  }
}

export async function getTodaysMenuConfig(req, res) {
  try {
    const dbItems = await findActiveMenuItemsByCanteenId(req.canteen.id)
    const today = await getTodayMenu(req.canteen.id)

    const menuMap = Object.fromEntries(dbItems.map((item) => [String(item.id), item]))
    const selectedItems = today ? today.items : []
    const mapped = selectedItems
      .map((entry) => {
        const menuItem = menuMap[String(entry.menu_item_id)]
        if (!menuItem) {
          return null
        }
        return {
          id: String(menuItem.id),
          name: menuItem.name,
          category: menuItem.category,
          description: menuItem.description,
          price: Number(menuItem.price),
          image: formatImageUrl(req, menuItem.image_url),
          defaultStock: menuItem.default_stock,
          available: Boolean(entry.available),
          stock: entry.stock,
          dailyPrice: Number(entry.daily_price),
        }
      })
      .filter(Boolean)
    return res.json({
      publishedAt: today ? today.published_at : new Date().toISOString(),
      items: mapped,
    })
  } catch (error) {
    return res.status(500).json({ error: error.message })
  }
}

export function updateTodaysMenu(req, res) {
  const { items } = req.body
  if (!Array.isArray(items)) {
    return res.status(400).json({ error: 'Invalid menu payload.' })
  }

  const applyUpdate = async () => {
    const publishedAt = new Date().toISOString()

    // The live write path resolves/validates ids AS PART OF the same
    // transaction that replaces today_menu_items (replaceTodayMenu) — an
    // id that doesn't resolve to a real menu_items row is simply never
    // written, matching the retired Mongo-backed code's own read-side
    // invisibility for such ids exactly (see schema.sql's comment on
    // today_menu_items). The request always succeeds regardless — this
    // was never a "reject the whole publish" validation, only a "which
    // ids actually count" one, preserved exactly.
    try {
      await replaceTodayMenu({ canteenId: req.canteen.id, publishedAt, items })
    } catch (err) {
      logger.error('TodayMenu save error', { error: err.message })
      res.status(500).json({ error: err.message })
      return
    }

    // Response echoes the RAW client payload, not the resolved/persisted
    // subset — matches the retired code's own `res.json({publishedAt,
    // items})` exactly (it always echoed req.body's items verbatim).
    req.io.emit('menu.updated', {
      publishedAt,
      items,
    })
    req.io.emit('menu-updated', {
      publishedAt,
      items,
    })

    res.json({ publishedAt, items })
  }

  applyUpdate().catch((err) => {
    logger.error('updateTodaysMenu error', { error: err.message })
    res.status(500).json({ error: err.message })
  })
}

export async function createMenuItem(req, res) {
  try {
    const { name, category, description, price, defaultStock } = req.body
    let image = req.body.image || ''
    let imagePublicId = ''
    if (req.file) {
      const uploaded = await uploadImageFileDetailed(req.file, 'canteen-menu')
      image = uploaded.url
      imagePublicId = uploaded.publicId
    }

    const numericPrice = Number(price)
    if (!name || !category || Number.isNaN(numericPrice)) {
      return res.status(400).json({ error: 'Invalid menu item payload.' })
    }

    const item = await insertMenuItem({
      canteenId: req.canteen.id,
      name,
      category,
      description: description || '',
      price: numericPrice,
      imageUrl: image,
      cloudinaryPublicId: imagePublicId,
      defaultStock: Number(defaultStock) || 0,
    })
    return res.status(201).json({
      item: {
        id: String(item.id),
        name: item.name,
        category: item.category,
        description: item.description,
        price: Number(item.price),
        image: formatImageUrl(req, item.image_url),
        defaultStock: item.default_stock,
      },
    })
  } catch (error) {
    return res.status(500).json({ error: error.message })
  }
}

export async function updateMenuItem(req, res) {
  try {
    const { id } = req.params
    const { name, category, description, price } = req.body
    let image = req.body.image || ''
    let imagePublicId = ''
    if (req.file) {
      const uploaded = await uploadImageFileDetailed(req.file, 'canteen-menu')
      image = uploaded.url
      imagePublicId = uploaded.publicId
    }

    const update = {}
    if (name) update.name = name
    if (category) update.category = category
    if (description !== undefined) update.description = description
    if (price !== undefined) {
      const numericPrice = Number(price)
      if (Number.isNaN(numericPrice)) {
        return res.status(400).json({ error: 'Invalid price value.' })
      }
      update.price = numericPrice
    }
    if (image) update.imageUrl = image
    if (imagePublicId) update.cloudinaryPublicId = imagePublicId

    const numericId = parseMenuItemId(id)
    const item = numericId === null ? null : await updateMenuItemById(numericId, req.canteen.id, update)
    if (!item) {
      return res.status(404).json({ error: 'Menu item not found.' })
    }

    const responseItem = {
      id: String(item.id),
      name: item.name,
      category: item.category,
      description: item.description,
      price: Number(item.price),
      image: formatImageUrl(req, item.image_url),
      defaultStock: item.default_stock,
      isActive: item.is_active,
    }
    return res.json({ item: responseItem })
  } catch (error) {
    return res.status(500).json({ error: error.message })
  }
}

export async function deleteMenuItem(req, res) {
  try {
    const { id } = req.params
    const numericId = parseMenuItemId(id)
    const item = numericId === null ? null : await deactivateMenuItemById(numericId, req.canteen.id)
    if (!item) {
      return res.status(404).json({ error: 'Menu item not found.' })
    }

    if (item.cloudinary_public_id) {
      try {
        await deleteImageByPublicId(item.cloudinary_public_id)
      } catch (err) {
        logger.error('Failed to delete canteen menu image from Cloudinary', { error: err.message, publicId: item.cloudinary_public_id })
      }
    }

    try {
      await deleteTodayMenuItemsByMenuItemId(numericId)
    } catch (err) {
      logger.error('Failed to update TodayMenu after delete', { error: err.message })
    }

    const payload = { publishedAt: new Date().toISOString() }
    req.io.emit('menu.updated', payload)
    req.io.emit('menu-updated', payload)
    return res.json({ ok: true })
  } catch (error) {
    return res.status(500).json({ error: error.message })
  }
}
