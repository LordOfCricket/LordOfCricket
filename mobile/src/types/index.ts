export interface User {
  id: number
  name: string
  email: string
  phone?: string
  role: 'user' | 'player' | 'staff' | 'ground_owner' | 'super_admin'
  // Only meaningful when role === 'player'. An Umpire is role 'player' +
  // player_type 'umpire' + an approved umpire_requests row.
  player_type?: 'team_player' | 'umpire' | null
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED'
  force_password_change?: boolean
  created_at: string
}

export type UmpireRequestStatus = 'pending' | 'approved' | 'rejected'

export interface UmpireRequest {
  id: number
  user_id: number
  status: UmpireRequestStatus
  requested_at: string
  decided_at: string | null
  decided_by: number | null
}

// Resolved client-side after auth. 'none' = umpire account with no request
// row; 'unknown' = the status request itself failed (retryable).
export type UmpireApproval = UmpireRequestStatus | 'none' | 'unknown' | null

export interface Player {
  id: number
  user_id: number
  name: string
  public_player_id: string
  role?: string | null
  batting_style?: string | null
  bowling_style?: string | null
  jersey_number?: number | null
  photo_url?: string | null
  city?: string | null
  bio?: string | null
  nickname?: string | null
  date_of_birth?: string | null
  is_wicket_keeper?: boolean
  address_line?: string | null
  state?: string | null
  postal_code?: string | null
  profile_onboarding_completed: boolean
  created_at: string
  updated_at?: string
  team_id?: number | null
}

// GET /players/:publicPlayerId response (statistics.service.js#getPublicPlayerProfile).
// A deliberately NARROW, public-safe DTO — NOT the same shape as `Player`
// (GET /me/player does `SELECT *` on the players row; this endpoint's own
// repository query, findPublicPlayerByPublicId, explicitly selects only
// these columns — no email/phone/user_id/date_of_birth/address_line/state/
// postal_code/is_wicket_keeper). Also camelCase throughout, unlike `Player`'s
// snake_case — a real, previously-uncaught mismatch: this used to be cast to
// `Player` and read via `.photo_url`/`.batting_style` etc., which were
// always undefined at runtime since the real keys are `.photoUrl`/
// `.battingStyle`.
export interface PublicPlayerProfile {
  publicPlayerId: string
  name: string
  role: string | null
  battingStyle: string | null
  bowlingStyle: string | null
  jerseyNumber: number | null
  photoUrl: string | null
  city: string | null
  bio: string | null
  team: { id: number; name: string; shortName: string; logoUrl: string | null } | null
}

// Editable fields for PATCH /me/player
export interface EditablePlayerFields {
  name?: string
  jersey_number?: number | null
  role?: string | null
  batting_style?: string | null
  bowling_style?: string | null
  city?: string | null
  bio?: string | null
  photo_url?: string | null
  nickname?: string | null
  date_of_birth?: string | null
  is_wicket_keeper?: boolean
  address_line?: string | null
  state?: string | null
  postal_code?: string | null
  profile_onboarding_completed?: boolean
}

// Career batting statistics
export interface BattingStats {
  innings: number
  notOuts: number
  runs: number
  ballsFaced: number
  highestScore: { runs: number; notOut: boolean } | null
  average: number | null
  strikeRate: number | null
  fours: number
  sixes: number
  thirties: number
  fifties: number
  hundreds: number
  ducks: number
}

// Career bowling statistics
export interface BowlingStats {
  innings: number
  legalBalls: number
  runsConceded: number
  wickets: number
  maidens: number
  average: number | null
  economy: number | null
  strikeRate: number | null
  equivalentOvers: number
  bestBowling: { wickets: number; runs: number } | null
  threeWicketHauls: number
  fourWicketHauls: number
  fiveWicketHauls: number
}

// Fielding statistics
export interface FieldingStats {
  catches: number
  stumpings: number
  runOuts: number
}

// Career statistics aggregate
export interface CareerStats {
  matches: number
  batting: BattingStats
  bowling: BowlingStats
  fielding: FieldingStats
}

// Batting performance in a single match
export interface MatchBattingPerformance {
  didBat: boolean
  runs?: number
  balls?: number
  fours?: number
  sixes?: number
  notOut?: boolean
  strikeRate?: number | null
}

// Bowling performance in a single match
export interface MatchBowlingPerformance {
  didBowl: boolean
  legalBalls?: number
  runs?: number
  wickets?: number
  maidens?: number
  ballsPerOver?: number
  economy?: number | null
}

// Performance in a single match
export interface PlayerMatchPerformance {
  matchId: number
  date: string
  venue: string | null
  // Immutable per-match team snapshot (match_players.team_id). Optional here
  // because a few lighter payloads reuse this shape.
  teamId?: number | null
  opponent: string
  result: string
  won: boolean | null
  batting: MatchBattingPerformance
  bowling: MatchBowlingPerformance
}

// Match history response
export interface MatchHistory {
  total: number
  limit: number
  offset: number
  items: PlayerMatchPerformance[]
}

// Personal bests
export interface PersonalBests {
  highestScore: { runs: number; notOut: boolean } | null
  bestBowling: { wickets: number; runs: number } | null
}

// Player minimal info for stats context
export interface PlayerMinimal {
  id: number
  publicPlayerId: string
  name: string
  role: string | null
}

// One team this player has genuinely represented in finalized matches —
// derived server-side from match_players.team_id (an immutable per-match
// snapshot), NOT a membership table (none exists). See
// statistics.service.js#buildTeamHistory. A player who has only ever played
// for their current team will simply have exactly one entry here; this is
// independent of players.team_id (the current-roster FK My Teams already
// uses) and reflects real historical participation, not fabricated data.
export interface TeamHistoryEntry {
  teamId: number
  name: string
  shortName: string
  logoUrl: string | null
  record: {
    matches: number
    wins: number
    losses: number
    ties: number
    noResults: number
    winPercentage: number | null
  }
  firstMatchDate: string
  lastMatchDate: string
}

// Career milestone (server/src/domain/statistics/careerMilestones.js).
// Deterministic threshold over finalized-match history; `achievedOn` is only
// present when the exact crossing match is known (never a fabricated date).
export interface CareerAchievement {
  id: string
  category: 'appearance' | 'batting' | 'bowling' | 'fielding'
  title: string
  description: string
  value: number
  target: number
  achieved: boolean
  achievedOn: { matchId: number; date: string; opponent: string } | null
}

export interface PlayerAchievements {
  earned: CareerAchievement[]
  next: CareerAchievement | null
}

// One calendar year of the player's career (server/src/domain/statistics/
// careerTimeline.js). Teams come from the real per-match team snapshot.
export interface CareerTimelineYear {
  year: number
  matches: number
  runs: number
  wickets: number
  teams: { teamId: number; name: string | null; shortName: string | null; logoUrl: string | null; matches: number }[]
  milestones: { id: string; title: string; matchId: number; opponent: string }[]
}

// Complete player statistics response (GET /me/stats or GET /players/:id/stats)
export interface PlayerStats {
  player: PlayerMinimal
  career: CareerStats
  recentForm: PlayerMatchPerformance[]
  matchHistory: MatchHistory
  personalBests: PersonalBests
  teamHistory: TeamHistoryEntry[]
  achievements: PlayerAchievements
  careerTimeline: CareerTimelineYear[]
}

export interface Team {
  id: number
  name: string
  short_name: string
  logo_url?: string
  owner_id?: number
  created_at: string
}

export interface Ground {
  id: number
  name: string
  public_ground_id: string
  address_line?: string
  city?: string
  state?: string
  latitude?: number
  longitude?: number
  created_at: string
}

export type MatchStatus = 'upcoming' | 'live' | 'completed' | 'finalized' | 'cancelled'

// Lightweight team ref embedded in match payloads (buildMatchCard.js /
// matchSummary.service.js#teamSummary) — distinct from the full `Team`
// entity returned by /teams endpoints (different field set, snake_case).
export interface MatchTeamRef {
  id: number
  name: string
  shortName: string
  logoUrl: string | null
}

export interface MatchFormat {
  oversPerInnings: number | null
  ballsPerOver: number
}

// buildMatchCard.js's lightweight per-card innings entry.
export interface MatchCardInnings {
  inningsNumber: number
  battingTeamId: number
  runs: number
  wickets: number
  oversLabel: string
}

export interface MatchChase {
  target: number
  runsNeeded: number
  ballsRemaining: number | null
  requiredRunRate: number | null
}

export interface MatchResult {
  winnerTeamId: number | null
  resultType: string
  resultMargin: number | null
  text: string
}

// GET /matches/discover item shape (buildMatchCard.js) — also embedded in
// GET /matches/home's featuredLiveMatch/upcomingMatches/recentResults.
export interface Match {
  id: number
  status: MatchStatus
  isInningsBreak: boolean
  isOfficial: boolean
  awaitingFinalization: boolean
  matchDate: string
  venue: string | null
  format: MatchFormat
  teamA: MatchTeamRef
  teamB: MatchTeamRef
  innings: MatchCardInnings[]
  chase: MatchChase | null
  result: MatchResult | null
}

export interface MatchDiscoverResponse {
  category: 'LIVE' | 'UPCOMING' | 'RESULTS'
  pagination: {
    limit: number
    offset: number
    total: number
  }
  items: Match[]
}

export interface HomeFeedResponse {
  featuredLiveMatch: Match | null
  upcomingMatches: Match[]
  recentResults: Match[]
}

// GET /matches/:id/summary response (matchSummary.service.js)
export interface MatchSummaryInfo {
  id: number
  status: MatchStatus
  isInningsBreak: boolean
  isOfficial: boolean
  awaitingFinalization: boolean
  venue: string | null
  matchDate: string
  oversPerInnings: number | null
  ballsPerOver: number
}

export interface MatchToss {
  winnerTeamId: number
  decision: 'bat' | 'bowl'
  text: string
}

export interface MatchGround {
  name: string
  amenities: string[]
}

export interface InningsScore {
  runs: number
  wickets: number
  legalBalls: number
  oversLabel: string
  endReason: string | null
}

// Scorecard rows (server/src/domain/matchSummary/buildInningsSummary.js).
// `publicPlayerId` can be null (an "Unknown Player" fallback the server
// emits when a match_player row can't be resolved) — never navigate on null.
export interface ScorecardPlayerRef {
  publicPlayerId: string | null
  name: string
  teamId?: number | null
  isCaptain?: boolean
  isWicketkeeper?: boolean
}

export interface MatchBattingRow {
  player: ScorecardPlayerRef
  runs: number | null
  balls: number | null
  fours: number | null
  sixes: number | null
  strikeRate: number | null
  status: 'OUT' | 'NOT_OUT' | 'DNB' | 'YTB'
  dismissalText: string | null
}

export interface MatchBowlingRow {
  player: ScorecardPlayerRef
  oversLabel: string
  maidens: number
  runs: number
  wickets: number
  economy: number | null
  wides: number
  noBalls: number
}

export interface FallOfWicket {
  wicketNumber: number
  score: number
  overBall: string
  player: ScorecardPlayerRef
}

export interface InningsExtras {
  wides: number
  noBalls: number
  byes: number
  legByes: number
  total: number
}

export interface InningsTotal {
  runs: number
  wickets: number
  oversLabel: string
  runRate: number
}

// buildInningsSummary#buildPartnerships
export interface Partnership {
  batsmen: ScorecardPlayerRef[]
  runs: number
  balls: number
  endWicketNumber: number | null
  unbeaten: boolean
}

// buildInningsSummary#serializeDelivery
export interface OverDelivery {
  id: number
  over: number
  ball: number
  striker: ScorecardPlayerRef
  nonStriker: ScorecardPlayerRef
  bowler: ScorecardPlayerRef
  batRuns: number
  illegal: { type: string; runs: number } | null
  extra: { type: string; runs: number } | null
  totalRuns: number
  isLegalDelivery: boolean
  isFreeHit: boolean
  isDeadBall: boolean
  voided: boolean
  wicket: { type: string; player: ScorecardPlayerRef; dismissalText: string | null } | null
}

// buildInningsSummary#buildOvers
export interface MatchOver {
  over: number
  bowler: ScorecardPlayerRef
  runs: number
  wickets: number
  scoreAfter: string
  deliveries: OverDelivery[]
}

export interface MatchInningsDetail {
  inningsId: number
  inningsNumber: number
  status: string
  battingTeamId: number
  bowlingTeamId: number
  score: InningsScore
  target: number | null
  chase: MatchChase | null
  // Present on GET /matches/:id/summary (buildInningsSummary). Optional here
  // only because a few other code paths reuse this interface with the
  // lighter live-card shape.
  batting?: MatchBattingRow[]
  bowling?: MatchBowlingRow[]
  fallOfWickets?: FallOfWicket[]
  extras?: InningsExtras
  total?: InningsTotal
  partnerships?: Partnership[]
  overs?: MatchOver[]
}

export interface PlayingXiEntry {
  player: { publicPlayerId: string; name: string }
  isCaptain: boolean
  isWicketkeeper: boolean
}

export interface MatchSummary {
  match: MatchSummaryInfo
  teams: { teamA: MatchTeamRef; teamB: MatchTeamRef }
  toss: MatchToss | null
  result: MatchResult | null
  ground: MatchGround | null
  innings: MatchInningsDetail[]
  playingXi: { teamA: PlayingXiEntry[]; teamB: PlayingXiEntry[] }
  tournamentContext: unknown
}

export interface MatchLiveState {
  matchId: number
  status: 'upcoming' | 'live' | 'completed'
  teamA: {
    id: number
    name: string
    runs?: number
    wickets?: number
    overs?: number
  }
  teamB: {
    id: number
    name: string
    runs?: number
    wickets?: number
    overs?: number
  }
  currentBatter?: string
  currentBowler?: string
  recentDelivery?: string
}

export interface MfaStatus {
  enrolled: boolean
  required: boolean
  verified: boolean
}

export interface AuthResponse {
  user: User
  mfa?: MfaStatus
}

export interface AuthError {
  message: string
  code?: string
}

// Booking Types
export interface AvailableSlot {
  startTime: string  // ISO UTC
  endTime: string    // ISO UTC
  status: 'AVAILABLE' | 'UNAVAILABLE'
  reason?: string    // For staff: BOOKED, BLOCKED, MATCH, PAST
}

export interface Availability {
  date: string
  slots: AvailableSlot[]
}

export interface BookingRequest {
  startTime: string
  purpose?: string
  expectedPlayers?: number
  notes?: string
  contactPhone?: string
  contactEmail?: string
  clientActionId?: string
  publicGroundId?: string
}

export interface Booking {
  publicBookingId: string
  bookingType: string
  blockType?: string
  startTime: string
  endTime: string
  status: 'CONFIRMED' | 'CANCELLED'
  displayStatus: 'APPROVED' | 'COMPLETED' | 'CANCELLED'
  purpose?: string
  expectedPlayers?: number
  notes?: string
  // Server-computed, immutable price snapshot (₹). null only for a
  // STAFF_BLOCK — a CUSTOMER booking always carries one.
  amount?: number | null
  contactPhone?: string
  contactEmail?: string
  customerName: string
  createdAt: string
  cancelledAt?: string
  // Priority 4 — the ground this booking is for. Present on the
  // GET /bookings/my list (LEFT JOIN grounds); absent on create/cancel
  // responses, which select ground_bookings alone.
  ground?: { publicGroundId: string; name: string; city: string | null } | null
}

export interface Notification {
  id: number
  userId: number
  type: string
  title: string
  body?: string
  relatedBookingId?: number
  relatedMatchId?: number
  isRead: boolean
  createdAt: string
}

export interface NotificationsResponse {
  notifications: Notification[]
  total: number
  unreadCount: number
}

export interface MatchProposal {
  publicProposalId: string
  status: 'OPEN' | 'CONFIRMED' | 'CANCELLED' | 'EXPIRED'
  proposingTeamId: number
  acceptedByTeamId?: number
  proposalExpiresAt: string
  createdAt: string
  updatedAt: string
  publicBookingId?: string
  startTime?: string
  endTime?: string
  matchFormat?: string
  purpose?: string
  bookingStatus?: string
}

export interface MatchProposalsListResponse {
  proposals: MatchProposal[]
  total?: number
}

export interface SocketMatchStatePayload {
  matchId: number
  reason: string
  match: {
    id: number
    status: 'upcoming' | 'live' | 'completed'
    isLive: boolean
    isInningsBreak: boolean
    isCompleted: boolean
    isFinalized: boolean
  }
  result: {
    resultType: string
    resultMargin: number
    text: string
    winnerTeamId: number
  } | null
  target: number | null
  currentInnings: {
    id: number
    number: number
    version: number
    status: 'upcoming' | 'live' | 'completed'
    battingTeamId: number
    bowlingTeamId: number
    runs: number
    wickets: number
    legalBalls: number
    oversLabel: string
    currentRunRate: number | null
    chase: {
      runsNeeded: number
      ballsRemaining: number | null
      requiredRunRate: number | null
    } | null
    striker: {
      player: { publicPlayerId: string | null; name: string }
      runs: number
      balls: number
      fours: number
      sixes: number
      strikeRate: number | null
    } | null
    nonStriker: {
      player: { publicPlayerId: string | null; name: string }
      runs: number
      balls: number
      fours: number
      sixes: number
      strikeRate: number | null
    } | null
    bowler: {
      player: { publicPlayerId: string | null; name: string }
      oversLabel: string
      runs: number
      wickets: number
      economy: number | null
    } | null
    currentOver: Array<{
      id: number
      over: number
      ball: number
      batRuns: number
      illegal: boolean
      extra: string | null
      totalRuns: number
      isLegalDelivery: boolean
      isFreeHit: boolean
      voided: boolean
      isDeadBall: boolean
      wicket: boolean
    }>
    recentDeliveries: Array<{
      id: number
      over: number
      ball: number
      batRuns: number
      illegal: boolean
      extra: string | null
      totalRuns: number
      isLegalDelivery: boolean
      isFreeHit: boolean
      voided: boolean
      isDeadBall: boolean
      wicket: boolean
    }>
  } | null
}
