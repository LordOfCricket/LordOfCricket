import { fetchActiveOrder, fetchOrder } from '../services/canteenApi.js'

export { fetchActiveOrder, fetchOrder }

export const socketUrl = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000'
export const CANTEEN_LATEST_ORDER_STORAGE_KEY = 'canteenLatestOrder'

export const STATUS_STEPS = [
  { status: 'Pending', title: 'Order Received', detail: 'Your order has reached the canteen and is waiting to be reviewed.' },
  { status: 'Accepted', title: 'Order Accepted', detail: 'The staff has accepted your order and it is now in preparation.' },
  { status: 'Preparing', title: 'Preparing', detail: 'Your food is being freshly prepared right now.' },
  { status: 'Ready', title: 'Ready', detail: 'Your order is ready for pickup at the counter.' },
  { status: 'Completed', title: 'Completed', detail: 'Order completed successfully.' },
]
