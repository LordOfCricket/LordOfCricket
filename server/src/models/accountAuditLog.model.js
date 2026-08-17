import { pool } from '../config/db.js'

// Phase 4 — raw SQL, not Prisma; see groundOwnerRequest.model.js's header
// comment for why (this table is written inside the same cross-table
// transactions as ground_owner_requests/users/grounds/ground_users).

export async function insertEvent({ eventType, actorUserId = null, targetUserId = null, targetRequestId = null, metadata = null }, client = pool) {
  const { rows } = await client.query(
    `INSERT INTO account_audit_log (event_type, actor_user_id, target_user_id, target_request_id, metadata)
     VALUES ($1,$2,$3,$4,$5)
     RETURNING *`,
    [eventType, actorUserId, targetUserId, targetRequestId, metadata],
  )
  return rows[0]
}
