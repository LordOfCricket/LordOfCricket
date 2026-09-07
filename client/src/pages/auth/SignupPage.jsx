import { Link } from 'react-router-dom'
import { ArrowRight, ShieldCheck, CheckCircle2 } from 'lucide-react'
import Input from '../../components/ui/Input.jsx'
import { useSignupPage } from '../../hooks/useSignupPage.js'

// Length-tiered only, matching domain/otpAuth/password.js's own length-over-
// complexity policy (8-128 chars, no forced character classes) — a strength
// meter that pushed for symbol/digit substitutions would contradict the
// actual server-side policy it's supposed to reflect.
function passwordStrength(password) {
  if (!password) return null
  if (password.length < 8) return { label: 'Too short', className: 'text-red-300', barClass: 'w-1/4 bg-red-400' }
  if (password.length < 12) return { label: 'Fair', className: 'text-yellow-300', barClass: 'w-2/4 bg-yellow-400' }
  if (password.length < 16) return { label: 'Good', className: 'text-green-300', barClass: 'w-3/4 bg-green-400' }
  return { label: 'Strong', className: 'text-green-300', barClass: 'w-full bg-green-400' }
}

function VerifiedBadge() {
  return (
    <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-green-400">
      <CheckCircle2 className="h-4 w-4" /> Verified
    </span>
  )
}

export default function SignupPage() {
  const {
    firstName,
    setFirstName,
    middleName,
    setMiddleName,
    lastName,
    setLastName,
    accountType,
    setAccountType,
    email,
    onEmailChange,
    emailCodeSent,
    emailCode,
    setEmailCode,
    emailVerified,
    emailBusy,
    emailCooldown,
    emailError,
    sendEmailCode,
    verifyEmailCode,
    phone,
    onPhoneChange,
    phoneCodeSent,
    phoneCode,
    setPhoneCode,
    phoneVerified,
    phoneBusy,
    phoneCooldown,
    phoneError,
    sendPhoneCode,
    verifyPhoneCode,
    password,
    setPassword,
    confirmPassword,
    setConfirmPassword,
    error,
    submitting,
    accountCreated,
    canSubmit,
    submitCreateAccount,
  } = useSignupPage()

  const strength = passwordStrength(password)

  if (accountCreated) {
    return (
      <main
        className="flex min-h-screen items-center justify-center bg-cover bg-center bg-no-repeat font-loc-body text-loc-warmwhite"
        style={{
          backgroundImage: `
            radial-gradient(ellipse 45% 40% at 15% 10%, color-mix(in srgb, var(--color-loc-gold) 10%, transparent), transparent 60%),
            linear-gradient(rgba(14,18,16,0.86), rgba(14,18,16,0.9)),
            url('/images/cricket-stadium.jpg')
          `,
        }}
      >
        <div className="mx-auto w-full max-w-lg rounded-[32px] border border-white/10 bg-loc-dark/60 p-10 text-center shadow-2xl shadow-black/40 ring-1 ring-white/5 backdrop-blur-2xl">
          <CheckCircle2 className="mx-auto h-14 w-14 text-loc-gold" />
          <h1 className="mt-6 font-loc-display text-3xl font-extrabold tracking-tight text-loc-warmwhite uppercase">Account Created</h1>
          <p className="mt-4 text-loc-text2-dark">Your LOC account is ready. Sign in with your email or phone number and your new password.</p>
          <Link
            to="/login"
            className="mt-8 flex h-14 w-full items-center justify-center gap-2 rounded-full bg-loc-gold px-8 font-loc-display text-sm font-bold tracking-[0.05em] text-loc-dark uppercase shadow-lg shadow-black/30 transition-colors duration-200 hover:bg-loc-warmwhite"
          >
            Continue to Login <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </main>
    )
  }

  return (
    <main
      className="min-h-screen bg-cover bg-center bg-no-repeat py-16 font-loc-body text-loc-warmwhite"
      style={{
        backgroundImage: `
          radial-gradient(ellipse 45% 40% at 15% 10%, color-mix(in srgb, var(--color-loc-gold) 10%, transparent), transparent 60%),
          linear-gradient(rgba(14,18,16,0.86), rgba(14,18,16,0.9)),
          url('/images/cricket-stadium.jpg')
        `,
      }}
    >
      <section className="mx-auto flex min-h-full max-w-3xl flex-col items-center px-6">
        <div className="w-full text-center">
          <span className="font-loc-display text-xs font-bold tracking-[0.3em] text-loc-gold uppercase sm:text-sm">Join LOC</span>
          <h1 className="mt-4 font-loc-display text-4xl leading-[0.95] font-extrabold tracking-tight text-loc-warmwhite uppercase sm:text-5xl">
            Create Your <span className="text-loc-gold">Account</span>
          </h1>
          <p className="mt-4 text-lg text-loc-text2-dark">One account for every LOC role — Player or Umpire.</p>
        </div>

        <form
          onSubmit={submitCreateAccount}
          className="mt-10 w-full space-y-8 rounded-[32px] border border-white/10 bg-loc-dark/60 p-8 shadow-2xl shadow-black/40 ring-1 ring-white/5 backdrop-blur-2xl sm:p-10"
        >
          {/* --- Name --- */}
          <div>
            <span className="mb-3 block text-sm font-semibold tracking-wide text-loc-text2-dark uppercase">Full Name</span>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <Input label="First Name*" type="text" value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="First name" autoFocus required />
              <Input label="Middle Name*" type="text" value={middleName} onChange={(e) => setMiddleName(e.target.value)} placeholder="Middle name" required />
              <Input label="Last Name*" type="text" value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Last name" required />
            </div>
          </div>

          {/* --- Account Type --- */}
          <div>
            <span className="mb-3 block text-sm font-semibold tracking-wide text-loc-text2-dark uppercase">Register as</span>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {[
                { value: 'PLAYER', label: 'Player' },
                { value: 'UMPIRE', label: 'Umpire' },
              ].map((option) => (
                <label
                  key={option.value}
                  className={`flex cursor-pointer items-center gap-3 rounded-2xl border px-5 py-4 backdrop-blur-md transition-all duration-200 ${
                    accountType === option.value ? 'border-loc-gold bg-loc-gold/10' : 'border-white/15 bg-white/5 hover:border-white/30'
                  }`}
                >
                  <input
                    type="radio"
                    name="accountType"
                    value={option.value}
                    checked={accountType === option.value}
                    onChange={(e) => setAccountType(e.target.value)}
                    className="h-4 w-4 accent-[var(--color-loc-gold)]"
                    required
                  />
                  <span className="text-base font-semibold text-loc-warmwhite">{option.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* --- Email verification --- */}
          <div className="space-y-3 rounded-2xl border border-white/10 bg-white/5 p-5">
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm font-semibold tracking-wide text-loc-text2-dark uppercase">Email Address*</span>
              {emailVerified && <VerifiedBadge />}
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
              <div className="flex-1">
                <Input type="email" value={email} onChange={(e) => onEmailChange(e.target.value)} placeholder="you@example.com" disabled={emailVerified} required />
              </div>
              {!emailVerified && (
                <button
                  type="button"
                  onClick={sendEmailCode}
                  disabled={emailBusy || emailCooldown > 0}
                  className="h-14 shrink-0 rounded-2xl border border-white/15 bg-white/5 px-6 text-sm font-bold tracking-wide text-loc-warmwhite uppercase transition-all duration-200 hover:border-loc-gold/50 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {emailCooldown > 0 ? `Resend in ${emailCooldown}s` : emailCodeSent ? 'Resend Code' : 'Send Verification Code'}
                </button>
              )}
            </div>
            {emailCodeSent && !emailVerified && (
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                <div className="flex-1">
                  <Input
                    label="Verification Code"
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    value={emailCode}
                    onChange={(e) => setEmailCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="000000"
                  />
                </div>
                <button
                  type="button"
                  onClick={verifyEmailCode}
                  disabled={emailBusy}
                  className="h-14 shrink-0 rounded-2xl bg-loc-gold px-6 text-sm font-bold tracking-wide text-loc-dark uppercase transition-colors duration-200 hover:bg-loc-warmwhite disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Verify Email
                </button>
              </div>
            )}
            {emailError && <p className="text-sm text-red-300">{emailError}</p>}
          </div>

          {/* --- Phone verification --- */}
          <div className="space-y-3 rounded-2xl border border-white/10 bg-white/5 p-5">
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm font-semibold tracking-wide text-loc-text2-dark uppercase">Phone Number*</span>
              {phoneVerified && <VerifiedBadge />}
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
              <div className="flex-1">
                <Input type="tel" value={phone} onChange={(e) => onPhoneChange(e.target.value)} placeholder="+91XXXXXXXXXX" disabled={phoneVerified} required />
              </div>
              {!phoneVerified && (
                <button
                  type="button"
                  onClick={sendPhoneCode}
                  disabled={phoneBusy || phoneCooldown > 0}
                  className="h-14 shrink-0 rounded-2xl border border-white/15 bg-white/5 px-6 text-sm font-bold tracking-wide text-loc-warmwhite uppercase transition-all duration-200 hover:border-loc-gold/50 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {phoneCooldown > 0 ? `Resend in ${phoneCooldown}s` : phoneCodeSent ? 'Resend OTP' : 'Send OTP'}
                </button>
              )}
            </div>
            {phoneCodeSent && !phoneVerified && (
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                <div className="flex-1">
                  <Input
                    label="Enter OTP"
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    value={phoneCode}
                    onChange={(e) => setPhoneCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="000000"
                  />
                </div>
                <button
                  type="button"
                  onClick={verifyPhoneCode}
                  disabled={phoneBusy}
                  className="h-14 shrink-0 rounded-2xl bg-loc-gold px-6 text-sm font-bold tracking-wide text-loc-dark uppercase transition-colors duration-200 hover:bg-loc-warmwhite disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Verify Phone
                </button>
              </div>
            )}
            {phoneError && <p className="text-sm text-red-300">{phoneError}</p>}
          </div>

          {/* --- Password --- */}
          <div className="space-y-5">
            <div>
              <Input label="Password*" type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 8 characters" required />
              {strength && (
                <div className="mt-2 flex items-center gap-3">
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/10">
                    <div className={`h-full rounded-full transition-all duration-300 ${strength.barClass}`} />
                  </div>
                  <span className={`text-xs font-semibold tracking-wide uppercase ${strength.className}`}>Password strength: {strength.label}</span>
                </div>
              )}
            </div>
            <Input
              label="Confirm Password*"
              type="password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Re-enter your password"
              required
            />
            {password && confirmPassword && password !== confirmPassword && <p className="text-sm text-red-300">Passwords do not match.</p>}
          </div>

          {error && <div className="rounded-2xl border border-red-400/30 bg-red-500/10 px-5 py-4 text-sm text-red-300">{error}</div>}

          <button
            type="submit"
            disabled={!canSubmit}
            className="group flex h-14 w-full items-center justify-center gap-2 rounded-full bg-loc-gold px-8 font-loc-display text-sm font-bold tracking-[0.05em] text-loc-dark uppercase shadow-lg shadow-black/30 transition-colors duration-200 hover:bg-loc-warmwhite disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting ? (
              'Creating account…'
            ) : (
              <>
                Create Account <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" />
              </>
            )}
          </button>

          <div className="flex flex-col items-center gap-4">
            <Link to="/login" className="text-sm text-loc-text2-dark underline-offset-4 hover:text-loc-warmwhite hover:underline">
              Already have an account? Sign in
            </Link>
            <div className="flex items-center justify-center gap-2 text-xs text-loc-text2-dark">
              <ShieldCheck className="h-4 w-4 text-loc-gold" />
              One secure sign-in for every LOC role.
            </div>
          </div>
        </form>
      </section>
    </main>
  )
}
