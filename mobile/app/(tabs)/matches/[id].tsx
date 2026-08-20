import React, { useState, useEffect } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  AppState,
  AppStateStatus,
} from 'react-native'
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router'
import { useMatchDetail } from '../../../src/hooks/useMatches'
import { useLiveMatch } from '../../../src/hooks/useSocketMatches'
import { useSocketCommentary } from '../../../src/hooks/useSocketCommentary'
import { Colors, Spacing, Typography } from '../../../src/constants/colors'
import { LoadingScreen } from '../../../src/components/LoadingScreen'
import { ErrorScreen } from '../../../src/components/ErrorScreen'
import { LiveIndicator } from '../../../src/components/LiveIndicator'
import { CurrentPlayers } from '../../../src/components/CurrentPlayers'
import { RecentDeliveries } from '../../../src/components/RecentDeliveries'
import { LiveCommentary } from '../../../src/components/LiveCommentary'

export default function MatchDetailsScreen() {
  const router = useRouter()
  const { id } = useLocalSearchParams<{ id: string }>()
  const matchId = parseInt(id || '0', 10)
  const [refreshing, setRefreshing] = useState(false)
  const [appState, setAppState] = useState<AppStateStatus>('active')

  const { data: match, isLoading, isError, error, refetch } = useMatchDetail(matchId)

  // Subscribe to realtime match state (enabled when match is live)
  const liveMatch = useLiveMatch(matchId && match?.match?.status === 'live' ? matchId : null, {
    enabled: !!(matchId && match),
  })

  // Subscribe to realtime commentary (enabled when match exists)
  const commentary = useSocketCommentary(matchId && match ? matchId : null, {
    enabled: !!(matchId && match),
  })

  // Handle app background/foreground
  useEffect(() => {
    const subscription = AppState.addEventListener('change', setAppState)
    return () => subscription.remove()
  }, [])

  // Focus effect ensures proper cleanup when navigating away
  useFocusEffect(
    React.useCallback(() => {
      // Screen is in focus — listeners should be active (handled by hooks)
      return () => {
        // Screen lost focus — hooks will clean up automatically on unmount
      }
    }, [])
  )

  const handleRefresh = async () => {
    setRefreshing(true)
    await refetch()
    setRefreshing(false)
  }

  if (!id) {
    return (
      <ErrorScreen
        title="Error"
        message="Match ID is required"
        onRetry={() => router.back()}
        retryLabel="Go Back"
      />
    )
  }

  if (isLoading) {
    return <LoadingScreen />
  }

  if (isError) {
    return (
      <ErrorScreen
        title="Failed to Load"
        message="Could not load match details. Please try again."
        onRetry={() => refetch()}
      />
    )
  }

  if (!match) {
    return (
      <ErrorScreen
        title="Not Found"
        message="This match could not be found."
        onRetry={() => router.back()}
        retryLabel="Go Back"
      />
    )
  }

  const matchDate = new Date(match.match?.match_date)
  const dateStr = matchDate.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })

  // Use live data if available and it's the current innings, otherwise use HTTP data
  const displayMatch = liveMatch.data && liveMatch.data.currentInnings
    ? liveMatch.data
    : match

  // Determine actual status (prefer live data)
  const actualStatus = displayMatch?.match?.status || match?.match?.status

  // Get team scores — prefer live data if available
  const getTeamScore = (teamId: number) => {
    if (!liveMatch.data?.currentInnings) {
      // Use HTTP data
      if (teamId === match?.match?.team_a_id) {
        return {
          runs: match?.match?.team_a_runs,
          wickets: match?.match?.team_a_wickets,
          overs: match?.match?.team_a_overs,
        }
      } else {
        return {
          runs: match?.match?.team_b_runs,
          wickets: match?.match?.team_b_wickets,
          overs: match?.match?.team_b_overs,
        }
      }
    }

    // Use live data for current innings
    const teamBattingInCurrent =
      liveMatch.data.currentInnings.battingTeamId === teamId
    if (!teamBattingInCurrent) {
      // This team hasn't batted yet or already finished — use HTTP data
      if (teamId === match?.match?.team_a_id) {
        return {
          runs: match?.match?.team_a_runs,
          wickets: match?.match?.team_a_wickets,
          overs: match?.match?.team_a_overs,
        }
      } else {
        return {
          runs: match?.match?.team_b_runs,
          wickets: match?.match?.team_b_wickets,
          overs: match?.match?.team_b_overs,
        }
      }
    }

    // This team is batting now — use live data
    return {
      runs: liveMatch.data.currentInnings.runs,
      wickets: liveMatch.data.currentInnings.wickets,
      overs: liveMatch.data.currentInnings.oversLabel,
    }
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backButton}>← Back</Text>
        </TouchableOpacity>
        <LiveIndicator
          status={(actualStatus as 'live' | 'upcoming' | 'completed' | 'finalized' | 'cancelled') || 'upcoming'}
          isConnected={liveMatch.connected}
        />
      </View>

      {/* Match Info */}
      <View style={styles.card}>
        <Text style={styles.dateText}>{dateStr}</Text>
        {match.match?.venue && <Text style={styles.venueText}>{match.match.venue}</Text>}
      </View>

      {/* Teams with Live Score */}
      <View style={styles.card}>
        <View style={styles.teamContainer}>
          <View style={styles.team}>
            <Text style={styles.teamName}>{match.teamA?.name || 'Team A'}</Text>
            {getTeamScore(match.match?.team_a_id)?.runs !== null && (
              <Text style={styles.score}>
                {getTeamScore(match.match?.team_a_id)?.runs || 0}/
                {getTeamScore(match.match?.team_a_id)?.wickets || 0}
              </Text>
            )}
            {getTeamScore(match.match?.team_a_id)?.overs && (
              <Text style={styles.overs}>
                {getTeamScore(match.match?.team_a_id)?.overs} overs
              </Text>
            )}
          </View>

          <Text style={styles.vs}>vs</Text>

          <View style={styles.team}>
            <Text style={styles.teamName}>{match.teamB?.name || 'Team B'}</Text>
            {getTeamScore(match.match?.team_b_id)?.runs !== null && (
              <Text style={styles.score}>
                {getTeamScore(match.match?.team_b_id)?.runs || 0}/
                {getTeamScore(match.match?.team_b_id)?.wickets || 0}
              </Text>
            )}
            {getTeamScore(match.match?.team_b_id)?.overs && (
              <Text style={styles.overs}>
                {getTeamScore(match.match?.team_b_id)?.overs} overs
              </Text>
            )}
          </View>
        </View>
      </View>

      {/* Chase Information (if available) */}
      {liveMatch.data?.currentInnings?.chase && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Chase</Text>
          <View style={styles.chaseInfo}>
            <View style={styles.chaseItem}>
              <Text style={styles.chaseLabel}>Target</Text>
              <Text style={styles.chaseValue}>{liveMatch.data.currentInnings.chase.runsNeeded}</Text>
            </View>
            {liveMatch.data.currentInnings.chase.ballsRemaining && (
              <View style={styles.chaseItem}>
                <Text style={styles.chaseLabel}>Balls Remaining</Text>
                <Text style={styles.chaseValue}>
                  {liveMatch.data.currentInnings.chase.ballsRemaining}
                </Text>
              </View>
            )}
            {liveMatch.data.currentInnings.chase.requiredRunRate && (
              <View style={styles.chaseItem}>
                <Text style={styles.chaseLabel}>Required RR</Text>
                <Text style={styles.chaseValue}>
                  {liveMatch.data.currentInnings.chase.requiredRunRate.toFixed(2)}
                </Text>
              </View>
            )}
          </View>
        </View>
      )}

      {/* Current Players (Live Only) */}
      {liveMatch.data?.currentInnings && (
        <CurrentPlayers
          striker={liveMatch.data.currentInnings.striker}
          nonStriker={liveMatch.data.currentInnings.nonStriker}
          bowler={liveMatch.data.currentInnings.bowler}
        />
      )}

      {/* Recent Deliveries (Live Only) */}
      {liveMatch.data?.currentInnings && (
        <RecentDeliveries
          deliveries={liveMatch.data.currentInnings.recentDeliveries}
        />
      )}

      {/* Result/Toss Info */}
      {(liveMatch.data?.result || match.match?.result) && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Result</Text>
          <Text style={styles.resultText}>
            {liveMatch.data?.result?.text || match.match?.result}
          </Text>
        </View>
      )}

      {match.match?.toss_winner_id && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Toss Winner</Text>
          <Text style={styles.infoText}>
            {match.tossWinner?.name ||
              (match.match.toss_winner_id === match.match.team_a_id
                ? match.teamA?.name
                : match.teamB?.name)}
          </Text>
        </View>
      )}

      {/* Innings Details */}
      {match.innings && match.innings.length > 0 && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Innings</Text>
          {match.innings.map((innings: any, idx: number) => (
            <View key={innings.id} style={styles.inningsDetail}>
              <Text style={styles.inningsLabel}>Innings {idx + 1}</Text>
              <Text style={styles.inningsStats}>
                {innings.runs}/{innings.wickets} in {innings.overs} overs
              </Text>
            </View>
          ))}
        </View>
      )}

      {/* Live Commentary */}
      <LiveCommentary
        entries={commentary.entries}
        loading={commentary.loading}
        error={commentary.error}
      />
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  backButton: {
    fontSize: Typography.fontSize.base,
    color: Colors.primary,
    fontWeight: Typography.fontWeight.semibold,
  },
  statusBadge: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: 4,
  },
  statusText: {
    fontSize: Typography.fontSize.sm,
    color: Colors.white,
    fontWeight: Typography.fontWeight.semibold,
  },
  card: {
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
    padding: Spacing.md,
    backgroundColor: Colors.backgroundAlt,
    borderRadius: 8,
  },
  dateText: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.text,
  },
  venueText: {
    fontSize: Typography.fontSize.sm,
    color: Colors.textSecondary,
    marginTop: Spacing.sm,
  },
  teamContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  team: {
    flex: 1,
    alignItems: 'center',
  },
  teamName: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text,
    marginBottom: Spacing.sm,
  },
  score: {
    fontSize: Typography.fontSize['2xl'],
    fontWeight: Typography.fontWeight.bold,
    color: Colors.primary,
    marginBottom: Spacing.xs,
  },
  overs: {
    fontSize: Typography.fontSize.sm,
    color: Colors.textSecondary,
  },
  vs: {
    fontSize: Typography.fontSize.base,
    color: Colors.textTertiary,
    marginHorizontal: Spacing.md,
    fontWeight: Typography.fontWeight.semibold,
  },
  cardTitle: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text,
    marginBottom: Spacing.md,
  },
  resultText: {
    fontSize: Typography.fontSize.base,
    color: Colors.text,
    lineHeight: 20,
  },
  infoText: {
    fontSize: Typography.fontSize.base,
    color: Colors.text,
  },
  inningsDetail: {
    marginBottom: Spacing.md,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  inningsLabel: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.text,
    marginBottom: Spacing.sm,
  },
  inningsStats: {
    fontSize: Typography.fontSize.base,
    color: Colors.textSecondary,
  },
  commentaryText: {
    fontSize: Typography.fontSize.base,
    color: Colors.text,
    lineHeight: 20,
  },
  chaseInfo: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: Spacing.md,
  },
  chaseItem: {
    alignItems: 'center',
  },
  chaseLabel: {
    fontSize: Typography.fontSize.xs,
    color: Colors.textSecondary,
    marginBottom: Spacing.xs,
    textTransform: 'uppercase',
    fontWeight: Typography.fontWeight.semibold,
  },
  chaseValue: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.primary,
  },
})
