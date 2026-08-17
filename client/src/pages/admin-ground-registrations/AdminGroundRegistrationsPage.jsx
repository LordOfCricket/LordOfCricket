import AdminLayout from '../../components/admin/AdminLayout.jsx'
import Button from '../../components/ui/Button.jsx'
import StepUpModal from '../../components/security/StepUpModal.jsx'
import { useAdminGroundRegistrations } from '../../hooks/useAdminGroundRegistrations.js'

const STATUS_LABEL = {
  PENDING: 'Pending',
  UNDER_REVIEW: 'Under Review',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
  MORE_INFORMATION_REQUESTED: 'More Info Requested',
  MORE_INFORMATION_REQUIRED: 'More Info Requested',
}

function formatRequestAddress(request) {
  return [request.addressLine, request.city, request.state, request.country].filter(Boolean).join(', ')
}

// Mirrors AdminUmpireRequestsPage.jsx's layout — the review queue for Ground
// Owner requests (POST /grounds, POST /ground-owner-requests) instead of
// umpire requests. Phase 4: approving here is what creates the ground and
// grants GROUND_OWNER membership (previously granted at submission time,
// before any review — the bug this phase fixes).
export default function AdminGroundRegistrationsPage() {
  const { requests, loading, error, handleApprove, handleReject, handleRequestInformation, stepUpModal, submitStepUp, cancelStepUp } =
    useAdminGroundRegistrations()

  return (
    <AdminLayout title="Ground Owner Requests" subtitle="Review requests to register a new ground on LOC.">
      <div className="rounded-[32px] border border-white/15 bg-slate-900/45 p-6 shadow-2xl backdrop-blur-2xl">
        {loading ? (
          <p className="text-slate-300">Loading registrations…</p>
        ) : requests.length === 0 ? (
          <p className="rounded-2xl bg-white/10 p-5 text-slate-300">No pending ground owner requests.</p>
        ) : (
          <div className="space-y-4">
            {requests.map((request) => (
              <article
                key={request.publicRequestId}
                className="flex flex-col gap-4 rounded-[24px] border border-white/10 bg-white/10 p-5 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <span className="text-xs font-semibold uppercase tracking-wide text-emerald-300">{STATUS_LABEL[request.status] || request.status}</span>
                  <h3 className="text-lg font-semibold text-white">{request.groundName}</h3>
                  <p className="text-sm text-slate-300">{formatRequestAddress(request)}</p>
                  <p className="text-sm text-slate-400">{[request.groundPhone, request.groundEmail].filter(Boolean).join(' · ')}</p>
                  <p className="mt-1 text-xs text-slate-400">
                    Applicant: {request.applicantName} ({[request.applicantEmail, request.applicantPhone].filter(Boolean).join(' / ')})
                  </p>
                  {request.createdAt && (
                    <p className="mt-1 text-xs uppercase tracking-wide text-slate-400">Submitted {new Date(request.createdAt).toLocaleDateString()}</p>
                  )}
                </div>
                <div className="flex shrink-0 flex-wrap gap-3">
                  <Button onClick={() => handleApprove(request)}>Approve</Button>
                  <Button className="bg-amber-600" onClick={() => handleRequestInformation(request)}>
                    Request Info
                  </Button>
                  <Button className="bg-red-600" onClick={() => handleReject(request)}>
                    Reject
                  </Button>
                </div>
              </article>
            ))}
          </div>
        )}

        {error && <p className="mt-4 text-sm text-rose-300">{error}</p>}
      </div>

      <StepUpModal pending={stepUpModal} onSubmit={submitStepUp} onCancel={cancelStepUp} />
    </AdminLayout>
  )
}
