import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import Layout from '../components/layout/Layout.jsx'
import HomePage from '../pages/homepage/HomePage.jsx'
import AdminPhotosPage from '../pages/admin-photos/AdminPhotosPage.jsx'
import AdminAmenitiesPage from '../pages/admin-amenities/AdminAmenitiesPage.jsx'
import AdminPartnersPage from '../pages/admin-partners/AdminPartnersPage.jsx'

// Site-wide auth
import AuthPage from '../pages/auth/AuthPage.jsx'
import RoleSelectPage from '../pages/role-select/RoleSelectPage.jsx'
import PlayerTypeSelectPage from '../pages/player-type/PlayerTypeSelectPage.jsx'
import UmpireStatusPage from '../pages/umpire/UmpireStatusPage.jsx'
import RequireAuth from './RequireAuth.jsx'
import CanteenEntryRedirect from './CanteenEntryRedirect.jsx'

// Canteen (merged from the Canteen-Management repo)
import CanteenMenuPage from '../pages/canteen/menu/menu.jsx'
import CanteenOrderStatusPage from '../pages/canteen/order-status/orderStatus.jsx'
import CanteenStaffDashboardPage from '../pages/canteen/staff/dashboard.jsx'

const router = createBrowserRouter([
  {
    element: <Layout />,
    children: [
      { path: '/', element: <HomePage /> },
      { path: '/admin/photos', element: <AdminPhotosPage /> },
      { path: '/admin/amenities', element: <AdminAmenitiesPage /> },
      { path: '/admin/partners', element: <AdminPartnersPage /> },

      // Auth
      { path: '/login', element: <AuthPage /> },
      { path: '/role-select', element: <RequireAuth><RoleSelectPage /></RequireAuth> },
      { path: '/player-type', element: <RequireAuth><PlayerTypeSelectPage /></RequireAuth> },
      { path: '/umpire', element: <RequireAuth><UmpireStatusPage /></RequireAuth> },

      // Canteen
      { path: '/canteen', element: <RequireAuth><CanteenEntryRedirect /></RequireAuth> },
      { path: '/canteen/menu', element: <RequireAuth><CanteenMenuPage /></RequireAuth> },
      { path: '/canteen/order-status', element: <RequireAuth><CanteenOrderStatusPage /></RequireAuth> },
      { path: '/canteen/staff', element: <RequireAuth><CanteenStaffDashboardPage /></RequireAuth> },
    ],
  },
])

export default function AppRoutes() {
  return <RouterProvider router={router} />
}
