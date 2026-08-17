import * as groundOwnerRequestService from '../services/groundOwnerRequest.service.js'

// Admin-facing shape (list/detail) — includes reviewed_by/internal
// timestamps that the public status-check endpoint below deliberately never
// returns (see getStatus / groundOwnerRequestService#getPublicStatus).
function serializeRequestAdmin(row) {
  return {
    publicRequestId: row.public_request_id,
    applicantName: row.applicant_name,
    applicantEmail: row.applicant_email,
    applicantPhone: row.applicant_phone,
    groundName: row.ground_name,
    groundDescription: row.ground_description,
    addressLine: row.address_line,
    city: row.city,
    state: row.state,
    country: row.country,
    postalCode: row.postal_code,
    latitude: row.latitude,
    longitude: row.longitude,
    groundPhone: row.ground_phone,
    groundEmail: row.ground_email,
    groundWebsite: row.ground_website,
    status: row.status,
    rejectionReason: row.rejection_reason,
    moreInfoNotes: row.more_info_notes,
    reviewedAt: row.reviewed_at,
    reviewedBy: row.reviewed_by,
    createdGroundId: row.created_ground_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

// Public, no-login submission (brief §3/§20).
export async function submit(req, res, next) {
  try {
    const request = await groundOwnerRequestService.submitRequest(req.body)
    res.status(201).json({ request: { publicRequestId: request.public_request_id, groundName: request.ground_name, status: request.status } })
  } catch (err) {
    next(err)
  }
}

// Public status check by reference id — safe fields only (§21), enforced
// inside the service, not here.
export async function getStatus(req, res, next) {
  try {
    const status = await groundOwnerRequestService.getPublicStatus(req.params.publicRequestId)
    res.json({ request: status })
  } catch (err) {
    next(err)
  }
}

export async function list(req, res, next) {
  try {
    const requests = await groundOwnerRequestService.listRequests(req.query.status)
    res.json({ requests: requests.map(serializeRequestAdmin) })
  } catch (err) {
    next(err)
  }
}

export async function getDetail(req, res, next) {
  try {
    const request = await groundOwnerRequestService.getRequestDetail(req.params.publicRequestId, req.user.id)
    res.json({ request: serializeRequestAdmin(request) })
  } catch (err) {
    next(err)
  }
}

export async function approve(req, res, next) {
  try {
    const { request, ground } = await groundOwnerRequestService.approveRequest(req.params.publicRequestId, req.user.id, req.session?.id)
    res.json({ request: serializeRequestAdmin(request), ground: { publicGroundId: ground.public_ground_id, slug: ground.slug, name: ground.name, status: ground.status } })
  } catch (err) {
    next(err)
  }
}

export async function reject(req, res, next) {
  try {
    const request = await groundOwnerRequestService.rejectRequest(req.params.publicRequestId, req.user.id, req.body?.reason)
    res.json({ request: serializeRequestAdmin(request) })
  } catch (err) {
    next(err)
  }
}

export async function requestInformation(req, res, next) {
  try {
    const request = await groundOwnerRequestService.requestMoreInformation(req.params.publicRequestId, req.user.id, req.body?.notes)
    res.json({ request: serializeRequestAdmin(request) })
  } catch (err) {
    next(err)
  }
}
