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
import PlayerDashboardPage from '../pages/player-dashboard/PlayerDashboardPage.jsx'
import ProfilePage from '../pages/profile/ProfilePage.jsx'
import ProfileEditPage from '../pages/profile/ProfileEditPage.jsx'
import UmpireStatusPage from '../pages/umpire/UmpireStatusPage.jsx'
import RequireAuth from './RequireAuth.jsx'
import CanteenEntryRedirect from './CanteenEntryRedirect.jsx'

// Temporary testing feature
import UmpireTestingPage from '../pages/testing/UmpireTestingPage.jsx'

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
      { path: '/player/dashboard', element: <RequireAuth><PlayerDashboardPage /></RequireAuth> },
      { path: '/profile', element: <RequireAuth><ProfilePage /></RequireAuth> },
      { path: '/profile/edit', element: <RequireAuth><ProfileEditPage /></RequireAuth> },
      { path: '/umpire', element: <RequireAuth><UmpireStatusPage /></RequireAuth> },

      // Temporary testing feature
      { path: '/testing', element: <UmpireTestingPage /> },

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
