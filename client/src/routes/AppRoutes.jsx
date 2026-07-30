import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom'
import Layout from '../components/layout/Layout.jsx'
import HomePage from '../pages/homepage/HomePage.jsx'
import AdminPhotosPage from '../pages/admin-photos/AdminPhotosPage.jsx'
import AdminAmenitiesPage from '../pages/admin-amenities/AdminAmenitiesPage.jsx'
import AdminPartnersPage from '../pages/admin-partners/AdminPartnersPage.jsx'

// Canteen (merged from the Canteen-Management repo)
import CanteenLoginPage from '../pages/canteen/login/login.jsx'
import CanteenPlayerLoginPage from '../pages/canteen/login/playerLogin.jsx'
import CanteenStaffLoginPage from '../pages/canteen/login/staffLogin.jsx'
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

      // Canteen
      { path: '/canteen', element: <Navigate to="/canteen/login" replace /> },
      { path: '/canteen/login', element: <CanteenLoginPage /> },
      { path: '/canteen/login/player', element: <CanteenPlayerLoginPage /> },
      { path: '/canteen/login/staff', element: <CanteenStaffLoginPage /> },
      { path: '/canteen/menu', element: <CanteenMenuPage /> },
      { path: '/canteen/order-status', element: <CanteenOrderStatusPage /> },
      { path: '/canteen/staff', element: <CanteenStaffDashboardPage /> },
    ],
  },
])

export default function AppRoutes() {
  return <RouterProvider router={router} />
}
