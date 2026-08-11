import { useState } from 'react'
import { useAuth } from '../../hooks/useAuth.js'
import { useUmpireProfile } from '../../hooks/useUmpireProfile.js'
import UmpireLayout from '../../components/umpire-dashboard/UmpireLayout.jsx'
import { StatsLoadingGrid, StatsErrorState } from '../../components/stats/StatsStates.jsx'
import StatTile from '../../components/stats/StatTile.jsx'

export default function UmpireProfilePage() {
  const { user } = useAuth()
  const { profile, loading, error, saving, setAvailable, saveBio, refresh } = useUmpireProfile()
  const [bioDraft, setBioDraft] = useState('')
  // Seeds bioDraft from the profile the first time it loads — adjusting
  // state during render (not inside useEffect) per React's own guidance for
  // "reset/derive state from a prop that just arrived", avoiding the
  // extra-render-then-setState pattern an effect would need here.
  const [seededFor, setSeededFor] = useState(null)
  if (profile && seededFor !== profile.user_id) {
    setSeededFor(profile.user_id)
    setBioDraft(profile.bio || '')
  }

  const bioChanged = profile && bioDraft !== (profile.bio || '')

  return (
    <UmpireLayout title="My Profile">
      {loading && <StatsLoadingGrid tiles={3} />}
      {!loading && error && <StatsErrorState message={error} onRetry={refresh} />}

      {!loading && !error && profile && (
        <div className="space-y-6">
          <div className="rounded-[1.5rem] border border-white/10 bg-slate-900/50 p-6 shadow-sm backdrop-blur-sm">
            <h2 className="text-xl font-semibold text-white">Profile</h2>

            <div className="mt-4 space-y-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Name</p>
                <p className="mt-1 text-base text-white">{user?.name}</p>
              </div>

              <label className="block">
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">Bio</span>
                <textarea
                  value={bioDraft}
                  onChange={(e) => setBioDraft(e.target.value)}
                  maxLength={500}
                  rows={3}
                  placeholder="Tell organizers a bit about your umpiring experience."
                  className="mt-2 w-full rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-slate-500"
                />
                {bioChanged && (
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => saveBio(bioDraft)}
                    className="mt-2 rounded-full bg-emerald-500 px-4 py-1.5 text-xs font-semibold text-emerald-950 transition-colors hover:bg-emerald-400 disabled:opacity-50"
                  >
                    {saving ? 'Saving…' : 'Save Bio'}
                  </button>
                )}
              </label>

              <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                <div>
                  <p className="text-sm font-semibold text-white">Available for assignments</p>
                  <p className="text-xs text-slate-400">Toggle off if you're not currently taking new umpire assignments.</p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={profile.is_available}
                  disabled={saving}
                  onClick={() => setAvailable(!profile.is_available)}
                  className={`relative h-8 w-14 shrink-0 rounded-full transition-colors disabled:opacity-50 ${
                    profile.is_available ? 'bg-emerald-500' : 'bg-white/15'
                  }`}
                >
                  <span
                    className={`absolute top-1 h-6 w-6 rounded-full bg-white transition-transform ${
                      profile.is_available ? 'translate-x-7' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>

          <div className="rounded-[1.5rem] border border-white/10 bg-slate-900/50 p-6 shadow-sm backdrop-blur-sm">
            <h2 className="text-xl font-semibold text-white">Statistics</h2>
            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
              <StatTile label="Matches Officiated" value={profile.matches_officiated} emphasis />
              <StatTile label="Upcoming Assignments" value={profile.upcoming_assignments} />
              <StatTile label="Cancelled" value={profile.matches_cancelled} />
            </div>
          </div>

          <div className="rounded-[1.5rem] border border-white/10 bg-slate-900/50 p-6 shadow-sm backdrop-blur-sm">
            <h2 className="text-xl font-semibold text-white">Rating</h2>
            <p className="mt-2 text-sm text-slate-400">Not available yet — umpire feedback and ratings are coming in a future update.</p>
          </div>
        </div>
      )}
    </UmpireLayout>
  )
}
