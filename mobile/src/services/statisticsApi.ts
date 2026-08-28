import api from './api'

// Official statistics client — leaderboards, player search, public profile.
// Every number is derived server-side from finalized PostgreSQL match history
// on each request (statistics.service.js). Nothing is aggregated or cached
// on the client. All endpoints here are public (no auth), consistent with
// the public-read posture the website's own statisticsApi.js already uses.

// --- Leaderboards (GET /stats/leaderboards/:metric) -------------------------
// Mirrors the website's fetchLeaderboard exactly (client/src/services/
// statisticsApi.js). The response shape is statistics.service.js#getLeaderboard
// -> statistics.controller.js#getLeaderboard (values rounded at the HTTP
// boundary only).

// A leaderboard `value` is usually a number, but two metrics return an
// object: `highest-score` -> { runs, notOut } and `best-bowling` ->
// { wickets, runs }. Callers format via formatLeaderboardValue below.
export type LeaderboardValue =
  | number
  | null
  | { runs: number; notOut: boolean }
  | { wickets: number; runs: number }

export interface LeaderboardSecondary {
  matches?: number
  innings?: number
  average?: number | null
  strikeRate?: number | null
  economy?: number | null
  catches?: number
  runOuts?: number
  stumpings?: number
}

export interface LeaderboardItem {
  rank: number
  value: LeaderboardValue
  secondary?: LeaderboardSecondary
  player: {
    publicPlayerId: string
    name: string
    role: string | null
  }
}

export interface LeaderboardResponse {
  metric: string
  title: string
  category: 'batting' | 'bowling' | 'fielding'
  unit: string
  direction: 'asc' | 'desc'
  qualification: {
    minInnings?: number
    minDismissals?: number
    minBallsFaced?: number
    minWickets?: number
    minEquivalentOvers?: number
  } | null
  pagination: { limit: number; offset: number; total: number }
  items: LeaderboardItem[]
}

export interface LeaderboardParams {
  limit?: number
  offset?: number
  role?: string
  teamId?: number
}

/**
 * GET /stats/leaderboards/:metric
 * Same public leaderboard endpoint the website's Leaderboards page and the
 * mobile home Hall of Fame / Next Generation sections use. `role` filters by
 * the player's current playing role; `teamId` by their current team. Rank is
 * assigned server-side over the full qualified set before pagination, so
 * page 2 correctly starts at `offset + 1`.
 */
export async function fetchLeaderboard(
  metric: string,
  params: LeaderboardParams = {}
): Promise<LeaderboardResponse> {
  const response = await api.get<LeaderboardResponse>(`/stats/leaderboards/${metric}`, { params })
  return response.data
}

/** Display helper — matches the website's LeaderboardRow/Podium formatting. */
export function formatLeaderboardValue(value: LeaderboardValue): string {
  if (value == null) return '—'
  if (typeof value === 'number') return String(value)
  if ('wickets' in value) return `${value.wickets}/${value.runs}`
  return `${value.runs}${value.notOut ? '*' : ''}`
}
