import { Link } from 'react-router-dom'
import { ArrowRight, ShieldCheck } from 'lucide-react'
import Input from '../../components/ui/Input.jsx'
import { useAuthPage } from '../../hooks/useAuthPage.js'

const COPY = {
  eyebrow: 'Member Access',
  heading: 'Welcome to LOC',
  subtitle: 'Sign in with your email or phone number.',
}

// New Signup Flow — subtitles for login's sub-views. 'password' (the
// default view) uses COPY.subtitle above; these only ever render once the
// user has clicked into a sub-view of this SAME page.
const STEP_SUBTITLE = {
  'otp-request': 'Enter your email or phone number and we’ll send you a code.',
  'forgot-request': 'Enter your email or phone number and we’ll send you a reset code.',
  'forgot-reset': 'Enter the code we sent you, then choose a new password.',
}

export default function AuthPage() {
  const {
    step,
    identifier,
    setIdentifier,
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
  } = useAuthPage()

  const isDefaultLoginView = step === 'password'

  const subtitle =
    step === 'password'
      ? COPY.subtitle
      : step === 'otp-verify'
        ? `Enter the 6-digit code sent to ${identifier}.`
        : STEP_SUBTITLE[step] || COPY.subtitle

  const onSubmit =
    {
      password: submitPassword,
      'otp-request': requestOtpCode,
      'otp-verify': verifyCode,
      'forgot-request': requestPasswordReset,
      'forgot-reset': submitPasswordReset,
    }[step] || ((e) => e.preventDefault())

  return (
    <main
      className="min-h-screen bg-cover bg-center bg-no-repeat font-loc-body text-loc-warmwhite"
      style={{
        backgroundImage: `
          radial-gradient(ellipse 45% 40% at 15% 10%, color-mix(in srgb, var(--color-loc-gold) 10%, transparent), transparent 60%),
          linear-gradient(
            rgba(14,18,16,0.86),
            rgba(14,18,16,0.9)
          ),
          url('/images/cricket-stadium.jpg')
        `,
      }}
    >
      <section className="mx-auto flex min-h-screen max-w-7xl items-center px-8 lg:px-16">
        <div className="w-full max-w-2xl">
          <span className="font-loc-display text-xs font-bold tracking-[0.3em] text-loc-gold uppercase sm:text-sm">
            {COPY.eyebrow}
          </span>

          <h1 className="mt-4 font-loc-display text-5xl leading-[0.95] font-extrabold tracking-tight text-loc-warmwhite uppercase sm:text-6xl">
            Welcome <span className="text-loc-gold">Back</span>
          </h1>

          <p className="mt-5 max-w-xl text-lg text-loc-text2-dark">{subtitle}</p>

          <form
            onSubmit={onSubmit}
            className="mt-10 rounded-[32px] border border-white/10 bg-loc-dark/60 p-10 shadow-2xl shadow-black/40 ring-1 ring-white/5 backdrop-blur-2xl"
          >
            <div className="space-y-7">
              {/* --- Default view: identifier + password together --- */}
              {isDefaultLoginView && (
                <>
                  <Input
                    label="Email or Phone Number"
                    type="text"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    placeholder="you@example.com or +91XXXXXXXXXX"
                    autoFocus
                    required
                  />
                  <Input
                    label="Password"
                    type="password"
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    required
                  />
                  <button
                    type="button"
                    onClick={startForgotPassword}
                    disabled={submitting}
                    className="text-sm text-loc-text2-dark underline-offset-4 hover:text-loc-warmwhite hover:underline disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Forgot password?
                  </button>
                </>
              )}

              {/* --- OTP request sub-view --- */}
              {step === 'otp-request' && (
                <Input
                  label="Email or Phone Number"
                  type="text"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="you@example.com or +91XXXXXXXXXX"
                  autoFocus
                  required
                />
              )}

              {/* --- OTP verify sub-view --- */}
              {step === 'otp-verify' && (
                <Input
                  label="6-Digit Code"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="000000"
                  autoFocus
                  required
                />
              )}

              {/* --- Forgot-password request sub-view --- */}
              {step === 'forgot-request' && (
                <Input
                  label="Email or Phone Number"
                  type="text"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="you@example.com or +91XXXXXXXXXX"
                  autoFocus
                  required
                />
              )}

              {/* --- Forgot-password reset sub-view --- */}
              {step === 'forgot-reset' && (
                <>
                  <Input
                    label="6-Digit Code"
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="000000"
                    autoFocus
                    required
                  />
                  <Input
                    label="New Password"
                    type="password"
                    autoComplete="new-password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="At least 8 characters"
                    required
                  />
                  <Input
                    label="Confirm New Password"
                    type="password"
                    autoComplete="new-password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter your new password"
                    required
                  />
                </>
              )}

              {error && (
                <div className="rounded-2xl border border-red-400/30 bg-red-500/10 px-5 py-4 text-sm text-red-300">
                  {error}
                </div>
              )}
              {info && (
                <div className="rounded-2xl border border-green-400/30 bg-green-500/10 px-5 py-4 text-sm text-green-300">
                  {info}
                </div>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="group flex h-14 w-full items-center justify-center gap-2 rounded-full bg-loc-gold px-8 font-loc-display text-sm font-bold tracking-[0.05em] text-loc-dark uppercase shadow-lg shadow-black/30 transition-colors duration-200 hover:bg-loc-warmwhite disabled:cursor-not-allowed disabled:opacity-50"
              >
                {submitting ? (
                  'Please wait…'
                ) : (
                  <>
                    {
                      {
                        password: 'Login',
                        'otp-request': 'Send OTP',
                        'otp-verify': 'Verify OTP',
                        'forgot-request': 'Send OTP',
                        'forgot-reset': 'Reset Password',
                      }[step]
                    }
                    <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" />
                  </>
                )}
              </button>

              {/* --- Resend links (OTP verify / forgot reset only) --- */}
              {(step === 'otp-verify' || step === 'forgot-reset') && (
                <button
                  type="button"
                  onClick={step === 'otp-verify' ? resendCode : resendPasswordReset}
                  disabled={resendCooldown > 0 || submitting}
                  className="w-full text-center text-sm text-loc-text2-dark underline-offset-4 hover:text-loc-warmwhite hover:underline disabled:cursor-not-allowed disabled:opacity-50 disabled:no-underline"
                >
                  {resendCooldown > 0 ? `Resend code in ${resendCooldown}s` : 'Resend code'}
                </button>
              )}

              {/* --- "OR / Login with OTP" divider — default view only --- */}
              {isDefaultLoginView && (
                <>
                  <div className="flex items-center gap-4">
                    <div className="h-px flex-1 bg-white/10" />
                    <span className="text-xs font-semibold tracking-[0.2em] text-loc-text2-dark uppercase">Or</span>
                    <div className="h-px flex-1 bg-white/10" />
                  </div>
                  <button
                    type="button"
                    onClick={startOtpLogin}
                    disabled={submitting}
                    className="flex h-14 w-full items-center justify-center gap-2 rounded-full border border-white/15 bg-white/5 px-8 font-loc-display text-sm font-bold tracking-[0.05em] text-loc-warmwhite uppercase backdrop-blur-md transition-all duration-200 hover:border-loc-gold/50 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Login with OTP
                  </button>
                </>
              )}

              {/* --- Back links for every sub-view --- */}
              {(step === 'otp-request' || step === 'otp-verify') && (
                <button
                  type="button"
                  onClick={backToPasswordLogin}
                  className="w-full text-center text-sm text-loc-text2-dark underline-offset-4 hover:text-loc-warmwhite hover:underline"
                >
                  Back to Password Login
                </button>
              )}
              {(step === 'forgot-request' || step === 'forgot-reset') && (
                <button
                  type="button"
                  onClick={backToLogin}
                  className="w-full text-center text-sm text-loc-text2-dark underline-offset-4 hover:text-loc-warmwhite hover:underline"
                >
                  Back to Login
                </button>
              )}

              {/* --- Registration entry point — default view only --- */}
              {isDefaultLoginView && (
                <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-sm text-loc-text2-dark">
                  <Link to="/signup" className="underline-offset-4 hover:text-loc-warmwhite hover:underline">
                    Don't have an account? Register
                  </Link>
                </div>
              )}

              <div className="flex items-center justify-center gap-2 text-xs text-loc-text2-dark">
                <ShieldCheck className="h-4 w-4 text-loc-gold" />
                One secure sign-in for every LOC role.
              </div>
            </div>
          </form>
        </div>
      </section>
    </main>
  )
}
