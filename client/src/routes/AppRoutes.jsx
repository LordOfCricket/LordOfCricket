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

// Phase 5 — real, backend-authoritative match scoring
import MatchSetupPage from '../pages/match-setup/MatchSetupPage.jsx'
import MatchRosterPage from '../pages/match-setup/MatchRosterPage.jsx'
import RealScorerPage from '../pages/scorer/RealScorerPage.jsx'

// Phase 8 — player discovery, public profiles, leaderboards (all public reads)
import PlayersDiscoveryPage from '../pages/players/PlayersDiscoveryPage.jsx'
import PublicPlayerProfilePage from '../pages/players/PublicPlayerProfilePage.jsx'
import LeaderboardsPage from '../pages/leaderboards/LeaderboardsPage.jsx'

// Phase 17 — Advanced Cricket Analytics: player/team comparison (public reads)
import PlayerComparePage from '../pages/players/PlayerComparePage.jsx'
import TeamComparePage from '../pages/teams/TeamComparePage.jsx'

// Phase 9 — public match summary/scorecard (public read, no auth wall)
import MatchSummaryPage from '../pages/match-summary/MatchSummaryPage.jsx'

// Phase 10 Part 1 — public match discovery (public read, no auth wall)
import MatchesPage from '../pages/matches/MatchesPage.jsx'

// Phase 10 Part 2 — public team ecosystem (public read, no auth wall)
import TeamsPage from '../pages/teams/TeamsPage.jsx'
import TeamProfilePage from '../pages/teams/TeamProfilePage.jsx'

// Temporary testing feature
import UmpireTestingPage from '../pages/testing/UmpireTestingPage.jsx'

// Canteen (merged from the Canteen-Management repo)
import CanteenMenuPage from '../pages/canteen/menu/menu.jsx'
import CanteenOrderStatusPage from '../pages/canteen/order-status/orderStatus.jsx'
import CanteenStaffDashboardPage from '../pages/canteen/staff/dashboard.jsx'

// Phase 14 Part 3 — ground booking
import MyBookingsPage from '../pages/booking/MyBookingsPage.jsx'
import StaffBookingPage from '../pages/booking/StaffBookingPage.jsx'

// Phase 15 — tournament management (public reads, staff-only mutations)
import TournamentsPage from '../pages/tournaments/TournamentsPage.jsx'
import TournamentPage from '../pages/tournaments/TournamentPage.jsx'
import CreateTournamentPage from '../pages/tournaments/CreateTournamentPage.jsx'

const router = createBrowserRouter([
  {
    element: <Layout />,
    children: [
      { path: '/', element: <HomePage /> },
      { path: '/admin/photos', element: <RequireAuth><AdminPhotosPage /></RequireAuth> },
      { path: '/admin/amenities', element: <RequireAuth><AdminAmenitiesPage /></RequireAuth> },
      { path: '/admin/partners', element: <RequireAuth><AdminPartnersPage /></RequireAuth> },

      // Auth
      { path: '/login', element: <AuthPage /> },
      { path: '/role-select', element: <RequireAuth><RoleSelectPage /></RequireAuth> },
      { path: '/player-type', element: <RequireAuth><PlayerTypeSelectPage /></RequireAuth> },
      { path: '/player/dashboard', element: <RequireAuth><PlayerDashboardPage /></RequireAuth> },
      { path: '/profile', element: <RequireAuth><ProfilePage /></RequireAuth> },
      { path: '/profile/edit', element: <RequireAuth><ProfileEditPage /></RequireAuth> },
      { path: '/umpire', element: <RequireAuth><UmpireStatusPage /></RequireAuth> },

      // Phase 8 — player discovery, public profiles, leaderboards (public reads, no auth wall)
      { path: '/players', element: <PlayersDiscoveryPage /> },
      { path: '/players/compare', element: <PlayerComparePage /> },
      { path: '/players/:publicPlayerId', element: <PublicPlayerProfilePage /> },
      { path: '/leaderboards', element: <LeaderboardsPage /> },

      // Phase 10 Part 1 — public match discovery
      { path: '/matches', element: <MatchesPage /> },

      // Phase 10 Part 2 — public team ecosystem
      { path: '/teams', element: <TeamsPage /> },
      { path: '/teams/compare', element: <TeamComparePage /> },
      { path: '/teams/:teamId', element: <TeamProfilePage /> },

      // Phase 9 — public match summary/scorecard
      { path: '/matches/:matchId/summary', element: <MatchSummaryPage /> },

      // Phase 5 — real match scoring
      { path: '/matches/new', element: <RequireAuth><MatchSetupPage /></RequireAuth> },
      { path: '/matches/:matchId/setup', element: <RequireAuth><MatchRosterPage /></RequireAuth> },
      { path: '/matches/:matchId/score', element: <RequireAuth><RealScorerPage /></RequireAuth> },

      // Temporary testing feature
      { path: '/testing', element: <UmpireTestingPage /> },

      // Canteen
      { path: '/canteen', element: <RequireAuth><CanteenEntryRedirect /></RequireAuth> },
      { path: '/canteen/menu', element: <RequireAuth><CanteenMenuPage /></RequireAuth> },
      { path: '/canteen/order-status', element: <RequireAuth><CanteenOrderStatusPage /></RequireAuth> },
      { path: '/canteen/staff', element: <RequireAuth><CanteenStaffDashboardPage /></RequireAuth> },

      // Phase 14 Part 3 — ground booking
      { path: '/bookings', element: <RequireAuth><MyBookingsPage /></RequireAuth> },
      { path: '/bookings/staff', element: <RequireAuth><StaffBookingPage /></RequireAuth> },

      // Phase 15 — tournament management (public reads, no auth wall)
      { path: '/tournaments', element: <TournamentsPage /> },
      { path: '/tournaments/new', element: <RequireAuth><CreateTournamentPage /></RequireAuth> },
      { path: '/tournaments/:publicTournamentId', element: <TournamentPage /> },
    ],
  },
])

export default function AppRoutes() {
  return <RouterProvider router={router} />
}
