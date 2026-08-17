import bcrypt from 'bcryptjs'
import { pool } from '../config/db.js'
import { createStaffUser } from '../models/user.model.js'
import { findStaffRoleByName } from '../models/staffRole.model.js'
import { consumeStepUpGrant } from './stepUp.service.js'
import { MfaError, MFA_ERROR_CODES } from '../domain/mfa/errors.js'
import { logger } from '../utils/logger.js'

// Phase 6 — platform staff creation (staff.controller.js) is one of the
// two Super-Admin actions the brief specifically names as step-up-gated
// (it creates a new privileged platform account). This is genuinely new
// business logic (step-up consumption inside a transaction), so it now
// lives in its own service rather than directly in the controller — the
// controller previously had no service to call at all, since this flow
// predates the Route -> Controller -> Service -> Model layering
// established elsewhere in this codebase. The pre-existing duplicate-email
// check (409, with its own message) stays in the controller, run BEFORE
// this is called, unchanged — this function only wraps the actual mutation
// + step-up consumption in one transaction, preserving the exact prior
// behavior/race profile (the unique constraint on users.email was always
// the real backstop, never the pre-check).
export async function createPlatformStaff({ name, email, password, staffId, role }, sessionId) {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    const grant = await consumeStepUpGrant(sessionId, 'STAFF_CREATE', client)
    if (!grant) {
      throw new MfaError(MFA_ERROR_CODES.STEP_UP_REQUIRED, 'This action requires a fresh step-up verification.')
    }

    const staffRole = await findStaffRoleByName(role)
    const passwordHash = await bcrypt.hash(password, 10)
    const user = await createStaffUser({ name, email, passwordHash, staffId: staffId || null, staffRoleId: staffRole.id }, client)

    await client.query('COMMIT')
    logger.info('Platform staff created', { userId: user.id, role })
    return user
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {})
    throw err
  } finally {
    client.release()
  }
}
