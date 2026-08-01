import { useNavigate } from 'react-router-dom'
import Button from '../../components/ui/Button.jsx'
import LiveScoreCard from '../../components/common/LiveScoreCard.jsx'
import { statusBadgeClass } from '../../models/playerDashboard.model.js'
import { usePlayerDashboard } from '../../hooks/usePlayerDashboard.js'

export default function PlayerDashboardPage() {
  const navigate = useNavigate()
  const { user, activeOrder, recentOrders, totalOrders, totalSpent, loading, error } = usePlayerDashboard()

  return (
    <main
      className="min-h-screen bg-cover bg-center bg-no-repeat px-4 py-10 text-white sm:px-6 lg:px-8"
      style={{
        backgroundImage: `
          linear-gradient(
            rgba(2,6,23,0.78),
            rgba(2,6,23,0.78)
          ),
          url('/images/cricket-stadium.jpg')
        `,
      }}
    >
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-emerald-200">Player Dashboard</p>
            <h1 className="mt-2 text-3xl font-bold sm:text-4xl">Welcome back, {user?.name || 'Player'}</h1>
          </div>
          <span className="w-fit rounded-full bg-emerald-500/15 px-4 py-2 text-sm font-semibold text-emerald-200">
            🏏 Team Player
          </span>
        </div>

        {error && (
          <div className="mt-6 rounded-2xl border border-red-400/20 bg-red-500/10 px-5 py-4 text-rose-300">
            {error}
          </div>
        )}

        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          <StatTile label="Total Orders" value={loading ? '—' : totalOrders} />
          <StatTile label="Total Spent" value={loading ? '—' : `₹${totalSpent}`} />
          <StatTile label="Active Order" value={loading ? '—' : activeOrder ? activeOrder.status : 'None'} />
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="space-y-6">
            <div className="rounded-[1.5rem] border border-white/10 bg-slate-900/50 p-6 shadow-sm backdrop-blur-sm">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold">Active Order</h2>
                {activeOrder && (
                  <span className={`rounded-full px-3 py-1 text-sm font-semibold ${statusBadgeClass(activeOrder.status)}`}>
                    {activeOrder.status}
                  </span>
                )}
              </div>

              {activeOrder ? (
                <>
                  <p className="mt-4 text-slate-300">
                    Order <span className="font-semibold text-white">{activeOrder.id}</span> · {activeOrder.items?.length || 0} item(s) · ₹{activeOrder.total}
                  </p>
                  <Button
                    className="mt-5"
                    onClick={() => navigate('/canteen/order-status', { state: { orderId: activeOrder.id } })}
                  >
                    Track Order
                  </Button>
                </>
              ) : (
                <>
                  <p className="mt-4 text-slate-300">You don't have an order in progress right now.</p>
                  <Button className="mt-5" onClick={() => navigate('/canteen/menu')}>
                    Order Now
                  </Button>
                </>
              )}
            </div>

            <div className="rounded-[1.5rem] border border-white/10 bg-slate-900/50 p-6 shadow-sm backdrop-blur-sm">
              <h2 className="text-xl font-semibold">Recent Orders</h2>
              {recentOrders.length === 0 ? (
                <p className="mt-4 text-slate-300">No past orders yet.</p>
              ) : (
                <div className="mt-4 space-y-3">
                  {recentOrders.map((order) => (
                    <div key={order.id} className="flex items-center justify-between rounded-2xl bg-white/5 px-4 py-3">
                      <span className="text-slate-200">{order.id}</span>
                      <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusBadgeClass(order.status)}`}>
                        {order.status}
                      </span>
                      <span className="font-semibold text-white">₹{order.total}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="space-y-6">
            <LiveScoreCard />
            <Button className="w-full" onClick={() => navigate('/canteen/menu')}>
              Browse Menu
            </Button>
          </div>
        </div>
      </div>
    </main>
  )
}

function StatTile({ label, value }) {
  return (
    <div className="rounded-[1.5rem] border border-white/10 bg-white/5 p-5 backdrop-blur-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-300">{label}</p>
      <p className="mt-2 text-2xl font-bold text-white">{value}</p>
    </div>
  )
}
