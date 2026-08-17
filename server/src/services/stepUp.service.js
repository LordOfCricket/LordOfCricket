import { findActiveGrant, issueGrant, consumeGrant } from '../models/stepUpGrant.model.js'

const DEFAULT_STEP_UP_TTL_MINUTES = 5

// Phase 6 — short-lived, single-use step-up grants. See
// step_up_grants' schema comment and the file header of
// models/stepUpGrant.model.js for why consumption happens inside the gated
// mutation's own transaction, never a standalone middleware.

export function getStepUpTtlMs() {
  return (Number(process.env.STEP_UP_TTL_MINUTES) || DEFAULT_STEP_UP_TTL_MINUTES) * 60 * 1000
}

export async function hasFreshStepUpGrant(sessionId, actionScope) {
  return Boolean(await findActiveGrant(sessionId, actionScope))
}

export async function issueStepUpGrant(sessionId, userId, actionScope) {
  return issueGrant({ sessionId, userId, actionScope, expiresAt: new Date(Date.now() + getStepUpTtlMs()) })
}

// The actual enforcement point — called as the FIRST statement inside the
// gated mutation's own BEGIN/COMMIT transaction (groundStaff.service.js,
// staff.controller.js, groundOwnerRequest.service.js). A caller MUST accept
// the same `client` its transaction already uses, so this consumption
// commits or rolls back atomically with the mutation itself.
export async function consumeStepUpGrant(sessionId, actionScope, client) {
  return consumeGrant(sessionId, actionScope, client)
}
