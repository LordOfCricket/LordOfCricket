import AdminLayout from '../../components/admin/AdminLayout.jsx'
import Button from '../../components/ui/Button.jsx'
import { useAdminGroundRegistrations } from '../../hooks/useAdminGroundRegistrations.js'
import { formatGroundAddress } from '../../models/groundDiscovery.model.js'

// Mirrors AdminUmpireRequestsPage.jsx exactly — the review queue for
// self-serve ground registrations (POST /grounds) instead of umpire
// requests. Approve activates the ground (publicly visible everywhere);
// Reject suspends it.
export default function AdminGroundRegistrationsPage() {
  const { grounds, loading, error, handleDecide } = useAdminGroundRegistrations()

  return (
    <AdminLayout title="Ground Registrations" subtitle="Review grounds submitted for listing on LOC.">
      <div className="rounded-[32px] border border-white/15 bg-slate-900/45 p-6 shadow-2xl backdrop-blur-2xl">
        {loading ? (
          <p className="text-slate-300">Loading registrations…</p>
        ) : grounds.length === 0 ? (
          <p className="rounded-2xl bg-white/10 p-5 text-slate-300">No pending ground registrations.</p>
        ) : (
          <div className="space-y-4">
            {grounds.map((ground) => (
              <article
                key={ground.publicGroundId}
                className="flex flex-col gap-4 rounded-[24px] border border-white/10 bg-white/10 p-5 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <h3 className="text-lg font-semibold text-white">{ground.name}</h3>
                  <p className="text-sm text-slate-300">{formatGroundAddress(ground)}</p>
                  <p className="text-sm text-slate-400">
                    {[ground.phone, ground.email].filter(Boolean).join(' · ')}
                  </p>
                  {ground.createdAt && (
                    <p className="mt-1 text-xs uppercase tracking-wide text-slate-400">
                      Submitted {new Date(ground.createdAt).toLocaleDateString()}
                    </p>
                  )}
                </div>
                <div className="flex shrink-0 gap-3">
                  <Button onClick={() => handleDecide(ground, 'approved')}>Approve</Button>
                  <Button className="bg-red-600" onClick={() => handleDecide(ground, 'rejected')}>
                    Reject
                  </Button>
                </div>
              </article>
            ))}
          </div>
        )}

        {error && <p className="mt-4 text-sm text-rose-300">{error}</p>}
      </div>
    </AdminLayout>
  )
}
