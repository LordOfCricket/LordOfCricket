import { Suspense, lazy } from 'react'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import Layout from '../components/layout/Layout.jsx'
import RequireAuth from './RequireAuth.jsx'
import RequireStaffRole from './RequireStaffRole.jsx'
import RequireApprovedUmpire from './RequireApprovedUmpire.jsx'
import RequireGroundOwner from './RequireGroundOwner.jsx'
import CanteenEntryRedirect from './CanteenEntryRedirect.jsx'
import RouteErrorBoundary from './RouteErrorBoundary.jsx'
import NotFoundPage from '../pages/not-found/NotFoundPage.jsx'

// Phase 19 — route-based code splitting. The production build was shipping
// every page (auth, scoring, canteen, tournaments, analytics, admin...) in
// one ~870KB JS chunk regardless of which single page a visitor actually
// landed on. Each page is now its own chunk, fetched only when its route is
// visited — a build-time change only, no page's own logic is touched.
// Phase 13 — Level 1 (LOC platform homepage, ground discovery) and Level 2
// (the reusable per-ground template) replace the old single-ground HomePage.
const DiscoveryPage = lazy(() => import('../pages/discovery/DiscoveryPage.jsx'))
const GroundsPage = lazy(() => import('../pages/grounds/GroundsPage.jsx'))
const RegisterGroundPage = lazy(() => import('../pages/register-ground/RegisterGroundPage.jsx'))
const GroundHomePage = lazy(() => import('../pages/ground-homepage/GroundHomePage.jsx'))
const AdminPhotosPage = lazy(() => import('../pages/admin-photos/AdminPhotosPage.jsx'))
const AdminGalleryPage = lazy(() => import('../pages/admin-gallery/AdminGalleryPage.jsx'))
const AdminAmenitiesPage = lazy(() => import('../pages/admin-amenities/AdminAmenitiesPage.jsx'))
const AdminPartnersPage = lazy(() => import('../pages/admin-partners/AdminPartnersPage.jsx'))

// Super Admin Staff Dashboard
const AdminDashboardPage = lazy(() => import('../pages/admin-dashboard/AdminDashboardPage.jsx'))
const AdminUmpireRequestsPage = lazy(() => import('../pages/admin-umpire-requests/AdminUmpireRequestsPage.jsx'))
const AdminGroundRegistrationsPage = lazy(() => import('../pages/admin-ground-registrations/AdminGroundRegistrationsPage.jsx'))
const AdminPhotosHubPage = lazy(() => import('../pages/admin-photos-hub/AdminPhotosHubPage.jsx'))
const CreateStaffPage = lazy(() => import('../pages/admin-staff/CreateStaffPage.jsx'))

// Site-wide auth
const AuthPage = lazy(() => import('../pages/auth/AuthPage.jsx'))
const RoleSelectPage = lazy(() => import('../pages/role-select/RoleSelectPage.jsx'))
const PlayerTypeSelectPage = lazy(() => import('../pages/player-type/PlayerTypeSelectPage.jsx'))
const PlayerDashboardPage = lazy(() => import('../pages/player-dashboard/PlayerDashboardPage.jsx'))
const ProfilePage = lazy(() => import('../pages/profile/ProfilePage.jsx'))
const ProfileEditPage = lazy(() => import('../pages/profile/ProfileEditPage.jsx'))
const UmpireStatusPage = lazy(() => import('../pages/umpire/UmpireStatusPage.jsx'))
const UmpireDashboardPage = lazy(() => import('../pages/umpire/UmpireDashboardPage.jsx'))
const UmpireGroundDiscoveryPage = lazy(() => import('../pages/umpire/UmpireGroundDiscoveryPage.jsx'))
const AvailableMatchesPage = lazy(() => import('../pages/umpire/AvailableMatchesPage.jsx'))
const MyAssignmentsPage = lazy(() => import('../pages/umpire/MyAssignmentsPage.jsx'))
const UmpireProfilePage = lazy(() => import('../pages/umpire/UmpireProfilePage.jsx'))
const UmpireStatisticsPage = lazy(() => import('../pages/umpire/UmpireStatisticsPage.jsx'))
const UmpireEarningsPage = lazy(() => import('../pages/umpire/UmpireEarningsPage.jsx'))
const MatchBriefingPage = lazy(() => import('../pages/umpire/MatchBriefingPage.jsx'))
const GroundOwnerDashboardPage = lazy(() => import('../pages/ground-owner/GroundOwnerDashboardPage.jsx'))
const GroundMatchesPage = lazy(() => import('../pages/ground-owner/GroundMatchesPage.jsx'))

// Phase 5 — real, backend-authoritative match scoring
const MatchSetupPage = lazy(() => import('../pages/match-setup/MatchSetupPage.jsx'))
const MatchRosterPage = lazy(() => import('../pages/match-setup/MatchRosterPage.jsx'))
const RealScorerPage = lazy(() => import('../pages/scorer/RealScorerPage.jsx'))

// Phase 8 — player discovery, public profiles, leaderboards (all public reads)
const PlayersDiscoveryPage = lazy(() => import('../pages/players/PlayersDiscoveryPage.jsx'))
const PublicPlayerProfilePage = lazy(() => import('../pages/players/PublicPlayerProfilePage.jsx'))
const LeaderboardsPage = lazy(() => import('../pages/leaderboards/LeaderboardsPage.jsx'))
const TopUmpiresPage = lazy(() => import('../pages/leaderboards/TopUmpiresPage.jsx'))

// Phase 17 — Advanced Cricket Analytics: player/team comparison (public reads)
const PlayerComparePage = lazy(() => import('../pages/players/PlayerComparePage.jsx'))
const TeamComparePage = lazy(() => import('../pages/teams/TeamComparePage.jsx'))

// Phase 9 — public match summary/scorecard (public read, no auth wall)
const MatchSummaryPage = lazy(() => import('../pages/match-summary/MatchSummaryPage.jsx'))
const MatchFeedbackPage = lazy(() => import('../pages/match-feedback/MatchFeedbackPage.jsx'))

// Phase 10 Part 1 — public match discovery (public read, no auth wall)
const MatchesPage = lazy(() => import('../pages/matches/MatchesPage.jsx'))

// Phase 10 Part 2 — public team ecosystem (public read, no auth wall)
const TeamsPage = lazy(() => import('../pages/teams/TeamsPage.jsx'))
const TeamProfilePage = lazy(() => import('../pages/teams/TeamProfilePage.jsx'))

// Temporary testing feature
const UmpireTestingPage = lazy(() => import('../pages/testing/UmpireTestingPage.jsx'))

// Canteen (merged from the Canteen-Management repo)
const CanteenMenuPage = lazy(() => import('../pages/canteen/menu/menu.jsx'))
const CanteenOrderStatusPage = lazy(() => import('../pages/canteen/order-status/orderStatus.jsx'))
const CanteenStaffDashboardPage = lazy(() => import('../pages/canteen/staff/dashboard.jsx'))

// Phase 14 Part 3 — ground booking
const MyBookingsPage = lazy(() => import('../pages/booking/MyBookingsPage.jsx'))
const StaffBookingPage = lazy(() => import('../pages/booking/StaffBookingPage.jsx'))

// Phase 15 — tournament management (public reads, staff-only mutations)
const TournamentsPage = lazy(() => import('../pages/tournaments/TournamentsPage.jsx'))
const TournamentPage = lazy(() => import('../pages/tournaments/TournamentPage.jsx'))
const CreateTournamentPage = lazy(() => import('../pages/tournaments/CreateTournamentPage.jsx'))

function RouteFallback() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center" role="status" aria-label="Loading page">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/20 border-t-white" />
    </div>
  )
}

function withSuspense(element) {
  return <Suspense fallback={<RouteFallback />}>{element}</Suspense>
}

const router = createBrowserRouter([
  {
    element: <Layout />,
    errorElement: <RouteErrorBoundary />,
    children: [
      { path: '/', element: withSuspense(<DiscoveryPage />) },
      { path: '/grounds', element: withSuspense(<GroundsPage />) },
      { path: '/register-ground', element: <RequireAuth>{withSuspense(<RegisterGroundPage />)}</RequireAuth> },
      { path: '/grounds/:publicGroundId', element: withSuspense(<GroundHomePage />) },
      { path: '/admin/photos', element: <RequireStaffRole allow={['super_admin']}>{withSuspense(<AdminPhotosPage />)}</RequireStaffRole> },
      { path: '/admin/gallery', element: <RequireStaffRole allow={['super_admin']}>{withSuspense(<AdminGalleryPage />)}</RequireStaffRole> },
      { path: '/admin/amenities', element: <RequireStaffRole allow={['super_admin']}>{withSuspense(<AdminAmenitiesPage />)}</RequireStaffRole> },
      { path: '/admin/partners', element: <RequireStaffRole allow={['super_admin']}>{withSuspense(<AdminPartnersPage />)}</RequireStaffRole> },

      // Super Admin Staff Dashboard
      { path: '/admin/dashboard', element: <RequireStaffRole allow={['super_admin', 'admin']}>{withSuspense(<AdminDashboardPage />)}</RequireStaffRole> },
      { path: '/admin/umpire-requests', element: <RequireStaffRole allow={['super_admin']}>{withSuspense(<AdminUmpireRequestsPage />)}</RequireStaffRole> },
      { path: '/admin/ground-registrations', element: <RequireStaffRole allow={['super_admin']}>{withSuspense(<AdminGroundRegistrationsPage />)}</RequireStaffRole> },
      { path: '/admin/photos-hub', element: <RequireStaffRole allow={['super_admin']}>{withSuspense(<AdminPhotosHubPage />)}</RequireStaffRole> },
      { path: '/admin/staff/new', element: <RequireStaffRole allow={['super_admin']}>{withSuspense(<CreateStaffPage />)}</RequireStaffRole> },

      // Auth
      { path: '/login', element: withSuspense(<AuthPage />) },
      { path: '/role-select', element: <RequireAuth>{withSuspense(<RoleSelectPage />)}</RequireAuth> },
      { path: '/player-type', element: <RequireAuth>{withSuspense(<PlayerTypeSelectPage />)}</RequireAuth> },
      { path: '/player/dashboard', element: <RequireAuth>{withSuspense(<PlayerDashboardPage />)}</RequireAuth> },
      { path: '/profile', element: <RequireAuth>{withSuspense(<ProfilePage />)}</RequireAuth> },
      { path: '/profile/edit', element: <RequireAuth>{withSuspense(<ProfileEditPage />)}</RequireAuth> },
      { path: '/umpire', element: <RequireAuth>{withSuspense(<UmpireStatusPage />)}</RequireAuth> },
      { path: '/umpire/dashboard', element: <RequireApprovedUmpire>{withSuspense(<UmpireDashboardPage />)}</RequireApprovedUmpire> },
      { path: '/umpire/find-matches', element: <RequireApprovedUmpire>{withSuspense(<UmpireGroundDiscoveryPage />)}</RequireApprovedUmpire> },
      { path: '/umpire/available-matches', element: <RequireApprovedUmpire>{withSuspense(<AvailableMatchesPage />)}</RequireApprovedUmpire> },
      { path: '/umpire/my-assignments', element: <RequireApprovedUmpire>{withSuspense(<MyAssignmentsPage />)}</RequireApprovedUmpire> },
      { path: '/umpire/profile', element: <RequireApprovedUmpire>{withSuspense(<UmpireProfilePage />)}</RequireApprovedUmpire> },
      { path: '/umpire/statistics', element: <RequireApprovedUmpire>{withSuspense(<UmpireStatisticsPage />)}</RequireApprovedUmpire> },
      { path: '/umpire/earnings', element: <RequireApprovedUmpire>{withSuspense(<UmpireEarningsPage />)}</RequireApprovedUmpire> },
      { path: '/umpire/matches/:matchId/briefing', element: <RequireApprovedUmpire>{withSuspense(<MatchBriefingPage />)}</RequireApprovedUmpire> },
      { path: '/ground-owner/dashboard', element: <RequireGroundOwner>{withSuspense(<GroundOwnerDashboardPage />)}</RequireGroundOwner> },
      { path: '/ground-owner/grounds/:publicGroundId', element: <RequireGroundOwner>{withSuspense(<GroundMatchesPage />)}</RequireGroundOwner> },

      // Phase 8 — player discovery, public profiles, leaderboards (public reads, no auth wall)
      { path: '/players', element: withSuspense(<PlayersDiscoveryPage />) },
      { path: '/players/compare', element: withSuspense(<PlayerComparePage />) },
      { path: '/players/:publicPlayerId', element: withSuspense(<PublicPlayerProfilePage />) },
      { path: '/leaderboards', element: withSuspense(<LeaderboardsPage />) },
      { path: '/leaderboards/umpires', element: withSuspense(<TopUmpiresPage />) },

      // Phase 10 Part 1 — public match discovery
      { path: '/matches', element: withSuspense(<MatchesPage />) },

      // Phase 10 Part 2 — public team ecosystem
      { path: '/teams', element: withSuspense(<TeamsPage />) },
      { path: '/teams/compare', element: withSuspense(<TeamComparePage />) },
      { path: '/teams/:teamId', element: withSuspense(<TeamProfilePage />) },

      // Phase 9 — public match summary/scorecard
      { path: '/matches/:matchId/summary', element: withSuspense(<MatchSummaryPage />) },
      { path: '/matches/:matchId/feedback', element: <RequireAuth>{withSuspense(<MatchFeedbackPage />)}</RequireAuth> },

      // Phase 5 — real match scoring
      // U5.1 — match creation is now super_admin-only (Ground Owners create
      // through /ground-owner instead); was RequireAuth-only, which let an
      // approved umpire reach a form the backend now 403s.
      { path: '/matches/new', element: <RequireStaffRole allow={['super_admin']}>{withSuspense(<MatchSetupPage />)}</RequireStaffRole> },
      { path: '/matches/:matchId/setup', element: <RequireAuth>{withSuspense(<MatchRosterPage />)}</RequireAuth> },
      { path: '/matches/:matchId/score', element: <RequireAuth>{withSuspense(<RealScorerPage />)}</RequireAuth> },

      // Temporary testing feature
      { path: '/testing', element: withSuspense(<UmpireTestingPage />) },

      // Canteen
      { path: '/canteen', element: <RequireAuth><CanteenEntryRedirect /></RequireAuth> },
      { path: '/canteen/menu', element: <RequireAuth>{withSuspense(<CanteenMenuPage />)}</RequireAuth> },
      { path: '/canteen/order-status', element: <RequireAuth>{withSuspense(<CanteenOrderStatusPage />)}</RequireAuth> },
      { path: '/canteen/staff', element: <RequireAuth>{withSuspense(<CanteenStaffDashboardPage />)}</RequireAuth> },

      // Phase 14 Part 3 — ground booking
      { path: '/bookings', element: <RequireAuth>{withSuspense(<MyBookingsPage />)}</RequireAuth> },
      { path: '/bookings/staff', element: <RequireAuth>{withSuspense(<StaffBookingPage />)}</RequireAuth> },

      // Phase 15 — tournament management (public reads, no auth wall)
      { path: '/tournaments', element: withSuspense(<TournamentsPage />) },
      { path: '/tournaments/new', element: <RequireAuth>{withSuspense(<CreateTournamentPage />)}</RequireAuth> },
      { path: '/tournaments/:publicTournamentId', element: withSuspense(<TournamentPage />) },

      // Catch-all — anything unmatched (typo, stale bookmark, dead link).
      { path: '*', element: <NotFoundPage /> },
    ],
  },
])

export default function AppRoutes() {
  return <RouterProvider router={router} />
}
