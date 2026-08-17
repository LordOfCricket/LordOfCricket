import { pool } from '../config/db.js'
import * as requestModel from '../models/groundOwnerRequest.model.js'
import { createGround, findGroundBySlug } from '../models/ground.model.js'
import { createMembership } from '../models/groundUser.model.js'
import { findUserByIdentifier, createUserFromOtp } from '../models/user.model.js'
import { recordEvent, ACCOUNT_AUDIT_EVENTS } from './accountAudit.service.js'
import { consumeStepUpGrant } from './stepUp.service.js'
import { requiredText, optionalText, validateEmail, validatePhone } from '../domain/accountCreation/validation.js'
import { AccountCreationError, ACCOUNT_CREATION_ERROR_CODES as CODES } from '../domain/accountCreation/errors.js'
import { MfaError, MFA_ERROR_CODES } from '../domain/mfa/errors.js'
import { generatePublicId } from '../utils/publicId.js'
import { slugify } from '../utils/slug.js'
import { logger } from '../utils/logger.js'

const FIELD_LIMITS = { applicantName: 100, groundName: 150, groundDescription: 500, addressLine: 255, city: 100, state: 100, country: 100, postalCode: 20, groundPhone: 30, groundWebsite: 300, rejectionReason: 500, moreInfoNotes: 500 }

function parseCoordinate(raw, min, max) {
  if (raw === undefined || raw === '' || raw === null) return { value: null }
  const value = Number(raw)
  if (!Number.isFinite(value) || value < min || value > max) return { error: true }
  return { value }
}

// Public, no-login submission — the applicant is identified by the fields
// they type in, not a session (brief §3/§20: no login required to submit).
export async function submitRequest(body = {}) {
  const applicantName = requiredText(body.applicantName, FIELD_LIMITS.applicantName)
  if (applicantName.error) throw new AccountCreationError(CODES.VALIDATION_ERROR, 'Your name is required.')

  const applicantEmail = validateEmail(body.applicantEmail)
  if (applicantEmail.error) throw new AccountCreationError(CODES.VALIDATION_ERROR, 'Email must be a valid address.')
  const applicantPhone = validatePhone(body.applicantPhone)
  if (applicantPhone.error) throw new AccountCreationError(CODES.VALIDATION_ERROR, 'Phone number is not valid.')
  if (!applicantEmail.value && !applicantPhone.value) {
    throw new AccountCreationError(CODES.VALIDATION_ERROR, 'Provide at least one contact method: email or phone.')
  }

  const groundName = requiredText(body.groundName, FIELD_LIMITS.groundName)
  if (groundName.error) throw new AccountCreationError(CODES.VALIDATION_ERROR, `Ground name is required (max ${FIELD_LIMITS.groundName} characters).`)
  const addressLine = requiredText(body.addressLine, FIELD_LIMITS.addressLine)
  if (addressLine.error) throw new AccountCreationError(CODES.VALIDATION_ERROR, 'Address is required.')
  const city = requiredText(body.city, FIELD_LIMITS.city)
  if (city.error) throw new AccountCreationError(CODES.VALIDATION_ERROR, 'City is required.')
  const state = requiredText(body.state, FIELD_LIMITS.state)
  if (state.error) throw new AccountCreationError(CODES.VALIDATION_ERROR, 'State is required.')
  const groundPhone = requiredText(body.groundPhone, FIELD_LIMITS.groundPhone)
  if (groundPhone.error) throw new AccountCreationError(CODES.VALIDATION_ERROR, 'A contact phone number for the ground is required.')

  const groundDescription = optionalText(body.groundDescription, FIELD_LIMITS.groundDescription)
  if (groundDescription.error) throw new AccountCreationError(CODES.VALIDATION_ERROR, 'Description is too long.')
  const postalCode = optionalText(body.postalCode, FIELD_LIMITS.postalCode)
  if (postalCode.error) throw new AccountCreationError(CODES.VALIDATION_ERROR, 'Postal code is too long.')
  const country = optionalText(body.country, FIELD_LIMITS.country)
  if (country.error) throw new AccountCreationError(CODES.VALIDATION_ERROR, 'Country is too long.')
  const groundEmail = validateEmail(body.groundEmail)
  if (groundEmail.error) throw new AccountCreationError(CODES.VALIDATION_ERROR, 'Ground email must be a valid address.')
  const groundWebsite = optionalText(body.groundWebsite, FIELD_LIMITS.groundWebsite)
  if (groundWebsite.error) throw new AccountCreationError(CODES.VALIDATION_ERROR, 'Website URL is too long.')

  const latitude = parseCoordinate(body.latitude, -90, 90)
  if (latitude.error) throw new AccountCreationError(CODES.VALIDATION_ERROR, 'Latitude must be a number between -90 and 90.')
  const longitude = parseCoordinate(body.longitude, -180, 180)
  if (longitude.error) throw new AccountCreationError(CODES.VALIDATION_ERROR, 'Longitude must be a number between -180 and 180.')

  const publicRequestId = generatePublicId('GOR', 8)
  const request = await requestModel.createRequest({
    publicRequestId,
    applicantName: applicantName.value,
    applicantEmail: applicantEmail.value,
    applicantPhone: applicantPhone.value,
    groundName: groundName.value,
    groundDescription: groundDescription.value,
    addressLine: addressLine.value,
    city: city.value,
    state: state.value,
    country: country.value || 'India',
    postalCode: postalCode.value,
    latitude: latitude.value,
    longitude: longitude.value,
    groundPhone: groundPhone.value,
    groundEmail: groundEmail.value,
    groundWebsite: groundWebsite.value,
  })

  await recordEvent(ACCOUNT_AUDIT_EVENTS.GROUND_OWNER_REQUEST_SUBMITTED, {
    targetRequestId: request.id,
    metadata: { groundName: request.ground_name, publicRequestId },
  })

  return request
}

// Public status check — deliberately returns only the fields the brief's
// §21 allows (status + safe reasons), never reviewed_by or any internal id.
export async function getPublicStatus(publicRequestId) {
  const request = await requestModel.findByPublicRequestId(publicRequestId)
  if (!request) throw new AccountCreationError(CODES.REQUEST_NOT_FOUND, 'Request not found.')
  return {
    publicRequestId: request.public_request_id,
    groundName: request.ground_name,
    status: request.status,
    rejectionReason: request.status === 'REJECTED' ? request.rejection_reason : null,
    moreInfoNotes: request.status === 'MORE_INFORMATION_REQUIRED' ? request.more_info_notes : null,
    submittedAt: request.created_at,
  }
}

export async function listRequests(status) {
  return requestModel.listByStatus(status || null)
}

// Viewing the detail as super_admin is what "review started" means here —
// a PENDING request transitions to UNDER_REVIEW the first time someone
// opens it; already-further-along requests (UNDER_REVIEW, APPROVED, etc.)
// are returned as-is, no repeated audit spam on every subsequent view.
export async function getRequestDetail(publicRequestId, actorUserId) {
  let request = await requestModel.findByPublicRequestId(publicRequestId)
  if (!request) throw new AccountCreationError(CODES.REQUEST_NOT_FOUND, 'Request not found.')

  if (request.status === 'PENDING') {
    const updated = await requestModel.markUnderReview(publicRequestId)
    if (updated) {
      request = updated
      await recordEvent(ACCOUNT_AUDIT_EVENTS.GROUND_OWNER_REQUEST_REVIEW_STARTED, { actorUserId, targetRequestId: request.id })
    }
  }
  return request
}

async function ensureUniqueSlug(name, client) {
  const base = slugify(name) || 'ground'
  if (!(await findGroundBySlug(base, client))) return base
  for (let attempt = 0; attempt < 5; attempt++) {
    const candidate = `${base}-${Math.random().toString(36).slice(2, 6)}`
    if (!(await findGroundBySlug(candidate, client))) return candidate
  }
  throw new Error('Could not generate a unique ground slug.')
}

// The transactional core of Phase 4: approving a request must create the
// owner's account (if new), the ground, and the ownership membership, mark
// the request APPROVED, and write the audit event — all atomically, via one
// `pg` transaction (see models/groundOwnerRequest.model.js's header comment
// for why this isn't Prisma). If anything after the WHERE-clause-guarded
// UPDATE fails, everything rolls back and the request is left exactly as it
// was — never "owner created but ground missing" or "approved but nothing
// else happened".
export async function approveRequest(publicRequestId, actorUserId, sessionId) {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    // Phase 6 — approving a request creates a real Ground + grants a brand
    // new GROUND_OWNER membership, at least as high-leverage as platform
    // staff creation, so it's step-up-gated the same way. Consumed FIRST,
    // inside this same transaction, so a step-up failure rolls back
    // everything below with it.
    const grant = await consumeStepUpGrant(sessionId, 'GROUND_OWNER_REQUEST_APPROVE', client)
    if (!grant) {
      throw new MfaError(MFA_ERROR_CODES.STEP_UP_REQUIRED, 'This action requires a fresh step-up verification.')
    }

    // This UPDATE's own WHERE clause is the concurrency guard (brief §22):
    // a second simultaneous/duplicate approve attempt matches zero rows and
    // gets REQUEST_NOT_ELIGIBLE, never a second ground/owner.
    const request = await requestModel.markApprovedIfEligible(publicRequestId, { reviewedBy: actorUserId, createdGroundId: null }, client)
    if (!request) {
      await client.query('ROLLBACK')
      const existing = await requestModel.findByPublicRequestId(publicRequestId)
      if (!existing) throw new AccountCreationError(CODES.REQUEST_NOT_FOUND, 'Request not found.')
      throw new AccountCreationError(CODES.REQUEST_NOT_ELIGIBLE, `This request has already been decided (status: ${existing.status}).`)
    }

    let user = await findUserByIdentifier(request.applicant_email || request.applicant_phone, request.applicant_email ? 'EMAIL' : 'PHONE', client)
    if (!user) {
      user = await createUserFromOtp(
        { identifier: request.applicant_email || request.applicant_phone, identifierType: request.applicant_email ? 'EMAIL' : 'PHONE', name: request.applicant_name },
        client,
      )
    }

    const slug = await ensureUniqueSlug(request.ground_name, client)
    const ground = await createGround(
      {
        publicGroundId: generatePublicId('GRD', 8),
        slug,
        name: request.ground_name,
        description: request.ground_description,
        addressLine: request.address_line,
        city: request.city,
        state: request.state,
        country: request.country,
        postalCode: request.postal_code,
        latitude: request.latitude,
        longitude: request.longitude,
        phone: request.ground_phone,
        email: request.ground_email,
        website: request.ground_website,
        status: 'ACTIVE', // approval is what makes it public — matches the pre-Phase-4 "approve activates it" semantic
      },
      client,
    )

    await createMembership({ groundId: ground.id, userId: user.id, role: 'GROUND_OWNER', isActive: true }, client)

    // Re-run the UPDATE now that we know the real ground id (the guard UPDATE
    // above intentionally didn't have it yet, so the eligibility check could
    // run before any other write happened).
    await client.query(`UPDATE ground_owner_requests SET created_ground_id = $2 WHERE id = $1`, [request.id, ground.id])

    await recordEvent(
      ACCOUNT_AUDIT_EVENTS.GROUND_OWNER_APPROVED,
      { actorUserId, targetUserId: user.id, targetRequestId: request.id, metadata: { groundPublicId: ground.public_ground_id, groundName: ground.name } },
      client,
    )

    await client.query('COMMIT')
    logger.info('Ground owner request approved', { publicRequestId, userId: user.id, groundPublicId: ground.public_ground_id })
    return { request: { ...request, status: 'APPROVED', created_ground_id: ground.id }, user, ground }
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {})
    throw err
  } finally {
    client.release()
  }
}

export async function rejectRequest(publicRequestId, actorUserId, reason) {
  const reasonResult = requiredText(reason, FIELD_LIMITS.rejectionReason)
  if (reasonResult.error) throw new AccountCreationError(CODES.VALIDATION_ERROR, 'A rejection reason is required.')

  const request = await requestModel.markRejected(publicRequestId, { reviewedBy: actorUserId, reason: reasonResult.value })
  if (!request) {
    const existing = await requestModel.findByPublicRequestId(publicRequestId)
    if (!existing) throw new AccountCreationError(CODES.REQUEST_NOT_FOUND, 'Request not found.')
    throw new AccountCreationError(CODES.REQUEST_NOT_ELIGIBLE, `This request has already been decided (status: ${existing.status}).`)
  }

  await recordEvent(ACCOUNT_AUDIT_EVENTS.GROUND_OWNER_REJECTED, { actorUserId, targetRequestId: request.id, metadata: { reason: reasonResult.value } })
  return request
}

export async function requestMoreInformation(publicRequestId, actorUserId, notes) {
  const notesResult = requiredText(notes, FIELD_LIMITS.moreInfoNotes)
  if (notesResult.error) throw new AccountCreationError(CODES.VALIDATION_ERROR, 'Notes describing what is needed are required.')

  const request = await requestModel.markMoreInfoRequested(publicRequestId, { reviewedBy: actorUserId, notes: notesResult.value })
  if (!request) {
    const existing = await requestModel.findByPublicRequestId(publicRequestId)
    if (!existing) throw new AccountCreationError(CODES.REQUEST_NOT_FOUND, 'Request not found.')
    throw new AccountCreationError(CODES.REQUEST_NOT_ELIGIBLE, `This request has already been decided (status: ${existing.status}).`)
  }

  await recordEvent(ACCOUNT_AUDIT_EVENTS.GROUND_OWNER_MORE_INFO_REQUESTED, { actorUserId, targetRequestId: request.id, metadata: { notes: notesResult.value } })
  return request
}
