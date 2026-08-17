import { ArrowRight, ShieldCheck } from 'lucide-react'
import Input from '../../components/ui/Input.jsx'
import { useAuthPage } from '../../hooks/useAuthPage.js'

const MODE_COPY = {
  login: {
    eyebrow: 'Member Access',
    heading: 'Welcome to LOC',
    subtitle: 'Enter your email or phone number to sign in. New here? We’ll set up your account automatically.',
    cta: 'Send Code',
  },
  'register-player': {
    eyebrow: 'Player Registration',
    heading: 'Join as a Player',
    subtitle: 'Enter your name and an email or phone number to create your player account.',
    cta: 'Send Code',
  },
  'register-umpire': {
    eyebrow: 'Umpire Registration',
    heading: 'Join as an Umpire',
    subtitle: 'Enter your name and an email or phone number to apply as an umpire.',
    cta: 'Send Code',
  },
}

export default function AuthPage() {
  const {
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
  } = useAuthPage()

  const isIdentifierStep = step === 'identifier'
  const copy = MODE_COPY[mode]

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
            {copy.eyebrow}
          </span>

          <h1 className="mt-4 font-loc-display text-5xl leading-[0.95] font-extrabold tracking-tight text-loc-warmwhite uppercase sm:text-6xl">
            {mode === 'login' ? (
              <>
                Welcome to <span className="text-loc-gold">LOC</span>
              </>
            ) : (
              copy.heading
            )}
          </h1>

          <p className="mt-5 max-w-xl text-lg text-loc-text2-dark">
            {isIdentifierStep ? copy.subtitle : `Enter the 6-digit code sent to ${identifier}.`}
          </p>

          <form
            onSubmit={isIdentifierStep ? requestCode : verifyCode}
            className="mt-10 rounded-[32px] border border-white/10 bg-loc-dark/60 p-10 shadow-2xl shadow-black/40 ring-1 ring-white/5 backdrop-blur-2xl"
          >
            <div className="space-y-7">
              {isIdentifierStep ? (
                <>
                  {isRegisterMode && (
                    <Input label="Full Name" type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your full name" autoFocus required />
                  )}
                  <Input
                    label="Email or Phone Number"
                    type="text"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    placeholder="you@example.com or +91XXXXXXXXXX"
                    autoFocus={!isRegisterMode}
                    required
                  />
                </>
              ) : (
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
                  <button
                    type="button"
                    onClick={changeIdentifier}
                    className="text-sm text-loc-text2-dark underline-offset-4 hover:text-loc-warmwhite hover:underline"
                  >
                    Use a different email or phone
                  </button>
                </>
              )}

              {error && (
                <div className="rounded-2xl border border-red-400/30 bg-red-500/10 px-5 py-4 text-sm text-red-300">
                  {error}
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
                    {isIdentifierStep ? copy.cta : 'Verify & Sign In'}
                    <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" />
                  </>
                )}
              </button>

              {!isIdentifierStep && (
                <button
                  type="button"
                  onClick={resendCode}
                  disabled={resendCooldown > 0 || submitting}
                  className="w-full text-center text-sm text-loc-text2-dark underline-offset-4 hover:text-loc-warmwhite hover:underline disabled:cursor-not-allowed disabled:opacity-50 disabled:no-underline"
                >
                  {resendCooldown > 0 ? `Resend code in ${resendCooldown}s` : 'Resend code'}
                </button>
              )}

              {isIdentifierStep && (
                <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-sm text-loc-text2-dark">
                  {mode !== 'login' && (
                    <button type="button" onClick={() => setMode('login')} className="underline-offset-4 hover:text-loc-warmwhite hover:underline">
                      Already have an account? Sign in
                    </button>
                  )}
                  {mode !== 'register-player' && (
                    <button type="button" onClick={() => setMode('register-player')} className="underline-offset-4 hover:text-loc-warmwhite hover:underline">
                      Register as a Player
                    </button>
                  )}
                  {mode !== 'register-umpire' && (
                    <button type="button" onClick={() => setMode('register-umpire')} className="underline-offset-4 hover:text-loc-warmwhite hover:underline">
                      Register as an Umpire
                    </button>
                  )}
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
