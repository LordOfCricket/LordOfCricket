import { useNavigate } from 'react-router-dom'
import { UtensilsCrossed } from 'lucide-react'
import Button from '../ui/Button.jsx'
import { statusBadgeClass } from '../../models/playerDashboard.model.js'

export default function CanteenSummary({ activeOrder, recentOrders, loading, error }) {
  const navigate = useNavigate()

  return (
    <div className="rounded-[1.5rem] border border-white/10 bg-slate-900/50 p-6 shadow-sm backdrop-blur-sm">
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-xl font-semibold text-white">
          <UtensilsCrossed className="h-5 w-5 text-emerald-300" />
          Canteen
        </h2>
        {activeOrder && (
          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusBadgeClass(activeOrder.status)}`}>
            {activeOrder.status}
          </span>
        )}
      </div>

      {error && <p className="mt-4 text-sm text-rose-300">{error}</p>}

      {!error && loading && <p className="mt-4 text-sm text-slate-400">Loading canteen activity…</p>}

      {!error && !loading && (
        <>
          {activeOrder ? (
            <>
              <p className="mt-4 text-sm text-slate-300">
                Order <span className="font-semibold text-white">{activeOrder.id}</span> ·{' '}
                {activeOrder.items?.length || 0} item(s) · ₹{activeOrder.total}
              </p>
              <Button
                className="mt-4 h-11 px-5 text-sm"
                onClick={() => navigate('/canteen/order-status', { state: { orderId: activeOrder.id } })}
              >
                View Order
              </Button>
            </>
          ) : (
            <p className="mt-4 text-sm text-slate-300">No active canteen order right now.</p>
          )}

          <Button className="mt-4 h-11 w-full px-4 text-sm from-slate-700 via-slate-600 to-slate-500" onClick={() => navigate('/canteen/menu')}>
            Order Now
          </Button>

          {recentOrders.length > 0 ? (
            <div className="mt-4 space-y-2 border-t border-white/10 pt-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Recent Orders</p>
              {recentOrders.map((order) => (
                <div key={order.id} className="flex items-center justify-between rounded-xl bg-white/5 px-3 py-2 text-sm">
                  <span className="text-slate-300">{order.id}</span>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${statusBadgeClass(order.status)}`}>{order.status}</span>
                  <span className="font-semibold text-white">₹{order.total}</span>
                </div>
              ))}
            </div>
          ) : (
            !activeOrder && <p className="mt-3 text-xs text-slate-500">No canteen orders yet.</p>
          )}
        </>
      )}
    </div>
  )
}
