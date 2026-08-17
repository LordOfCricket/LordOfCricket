import { pool } from '../config/db.js'

// Phase 4 — raw SQL, not Prisma, despite being a brand-new table (a
// deliberate deviation from the Phase 2A/3 "new table -> Prisma" default).
// The approval flow (services/groundOwnerRequest.service.js#approveRequest)
// must atomically update this table AND create rows in users/grounds/
// ground_users/account_audit_log in the SAME Postgres transaction — Prisma
// and the `pg` Pool are separate connections, so genuine cross-table
// atomicity requires one client throughout. Consistency (one access
// pattern for this table, not two) won out over the general convention.
// Every function accepts an optional trailing transaction client, same
// pattern as ground.model.js/groundUser.model.js/user.model.js.

const COLUMNS = `id, public_request_id, applicant_name, applicant_email, applicant_phone,
  ground_name, ground_description, address_line, city, state, country, postal_code,
  latitude, longitude, ground_phone, ground_email, ground_website,
  status, rejection_reason, more_info_notes, reviewed_at, reviewed_by, created_ground_id,
  created_at, updated_at`

export async function createRequest({
  publicRequestId, applicantName, applicantEmail, applicantPhone,
  groundName, groundDescription, addressLine, city, state, country = 'India', postalCode,
  latitude, longitude, groundPhone, groundEmail, groundWebsite,
}, client = pool) {
  const { rows } = await client.query(
    `INSERT INTO ground_owner_requests
       (public_request_id, applicant_name, applicant_email, applicant_phone,
        ground_name, ground_description, address_line, city, state, country, postal_code,
        latitude, longitude, ground_phone, ground_email, ground_website)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
     RETURNING ${COLUMNS}`,
    [publicRequestId, applicantName, applicantEmail, applicantPhone,
      groundName, groundDescription, addressLine, city, state, country, postalCode,
      latitude, longitude, groundPhone, groundEmail, groundWebsite],
  )
  return rows[0]
}

export async function findByPublicRequestId(publicRequestId, client = pool) {
  const { rows } = await client.query(`SELECT ${COLUMNS} FROM ground_owner_requests WHERE public_request_id = $1`, [publicRequestId])
  return rows[0] || null
}

export async function listByStatus(status, client = pool) {
  const { rows } = status
    ? await client.query(`SELECT ${COLUMNS} FROM ground_owner_requests WHERE status = $1 ORDER BY created_at DESC`, [status])
    : await client.query(`SELECT ${COLUMNS} FROM ground_owner_requests ORDER BY created_at DESC`)
  return rows
}

export async function markUnderReview(publicRequestId, client = pool) {
  const { rows } = await client.query(
    `UPDATE ground_owner_requests SET status = 'UNDER_REVIEW', updated_at = NOW()
     WHERE public_request_id = $1 AND status = 'PENDING'
     RETURNING ${COLUMNS}`,
    [publicRequestId],
  )
  return rows[0] || null
}

// The concurrency/idempotency guarantee (brief §22): the WHERE clause's own
// status check means a double-click or two simultaneous approve requests
// can only ever have ONE of them actually match a row — the second attempt
// affects zero rows and this returns null, which the service treats as
// "already decided" rather than silently re-running the whole approval.
// This is checked by the database itself, inside the transaction, not by a
// separate SELECT-then-UPDATE in application code (which would race).
export async function markApprovedIfEligible(publicRequestId, { reviewedBy, createdGroundId }, client) {
  const { rows } = await client.query(
    `UPDATE ground_owner_requests
     SET status = 'APPROVED', reviewed_at = NOW(), reviewed_by = $2, created_ground_id = $3, updated_at = NOW()
     WHERE public_request_id = $1 AND status IN ('PENDING', 'UNDER_REVIEW', 'MORE_INFORMATION_REQUIRED')
     RETURNING ${COLUMNS}`,
    [publicRequestId, reviewedBy, createdGroundId],
  )
  return rows[0] || null
}

export async function markRejected(publicRequestId, { reviewedBy, reason }, client = pool) {
  const { rows } = await client.query(
    `UPDATE ground_owner_requests
     SET status = 'REJECTED', reviewed_at = NOW(), reviewed_by = $2, rejection_reason = $3, updated_at = NOW()
     WHERE public_request_id = $1 AND status IN ('PENDING', 'UNDER_REVIEW', 'MORE_INFORMATION_REQUIRED')
     RETURNING ${COLUMNS}`,
    [publicRequestId, reviewedBy, reason],
  )
  return rows[0] || null
}

export async function markMoreInfoRequested(publicRequestId, { reviewedBy, notes }, client = pool) {
  const { rows } = await client.query(
    `UPDATE ground_owner_requests
     SET status = 'MORE_INFORMATION_REQUIRED', reviewed_at = NOW(), reviewed_by = $2, more_info_notes = $3, updated_at = NOW()
     WHERE public_request_id = $1 AND status IN ('PENDING', 'UNDER_REVIEW')
     RETURNING ${COLUMNS}`,
    [publicRequestId, reviewedBy, notes],
  )
  return rows[0] || null
}
