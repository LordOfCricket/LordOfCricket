import { ArrowRight, Flag, ShieldCheck, User } from 'lucide-react'
import Input from '../../components/ui/Input.jsx'
import { useAuthPage } from '../../hooks/useAuthPage.js'

const ROLE_TABS = [
  { value: 'player', label: 'Player Login', icon: User },
  { value: 'staff', label: 'Staff Login', icon: ShieldCheck },
  { value: 'umpire', label: 'Umpire Login', icon: Flag },
]

export default function AuthPage() {
  const {
    loginAs,
    setLoginAs,
    mode,
    toggleMode,
    name,
    setName,
    email,
    setEmail,
    password,
    setPassword,
    error,
    submitting,
    handleSubmit,
  } = useAuthPage()

  const isLogin = mode === 'login'
  const activeRole = ROLE_TABS.find((tab) => tab.value === loginAs)

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
            Member Access
          </span>

          <h1 className="mt-4 font-loc-display text-5xl leading-[0.95] font-extrabold tracking-tight text-loc-warmwhite uppercase sm:text-6xl">
            Welcome to <span className="text-loc-gold">LOC</span>
          </h1>

          <p className="mt-5 max-w-xl text-lg text-loc-text2-dark">
            {isLogin
              ? 'Log in to access the canteen, staff tools, or umpire access.'
              : 'Create an account to get started.'}
          </p>

          <form
            onSubmit={handleSubmit}
            className="mt-10 rounded-[32px] border border-white/10 bg-loc-dark/60 p-10 shadow-2xl shadow-black/40 ring-1 ring-white/5 backdrop-blur-2xl"
          >
            <div className="space-y-7">
              <div className="grid grid-cols-3 gap-4">
                {ROLE_TABS.map(({ value, label, icon: Icon }) => {
                  const active = loginAs === value
                  return (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setLoginAs(value)}
                      className={`flex flex-col items-center gap-2 rounded-2xl border p-5 text-center transition-all duration-300 ${
                        active
                          ? 'border-loc-gold/60 bg-loc-gold/10'
                          : 'border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/10'
                      }`}
                    >
                      <Icon className={`h-5 w-5 ${active ? 'text-loc-gold' : 'text-loc-muted-dark'}`} />
                      <h3
                        className={`font-loc-display text-sm font-semibold tracking-wide uppercase ${
                          active ? 'text-loc-warmwhite' : 'text-loc-text2-dark'
                        }`}
                      >
                        {label}
                      </h3>
                    </button>
                  )
                })}
              </div>

              {!isLogin && (
                <Input
                  label="Name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your full name"
                  required
                />
              )}

              <Input
                label="Email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
              />

              <Input
                label="Password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                required
              />

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
                    {isLogin ? 'Log In' : 'Sign Up'} as {activeRole.label.replace(' Login', '')}
                    <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" />
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={toggleMode}
                className="w-full text-center text-sm text-loc-text2-dark underline-offset-4 hover:text-loc-warmwhite hover:underline"
              >
                {isLogin ? "Don't have an account? Sign up" : 'Already have an account? Log in'}
              </button>
            </div>
          </form>
        </div>
      </section>
    </main>
  )
}
