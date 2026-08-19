import { useState } from 'react'
import { Copy, Check, KeyRound } from 'lucide-react'
import AdminLayout from '../../components/admin/AdminLayout.jsx'
import StepUpModal from '../../components/security/StepUpModal.jsx'
import { useAdminGroundOwners } from '../../hooks/useAdminGroundOwners.js'

function RevealedCredentialModal({ credential, onDismiss }) {
  const [copied, setCopied] = useState(false)
  if (!credential) return null

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(credential.temporaryPassword)
      setCopied(true)
    } catch {
      setCopied(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" role="dialog" aria-modal="true">
      <div className="w-full max-w-md rounded-[28px] border border-white/15 bg-slate-900/95 p-6 shadow-2xl backdrop-blur-2xl">
        <h2 className="text-lg font-bold text-white">Temporary password generated</h2>
        <p className="mt-1 text-sm text-slate-300">
          For {credential.ownerName}. Share this through a secure, out-of-band channel — it will not be shown again.
        </p>

        <div className="mt-4 flex items-center gap-2 rounded-2xl border border-amber-400/30 bg-amber-500/10 px-4 py-3">
          <code className="flex-1 select-all break-all font-mono text-sm text-amber-200">{credential.temporaryPassword}</code>
          <button
            type="button"
            onClick={copy}
            className="shrink-0 rounded-xl border border-white/15 p-2 text-slate-200 hover:bg-white/10"
            title="Copy to clipboard"
          >
            {copied ? <Check className="h-4 w-4 text-emerald-300" /> : <Copy className="h-4 w-4" />}
          </button>
        </div>

        <p className="mt-3 text-xs text-slate-400">
          Expires {new Date(credential.expiresAt).toLocaleString()} · one-time use · the account will be required to set a new password on first login.
        </p>

        <button
          type="button"
          onClick={onDismiss}
          className="mt-5 w-full rounded-2xl bg-gradient-to-r from-green-700 via-green-500 to-lime-500 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-green-900/40 hover:brightness-110"
        >
          Done
        </button>
      </div>
    </div>
  )
}

// SUPER_ADMIN Identity & Secure Provisioning feature — §12. Never displays
// or retrieves an owner's real password (impossible — only bcrypt hashes
// are ever stored); "Reset Password" only ever produces a fresh one-time
// temporary credential via the step-up-gated admin recovery flow.
export default function GroundOwnersPage() {
  const {
    owners,
    loading,
    error,
    expandedId,
    grounds,
    groundsLoading,
    toggleGrounds,
    actionError,
    resetting,
    triggerPasswordRecovery,
    revealedCredential,
    dismissRevealedCredential,
    stepUpModal,
    submitStepUp,
    cancelStepUp,
  } = useAdminGroundOwners()

  return (
    <AdminLayout title="Ground Owners" subtitle="Every account that owns one or more grounds on LOC.">
      <div className="rounded-[32px] border border-white/15 bg-slate-900/45 p-6 shadow-2xl backdrop-blur-2xl">
        {error && <p className="mb-4 rounded-xl border border-red-400/20 bg-red-500/10 px-3 py-2 text-sm text-red-200">{error}</p>}
        {actionError && <p className="mb-4 rounded-xl border border-red-400/20 bg-red-500/10 px-3 py-2 text-sm text-red-200">{actionError}</p>}
        {loading ? (
          <p className="text-slate-300">Loading ground owners…</p>
        ) : owners.length === 0 ? (
          <p className="rounded-2xl bg-white/10 p-5 text-slate-300">No ground owners yet.</p>
        ) : (
          <div className="flex flex-col gap-3">
            {owners.map((owner) => (
              <div key={owner.userId} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="font-semibold text-white">{owner.name}</p>
                    <p className="text-sm text-slate-400">{[owner.email, owner.phone].filter(Boolean).join(' · ')}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      {owner.groundCount} ground{owner.groundCount === 1 ? '' : 's'} · joined {new Date(owner.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <span className="rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-semibold text-emerald-300">{owner.status}</span>
                    <button
                      type="button"
                      onClick={() => toggleGrounds(owner)}
                      className="rounded-xl border border-white/15 px-3 py-1.5 text-xs font-semibold text-slate-200 hover:bg-white/10"
                    >
                      {expandedId === owner.userId ? 'Hide Grounds' : 'View Grounds'}
                    </button>
                    <button
                      type="button"
                      disabled={resetting === owner.userId}
                      onClick={() => triggerPasswordRecovery(owner)}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-amber-400/30 px-3 py-1.5 text-xs font-semibold text-amber-300 hover:bg-amber-500/10 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <KeyRound className="h-3.5 w-3.5" />
                      {resetting === owner.userId ? 'Generating…' : 'Reset Password'}
                    </button>
                  </div>
                </div>

                {expandedId === owner.userId && (
                  <div className="mt-3 border-t border-white/10 pt-3">
                    {groundsLoading ? (
                      <p className="text-sm text-slate-400">Loading grounds…</p>
                    ) : grounds.length === 0 ? (
                      <p className="text-sm text-slate-400">No grounds found.</p>
                    ) : (
                      <ul className="flex flex-col gap-1.5">
                        {grounds.map((g) => (
                          <li key={g.publicGroundId} className="flex items-center justify-between text-sm">
                            <span className="text-slate-200">{g.name}</span>
                            <span className="text-xs text-slate-500">
                              {[g.city, g.state].filter(Boolean).join(', ')} · {g.status}
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <StepUpModal pending={stepUpModal} onSubmit={submitStepUp} onCancel={cancelStepUp} />
      <RevealedCredentialModal credential={revealedCredential} onDismiss={dismissRevealedCredential} />
    </AdminLayout>
  )
}
