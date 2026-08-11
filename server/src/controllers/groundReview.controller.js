import { findGroundsByStatus, decideGroundStatus } from '../models/ground.model.js'

// Admin review queue for self-serve ground registrations (POST /grounds —
// see ground.controller.js#registerGround). Mirrors umpireRequest's own
// list-pending/decide shape exactly (umpireRequest.controller.js) for
// consistency, including the 'approved'/'rejected' wire vocabulary — mapped
// here to the grounds table's own ACTIVE/SUSPENDED status values rather
// than adding a third status just for this endpoint.
const DECISION_TO_STATUS = { approved: 'ACTIVE', rejected: 'SUSPENDED' }

function serializeGround(row) {
  return {
    publicGroundId: row.public_ground_id,
    slug: row.slug,
    name: row.name,
    description: row.description,
    addressLine: row.address_line,
    city: row.city,
    state: row.state,
    country: row.country,
    postalCode: row.postal_code,
    latitude: row.latitude,
    longitude: row.longitude,
    phone: row.phone,
    email: row.email,
    website: row.website,
    status: row.status,
    createdAt: row.created_at,
  }
}

export async function listPendingGrounds(req, res, next) {
  try {
    const grounds = await findGroundsByStatus('DRAFT')
    res.json({ grounds: grounds.map(serializeGround) })
  } catch (err) {
    next(err)
  }
}

export async function decideGround(req, res, next) {
  try {
    const status = DECISION_TO_STATUS[req.body?.status]
    if (!status) return res.status(400).json({ error: "status must be 'approved' or 'rejected'." })

    const ground = await decideGroundStatus(req.params.publicGroundId, status)
    if (!ground) return res.status(404).json({ error: 'Pending ground registration not found.' })

    res.json({ ground: serializeGround(ground) })
  } catch (err) {
    next(err)
  }
}
