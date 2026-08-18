import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { CheckCircle2, Circle } from 'lucide-react'
import Navbar from '../../components/home/Navbar.jsx'
import BackgroundSystem from '../../components/home/background/BackgroundSystem.jsx'
import { MouseParallaxProvider } from '../../context/MouseParallaxContext.jsx'
import BackButton from '../../components/common/BackButton.jsx'
import { useAuth } from '../../hooks/useAuth.js'
import { statusLabel, canResubmit, timelineForStatus } from '../../models/groundRegistration.model.js'
import { fetchGroundRegistrationStatus, fetchMyGroundRegistrationDetail } from '../../services/groundRegistrationApi.js'

const TIMELINE_LABELS = {
  SUBMITTED: 'Registration Submitted',
  REVIEW: 'Under LOC Review',
  APPROVAL: 'Approval',
  PUBLISHED: 'Published',
}

function Timeline({ status, submittedAt }) {
  const steps = timelineForStatus(status)
  return (
    <ol className="space-y-3">
      {steps.map(({ step, state }) => (
        <li key={step} className="flex items-start gap-3">
          {state === 'done' ? (
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-400" />
          ) : state === 'current' ? (
            <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center">
              <span className="h-3 w-3 rounded-full bg-emerald-400" />
            </span>
          ) : (
            <Circle className="mt-0.5 h-5 w-5 shrink-0 text-emerald-100/20" />
          )}
          <div>
            <p className={`text-sm font-semibold ${state === 'upcoming' ? 'text-emerald-100/30' : 'text-white'}`}>{TIMELINE_LABELS[step]}</p>
            {step === 'SUBMITTED' && submittedAt && <p className="text-xs text-emerald-100/40">{new Date(submittedAt).toLocaleDateString()}</p>}
          </div>
        </li>
      ))}
    </ol>
  )
}

// §24/§25 — public, no-login reference-id lookup (safe fields only,
// enforced server-side by getPublicStatus), now with a real timeline
// instead of one static sentence, and — when the viewer is authenticated
// AND owns this request (checked via the owner-scoped .../mine endpoint,
// never assumed from being logged in alone) — an Edit & Resubmit link once
// the status allows it.
export default function GroundRegistrationStatusPage() {
  const { publicRequestId } = useParams()
  const { status: authStatus } = useAuth()
  const [request, setRequest] = useState(null)
  const [isOwner, setIsOwner] = useState(false)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (authStatus === 'loading') return undefined
    let cancelled = false

    // Deferred via setTimeout(0), matching this page's original established
    // pattern — calling setState synchronously in an effect body triggers
    // cascading renders (react-hooks/set-state-in-effect).
    const timer = window.setTimeout(() => {
      if (cancelled) return
      setLoading(true)
      setError(null)

      const loadPublic = () =>
        fetchGroundRegistrationStatus(publicRequestId)
          .then((data) => { if (!cancelled) setRequest(data) })
          .catch((err) => { if (!cancelled) setError(err.response?.data?.message || 'No request found for this reference id.') })

      if (authStatus === 'authenticated') {
        fetchMyGroundRegistrationDetail(publicRequestId)
          .then((data) => {
            if (cancelled) return
            setRequest(data)
            setIsOwner(true)
          })
          .catch(() => loadPublic())
          .finally(() => { if (!cancelled) setLoading(false) })
      } else {
        loadPublic().finally(() => { if (!cancelled) setLoading(false) })
      }
    }, 0)

    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [publicRequestId, authStatus])

  return (
    <div className="relative isolate min-h-screen overflow-x-hidden bg-loc-dark">
      <MouseParallaxProvider>
        <BackgroundSystem />
        <Navbar />
      </MouseParallaxProvider>

      <main className="relative mx-auto flex max-w-xl flex-col gap-6 px-6 pt-32 pb-20 lg:px-10">
        <BackButton label="Back to LOC" fallback="/" className="w-fit" />

        <div className="flex flex-col gap-5 rounded-2xl border border-emerald-400/20 bg-white/5 p-8">
          <div>
            <span className="text-sm font-semibold uppercase tracking-widest text-emerald-400">Ground Registration Status</span>
            <p className="font-mono text-sm text-emerald-100/50">{publicRequestId}</p>
          </div>

          {loading && <p className="text-emerald-100/70">Checking status…</p>}
          {error && <p className="rounded-xl border border-red-400/20 bg-red-500/10 px-3 py-2 text-sm text-red-200">{error}</p>}

          {request && (
            <>
              <div>
                <h1 className="text-2xl font-bold text-white">{request.groundName}</h1>
                <p className="mt-1 text-sm font-semibold text-emerald-300">{statusLabel(request.status)}</p>
              </div>

              {request.status === 'REJECTED' && request.rejectionReason && (
                <div className="rounded-xl border border-red-400/20 bg-red-500/10 px-4 py-3">
                  <p className="text-xs font-bold tracking-wide text-red-300 uppercase">Reason</p>
                  <p className="mt-1 text-sm text-red-100">{request.rejectionReason}</p>
                </div>
              )}
              {request.status === 'MORE_INFORMATION_REQUIRED' && request.moreInfoNotes && (
                <div className="rounded-xl border border-amber-400/20 bg-amber-500/10 px-4 py-3">
                  <p className="text-xs font-bold tracking-wide text-amber-300 uppercase">Changes Required — Reason</p>
                  <p className="mt-1 text-sm text-amber-100">{request.moreInfoNotes}</p>
                </div>
              )}

              <Timeline status={request.status} submittedAt={request.submittedAt} />

              {isOwner && canResubmit(request.status) && (
                <Link
                  to={`/register-ground/edit/${publicRequestId}`}
                  className="inline-flex items-center justify-center rounded-full bg-emerald-500 px-6 py-2.5 text-sm font-bold text-emerald-950 transition hover:bg-emerald-400"
                >
                  Edit & Resubmit
                </Link>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  )
}
