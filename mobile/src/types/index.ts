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
  role?: string
  batting_style?: string
  bowling_style?: string
  jersey_number?: number
  photo_url?: string
  city?: string
  bio?: string
  nickname?: string
  date_of_birth?: string
  is_wicket_keeper?: boolean
  address_line?: string
  state?: string
  postal_code?: string
  profile_onboarding_completed: boolean
  created_at: string
}

export interface Team {
  id: number
  name: string
  short_name: string
  logo_url?: string
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
