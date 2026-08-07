import { Outlet } from 'react-router-dom'
import OfflineBanner from './OfflineBanner.jsx'

export default function Layout() {
  return (
    <div className="min-h-screen">
      <OfflineBanner />
      <Outlet />
    </div>
  )
}
