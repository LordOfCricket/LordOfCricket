import { useEffect, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from './useAuth.js'
import { getPostLoginPath } from '../models/roleRedirect.model.js'

const RESEND_COOLDOWN_SECONDS = 30
const OTP_LENGTH = 6

// Phase 4 — 'login' (default) reuses Phase 3's find-or-create OTP flow
// unchanged. 'register-player'/'register-umpire' are new: an explicit
// self-registration entry point (?mode=register-player/register-umpire on
// this same page) that collects a name up front and 409s on an identifier
// that's already registered, rather than silently logging that person in.
// Either way, verifying the code hits the SAME /auth/verify-otp endpoint —
// this hook doesn't brand the OTP step itself, only which function
// requests the code.
const VALID_MODES = ['login', 'register-player', 'register-umpire']

// Phase 3 — unified OTP login. Two steps only: enter an email or phone
// number, then enter the code that arrives for it. There is no separate
// signup step or per-role tab — a brand-new identifier is registered
// automatically on first successful verification (see
// server/src/services/otpAuth.service.js's "find-or-create" comment); this
// hook doesn't need to know or care which happened, it just follows
// whatever getPostLoginPath sends a freshly authenticated user to, exactly
// as the old password flow already did.
export function useAuthPage() {
  const { requestOtp, verifyOtp, registerPlayerOtp, registerUmpireOtp } = useAuth()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()

  const rawMode = searchParams.get('mode')
  const mode = VALID_MODES.includes(rawMode) ? rawMode : 'login'
  const isRegisterMode = mode !== 'login'

  const [step, setStep] = useState('identifier')
  const [identifier, setIdentifier] = useState('')
  const [name, setName] = useState('')
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [resendCooldown, setResendCooldown] = useState(0)
  const cooldownInterval = useRef(null)

  useEffect(() => {
    return () => clearInterval(cooldownInterval.current)
  }, [])

  const setMode = (nextMode) => {
    setSearchParams(nextMode === 'login' ? {} : { mode: nextMode })
    setStep('identifier')
    setError('')
    setCode('')
  }

  const startCooldown = (seconds = RESEND_COOLDOWN_SECONDS) => {
    setResendCooldown(seconds)
    clearInterval(cooldownInterval.current)
    cooldownInterval.current = setInterval(() => {
      setResendCooldown((current) => {
        if (current <= 1) {
          clearInterval(cooldownInterval.current)
          return 0
        }
        return current - 1
      })
    }, 1000)
  }

  const sendCodeForMode = () => {
    const trimmedIdentifier = identifier.trim()
    if (mode === 'register-player') return registerPlayerOtp(name.trim(), trimmedIdentifier)
    if (mode === 'register-umpire') return registerUmpireOtp(name.trim(), trimmedIdentifier)
    return requestOtp(trimmedIdentifier)
  }

  const requestCode = async (e) => {
    e.preventDefault()
    setError('')
    if (!identifier.trim()) {
      setError('Enter your email address or phone number.')
      return
    }
    if (isRegisterMode && !name.trim()) {
      setError('Enter your name.')
      return
    }

    setSubmitting(true)
    try {
      await sendCodeForMode()
      setStep('otp')
      startCooldown()
    } catch (err) {
      setError(err.response?.data?.message || 'Something went wrong. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const verifyCode = async (e) => {
    e.preventDefault()
    setError('')
    if (code.length !== OTP_LENGTH) {
      setError(`Enter the ${OTP_LENGTH}-digit code.`)
      return
    }

    setSubmitting(true)
    try {
      const user = await verifyOtp(identifier.trim(), code)
      const destination = getPostLoginPath(user)
      if (destination === '/') navigate('/')
      else navigate(destination, { replace: true })
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid or expired code.')
    } finally {
      setSubmitting(false)
    }
  }

  const resendCode = async () => {
    if (resendCooldown > 0 || submitting) return
    setError('')
    setSubmitting(true)
    try {
      await sendCodeForMode()
      startCooldown()
    } catch (err) {
      setError(err.response?.data?.message || 'Something went wrong. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const changeIdentifier = () => {
    setStep('identifier')
    setCode('')
    setError('')
    clearInterval(cooldownInterval.current)
    setResendCooldown(0)
  }

  return {
    mode,
    setMode,
    isRegisterMode,
    step,
    identifier,
    setIdentifier,
    name,
    setName,
    code,
    setCode,
    error,
    submitting,
    resendCooldown,
    requestCode,
    verifyCode,
    resendCode,
    changeIdentifier,
  }
}
