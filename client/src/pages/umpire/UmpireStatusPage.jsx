import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import Button from '../../components/ui/Button.jsx'
import { STATUS_COPY } from '../../models/umpireStatus.model.js'
import { useUmpireStatus } from '../../hooks/useUmpireStatus.js'
import { listMatches } from '../../services/matchApi.js'

export default function UmpireStatusPage() {
  const { request, loading, error, requesting, requestAgain } = useUmpireStatus()
  const [matches, setMatches] = useState([])

  const status = request?.status
  const copy = status ? STATUS_COPY[status] : null

  useEffect(() => {
    if (status !== 'approved') return
    listMatches()
      .then((all) => setMatches(all.filter((m) => m.status !== 'completed')))
      .catch(() => setMatches([]))
  }, [status])

  return (
    <main
      className="min-h-screen bg-cover bg-center bg-no-repeat text-white"
      style={{
        backgroundImage: `
          linear-gradient(
            rgba(2,6,23,0.72),
            rgba(2,6,23,0.72)
          ),
          url('/images/cricket-stadium.jpg')
        `,
      }}
    >
      <section className="mx-auto flex min-h-screen max-w-7xl items-center px-8 lg:px-16">
        <div className="w-full max-w-2xl">
          <h1 className="text-5xl font-extrabold text-white">Umpire Access</h1>

          <div className="mt-10 rounded-[36px] border border-white/15 bg-slate-900/35 p-10 shadow-2xl backdrop-blur-2xl">
            {loading ? (
              <p className="text-slate-300">Checking your request status…</p>
            ) : status === 'approved' ? (
              <div>
                <h2 className="text-2xl font-bold text-emerald-300">{copy.title}</h2>
                <p className="mt-3 text-slate-300">{copy.detail}</p>

                <Link
                  to="/matches/new"
                  className="mt-8 inline-flex items-center justify-center rounded-2xl bg-linear-to-r from-emerald-400 to-emerald-600 px-6 py-3 text-sm font-bold text-emerald-950 shadow-md shadow-emerald-500/30 transition-all hover:-translate-y-0.5"
                >
                  Score a New Match
                </Link>

                <div className="mt-8">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Matches In Progress</p>
                  {matches.length === 0 ? (
                    <p className="mt-3 text-sm text-slate-400">No upcoming or live matches right now.</p>
                  ) : (
                    <div className="mt-3 space-y-2">
                      {matches.map((m) => (
                        <Link
                          key={m.id}
                          to={`/matches/${m.id}/setup`}
                          className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm transition-colors hover:bg-white/10"
                        >
                          <span className="font-semibold text-white">
                            {m.team_a_name} vs {m.team_b_name}
                          </span>
                          <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold uppercase text-emerald-200">{m.status}</span>
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ) : status === 'pending' ? (
              <div>
                <h2 className="text-2xl font-bold text-amber-300">{copy.title}</h2>
                <p className="mt-3 text-slate-300">{copy.detail}</p>
              </div>
            ) : (
              <div>
                {status === 'rejected' && (
                  <>
                    <h2 className="text-2xl font-bold text-rose-300">{copy.title}</h2>
                    <p className="mt-3 text-slate-300">{copy.detail}</p>
                  </>
                )}
                {!status && <p className="text-slate-300">You haven't requested umpire access yet.</p>}

                {error && (
                  <div className="mt-6 rounded-2xl border border-red-400/20 bg-red-500/10 px-5 py-4 text-rose-300">
                    {error}
                  </div>
                )}

                <Button className="mt-6" disabled={requesting} onClick={requestAgain}>
                  {requesting ? 'Sending…' : 'Request Umpire Access'}
                </Button>
              </div>
            )}
          </div>
        </div>
      </section>
    </main>
  )
}
