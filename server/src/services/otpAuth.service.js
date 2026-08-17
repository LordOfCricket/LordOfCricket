import { detectIdentifierType, normalizeIdentifier } from '../domain/otpAuth/otp.js'
import { OtpAuthError, OTP_AUTH_ERROR_CODES as CODES } from '../domain/otpAuth/errors.js'
import { AccountCreationError, ACCOUNT_CREATION_ERROR_CODES as ACCOUNT_CODES } from '../domain/accountCreation/errors.js'
import { requiredText } from '../domain/accountCreation/validation.js'
import * as otpService from './otp.service.js'
import { createSessionForUser } from './session.service.js'
import { recordEvent, ACCOUNT_AUDIT_EVENTS } from './accountAudit.service.js'
import { findUserByIdentifier, createUserFromOtp } from '../models/user.model.js'
import { createUmpireRequest, findLatestUmpireRequestForUser } from '../models/umpireRequest.model.js'
import { logger } from '../utils/logger.js'

function resolveIdentifier(rawIdentifier) {
  const identifierType = detectIdentifierType(rawIdentifier)
  if (!identifierType) {
    throw new OtpAuthError(CODES.INVALID_IDENTIFIER, 'Enter a valid email address or phone number.')
  }
  return { identifier: normalizeIdentifier(rawIdentifier, identifierType), identifierType }
}

export async function requestLoginOtp(rawIdentifier) {
  const { identifier, identifierType } = resolveIdentifier(rawIdentifier)
  await otpService.requestOtp({ identifier, identifierType })
  return { identifier, identifierType }
}

// Phase 4 — POST /auth/register/player and /auth/register/umpire. Unlike
// requestLoginOtp, this DOES reveal whether the identifier is already
// registered (409) — the brief requires it (no generic role-selection
// registration endpoint; a genuinely new registration path is expected to
// tell the applicant to sign in instead rather than silently OTP'ing them
// into their existing account). `purpose` is 'REGISTER_PLAYER' or
// 'REGISTER_UMPIRE'; `name` is staged in otp_codes.metadata and read back by
// verifyLoginOtp once the code is confirmed, since the account itself isn't
// created until then.
export async function requestRegistrationOtp(name, rawIdentifier, purpose) {
  const nameResult = requiredText(name, 100)
  if (nameResult.error) {
    throw new AccountCreationError(ACCOUNT_CODES.VALIDATION_ERROR, 'Name is required.')
  }

  const { identifier, identifierType } = resolveIdentifier(rawIdentifier)

  const existing = await findUserByIdentifier(identifier, identifierType)
  if (existing) {
    throw new AccountCreationError(
      ACCOUNT_CODES.IDENTIFIER_ALREADY_REGISTERED,
      'An account already exists for this email or phone number. Try signing in instead.'
    )
  }

  await otpService.requestOtp({ identifier, identifierType, purpose, metadata: { name: nameResult.value } })
  return { identifier, identifierType }
}

// Phase 3 — TRANSITIONAL compatibility adapter (see docs/AUTH.md "Legacy
// JWT migration strategy" and the brief's §16/§23-17): a successful OTP
// verification finds the existing account for this identifier, or creates
// a bare one if none exists — matching today's password-signup default
// exactly (role='user', not yet chosen). This unifies "login" and "signup"
// into the one entry point the brief requires (no separate signup form),
// without inventing a new role model — the returned user goes through the
// EXACT SAME existing post-auth role-selection flow
// (roleRedirect.model.js) an old password signup already used. Phase 5
// (RBAC redesign) is the right place to revisit whether find-or-create
// should still be this permissive once GROUND_OWNER/STAFF/SUPER_ADMIN have
// their own dedicated provisioning paths — not this phase.
export async function verifyLoginOtp({ identifier: rawIdentifier, code, ipAddress, userAgent }) {
  const { identifier, identifierType } = resolveIdentifier(rawIdentifier)

  // otpRow.purpose tells us which of the three flows this code was
  // requested for — LOGIN/REGISTER_PLAYER/REGISTER_UMPIRE all funnel
  // through this one verify endpoint (the brief explicitly forbids a
  // separate generic role-selection endpoint), so the branch happens here,
  // after the code itself is confirmed, not before.
  const otpRow = await otpService.verifyOtp({ identifier, identifierType, code })

  let user = await findUserByIdentifier(identifier, identifierType)
  let isNewRegistration = false

  if (otpRow.purpose === 'REGISTER_PLAYER' || otpRow.purpose === 'REGISTER_UMPIRE') {
    if (!user) {
      const stagedName = otpRow.metadata?.name || (otpRow.purpose === 'REGISTER_UMPIRE' ? 'New Umpire' : 'New Player')
      const playerType = otpRow.purpose === 'REGISTER_UMPIRE' ? 'umpire' : 'team_player'
      user = await createUserFromOtp({ identifier, identifierType, name: stagedName, role: 'player', playerType })
      isNewRegistration = true
      logger.info('New account registered via OTP', { userId: user.id, identifierType, purpose: otpRow.purpose })
    } else {
      // requestRegistrationOtp already rejected this identifier if it was
      // registered at request time — this only fires if a second account
      // was created for the same identifier in the gap between that check
      // and this verification (e.g. via a concurrent login). Rather than
      // fail here, fall back to treating it as an ordinary login for the
      // account that now exists.
      logger.warn('Registration OTP verified but identifier was already claimed by the time of verification — logging in instead', {
        userId: user.id,
        purpose: otpRow.purpose,
      })
    }

    if (otpRow.purpose === 'REGISTER_UMPIRE') {
      // Exactly auth.controller.js#selectPlayerType's existing umpire-request
      // rule (create a pending request unless the latest one is already
      // pending/approved) — idempotent, so safe whether `user` was just
      // created above or already existed.
      const latest = await findLatestUmpireRequestForUser(user.id)
      if (!latest || latest.status === 'rejected') {
        await createUmpireRequest(user.id)
      }
    }
  } else if (!user) {
    // LOGIN purpose — Phase 3's original permissive find-or-create-bare-user
    // compatibility adapter, unchanged.
    user = await createUserFromOtp({ identifier, identifierType, name: 'New User' })
    logger.info('New user created via OTP login', { userId: user.id, identifierType })
  }

  if (user.status !== 'ACTIVE') {
    logger.warn('Login blocked: account not active', { userId: user.id, status: user.status })
    throw new OtpAuthError(CODES.ACCOUNT_NOT_ACTIVE, 'This account is not able to sign in right now. Contact support.')
  }

  if (isNewRegistration) {
    await recordEvent(
      otpRow.purpose === 'REGISTER_UMPIRE' ? ACCOUNT_AUDIT_EVENTS.UMPIRE_REGISTERED : ACCOUNT_AUDIT_EVENTS.PLAYER_REGISTERED,
      { targetUserId: user.id, metadata: { identifierType } }
    )
  }

  const { rawToken, expiresAt } = await createSessionForUser(user.id, { ipAddress, userAgent })
  logger.info('Authentication succeeded (OTP)', { userId: user.id })

  const { password_hash, ...publicUser } = user
  return { user: publicUser, sessionToken: rawToken, sessionExpiresAt: expiresAt }
}
