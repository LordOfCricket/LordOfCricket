import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import Navbar from '../../components/home/Navbar.jsx'
import BackgroundSystem from '../../components/home/background/BackgroundSystem.jsx'
import { MouseParallaxProvider } from '../../context/MouseParallaxContext.jsx'
import BackButton from '../../components/common/BackButton.jsx'
import { useAuth } from '../../hooks/useAuth.js'
import { statusLabel } from '../../models/groundRegistration.model.js'
import { fetchMyGroundRegistrations, requestLookupCode, verifyLookupCode } from '../../services/groundRegistrationApi.js'

function RequestCard({ request }) {
  return (
    <Link
      to={`/register-ground/status/${request.publicRequestId}`}
      className="block rounded-xl border border-emerald-400/15 bg-white/5 p-5 transition-colors hover:border-emerald-400/40"
    >
      <p className="font-semibold text-white">{request.groundName}</p>
      <p className="mt-1 font-mono text-xs text-emerald-100/50">Registration ID: {request.publicRequestId}</p>
      <p className="mt-2 text-sm font-semibold text-emerald-300">{statusLabel(request.status)}</p>
      <p className="mt-1 text-xs text-emerald-100/40">Submitted {new Date(request.submittedAt).toLocaleDateString()}</p>
    </Link>
  )
}

// §20/§21 — a logged-in user sees "My Ground Registrations" straight away
// (server-scoped to their own submissions, GET .../mine).
function MyRegistrations() {
  const [requests, setRequests] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchMyGroundRegistrations()
      .then(setRequests)
      .catch(() => setError('Unable to load your registrations.'))
  }, [])

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-white">My Ground Registrations</h1>
      {error && <p className="text-sm text-rose-300">{error}</p>}
      {requests === null && !error && <p className="text-emerald-100/60">Loading…</p>}
      {requests?.length === 0 && <p className="text-emerald-100/60">You haven't submitted any ground registrations yet.</p>}
      <div className="space-y-3">{requests?.map((r) => <RequestCard key={r.publicRequestId} request={r} />)}</div>
      <Link to="/register-ground/new" className="inline-block text-sm font-semibold text-emerald-300 underline underline-offset-2 hover:text-emerald-200">
        Register another ground
      </Link>
    </div>
  )
}

// §22 — non-logged-in status check, OTP-gated (never expose registrations
// just because someone knows the email/phone).
function LookupByOtp() {
  const [identifier, setIdentifier] = useState('')
  const [codeSent, setCodeSent] = useState(false)
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [results, setResults] = useState(null)

  const sendCode = async (e) => {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      await requestLookupCode(identifier.trim())
      setCodeSent(true)
    } catch (err) {
      setError(err.response?.data?.message || 'Something went wrong. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  const verify = async (e) => {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      const requests = await verifyLookupCode(identifier.trim(), code)
      setResults(requests)
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid or expired code.')
    } finally {
      setBusy(false)
    }
  }

  if (results) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold text-white">Your Registrations</h1>
        {results.length === 0 ? (
          <p className="text-emerald-100/60">No registrations found for that contact detail.</p>
        ) : (
          <div className="space-y-3">{results.map((r) => <RequestCard key={r.publicRequestId} request={r} />)}</div>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <span className="text-sm font-semibold uppercase tracking-widest text-emerald-400">Check Registration Status</span>
        <h1 className="mt-2 text-2xl font-bold text-white">Find your registration</h1>
        <p className="mt-1 text-sm text-emerald-100/60">Enter the email or phone number you registered with — we'll send a verification code.</p>
      </div>

      <form onSubmit={codeSent ? verify : sendCode} className="space-y-3 rounded-2xl border border-emerald-400/15 bg-white/5 p-6">
        <input
          value={identifier}
          onChange={(e) => setIdentifier(e.target.value)}
          disabled={codeSent}
          placeholder="you@example.com or +91XXXXXXXXXX"
          className="w-full rounded-xl border border-emerald-400/20 bg-white/5 px-3 py-2.5 text-sm text-white placeholder:text-emerald-100/30 focus:border-emerald-400/60 focus:outline-none disabled:opacity-60"
        />
        {codeSent && (
          <input
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
            inputMode="numeric"
            placeholder="000000"
            className="w-full rounded-xl border border-emerald-400/20 bg-white/5 px-3 py-2.5 text-sm text-white placeholder:text-emerald-100/30 focus:border-emerald-400/60 focus:outline-none"
          />
        )}
        {error && <p className="text-sm text-rose-300">{error}</p>}
        <button
          type="submit"
          disabled={busy || !identifier.trim() || (codeSent && code.length !== 6)}
          className="w-full rounded-full bg-emerald-500 px-6 py-2.5 text-sm font-bold text-emerald-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {busy ? 'Please wait…' : codeSent ? 'Check Status' : 'Send Verification Code'}
        </button>
      </form>

      <p className="text-sm text-emerald-100/50">Already have your Registration ID? Open the status link from your confirmation email or the page you saw after submitting.</p>
    </div>
  )
}

export default function CheckGroundRegistrationStatusPage() {
  const { status: authStatus } = useAuth()

  return (
    <div className="relative isolate min-h-screen overflow-x-hidden bg-loc-dark">
      <MouseParallaxProvider>
        <BackgroundSystem />
        <Navbar />
      </MouseParallaxProvider>

      <main className="relative mx-auto flex max-w-2xl flex-col gap-6 px-6 pt-32 pb-20 lg:px-10">
        <BackButton label="Back to LOC" fallback="/register-ground" className="w-fit" />
        {authStatus === 'loading' ? <p className="text-emerald-100/60">Loading…</p> : authStatus === 'authenticated' ? <MyRegistrations /> : <LookupByOtp />}
      </main>
    </div>
  )
}
