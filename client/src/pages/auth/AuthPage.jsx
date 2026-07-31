import Button from '../../components/ui/Button.jsx'
import Input from '../../components/ui/Input.jsx'
import { useAuthPage } from '../../hooks/useAuthPage.js'

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
    staffCode,
    setStaffCode,
    error,
    submitting,
    handleSubmit,
  } = useAuthPage()

  const isLogin = mode === 'login'

  return (
    <main
      className="min-h-screen bg-cover bg-center bg-no-repeat text-white"
      style={{
        backgroundImage: `
          linear-gradient(
            rgba(2,6,23,0.78),
            rgba(2,6,23,0.78)
          ),
          url('/images/cricket-stadium.jpg')
        `,
      }}
    >
      <section className="mx-auto flex min-h-screen max-w-7xl items-center px-8 lg:px-16">
        <div className="w-full max-w-2xl">
          <h1 className="text-6xl font-extrabold">
            <span className="text-white">Welcome to </span>
            <span className="text-green-400">LOC</span>
          </h1>

          <p className="mt-5 max-w-xl text-lg text-slate-300">
            {isLogin
              ? 'Log in to access the canteen, staff tools, or umpire access.'
              : 'Create an account to get started.'}
          </p>

          <form
            onSubmit={handleSubmit}
            className="mt-10 rounded-[36px] border border-white/15 bg-slate-900/35 p-10 shadow-2xl backdrop-blur-2xl"
          >
            <div className="space-y-7">
              <div className="grid grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => setLoginAs('player')}
                  className={`rounded-2xl border p-5 text-left transition-all duration-300 ${
                    loginAs === 'player'
                      ? 'border-emerald-300 bg-emerald-500/20'
                      : 'border-white/10 bg-white/5 hover:bg-white/10'
                  }`}
                >
                  <h3 className="text-xl font-bold">👤 Player Login</h3>
                </button>

                <button
                  type="button"
                  onClick={() => setLoginAs('staff')}
                  className={`rounded-2xl border p-5 text-left transition-all duration-300 ${
                    loginAs === 'staff'
                      ? 'border-emerald-300 bg-emerald-500/20'
                      : 'border-white/10 bg-white/5 hover:bg-white/10'
                  }`}
                >
                  <h3 className="text-xl font-bold">🧑‍🍳 Staff Login</h3>
                </button>
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

              {loginAs === 'staff' && (
                <Input
                  label="Staff Access Code"
                  type="password"
                  value={staffCode}
                  onChange={(e) => setStaffCode(e.target.value)}
                  placeholder="Provided by your canteen manager"
                  required
                />
              )}

              {error && (
                <div className="rounded-2xl border border-red-400/20 bg-red-500/10 px-5 py-4 text-rose-300">
                  {error}
                </div>
              )}

              <Button type="submit" disabled={submitting} className="w-full">
                {submitting
                  ? 'Please wait…'
                  : `${isLogin ? 'Log In' : 'Sign Up'} as ${loginAs === 'player' ? 'Player' : 'Staff'}`}
              </Button>

              <button
                type="button"
                onClick={toggleMode}
                className="w-full text-center text-sm text-slate-300 underline-offset-4 hover:text-white hover:underline"
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
