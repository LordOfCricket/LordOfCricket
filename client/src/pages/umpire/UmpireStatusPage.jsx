import Button from '../../components/ui/Button.jsx'
import { STATUS_COPY } from '../../models/umpireStatus.model.js'
import { useUmpireStatus } from '../../hooks/useUmpireStatus.js'

export default function UmpireStatusPage() {
  const { request, loading, error, requesting, requestAgain } = useUmpireStatus()

  const status = request?.status
  const copy = status ? STATUS_COPY[status] : null

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
                <div className="mt-8 rounded-2xl border border-emerald-400/20 bg-emerald-500/10 p-6 text-emerald-100">
                  Umpire tools are coming soon. Check back later for match scoring and control features.
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
