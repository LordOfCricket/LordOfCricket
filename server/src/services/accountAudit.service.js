import { insertEvent } from '../models/accountAuditLog.model.js'

// Phase 4 — thin wrapper so every call site uses the exact same 8 event
// names from the brief rather than each caller inventing its own string.
// Accepts an optional transaction client so a caller inside a `pg`
// transaction (see groundOwnerRequest.service.js#approveRequest,
// groundStaff.service.js) can log atomically with the rest of that
// transaction — see models/accountAuditLog.model.js for why this is raw
// SQL rather than Prisma.
export const ACCOUNT_AUDIT_EVENTS = Object.freeze({
  PLAYER_REGISTERED: 'PLAYER_REGISTERED',
  UMPIRE_REGISTERED: 'UMPIRE_REGISTERED',
  GROUND_OWNER_REQUEST_SUBMITTED: 'GROUND_OWNER_REQUEST_SUBMITTED',
  GROUND_OWNER_REQUEST_REVIEW_STARTED: 'GROUND_OWNER_REQUEST_REVIEW_STARTED',
  GROUND_OWNER_APPROVED: 'GROUND_OWNER_APPROVED',
  GROUND_OWNER_REJECTED: 'GROUND_OWNER_REJECTED',
  GROUND_OWNER_MORE_INFO_REQUESTED: 'GROUND_OWNER_MORE_INFO_REQUESTED',
  STAFF_CREATED: 'STAFF_CREATED',
  // Phase 5 — granular Staff permissions.
  PERMISSION_GRANTED: 'PERMISSION_GRANTED',
  PERMISSION_REVOKED: 'PERMISSION_REVOKED',
  STAFF_DISABLED: 'STAFF_DISABLED',
  // Phase 6 — privileged-account MFA & step-up.
  PASSKEY_REGISTERED: 'PASSKEY_REGISTERED',
  PASSKEY_REVOKED: 'PASSKEY_REVOKED',
  PASSKEY_AUTHENTICATION_SUCCESS: 'PASSKEY_AUTHENTICATION_SUCCESS',
  PASSKEY_AUTHENTICATION_FAILURE: 'PASSKEY_AUTHENTICATION_FAILURE',
  TOTP_ENABLED: 'TOTP_ENABLED',
  TOTP_DISABLED: 'TOTP_DISABLED',
  TOTP_VERIFICATION_SUCCESS: 'TOTP_VERIFICATION_SUCCESS',
  TOTP_VERIFICATION_FAILURE: 'TOTP_VERIFICATION_FAILURE',
  MFA_ENROLLMENT_STARTED: 'MFA_ENROLLMENT_STARTED',
  MFA_ENROLLMENT_COMPLETED: 'MFA_ENROLLMENT_COMPLETED',
  MFA_DISABLED: 'MFA_DISABLED',
  MFA_RECOVERY_STARTED: 'MFA_RECOVERY_STARTED',
  MFA_RECOVERY_COMPLETED: 'MFA_RECOVERY_COMPLETED',
  STEP_UP_REQUESTED: 'STEP_UP_REQUESTED',
  STEP_UP_SUCCEEDED: 'STEP_UP_SUCCEEDED',
  STEP_UP_FAILED: 'STEP_UP_FAILED',
  SESSION_REVOKED_FOR_SECURITY_REASON: 'SESSION_REVOKED_FOR_SECURITY_REASON',
})

export async function recordEvent(eventType, { actorUserId, targetUserId, targetRequestId, metadata } = {}, client) {
  return insertEvent({ eventType, actorUserId, targetUserId, targetRequestId, metadata }, client)
}
