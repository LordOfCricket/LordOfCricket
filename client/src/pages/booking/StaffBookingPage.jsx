import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { useStaffBookingSchedule } from '../../hooks/useStaffBookingSchedule.js'
import { formatBookingDate, formatSlotTime } from '../../models/booking.model.js'
import Button from '../../components/ui/Button.jsx'

const STATUS_BADGE = {
  CONFIRMED: 'bg-emerald-500/15 text-emerald-300',
  CANCELLED: 'bg-white/10 text-slate-400',
}

function isCancellable(booking) {
  return booking.status === 'CONFIRMED' && new Date(booking.startTime).getTime() > Date.now()
}

export default function StaffBookingPage() {
  const navigate = useNavigate()
  const s = useStaffBookingSchedule()

  return (
    <main
      className="min-h-screen bg-cover bg-center bg-no-repeat px-4 py-10 text-white sm:px-6 lg:px-8"
      style={{ backgroundImage: `linear-gradient(rgba(2,6,23,0.85), rgba(2,6,23,0.85)), url('/images/cricket-stadium.jpg')` }}
    >
      <div className="mx-auto max-w-4xl">
        <button type="button" onClick={() => navigate(-1)} className="inline-flex items-center gap-2 text-sm font-medium text-emerald-100/70 hover:text-white">
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>

        <h1 className="mt-6 text-3xl font-bold text-white">Ground Booking Schedule</h1>

        {s.error && <p className="mt-4 text-sm text-rose-300">{s.error}</p>}

        <div className="mt-6 flex flex-wrap items-end gap-3 rounded-2xl border border-white/10 bg-white/5 p-4">
          <label className="block">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-400">From</span>
            <input type="date" value={s.from} onChange={(e) => s.setFrom(e.target.value)} className="rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-white" />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-400">To</span>
            <input type="date" value={s.to} onChange={(e) => s.setTo(e.target.value)} className="rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-white" />
          </label>
        </div>

        <section className="mt-8">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">Bookings &amp; Blocks</h2>
          {s.loading ? (
            <p className="mt-3 text-sm text-slate-400">Loading…</p>
          ) : s.bookings.length === 0 ? (
            <p className="mt-3 rounded-2xl border border-dashed border-white/10 bg-white/5 px-6 py-8 text-center text-sm text-slate-300">Nothing scheduled in this range.</p>
          ) : (
            <div className="mt-3 space-y-2">
              {s.bookings.map((b) => (
                <div key={b.publicBookingId} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-3">
                  <div>
                    <p className="text-sm font-semibold text-white">
                      {b.bookingType === 'STAFF_BLOCK' ? `Block — ${b.purpose || 'Ground Block'}` : b.customerName}
                    </p>
                    <p className="text-xs text-slate-400">
                      {formatBookingDate(b.startTime)} · {formatSlotTime(b.startTime, b.endTime)}
                      {b.bookingType === 'CUSTOMER' && b.contactPhone ? ` · ${b.contactPhone}` : ''}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`rounded-full px-3 py-1 text-xs font-bold uppercase ${STATUS_BADGE[b.status] || 'bg-white/10 text-slate-300'}`}>{b.status}</span>
                    {isCancellable(b) && (
                      <button
                        type="button"
                        disabled={s.busyId === b.publicBookingId}
                        onClick={() => (b.bookingType === 'STAFF_BLOCK' ? s.removeBlock(b.publicBookingId) : s.cancelCustomerBooking(b.publicBookingId))}
                        className="rounded-lg border border-rose-400/30 bg-rose-500/10 px-3 py-1.5 text-xs font-semibold text-rose-200 hover:bg-rose-500/20 disabled:opacity-50"
                      >
                        {b.bookingType === 'STAFF_BLOCK' ? 'Remove Block' : 'Cancel'}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="mt-8 rounded-2xl border border-amber-400/20 bg-amber-500/5 p-5">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-amber-200">Block a Time (Maintenance / Private Event / Closed)</h2>
          <div className="mt-3 flex flex-wrap items-end gap-3">
            <label className="block">
              <span className="mb-1 block text-xs font-semibold text-slate-400">Date</span>
              <input type="date" value={s.blockDate} onChange={(e) => s.setBlockDate(e.target.value)} className="rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-white" />
            </label>
            <label className="block flex-1 min-w-40">
              <span className="mb-1 block text-xs font-semibold text-slate-400">Reason</span>
              <input value={s.blockPurpose} onChange={(e) => s.setBlockPurpose(e.target.value)} placeholder="Maintenance" className="w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-slate-500" />
            </label>
            <Button onClick={s.loadBlockSlots} disabled={s.loadingBlockSlots} className="h-10 px-4 text-sm">
              {s.loadingBlockSlots ? 'Loading…' : 'Show Slots'}
            </Button>
          </div>

          {s.blockSlots.length > 0 && (
            <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {s.blockSlots.filter((slot) => slot.status === 'AVAILABLE').map((slot) => (
                <button
                  key={slot.startTime}
                  type="button"
                  onClick={() => s.addBlock(slot.startTime)}
                  className="rounded-lg border border-amber-400/30 bg-amber-500/10 px-3 py-2 text-xs font-semibold text-amber-100 hover:bg-amber-500/20"
                >
                  {formatSlotTime(slot.startTime, slot.endTime)}
                </button>
              ))}
              {s.blockSlots.every((slot) => slot.status !== 'AVAILABLE') && <p className="col-span-full text-xs text-slate-400">No available slots that day.</p>}
            </div>
          )}
        </section>
      </div>
    </main>
  )
}
