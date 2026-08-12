import { useState } from 'react'
import { Link } from 'react-router-dom'
import { LocateFixed } from 'lucide-react'
import Navbar from '../../components/home/Navbar.jsx'
import BackgroundSystem from '../../components/home/background/BackgroundSystem.jsx'
import CursorGlow from '../../components/home/interactions/CursorGlow.jsx'
import { MouseParallaxProvider } from '../../context/MouseParallaxContext.jsx'
import { submitGroundRegistration } from '../../services/groundRegistrationApi.js'
import { useGeolocation } from '../../hooks/useGeolocation.js'
import BackButton from '../../components/common/BackButton.jsx'

function Field({ label, optional, children }) {
  return (
    <label className="flex flex-col gap-1.5 text-sm">
      <span className="font-semibold text-emerald-100/80">
        {label}
        {optional && <span className="ml-1 font-normal text-emerald-100/40">(optional)</span>}
      </span>
      {children}
    </label>
  )
}

const inputClass =
  'rounded-xl border border-emerald-400/20 bg-white/5 px-3 py-2.5 text-sm text-white placeholder:text-emerald-100/30 focus:border-emerald-400/60 focus:outline-none'

const EMPTY_FORM = {
  name: '',
  description: '',
  addressLine: '',
  city: '',
  state: '',
  postalCode: '',
  country: 'India',
  phone: '',
  email: '',
  website: '',
  latitude: '',
  longitude: '',
}

// "Want to register your ground on LOC" — the Final CTA section's secondary
// button lands here. Submits a real ground row (status DRAFT) + a
// GROUND_OWNER membership for the submitting user (POST /grounds); a
// super_admin then reviews it via /admin/ground-registrations before it's
// publicly visible anywhere on the platform. Requires being logged in
// (route is wrapped in RequireAuth — see AppRoutes.jsx).
export default function RegisterGroundPage() {
  const [form, setForm] = useState(EMPTY_FORM)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)
  const [submitted, setSubmitted] = useState(null) // the created ground, once submitted
  const geo = useGeolocation()

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }))

  const handleUseMyLocation = () => {
    geo.requestLocation((coords) => setForm((f) => ({ ...f, latitude: String(coords.latitude), longitude: String(coords.longitude) })))
  }

  const submit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    try {
      const ground = await submitGroundRegistration({
        name: form.name,
        description: form.description || undefined,
        addressLine: form.addressLine,
        city: form.city,
        state: form.state,
        postalCode: form.postalCode || undefined,
        country: form.country || undefined,
        phone: form.phone,
        email: form.email || undefined,
        website: form.website || undefined,
        latitude: form.latitude || undefined,
        longitude: form.longitude || undefined,
      })
      setSubmitted(ground)
    } catch (err) {
      setError(err.response?.data?.error || 'Could not submit your ground. Please check the details and try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="relative isolate min-h-screen overflow-x-hidden bg-loc-dark">
      <MouseParallaxProvider>
        <BackgroundSystem />
        <CursorGlow />
        <Navbar />
      </MouseParallaxProvider>

      <main className="relative mx-auto flex max-w-2xl flex-col gap-6 px-6 pt-32 pb-20 lg:px-10">
        <BackButton label="Back to LOC" fallback="/" className="w-fit" />

        {submitted ? (
          <div className="flex flex-col items-start gap-3 rounded-2xl border border-emerald-400/20 bg-white/5 p-8">
            <span className="text-sm font-semibold uppercase tracking-widest text-emerald-400">Submitted</span>
            <h1 className="text-2xl font-bold text-white">Thanks — {submitted.name} is in review.</h1>
            <p className="text-emerald-100/70">
              Our team will review your ground and activate it soon. Once approved, it'll appear across LOC's discovery pages automatically.
            </p>
            <Link
              to="/grounds"
              className="mt-2 inline-flex items-center justify-center rounded-full bg-emerald-500 px-6 py-2.5 text-sm font-semibold text-emerald-950 transition hover:bg-emerald-400"
            >
              Browse All Grounds
            </Link>
          </div>
        ) : (
          <>
            <div>
              <span className="text-sm font-semibold uppercase tracking-widest text-emerald-400">Register Your Ground</span>
              <h1 className="mt-2 text-3xl font-bold text-white">List Your Ground on LOC</h1>
              <p className="mt-1 text-emerald-100/60">Tell us about your ground — our team reviews every submission before it goes live.</p>
            </div>

            <form onSubmit={submit} className="flex flex-col gap-4 rounded-2xl border border-emerald-400/15 bg-white/5 p-6 sm:p-8">
              <Field label="Ground Name">
                <input required maxLength={150} value={form.name} onChange={set('name')} className={inputClass} placeholder="Greenfield Cricket Ground" />
              </Field>

              <Field label="Description" optional>
                <textarea maxLength={500} rows={3} value={form.description} onChange={set('description')} className={inputClass} placeholder="Pitch type, capacity, floodlights, nets…" />
              </Field>

              <Field label="Address">
                <input required maxLength={255} value={form.addressLine} onChange={set('addressLine')} className={inputClass} placeholder="Street / locality" />
              </Field>

              <div className="grid grid-cols-2 gap-4">
                <Field label="City">
                  <input required maxLength={100} value={form.city} onChange={set('city')} className={inputClass} />
                </Field>
                <Field label="State">
                  <input required maxLength={100} value={form.state} onChange={set('state')} className={inputClass} />
                </Field>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Field label="Postal Code" optional>
                  <input maxLength={20} value={form.postalCode} onChange={set('postalCode')} className={inputClass} />
                </Field>
                <Field label="Country">
                  <input maxLength={100} value={form.country} onChange={set('country')} className={inputClass} />
                </Field>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Field label="Phone">
                  <input required maxLength={30} type="tel" value={form.phone} onChange={set('phone')} className={inputClass} placeholder="9999999999" />
                </Field>
                <Field label="Email" optional>
                  <input maxLength={150} type="email" value={form.email} onChange={set('email')} className={inputClass} placeholder="owner@example.com" />
                </Field>
              </div>

              <Field label="Website" optional>
                <input maxLength={300} type="url" value={form.website} onChange={set('website')} className={inputClass} placeholder="https://…" />
              </Field>

              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-emerald-100/80">
                    Exact Location <span className="font-normal text-emerald-100/40">(optional, powers nearby search)</span>
                  </span>
                  <button
                    type="button"
                    onClick={handleUseMyLocation}
                    disabled={geo.status === 'prompting'}
                    className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/20 px-3 py-1.5 text-xs font-semibold text-emerald-100/80 transition-colors hover:border-emerald-400/50 hover:text-white disabled:opacity-60"
                  >
                    <LocateFixed className="h-3.5 w-3.5" aria-hidden="true" />
                    {geo.status === 'prompting' ? 'Locating…' : 'Use My Location'}
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <input value={form.latitude} onChange={set('latitude')} className={inputClass} placeholder="Latitude" />
                  <input value={form.longitude} onChange={set('longitude')} className={inputClass} placeholder="Longitude" />
                </div>
                {(geo.status === 'denied' || geo.status === 'unavailable') && (
                  <p className="text-xs text-amber-300/80" role="status">
                    {geo.status === 'denied' ? 'Location access was denied — you can enter it manually, or leave it blank.' : geo.error}
                  </p>
                )}
              </div>

              {error && <p className="rounded-xl border border-red-400/20 bg-red-500/10 px-3 py-2 text-sm text-red-200">{error}</p>}

              <button
                type="submit"
                disabled={submitting}
                className="mt-2 inline-flex items-center justify-center rounded-full bg-emerald-500 px-6 py-3 text-sm font-bold text-emerald-950 shadow-md shadow-emerald-500/30 transition-all hover:-translate-y-0.5 hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {submitting ? 'Submitting…' : 'Submit for Review'}
              </button>
            </form>
          </>
        )}
      </main>
    </div>
  )
}
