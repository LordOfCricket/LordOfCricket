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

// UI Correction — this is ONE component (AuthPage.jsx) with an internal
// `step` state; there is no route change anywhere in this file except the
// final post-auth `navigate()`. What changed from the previous revision is
// only WHICH step is the default landing view for login mode, and removing
// the 'method' choice step entirely:
//
//   login mode:    'password' (DEFAULT — identifier + password together,
//                   Login, Forgot Password?, and a "Login with OTP" button
//                   all on this one view) -> 'otp-request' -> 'otp-verify'
//                   (reached only via "Login with OTP"), or
//                   -> 'forgot-request' -> 'forgot-reset' (reached only via
//                   "Forgot password?")
//   register modes: 'identifier' (name + identifier) -> 'otp', unchanged —
//                   registration was never asked to gain a password option
//                   or a method choice, only login was.
//
// Previously login also opened on an identifier-only view with a separate
// "choose OTP or password" step before either credential field appeared —
// that read as two different login pages to a user even though it was
// technically one component/route the whole time. Collapsing 'identifier'
// + 'method' into a single default 'password' view (both fields visible
// immediately) is the actual fix here.
export function useAuthPage() {
  const { requestOtp, verifyOtp, registerPlayerOtp, registerUmpireOtp, loginWithPassword, forgotPassword, resetPassword } = useAuth()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()

  const rawMode = searchParams.get('mode')
  const mode = VALID_MODES.includes(rawMode) ? rawMode : 'login'
  const isRegisterMode = mode !== 'login'

  const [step, setStep] = useState(isRegisterMode ? 'identifier' : 'password')
  const [identifier, setIdentifier] = useState('')
  const [name, setName] = useState('')
  const [code, setCode] = useState('')
  const [password, setPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  // Distinct from `error` — used for the one non-error message this flow
  // produces ("password reset successful"), so AuthPage can style it
  // differently (not the red error box) without overloading `error`'s
  // existing meaning everywhere else in this hook.
  const [info, setInfo] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [resendCooldown, setResendCooldown] = useState(0)
  const cooldownInterval = useRef(null)

  useEffect(() => {
    return () => clearInterval(cooldownInterval.current)
  }, [])

  // Clears only the fields that shouldn't silently carry over into a
  // different view (a stale OTP code, a half-typed new password) —
  // `identifier` is deliberately NEVER cleared by this: switching between
  // password/OTP/forgot-password views keeps whatever the user already
  // typed, since asking them to retype the same email/phone for every
  // sub-view of the SAME login page would be exactly the friction this
  // task exists to remove.
  const resetTransientFields = () => {
    setError('')
    setInfo('')
    setCode('')
    setPassword('')
    setNewPassword('')
    setConfirmPassword('')
  }

  const setMode = (nextMode) => {
    setSearchParams(nextMode === 'login' ? {} : { mode: nextMode })
    setStep(nextMode === 'login' ? 'password' : 'identifier')
    resetTransientFields()
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

  // Registration only (login never reaches this — see submitPassword below
  // for login's own identifier+password submit). Unchanged from before.
  const requestCode = async (e) => {
    e.preventDefault()
    setError('')
    if (!identifier.trim()) {
      setError('Enter your email address or phone number.')
      return
    }
    if (!name.trim()) {
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

  // Login mode's default view — identifier + password together, one
  // submit. Same post-auth navigation verifyCode/submitPasswordReset's
  // sibling flows use (the backend response shape and getPostLoginPath's
  // routing are identical no matter which credential authenticated).
  const submitPassword = async (e) => {
    e.preventDefault()
    setError('')
    if (!identifier.trim()) {
      setError('Enter your email address or phone number.')
      return
    }
    if (!password) {
      setError('Enter your password.')
      return
    }
    setSubmitting(true)
    try {
      const user = await loginWithPassword(identifier.trim(), password)
      const destination = getPostLoginPath(user)
      if (destination === '/') navigate('/')
      else navigate(destination, { replace: true })
    } catch (err) {
      setError(err.response?.data?.message || 'Incorrect email/phone or password.')
    } finally {
      setSubmitting(false)
    }
  }

  // "Login with OTP" — switches this SAME page to its OTP view (no
  // navigation), carrying over whatever identifier is already typed rather
  // than clearing it.
  const startOtpLogin = () => {
    resetTransientFields()
    setStep('otp-request')
  }

  const requestOtpCode = async (e) => {
    e.preventDefault()
    setError('')
    if (!identifier.trim()) {
      setError('Enter your email address or phone number.')
      return
    }
    setSubmitting(true)
    try {
      await sendCodeForMode()
      setStep('otp-verify')
      startCooldown()
    } catch (err) {
      setError(err.response?.data?.message || 'Something went wrong. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  // Shared by registration's 'otp' step AND login's 'otp-verify' step —
  // both hit the exact same POST /auth/verify-otp with identical handling.
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

  // Back to the default login view from either OTP sub-step.
  const backToPasswordLogin = () => {
    resetTransientFields()
    clearInterval(cooldownInterval.current)
    setResendCooldown(0)
    setStep('password')
  }

  // "Forgot password?" — same page, forgot-password view. Carries over
  // whatever identifier is already typed on the password view.
  const startForgotPassword = () => {
    resetTransientFields()
    setStep('forgot-request')
  }

  const requestPasswordReset = async (e) => {
    e.preventDefault()
    setError('')
    if (!identifier.trim()) {
      setError('Enter your email address or phone number.')
      return
    }
    setSubmitting(true)
    try {
      await forgotPassword(identifier.trim())
      setCode('')
      setNewPassword('')
      setConfirmPassword('')
      setStep('forgot-reset')
      startCooldown()
    } catch (err) {
      setError(err.response?.data?.message || 'Something went wrong. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const resendPasswordReset = async () => {
    if (resendCooldown > 0 || submitting) return
    setError('')
    setSubmitting(true)
    try {
      await forgotPassword(identifier.trim())
      startCooldown()
    } catch (err) {
      setError(err.response?.data?.message || 'Something went wrong. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const submitPasswordReset = async (e) => {
    e.preventDefault()
    setError('')
    if (code.length !== OTP_LENGTH) {
      setError(`Enter the ${OTP_LENGTH}-digit code.`)
      return
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }
    setSubmitting(true)
    try {
      await resetPassword(identifier.trim(), code, newPassword, confirmPassword)
      resetTransientFields()
      setInfo('Password reset successful. Please log in with your new password.')
      setStep('password')
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid or expired code.')
    } finally {
      setSubmitting(false)
    }
  }

  // Back to the default login view from either forgot-password sub-step.
  const backToLogin = () => {
    resetTransientFields()
    clearInterval(cooldownInterval.current)
    setResendCooldown(0)
    setStep('password')
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
    password,
    setPassword,
    newPassword,
    setNewPassword,
    confirmPassword,
    setConfirmPassword,
    error,
    info,
    submitting,
    resendCooldown,
    requestCode,
    verifyCode,
    resendCode,
    submitPassword,
    startOtpLogin,
    requestOtpCode,
    backToPasswordLogin,
    startForgotPassword,
    requestPasswordReset,
    resendPasswordReset,
    submitPasswordReset,
    backToLogin,
  }
}
