export interface User {
  id: number
  name: string
  email: string
  phone?: string
  role: 'user' | 'player' | 'staff' | 'ground_owner' | 'super_admin'
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED'
  force_password_change?: boolean
  created_at: string
}

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

// Complete player statistics response (GET /me/stats or GET /players/:id/stats)
export interface PlayerStats {
  player: PlayerMinimal
  career: CareerStats
  recentForm: PlayerMatchPerformance[]
  matchHistory: MatchHistory
  personalBests: PersonalBests
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

export interface Match {
  id: number
  team_a_id: number
  team_b_id: number
  venue?: string
  match_date: string
  status: 'upcoming' | 'live' | 'completed' | 'cancelled'
  toss_winner_id?: number
  result?: string
  team_a_runs?: number
  team_a_wickets?: number
  team_a_overs?: number
  team_b_runs?: number
  team_b_wickets?: number
  team_b_overs?: number
  created_at: string
}

export interface MatchSummary {
  match: Match
  teamA: Team
  teamB: Team
  innings?: Innings[]
  tossWinner?: Team
  result?: string
  commentary?: string
}

export interface Innings {
  id: number
  matchId: number
  inningsNumber: number
  battingTeamId: number
  bowlingTeamId: number
  runs: number
  wickets: number
  overs: number
  status: string
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

export interface MatchDiscoverResponse {
  matches: Match[]
  teamMap: Record<number, Team>
  total: number
  hasMore: boolean
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
  contactPhone?: string
  contactEmail?: string
  customerName: string
  createdAt: string
  cancelledAt?: string
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
