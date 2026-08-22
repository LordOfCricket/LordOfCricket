import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { Download } from 'lucide-react'
import BackButton from '../../components/common/BackButton.jsx'
import GroundOwnerLayout from '../../components/ground-owner/GroundOwnerLayout.jsx'
import GroundNavTabs from '../../components/ground-owner/GroundNavTabs.jsx'
import { StatsErrorState, StatsLoadingGrid } from '../../components/stats/StatsStates.jsx'
import StatTile from '../../components/stats/StatTile.jsx'
import { useGroundAnalytics } from '../../hooks/useGroundAnalytics.js'
import { exportGroundAnalyticsCsv } from '../../services/groundOwnerApi.js'
import { formatAmount } from '../../models/umpireEarnings.model.js'

const RANGE_OPTIONS = [
  { key: 'TODAY', label: 'Today' },
  { key: 'LAST_7_DAYS', label: 'Last 7 Days' },
  { key: 'LAST_30_DAYS', label: 'Last 30 Days' },
]

// Phase 14 — triggers a real browser download from a blob response. Not an
// Artifact/sandboxed context — this is the live LOC app, where a normal
// object-URL download works exactly as it would on any other site.
function downloadCsv(blob, filename) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

export default function GroundAnalyticsPage() {
  const { publicGroundId } = useParams()
  const [range, setRange] = useState('TODAY')
  const { analytics, loading, error, refresh } = useGroundAnalytics(publicGroundId, range)
  const [exporting, setExporting] = useState(false)
  const [exportError, setExportError] = useState('')

  const handleExport = async () => {
    setExporting(true)
    setExportError('')
    try {
      const blob = await exportGroundAnalyticsCsv(publicGroundId, range)
      downloadCsv(blob, `ground-analytics-${range.toLowerCase()}.csv`)
    } catch (err) {
      setExportError(err.response?.data?.error || err.response?.data?.message || 'Failed to export CSV')
    } finally {
      setExporting(false)
    }
  }

  return (
    <GroundOwnerLayout>
      <BackButton fallback="/ground-owner/dashboard" className="mb-4" />
      <GroundNavTabs />

      <div className="mb-6">
        <h1 className="text-3xl font-bold text-white">Analytics</h1>
        <p className="mt-2 text-slate-400">Booking trends, utilization, and canteen revenue for this ground.</p>
      </div>

      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-2">
          {RANGE_OPTIONS.map((opt) => (
            <button
              key={opt.key}
              type="button"
              onClick={() => setRange(opt.key)}
              className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                range === opt.key ? 'bg-green-600 text-white' : 'bg-white/5 text-slate-300 hover:bg-white/10'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={handleExport}
          disabled={exporting || loading || !analytics}
          className="inline-flex items-center gap-2 rounded-full border border-white/10 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Download size={16} />
          {exporting ? 'Exporting…' : 'Export CSV'}
        </button>
      </div>

      {exportError && (
        <div className="mb-4 rounded-2xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm text-rose-300">{exportError}</div>
      )}

      {loading && <StatsLoadingGrid tiles={4} />}
      {!loading && error && <StatsErrorState message={error} onRetry={refresh} />}

      {!loading && !error && analytics && (
        <div className="space-y-8">
          <section>
            <h2 className="mb-3 text-lg font-bold text-white">Bookings</h2>
            {analytics.metrics.totalBookings === 0 ? (
              <p className="text-sm text-slate-400">No bookings in this range ({analytics.dateRange}).</p>
            ) : (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <StatTile label="Total Bookings" value={analytics.metrics.totalBookings} emphasis />
                  <StatTile label="Confirmed" value={analytics.metrics.confirmedBookings} />
                  <StatTile label="Cancelled" value={analytics.metrics.cancelledBookings} />
                  <StatTile label="No-Shows" value={analytics.metrics.noShowBookings} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <StatTile label="Total Booked Hours" value={analytics.metrics.totalBookedHours} />
                  <StatTile label="Avg. Booking Length (hrs)" value={analytics.metrics.averageBookingHours} />
                </div>
              </div>
            )}
          </section>

          <section>
            <h2 className="mb-3 text-lg font-bold text-white">Utilization</h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <StatTile
                label="Utilized"
                value={analytics.utilization.utilizedPercentage != null ? `${analytics.utilization.utilizedPercentage.toFixed(1)}%` : '—'}
                emphasis
              />
              <StatTile label="Booked Hours" value={analytics.utilization.bookedHours} />
              <StatTile label="Blocked Hours" value={analytics.utilization.blockedHours} />
              <StatTile label="Match Hours" value={analytics.utilization.matchHours} />
            </div>
            <p className="mt-2 text-xs text-slate-500">
              {analytics.utilization.freeHours} of {analytics.utilization.totalHours} available hours free this range.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-bold text-white">Canteen Revenue</h2>
            {analytics.canteenRevenue.orderCount === 0 ? (
              <p className="text-sm text-slate-400">No canteen revenue in this range ({analytics.dateRange}).</p>
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                <StatTile label="Revenue" value={formatAmount(analytics.canteenRevenue.revenue)} emphasis />
                <StatTile label="Orders" value={analytics.canteenRevenue.orderCount} />
                <StatTile label="Avg. Order Value" value={formatAmount(analytics.canteenRevenue.averageOrderValue)} />
              </div>
            )}
          </section>
        </div>
      )}
    </GroundOwnerLayout>
  )
}
