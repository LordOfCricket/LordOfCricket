import twilio from 'twilio'
import { logger } from '../../utils/logger.js'

let client = null

function getClient() {
  if (!client) {
    client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)
  }
  return client
}

export function isTwilioConfigured() {
  return Boolean(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_VERIFY_SERVICE_SID)
}

// Twilio Verify (not raw SMS) — Twilio itself generates, delivers, and
// checks the code for the phone channel; LOC never sees or stores it.
// This is why otp_codes.otp_hash is nullable and provider='TWILIO_VERIFY'
// rows carry no local hash — the local row exists purely for identifier-
// scoped rate limiting/audit, not as a second verification source (see
// schema.sql's comment on otp_codes and services/otp.service.js).
export async function sendTwilioVerification(identifier) {
  try {
    const verification = await getClient().verify.v2.services(process.env.TWILIO_VERIFY_SERVICE_SID).verifications.create({
      to: identifier,
      channel: 'sms',
    })
    return { delivered: true, provider: 'twilio_verify', status: verification.status }
  } catch (err) {
    logger.error('Twilio Verify send failed', { error: err.message })
    throw err
  }
}

// Returns Twilio's own verdict ('approved' means the code was correct and
// not yet consumed). Twilio enforces its own attempt/expiry limits on this
// call — LOC's otp.service.js additionally enforces its own local
// attempts/expiry on the bookkeeping row so both layers agree.
export async function checkTwilioVerification(identifier, code) {
  try {
    const check = await getClient().verify.v2.services(process.env.TWILIO_VERIFY_SERVICE_SID).verificationChecks.create({
      to: identifier,
      code,
    })
    return check.status === 'approved'
  } catch (err) {
    // Twilio throws (rather than returning a non-approved status) for some
    // invalid-input cases (e.g. no pending verification found) — treated
    // as "not verified", not a server error, so the caller returns the
    // same generic invalid-code response either way.
    logger.warn('Twilio Verify check did not approve', { error: err.message })
    return false
  }
}
