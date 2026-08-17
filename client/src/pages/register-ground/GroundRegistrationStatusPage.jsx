import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import Navbar from '../../components/home/Navbar.jsx'
import BackgroundSystem from '../../components/home/background/BackgroundSystem.jsx'
import { MouseParallaxProvider } from '../../context/MouseParallaxContext.jsx'
import BackButton from '../../components/common/BackButton.jsx'
import { fetchGroundRegistrationStatus } from '../../services/groundRegistrationApi.js'

const STATUS_COPY = {
  PENDING: 'Your request is waiting to be reviewed.',
  UNDER_REVIEW: 'Our team is currently reviewing your request.',
  APPROVED: 'Approved — your ground is now live on LOC.',
  REJECTED: 'This request was not approved.',
  MORE_INFORMATION_REQUIRED: 'We need a bit more information from you.',
}

// Public, no-login reference-id lookup — the link RegisterGroundPage's
// success screen shows after a Ground Owner request is submitted (§21 of
// the Phase 4 brief: safe fields only, never reviewed_by or internal ids —
// enforced server-side by groundOwnerRequest.service.js#getPublicStatus).
export default function GroundRegistrationStatusPage() {
  const { publicRequestId } = useParams()
  const [request, setRequest] = useState(null)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    const timer = window.setTimeout(() => {
      setLoading(true)
      setError(null)
      fetchGroundRegistrationStatus(publicRequestId)
        .then((data) => { if (!cancelled) setRequest(data) })
        .catch((err) => { if (!cancelled) setError(err.response?.data?.message || 'No request found for this reference id.') })
        .finally(() => { if (!cancelled) setLoading(false) })
    }, 0)
    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [publicRequestId])

  return (
    <div className="relative isolate min-h-screen overflow-x-hidden bg-loc-dark">
      <MouseParallaxProvider>
        <BackgroundSystem />
        <Navbar />
      </MouseParallaxProvider>

      <main className="relative mx-auto flex max-w-xl flex-col gap-6 px-6 pt-32 pb-20 lg:px-10">
        <BackButton label="Back to LOC" fallback="/" className="w-fit" />

        <div className="flex flex-col gap-3 rounded-2xl border border-emerald-400/20 bg-white/5 p-8">
          <span className="text-sm font-semibold uppercase tracking-widest text-emerald-400">Ground Registration Status</span>
          <p className="font-mono text-sm text-emerald-100/50">{publicRequestId}</p>

          {loading && <p className="text-emerald-100/70">Checking status…</p>}
          {error && <p className="rounded-xl border border-red-400/20 bg-red-500/10 px-3 py-2 text-sm text-red-200">{error}</p>}

          {request && (
            <>
              <h1 className="text-2xl font-bold text-white">{request.groundName}</h1>
              <p className="text-emerald-100/70">{STATUS_COPY[request.status] || request.status}</p>
              {request.status === 'REJECTED' && request.rejectionReason && (
                <p className="rounded-xl border border-red-400/20 bg-red-500/10 px-3 py-2 text-sm text-red-200">Reason: {request.rejectionReason}</p>
              )}
              {request.status === 'MORE_INFORMATION_REQUIRED' && request.moreInfoNotes && (
                <p className="rounded-xl border border-amber-400/20 bg-amber-500/10 px-3 py-2 text-sm text-amber-200">Needed: {request.moreInfoNotes}</p>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  )
}
