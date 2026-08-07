export { statusBadgeClass } from './canteenDashboard.model.js'

export function summarizeOrders(history) {
  const totalOrders = history.length
  const totalSpent = history.reduce((sum, order) => sum + (Number(order.total) || 0), 0)
  return { totalOrders, totalSpent }
}
