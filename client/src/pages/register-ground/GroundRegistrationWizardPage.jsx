import { useParams, Link } from 'react-router-dom'
import { useState } from 'react'
import { CheckCircle2, Copy, ArrowRight, ArrowLeft } from 'lucide-react'
import Navbar from '../../components/home/Navbar.jsx'
import BackgroundSystem from '../../components/home/background/BackgroundSystem.jsx'
import CursorGlow from '../../components/home/interactions/CursorGlow.jsx'
import { MouseParallaxProvider } from '../../context/MouseParallaxContext.jsx'
import BackButton from '../../components/common/BackButton.jsx'
import RegistrationStepper from '../../components/ground-registration/RegistrationStepper.jsx'
import ContactVerificationBlock from '../../components/ground-registration/ContactVerificationBlock.jsx'
import FeaturedPhotoGrid from '../../components/ground-registration/FeaturedPhotoGrid.jsx'
import GalleryPhotoUploader from '../../components/ground-registration/GalleryPhotoUploader.jsx'
import AmenityPicker from '../../components/ground-registration/AmenityPicker.jsx'
import LocationMapPicker from '../../components/ground-registration/LocationMapPicker.jsx'
import { useGroundRegistrationWizard } from '../../hooks/useGroundRegistrationWizard.js'

const inputClass =
  'w-full rounded-xl border border-emerald-400/20 bg-white/5 px-3 py-2.5 text-sm text-white placeholder:text-emerald-100/30 focus:border-emerald-400/60 focus:outline-none'

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

function SuccessScreen({ request }) {
  const [copied, setCopied] = useState(false)
  const copyId = () => {
    navigator.clipboard?.writeText(request.publicRequestId)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="flex flex-col items-center gap-4 rounded-2xl border border-emerald-400/20 bg-white/5 p-8 text-center">
      <CheckCircle2 className="h-14 w-14 text-emerald-400" />
      <h1 className="text-2xl font-bold text-white">Ground Registration Submitted Successfully 🎉</h1>
      <p className="text-emerald-100/70">Your ground has been successfully submitted for LOC review.</p>

      <div className="mt-2 w-full rounded-xl border border-emerald-400/20 bg-white/5 p-5">
        <span className="text-xs font-semibold tracking-wide text-emerald-100/50 uppercase">Ground Registration ID</span>
        <div className="mt-1 flex items-center justify-center gap-3">
          <span className="font-mono text-lg font-bold text-white">{request.publicRequestId}</span>
          <button type="button" onClick={copyId} className="inline-flex items-center gap-1 rounded-full border border-emerald-400/30 px-2.5 py-1 text-xs font-semibold text-emerald-200 hover:border-emerald-400/60">
            <Copy className="h-3.5 w-3.5" /> {copied ? 'Copied' : 'Copy Registration ID'}
          </button>
        </div>
        <p className="mt-3 text-sm font-semibold text-amber-300">Status: Pending Approval</p>
      </div>

      <p className="text-xs text-emerald-100/50">Please keep your Registration ID for future reference.</p>

      <div className="mt-2 flex flex-wrap items-center justify-center gap-3">
        <Link
          to={`/register-ground/status/${request.publicRequestId}`}
          className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500 px-6 py-2.5 text-sm font-bold text-emerald-950 transition hover:bg-emerald-400"
        >
          View Registration Status <ArrowRight className="h-4 w-4" />
        </Link>
        <Link to="/grounds" className="text-sm font-semibold text-emerald-300 underline underline-offset-2 hover:text-emerald-200">
          Browse All Grounds
        </Link>
      </div>
    </div>
  )
}

// §1-§19 — the complete Ground Registration wizard: Contact -> Ground
// Information -> Featured Photos -> Gallery -> Amenities -> Location (incl.
// address) -> Review & Submit, all backed by one hook (useGroundRegistrationWizard)
// so nothing is lost moving between steps (§12). Same component/route
// handles both a brand-new registration (mode='create', /register-ground/new)
// and Edit & Resubmit (mode='edit', /register-ground/edit/:publicRequestId)
// — the hook pre-fills from the existing request in edit mode.
export default function GroundRegistrationWizardPage({ mode = 'create' }) {
  const { publicRequestId } = useParams()
  const wizard = useGroundRegistrationWizard({ mode, publicRequestId })

  if (!wizard.loaded) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-loc-dark text-emerald-100/60">
        <p>Loading your registration…</p>
      </div>
    )
  }

  return (
    <div className="relative isolate min-h-screen overflow-x-hidden bg-loc-dark">
      <MouseParallaxProvider>
        <BackgroundSystem />
        <CursorGlow />
        <Navbar />
      </MouseParallaxProvider>

      <main className="relative mx-auto flex max-w-2xl flex-col gap-6 px-6 pt-28 pb-20 lg:px-10">
        <BackButton label="Back to LOC" fallback="/register-ground" className="w-fit" />

        {wizard.submittedRequest ? (
          <SuccessScreen request={wizard.submittedRequest} />
        ) : (
          <>
            <div>
              <span className="text-sm font-semibold uppercase tracking-widest text-emerald-400">{mode === 'edit' ? 'Edit & Resubmit' : 'New Registration'}</span>
              <h1 className="mt-2 text-3xl font-bold text-white">List Your Ground on LOC</h1>
            </div>

            <RegistrationStepper steps={wizard.steps} currentIndex={wizard.stepIndex} />

            <div className="rounded-2xl border border-emerald-400/15 bg-white/5 p-6 sm:p-8">
              {wizard.stepIndex === 0 && (
                <div className="space-y-6">
                  <h2 className="text-lg font-bold text-white">Contact Information</h2>
                  <ContactVerificationBlock
                    label="Email"
                    value={wizard.user?.email}
                    verified={wizard.emailVerifiedNow}
                    draftValue={wizard.emailDraft}
                    onDraftChange={wizard.setEmailDraft}
                    onSendCode={() => wizard.sendCode('email')}
                    onVerifyCode={(code) => wizard.verifyCode('email', code)}
                    codeSent={wizard.emailCodeSent}
                    busy={wizard.contactBusy}
                    error={wizard.contactError.email}
                  />
                  <ContactVerificationBlock
                    label="Phone"
                    value={wizard.user?.phone}
                    verified={wizard.phoneVerifiedNow}
                    draftValue={wizard.phoneDraft}
                    onDraftChange={wizard.setPhoneDraft}
                    onSendCode={() => wizard.sendCode('phone')}
                    onVerifyCode={(code) => wizard.verifyCode('phone', code)}
                    codeSent={wizard.phoneCodeSent}
                    busy={wizard.contactBusy}
                    error={wizard.contactError.phone}
                  />
                </div>
              )}

              {wizard.stepIndex === 1 && (
                <div className="space-y-5">
                  <h2 className="text-lg font-bold text-white">Ground Information</h2>
                  <Field label="Ground Name">
                    <input required maxLength={150} value={wizard.form.groundName} onChange={(e) => wizard.set('groundName')(e.target.value)} className={inputClass} placeholder="Greenfield Cricket Ground" />
                  </Field>
                  <Field label="About the Ground">
                    <textarea
                      required
                      maxLength={500}
                      rows={4}
                      value={wizard.form.about}
                      onChange={(e) => wizard.set('about')(e.target.value)}
                      className={inputClass}
                      placeholder="A professionally maintained cricket ground suitable for league matches, tournaments, practice sessions and corporate cricket events."
                    />
                  </Field>
                  <div className="grid grid-cols-2 gap-4">
                    <Field label="Ground Phone">
                      <input required maxLength={30} type="tel" value={wizard.form.groundPhone} onChange={(e) => wizard.set('groundPhone')(e.target.value)} className={inputClass} placeholder="9999999999" />
                    </Field>
                    <Field label="Ground Email" optional>
                      <input maxLength={150} type="email" value={wizard.form.groundEmail} onChange={(e) => wizard.set('groundEmail')(e.target.value)} className={inputClass} />
                    </Field>
                  </div>
                  <Field label="Website" optional>
                    <input maxLength={300} type="url" value={wizard.form.website} onChange={(e) => wizard.set('website')(e.target.value)} className={inputClass} placeholder="https://…" />
                  </Field>
                </div>
              )}

              {wizard.stepIndex === 2 && (
                <div className="space-y-5">
                  <h2 className="text-lg font-bold text-white">Featured Photos</h2>
                  <FeaturedPhotoGrid photos={wizard.form.featuredPhotos} onUploadSlot={wizard.uploadFeaturedSlot} onRemoveSlot={wizard.removeFeaturedSlot} error={wizard.featuredError} />
                </div>
              )}

              {wizard.stepIndex === 3 && (
                <div className="space-y-5">
                  <h2 className="text-lg font-bold text-white">Gallery</h2>
                  <GalleryPhotoUploader photos={wizard.form.galleryPhotos} onAdd={wizard.addGalleryPhoto} onRemove={wizard.removeGalleryPhoto} />
                </div>
              )}

              {wizard.stepIndex === 4 && (
                <div className="space-y-5">
                  <h2 className="text-lg font-bold text-white">Amenities</h2>
                  <AmenityPicker catalog={wizard.catalog} selectedKeys={wizard.form.amenityKeys} onChange={wizard.set('amenityKeys')} />
                </div>
              )}

              {wizard.stepIndex === 5 && (
                <div className="space-y-5">
                  <h2 className="text-lg font-bold text-white">Location & Address</h2>
                  <LocationMapPicker latitude={wizard.form.latitude} longitude={wizard.form.longitude} onChange={wizard.setLocation} />
                  <Field label="Address Line">
                    <input required maxLength={255} value={wizard.form.addressLine} onChange={(e) => wizard.set('addressLine')(e.target.value)} className={inputClass} placeholder="Street / locality" />
                  </Field>
                  <div className="grid grid-cols-2 gap-4">
                    <Field label="City">
                      <input required maxLength={100} value={wizard.form.city} onChange={(e) => wizard.set('city')(e.target.value)} className={inputClass} />
                    </Field>
                    <Field label="State">
                      <input required maxLength={100} value={wizard.form.state} onChange={(e) => wizard.set('state')(e.target.value)} className={inputClass} />
                    </Field>
                  </div>
                  <Field label="Pincode" optional>
                    <input maxLength={20} value={wizard.form.postalCode} onChange={(e) => wizard.set('postalCode')(e.target.value)} className={inputClass} />
                  </Field>
                </div>
              )}

              {wizard.stepIndex === 6 && (
                <ReviewStep wizard={wizard} />
              )}
            </div>

            {wizard.stepError && wizard.stepIndex !== 6 && <p className="text-xs text-amber-300/80">{wizard.stepError}</p>}

            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={wizard.goBack}
                disabled={wizard.stepIndex === 0}
                className="inline-flex items-center gap-1.5 rounded-full border border-white/15 px-5 py-2.5 text-sm font-semibold text-emerald-100/70 transition-colors hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ArrowLeft className="h-4 w-4" /> Back
              </button>
              {wizard.stepIndex < wizard.steps.length - 1 && (
                <button
                  type="button"
                  onClick={wizard.goNext}
                  disabled={!wizard.canGoNext}
                  className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500 px-6 py-2.5 text-sm font-bold text-emerald-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Next <ArrowRight className="h-4 w-4" />
                </button>
              )}
            </div>
          </>
        )}
      </main>
    </div>
  )
}

// §13-§16 — the mandatory review step: every section's entered data,
// contact verification status, all 6 featured photos, gallery
// count/thumbnails, selected amenities, location/address, then the
// required agreement checkbox gating the submit button.
function ReviewStep({ wizard }) {
  const { form } = wizard
  const selectedAmenities = wizard.catalog.filter((a) => form.amenityKeys.includes(a.key))

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-bold text-white">Review Your Ground Registration</h2>

      <ReviewSection title="Ground Information" onEdit={() => wizard.goToStep(1)}>
        <p className="font-semibold text-white">{form.groundName}</p>
        <p className="mt-1 text-sm text-emerald-100/70">{form.about}</p>
      </ReviewSection>

      <ReviewSection title="Contact" onEdit={() => wizard.goToStep(0)}>
        <p className="text-sm text-emerald-100/70">
          Email: <span className="text-white">{wizard.user?.email}</span> <span className="font-semibold text-emerald-400">✓ Verified</span>
        </p>
        <p className="text-sm text-emerald-100/70">
          Phone: <span className="text-white">{wizard.user?.phone}</span> <span className="font-semibold text-emerald-400">✓ Verified</span>
        </p>
      </ReviewSection>

      <ReviewSection title="Featured Photos" onEdit={() => wizard.goToStep(2)}>
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
          {form.featuredPhotos.map((p, i) => (
            <img key={i} src={p?.url} alt={`Featured ${i + 1}`} className="aspect-video w-full rounded-lg object-cover" />
          ))}
        </div>
      </ReviewSection>

      <ReviewSection title="Gallery" onEdit={() => wizard.goToStep(3)}>
        <p className="text-sm text-emerald-100/70">{form.galleryPhotos.length} additional photo{form.galleryPhotos.length === 1 ? '' : 's'}</p>
        {form.galleryPhotos.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-2">
            {form.galleryPhotos.map((p, i) => (
              <img key={i} src={p.url} alt="" className="h-16 w-16 rounded-lg object-cover" />
            ))}
          </div>
        )}
      </ReviewSection>

      <ReviewSection title="Amenities" onEdit={() => wizard.goToStep(4)}>
        {selectedAmenities.length === 0 ? (
          <p className="text-sm text-emerald-100/50">No amenities selected.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {selectedAmenities.map((a) => (
              <span key={a.key} className="rounded-full border border-emerald-400/30 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-100">
                {a.name}
              </span>
            ))}
          </div>
        )}
      </ReviewSection>

      <ReviewSection title="Location" onEdit={() => wizard.goToStep(5)}>
        <p className="text-sm text-white">{[form.addressLine, form.city, form.state, form.postalCode].filter(Boolean).join(', ')}</p>
        {form.latitude && form.longitude && <p className="mt-1 text-xs text-emerald-100/50">{form.latitude.toFixed(5)}, {form.longitude.toFixed(5)}</p>}
      </ReviewSection>

      <label className="flex items-start gap-3 rounded-xl border border-emerald-400/20 bg-white/5 p-4">
        <input type="checkbox" checked={form.agreedToTerms} onChange={(e) => wizard.set('agreedToTerms')(e.target.checked)} className="mt-0.5 h-4 w-4 accent-emerald-400" />
        <span className="text-sm text-emerald-100/70">
          I confirm that the information provided above is accurate and belongs to this ground. I agree to the LordOfCricket Terms &amp; Conditions and Privacy Policy.
        </span>
      </label>

      {wizard.submitError && <p className="rounded-xl border border-red-400/20 bg-red-500/10 px-3 py-2 text-sm text-red-200">{wizard.submitError}</p>}

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <button
          type="button"
          onClick={() => wizard.goToStep(1)}
          className="rounded-full border border-white/15 px-6 py-2.5 text-sm font-semibold text-emerald-100/70 transition-colors hover:bg-white/5"
        >
          Edit Details
        </button>
        <button
          type="button"
          onClick={wizard.submit}
          disabled={!form.agreedToTerms || wizard.submitting}
          className="rounded-full bg-emerald-500 px-6 py-2.5 text-sm font-bold text-emerald-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {wizard.submitting ? 'Submitting…' : 'Agree & Submit for Approval'}
        </button>
      </div>
    </div>
  )
}

function ReviewSection({ title, onEdit, children }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-4">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-bold tracking-wide text-emerald-300 uppercase">{title}</span>
        <button type="button" onClick={onEdit} className="text-xs font-semibold text-emerald-100/50 underline underline-offset-2 hover:text-emerald-200">
          Edit
        </button>
      </div>
      {children}
    </div>
  )
}
