import { ShieldAlert, ArrowRight } from 'lucide-react'
import Input from '../../components/ui/Input.jsx'
import { useForcePasswordChange } from '../../hooks/useForcePasswordChange.js'

// SUPER_ADMIN Identity & Secure Provisioning feature — §4. Reached via
// getPostLoginPath (roleRedirect.model.js) whenever force_password_change
// is true; the same visual language as AuthPage.jsx since this is still
// part of the login journey, not the Admin Control Center itself.
export default function ForcePasswordChangePage() {
  const { currentPassword, setCurrentPassword, newPassword, setNewPassword, confirmPassword, setConfirmPassword, error, submitting, submit } =
    useForcePasswordChange()

  return (
    <main
      className="min-h-screen bg-cover bg-center bg-no-repeat font-loc-body text-loc-warmwhite"
      style={{
        backgroundImage: `
          radial-gradient(ellipse 45% 40% at 15% 10%, color-mix(in srgb, var(--color-loc-gold) 10%, transparent), transparent 60%),
          linear-gradient(rgba(14,18,16,0.86), rgba(14,18,16,0.9)),
          url('/images/cricket-stadium.jpg')
        `,
      }}
    >
      <section className="mx-auto flex min-h-screen max-w-2xl items-center px-8">
        <div className="w-full">
          <div className="flex items-center gap-2 text-loc-gold">
            <ShieldAlert className="h-5 w-5" />
            <span className="font-loc-display text-xs font-bold tracking-[0.3em] uppercase sm:text-sm">Security Requirement</span>
          </div>

          <h1 className="mt-4 font-loc-display text-4xl leading-[0.95] font-extrabold tracking-tight text-loc-warmwhite uppercase sm:text-5xl">
            Set a New <span className="text-loc-gold">Password</span>
          </h1>

          <p className="mt-5 max-w-xl text-lg text-loc-text2-dark">
            For your account's security, you must set a new password before continuing. Your temporary password will no longer work after this.
          </p>

          <form
            onSubmit={submit}
            className="mt-10 rounded-[32px] border border-white/10 bg-loc-dark/60 p-10 shadow-2xl shadow-black/40 ring-1 ring-white/5 backdrop-blur-2xl"
          >
            <div className="space-y-7">
              <Input
                label="Current Password"
                type="password"
                autoComplete="current-password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Your temporary or initial password"
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

              {error && (
                <div className="rounded-2xl border border-red-400/30 bg-red-500/10 px-5 py-4 text-sm text-red-300">{error}</div>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="group flex h-14 w-full items-center justify-center gap-2 rounded-full bg-loc-gold px-8 font-loc-display text-sm font-bold tracking-[0.05em] text-loc-dark uppercase shadow-lg shadow-black/30 transition-colors duration-200 hover:bg-loc-warmwhite disabled:cursor-not-allowed disabled:opacity-50"
              >
                {submitting ? 'Please wait…' : 'Set New Password'}
                {!submitting && <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" />}
              </button>
            </div>
          </form>
        </div>
      </section>
    </main>
  )
}
